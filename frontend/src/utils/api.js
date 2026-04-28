// utils/api.js

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ─── Token helpers ────────────────────────────────────────────────────────────
export const getToken    = () => localStorage.getItem('access_token');
export const getRefresh  = () => localStorage.getItem('refresh_token');
export const getUser     = () => {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
};

export const saveAuth = (access, refresh, user) => {
  localStorage.setItem('access_token',  access);
  localStorage.setItem('refresh_token', refresh);
  localStorage.setItem('user',          JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
};

// ─── Core fetch ───────────────────────────────────────────────────────────────
async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && getRefresh()) {
    const refreshRes = await fetch(`${BASE_URL}/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: getRefresh() }),
    });
    if (refreshRes.ok) {
      const data = await refreshRes.json();
      localStorage.setItem('access_token', data.access);
      headers['Authorization'] = `Bearer ${data.access}`;
      return fetch(`${BASE_URL}${path}`, { ...options, headers });
    } else {
      clearAuth();
      window.location.href = '/login';
    }
  }

  return res;
}

async function json(path, options = {}) {
  const res = await request(path, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw { status: res.status, data: err };
  }
  if (res.status === 204) return null;
  return res.json();
}

// ─── HTTP verbs ───────────────────────────────────────────────────────────────
export const api = {
  get:    (path, params)      => json(`${path}${params ? '?' + new URLSearchParams(params) : ''}`),
  post:   (path, body)        => json(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  (path, body)        => json(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  put:    (path, body)        => json(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (path)              => json(path, { method: 'DELETE' }),
};

// ─── Auth endpoints ───────────────────────────────────────────────────────────
export const authAPI = {
  login:  (username, password) => api.post('/auth/login/', { username, password }),
  logout: (refresh)            => api.post('/auth/logout/', { refresh }),
  me:     ()                   => api.get('/auth/me/'),
};

// ─── Resource endpoints ───────────────────────────────────────────────────────
export const dashboardAPI = {
  stats: () => api.get('/dashboard/'),
};

export const entriesAPI = {
  list:     (params) => api.get('/entries/', params),
  checkIn:  (data)   => api.post('/entries/check_in/', data),
  checkOut: (data)   => api.post('/entries/check_out/', data),
  live:     ()       => api.get('/entries/live/'),
  today:    ()       => api.get('/entries/today/'),
};

export const residentsAPI = {
  list:    (params) => api.get('/residents/', params),
  get:     (id)     => api.get(`/residents/${id}/`),
  create:  (data)   => api.post('/residents/', data),
  update:  (id, d)  => api.patch(`/residents/${id}/`, d),
  delete:  (id)     => api.delete(`/residents/${id}/`),
  vehicles:(id)     => api.get(`/residents/${id}/vehicles/`),
  history: (id)     => api.get(`/residents/${id}/entry_history/`),
};

export const vehiclesAPI = {
  list:   (params) => api.get('/vehicles/', params),
  create: (data)   => api.post('/vehicles/', data),
  update: (id, d)  => api.patch(`/vehicles/${id}/`, d),
  delete: (id)     => api.delete(`/vehicles/${id}/`),
};

export const visitorsAPI = {
  list:   (params) => api.get('/visitors/', params),
  create: (data)   => api.post('/visitors/', data),
  update: (id, d)  => api.patch(`/visitors/${id}/`, d),
};

export const unitsAPI = {
  list:      (params) => api.get('/units/', params),
  get:       (id)     => api.get(`/units/${id}/`),
  create:    (data)   => api.post('/units/', data),
  update:    (id, d)  => api.patch(`/units/${id}/`, d),
  residents: (id)     => api.get(`/units/${id}/residents/`),
};

export const blocksAPI = {
  list:   ()     => api.get('/blocks/'),
  create: (data) => api.post('/blocks/', data),
};

export const gatesAPI = {
  list:   () => api.get('/gates/'),
  create: (data) => api.post('/gates/', data),
};

export const deliveriesAPI = {
  list:    (params) => api.get('/deliveries/', params),
  create:  (data)   => api.post('/deliveries/', data),
  collect: (id, d)  => api.post(`/deliveries/${id}/collect/`, d),
};

export const incidentsAPI = {
  list:    (params) => api.get('/incidents/', params),
  create:  (data)   => api.post('/incidents/', data),
  resolve: (id, d)  => api.post(`/incidents/${id}/resolve/`, d),
};

export const blacklistAPI = {
  list:   (params) => api.get('/blacklist/', params),
  create: (data)   => api.post('/blacklist/', data),
  check:  (params) => api.get('/blacklist/check/', params),
};

export const parkingAPI = {
  list:      (params) => api.get('/parking/', params),
  available: ()       => api.get('/parking/available/'),
  create:    (data)   => api.post('/parking/', data),
  update:    (id, d)  => api.patch(`/parking/${id}/`, d),
};

export const preAuthAPI = {
  list:   (params) => api.get('/pre-authorizations/', params),
  create: (data)   => api.post('/pre-authorizations/', data),
  verify: (code)   => api.get('/pre-authorizations/verify/', { code }),
};

export const usersAPI = {
  list:          (params) => api.get('/users/', params),
  create:        (data)   => api.post('/users/', data),
  update:        (id, d)  => api.patch(`/users/${id}/`, d),
  resetPassword: (id, d)  => api.post(`/users/${id}/reset_password/`, d),
  toggleActive:  (id)     => api.patch(`/users/${id}/toggle_active/`, {}),
};

export const reportsAPI = {
  entries:    (params) => api.get('/reports/', { type: 'entries', ...params }),
  incidents:  (params) => api.get('/reports/', { type: 'incidents', ...params }),
  occupancy:  ()       => api.get('/reports/', { type: 'occupancy' }),
};

export const notificationsAPI = {
  list:       ()   => api.get('/notifications/'),
  markRead:   (id) => api.patch(`/notifications/${id}/mark_read/`, {}),
  markAllRead:()   => api.post('/notifications/mark_all_read/', {}),
};

export const auditAPI = {
  list: (params) => api.get('/audit-logs/', params),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(dt) {
  const diff = (Date.now() - new Date(dt)) / 1000;
  if (diff < 60)    return `${Math.floor(diff)}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}