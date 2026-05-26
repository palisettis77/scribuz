# coding: utf-8
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests, os, bcrypt, jwt, datetime, random, string, hmac, hashlib, base64
from dotenv import load_dotenv

load_dotenv()

BASE        = os.path.dirname(os.path.abspath(__file__))
FAN_DIR     = os.path.join(BASE, '..', 'scribuz_fan')
CREATOR_DIR = os.path.join(BASE, '..', 'scribuz_creator')
ADMIN_DIR   = os.path.join(BASE, '..', 'scribuz_admin')

app = Flask(__name__)
CORS(app, origins='*')

# Disable all caching for development — every file always fresh
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

@app.after_request
def no_cache(resp):
    resp.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    resp.headers['Pragma']        = 'no-cache'
    resp.headers['Expires']       = '0'
    return resp

SB_URL  = os.getenv('SUPABASE_URL')
SB_KEY  = os.getenv('SUPABASE_KEY')
SECRET  = os.getenv('SECRET_KEY', 'scribuz-secret')
ADMIN_S = os.getenv('ADMIN_SECRET', 'scribuz_admin_2026')
RZP_KEY = os.getenv('RAZORPAY_KEY_ID', '')
RZP_SEC = os.getenv('RAZORPAY_KEY_SECRET', '')

H = {
    'apikey': SB_KEY,
    'Authorization': 'Bearer ' + (SB_KEY or ''),
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# ── DB HELPERS ────────────────────────────────────────────────────────────────
def db(table, params=''):
    r = requests.get(SB_URL + '/rest/v1/' + table + '?' + params, headers=H)
    return r.json()

def ins(table, data):
    r = requests.post(SB_URL + '/rest/v1/' + table, json=data, headers=H)
    print(f'INSERT {table}: status={r.status_code} body={r.text[:200]}')
    return r.json()

def upd(table, params, data):
    r = requests.patch(SB_URL + '/rest/v1/' + table + '?' + params, json=data, headers=H)
    print(f'UPDATE {table} [{params[:60]}]: status={r.status_code} body={r.text[:300]}')
    return r.json() if r.text else {}

def dlt(table, params):
    r = requests.delete(SB_URL + '/rest/v1/' + table + '?' + params, headers=H)
    return r.status_code

# ── AUTH HELPERS ──────────────────────────────────────────────────────────────
def token_fan(token):
    try:
        return jwt.decode(token, SECRET, algorithms=['HS256'])
    except Exception:
        return None

def token_creator(token):
    try:
        p = jwt.decode(token, SECRET, algorithms=['HS256'])
        return p if p.get('role') == 'creator' else None
    except Exception:
        return None

def auth_fan():
    t = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
    if not t:
        return None
    p = token_fan(t)
    if p and 'fan_id' not in p:
        return None
    return p

def auth_creator():
    t = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
    if not t:
        return None
    return token_creator(t)

def make_token(data, days=30):
    data['exp'] = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=days)
    return jwt.encode(data, SECRET, algorithm='HS256')

def ref_code(n=8):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=n))

def admin_check():
    return request.args.get('secret') == ADMIN_S

# ── REFERENCE ID GENERATOR ────────────────────────────────────────────────────
def make_ref_id(booking_id):
    """Generate a unique reference ID for a booking."""
    return 'SBZ-' + str(booking_id).zfill(6)

def make_reservation_id(booking_id, fan_id):
    """Generate a reservation ID."""
    base = f'{booking_id}{fan_id}{SECRET}'
    return 'RSV-' + hashlib.md5(base.encode()).hexdigest()[:8].upper()

# ══════════════════════════════════════════════════════════════════════════════
# STATIC FILE SERVING
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/')
def home():
    return send_from_directory(FAN_DIR, 'index.html')

@app.route('/fan/')
def fan_home():
    return send_from_directory(FAN_DIR, 'index.html')

@app.route('/fan/<path:filename>')
def fan_files(filename):
    return send_from_directory(FAN_DIR, filename)

@app.route('/creator/')
def creator_home():
    return send_from_directory(CREATOR_DIR, 'auth.html')

@app.route('/creator/<path:filename>')
def creator_files(filename):
    return send_from_directory(CREATOR_DIR, filename)

@app.route('/admin/')
def admin_home():
    return send_from_directory(ADMIN_DIR, 'index.html')

@app.route('/admin/<path:filename>')
def admin_files(filename):
    return send_from_directory(ADMIN_DIR, filename)

# ══════════════════════════════════════════════════════════════════════════════
# HEALTH CHECK
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/api/health')
def health():
    return jsonify({
        'status': 'ScriBuz API running',
        'version': '5.0',
        'fan_dir': FAN_DIR,
        'creator_dir': CREATOR_DIR,
        'admin_dir': ADMIN_DIR
    })

# ══════════════════════════════════════════════════════════════════════════════
# CREATORS — PUBLIC
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/api/creators')
def get_creators():
    cat = request.args.get('category')
    q = 'is_active=eq.true&order=rating.desc'
    if cat and cat != 'All':
        q += '&category=eq.' + cat
    return jsonify({'success': True, 'creators': db('creators', q)})

@app.route('/api/creators/<int:cid>')
def get_creator(cid):
    d = db('creators', 'id=eq.' + str(cid) + '&is_active=eq.true')
    if not d:
        return jsonify({'success': False, 'error': 'Not found'}), 404
    imgs = db('creator_images', 'creator_id=eq.' + str(cid) + '&order=created_at.desc')
    c = d[0]
    c['images'] = imgs
    return jsonify({'success': True, 'creator': c})

@app.route('/api/creators/<int:cid>/availability')
def creator_avail(cid):
    booked  = db('bookings', 'creator_id=eq.' + str(cid) + '&status=in.(confirmed)&select=event_date')
    blocked = db('creator_blocked_dates', 'creator_id=eq.' + str(cid))
    return jsonify({
        'success': True,
        'booked_dates':  [{'date': b['event_date']} for b in booked if b.get('event_date')],
        'blocked_dates': blocked
    })

# ══════════════════════════════════════════════════════════════════════════════
# FAN AUTH
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/api/fan/signup', methods=['POST'])
def fan_signup():
    d = request.json
    if not all([d.get('name'), d.get('email'), d.get('password')]):
        return jsonify({'success': False, 'message': 'All fields required'}), 400
    if db('fans', 'email=eq.' + d['email']):
        return jsonify({'success': False, 'message': 'Email already registered'}), 409
    ref_by = None
    if d.get('referral_code'):
        ref = db('fans', 'referral_code=eq.' + d['referral_code'])
        if ref:
            ref_by = d['referral_code']
    hashed = bcrypt.hashpw(d['password'].encode(), bcrypt.gensalt()).decode()
    fan = ins('fans', {
        'name': d['name'], 'email': d['email'],
        'password_hash': hashed, 'phone': d.get('phone', ''),
        'city': d.get('city', ''), 'referral_code': ref_code(),
        'referred_by': ref_by, 'wallet_balance': 0
    })
    if not fan:
        return jsonify({'success': False, 'message': 'Signup failed'}), 500
    token = make_token({'fan_id': fan[0]['id'], 'role': 'fan'})
    return jsonify({
        'success': True, 'token': token,
        'user': {'id': fan[0]['id'], 'name': fan[0]['name'], 'email': fan[0]['email']}
    })

@app.route('/api/fan/login', methods=['POST'])
def fan_login():
    d = request.json
    fans = db('fans', 'email=eq.' + d['email'])
    if not fans:
        return jsonify({'success': False, 'message': 'Email not found'}), 404
    fan = fans[0]
    if not bcrypt.checkpw(d['password'].encode(), fan['password_hash'].encode()):
        return jsonify({'success': False, 'message': 'Wrong password'}), 401
    token = make_token({'fan_id': fan['id'], 'role': 'fan'})
    return jsonify({
        'success': True, 'token': token,
        'user': {'id': fan['id'], 'name': fan['name'], 'email': fan['email']}
    })

# ══════════════════════════════════════════════════════════════════════════════
# CREATOR AUTH
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/api/creator/login', methods=['POST'])
def creator_login():
    d = request.json
    cs = db('creators', 'email=eq.' + d['email'] + '&is_active=eq.true')
    if not cs:
        return jsonify({'success': False, 'message': 'Creator not found or not yet approved'}), 404
    c = cs[0]
    if not c.get('password_hash'):
        return jsonify({'success': False, 'message': 'Account not set up. Contact hello@scribuz.in'}), 403
    if not bcrypt.checkpw(d['password'].encode(), c['password_hash'].encode()):
        return jsonify({'success': False, 'message': 'Wrong password'}), 401
    token = make_token({'creator_id': c['id'], 'role': 'creator'}, days=30)
    return jsonify({
        'success': True, 'token': token,
        'creator': {'id': c['id'], 'name': c['name'], 'email': c['email'],
                    'category': c['category'], 'instagram': c.get('instagram', '')}
    })

@app.route('/api/creator/signup', methods=['POST'])
def creator_signup():
    d = request.json
    required = ['name', 'email', 'password', 'phone', 'category', 'instagram', 'price_from', 'city']
    if not all(d.get(f) for f in required):
        return jsonify({'success': False, 'message': 'Please fill in all required fields'}), 400
    if db('creators', 'email=eq.' + d['email']):
        return jsonify({'success': False, 'message': 'An account with this email already exists. Try logging in.'}), 409
    if db('creator_applications', 'email=eq.' + d['email'] + '&status=eq.pending'):
        return jsonify({'success': False, 'message': 'You already have a pending application with this email.'}), 409
    if len(d['password']) < 8:
        return jsonify({'success': False, 'message': 'Password must be at least 8 characters'}), 400
    hashed = bcrypt.hashpw(d['password'].encode(), bcrypt.gensalt()).decode()
    result = ins('creator_applications', {
        'name':          d['name'],
        'email':         d['email'],
        'password_hash': hashed,
        'phone':         d.get('phone', ''),
        'category':      d['category'],
        'instagram':     d.get('instagram', ''),
        'youtube':       d.get('youtube', ''),
        'bio':           d.get('bio', ''),
        'city':          d.get('city', 'Hyderabad'),
        'followers':     d.get('followers', ''),
        'price_from':    int(d.get('price_from', 0)),
        'experience':    d.get('experience', ''),
        'has_venue':     d.get('has_venue', False),
        'status':        'pending'
    })
    if not result:
        return jsonify({'success': False, 'message': 'Signup failed. Please try again.'}), 500
    return jsonify({'success': True, 'message': 'Application received!'})

@app.route('/api/creator/change-password', methods=['POST'])
def creator_change_password():
    p = auth_creator()
    if not p:
        return jsonify({'success': False, 'message': 'Login required'}), 401
    d  = request.json
    cs = db('creators', 'id=eq.' + str(p['creator_id']))
    if not cs:
        return jsonify({'success': False, 'message': 'Creator not found'}), 404
    if not bcrypt.checkpw(d['current_password'].encode(), cs[0]['password_hash'].encode()):
        return jsonify({'success': False, 'message': 'Current password is incorrect'}), 401
    if len(d['new_password']) < 8:
        return jsonify({'success': False, 'message': 'New password must be at least 8 characters'}), 400
    new_hash = bcrypt.hashpw(d['new_password'].encode(), bcrypt.gensalt()).decode()
    upd('creators', 'id=eq.' + str(p['creator_id']), {'password_hash': new_hash})
    return jsonify({'success': True, 'message': 'Password updated successfully!'})

# ══════════════════════════════════════════════════════════════════════════════
# CREATOR APPLY (interest form)
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/api/apply', methods=['POST'])
def creator_apply():
    d = request.json
    if not all([d.get('name'), d.get('email'), d.get('instagram'), d.get('category')]):
        return jsonify({'success': False, 'message': 'Required fields missing'}), 400
    ins('creator_applications', {
        'name': d['name'], 'email': d['email'], 'phone': d.get('phone', ''),
        'instagram': d['instagram'], 'youtube': d.get('youtube', ''),
        'category': d['category'], 'city': d.get('city', 'Hyderabad'),
        'bio': d.get('bio', ''), 'followers': d.get('followers', ''),
        'price_from': int(d.get('expected_fee', 0)),
        'has_venue': d.get('has_venue', False),
        'status': 'pending'
    })
    return jsonify({'success': True, 'message': 'Application received! We will reply within 48 hours.'})

# ══════════════════════════════════════════════════════════════════════════════
# BOOKINGS
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/api/book', methods=['POST'])
def create_booking():
    p = auth_fan()
    if not p:
        return jsonify({'success': False, 'message': 'Login required'}), 401
    d = request.json
    cs = db('creators', 'id=eq.' + str(d['creator_id']))
    if not cs:
        return jsonify({'success': False, 'message': 'Creator not found'}), 404

    event_date = d.get('event_date')
    if event_date:
        blocked = db('creator_blocked_dates',
            'creator_id=eq.' + str(d['creator_id']) + '&date=eq.' + event_date)
        if blocked:
            return jsonify({'success': False,
                'message': 'This date is unavailable. Please choose another date.'}), 400
        already_booked = db('bookings',
            'creator_id=eq.' + str(d['creator_id']) +
            '&event_date=eq.' + event_date +
            '&status=in.(pending,confirmed)')
        if already_booked:
            return jsonify({'success': False,
                'message': 'This date is already booked. Please choose another date.'}), 400

    price = cs[0].get('price_from', 0)
    fee   = round(price * 0.05)
    total = price + fee
    now   = datetime.datetime.now(datetime.timezone.utc).isoformat()

    bk = ins('bookings', {
        'fan_id': p['fan_id'], 'creator_id': d['creator_id'],
        'event_type': d.get('event_type', ''), 'event_date': d.get('event_date'),
        'guests': int(d.get('guests', 1)), 'budget': int(d.get('budget', 0)),
        'message': d.get('message', ''), 'status': 'pending',
        'amount': price, 'fan_total': total, 'service_fee': fee,
        'payment_status': 'unpaid',
        'platform_cut': fee,
        'creator_due': price,
        'payout_status': 'pending',
        'refund_status': 'none'
    })

    # bk is a list on success, or an error dict on failure
    booking_id = bk[0]['id'] if isinstance(bk, list) and bk else None
    if not booking_id:
        print(f'Booking insert failed: {bk}')
        return jsonify({'success': False, 'message': 'Could not create booking. Please try again.'}), 500
    return jsonify({
        'success': True,
        'message': 'Booking request sent! Creator will respond within 24 hours.',
        'booking_id': booking_id
    })

# ══════════════════════════════════════════════════════════════════════════════
# CANCELLATION — enforces policy:
#   • Fan can cancel only while status = 'pending' (before creator accepts)
#   • Once creator accepts (status = 'confirmed'), fan CANNOT cancel
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/api/booking/<int:bid>/cancel', methods=['PATCH'])
def cancel_booking(bid):
    p = auth_fan()
    if not p:
        return jsonify({'success': False, 'message': 'Login required'}), 401

    bk = db('bookings', 'id=eq.' + str(bid) + '&fan_id=eq.' + str(p['fan_id']))
    if not bk:
        return jsonify({'success': False, 'message': 'Booking not found'}), 404

    b = bk[0]

    # Policy: can only cancel while still pending (creator hasn't accepted yet)
    if b['status'] != 'pending':
        return jsonify({
            'success': False,
            'message': 'This booking can no longer be cancelled. Once a creator has accepted your booking, cancellations are not permitted. Please contact support.'
        }), 400

    # Determine refund eligibility
    refund_status = 'refund_initiated' if b.get('payment_status') == 'paid' else 'none'

    upd('bookings', 'id=eq.' + str(bid) + '&fan_id=eq.' + str(p['fan_id']), {
        'status': 'cancelled',
        'refund_status': refund_status
    })

    msg = 'Booking cancelled.'
    if refund_status == 'refund_initiated':
        msg += ' Your payment will be refunded within 5–7 business days.'

    return jsonify({'success': True, 'message': msg})

# ══════════════════════════════════════════════════════════════════════════════
# PAYMENTS — CREATE ORDER
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/api/payment/create-order', methods=['POST'])
def create_razorpay_order():
    p = auth_fan()
    if not p:
        return jsonify({'success': False, 'message': 'Login required'}), 401
    d  = request.json
    bk = db('bookings', 'id=eq.' + str(d['booking_id']) + '&fan_id=eq.' + str(p['fan_id']))
    if not bk:
        return jsonify({'success': False, 'message': 'Booking not found'}), 404
    b      = bk[0]
    amount = b.get('fan_total') or b.get('amount') or 0

    if not RZP_KEY or not RZP_SEC:
        mock_id = 'order_test_' + str(b['id']) + '_' + str(int(datetime.datetime.now(datetime.timezone.utc).timestamp()))
        upd('bookings', 'id=eq.' + str(b['id']), {
            'razorpay_order_id': mock_id,
            'payment_status': 'awaiting_payment'
        })
        return jsonify({
            'success':    True,
            'mock':       True,
            'key':        'rzp_test_mock',
            'order_id':   mock_id,
            'amount':     amount * 100,
            'currency':   'INR',
            'booking_id': b['id'],
            'fan_name':   d.get('fan_name', ''),
            'fan_email':  d.get('fan_email', '')
        })

    auth_header = base64.b64encode(f'{RZP_KEY}:{RZP_SEC}'.encode()).decode()
    r = requests.post('https://api.razorpay.com/v1/orders', json={
        'amount':   amount * 100,
        'currency': 'INR',
        'receipt':  f'sbz_{b["id"]}',
        'notes':    {'booking_id': str(b['id']), 'fan_id': str(p['fan_id'])}
    }, headers={'Authorization': f'Basic {auth_header}', 'Content-Type': 'application/json'})

    if r.status_code != 200:
        return jsonify({'success': False, 'message': 'Could not create payment order'}), 500

    order = r.json()
    upd('bookings', 'id=eq.' + str(b['id']), {
        'razorpay_order_id': order['id'],
        'payment_status': 'awaiting_payment'
    })
    return jsonify({
        'success':    True,
        'mock':       False,
        'key':        RZP_KEY,
        'order_id':   order['id'],
        'amount':     amount * 100,
        'currency':   'INR',
        'booking_id': b['id'],
        'fan_name':   d.get('fan_name', ''),
        'fan_email':  d.get('fan_email', '')
    })

# ══════════════════════════════════════════════════════════════════════════════
# PAYMENTS — VERIFY
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/api/payment/verify', methods=['POST'])
def verify_razorpay_payment():
    p = auth_fan()
    if not p:
        return jsonify({'success': False, 'message': 'Login required'}), 401
    d          = request.json
    booking_id = d.get('booking_id')
    order_id   = d.get('razorpay_order_id', '')
    payment_id = d.get('razorpay_payment_id', '')
    signature  = d.get('razorpay_signature', '')

    if RZP_SEC and not order_id.startswith('order_test_'):
        body     = f'{order_id}|{payment_id}'
        expected = hmac.new(RZP_SEC.encode(), body.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            return jsonify({'success': False, 'message': 'Payment verification failed'}), 400

    bk = db('bookings', 'id=eq.' + str(booking_id))
    if not bk:
        return jsonify({'success': False, 'message': 'Booking not found'}), 404

    b            = bk[0]
    fan_total    = b.get('fan_total') or b.get('amount') or 0
    platform_cut = round(fan_total * 0.05)
    creator_due  = fan_total - platform_cut

    upd('bookings', 'id=eq.' + str(booking_id), {
        'payment_status':      'paid',
        'razorpay_payment_id': payment_id,
        'razorpay_order_id':   order_id,
        'platform_cut':        platform_cut,
        'creator_due':         creator_due,
        'payout_status':       'pending'
    })
    return jsonify({
        'success':      True,
        'message':      'Payment successful! Booking confirmed.',
        'amount_paid':  fan_total,
        'platform_cut': platform_cut,
        'creator_due':  creator_due
    })

# ══════════════════════════════════════════════════════════════════════════════
# REVIEWS
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/api/booking/<int:bid>/review', methods=['POST'])
def submit_review(bid):
    p = auth_fan()
    if not p:
        return jsonify({'success': False, 'message': 'Login required'}), 401
    d  = request.json
    bk = db('bookings', 'id=eq.' + str(bid) + '&fan_id=eq.' + str(p['fan_id']) + '&status=eq.completed')
    if not bk:
        return jsonify({'success': False, 'message': 'Can only review completed bookings'}), 400
    if db('reviews', 'booking_id=eq.' + str(bid)):
        return jsonify({'success': False, 'message': 'Already reviewed'}), 409
    ins('reviews', {
        'booking_id': bid, 'fan_id': p['fan_id'],
        'creator_id': bk[0]['creator_id'],
        'rating': int(d['rating']), 'comment': d.get('comment', '')
    })
    revs = db('reviews', 'creator_id=eq.' + str(bk[0]['creator_id']) + '&select=rating')
    if revs:
        avg = round(sum(r['rating'] for r in revs) / len(revs), 1)
        upd('creators', 'id=eq.' + str(bk[0]['creator_id']), {'rating': avg, 'total_events': len(revs)})
    return jsonify({'success': True, 'message': 'Review submitted!'})

# ══════════════════════════════════════════════════════════════════════════════
# MESSAGES
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/api/booking/<int:bid>/messages', methods=['GET'])
def get_messages(bid):
    t = request.headers.get('Authorization', '').replace('Bearer ', '')
    p = token_fan(t) or token_creator(t)
    if not p:
        return jsonify({'success': False, 'message': 'Login required'}), 401
    msgs = db('messages', 'booking_id=eq.' + str(bid) + '&order=created_at.asc')
    role = 'fan' if 'fan_id' in p else 'creator'
    opp  = 'creator' if role == 'fan' else 'fan'
    upd('messages', 'booking_id=eq.' + str(bid) + '&sender_role=eq.' + opp + '&is_read=eq.false', {'is_read': True})
    return jsonify({'success': True, 'messages': msgs})

@app.route('/api/booking/<int:bid>/messages', methods=['POST'])
def send_message(bid):
    t = request.headers.get('Authorization', '').replace('Bearer ', '')
    p = token_fan(t) or token_creator(t)
    if not p:
        return jsonify({'success': False, 'message': 'Login required'}), 401
    d    = request.json
    role = 'fan' if 'fan_id' in p else 'creator'
    sid  = p.get('fan_id') or p.get('creator_id')
    ins('messages', {
        'booking_id': bid, 'sender_id': sid,
        'sender_role': role, 'content': d['content'], 'is_read': False
    })
    return jsonify({'success': True})

# ══════════════════════════════════════════════════════════════════════════════
# WISHLIST
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/api/fan/wishlist', methods=['GET'])
def get_wishlist():
    p = auth_fan()
    if not p:
        return jsonify({'success': False}), 401
    return jsonify({'success': True, 'wishlist': db('wishlists', 'fan_id=eq.' + str(p['fan_id']) + '&select=*,creators(*)')})

@app.route('/api/fan/wishlist', methods=['POST'])
def add_wishlist():
    p = auth_fan()
    if not p:
        return jsonify({'success': False}), 401
    d = request.json
    if db('wishlists', 'fan_id=eq.' + str(p['fan_id']) + '&creator_id=eq.' + str(d['creator_id'])):
        return jsonify({'success': False, 'message': 'Already saved'})
    ins('wishlists', {'fan_id': p['fan_id'], 'creator_id': d['creator_id']})
    return jsonify({'success': True, 'message': 'Added to wishlist!'})

@app.route('/api/fan/wishlist/<int:cid>', methods=['DELETE'])
def del_wishlist(cid):
    p = auth_fan()
    if not p:
        return jsonify({'success': False}), 401
    dlt('wishlists', 'fan_id=eq.' + str(p['fan_id']) + '&creator_id=eq.' + str(cid))
    return jsonify({'success': True})

# ══════════════════════════════════════════════════════════════════════════════
# RESCHEDULE
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/api/booking/<int:bid>/reschedule', methods=['POST'])
def fan_reschedule(bid):
    p = auth_fan()
    if not p:
        return jsonify({'success': False}), 401
    d = request.json
    upd('bookings', 'id=eq.' + str(bid) + '&fan_id=eq.' + str(p['fan_id']),
        {'status': 'reschedule_requested', 'requested_new_date': d['new_date']})
    return jsonify({'success': True, 'message': 'Reschedule request sent to creator.'})

@app.route('/api/creator/booking/<int:bid>/reschedule', methods=['PATCH'])
def creator_reschedule(bid):
    p = auth_creator()
    if not p:
        return jsonify({'success': False}), 401
    d  = request.json
    bk = db('bookings', 'id=eq.' + str(bid) + '&creator_id=eq.' + str(p['creator_id']))
    if not bk:
        return jsonify({'success': False}), 404
    if d['decision'] == 'accept':
        upd('bookings', 'id=eq.' + str(bid),
            {'status': 'confirmed', 'event_date': bk[0]['requested_new_date'], 'requested_new_date': None})
        return jsonify({'success': True, 'message': 'Reschedule accepted!'})
    upd('bookings', 'id=eq.' + str(bid), {'status': 'confirmed', 'requested_new_date': None})
    return jsonify({'success': True, 'message': 'Reschedule rejected. Original date kept.'})

# ══════════════════════════════════════════════════════════════════════════════
# CREATOR — BOOKING MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/api/creator/booking/<int:bid>/accept', methods=['PATCH'])
def accept_booking(bid):
    p = auth_creator()
    if not p:
        return jsonify({'success': False}), 401
    bk = db('bookings', 'id=eq.' + str(bid) + '&creator_id=eq.' + str(p['creator_id']))
    if not bk:
        return jsonify({'success': False, 'message': 'Booking not found'}), 404
    # Only accept if still pending
    b = bk[0]
    if b['status'] != 'pending':
        return jsonify({'success': False, 'message': f'Booking is already {b["status"]} — no action taken.'}), 400

    upd('bookings', 'id=eq.' + str(bid) + '&creator_id=eq.' + str(p['creator_id']), {
        'status': 'confirmed'
    })
    return jsonify({'success': True, 'message': 'Booking accepted! The fan has been notified.'})

@app.route('/api/creator/booking/<int:bid>/reject', methods=['PATCH'])
def reject_booking(bid):
    p = auth_creator()
    if not p:
        return jsonify({'success': False}), 401
    d  = request.json or {}
    bk = db('bookings', 'id=eq.' + str(bid) + '&creator_id=eq.' + str(p['creator_id']))
    if not bk:
        return jsonify({'success': False, 'message': 'Not found'}), 404
    b = bk[0]
    # If fan had already paid, flag for admin refund
    refund_status = 'refund_required' if b.get('payment_status') == 'paid' else 'none'
    upd('bookings', 'id=eq.' + str(bid), {
        'status': 'cancelled',
        'refund_status': refund_status
    })
    msg = 'Booking rejected.'
    if refund_status == 'refund_required':
        msg += ' Fan refund has been flagged for admin processing.'
    return jsonify({'success': True, 'message': msg})

@app.route('/api/creator/booking/<int:bid>/complete', methods=['PATCH'])
def complete_booking(bid):
    p = auth_creator()
    if not p:
        return jsonify({'success': False}), 401
    bk = db('bookings', 'id=eq.' + str(bid) + '&creator_id=eq.' + str(p['creator_id']))
    if not bk:
        return jsonify({'success': False, 'message': 'Not found'}), 404
    upd('bookings', 'id=eq.' + str(bid), {'status': 'completed'})
    cs = db('creators', 'id=eq.' + str(p['creator_id']))
    if cs:
        earned = (cs[0].get('total_earned') or 0) + (bk[0].get('amount') or 0)
        upd('creators', 'id=eq.' + str(p['creator_id']), {'total_earned': earned})
    return jsonify({'success': True, 'message': 'Experience marked complete!'})

@app.route('/api/creator/bookings')
def creator_bookings():
    p = auth_creator()
    if not p:
        return jsonify({'success': False}), 401
    status = request.args.get('status')
    q = 'creator_id=eq.' + str(p['creator_id']) + '&order=created_at.desc'
    if status and status != 'all':
        q += '&status=eq.' + status
    bks = db('bookings', q)
    for b in bks:
        f = db('fans', 'id=eq.' + str(b['fan_id']) + '&select=name')
        b['fan_name'] = f[0]['name'] if f else ''
    return jsonify({'success': True, 'bookings': bks})

# ══════════════════════════════════════════════════════════════════════════════
# CREATOR — PROFILE
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/api/creator/profile', methods=['GET'])
def creator_profile():
    p = auth_creator()
    if not p:
        return jsonify({'success': False}), 401
    cs = db('creators', 'id=eq.' + str(p['creator_id']))
    if not cs:
        return jsonify({'success': False}), 404
    c   = cs[0]
    bks = db('bookings', 'creator_id=eq.' + str(p['creator_id']))
    pending   = sum(1 for b in bks if b['status'] == 'pending')
    confirmed = sum(1 for b in bks if b['status'] == 'confirmed')
    earned    = sum(b.get('amount', 0) for b in bks if b['status'] == 'completed')
    return jsonify({
        'success': True, 'creator': c,
        'stats': {'pending': pending, 'confirmed': confirmed,
                  'total_earned': earned, 'pending_payout': earned}
    })

@app.route('/api/creator/profile', methods=['PATCH'])
def update_creator_profile():
    p = auth_creator()
    if not p:
        return jsonify({'success': False}), 401
    d       = request.json
    allowed = {k: v for k, v in d.items()
               if k in ['name', 'bio', 'price_from', 'instagram', 'youtube', 'phone', 'city', 'category', 'experience']}
    upd('creators', 'id=eq.' + str(p['creator_id']), allowed)
    return jsonify({'success': True, 'message': 'Profile updated!'})

# ══════════════════════════════════════════════════════════════════════════════
# CREATOR — AVAILABILITY
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/api/creator/block-date', methods=['POST'])
def block_date():
    p = auth_creator()
    if not p:
        return jsonify({'success': False}), 401
    d = request.json
    ins('creator_blocked_dates', {
        'creator_id': p['creator_id'],
        'date': d['date'], 'reason': d.get('reason', 'Unavailable')
    })
    return jsonify({'success': True})

@app.route('/api/creator/unblock-date', methods=['DELETE'])
def unblock_date():
    p = auth_creator()
    if not p:
        return jsonify({'success': False}), 401
    d = request.json
    dlt('creator_blocked_dates', 'creator_id=eq.' + str(p['creator_id']) + '&date=eq.' + d['date'])
    return jsonify({'success': True})

@app.route('/api/creator/block-range', methods=['POST'])
def block_date_range():
    p = auth_creator()
    if not p:
        return jsonify({'success': False}), 401
    d         = request.json
    from_date = datetime.datetime.strptime(d['from_date'], '%Y-%m-%d').date()
    to_date   = datetime.datetime.strptime(d['to_date'],   '%Y-%m-%d').date()
    if to_date < from_date:
        return jsonify({'success': False, 'message': 'To date must be after from date'}), 400
    reason = d.get('reason', 'Unavailable')
    cur    = from_date
    count  = 0
    while cur <= to_date:
        ds = cur.strftime('%Y-%m-%d')
        if not db('bookings', f'creator_id=eq.{p["creator_id"]}&event_date=eq.{ds}&status=in.(confirmed)'):
            ins('creator_blocked_dates', {'creator_id': p['creator_id'], 'date': ds, 'reason': reason})
            count += 1
        cur += datetime.timedelta(days=1)
    return jsonify({'success': True, 'message': f'{count} date(s) blocked.'})

# ══════════════════════════════════════════════════════════════════════════════
# CREATOR — REVIEWS
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/api/creator/reviews')
def creator_reviews():
    p = auth_creator()
    if not p:
        return jsonify({'success': False}), 401
    reviews = db('reviews', 'creator_id=eq.' + str(p['creator_id']) + '&order=created_at.desc')
    for r in reviews:
        fan = db('fans', 'id=eq.' + str(r['fan_id']) + '&select=name')
        r['fan_name'] = fan[0]['name'] if fan else 'Fan'
    return jsonify({'success': True, 'reviews': reviews})

# ══════════════════════════════════════════════════════════════════════════════
# CREATOR — IMAGES
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/api/creator/images', methods=['POST'])
def upload_image():
    p = auth_creator()
    if not p:
        return jsonify({'success': False}), 401
    d   = request.json or {}
    url = d.get('image_url', '')
    if not url:
        return jsonify({'success': False, 'message': 'Provide image_url'}), 400
    ins('creator_images', {'creator_id': p['creator_id'], 'image_url': url, 'caption': d.get('caption', ''), 'media_type': d.get('media_type', 'photo')})
    return jsonify({'success': True, 'message': 'Image added!'})

@app.route('/api/creators/<int:cid>/images', methods=['GET'])
def get_images(cid):
    return jsonify({'success': True, 'images': db('creator_images', 'creator_id=eq.' + str(cid) + '&order=created_at.desc')})

# ══════════════════════════════════════════════════════════════════════════════
# CREATOR — PAYOUTS
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/api/creator/payout/request', methods=['POST'])
def req_payout():
    p = auth_creator()
    if not p:
        return jsonify({'success': False}), 401
    d      = request.json
    if not d.get('upi_id'):
        return jsonify({'success': False, 'message': 'UPI ID required'}), 400
    cs     = db('creators', 'id=eq.' + str(p['creator_id']))
    earned = cs[0].get('total_earned', 0) if cs else 0
    if earned <= 0:
        return jsonify({'success': False, 'message': 'No earnings to withdraw'}), 400
    amount = int(d.get('amount') or earned)
    if amount > earned:
        return jsonify({'success': False, 'message': f'Amount exceeds available balance of ₹{earned:,}'}), 400
    ins('payouts', {'creator_id': p['creator_id'], 'amount': amount, 'upi_id': d['upi_id'], 'status': 'requested'})
    return jsonify({'success': True, 'message': f'Payout of ₹{amount:,} requested. Processed within 2 business days.'})

@app.route('/api/creator/payouts')
def creator_payouts():
    p = auth_creator()
    if not p:
        return jsonify({'success': False}), 401
    return jsonify({'success': True, 'payouts': db('payouts', 'creator_id=eq.' + str(p['creator_id']) + '&order=requested_at.desc')})

# ══════════════════════════════════════════════════════════════════════════════
# FAN — BOOKINGS & REFERRAL
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/api/fan/bookings')
def fan_bookings():
    p = auth_fan()
    if not p:
        return jsonify({'success': False}), 401
    bks = db('bookings', 'fan_id=eq.' + str(p['fan_id']) + '&order=created_at.desc')
    for b in bks:
        cs = db('creators', 'id=eq.' + str(b['creator_id']) + '&select=name,category,instagram,city,phone')
        if cs:
            b['creator_name']     = cs[0]['name']
            b['creator_category'] = cs[0]['category']
            b['creator_instagram']= cs[0].get('instagram', '')
            b['creator_city']     = cs[0].get('city', '')
        # Attach reference IDs
        b['ref_id']         = make_ref_id(b['id'])
        b['reservation_id'] = make_reservation_id(b['id'], p['fan_id'])
    return jsonify({'success': True, 'bookings': bks})

@app.route('/api/fan/referral')
def fan_referral():
    p = auth_fan()
    if not p:
        return jsonify({'success': False}), 401
    fans = db('fans', 'id=eq.' + str(p['fan_id']))
    if not fans:
        return jsonify({'success': False}), 404
    fan  = fans[0]
    code = fan.get('referral_code') or ref_code()
    if not fan.get('referral_code'):
        upd('fans', 'id=eq.' + str(p['fan_id']), {'referral_code': code})
    referred = db('fans', 'referred_by=eq.' + code)
    return jsonify({'success': True, 'referral_code': code, 'referrals_count': len(referred)})

@app.route('/api/waitlist', methods=['POST'])
def join_waitlist():
    d = request.json
    ins('waitlist', {'email': d['email'], 'name': d.get('name', ''), 'city': d.get('city', '')})
    return jsonify({'success': True})

# ══════════════════════════════════════════════════════════════════════════════
# ADMIN — REFUND (fan refund issued by admin)
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/api/admin/booking/<int:bid>/refund', methods=['PATCH'])
def admin_refund_fan(bid):
    if not admin_check():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    bk = db('bookings', 'id=eq.' + str(bid))
    if not bk:
        return jsonify({'success': False, 'message': 'Booking not found'}), 404
    b = bk[0]
    if b.get('payment_status') != 'paid':
        return jsonify({'success': False, 'message': 'No payment to refund for this booking'}), 400
    if b.get('refund_status') == 'refunded':
        return jsonify({'success': False, 'message': 'Already refunded'}), 400
    upd('bookings', 'id=eq.' + str(bid), {
        'refund_status': 'refunded',
        'payout_status': 'cancelled'  # no payout to creator when fan is refunded
    })
    amt = b.get('fan_total') or b.get('amount') or 0
    return jsonify({
        'success': True,
        'message': f'Refund of ₹{amt:,} marked as issued to fan. Process via Razorpay dashboard or UPI.'
    })

# ══════════════════════════════════════════════════════════════════════════════
# ADMIN — BOOKING ACTIONS (accept / reject / complete / reschedule)
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/api/admin/booking/<int:bid>/accept', methods=['PATCH'])
def admin_accept_booking(bid):
    if not admin_check():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    upd('bookings', 'id=eq.' + str(bid), {
        'status': 'confirmed',
        'creator_accepted_at': datetime.datetime.now(datetime.timezone.utc).isoformat()
    })
    return jsonify({'success': True, 'message': 'Booking confirmed by admin.'})

@app.route('/api/admin/booking/<int:bid>/reject', methods=['PATCH'])
def admin_reject_booking(bid):
    if not admin_check():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    d  = request.json or {}
    bk = db('bookings', 'id=eq.' + str(bid))
    if not bk:
        return jsonify({'success': False, 'message': 'Not found'}), 404
    b = bk[0]
    refund_status = 'refund_required' if b.get('payment_status') == 'paid' else 'none'
    upd('bookings', 'id=eq.' + str(bid), {
        'status': 'cancelled',
        'refund_status': refund_status
    })
    return jsonify({'success': True, 'message': 'Booking cancelled.' + (' Refund required.' if refund_status == 'refund_required' else '')})

@app.route('/api/admin/booking/<int:bid>/complete', methods=['PATCH'])
def admin_complete_booking(bid):
    if not admin_check():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    bk = db('bookings', 'id=eq.' + str(bid))
    if not bk:
        return jsonify({'success': False, 'message': 'Not found'}), 404
    b = bk[0]
    upd('bookings', 'id=eq.' + str(bid), {'status': 'completed'})
    cs = db('creators', 'id=eq.' + str(b['creator_id']))
    if cs:
        earned = (cs[0].get('total_earned') or 0) + (b.get('amount') or 0)
        upd('creators', 'id=eq.' + str(b['creator_id']), {'total_earned': earned})
    return jsonify({'success': True, 'message': 'Booking marked as completed.'})

@app.route('/api/admin/booking/<int:bid>/reschedule', methods=['PATCH'])
def admin_reschedule_booking(bid):
    if not admin_check():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    d  = request.json or {}
    bk = db('bookings', 'id=eq.' + str(bid))
    if not bk:
        return jsonify({'success': False, 'message': 'Not found'}), 404
    if d.get('decision') == 'accept':
        upd('bookings', 'id=eq.' + str(bid), {
            'status': 'confirmed',
            'event_date': bk[0].get('requested_new_date'),
            'requested_new_date': None
        })
        return jsonify({'success': True, 'message': 'Reschedule accepted.'})
    upd('bookings', 'id=eq.' + str(bid), {'status': 'confirmed', 'requested_new_date': None})
    return jsonify({'success': True, 'message': 'Original date kept.'})

# ══════════════════════════════════════════════════════════════════════════════
# ADMIN — DASHBOARD & LISTINGS
# ══════════════════════════════════════════════════════════════════════════════
@app.route('/api/admin/dashboard')
def admin_dash():
    if not admin_check():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    bks  = db('bookings', 'order=created_at.desc')
    fans = db('fans', 'select=id')
    crs  = db('creators', 'is_active=eq.true&select=id')
    apps = db('creator_applications', 'select=id')
    for b in bks:
        f = db('fans',     'id=eq.' + str(b['fan_id'])     + '&select=name,email')
        c = db('creators', 'id=eq.' + str(b['creator_id']) + '&select=name')
        b['fan_name']     = f[0]['name']  if f else ''
        b['fan_email']    = f[0]['email'] if f else ''
        b['creator_name'] = c[0]['name']  if c else ''
        b['ref_id']       = make_ref_id(b['id'])

    # Revenue = paid bookings that were NOT refunded to fan
    # Use both checks since payout_status column may not exist on older rows
    paid_bks = [b for b in bks
                if b.get('payment_status') == 'paid'
                and b.get('status') != 'cancelled'  # cancelled = creator rejected = refunded
                and b.get('payout_status') not in ('cancelled',)
                and b.get('refund_status') not in ('refunded', 'refund_required', 'refund_initiated')]

    gross = sum(b.get('fan_total') or b.get('amount') or 0 for b in paid_bks)
    cut   = round(gross * 0.05)

    # Creator payouts due = paid + not cancelled + not yet released to creator
    creator_due_total = sum(
        ((b.get('fan_total') or b.get('amount') or 0) - round((b.get('fan_total') or b.get('amount') or 0) * 0.05))
        for b in paid_bks
        if b.get('payout_status') not in ('paid',)
    )

    pending         = sum(1 for b in bks if b['status'] == 'pending')
    refunds_pending = sum(1 for b in bks if b.get('refund_status') in ('refund_required', 'refund_initiated'))

    return jsonify({
        'success': True, 'bookings': bks,
        'stats': {
            'total_bookings':       len(bks),
            'pending_bookings':     pending,
            'total_fans':           len(fans),
            'total_creators':       len(crs),
            'pending_applications': len(apps),
            'pending_refunds':      refunds_pending,
            'revenue': {
                'fan_total':    gross,
                'scribuz_cut':  cut,
                'creator_due':  round(creator_due_total)
            }
        }
    })

@app.route('/api/admin/applications')
def admin_applications():
    if not admin_check():
        return jsonify({'success': False}), 403
    status = request.args.get('status', '')
    q = 'order=created_at.desc'
    if status:
        q += '&status=eq.' + status
    return jsonify({'success': True, 'applications': db('creator_applications', q)})

@app.route('/api/admin/application/<int:aid>/reject', methods=['PATCH'])
def reject_application(aid):
    if not admin_check():
        return jsonify({'success': False}), 403
    upd('creator_applications', 'id=eq.' + str(aid), {'status': 'rejected'})
    return jsonify({'success': True, 'message': 'Application rejected.'})

@app.route('/api/admin/creator/approve-application', methods=['POST'])
def approve_creator_application():
    if not admin_check():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    d      = request.json
    app_id = d.get('application_id')
    if not app_id:
        return jsonify({'success': False, 'message': 'application_id required'}), 400
    apps = db('creator_applications', 'id=eq.' + str(app_id))
    if not apps:
        return jsonify({'success': False, 'message': 'Application not found'}), 404
    a        = apps[0]
    password = d.get('password')
    hashed   = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode() if password else a.get('password_hash', '')
    result   = ins('creators', {
        'name':          a['name'],
        'email':         a['email'],
        'password_hash': hashed,
        'phone':         a.get('phone', ''),
        'category':      a.get('category', ''),
        'instagram':     a.get('instagram', ''),
        'youtube':       a.get('youtube', ''),
        'bio':           a.get('bio', ''),
        'city':          a.get('city', 'Hyderabad'),
        'price_from':    a.get('price_from', 0),
        'experience':    a.get('experience', ''),
        'has_venue':     a.get('has_venue', False),
        'is_active':     True,
        'rating':        0,
        'total_events':  0,
        'total_earned':  0
    })
    if not result:
        return jsonify({'success': False, 'message': 'Failed to create creator account'}), 500
    upd('creator_applications', 'id=eq.' + str(app_id), {'status': 'approved'})
    return jsonify({'success': True, 'message': f'{a["name"]} approved! They can now log in.', 'creator_id': result[0]['id']})

@app.route('/api/admin/creators')
def admin_creators():
    if not admin_check():
        return jsonify({'success': False}), 403
    return jsonify({'success': True, 'creators': db('creators', 'is_active=eq.true&order=created_at.desc')})

@app.route('/api/admin/creator/<int:cid>/deactivate', methods=['PATCH'])
def deactivate_creator(cid):
    if not admin_check():
        return jsonify({'success': False}), 403
    upd('creators', 'id=eq.' + str(cid), {'is_active': False})
    return jsonify({'success': True, 'message': 'Creator deactivated.'})

@app.route('/api/admin/fans')
def admin_fans():
    if not admin_check():
        return jsonify({'success': False}), 403
    return jsonify({'success': True, 'fans': db('fans', 'order=created_at.desc')})

@app.route('/api/admin/payouts')
def admin_payouts():
    if not admin_check():
        return jsonify({'success': False}), 403
    payouts = db('payouts', 'order=requested_at.desc')
    for p in payouts:
        c = db('creators', 'id=eq.' + str(p['creator_id']) + '&select=name')
        p['creator_name'] = c[0]['name'] if c else ''
    return jsonify({'success': True, 'payouts': payouts})

@app.route('/api/admin/payout/<int:pid>', methods=['PATCH'])
def admin_mark_payout(pid):
    if not admin_check():
        return jsonify({'success': False}), 403
    d = request.json
    upd('payouts', 'id=eq.' + str(pid), {'status': d.get('status', 'paid')})
    return jsonify({'success': True, 'message': 'Payout updated.'})

@app.route('/api/admin/payments')
def admin_payments():
    if not admin_check():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    # Only fetch paid bookings
    bks = db('bookings', 'payment_status=eq.paid&order=created_at.desc')
    total_collected = total_platform = total_creator = total_pending = total_refunded = 0
    for b in bks:
        f = db('fans',     'id=eq.' + str(b['fan_id'])     + '&select=name,email')
        c = db('creators', 'id=eq.' + str(b['creator_id']) + '&select=name')
        b['fan_name']     = f[0]['name']         if f else ''
        b['fan_email']    = f[0].get('email','') if f else ''
        b['creator_name'] = c[0]['name']         if c else ''
        b['ref_id']       = make_ref_id(b['id'])
        fan_total    = b.get('fan_total') or b.get('amount') or 0
        # Always recalculate from fan_total — don't trust stored platform_cut
        platform_cut = round(fan_total * 0.05)
        creator_due  = fan_total - platform_cut
        b['platform_cut'] = platform_cut
        b['creator_due']  = creator_due

        # Only add to totals if payout not cancelled (i.e. not refunded to fan)
        if b.get('payout_status') != 'cancelled':
            total_collected += fan_total
            total_platform  += platform_cut
            total_creator   += creator_due
            if b.get('payout_status') != 'paid':
                total_pending += creator_due
        else:
            total_refunded += fan_total

    return jsonify({
        'success':  True,
        'payments': bks,
        'summary': {
            'total_collected':  total_collected,
            'platform_revenue': total_platform,
            'creator_payouts':  total_creator,
            'pending_payouts':  total_pending,
            'total_refunded':   total_refunded
        }
    })

@app.route('/api/admin/payout/release', methods=['POST'])
def admin_release_payout():
    if not admin_check():
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    d          = request.json
    booking_id = d.get('booking_id')
    upi_id     = d.get('upi_id', '')
    bk = db('bookings', 'id=eq.' + str(booking_id))
    if not bk:
        return jsonify({'success': False, 'message': 'Booking not found'}), 404
    b           = bk[0]
    creator_due = b.get('creator_due') or b.get('amount') or 0
    if b.get('payout_status') == 'paid':
        return jsonify({'success': False, 'message': 'Payout already released'}), 400
    if b.get('refund_status') == 'refunded':
        return jsonify({'success': False, 'message': 'Cannot release payout — this booking was refunded to fan'}), 400
    ins('payouts', {
        'creator_id': b['creator_id'],
        'amount':     creator_due,
        'upi_id':     upi_id or 'admin_manual',
        'status':     'paid'
    })
    upd('bookings', 'id=eq.' + str(booking_id), {'payout_status': 'paid'})
    cs = db('creators', 'id=eq.' + str(b['creator_id']))
    if cs:
        earned = (cs[0].get('total_earned') or 0) + creator_due
        upd('creators', 'id=eq.' + str(b['creator_id']), {'total_earned': earned})
    return jsonify({'success': True, 'message': f'₹{creator_due:,} released to creator!'})

# ══════════════════════════════════════════════════════════════════════════════
if __name__ == '__main__':
    print('ScriBuz API v5.0 starting...')
    print('')
    print('Fan site:     http://127.0.0.1:5000')
    print('Creator site: http://127.0.0.1:5000/creator/auth.html')
    print('Admin site:   http://127.0.0.1:5000/admin/')
    print('Health:       http://127.0.0.1:5000/api/health')
    app.run(host='0.0.0.0', debug=False, port=5000, use_reloader=False)