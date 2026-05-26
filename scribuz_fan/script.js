const API = 'http://127.0.0.1:5000';
const EMOJI = {Food:'👨‍🍳',Music:'🎸',Fitness:'💪',Comedy:'🎭',Tech:'💻',Gaming:'🎮',Art:'🎨',Travel:'✈️',Education:'📚'};
const BG = ['bg1','bg2','bg3','bg4','bg5','bg6'];

// ── AUTH ──────────────────────────────────────────────────────────────────────
const getToken  = () => localStorage.getItem('sb_token');
const getUser   = () => { try{ return JSON.parse(localStorage.getItem('sb_user')); }catch{ return null; } };
const isLoggedIn= () => !!getToken();
function setAuth(token, user){ localStorage.setItem('sb_token', token); localStorage.setItem('sb_user', JSON.stringify(user)); }
function clearAuth(){ localStorage.removeItem('sb_token'); localStorage.removeItem('sb_user'); }
function logout(){ clearAuth(); window.location.href = '/fan/index.html'; }
const fmt = n => Number(n||0).toLocaleString('en-IN');
const emo = c => EMOJI[c] || '⭐';

// ── NAV ───────────────────────────────────────────────────────────────────────
function updateNav() {
  const el = document.getElementById('nav-actions');
  if (!el) return;
  if (isLoggedIn()) {
    const u = getUser();
    el.innerHTML = `
      <a href="/fan/account.html" class="btn-ghost" style="font-size:13px">Hi, ${u?.name?.split(' ')[0]||'Fan'} 👋</a>
      <button class="btn-ghost" onclick="logout()">Log out</button>`;
  } else {
    el.innerHTML = `
      <a href="/fan/login.html" class="btn-ghost">Log in</a>
      <a href="/fan/signup.html" class="btn btn-primary" style="font-size:13px;padding:8px 18px">Get started</a>`;
  }
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function showToast(msg, isErr=false) {
  let t = document.getElementById('toast');
  if (!t){ t=document.createElement('div'); t.id='toast'; t.className='toast'; document.body.appendChild(t); }
  t.textContent=msg; t.className='toast'+(isErr?' err':''); t.style.display='block';
  setTimeout(()=>t.style.display='none', 3800);
}
function showMsg(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent=msg; el.className='fmsg '+type;
}

// ── CREATOR CARD ──────────────────────────────────────────────────────────────
function creatorCard(c, i) {
  return `<div class="c-card" onclick="location.href='/fan/creator.html?id=${c.id}'">
    <div class="c-img ${BG[i%6]}">${emo(c.category)}</div>
    <div class="c-body">
      <div class="c-cat">${c.category}</div>
      <div class="c-name">${c.name} ${c.is_verified?'<span class="sbadge s-completed">✓</span>':''}</div>
      <div class="c-bio">${c.bio||''}</div>
      <div class="c-meta">
        <span>👥 ${c.followers}</span>
        <span>⭐ ${c.rating}</span>
        <span>🎟 ${c.total_events}</span>
      </div>
      <div class="c-price">From <strong>₹${fmt(c.price_from)}</strong></div>
      <button class="book-btn" onclick="event.stopPropagation();location.href='/fan/book.html?id=${c.id}'">Book an experience →</button>
    </div>
  </div>`;
}

// ── FOOTER ────────────────────────────────────────────────────────────────────
function renderFooter() {
  const el = document.getElementById('footer');
  if (!el) return;
  el.innerHTML = `
  <div class="footer-main">
    <div class="footer-brand">
      <div class="footer-logo-wrap"><span class="scri">Scri</span><span class="buz">Buz</span></div>
      <p class="footer-tagline">India's first platform connecting fans with their favourite YouTube and Instagram creators — in the same room.</p>
      <div class="footer-social">
        <a href="https://instagram.com/scribuz.in" target="_blank" class="fsoc">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
          Instagram
        </a>
        <a href="https://youtube.com/@scribuz" target="_blank" class="fsoc">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          YouTube
        </a>
        <a href="https://wa.me/919999999999" target="_blank" class="fsoc">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          WhatsApp
        </a>
        <a href="mailto:hello@scribuz.in" class="fsoc">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
          Email us
        </a>
      </div>
    </div>
    <div class="footer-cols">
      <div class="footer-col">
        <div class="footer-col-title">Explore</div>
        <a href="/fan/browse.html">Browse all creators</a>
        <a href="/fan/browse.html?cat=Food">Food experiences</a>
        <a href="/fan/browse.html?cat=Music">Music sessions</a>
        <a href="/fan/browse.html?cat=Fitness">Fitness creators</a>
        <a href="/fan/browse.html?cat=Comedy">Comedy shows</a>
        <a href="/fan/browse.html?cat=Tech">Tech workshops</a>
      </div>
      <div class="footer-col">
        <div class="footer-col-title">Platform</div>
        <a href="/fan/how-it-works.html">How it works</a>
        <a href="/fan/signup.html">Fan sign up</a>
        <a href="/fan/login.html">Fan log in</a>
        <a href="/creator/auth.html">Creator sign up</a>
        <a href="/creator/auth.html">Creator log in</a>
      </div>
      <div class="footer-col">
        <div class="footer-col-title">Company</div>
        <a href="/fan/about.html">About ScriBuz</a>
        <a href="/fan/how-it-works.html">How it works</a>
        <a href="mailto:hello@scribuz.in">Contact us</a>
        <a href="mailto:hello@scribuz.in?subject=Media Enquiry">Media</a>
        <a href="mailto:hello@scribuz.in?subject=Careers">Careers</a>
      </div>
      <div class="footer-col">
        <div class="footer-col-title">Help</div>
        <a href="/fan/how-it-works.html#faq">FAQ</a>
        <a href="mailto:hello@scribuz.in">Contact support</a>
        <a href="/fan/terms.html">Terms of use</a>
        <a href="/fan/privacy.html">Privacy policy</a>
        <a href="/fan/terms.html#cancel">Cancellation policy</a>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <div class="footer-bottom-left">
      <div class="footer-logo-sm"><span class="scri">Scri</span><span class="buz">Buz</span></div>
      <span>© 2026 ScriBuz · Hyderabad, India · Secured with SSL · Made with ❤️ in India</span>
    </div>
    <div class="footer-bottom-right">
      <span style="font-size:12px;color:rgba(255,255,255,.3)">We accept</span>
      <div class="payment-badges">
        <span class="pay-badge">UPI</span>
        <span class="pay-badge">Visa</span>
        <span class="pay-badge">Mastercard</span>
        <span class="pay-badge">RuPay</span>
        <span class="pay-badge">NetBanking</span>
      </div>
    </div>
  </div>`;
}

// ── PAGE: HOME ────────────────────────────────────────────────────────────────
async function initHome() {
  updateNav(); renderFooter();
  const grid = document.getElementById('featured-grid');
  if (grid) {
    grid.innerHTML = '<div class="empty-state"><div class="spinner"></div>Loading creators…</div>';
    const res = await fetch(`${API}/api/creators`).then(r=>r.json()).catch(()=>({creators:[]}));
    grid.innerHTML = res.creators.slice(0,6).map((c,i)=>creatorCard(c,i)).join('') || '<div class="empty-state">No creators yet.</div>';
  }
  const wf = document.getElementById('waitlist-form');
  if (wf) {
    wf.addEventListener('submit', async e => {
      e.preventDefault();
      await fetch(`${API}/api/waitlist`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:document.getElementById('wl-email').value})});
      document.getElementById('wl-success').style.display='block';
      wf.style.display='none';
    });
  }
}

// ── PAGE: BROWSE ──────────────────────────────────────────────────────────────
async function initBrowse() {
  updateNav(); renderFooter();
  const grid = document.getElementById('browse-grid');
  const tabs = document.querySelectorAll('.ctab');
  const urlCat = new URLSearchParams(location.search).get('cat');
  if (urlCat) {
    tabs.forEach(t=>{ if(t.dataset.cat===urlCat){t.classList.add('active');}else{t.classList.remove('active');} });
  }
  async function load(cat) {
    grid.innerHTML = '<div class="empty-state"><div class="spinner"></div>Loading creators…</div>';
    const url = cat==='All' ? `${API}/api/creators` : `${API}/api/creators?category=${cat}`;
    const res = await fetch(url).then(r=>r.json()).catch(()=>({creators:[]}));
    grid.innerHTML = res.creators.map((c,i)=>creatorCard(c,i)).join('') || '<div class="empty-state"><div class="ei">😔</div>No creators in this category yet.</div>';
  }
  tabs.forEach(t => t.addEventListener('click', ()=>{
    tabs.forEach(x=>x.classList.remove('active')); t.classList.add('active'); load(t.dataset.cat);
  }));
  load(urlCat || 'All');
}

// ── PAGE: CREATOR PROFILE ─────────────────────────────────────────────────────
async function initCreator() {
  updateNav();
  const id = new URLSearchParams(location.search).get('id');
  const root = document.getElementById('profile-root');
  if (!id || !root) return;
  root.innerHTML = '<div class="empty-state" style="padding-top:100px"><div class="spinner"></div></div>';
  const res = await fetch(`${API}/api/creators/${id}`).then(r=>r.json()).catch(()=>({success:false}));
  if (!res.success) { root.innerHTML='<div class="empty-state" style="padding-top:100px"><div class="ei">😔</div>Creator not found.</div>'; return; }
  const c = res.creator;
  document.title = c.name + ' — ScriBuz';
  root.innerHTML = `
    <div class="profile-hero">
      <div class="ph-inner">
        <div class="ph-avatar ${BG[c.id%6]}">${emo(c.category)}</div>
        <div>
          <div class="ph-cat">${c.category}</div>
          <div class="ph-name">${c.name} ${c.is_verified?'<span class="sbadge s-completed">✓ Verified</span>':''}</div>
          <div class="ph-bio">${c.bio||''}</div>
          <div class="ph-stats">
            <div class="ph-stat"><strong>${c.followers}</strong><span>Followers</span></div>
            <div class="ph-stat"><strong>⭐ ${c.rating}</strong><span>Rating</span></div>
            <div class="ph-stat"><strong>${c.total_events}</strong><span>Experiences</span></div>
            <div class="ph-stat"><strong>₹${fmt(c.price_from)}+</strong><span>Starting price</span></div>
          </div>
        </div>
        <div class="book-card">
          <h3 style="font-size:15px;font-weight:600;margin-bottom:6px">Book ${c.name.split(' ')[0]}</h3>
          <div class="bc-price">₹${fmt(c.price_from)}+</div>
          <div class="bc-note">per experience · escrow protected · 5% fee</div>
          <a href="/fan/book.html?id=${c.id}" class="btn btn-primary btn-large btn-full">Request a Booking</a>
          <button class="wl-btn" id="wl-btn" onclick="toggleWishlist(${c.id})">❤️ Save to Wishlist</button>
          ${c.instagram?`<a href="https://instagram.com/${c.instagram.replace('@','')}" target="_blank" class="btn btn-outline btn-full" style="margin-top:10px;font-size:13px">View Instagram ↗</a>`:''}
        </div>
      </div>
    </div>
    <div class="ph-body">
      <p style="color:var(--text2);font-size:13px;margin-bottom:24px">📍 ${c.city||'Hyderabad'} · 🎟 ${c.total_events} experiences completed</p>
      ${c.images&&c.images.length?`<h3 style="font-size:16px;font-weight:600;margin-bottom:14px">Portfolio</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px">${c.images.map(img=>`<img src="${img.image_url}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;border:1.5px solid var(--border)">`).join('')}</div>`:''}
    </div>`;
  renderFooter();
}

async function toggleWishlist(cid) {
  if (!isLoggedIn()) { location.href='/fan/login.html'; return; }
  const res = await fetch(`${API}/api/fan/wishlist`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${getToken()}`},body:JSON.stringify({creator_id:cid})}).then(r=>r.json());
  showToast(res.message||(res.success?'Saved!':'Already in wishlist'));
  const btn = document.getElementById('wl-btn');
  if (btn&&res.success) btn.classList.add('saved');
}

// ── PAGE: SIGNUP ──────────────────────────────────────────────────────────────
function initSignup() {
  updateNav();
  if (isLoggedIn()) { location.href='/fan/account.html'; return; }
  document.getElementById('signup-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled=true; btn.textContent='Creating account…';
    const data = {
      name: document.getElementById('s-name').value,
      email: document.getElementById('s-email').value,
      phone: document.getElementById('s-phone').value||'',
      city: document.getElementById('s-city')?.value||'',
      password: document.getElementById('s-pass').value
    };
    const res = await fetch(`${API}/api/fan/signup`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(r=>r.json()).catch(()=>({success:false,message:'Network error'}));
    btn.disabled=false; btn.textContent='Create my account →';
    if (res.success) { setAuth(res.token, res.user); location.href='/fan/account.html'; }
    else showMsg('signup-msg', res.message||'Signup failed', 'err');
  });
}

// ── PAGE: LOGIN ───────────────────────────────────────────────────────────────
function initLogin() {
  updateNav();
  if (isLoggedIn()) { location.href='/fan/account.html'; return; }
  document.getElementById('login-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled=true; btn.textContent='Logging in…';
    const data = {email:document.getElementById('l-email').value,password:document.getElementById('l-pass').value};
    const res = await fetch(`${API}/api/fan/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(r=>r.json()).catch(()=>({success:false,message:'Network error'}));
    btn.disabled=false; btn.textContent='Log in →';
    if (res.success) { setAuth(res.token, res.user); location.href='/fan/account.html'; }
    else showMsg('login-msg', res.message||'Login failed', 'err');
  });
}

// ── PAGE: APPLY ───────────────────────────────────────────────────────────────
function initApply() {
  updateNav();
  document.getElementById('apply-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled=true; btn.textContent='Submitting…';
    const data = {
      name:document.getElementById('a-name').value,
      email:document.getElementById('a-email').value,
      phone:document.getElementById('a-phone').value||'',
      instagram:document.getElementById('a-instagram').value,
      youtube:document.getElementById('a-youtube').value||'',
      category:document.getElementById('a-category').value,
      followers:document.getElementById('a-followers').value,
      expected_fee:document.getElementById('a-fee').value||0,
      bio:document.getElementById('a-bio').value||'',
      has_venue:document.getElementById('a-venue').checked
    };
    const res = await fetch(`${API}/api/apply`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(r=>r.json()).catch(()=>({success:false,message:'Network error'}));
    btn.disabled=false; btn.textContent='Submit application →';
    if (res.success) { showMsg('apply-msg','🎉 '+res.message,'ok'); e.target.reset(); }
    else showMsg('apply-msg', res.message, 'err');
  });
}

// ── PAGE: BOOK ────────────────────────────────────────────────────────────────
async function initBook() {
  updateNav();
  if (!isLoggedIn()) { location.href='/fan/login.html?next='+encodeURIComponent(location.href); return; }
  const id = new URLSearchParams(location.search).get('id');
  if (id) {
    const res = await fetch(`${API}/api/creators/${id}`).then(r=>r.json()).catch(()=>({success:false}));
    if (res.success) {
      const c = res.creator;
      document.getElementById('book-creator').innerHTML = `
        <div class="bcm-av ${BG[c.id%6]}">${emo(c.category)}</div>
        <div>
          <div style="font-size:15px;font-weight:600">${c.name}</div>
          <div style="font-size:13px;color:var(--text2)">${c.category} · ₹${fmt(c.price_from)}+ per experience</div>
          <div style="font-size:12px;color:var(--text3);margin-top:3px">⭐ ${c.rating} · ${c.total_events} experiences done</div>
        </div>`;
    }
  }
  document.getElementById('book-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled=true; btn.textContent='Sending request…';
    const data = {
      creator_id: parseInt(id),
      event_type: document.getElementById('b-type').value,
      event_date: document.getElementById('b-date').value,
      guests:     document.getElementById('b-guests').value,
      budget:     document.getElementById('b-budget').value,
      message:    document.getElementById('b-msg').value
    };
    const res = await fetch(`${API}/api/book`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${getToken()}`},body:JSON.stringify(data)}).then(r=>r.json()).catch(()=>({success:false,message:'Network error'}));
    btn.disabled=false; btn.textContent='Send Booking Request';
    if (res.success) {
      window.location.href = '/fan/payment.html?booking_id=' + res.booking_id;
    } else {
      showMsg('book-msg', res.message, 'err');
    }
  });
}

// ── PAGE: ACCOUNT ─────────────────────────────────────────────────────────────
let chatBid=null, reviewBid=null, reschedBid=null, chatPoll=null, selRating=0;

async function initAccount() {
  updateNav();
  if (!isLoggedIn()) { location.href='/fan/login.html'; return; }
  const u = getUser();
  document.getElementById('welcome-name').textContent = u?.name?.split(' ')[0]||'there';
  await loadFanBookings('all');
  await loadWishlist();
  await loadReferral();
}

async function loadFanBookings(f='all') {
  const list = document.getElementById('bookings-list');
  list.innerHTML='<div class="empty-state"><div class="spinner"></div></div>';
  const res = await fetch(`${API}/api/fan/bookings`,{headers:{'Authorization':`Bearer ${getToken()}`}}).then(r=>r.json()).catch(()=>({bookings:[]}));
  let bks = res.bookings||[];
  if (f!=='all') bks=bks.filter(b=>b.status===f);
  list.innerHTML = bks.length ? bks.map(fanBookingCard).join('') : `<div class="empty-state"><div class="ei">📭</div>${f==='all'?'No bookings yet. <a href="/fan/browse.html" style="color:var(--orange)">Browse creators →</a>':'No '+f+' bookings.'}</div>`;
}

// ── CANCELLATION POLICY LOGIC ─────────────────────────────────────────────────
// Fan can ONLY cancel when status === 'pending' (before creator accepts).
// Once status is 'confirmed', the booking is locked — no fan cancellation.
function canFanCancel(booking) {
  return booking.status === 'pending';
}

function cancelPolicyNote(booking) {
  if (booking.status === 'pending') {
    return `<div class="cancel-policy-note pending">
      ⏳ Awaiting creator response. You can cancel before they accept.
    </div>`;
  }
  if (booking.status === 'confirmed') {
    return `<div class="cancel-policy-note locked">
      🔒 Creator has accepted — cancellation not permitted. Contact <a href="mailto:hello@scribuz.in">support</a> for help.
    </div>`;
  }
  return '';
}

function fanBookingCard(b) {
  const dt = b.event_date?new Date(b.event_date).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}):'—';
  const pb = b.payment_status==='paid'?'<span class="pbadge pb-paid">PAID</span>':b.payment_status==='failed'?'<span class="pbadge pb-failed">FAILED</span>':'<span class="pbadge pb-unpaid">UNPAID</span>';

  // Refund badge
  let refundBadge = '';
  if (b.refund_status === 'refunded') {
    refundBadge = '<span class="pbadge" style="background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7">REFUNDED</span>';
  } else if (b.refund_status === 'refund_required' || b.refund_status === 'refund_initiated') {
    refundBadge = '<span class="pbadge" style="background:#fff3e0;color:#e65100;border:1px solid #ffcc80">REFUND PROCESSING</span>';
  }

  let acts = `<button class="cob" onclick="openChat(${b.id})">💬 Chat</button>`;

  // Pay button — only if pending and not paid
  if (b.status === 'pending' && b.payment_status !== 'paid') {
    acts += `<a href="/fan/payment.html?booking_id=${b.id}" class="ab" style="padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none">💳 Pay ₹${fmt(b.fan_total||b.amount)}</a>`;
  }

  // Cancel — ONLY allowed while still pending (before creator accepts)
  if (canFanCancel(b)) {
    acts += `<button class="rb" onclick="cancelBk(${b.id})">Cancel Request</button>`;
  }

  // Confirmed actions
  if (b.status === 'confirmed') {
    acts += `<button class="reb" onclick="openResched(${b.id})">📅 Reschedule</button>`;
    acts += `<a href="/fan/ticket.html?id=${b.id}" class="chb" style="padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none">🎟 Ticket</a>`;
  }

  // Completed actions
  if (b.status === 'completed') {
    acts += `<button class="chb" onclick="openReview(${b.id})">⭐ Review</button>`;
    acts += `<a href="/fan/ticket.html?id=${b.id}" style="padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;background:var(--bg2);border:1px solid var(--border);color:var(--text2);text-decoration:none">🎟 Ticket</a>`;
  }

  // Ref IDs line
  const refLine = b.ref_id ? `<div class="bi-ref">📋 Ref: <strong>${b.ref_id}</strong>${b.reservation_id ? ` &nbsp;·&nbsp; 🔑 Res: <strong>${b.reservation_id}</strong>` : ''}</div>` : '';

  return `<div class="bitem">
    <div class="bi-top">
      <span class="bi-name">${b.creator_name||'Booking #'+b.id} ${pb} ${refundBadge}</span>
      <span class="bi-amount">₹${fmt(b.amount)}</span>
    </div>
    <div class="bi-info">📅 ${dt} · 🎉 ${b.event_type||'Experience'} · 👥 ${b.guests||1} guests · <span class="sbadge s-${b.status}">${b.status.replace('_',' ')}</span></div>
    ${refLine}
    ${b.message?`<div class="bi-msg">"${b.message}"</div>`:''}
    ${cancelPolicyNote(b)}
    <div class="bi-actions">${acts}</div>
  </div>`;
}

function filterBks(f, btn) {
  document.querySelectorAll('.btab').forEach(t=>t.classList.remove('active')); btn.classList.add('active'); loadFanBookings(f);
}

async function cancelBk(bid) {
  // Double-check on client side too
  if (!confirm('Cancel this booking request? This cannot be undone.')) return;
  const r = await fetch(`${API}/api/booking/${bid}/cancel`,{method:'PATCH',headers:{'Authorization':`Bearer ${getToken()}`}}).then(r=>r.json());
  showToast(r.message, !r.success);
  if (r.success) loadFanBookings('all');
}

// ── CHAT ──────────────────────────────────────────────────────────────────────
function openChat(bid){ chatBid=bid; document.getElementById('chat-modal').classList.add('open'); loadChatMsgs(); if(chatPoll)clearInterval(chatPoll); chatPoll=setInterval(loadChatMsgs,5000); }
function closeChat(){ document.getElementById('chat-modal').classList.remove('open'); chatBid=null; if(chatPoll)clearInterval(chatPoll); }
async function loadChatMsgs(){
  if(!chatBid) return;
  const r = await fetch(`${API}/api/booking/${chatBid}/messages`,{headers:{'Authorization':`Bearer ${getToken()}`}}).then(r=>r.json()).catch(()=>({success:false}));
  if(!r.success) return;
  const box = document.getElementById('chat-msgs');
  box.innerHTML = r.messages.length ? r.messages.map(m=>`<div class="chat-msg ${m.sender_role==='fan'?'sent':'recv'}">${m.content}<div class="chat-meta">${new Date(m.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div></div>`).join('') : '<div class="empty-state" style="padding:16px">No messages yet.</div>';
  box.scrollTop=box.scrollHeight;
}
async function sendChat(){
  const inp=document.getElementById('chat-inp');
  if(!inp.value.trim()||!chatBid) return;
  await fetch(`${API}/api/booking/${chatBid}/messages`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${getToken()}`},body:JSON.stringify({content:inp.value.trim()})});
  inp.value=''; loadChatMsgs();
}

// ── REVIEW ────────────────────────────────────────────────────────────────────
function openReview(bid){ reviewBid=bid; selRating=0; document.querySelectorAll('.stars button').forEach(b=>b.classList.remove('on')); document.getElementById('review-comment').value=''; document.getElementById('review-modal').classList.add('open'); }
function closeReview(){ document.getElementById('review-modal').classList.remove('open'); reviewBid=null; }
function setStar(n){ selRating=n; document.querySelectorAll('.stars button').forEach((b,i)=>b.classList.toggle('on',i<n)); }
async function submitReview(){
  if(!selRating){ showToast('Select a rating',true); return; }
  const r = await fetch(`${API}/api/booking/${reviewBid}/review`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${getToken()}`},body:JSON.stringify({rating:selRating,comment:document.getElementById('review-comment').value})}).then(r=>r.json());
  showToast(r.message,!r.success); if(r.success){ closeReview(); loadFanBookings('all'); }
}

// ── RESCHEDULE ────────────────────────────────────────────────────────────────
function openResched(bid){ reschedBid=bid; document.getElementById('resched-date').value=''; document.getElementById('resched-modal').classList.add('open'); }
function closeResched(){ document.getElementById('resched-modal').classList.remove('open'); reschedBid=null; }
async function submitResched(){
  const dt=document.getElementById('resched-date').value;
  if(!dt){ showToast('Pick a date',true); return; }
  const r = await fetch(`${API}/api/booking/${reschedBid}/reschedule`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${getToken()}`},body:JSON.stringify({new_date:dt})}).then(r=>r.json());
  showToast(r.message,!r.success); if(r.success){ closeResched(); loadFanBookings('all'); }
}

// ── WISHLIST ──────────────────────────────────────────────────────────────────
async function loadWishlist(){
  const grid=document.getElementById('wl-grid');
  if(!grid) return;
  const r = await fetch(`${API}/api/fan/wishlist`,{headers:{'Authorization':`Bearer ${getToken()}`}}).then(r=>r.json()).catch(()=>({wishlist:[]}));
  if(!r.wishlist||!r.wishlist.length){ grid.innerHTML='<div class="empty-state" style="grid-column:1/-1;padding:24px"><div class="ei">💭</div>No saved creators yet.</div>'; return; }
  grid.innerHTML = r.wishlist.map(w=>{ const c=w.creators||{}; return `<div class="wl-item"><button class="wl-rm" onclick="removeWl(${c.id})">×</button><div style="font-size:2rem;margin-bottom:6px">${emo(c.category)}</div><h4>${c.name||''}</h4><p>${c.category||''}</p><a href="/fan/creator.html?id=${c.id}" style="font-size:12px;color:var(--orange);font-weight:600">View →</a></div>`; }).join('');
}
async function removeWl(cid){ await fetch(`${API}/api/fan/wishlist/${cid}`,{method:'DELETE',headers:{'Authorization':`Bearer ${getToken()}`}}); loadWishlist(); }

// ── REFERRAL ──────────────────────────────────────────────────────────────────
async function loadReferral(){
  const r = await fetch(`${API}/api/fan/referral`,{headers:{'Authorization':`Bearer ${getToken()}`}}).then(r=>r.json()).catch(()=>({success:false}));
  if(r.success){ document.getElementById('ref-code').textContent=r.referral_code; document.getElementById('ref-count').textContent=r.referrals_count; }
}
function copyRef(){ navigator.clipboard.writeText(document.getElementById('ref-code').textContent); showToast('✅ Code copied!'); }
function copyRefLink(){ const c=document.getElementById('ref-code').textContent; navigator.clipboard.writeText('https://scribuz.in/?ref='+c); showToast('✅ Invite link copied!'); }