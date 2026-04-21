// ================================================================
// admin.js — Admin Dashboard & Event Management Logic
// ================================================================

// ---- AUTH & SECURITY CHECK ----
(function checkAdminAuth() {
  if (!window.location.pathname.endsWith('login.html')) {
    if (localStorage.getItem('evtreg_admin_auth') !== 'true') {
      window.location.replace('login.html');
    }
  }
})();

function adminLogout() {
  localStorage.removeItem('evtreg_admin_auth');
  window.location.replace('login.html');
}

// ---- SHARED SIDEBAR ACTIVE STATE ----
function initSidebar() {
  const currentPage = window.location.pathname.split('/').pop();
  document.querySelectorAll('.sidebar-link').forEach(link => {
    if (link.dataset.page === currentPage) link.classList.add('active');
  });
}

// ================================================================
// ADMIN DASHBOARD (admin/index.html)
// ================================================================
function initDashboard() {
  renderStats();
  renderRecentRegistrants();
  initEventFilter();
  renderEventSummaryCards();
}

// Global: callable from inline onclick in table rows
function approvePayment(regId) {
  const reg = DB.approvePayment(regId);
  if (reg) {
    showToast(`✅ Pembayaran ${reg.name} disetujui! Tiket aktif.`, 'success', 4000);
    // Refresh all sections that exist on the current page
    if (typeof renderPendingSection === 'function') renderPendingSection();
    if (typeof renderStats === 'function') renderStats();
    if (typeof renderRecentRegistrants === 'function') renderRecentRegistrants(document.getElementById('filter-event')?.value || '');
    if (typeof applyFilters === 'function') applyFilters(); // for registrants.html
  }
}

function renderStats() {
  const stats = DB.getStats();
  setEl('stat-total-events', stats.totalEvents);
  setEl('stat-total-registrants', stats.totalRegistrants);
  setEl('stat-checked-in', stats.checkedIn);
  setEl('stat-not-checked', stats.notCheckedIn);
  setEl('stat-pending', stats.pendingPayment || 0);
}

function renderEventSummaryCards() {
  const container = document.getElementById('event-summary-cards');
  if (!container) return;
  const events = DB.getEvents();
  if (!events.length) { container.innerHTML = '<p class="text-muted text-sm">Belum ada event.</p>'; return; }

  container.innerHTML = events.map(ev => {
    const regs = DB.getRegistrantsByEvent(ev.id);
    const checked = regs.filter(r => r.checkedIn).length;
    const pct = regs.length ? Math.round((checked / regs.length) * 100) : 0;
    return `
      <div class="card" style="padding:1.2rem;">
        <div class="flex items-center justify-between mb-2">
          <span class="badge ${getCategoryBadge(ev.category)}">${ev.category}</span>
          <span class="text-xs text-muted">${formatDate(ev.date)}</span>
        </div>
        <div class="font-semibold mb-1" style="font-size:0.9rem;">${ev.name}</div>
        <div class="text-xs text-muted mb-2">${ev.location}</div>
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <div style="flex:1;height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:var(--gradient-primary);border-radius:3px;transition:width 0.8s ease;"></div>
          </div>
          <span class="text-xs font-semibold text-violet">${checked}/${regs.length}</span>
        </div>
        <div class="text-xs text-muted mt-1">${pct}% check-in</div>
      </div>`;
  }).join('');
}

function initEventFilter() {
  const select = document.getElementById('filter-event');
  if (!select) return;
  const events = DB.getEvents();
  select.innerHTML = `<option value="">Semua Event</option>` +
    events.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
  select.addEventListener('change', () => renderRecentRegistrants(select.value));
}

function renderRecentRegistrants(eventId = '') {
  const tbody = document.getElementById('registrants-tbody');
  if (!tbody) return;
  let regs = eventId ? DB.getRegistrantsByEvent(eventId) : DB.getRegistrants();

  const search = document.getElementById('search-registrant')?.value?.toLowerCase() || '';
  if (search) regs = regs.filter(r =>
    r.name.toLowerCase().includes(search) ||
    r.email.toLowerCase().includes(search) ||
    r.id.toLowerCase().includes(search)
  );

  regs = regs.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));

  if (!regs.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding:3rem;">Tidak ada data peserta</td></tr>`;
    return;
  }

  const events = DB.getEvents();
  tbody.innerHTML = regs.map(r => {
    const ev = events.find(e => e.id === r.eventId);
    return `
      <tr>
        <td><span class="badge badge-violet" style="font-size:0.7rem;">${r.id}</span></td>
        <td>
          <div class="font-semibold text-sm">${r.name}</div>
          <div class="text-xs text-muted">${r.email}</div>
        </td>
        <td class="text-sm text-muted">${ev ? ev.name.substring(0, 30) + '…' : '-'}</td>
        <td class="text-sm">${r.ticketType}</td>
        <td class="text-xs text-muted">${formatDateTime(r.registeredAt)}</td>
        <td>
          ${r.checkedIn
            ? `<span class="badge badge-green">✓ Check-in<br><span style="font-size:0.65rem;opacity:0.7;">${formatDateTime(r.checkedInAt)}</span></span>`
            : `<span class="badge badge-amber">⏳ Belum</span>`}
        </td>
        <td>
          <a href="../ticket.html?id=${r.id}" target="_blank" class="btn btn-ghost btn-sm">🎫 Tiket</a>
        </td>
      </tr>`;
  }).join('');
}

// ================================================================
// EVENT MANAGER (admin/events.html)
// ================================================================
let editingEventId = null;
let editorGallery = [];

function initEventManager() {
  renderEventList();
  document.getElementById('btn-new-event')?.addEventListener('click', () => openEventModal());
  document.getElementById('event-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'event-modal-overlay') closeEventModal();
  });
  document.getElementById('btn-close-event-modal')?.addEventListener('click', closeEventModal);
  document.getElementById('btn-save-event')?.addEventListener('click', saveEvent);
  document.getElementById('gallery-upload-input')?.addEventListener('change', handleGalleryUpload);
  initRichTextToolbar();
}

function renderEventList() {
  const container = document.getElementById('events-list');
  if (!container) return;
  const events = DB.getEvents();
  if (!events.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><p>Belum ada event. Klik "+ Tambah Event" untuk memulai.</p></div>`;
    return;
  }
  container.innerHTML = events.map(ev => {
    const regs = DB.getRegistrantsByEvent(ev.id);
    const checked = regs.filter(r => r.checkedIn).length;
    return `
      <div class="card" style="display:flex;align-items:flex-start;gap:1.5rem;flex-wrap:wrap;">
        <div style="flex:1;min-width:200px;">
          <div class="flex items-center gap-1 mb-2">
            <span class="badge ${getCategoryBadge(ev.category)}">${ev.category}</span>
            <span class="badge ${ev.status === 'active' ? 'badge-green' : 'badge-gray'}">${ev.status === 'active' ? 'Aktif' : 'Nonaktif'}</span>
          </div>
          <div class="font-bold mb-1">${ev.name}</div>
          <div class="text-sm text-muted mb-1">📅 ${formatDate(ev.date)} · ${ev.time}–${ev.endTime}</div>
          <div class="text-sm text-muted mb-1">📍 ${ev.location}</div>
          <div class="text-sm text-muted">👥 ${regs.length} peserta · ✅ ${checked} check-in · 🖼️ ${ev.gallery?.length || 0} foto</div>
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" onclick="openEventModal('${ev.id}')">✏️ Edit</button>
          <a href="../register.html?event=${ev.id}" target="_blank" class="btn btn-outline btn-sm">🔗 Form</a>
          <button class="btn btn-danger btn-sm" onclick="deleteEventConfirm('${ev.id}')">🗑️</button>
        </div>
      </div>`;
  }).join('');
}

function openEventModal(eventId = null) {
  editingEventId = eventId;
  editorGallery = [];

  const modal = document.getElementById('event-modal-overlay');
  const title = document.getElementById('modal-event-title');
  title.textContent = eventId ? 'Edit Event' : 'Tambah Event Baru';

  // Reset form
  document.getElementById('ev-name').value = '';
  document.getElementById('ev-description').value = '';
  document.getElementById('ev-date').value = '';
  document.getElementById('ev-time').value = '09:00';
  document.getElementById('ev-end-time').value = '17:00';
  document.getElementById('ev-location').value = '';
  document.getElementById('ev-organizer').value = '';
  document.getElementById('ev-category').value = 'Workshop';
  document.getElementById('ev-capacity').value = '100';
  document.getElementById('ev-status').value = 'active';
  const piEl = document.getElementById('ev-payment-info');
  if (piEl) piEl.value = '';
  document.getElementById('ev-tickets-json').value = JSON.stringify([{ id: 'general', name: 'General', price: 0, quota: 100 }], null, 2);
  document.getElementById('terms-editor').innerHTML = '<h3>Syarat & Ketentuan</h3><p>Tuliskan syarat dan ketentuan event di sini...</p>';
  renderGalleryEditor([]);

  if (eventId) {
    const ev = DB.getEvent(eventId);
    if (!ev) return;
    document.getElementById('ev-name').value = ev.name || '';
    document.getElementById('ev-description').value = ev.description || '';
    document.getElementById('ev-date').value = ev.date || '';
    document.getElementById('ev-time').value = ev.time || '09:00';
    document.getElementById('ev-end-time').value = ev.endTime || '17:00';
    document.getElementById('ev-location').value = ev.location || '';
    document.getElementById('ev-organizer').value = ev.organizer || '';
    document.getElementById('ev-category').value = ev.category || 'Workshop';
    document.getElementById('ev-capacity').value = ev.capacity || 100;
    document.getElementById('ev-status').value = ev.status || 'active';
    const piEl2 = document.getElementById('ev-payment-info');
    if (piEl2) piEl2.value = ev.paymentInfo || '';
    document.getElementById('ev-tickets-json').value = JSON.stringify(ev.tickets || [], null, 2);
    document.getElementById('terms-editor').innerHTML = ev.terms || '';
    editorGallery = [...(ev.gallery || [])];
    renderGalleryEditor(editorGallery);
  }

  modal.classList.add('open');
}

function closeEventModal() {
  document.getElementById('event-modal-overlay')?.classList.remove('open');
  editingEventId = null;
  editorGallery = [];
}

function saveEvent() {
  const name = document.getElementById('ev-name').value.trim();
  const date = document.getElementById('ev-date').value;
  const location = document.getElementById('ev-location').value.trim();
  if (!name || !date || !location) { showToast('Nama, tanggal, dan lokasi wajib diisi', 'error'); return; }

  let tickets = [];
  try { tickets = JSON.parse(document.getElementById('ev-tickets-json').value); }
  catch { showToast('Format JSON tiket tidak valid', 'error'); return; }

  const event = {
    id: editingEventId || generateEventId(),
    name,
    description: document.getElementById('ev-description').value.trim(),
    date,
    time: document.getElementById('ev-time').value,
    endTime: document.getElementById('ev-end-time').value,
    location,
    organizer: document.getElementById('ev-organizer').value.trim(),
    category: document.getElementById('ev-category').value,
    capacity: parseInt(document.getElementById('ev-capacity').value) || 100,
    status: document.getElementById('ev-status').value,
    tickets,
    paymentInfo: document.getElementById('ev-payment-info')?.value.trim() || '',
    terms: document.getElementById('terms-editor').innerHTML,
    gallery: editorGallery,
    createdAt: editingEventId ? DB.getEvent(editingEventId)?.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  DB.saveEvent(event);
  showToast(`Event "${name}" berhasil ${editingEventId ? 'diperbarui' : 'ditambahkan'}`, 'success');
  closeEventModal();
  renderEventList();
}

function deleteEventConfirm(eventId) {
  const ev = DB.getEvent(eventId);
  if (!ev) return;
  const regs = DB.getRegistrantsByEvent(eventId).length;
  const msg = regs > 0
    ? `Event "${ev.name}" memiliki ${regs} peserta terdaftar. Hapus event ini? (Data peserta tetap tersimpan)`
    : `Hapus event "${ev.name}"?`;
  if (confirm(msg)) {
    DB.deleteEvent(eventId);
    showToast('Event berhasil dihapus', 'success');
    renderEventList();
  }
}

// ---- GALLERY ----
function handleGalleryUpload(e) {
  const files = Array.from(e.target.files);
  const MAX_FILES = 20;
  if (editorGallery.length + files.length > MAX_FILES) {
    showToast(`Maksimal ${MAX_FILES} foto per event`, 'warning'); return;
  }
  let processed = 0;
  files.forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      editorGallery.push(ev.target.result);
      processed++;
      if (processed === files.length) renderGalleryEditor(editorGallery);
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

function renderGalleryEditor(gallery) {
  const container = document.getElementById('gallery-preview');
  if (!container) return;
  if (!gallery.length) {
    container.innerHTML = '<p class="text-xs text-muted">Belum ada foto. Upload di atas.</p>';
    return;
  }
  container.innerHTML = `<div class="gallery-grid">` +
    gallery.map((src, i) => `
      <div class="gallery-thumb">
        <img src="${src}" alt="foto ${i+1}">
        <button class="remove-btn" onclick="removeGalleryPhoto(${i})" title="Hapus">✕</button>
      </div>`).join('') +
    `</div>`;
}

function removeGalleryPhoto(index) {
  editorGallery.splice(index, 1);
  renderGalleryEditor(editorGallery);
}

// ---- RICH TEXT TOOLBAR ----
function initRichTextToolbar() {
  document.querySelectorAll('.richtext-toolbar button[data-cmd]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cmd = btn.dataset.cmd;
      const val = btn.dataset.val || null;
      document.getElementById('terms-editor')?.focus();
      document.execCommand(cmd, false, val);
    });
  });
}

// ---- HELPERS ----
function setEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ---- CHECK-IN LOGIC (admin/checkin.html) ----
let scannerInstance = null;
let lastScanCode = null;

function initCheckin() {
  document.getElementById('btn-start-scan')?.addEventListener('click', startQRScanner);
  document.getElementById('btn-stop-scan')?.addEventListener('click', stopQRScanner);
  document.getElementById('manual-checkin-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = document.getElementById('manual-code-input').value.trim();
    if (code) processCheckin(code);
  });
  renderScanLog();
}

function startQRScanner() {
  const readerEl = document.getElementById('qr-reader');
  if (!readerEl) return;

  document.getElementById('btn-start-scan').classList.add('hidden');
  document.getElementById('btn-stop-scan').classList.remove('hidden');

  scannerInstance = new Html5Qrcode('qr-reader');
  scannerInstance.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => {
      if (decodedText !== lastScanCode) {
        lastScanCode = decodedText;
        processCheckin(decodedText);
        setTimeout(() => { lastScanCode = null; }, 3000);
      }
    },
    () => {}
  ).catch(err => {
    showToast('Tidak bisa mengakses kamera: ' + err, 'error');
    stopQRScanner();
  });
}

function stopQRScanner() {
  if (scannerInstance) {
    scannerInstance.stop().then(() => {
      scannerInstance.clear();
      scannerInstance = null;
      document.getElementById('btn-start-scan')?.classList.remove('hidden');
      document.getElementById('btn-stop-scan')?.classList.add('hidden');
    }).catch(() => {});
  }
}

function processCheckin(qrCode) {
  const result = document.getElementById('checkin-result-area');
  let registrant = DB.getRegistrantByQR(qrCode);

  // Fallback: coba match by ID
  if (!registrant) registrant = DB.getRegistrant(qrCode);

  if (!registrant) {
    if (result) result.innerHTML = `
      <div class="checkin-result error">
        <div class="result-icon">❌</div>
        <h3>Tiket Tidak Ditemukan</h3>
        <p class="text-sm text-muted">Kode QR tidak terdaftar dalam sistem.<br>Kode: <code>${qrCode}</code></p>
      </div>`;
    addScanLog({ code: qrCode, status: 'error', time: new Date() });
    showToast('Tiket tidak ditemukan', 'error');
    return;
  }

  const ev = DB.getEvent(registrant.eventId);

  if (registrant.checkedIn) {
    if (result) result.innerHTML = `
      <div class="checkin-result already">
        <div class="result-icon">⚠️</div>
        <h3>Sudah Check-in</h3>
        <p class="text-sm" style="color:var(--amber)">Peserta ini sudah melakukan check-in sebelumnya.</p>
        <div class="result-details">
          <div class="result-detail-row"><span>Nama</span><strong>${registrant.name}</strong></div>
          <div class="result-detail-row"><span>ID</span><strong>${registrant.id}</strong></div>
          <div class="result-detail-row"><span>Check-in pada</span><strong>${formatDateTime(registrant.checkedInAt)}</strong></div>
        </div>
      </div>`;
    addScanLog({ name: registrant.name, id: registrant.id, status: 'already', time: new Date() });
    showToast(`${registrant.name} sudah check-in`, 'warning');
    return;
  }

  // Mark checked in
  registrant.checkedIn = true;
  registrant.checkedInAt = new Date().toISOString();
  DB.saveRegistrant(registrant);

  if (result) result.innerHTML = `
    <div class="checkin-result success">
      <div class="result-icon">✅</div>
      <h3>Check-in Berhasil!</h3>
      <p class="text-sm" style="color:var(--green-light)">Selamat datang, ${registrant.name}!</p>
      <div class="result-details">
        <div class="result-detail-row"><span>Nama</span><strong>${registrant.name}</strong></div>
        <div class="result-detail-row"><span>ID Tiket</span><strong>${registrant.id}</strong></div>
        <div class="result-detail-row"><span>Event</span><strong>${ev ? ev.name : '-'}</strong></div>
        <div class="result-detail-row"><span>Jenis Tiket</span><strong>${registrant.ticketType}</strong></div>
        <div class="result-detail-row"><span>Instansi</span><strong>${registrant.institution || '-'}</strong></div>
      </div>
    </div>`;

  addScanLog({ name: registrant.name, id: registrant.id, status: 'success', time: new Date() });
  showToast(`✅ ${registrant.name} berhasil check-in!`, 'success', 4000);
}

const scanLog = [];
function addScanLog(entry) {
  scanLog.unshift(entry);
  if (scanLog.length > 50) scanLog.pop();
  renderScanLog();
}

function renderScanLog() {
  const container = document.getElementById('scan-log');
  if (!container) return;
  if (!scanLog.length) {
    container.innerHTML = '<p class="text-xs text-muted text-center" style="padding:1rem;">Belum ada aktivitas scan.</p>';
    return;
  }
  const icons = { success: '✅', already: '⚠️', error: '❌' };
  container.innerHTML = scanLog.slice(0, 20).map(e => `
    <div style="display:flex;align-items:center;gap:0.6rem;padding:0.5rem;border-bottom:1px solid rgba(255,255,255,0.04);">
      <span style="font-size:1rem;">${icons[e.status]}</span>
      <div style="flex:1;min-width:0;">
        <div class="text-sm font-semibold" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e.name || e.code || '?'}</div>
        <div class="text-xs text-muted">${e.id || ''}</div>
      </div>
      <div class="text-xs text-muted">${e.time.toLocaleTimeString('id-ID')}</div>
    </div>`).join('');
}
