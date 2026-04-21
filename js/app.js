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

// ---- SUPABASE CLIENT ----
const supabaseUrl = 'https://vzdpvomzejaulahohyce.supabase.co';
const supabaseKey = 'sb_publishable_osvY0dcqVEts9e4X3CclZA_Cr12kwJ1';
const supabase = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

// ---- DB HELPERS ----
const DB = {
  // Events
  async getEvents() {
    const { data, error } = await supabase.from('events').select('*').order('date', { ascending: true });
    if (error) console.error(error);
    return data || [];
  },
  async getEvent(id) {
    const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
    if (error) console.error(error);
    return data || null;
  },
  async saveEvent(event) {
    const { data, error } = await supabase.from('events').upsert(event).select();
    if (error) console.error(error);
    return data ? data[0] : null;
  },
  async deleteEvent(id) {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) console.error(error);
  },

  // Registrants
  async getRegistrants() {
    const { data, error } = await supabase.from('registrants').select('*').order('createdAt', { ascending: false });
    if (error) console.error(error);
    return data || [];
  },
  async getRegistrantsByEvent(eventId) {
    const { data, error } = await supabase.from('registrants').select('*').eq('eventId', eventId);
    if (error) console.error(error);
    return data || [];
  },
  async getRegistrant(id) {
    const { data, error } = await supabase.from('registrants').select('*').eq('id', id).single();
    if (error) console.error(error);
    return data || null;
  },
  async getRegistrantByQR(qrCode) {
    const { data, error } = await supabase.from('registrants').select('*').eq('qrCode', qrCode).single();
    if (error) console.error(error);
    return data || null;
  },
  async saveRegistrant(reg) {
    const { data, error } = await supabase.from('registrants').upsert(reg).select();
    if (error) console.error(error);
    return data ? data[0] : null;
  },

  // Stats
  async getStats() {
    const events = await this.getEvents();
    const registrants = await this.getRegistrants();
    const checkedIn = registrants.filter(r => r.checkedIn).length;
    const pending = registrants.filter(r => r.paymentStatus === 'pending').length;
    const confirmed = registrants.filter(r => r.bookingStatus === 'confirmed').length;
    return {
      totalEvents: events.length,
      totalRegistrants: registrants.length,
      checkedIn,
      notCheckedIn: Math.max(0, confirmed - checkedIn),
      pendingPayment: pending,
      confirmed,
    };
  },

  // Payment management
  async getPendingPayments() {
    const { data, error } = await supabase.from('registrants').select('*').eq('paymentStatus', 'pending');
    if (error) console.error(error);
    return data || [];
  },
  async approvePayment(regId) {
    const reg = await this.getRegistrant(regId);
    if (!reg) return null;
    const updateData = {
      id: regId,
      paymentStatus: 'approved',
      bookingStatus: 'confirmed',
      approvedAt: new Date().toISOString()
    };
    return await this.saveRegistrant(updateData);
  },
  async rejectPayment(regId, reason = '') {
    const reg = await this.getRegistrant(regId);
    if (!reg) return null;
    const updateData = {
      id: regId,
      paymentStatus: 'rejected',
      bookingStatus: 'cancelled',
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason
    };
    return await this.saveRegistrant(updateData);
  },

  // Settings
  async getSettings() {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 'global').single();
    if (data) {
      return { ...DEFAULT_SETTINGS, ...data };
    }
    return { ...DEFAULT_SETTINGS };
  },
  async saveSettings(settings) {
    settings.id = 'global';
    const { error } = await supabase.from('settings').upsert(settings);
    if (error) console.error(error);
  },

  // Upload payment proof
  async uploadPaymentProof(regId, base64Image) {
    const reg = await this.getRegistrant(regId);
    if (!reg) return null;
    reg.paymentProof = base64Image;
    reg.paymentProofAt = new Date().toISOString();
    return await this.saveRegistrant(reg);
  },

  // Seed
  async seed() {
    if (!supabase) return;
    try {
      const events = await this.getEvents();
      if (events.length === 0) {
        console.log("Seeding default events to Supabase...");
        for (const ev of SEED_EVENTS) {
          await this.saveEvent(ev);
        }
        console.log("Seeding complete.");
      }
    } catch (err) {
      console.error("DB Seed error:", err);
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

async function getRegistrantCount(eventId, ticketId) {
  const regs = await DB.getRegistrantsByEvent(eventId);
  return regs.filter(r => r.ticketId === ticketId || r.ticketType === ticketId).length;
}

async function getCheckinCount(eventId) {
  const regs = await DB.getRegistrantsByEvent(eventId);
  return regs.filter(r => r.checkedIn).length;
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
async function exportCSV(eventId) {
  const regs = eventId ? await DB.getRegistrantsByEvent(eventId) : await DB.getRegistrants();
  if (!regs.length) { showToast('Tidak ada data untuk diekspor', 'warning'); return; }

  const headers = ['ID', 'Nama', 'Email', 'No. HP', 'Instansi', 'Event', 'Tipe Tiket', 'Tanggal Daftar', 'Status Check-in', 'Waktu Check-in'];
  const events = await DB.getEvents();
  const rows = regs.map(r => {
    const ev = events.find(e => e.id === r.eventId);
    return [
      r.id, r.fullName || r.name, r.email, r.phone, r.company || r.institution || '',
      ev ? ev.name : r.eventId, r.ticketId || r.ticketType,
      formatDateTime(r.createdAt || r.registeredAt),
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
