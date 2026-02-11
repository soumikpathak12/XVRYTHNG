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

/* =======================================================================
   ROLES & PERMISSIONS (RBAC)
   -----------------------------------------------------------------------
   GET  /api/admin/roles                    → { system, custom }
   GET  /api/admin/permissions             → permissions[]
   GET  /api/admin/roles/:id/permissions    → permissionIds[] (?type=custom for custom role)
   POST /api/admin/roles                    → create custom role
   PUT  /api/admin/roles/custom/:id/permissions → set permissionIds
   ======================================================================= */
export async function getRoles() {
  return authFetchJSON('/api/admin/roles', { method: 'GET' });
}
export async function getPermissions() {
  return authFetchJSON('/api/admin/permissions', { method: 'GET' });
}
export async function getRolePermissions(roleId, isCustom = false) {
  const q = isCustom ? '?type=custom' : '';
  return authFetchJSON(`/api/admin/roles/${roleId}/permissions${q}`, { method: 'GET' });
}
export async function createCustomRole(payload) {
  const res = await authFetch('/api/admin/roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to create role');
  return data;
}
export async function setCustomRolePermissions(customRoleId, permissionIds) {
  const res = await authFetch(`/api/admin/roles/custom/${customRoleId}/permissions`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permissionIds }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to update permissions');
  return data;
}

/* =======================================================================
   USER PROFILE (any authenticated user)
   -----------------------------------------------------------------------
   GET  /api/users/me        → profile
   PUT  /api/users/me        → update profile (JSON or multipart with photo)
   PUT  /api/users/me/password → change password
   ======================================================================= */

/**
 * GET /api/users/me
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export async function getProfileMe() {
  return authFetchJSON('/api/users/me', { method: 'GET' });
}

/**
 * GET /api/users/me/permissions
 * @returns {Promise<{ success: boolean, data: string[] }>} permission slugs e.g. ['leads:view', 'projects:edit']
 */
export async function getPermissionsMe() {
  return authFetchJSON('/api/users/me/permissions', { method: 'GET' });
}

/**
 * PUT /api/users/me - update profile (and optional photo)
 * @param {{ name?: string, email?: string, phone?: string, department?: string, notify_email?: boolean, notify_sms?: boolean, photoFile?: File }} payload
 */
export async function updateProfileMe(payload) {
  const hasFile = payload.photoFile && payload.photoFile instanceof File;
  if (hasFile) {
    const fd = new FormData();
    if (payload.name !== undefined) fd.append('name', payload.name);
    if (payload.email !== undefined) fd.append('email', payload.email);
    if (payload.phone !== undefined) fd.append('phone', payload.phone);
    if (payload.department !== undefined) fd.append('department', payload.department);
    if (payload.notify_email !== undefined) fd.append('notify_email', payload.notify_email ? '1' : '0');
    if (payload.notify_sms !== undefined) fd.append('notify_sms', payload.notify_sms ? '1' : '0');
    fd.append('photo', payload.photoFile);
    const res = await authFetch('/api/users/me', { method: 'PUT', body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || 'Failed to update profile');
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data;
  }
  const res = await authFetch('/api/users/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      department: payload.department,
      notify_email: payload.notify_email,
      notify_sms: payload.notify_sms,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 422) {
    const err = new Error('Validation failed');
    err.status = 422;
    err.body = data;
    throw err;
  }
  if (!res.ok) throw new Error(data.message || 'Failed to update profile');
  return data;
}

/**
 * PUT /api/users/me/password
 * @param {{ currentPassword: string, newPassword: string }} payload
 */
export async function changePasswordMe(payload) {
  const res = await authFetch('/api/users/me/password', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to change password');
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


export async function createLead(payload) {
  const res = await authFetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 422) {
    const err = new Error('Validation error');
    err.status = 422;
    err.body = data; // { success:false, errors:{...} }
    throw err;
  }
  if (!res.ok) {
    throw new Error(data.message || 'Failed to create lead');
  }
  return data; // { success:true, data:{...} }
}


// api.js (append to the bottom with other helpers)

/**
 * GET /api/leads
 * @param {{ grouped?: boolean, stage?: string, search?: string, assigned_user?: string, limit?: number, offset?: number }} params
 * @returns {Promise<{ success: boolean, data: any }>}
 */
export async function getLeads(params = {}) {
  const q = new URLSearchParams();
  if (params.grouped) q.set('grouped', '1');
  if (params.stage) q.set('stage', params.stage);
  if (params.search) q.set('search', params.search);
  if (params.assigned_user) q.set('assigned_user', params.assigned_user);
  if (typeof params.limit === 'number') q.set('limit', String(params.limit));
  if (typeof params.offset === 'number') q.set('offset', String(params.offset));

  const url = `/api/leads${q.toString() ? `?${q.toString()}` : ''}`;
  const res = await authFetch(url, { method: 'GET' });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || 'Failed to load leads');
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data; // { success:true, data:[...] } OR grouped object
}


export async function updateLeadStage(id, stage) {
  const res = await authFetch(`/api/leads/${encodeURIComponent(id)}/stage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 422) {
    const err = new Error('Validation error');
    err.status = 422;
    err.body = data;
    throw err;
  }
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to update lead stage');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data; // { success:true, data:{...updatedLead} }
}
