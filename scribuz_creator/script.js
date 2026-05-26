const API = 'http://127.0.0.1:5000';
const fmt  = n => '₹' + Number(n||0).toLocaleString('en-IN');
const fmtN = n => Number(n||0).toLocaleString('en-IN');

// ── SESSION ───────────────────────────────────────────────────────────────────
function getSession() {
  const token   = localStorage.getItem('sc_token');
  const creator = localStorage.getItem('sc_creator');
  if (!token || !creator) return null;
  try {
    // Check token not expired client-side before using it
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      // Token expired — clear and force re-login
      localStorage.removeItem('sc_token');
      localStorage.removeItem('sc_creator');
      return null;
    }
    return { token, creator: JSON.parse(creator) };
  } catch { return null; }
}
function doLogout() {
  localStorage.removeItem('sc_token');
  localStorage.removeItem('sc_creator');
  window.location.href = '/creator/auth.html';
}
function showToast(msg, isErr=false) {
  let t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (isErr ? ' err' : '');
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 4000);
}

// ── TABS ──────────────────────────────────────────────────────────────────────
function switchTab(name, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.dtab').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  if (btn) btn.classList.add('active');
  if (name === 'bookings')  loadBookings(currentFilter);
  if (name === 'calendar')  { loadAvailability(); renderCalendar(); }
  if (name === 'earnings')  loadEarningsTab();
  if (name === 'profile')   loadProfileTab();
  if (name === 'reviews')   loadReviews();
}

// ── INIT ──────────────────────────────────────────────────────────────────────
let calYear = new Date().getFullYear(), calMonth = new Date().getMonth();
let bookedDates = [], blockedDates = [], chatBid = null, chatPoll = null;
let currentFilter = 'all', allBookings = [], earningsChart1 = null, earningsChart2 = null;
let _toggleLock = false; // prevents calendar date spam-clicking

async function initDash() {
  const s = getSession();
  if (!s) { window.location.href = '/creator/auth.html'; return; }
  document.getElementById('dash-name').textContent = s.creator.name;
  document.getElementById('welcome-name').textContent = s.creator.name.split(' ')[0];
  // Run overview and bookings in parallel — faster load
  await Promise.all([loadOverview(), loadBookings('all')]);
}

// ── OVERVIEW ──────────────────────────────────────────────────────────────────
async function loadOverview() {
  const s   = getSession();
  const res = await fetch(`${API}/api/creator/profile`, {
    headers: { 'Authorization': `Bearer ${s.token}` }
  }).then(r => r.json()).catch(() => ({ success: false }));
  if (!res.success) return;

  const st = res.stats, c = res.creator;

  el('wb-pending').textContent   = st.pending;
  el('wb-confirmed').textContent = st.confirmed;
  el('wb-earned').textContent    = fmt(st.total_earned);

  el('stat-pending').textContent   = st.pending;
  el('stat-confirmed').textContent = st.confirmed;
  el('stat-completed').textContent = c.total_events || 0;
  el('stat-earned').textContent    = fmt(st.total_earned);
  el('stat-rating').textContent    = c.rating ? `${c.rating} ⭐` : '—';

  el('welcome-sub').textContent = st.pending > 0
    ? `You have ${st.pending} pending request${st.pending > 1 ? 's' : ''} — respond within 24 hours!`
    : st.confirmed > 0
    ? `${st.confirmed} confirmed experience${st.confirmed > 1 ? 's' : ''} coming up.`
    : 'No pending requests. Your calendar is open.';

  const bks     = await fetchAllBookings();
  allBookings   = bks;
  const upcoming = bks.filter(b => b.status === 'confirmed').sort((a,b) => new Date(a.event_date) - new Date(b.event_date));
  const uList    = el('upcoming-list');
  uList.innerHTML = upcoming.length
    ? upcoming.slice(0, 5).map(bookingCard).join('')
    : '<div class="empty"><div class="ei">📭</div>No confirmed bookings yet.</div>';

  renderBookingTypeChart(bks);
  renderEarningsChart('earnings-chart', bks, 'earnings-chart-1');
}

async function fetchAllBookings() {
  const s   = getSession();
  const res = await fetch(`${API}/api/creator/bookings`, {
    headers: { 'Authorization': `Bearer ${s.token}` }
  }).then(r => r.json()).catch(() => ({ bookings: [] }));
  return res.bookings || [];
}

// ── BOOKINGS TAB ──────────────────────────────────────────────────────────────
async function loadBookings(filter = 'all') {
  currentFilter = filter;
  const s    = getSession();
  const list = el('bookings-list');
  if (list) list.innerHTML = '<div class="empty"><div class="spinner"></div></div>';

  const url = filter === 'all'
    ? `${API}/api/creator/bookings`
    : `${API}/api/creator/bookings?status=${filter}`;

  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${s.token}` }
  }).then(r => r.json()).catch(() => ({ bookings: [] }));

  allBookings = res.bookings || [];
  if (list) {
    list.innerHTML = allBookings.length
      ? allBookings.map(bookingCard).join('')
      : `<div class="empty"><div class="ei">📭</div>No ${filter === 'all' ? '' : filter} bookings yet.</div>`;
  }
}

function bookingCard(b) {
  const dt = b.event_date
    ? new Date(b.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'TBD';
  const paid = b.payment_status === 'paid'
    ? '<span class="pbadge pb-paid">PAID</span>'
    : '<span class="pbadge pb-unpaid">UNPAID</span>';

  // Highlight pending bookings with a subtle border
  const cardStyle = b.status === 'pending'
    ? 'border-left:3px solid var(--or);'
    : b.status === 'confirmed'
    ? 'border-left:3px solid var(--bl,#A5B4FC);'
    : '';

  let acts = `<button class="cbt" onclick="openChat(${b.id},'${(b.fan_name||'Fan #'+b.fan_id).replace(/'/g,"\\'")}')">💬 Chat</button>`;

  if (b.status === 'pending') {
    acts += `<button class="abt" onclick="acceptBk(${b.id},this)">✅ Accept</button>`;
    acts += `<button class="rbt" onclick="rejectBk(${b.id},this)">❌ Reject</button>`;
  }
  if (b.status === 'confirmed') {
    acts += `<button class="gbt" onclick="completeBk(${b.id},this)">🎉 Mark complete</button>`;
  }
  if (b.status === 'reschedule_requested') {
    acts += `<button class="abt" onclick="respondResched(${b.id},'accept')">✅ Accept new date</button>`;
    acts += `<button class="rbt" onclick="respondResched(${b.id},'reject')">Keep original</button>`;
  }

  return `<div class="bitem" id="bitem-${b.id}" style="${cardStyle}">
    <div class="bi-top">
      <span class="bi-fan">${b.fan_name || 'Fan #' + b.fan_id} ${paid}</span>
      <span class="bi-amount">${fmt(b.amount)}</span>
    </div>
    <div class="bi-meta">
      📅 ${dt} &nbsp;·&nbsp; 🎉 ${b.event_type || 'Experience'} &nbsp;·&nbsp; 👥 ${b.guests || 1} guests
      &nbsp;·&nbsp; <span class="sbadge s-${b.status}">${b.status.replace(/_/g, ' ')}</span>
    </div>
    ${b.message ? `<div class="bi-msg">"${b.message}"</div>` : ''}
    ${b.status === 'reschedule_requested' && b.requested_new_date
      ? `<div style="font-size:12px;color:var(--yw);margin-bottom:8px;font-weight:600">📅 Fan wants: ${b.requested_new_date}</div>` : ''}
    <div class="bi-actions" id="bactions-${b.id}">${acts}</div>
  </div>`;
}

function filterBks(f, btn) {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  loadBookings(f);
}

// ── BOOKING ACTIONS ───────────────────────────────────────────────────────────
async function acceptBk(id, btn) {
  // Disable button immediately to prevent double-clicks
  if (btn) { btn.disabled = true; btn.textContent = 'Accepting…'; }

  const s = getSession();
  const r = await fetch(`${API}/api/creator/booking/${id}/accept`, {
    method: 'PATCH', headers: { 'Authorization': `Bearer ${s.token}` }
  }).then(r => r.json()).catch(() => ({ success: false, message: 'Network error' }));

  if (r.success) {
    showToast('✅ Booking accepted! Fan has been notified.');

    // Update the card in-place immediately — no full reload needed
    const card = el(`bitem-${id}`);
    if (card) {
      // Update status badge
      const badge = card.querySelector(`.sbadge`);
      if (badge) { badge.className = 'sbadge s-confirmed'; badge.textContent = 'confirmed'; }
      // Replace actions — remove accept/reject, show complete button
      const actionsDiv = el(`bactions-${id}`);
      if (actionsDiv) {
        actionsDiv.innerHTML = `
          <button class="cbt" onclick="openChat(${id})">💬 Chat</button>
          <button class="gbt" onclick="completeBk(${id},this)">🎉 Mark complete</button>`;
      }
      // Update left border colour
      card.style.borderLeft = '3px solid var(--bl,#A5B4FC)';
    }

    // Refresh overview stats silently in background
    loadOverview();
    loadAvailability();
  } else {
    showToast(r.message || 'Could not accept booking', true);
    // Re-enable button on failure
    if (btn) { btn.disabled = false; btn.textContent = '✅ Accept'; }
  }
}

async function rejectBk(id, btn) {
  const reason = prompt('Reason for rejection (fan will see this):') || 'Creator unavailable';
  if (btn) { btn.disabled = true; btn.textContent = 'Rejecting…'; }

  const s = getSession();
  const r = await fetch(`${API}/api/creator/booking/${id}/reject`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${s.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
  }).then(r => r.json()).catch(() => ({ success: false, message: 'Network error' }));

  if (r.success) {
    showToast('Booking rejected.');
    const card = el(`bitem-${id}`);
    if (card) {
      const badge = card.querySelector('.sbadge');
      if (badge) { badge.className = 'sbadge s-cancelled'; badge.textContent = 'cancelled'; }
      const actionsDiv = el(`bactions-${id}`);
      if (actionsDiv) actionsDiv.innerHTML = `<button class="cbt" onclick="openChat(${id})">💬 Chat</button>`;
      card.style.borderLeft = '3px solid var(--rd,#F87171)';
      card.style.opacity = '0.6';
    }
    allBookings = [];
    await loadOverview();
  } else {
    showToast(r.message || 'Could not reject booking', true);
    if (btn) { btn.disabled = false; btn.textContent = '❌ Reject'; }
  }
}

async function completeBk(id, btn) {
  if (!confirm('Mark this experience as completed? Earnings will be credited.')) return;
  if (btn) { btn.disabled = true; btn.textContent = 'Completing…'; }

  const s = getSession();
  const r = await fetch(`${API}/api/creator/booking/${id}/complete`, {
    method: 'PATCH', headers: { 'Authorization': `Bearer ${s.token}` }
  }).then(r => r.json()).catch(() => ({ success: false, message: 'Network error' }));

  if (r.success) {
    showToast('🎉 Experience marked complete! Earnings credited.');
    const card = el(`bitem-${id}`);
    if (card) {
      const badge = card.querySelector('.sbadge');
      if (badge) { badge.className = 'sbadge s-completed'; badge.textContent = 'completed'; }
      const actionsDiv = el(`bactions-${id}`);
      if (actionsDiv) actionsDiv.innerHTML = `<button class="cbt" onclick="openChat(${id})">💬 Chat</button>`;
      card.style.borderLeft = '3px solid var(--gn,#97C459)';
    }
    allBookings = [];
    await loadOverview();
  } else {
    showToast(r.message || 'Could not complete booking', true);
    if (btn) { btn.disabled = false; btn.textContent = '🎉 Mark complete'; }
  }
}

async function respondResched(id, decision) {
  const s = getSession();
  const r = await fetch(`${API}/api/creator/booking/${id}/reschedule`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${s.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision })
  }).then(r => r.json()).catch(() => ({ success: false, message: 'Network error' }));
  showToast(r.message, !r.success);
  if (r.success) loadBookings('all');
}

// ── EARNINGS TAB ──────────────────────────────────────────────────────────────
async function loadEarningsTab() {
  const s   = getSession();
  const res = await fetch(`${API}/api/creator/profile`, {
    headers: { 'Authorization': `Bearer ${s.token}` }
  }).then(r => r.json()).catch(() => ({ success: false }));
  if (!res.success) return;

  const bks  = allBookings.length ? allBookings : await fetchAllBookings();
  const done = bks.filter(b => b.status === 'completed');
  const now  = new Date();

  const monthEarned = done.filter(b => {
    const d = new Date(b.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, b) => s + (b.amount || 0), 0);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const weekEarned = done.filter(b => new Date(b.created_at) >= weekStart)
    .reduce((s, b) => s + (b.amount || 0), 0);

  const total  = res.stats.total_earned;
  const avg    = done.length > 0 ? Math.round(total / done.length) : 0;
  const nonPend = bks.filter(b => b.status !== 'pending').length;
  const acc    = bks.filter(b => b.status !== 'pending' && b.status !== 'cancelled').length;
  const rate   = nonPend > 0 ? Math.round((acc / nonPend) * 100) : 0;
  const fans   = new Set(bks.map(b => b.fan_id)).size;

  el('earn-total').textContent   = fmt(total);
  el('earn-month').textContent   = fmt(monthEarned);
  el('earn-week').textContent    = fmt(weekEarned);
  el('earn-avg').textContent     = fmt(avg);
  el('earn-count').textContent   = done.length;
  el('earn-pending').textContent = res.stats.pending;
  el('earn-rate').textContent    = rate + '%';
  el('earn-fans').textContent    = fans;
  el('payout-avail').textContent = fmt(total);

  renderEarningsChart('earnings-chart-2', bks, 'earnings-chart-2');
  loadPayoutHistory();
}

async function loadPayoutHistory() {
  const s   = getSession();
  const res = await fetch(`${API}/api/creator/payouts`, {
    headers: { 'Authorization': `Bearer ${s.token}` }
  }).then(r => r.json()).catch(() => ({ payouts: [] }));
  const ph = el('payout-history');
  const payouts = res.payouts || [];
  ph.innerHTML = payouts.length
    ? payouts.map(p => `<div class="earn-row" style="padding:10px 18px">
        <span style="font-size:12px;color:var(--tx2)">${new Date(p.requested_at||p.created_at).toLocaleDateString('en-IN')}<br>${p.upi_id}</span>
        <span><strong>${fmt(p.amount)}</strong>&nbsp;<span class="sbadge s-${p.status==='paid'?'completed':p.status==='requested'?'pending':'cancelled'}">${p.status}</span></span>
      </div>`).join('')
    : '<div class="empty" style="padding:20px">No payouts yet.</div>';
}

// ── CHARTS ────────────────────────────────────────────────────────────────────
function renderEarningsChart(canvasId, bks, key) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (window[key]) window[key].destroy();

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now    = new Date();
  const labels = [], data = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(months[d.getMonth()]);
    const earned = bks.filter(b => {
      if (b.status !== 'completed') return false;
      const bd = new Date(b.created_at);
      return bd.getMonth() === d.getMonth() && bd.getFullYear() === d.getFullYear();
    }).reduce((s, b) => s + (b.amount || 0), 0);
    data.push(earned);
  }

  window[key] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Earnings (₹)',
        data,
        backgroundColor: 'rgba(216,90,48,0.75)',
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { callback: v => '₹' + v.toLocaleString('en-IN'), font: { size: 11 } }, grid: { color: 'rgba(0,0,0,.05)' } },
        x: { ticks: { font: { size: 11 } }, grid: { display: false } }
      }
    }
  });
}

function renderBookingTypeChart(bks) {
  const types = {};
  bks.forEach(b => {
    if (b.event_type) {
      const k = b.event_type.split('/')[0].trim().substring(0, 20);
      types[k] = (types[k] || 0) + 1;
    }
  });
  const maxVal = Math.max(...Object.values(types), 1);
  const bars   = el('chart-bars');
  if (!bars) return;
  if (!Object.keys(types).length) { bars.innerHTML = '<div class="empty">No bookings yet.</div>'; return; }
  bars.innerHTML = Object.entries(types).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `
    <div class="bar-row">
      <div class="bar-label">${k}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round((v / maxVal) * 100)}%"></div></div>
      <div class="bar-val">${v}</div>
    </div>`).join('');
}

// ── CALENDAR ──────────────────────────────────────────────────────────────────
async function loadAvailability() {
  const s   = getSession();
  const res = await fetch(`${API}/api/creators/${s.creator.id}/availability`)
    .then(r => r.json()).catch(() => ({ success: false }));
  if (res.success) {
    bookedDates  = res.booked_dates.map(d => d.date);
    blockedDates = res.blocked_dates.map(d => d.date);
    renderCalendar();
    renderBookedDatesList();
  }
}

function renderBookedDatesList() {
  const list = el('booked-dates-list');
  if (!list) return;
  const now    = new Date(); now.setHours(0,0,0,0);
  const future = bookedDates.filter(d => new Date(d) >= now).sort();
  list.innerHTML = future.length
    ? future.map(d => `<div style="padding:8px 18px;border-bottom:1px solid var(--bd);font-size:13px;display:flex;justify-content:space-between">
        <span>📅 ${new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
        <span class="sbadge s-confirmed">Booked</span>
      </div>`).join('')
    : '<div class="empty" style="padding:16px">No upcoming booked dates.</div>';
}

function renderCalendar() {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  el('cal-label').textContent = `${months[calMonth]} ${calYear}`;
  const grid  = el('cal-days');
  const first = new Date(calYear, calMonth, 1).getDay();
  const dim   = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date(); today.setHours(0,0,0,0);
  let html = '';
  for (let i = 0; i < first; i++) html += '<div class="cday empty"></div>';
  for (let d = 1; d <= dim; d++) {
    const ds  = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dt  = new Date(calYear, calMonth, d);
    let cls   = 'cday';
    if (dt < today)                     cls += ' past';
    else if (bookedDates.includes(ds))  cls += ' booked';
    else if (blockedDates.includes(ds)) cls += ' blocked';
    else                                cls += ' avail';
    if (dt.toDateString() === today.toDateString()) cls += ' today';
    const clickable = !cls.includes('past') && !cls.includes('booked');
    html += `<div class="${cls}" title="${ds}" ${clickable ? `onclick="toggleBlock('${ds}')"` : ''}>${d}</div>`;
  }
  grid.innerHTML = html;
}

async function toggleBlock(ds) {
  if (_toggleLock) return;
  _toggleLock = true;
  const s   = getSession();
  const msg = el('cal-msg');
  if (blockedDates.includes(ds)) {
    await fetch(`${API}/api/creator/unblock-date`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${s.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: ds })
    });
    blockedDates = blockedDates.filter(d => d !== ds);
    msg.textContent = `✅ ${ds} is now available`;
  } else {
    await fetch(`${API}/api/creator/block-date`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${s.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: ds, reason: 'Unavailable' })
    });
    blockedDates.push(ds);
    msg.textContent = `🚫 ${ds} blocked`;
  }
  renderCalendar();
  setTimeout(() => { msg.textContent = 'Click a date to block or unblock it.'; _toggleLock = false; }, 1500);
}

async function blockRange() {
  const from   = el('block-from').value;
  const to     = el('block-to').value;
  const reason = el('block-reason').value || 'Unavailable';
  if (!from || !to) { showToast('Select both from and to dates.', true); return; }
  if (from > to)    { showToast('From date must be before to date.', true); return; }
  const s   = getSession();
  const res = await fetch(`${API}/api/creator/block-range`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${s.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from_date: from, to_date: to, reason })
  }).then(r => r.json()).catch(() => ({ success: false }));
  showToast(res.success ? `Dates blocked from ${from} to ${to}` : (res.message || 'Error'), !res.success);
  if (res.success) { el('block-from').value = ''; el('block-to').value = ''; el('block-reason').value = ''; loadAvailability(); }
}

function changeMonth(dir) {
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  renderCalendar();
}

// ── PROFILE TAB ───────────────────────────────────────────────────────────────
async function loadProfileTab() {
  const s   = getSession();
  const res = await fetch(`${API}/api/creator/profile`, {
    headers: { 'Authorization': `Bearer ${s.token}` }
  }).then(r => r.json()).catch(() => ({ success: false }));
  if (!res.success) return;
  const c = res.creator;
  el('edit-name').value       = c.name       || '';
  el('edit-bio').value        = c.bio        || '';
  el('edit-price').value      = c.price_from || '';
  el('edit-instagram').value  = c.instagram  || '';
  el('edit-youtube').value    = c.youtube    || '';
  el('edit-city').value       = c.city       || '';
  el('edit-experience').value = c.experience || '';
  if (c.category) {
    const sel = el('edit-category');
    [...sel.options].forEach(o => { if (o.value === c.category) o.selected = true; });
  }
  el('profile-preview').innerHTML = `
    <strong>${c.name}</strong> · ${c.category || '—'}<br>
    ${c.bio ? c.bio.substring(0,140)+'…' : 'No bio yet.'}<br><br>
    <span style="color:var(--or);font-weight:600">Starting from ${fmt(c.price_from)}</span> &nbsp;·&nbsp; ⭐ ${c.rating || '—'} &nbsp;·&nbsp; ${c.total_events||0} experiences
  `;
  if (c.id) el('profile-link').href = `/fan/creator.html?id=${c.id}`;
}

async function saveProfile() {
  const s   = getSession();
  const res = await fetch(`${API}/api/creator/profile`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${s.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name:       el('edit-name').value.trim(),
      bio:        el('edit-bio').value.trim(),
      price_from: parseInt(el('edit-price').value) || 0,
      instagram:  el('edit-instagram').value.trim(),
      youtube:    el('edit-youtube').value.trim(),
      city:       el('edit-city').value.trim(),
      category:   el('edit-category').value,
      experience: el('edit-experience').value.trim()
    })
  }).then(r => r.json());
  const msg = el('profile-msg');
  msg.style.display = 'block';
  msg.textContent   = res.success ? '✅ Profile updated!' : '❌ ' + res.message;
  msg.style.color   = res.success ? 'var(--gn)' : 'var(--rd)';
  setTimeout(() => msg.style.display = 'none', 3000);
  if (res.success) loadProfileTab();
}

async function changePass() {
  const cur  = el('pass-current').value;
  const nw   = el('pass-new').value;
  const conf = el('pass-confirm').value;
  const msg  = el('pass-msg');
  if (!cur || !nw) { msg.style.display='block'; msg.textContent='Fill all fields.'; msg.style.color='var(--rd)'; return; }
  if (nw !== conf) { msg.style.display='block'; msg.textContent='Passwords do not match.'; msg.style.color='var(--rd)'; return; }
  if (nw.length < 8) { msg.style.display='block'; msg.textContent='Min 8 characters.'; msg.style.color='var(--rd)'; return; }
  const s   = getSession();
  const res = await fetch(`${API}/api/creator/change-password`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${s.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ current_password: cur, new_password: nw })
  }).then(r => r.json()).catch(() => ({ success: false, message: 'Error' }));
  msg.style.display = 'block';
  msg.textContent   = res.success ? '✅ Password updated!' : '❌ ' + res.message;
  msg.style.color   = res.success ? 'var(--gn)' : 'var(--rd)';
  if (res.success) { el('pass-current').value = ''; el('pass-new').value = ''; el('pass-confirm').value = ''; }
  setTimeout(() => msg.style.display = 'none', 4000);
}

// ── REVIEWS TAB ───────────────────────────────────────────────────────────────
async function loadReviews() {
  const s   = getSession();
  const res = await fetch(`${API}/api/creator/reviews`, {
    headers: { 'Authorization': `Bearer ${s.token}` }
  }).then(r => r.json()).catch(() => ({ reviews: [] }));
  const reviews = res.reviews || [];
  const list    = el('reviews-list');
  list.innerHTML = reviews.length
    ? reviews.map(r => `<div class="bitem">
        <div class="bi-top">
          <span class="bi-fan">${r.fan_name || 'Fan'}</span>
          <span class="bi-amount">⭐ ${r.rating}/5</span>
        </div>
        <div class="bi-meta">${new Date(r.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</div>
        ${r.comment ? `<div class="bi-msg">"${r.comment}"</div>` : ''}
      </div>`).join('')
    : '<div class="empty"><div class="ei">⭐</div>No reviews yet.</div>';

  const breakdown = el('rating-breakdown');
  if (!reviews.length) return;
  const counts = {5:0,4:0,3:0,2:0,1:0};
  reviews.forEach(r => counts[r.rating]++);
  const total = reviews.length;
  const avg   = (reviews.reduce((s,r) => s+r.rating, 0) / total).toFixed(1);
  breakdown.innerHTML = `
    <div style="text-align:center;margin-bottom:16px">
      <div style="font-size:3rem;font-weight:700;color:var(--or);letter-spacing:-2px">${avg}</div>
      <div style="font-size:13px;color:var(--tx2)">${total} review${total>1?'s':''}</div>
    </div>` +
    [5,4,3,2,1].map(n => `
    <div class="bar-row" style="margin-bottom:8px">
      <div class="bar-label">${n}⭐</div>
      <div class="bar-track"><div class="bar-fill" style="width:${total>0?Math.round((counts[n]/total)*100):0}%;background:${n>=4?'var(--gn3)':n===3?'var(--yw3)':'var(--rd3)'}"></div></div>
      <div class="bar-val">${counts[n]}</div>
    </div>`).join('');
}

// ── PAYOUT ────────────────────────────────────────────────────────────────────
async function reqPayout() {
  const upi    = el('payout-upi').value.trim();
  const amount = el('payout-amount').value;
  const msg    = el('payout-msg');
  if (!upi) { msg.style.display='block'; msg.textContent='Enter UPI ID.'; msg.style.color='var(--rd)'; return; }
  const s   = getSession();
  const res = await fetch(`${API}/api/creator/payout/request`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${s.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ upi_id: upi, amount: amount ? parseInt(amount) : null })
  }).then(r => r.json());
  msg.style.display = 'block';
  msg.textContent   = res.message;
  msg.style.color   = res.success ? 'var(--gn)' : 'var(--rd)';
  if (res.success) { el('payout-upi').value = ''; el('payout-amount').value = ''; loadPayoutHistory(); }
  setTimeout(() => msg.style.display = 'none', 5000);
}

// ── CHAT ──────────────────────────────────────────────────────────────────────
function openChat(bid, fanName) {
  chatBid = bid;
  el('chat-modal').classList.add('open');
  el('chat-fan-info').textContent = `Booking #${bid}${fanName ? ' · ' + fanName : ''}`;
  loadChatMsgs();
  if (chatPoll) clearInterval(chatPoll);
  chatPoll = setInterval(loadChatMsgs, 5000);
}
function closeChat() {
  el('chat-modal').classList.remove('open');
  chatBid = null;
  if (chatPoll) clearInterval(chatPoll);
}
async function loadChatMsgs() {
  if (!chatBid) return;
  const s   = getSession();
  const res = await fetch(`${API}/api/booking/${chatBid}/messages`, {
    headers: { 'Authorization': `Bearer ${s.token}` }
  }).then(r => r.json()).catch(() => ({ success: false }));
  if (!res.success) return;
  const box = el('chat-msgs');
  box.innerHTML = res.messages.length
    ? res.messages.map(m => `<div class="msg ${m.sender_role === 'creator' ? 'sent' : 'recv'}">${m.content}<div class="msg-meta">${new Date(m.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div></div>`).join('')
    : '<div class="empty" style="padding:20px">No messages yet. Say hello!</div>';
  box.scrollTop = box.scrollHeight;
}
async function sendChat() {
  const inp = el('chat-inp');
  if (!inp.value.trim() || !chatBid) return;
  const s = getSession();
  await fetch(`${API}/api/booking/${chatBid}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${s.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: inp.value.trim() })
  });
  inp.value = ''; loadChatMsgs();
}

// ── HELPER ────────────────────────────────────────────────────────────────────
function el(id) { return document.getElementById(id); }