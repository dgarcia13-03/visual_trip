// ── Auth ──────────────────────────────────────────────────────────────────────

export function getAuth() {
  try {
    return JSON.parse(localStorage.getItem('vt_auth') || 'null');
  } catch {
    return null;
  }
}

export function setAuth(data) {
  localStorage.setItem('vt_auth', JSON.stringify(data));
}

export function clearAuth() {
  localStorage.removeItem('vt_auth');
}

export function requireAuth(...roles) {
  const auth = getAuth();
  if (!auth || !auth.token) {
    location.href = '/login';
    throw new Error('Not authenticated');
  }
  if (roles.length && !roles.includes(auth.role)) {
    location.href = '/dashboard';
    throw new Error('Forbidden');
  }
  return auth;
}

// ── API fetch ─────────────────────────────────────────────────────────────────

export async function apiFetch(path, options = {}) {
  const auth = getAuth();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (auth?.token) headers['Authorization'] = `Bearer ${auth.token}`;
  const res = await fetch(path, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json.data;
}

// ── Navbar ────────────────────────────────────────────────────────────────────

export function renderNavbar(container = document.body) {
  const auth = getAuth();
  if (!auth) return;

  const roleLabel = {
    admin: 'Admin',
    teacher: 'Teacher',
    bus_company: 'Bus Co.',
    parent: 'Parent',
  };
  const roleClass = {
    admin: 'badge-admin',
    teacher: 'badge-teacher',
    bus_company: 'badge-bus',
    parent: 'badge-parent',
  };

  const nav = document.createElement('nav');
  nav.className = 'navbar';
  nav.innerHTML = `
    <a href="/dashboard" class="navbar-brand">🚌 Visual Trip</a>
    <div class="navbar-right">
      <div class="navbar-user">
        <span>${auth.name}</span>
        <span class="badge ${roleClass[auth.role] || ''}">${roleLabel[auth.role] || auth.role}</span>
      </div>
      <button class="btn btn-outline btn-sm" id="logout-btn">Logout</button>
    </div>
  `;

  const firstChild = container.firstChild;
  container.insertBefore(nav, firstChild);

  nav.querySelector('#logout-btn').addEventListener('click', async () => {
    try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    clearAuth();
    location.href = '/login';
  });
}

// ── Toast ─────────────────────────────────────────────────────────────────────

let toastContainer;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function showToast(message, type = 'default', duration = 3500) {
  const container = getToastContainer();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add('show'));
  });
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export function statusLabel(status) {
  const labels = {
    pending: 'Pending',
    approved_1: 'Approved',
    quoted: 'Quoted',
    approved_2: 'Quote Selected',
    confirmed: 'Confirmed',
    rejected: 'Rejected',
  };
  return labels[status] || status;
}

export function getIdFromPath(segment = 1) {
  // /trips/:id  → segment=1 gives the id
  // /trips/:id/permission → segment=1 still gives the id
  const parts = location.pathname.split('/').filter(Boolean);
  return parts[segment] || null;
}
