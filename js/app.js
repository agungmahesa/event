// ================================================================
// app.js — Core Application Logic & localStorage Database
// ================================================================

const DB_KEYS = {
  EVENTS: 'evtreg_events',
  REGISTRANTS: 'evtreg_registrants',
  SETTINGS: 'evtreg_settings',
};

const DEFAULT_SETTINGS = {
  organizerName: 'EventHub Indonesia',
  adminContact: 'admin@eventhub.id',
  adminWhatsapp: '628123456789',
  paymentInstructions: 'Cantumkan ID Registrasi Anda sebagai berita/keterangan transfer.',
  banks: [
    { id: 'bca', bankName: 'BCA', accountNo: '1234567890', accountName: 'EventHub Indonesia', isActive: true },
    { id: 'mandiri', bankName: 'Mandiri', accountNo: '9876543210', accountName: 'EventHub Indonesia', isActive: true },
  ],
};

// ---- SEED DATA ----
const SEED_EVENTS = [
  {
    id: 'EVT-001',
    name: 'Matchaji Roadshow: Jakarta Chapter',
    description: 'Bergabunglah dalam sesi eksklusif Ceremonial Tea Ritual dan Mixology.',
    date: '2026-05-15',
    time: '14:00',
    endTime: '17:00',
    location: 'Creative Hall Mbloc Space, Jakarta',
    category: 'Workshop',
    status: 'active',
    organizer: 'Matchaji Indonesia',
    gallery: ['https://images.unsplash.com/photo-1599839619722-39751411ea63?q=80&w=800&auto=format&fit=crop'],
    tickets: [
      { id: 'TKT-1', name: 'Ceremonial Tea Ritual Pass', price: 150000, quota: 30 },
      { id: 'TKT-2', name: 'Matcha Mixology Workshop', price: 350000, quota: 15 }
    ],
    terms: '<ul><li>Peserta wajib hadir 15 menit sebelum acara dimulai.</li><li>Tidak disarankan menggunakan parfum menyengat untuk menjaga pengalaman menikmati aroma teh.</li><li>Tiket yang sudah dibeli hanya dapat dipindahtangankan maksimal h-2.</li></ul>',
    paymentInfo: 'Transfer pembayaran ke BCA 1234567890 a.n Matchaji Indonesia. Kami akan memvalidasi pembayaran dalam waktu maksimal 1x24 jam.'
  },
  {
    id: 'EVT-002',
    name: 'Matchaji Roadshow: Bandung Chapter',
    description: 'A moment of calm di tengah sejuknya Bandung dengan hidangan matcha kualitas terbaik.',
    date: '2026-05-22',
    time: '15:00',
    endTime: '18:00',
    location: '150 Coffee & Garden, Bandung',
    category: 'Event',
    status: 'active',
    organizer: 'Matchaji Indonesia',
    gallery: ['https://images.unsplash.com/photo-1582793988951-9aed550c9457?q=80&w=800&auto=format&fit=crop'],
    tickets: [
      { id: 'TKT-B1', name: 'Art of Tea Pass (RSVP)', price: 0, quota: 50 },
      { id: 'TKT-B2', name: 'Ceremonial Grade Tasting Bundle', price: 200000, quota: 25 }
    ],
    terms: '<ul><li>RSVP wajib untuk yang memilih akses gratis (Art of Tea Pass).</li><li>Peralatan akan disediakan oleh tim Matchaji.</li></ul>',
    paymentInfo: 'Transfer pembayaran ke Mandiri 987654321 a.n Matchaji Indonesia.'
  },
  {
    id: 'EVT-003',
    name: 'Matchaji Roadshow: Surabaya Chapter',
    description: 'Masterclass untuk mengetahui cara memilih, mengolah, dan menyajikan Matcha.',
    date: '2026-06-05',
    time: '10:00',
    endTime: '13:00',
    location: 'Tunjungan Plaza 6, Surabaya',
    category: 'Workshop',
    status: 'active',
    organizer: 'Matchaji Indonesia',
    gallery: ['https://images.unsplash.com/photo-1560934983-5858fc92e213?q=80&w=800&auto=format&fit=crop'],
    tickets: [
      { id: 'TKT-S1', name: 'Regular Entry', price: 50000, quota: 100 },
      { id: 'TKT-S2', name: 'VIP Matcha Masterclass', price: 500000, quota: 10 }
    ],
    terms: '<ul><li>Tiket VIP termasuk Matcha Toolkit Eksklusif.</li><li>Harap menunjukkan QR Code saat check-in di lokasi.</li></ul>',
    paymentInfo: 'Pembayaran dapat melalui QRIS ke akun Matchaji Indonesia.'
  }
];

// ---- DB HELPERS ----
const DB = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  },
  set(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },

  // Events
  getEvents() { return this.get(DB_KEYS.EVENTS); },
  getEvent(id) { return this.getEvents().find(e => e.id === id); },
  saveEvent(event) {
    const events = this.getEvents();
    const idx = events.findIndex(e => e.id === event.id);
    if (idx >= 0) events[idx] = event;
    else events.push(event);
    this.set(DB_KEYS.EVENTS, events);
  },
  deleteEvent(id) {
    const events = this.getEvents().filter(e => e.id !== id);
    this.set(DB_KEYS.EVENTS, events);
  },

  // Registrants
  getRegistrants() { return this.get(DB_KEYS.REGISTRANTS); },
  getRegistrantsByEvent(eventId) { return this.getRegistrants().filter(r => r.eventId === eventId); },
  getRegistrant(id) { return this.getRegistrants().find(r => r.id === id); },
  getRegistrantByQR(qrCode) { return this.getRegistrants().find(r => r.qrCode === qrCode); },
  saveRegistrant(reg) {
    const regs = this.getRegistrants();
    const idx = regs.findIndex(r => r.id === reg.id);
    if (idx >= 0) regs[idx] = reg;
    else regs.push(reg);
    this.set(DB_KEYS.REGISTRANTS, regs);
  },

  // Stats
  getStats() {
    const events = this.getEvents();
    const registrants = this.getRegistrants();
    const checkedIn = registrants.filter(r => r.checkedIn).length;
    const pending = registrants.filter(r => r.paymentStatus === 'pending').length;
    const confirmed = registrants.filter(r => r.bookingStatus === 'confirmed').length;
    return {
      totalEvents: events.length,
      totalRegistrants: registrants.length,
      checkedIn,
      notCheckedIn: confirmed - checkedIn,
      pendingPayment: pending,
      confirmed,
    };
  },

  // Payment management
  getPendingPayments() {
    return this.getRegistrants().filter(r => r.paymentStatus === 'pending');
  },
  approvePayment(regId) {
    const reg = this.getRegistrant(regId);
    if (!reg) return null;
    reg.paymentStatus = 'approved';
    reg.bookingStatus = 'confirmed';
    reg.approvedAt = new Date().toISOString();
    this.saveRegistrant(reg);
    return reg;
  },
  rejectPayment(regId, reason = '') {
    const reg = this.getRegistrant(regId);
    if (!reg) return null;
    reg.paymentStatus = 'rejected';
    reg.bookingStatus = 'cancelled';
    reg.rejectedAt = new Date().toISOString();
    reg.rejectionReason = reason;
    this.saveRegistrant(reg);
    return reg;
  },

  // Settings
  getSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(DB_KEYS.SETTINGS));
      return saved ? { ...DEFAULT_SETTINGS, ...saved } : { ...DEFAULT_SETTINGS };
    } catch { return { ...DEFAULT_SETTINGS }; }
  },
  saveSettings(settings) {
    localStorage.setItem(DB_KEYS.SETTINGS, JSON.stringify(settings));
  },

  // Upload payment proof
  uploadPaymentProof(regId, base64Image) {
    const reg = this.getRegistrant(regId);
    if (!reg) return null;
    reg.paymentProof = base64Image;
    reg.paymentProofAt = new Date().toISOString();
    this.saveRegistrant(reg);
    return reg;
  },

  // Seed
  seed() {
    if (this.getEvents().length === 0) {
      this.set(DB_KEYS.EVENTS, SEED_EVENTS);
    }
  }
};

// ---- UTILITIES ----
function generateId(prefix = 'REG') {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  return `${prefix}-${ts}${rand}`;
}

function generateEventId() {
  return 'evt_' + Date.now().toString(36);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(isoStr) {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(num) {
  if (!num || num === 0) return 'GRATIS';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

function getUrlParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

function setUrlParam(key, value) {
  const url = new URL(window.location);
  url.searchParams.set(key, value);
  window.history.replaceState({}, '', url);
}

function getRegistrantCount(eventId, ticketId) {
  return DB.getRegistrantsByEvent(eventId).filter(r => r.ticketType === ticketId).length;
}

function getCheckinCount(eventId) {
  return DB.getRegistrantsByEvent(eventId).filter(r => r.checkedIn).length;
}

// ---- TOAST ----
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', info: '💡', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || '💬'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ---- CATEGORY COLORS ----
function getCategoryBadge(category) {
  const map = {
    'Workshop': 'badge-violet',
    'Conference': 'badge-cyan',
    'Seminar': 'badge-amber',
    'Webinar': 'badge-green',
    'Meetup': 'badge-gray',
  };
  return map[category] || 'badge-gray';
}

// ---- EXPORT CSV ----
function exportCSV(eventId) {
  const regs = eventId ? DB.getRegistrantsByEvent(eventId) : DB.getRegistrants();
  if (!regs.length) { showToast('Tidak ada data untuk diekspor', 'warning'); return; }

  const headers = ['ID', 'Nama', 'Email', 'No. HP', 'Instansi', 'Event', 'Tipe Tiket', 'Tanggal Daftar', 'Status Check-in', 'Waktu Check-in'];
  const events = DB.getEvents();
  const rows = regs.map(r => {
    const ev = events.find(e => e.id === r.eventId);
    return [
      r.id, r.name, r.email, r.phone, r.institution || '',
      ev ? ev.name : r.eventId, r.ticketType,
      formatDateTime(r.registeredAt),
      r.checkedIn ? 'Sudah Check-in' : 'Belum Check-in',
      r.checkedInAt ? formatDateTime(r.checkedInAt) : '-'
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `peserta-${eventId || 'semua'}-${Date.now()}.csv`;
  a.click(); URL.revokeObjectURL(url);
  showToast('CSV berhasil diunduh', 'success');
}

// Init
DB.seed();
