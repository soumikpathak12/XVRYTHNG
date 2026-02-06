/**
 * API client for XVRYTHNG backend.
 * Base URL via Vite proxy (/api) or env. JWT attached when present.
 */

const BASE = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('xvrythng_token');
}

export function setAuthToken(token) {
  if (token) localStorage.setItem('xvrythng_token', token);
  else localStorage.removeItem('xvrythng_token');
}

/**
 * POST /api/auth/login
 * @param {{ email: string, password: string, companyId?: number }} payload
 * @returns {Promise<{ success: boolean, token?: string, user?: object, message?: string }>}
 */
export async function login(payload) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      ...(payload.companyId != null && { companyId: payload.companyId }),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Login failed');
  }
  return data;
}

/**
 * Optional: future protected request helper (adds Authorization header).
 */
export async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    ...options.headers,
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  const res = await fetch(`${BASE}${url}`, { ...options, headers });
  return res;
}


export async function requestPasswordReset(email) {
  const res = await fetch(`${BASE}/api/auth/request-reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Unable to request reset. Please try again.');
  }
  return true;
}

/**
 * GET /api/auth/validate-reset-token?token=...
 * @param {string} token
 * @returns {Promise<{ success: boolean, valid: boolean }>}
 */
export async function validateResetToken(token) {
  const res = await fetch(
    `${BASE}/api/auth/validate-reset-token?token=${encodeURIComponent(token)}`,
    { method: 'GET' }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // API returns { success: true, valid: false } on bad tokens, but if something else fails:
    throw new Error(data.message || 'Unable to validate reset link.');
  }
  return data; // { success, valid }
}

/**
 * POST /api/auth/reset-password
 * @param {{ token: string, password: string }} payload
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export async function resetPassword(payload) {
  const res = await fetch(`${BASE}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: payload.token, password: payload.password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Unable to reset password.');
  }
  return data;
}

