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

/** Clear auth storage and notify app that session timed out (8h). */
function clearSessionAndNotify(data = {}) {
  localStorage.removeItem('xvrythng_token');
  localStorage.removeItem('xvrythng_user');
  window.dispatchEvent(
    new CustomEvent('session-expired', {
      detail: { code: data.code, message: data.message || 'Session expired' },
    })
  );
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
 * Protected request helper (adds Authorization header).
 * On 401, clears auth storage and dispatches 'session-expired' for the app to handle.
 */
export async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    ...options.headers,
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  const res = await fetch(`${BASE}${url}`, { ...options, headers });
  if (res.status === 401) {
    const data = await res.clone().json().catch(() => ({}));
    clearSessionAndNotify(data);
  }
  return res;
}

async function authFetchJSON(url, options = {}) {
  const res = await authFetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.message || 'Request failed');
    err.status = res.status;
    err.body = body;
    err.code = body.code;
    throw err;
  }
  return body;
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

/* =======================================================================
   ADMIN PROFILE (Settings → Company Profile)
   -----------------------------------------------------------------------
   Server endpoints:
     - GET  /api/admin/me
     - POST /api/admin/me  (multipart; fields + optional file "logo")
   ======================================================================= */

/**
 * GET /api/admin/me
 * @returns {Promise<{ success: boolean, data: {
 *   id:number, company_id:number|null, role_id:number, email:string,
 *   name:string, phone:string|null, abn:string|null, image_url:string|null,
 *   status:string, last_login_at:string|null, created_at:string, updated_at:string
 * } }>}
 */
export async function getAdminMe() {
  return authFetchJSON('/api/admin/me', { method: 'GET' });
}

/**
 * POST /api/admin/me
 * @param {{
 *   companyName: string,
 *   abn?: string,
 *   email: string,
 *   phone: string,
 *   logoFile?: File
 * }} payload
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export async function updateAdminMe(payload) {
  const fd = new FormData();
  fd.append('companyName', payload.companyName || '');
  fd.append('abn', payload.abn || '');
  fd.append('email', payload.email || '');
  fd.append('phone', payload.phone || '');
  if (payload.logoFile) fd.append('logo', payload.logoFile);

  // NOTE: do NOT set Content-Type; browser sets multipart boundary automatically.
  const res = await authFetch('/api/admin/me', {
    method: 'POST',
    body: fd,
  });

  const data = await res.json().catch(() => ({}));

  // Surface 422 validation errors to caller
  if (res.status === 422) {
    const err = new Error('Validation error');
    err.status = 422;
    err.body = data; // { success:false, errors:{...} }
    throw err;
  }
  if (!res.ok) {
    throw new Error(data.message || 'Failed to update profile');
  }
  return data; // { success:true, data:{...} }
}

/* =======================================================================
   MULTI-TENANT COMPANIES (Super Admin)
   -----------------------------------------------------------------------
   GET  /api/admin/company-types  → company types with modules
   GET  /api/admin/companies      → list companies
   POST /api/admin/companies     → create company + company admin
   ======================================================================= */

/**
 * GET /api/admin/company-types
 * @returns {Promise<{ success: boolean, data: Array<{ id, name, description, modules: string[] }> }>}
 */
export async function getCompanyTypes() {
  return authFetchJSON('/api/admin/company-types', { method: 'GET' });
}

/**
 * GET /api/admin/companies
 * @param {{ status?: string }} params - optional ?status=active|suspended|trial
 * @returns {Promise<{ success: boolean, data: Array<object> }>}
 */
export async function listCompanies(params = {}) {
  const q = new URLSearchParams(params).toString();
  return authFetchJSON(`/api/admin/companies${q ? `?${q}` : ''}`, { method: 'GET' });
}

/**
 * POST /api/admin/companies - create company and company admin
 * @param {{ company: object, admin: { email, password, name } }} payload
 * @returns {Promise<{ success: boolean, data: { company, adminUser } }>}
 */
export async function createCompany(payload) {
  const res = await authFetch('/api/admin/companies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 422) {
    const err = new Error('Validation failed');
    err.status = 422;
    err.body = data;
    throw err;
  }
  if (!res.ok) throw new Error(data.message || 'Failed to create company');
  return data;
}


export async function getCompanySidebar() {
  const res = await fetch('/api/company/sidebar', { headers: { ...authHeaders() } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to load sidebar');
  return data; // { role, companyTypeId, modules }
}


export async function getCompanyProfile() {
  return authFetchJSON('/api/company/me', { method: 'GET' });
}


export async function updateCompanyProfile(payload) {
  const res = await authFetch('/api/company/me', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: payload.companyName ?? '',
      abn: payload.abn ?? '',
      email: payload.email ?? '',
      phone: payload.phone ?? '',
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (res.status === 422) {
    const err = new Error('Validation error');
    err.status = 422;
    err.body = data; // { success:false, errors:{...} }
    throw err;
  }
  if (!res.ok) throw new Error(data.message ?? 'Failed to update company profile');
  return data; // { success:true, data:{...} }
}


