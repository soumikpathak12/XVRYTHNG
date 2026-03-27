/**
 * API client for XVRYTHNG backend.
 * Base URL via Vite proxy (/api) or env. JWT attached when present.
 */

const BASE = import.meta.env.VITE_API_URL || '';

export function getToken() {
  return localStorage.getItem('xvrythng_token');
}

export function setAuthToken(token) {
  if (token) localStorage.setItem('xvrythng_token', token);
  else localStorage.removeItem('xvrythng_token');
}

/* ---------- Customer portal (simulated OTP login) ---------- */
const CUSTOMER_CREDENTIALS_KEY = 'xvrythng_customer_credentials';

export function getCustomerToken() {
  return localStorage.getItem('xvrythng_customer_token');
}

export function setCustomerToken(token) {
  if (token) localStorage.setItem('xvrythng_customer_token', token);
  else localStorage.removeItem('xvrythng_customer_token');
}

/**
 * Customer portal (customer JWT):
 * - staff JWT uses `xvrythng_token` and `authFetch`
 * - customer JWT uses `xvrythng_customer_token`
 */
async function customerAuthFetch(url, options = {}) {
  const token = getCustomerToken();
  const headers = {
    ...(options.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${BASE}${url}`, { ...options, headers });
  return res;
}

async function customerAuthFetchJSON(url, options = {}) {
  const res = await customerAuthFetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Request failed');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

/** Store sent credentials for a lead (simulated). Called when staff sends credentials. */
export function saveCustomerCredentials(email, { leadId, otp, customerName }) {
  const raw = localStorage.getItem(CUSTOMER_CREDENTIALS_KEY);
  const map = raw ? JSON.parse(raw) : {};
  map[email.toLowerCase().trim()] = { leadId, otp: String(otp), customerName };
  localStorage.setItem(CUSTOMER_CREDENTIALS_KEY, JSON.stringify(map));
}

export function getCustomerCredentials(email) {
  const raw = localStorage.getItem(CUSTOMER_CREDENTIALS_KEY);
  const map = raw ? JSON.parse(raw) : {};
  return map[email.toLowerCase().trim()] || null;
}

/**
 * GET /api/customer/verify-link?token= – validate link token, returns { valid, email?, customerName? }.
 */
export async function customerVerifyLink(token) {
  const res = await fetch(`${BASE}/api/customer/verify-link?token=${encodeURIComponent(token)}`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Invalid link');
  return data;
}

/**
 * POST /api/customer/request-otp – send OTP to email (requires token from link).
 */
export async function customerRequestOtp(email, token) {
  const res = await fetch(`${BASE}/api/customer/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: String(email).trim(), token: token || undefined }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not send OTP');
  return data;
}

/**
 * POST /api/customer/login – verify OTP with backend, returns { success, token, user }.
 */
export async function customerLoginApi(email, otp) {
  const res = await fetch(`${BASE}/api/customer/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: String(email).trim(), otp: String(otp).trim() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Invalid or expired OTP.');
  return data;
}

/**
 * POST /api/customer/submit-referral – submit a referral (creates lead in CRM, NEW stage, source=referral).
 * Requires customer token. Body: { friendName, friendEmail, friendPhone }.
 */
export async function submitReferralApi(payload) {
  const token = getCustomerToken();
  if (!token) throw new Error('Please sign in to submit a referral.');
  const res = await fetch(`${BASE}/api/customer/submit-referral`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      friendName: String(payload.friendName ?? '').trim(),
      friendEmail: String(payload.friendEmail ?? '').trim(),
      friendPhone: String(payload.friendPhone ?? '').trim(),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to submit referral');
  return data;
}

/* ---------- Support tickets (T-337) ---------- */

/** POST /api/customer/support-tickets – create ticket. Requires customer token. */
export async function createSupportTicketApi(payload) {
  const token = getCustomerToken();
  if (!token) throw new Error('Please sign in to submit a support ticket.');
  const res = await fetch(`${BASE}/api/customer/support-tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      subject: String(payload.subject ?? '').trim(),
      body: String(payload.body ?? '').trim(),
      priority: payload.priority || 'medium',
      category: payload.category || 'installation',
      categoryOther: payload.categoryOther ?? null,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to submit ticket');
  return data;
}

/** GET /api/customer/support-tickets – list customer's tickets. */
export async function listSupportTicketsApi() {
  const token = getCustomerToken();
  if (!token) throw new Error('Please sign in to view support tickets.');
  const res = await fetch(`${BASE}/api/customer/support-tickets`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to load tickets');
  return data;
}

/** GET /api/customer/support-tickets/:id – get ticket with replies. */
export async function getSupportTicketApi(ticketId) {
  const token = getCustomerToken();
  if (!token) throw new Error('Please sign in to view this ticket.');
  const res = await fetch(`${BASE}/api/customer/support-tickets/${encodeURIComponent(ticketId)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to load ticket');
  return data;
}

/** POST /api/customer/support-tickets/:id/withdraw – withdraw ticket. */
export async function withdrawSupportTicketApi(ticketId) {
  const token = getCustomerToken();
  if (!token) throw new Error('Please sign in to withdraw a ticket.');
  const res = await fetch(`${BASE}/api/customer/support-tickets/${encodeURIComponent(ticketId)}/withdraw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to withdraw ticket');
  return data;
}

/** POST /api/customer/support-tickets/:id/replies – add reply. */
export async function addSupportTicketReplyApi(ticketId, { body }) {
  const token = getCustomerToken();
  if (!token) throw new Error('Please sign in to reply.');
  const res = await fetch(`${BASE}/api/customer/support-tickets/${encodeURIComponent(ticketId)}/replies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ body: String(body ?? '').trim() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to send reply');
  return data;
}

/* ---------- Admin support tickets ---------- */

/** GET /api/admin/support-tickets */
export async function listAdminSupportTickets(params = {}) {
  const q = new URLSearchParams();
  if (params.companyId) q.set('companyId', params.companyId);
  if (params.status) q.set('status', params.status);
  if (params.limit) q.set('limit', params.limit);
  if (params.offset) q.set('offset', params.offset);
  const url = `/api/admin/support-tickets${q.toString() ? `?${q.toString()}` : ''}`;
  const data = await authFetchJSON(url, { method: 'GET' });
  return data;
}

/** GET /api/admin/support-tickets/:id */
export async function getAdminSupportTicket(ticketId) {
  const data = await authFetchJSON(`/api/admin/support-tickets/${encodeURIComponent(ticketId)}`, { method: 'GET' });
  return data;
}

/** POST /api/admin/support-tickets/:id/replies */
export async function addAdminSupportTicketReply(ticketId, { body }) {
  const data = await authFetchJSON(`/api/admin/support-tickets/${encodeURIComponent(ticketId)}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: String(body ?? '').trim() }),
  });
  return data;
}

/** PATCH /api/admin/support-tickets/:id/status */
export async function updateAdminSupportTicketStatus(ticketId, status) {
  const data = await authFetchJSON(`/api/admin/support-tickets/${encodeURIComponent(ticketId)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return data;
}

/** Fallback: simulated customer login from localStorage (when backend OTP not used). */
export function customerLoginLocal(email, otp) {
  const creds = getCustomerCredentials(email);
  if (!creds) throw new Error('No credentials found for this email. Ask your project team to send you a login link.');
  if (String(otp).trim() !== creds.otp) throw new Error('Invalid OTP. Please check the code sent to your email.');
  const token = 'customer_' + creds.leadId + '_' + Date.now();
  const user = {
    role: 'customer',
    email: email.trim(),
    name: creds.customerName || email,
    leadId: creds.leadId,
  };
  setCustomerToken(token);
  localStorage.setItem('xvrythng_customer_user', JSON.stringify(user));
  return { success: true, token, user };
}

const CUSTOMER_PROJECT_PREFIX = 'xvrythng_customer_project_';

/** Store project/lead snapshot for customer view (when staff sends credentials). */
export function saveCustomerProjectSnapshot(leadId, lead) {
  localStorage.setItem(
    CUSTOMER_PROJECT_PREFIX + leadId,
    JSON.stringify({
      customer_name: lead.customer_name,
      email: lead.email,
      suburb: lead.suburb,
      system_size_kw: lead.system_size_kw,
      value_amount: lead.value_amount,
      site_inspection_date: lead.site_inspection_date,
      stage: lead.stage,
    })
  );
}

export function getCustomerProjectSnapshot(leadId) {
  const raw = localStorage.getItem(CUSTOMER_PROJECT_PREFIX + leadId);
  return raw ? JSON.parse(raw) : null;
}

/** Clear auth storage and notify app that session timed out (8h). */
function clearSessionAndNotify(data = {}) {
  localStorage.removeItem('xvrythng_token');
  localStorage.removeItem('xvrythng_user');
  window.dispatchEvent(
    new CustomEvent('session-expired', {
      detail: { code: data.code, message: data.message || 'Session expired' },
    }),
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

export async function authFetchJSON(url, options = {}) {
  const res = await authFetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const pieces = [
      body.message,
      body.sqlMessage,
      body.error,
      typeof body.detail === 'string' ? body.detail : null,
    ].filter((x) => x != null && String(x).trim() !== '');
    const primary = pieces.length > 0 ? pieces.join(' — ') : '';
    const err = new Error(primary || `Request failed (${res.status})`);
    err.status = res.status;
    err.body = body;
    err.code = body.code;
    throw err;
  }
  return body;
}

/**
 * POST /api/auth/request-reset
 */
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
    { method: 'GET' },
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
   POST /api/admin/companies      → create company + company admin
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
 * @param {{ company: object, admin: { email: string, password: string, name: string } }} payload
 * @returns {Promise<{ success: boolean, data: { company: object, adminUser: object } }>}
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

/**
 * PUT /api/admin/companies/:id
 * @param {number|string} id
 * @param {object} payload - { name, status, ... }
 */
export async function updateCompanyAdmin(id, payload) {
  const res = await authFetch(`/api/admin/companies/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to update company');
  return data;
}

/**
 * GET /api/admin/companies/:id
 * @param {number|string} id
 * @returns {Promise<{ success: boolean, data: { company: object, admin: object } }>}
 */
export async function getCompanyAdmin(id) {
  return authFetchJSON(`/api/admin/companies/${id}`, { method: 'GET' });
}

/**
 * DELETE /api/admin/companies/:id
 * @param {number|string} id
 */
export async function deleteCompanyAdmin(id) {
  const res = await authFetch(`/api/admin/companies/${id}`, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to delete company');
  return data;
}

/* =======================================================================
   ROLES & PERMISSIONS (RBAC)
   -----------------------------------------------------------------------
   GET  /api/admin/roles                       → { system, custom }
   GET  /api/admin/permissions                 → permissions[]
   GET  /api/admin/roles/:id/permissions      → permissionIds[] (?type=custom for custom role)
   POST /api/admin/roles                      → create custom role
   PUT  /api/admin/roles/custom/:id/permissions→ set permissionIds
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
   GET  /api/users/me         → profile
   PUT  /api/users/me         → update profile (JSON or multipart with photo)
   PUT  /api/users/me/password→ change password
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
export async function changePasswordMe({ currentPassword, newPassword }) {
  const res = await authFetch('/api/users/me/password', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to change password');

  if (data.success && data.accessToken && data.refreshToken) {
    localStorage.setItem('xvrythng_token', data.accessToken);
    localStorage.setItem('xvrythng_user', JSON.stringify(data.user));

  }

  return data;
}
/**
 * ADMIN: POST /api/admin/change-password
 * @param {{ currentPassword: string, newPassword: string }} param0
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export async function changePassword({ currentPassword, newPassword }) {
  const res = await authFetch('/api/admin/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to change password');
  }
  return data; // { success:true, message }
}

/* =======================================================================
   COMPANY (current company)
   ======================================================================= */

// src/services/api.js
export async function getCompanySidebar() {
  const res = await authFetch('/api/me/sidebar', { method: 'GET' });
  const response = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(response.message ?? 'Failed to load sidebar');
  // Response is wrapped: { success: true, data: { role, modules } }
  return response.data ?? { role: null, modules: [] };
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

/** GET /api/company/module-settings — company_admin | manager */
export async function getCompanyModuleSettings() {
  return authFetchJSON('/api/company/module-settings', { method: 'GET' });
}

/** PATCH /api/company/module-settings — partial toggles, immediate save */
export async function patchCompanyModuleSettings(partialToggles) {
  return authFetchJSON('/api/company/module-settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partialToggles ?? {}),
  });
}

/** GET /api/company/workflow — enabled stages only (Kanban). */
export async function getCompanyWorkflow() {
  return authFetchJSON('/api/company/workflow', { method: 'GET' });
}

/** GET /api/company/workflow-settings — full config (admin). */
export async function getCompanyWorkflowSettings() {
  return authFetchJSON('/api/company/workflow-settings', { method: 'GET' });
}

/** PATCH /api/company/workflow-settings — body { pipeline, stages } */
export async function patchCompanyWorkflowSettings(body) {
  return authFetchJSON('/api/company/workflow-settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}
// --- add to: src/services/api.js ---

/**
 * POST /api/admin/users
 * @param {{ token?: string, payload: {
 *   name: string,
 *   email: string,
 *   password: string,
 *   role: 'super_admin'|'company_admin'|'manager'|'field_agent',
 *   companyId?: number,
 *   phone?: string,
 *   status?: 'active'|'suspended'
 * } }} params
 * Note: token is ignored here; authFetch reads from localStorage.
 */
export async function createUser({ token, payload }) {
  const res = await authFetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 422) {
    const err = new Error('Validation failed');
    err.status = 422;
    err.body = data; // { success:false, errors:{...} }
    throw err;
  }
  if (!res.ok) {
    throw new Error(data.message ?? 'Failed to create user');
  }
  return data; // { success:true, data:{...} }
}
/* =======================================================================
   LEADS
   ======================================================================= */

/**
 * POST /api/leads
 * @param {object} payload
 * @returns {Promise<{ success: boolean, data?: object, message?: string }>}
 */
// api/leads.js (or wherever your API helpers live)

const normalizeLead = (row) => {
  if (!row || typeof row !== 'object') return row;
  return {
    id: row.id,
    stage: row.stage,
    customerName: row.customer_name ?? '',
    suburb: row.suburb ?? '',
    systemSize: row.system_size_kw ?? null,
    value: row.value_amount ?? null,
    source: row.source ?? '',
    siteInspectionDate: row.site_inspection_date ?? null,
    // include any extra columns you return from the DB if the UI needs them
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
};


export async function createLead(payload, { normalize = true } = {}) {
  let res;
  try {
    res = await authFetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (networkErr) {
    const err = new Error('Network error while creating lead');
    err.cause = networkErr;
    throw err;
  }

  // Try to parse JSON safely (some proxies return empty body on errors)
  let data = {};
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      // keep data={}
    }
  }

  // Field validation error from controller: { success:false, errors:{...} }
  if (res.status === 422) {
    const err = new Error('Validation error');
    err.status = 422;
    err.body = data; // expect { success:false, errors:{...} }
    throw err;
  }

  // Any other failure: bubble up server message if present
  if (!res.ok) {
    const err = new Error(data?.message || `Failed to create lead (HTTP ${res.status})`);
    err.status = res.status;
    err.body = data;
    throw err;
  }

  // Expect controller to return: { success:true, data:<row> }
  const row = data?.data ?? data; // be tolerant if envelope differs
  if (!row || (typeof row !== 'object')) {
    const err = new Error('Create succeeded but response was not in expected format');
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return normalize ? normalizeLead(row) : row;
}

/**
 * Import multiple leads
 */
export async function importLeads(leads) {
  const res = await authFetch('/api/leads/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leads }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to import leads');
  }
  return data;
}

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
  if (params.site_inspection) q.set('site_inspection', '1');
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

/**
 * GET /api/leads/:id (with relations: activities, documents, communications)
 * @returns {Promise<{ success: boolean, data?: object, lead?: object, activities?: [], documents?: [], communications?: [] }>}
 */
export async function getLead(id) {
  const res = await authFetch(`/api/leads/${encodeURIComponent(id)}`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Lead not found');
  return data; // { success: true, lead, activities, documents, communications }
}

/**
 * Customer portal: GET /api/leads/:id using customer JWT.
 */
export async function getLeadCustomer(id) {
  return customerAuthFetchJSON(`/api/leads/${encodeURIComponent(id)}`, { method: 'GET' });
}

/**
 * GET /api/leads/:id/customer-portal-test-link – create a portal login link for testing (no email sent).
 * Returns { success, loginUrl, email, message }.
 */
export async function getCustomerPortalTestLink(leadId) {
  const res = await authFetch(`/api/leads/${encodeURIComponent(leadId)}/customer-portal-test-link`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to get test link');
  return data;
}

/**
 * POST /api/leads/:id/send-customer-credentials – send OTP email via Resend (or log in dev).
 * Returns { success, message, email, otp? } (otp only in dev).
 */
export async function sendCustomerCredentials(leadId) {
  const res = await authFetch(`/api/leads/${encodeURIComponent(leadId)}/send-customer-credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to send credentials');
  return data;
}

/**
 * PATCH /api/leads/:id/stage
 */
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

/**
 * GET /api/calendar/leads?start=YYYY-MM-DD&end=YYYY-MM-DD&tz=Australia/Melbourne
 * @param {{ start: string, end: string, tz?: string }} params
 * @returns {Promise<{ success: boolean, data: Array }>}
 */
export async function getCalendarLeads(params) {
  const q = new URLSearchParams();
  if (params?.start) q.set('start', params.start);
  if (params?.end) q.set('end', params.end);
  q.set('tz', params?.tz || 'Australia/Melbourne');

  const res = await authFetch(`/api/calendar/leads?${q.toString()}`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || 'Failed to load calendar leads');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data; // { success:true, data:[...] }
}

/**
 * PUT /api/leads/:id
 * @param {string|number} id
 * @param {object} payload
 * @returns {Promise<{ success: boolean, data?: object }>}
 */
export async function updateLead(id, payload) {
  const res = await authFetch(`/api/leads/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 422) {
    const err = new Error('Validation error');
    err.status = 422;
    err.body = data;
    throw err;
  }
  if (!res.ok) throw new Error(data.message || 'Failed to update lead');
  return data;
}

/**
 * POST /api/leads/:id/customer-portal-announce — staff only; type: 'pre_approval' | 'solar_vic'
 */
export async function announceCustomerPortalUtility(leadId, type) {
  const res = await authFetch(`/api/leads/${encodeURIComponent(leadId)}/customer-portal-announce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to update customer portal');
  return data;
}

/* =======================================================================
   CEC Approved products (CER downloads)
   ======================================================================= */

export async function getCecMeta() {
  return authFetchJSON('/api/cec/meta', { method: 'GET' });
}

export async function syncCecNow({ force = false } = {}) {
  const q = force ? '?force=1' : '';
  return authFetchJSON(`/api/cec/sync${q}`, { method: 'POST' });
}

export async function getCecPvPanelBrands() {
  const res = await authFetchJSON('/api/cec/options/pv-panel-brands', { method: 'GET' });
  return res.data ?? [];
}

export async function getCecPvPanelModels(brand) {
  const q = new URLSearchParams();
  if (brand) q.set('brand', brand);
  const res = await authFetchJSON(`/api/cec/options/pv-panel-models${q.toString() ? `?${q.toString()}` : ''}`, { method: 'GET' });
  return res.data ?? [];
}

export async function getCecPvPanelDetails(brand, model) {
  const q = new URLSearchParams();
  if (brand) q.set('brand', brand);
  if (model) q.set('model', model);
  const res = await authFetchJSON(`/api/cec/options/pv-panel-details${q.toString() ? `?${q.toString()}` : ''}`, { method: 'GET' });
  return res.data ?? null;
}

export async function getCecInverterBrands() {
  const res = await authFetchJSON('/api/cec/options/inverter-brands', { method: 'GET' });
  return res.data ?? [];
}

export async function getCecInverterModels(brand) {
  const q = new URLSearchParams();
  if (brand) q.set('brand', brand);
  const res = await authFetchJSON(`/api/cec/options/inverter-models${q.toString() ? `?${q.toString()}` : ''}`, { method: 'GET' });
  return res.data ?? [];
}

export async function getCecInverterSeries(brand, model) {
  const q = new URLSearchParams();
  if (brand) q.set('brand', brand);
  if (model) q.set('model', model);
  const res = await authFetchJSON(`/api/cec/options/inverter-series${q.toString() ? `?${q.toString()}` : ''}`, { method: 'GET' });
  return res.data ?? [];
}

export async function getCecInverterDetails(brand, model) {
  const q = new URLSearchParams();
  if (brand) q.set('brand', brand);
  if (model) q.set('model', model);
  const res = await authFetchJSON(`/api/cec/options/inverter-details${q.toString() ? `?${q.toString()}` : ''}`, { method: 'GET' });
  return res.data ?? null;
}

export async function getCecBatteryBrands() {
  const res = await authFetchJSON('/api/cec/options/battery-brands', { method: 'GET' });
  return res.data ?? [];
}

export async function getCecBatteryModels(brand) {
  const q = new URLSearchParams();
  if (brand) q.set('brand', brand);
  const res = await authFetchJSON(`/api/cec/options/battery-models${q.toString() ? `?${q.toString()}` : ''}`, { method: 'GET' });
  return res.data ?? [];
}

/**
 * POST /api/integrations/solarquotes/fetch
 * @param {{ startDate?: string, endDate?: string }} payload
 * @returns {Promise<{ success: boolean, count: number, results: Array }>}
 */
export async function importSolarQuotesLeads(payload = {}) {
  const res = await authFetch('/api/integrations/solarquotes/fetch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to import SolarQuotes leads');
  }
  return data;
}

export async function getLeadNotes(leadId) {
  const res = await authFetch(`/api/leads/${encodeURIComponent(leadId)}/notes`, {
    method: 'GET',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message ?? 'Failed to load notes');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data; // { success:true, data: activities[] }
}

/**
 * POST /api/leads/:id/notes
 * Body: { body: string, followUpAt?: ISO string }
 * Returns { success:true, data: activityItem } (same shape LeadDetailActivity uses).
 */
export async function addLeadNote(leadId, { body, followUpAt }) {
  const res = await authFetch(`/api/leads/${encodeURIComponent(leadId)}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body, followUpAt }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message ?? 'Failed to add note');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data.data; // activity item
}

/* =======================================================================
   CHAT / MESSAGES (internal employee messaging)
   -----------------------------------------------------------------------
   GET  /api/chats/company-users   → list users in same company
   GET  /api/chats                  → list conversations
   POST /api/chats                  → create DM (otherUserId) or group (name, userIds)
   GET  /api/chats/:id              → get conversation
   GET  /api/chats/:id/messages     → paginated messages (?before=&limit=)
   POST /api/chats/:id/messages     → send message (body)
   PATCH /api/chats/:id/read        → mark as read
   ======================================================================= */

/** Build query string for chat API (e.g. ?companyId=1 for Super Admin). */
function chatQuery(companyId) {
  if (companyId == null) return '';
  const q = new URLSearchParams();
  q.set('companyId', String(companyId));
  return q.toString();
}

export async function getChatCompanyUsers(companyId) {
  const q = chatQuery(companyId);
  const url = `/api/chats/company-users${q ? `?${q}` : ''}`;
  const data = await authFetchJSON(url, { method: 'GET' });
  return data.data ?? [];
}

/** GET /api/chats/platform-users – all employees (all companies). Super Admin only. */
export async function getChatPlatformUsers() {
  const data = await authFetchJSON('/api/chats/platform-users', { method: 'GET' });
  return data.data ?? [];
}

export async function getChatConversations(companyId, searchQuery = '') {
  const q = new URLSearchParams();
  if (companyId != null) q.set('companyId', String(companyId));
  if (searchQuery) q.set('q', searchQuery);
  
  const url = `/api/chats${q.toString() ? `?${q.toString()}` : ''}`;
  const data = await authFetchJSON(url, { method: 'GET' });
  return data.data ?? [];
}

export async function createChatConversation(payload, companyId, options = {}) {
  const q = chatQuery(companyId);
  const url = `/api/chats${q ? `?${q}` : ''}`;
  const body = { ...payload };
  if (options.platform) body.platform = true;
  const res = await authFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? 'Failed to create conversation');
  return data.data;
}

export async function getChatConversation(id, companyId) {
  const q = chatQuery(companyId);
  const url = `/api/chats/${encodeURIComponent(id)}${q ? `?${q}` : ''}`;
  const data = await authFetchJSON(url, { method: 'GET' });
  return data.data;
}

export async function getChatMessages(conversationId, params = {}, companyId) {
  const q = new URLSearchParams();
  if (params.before) q.set('before', params.before);
  if (params.limit) q.set('limit', String(params.limit));
  if (params.jump) q.set('jump', String(params.jump));
  if (companyId != null) q.set('companyId', String(companyId));
  const url = `/api/chats/${encodeURIComponent(conversationId)}/messages${q.toString() ? `?${q.toString()}` : ''}`;
  const data = await authFetchJSON(url, { method: 'GET' });
  return { messages: data.data ?? [], hasMore: data.hasMore ?? false };
}

export async function sendChatMessage(conversationId, body, attachments = [], companyId) {
  const q = chatQuery(companyId);
  const url = `/api/chats/${encodeURIComponent(conversationId)}/messages${q ? `?${q}` : ''}`;
  const data = await authFetchJSON(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body, attachments }),
  });
  return data.data;
}

export async function uploadChatAttachment(conversationId, file, companyId) {
  const q = chatQuery(companyId);
  const url = `/api/chats/${encodeURIComponent(conversationId)}/upload${q ? `?${q}` : ''}`;
  const formData = new FormData();
  formData.append('attachment', file);

  const res = await authFetch(url, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? 'Failed to upload attachment');
  return data.data;
}

export async function getChatAttachments(conversationId, companyId) {
  const q = chatQuery(companyId);
  const url = `/api/chats/${encodeURIComponent(conversationId)}/attachments${q ? `?${q}` : ''}`;
  const data = await authFetchJSON(url, { method: 'GET' });
  return data.data ?? [];
}

export async function markChatRead(conversationId, companyId) {
  const q = chatQuery(companyId);
  const url = `/api/chats/${encodeURIComponent(conversationId)}/read${q ? `?${q}` : ''}`;
  const res = await authFetch(url, { method: 'PATCH' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Failed to mark chat read (${res.status})`);
  }
}

/** POST /api/chats/:id/participants - add members to group. Body: { userIds: number[] } */
export async function addGroupParticipants(conversationId, userIds, companyId) {
  const q = chatQuery(companyId);
  const url = `/api/chats/${encodeURIComponent(conversationId)}/participants${q ? `?${q}` : ''}`;
  const data = await authFetchJSON(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userIds }),
  });
  return data.data;
}

/** DELETE /api/chats/:id/participants/:userId - remove member from group */
export async function removeGroupParticipant(conversationId, userId, companyId) {
  const q = chatQuery(companyId);
  const url = `/api/chats/${encodeURIComponent(conversationId)}/participants/${encodeURIComponent(userId)}${q ? `?${q}` : ''}`;
  await authFetch(url, { method: 'DELETE' });
}

/* ---------- Referrals ---------- */

/**
 * GET /api/referrals - List referrals with filters
 * @param {Object} filters - { status, dateFrom, dateTo, referrerId, limit, offset }
 */
export async function getReferrals(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  if (filters.referrerId) params.append('referrerId', filters.referrerId);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);

  const url = `/api/referrals${params.toString() ? `?${params.toString()}` : ''}`;
  const data = await authFetchJSON(url, { method: 'GET' });
  return data;
}

/**
 * GET /api/referrals/counts - Get referral counts by status
 */
export async function getReferralCounts() {
  const data = await authFetchJSON('/api/referrals/counts', { method: 'GET' });
  return data.counts;
}

/**
 * GET /api/referrals/referrers - Get all referrers
 */
export async function getReferrers() {
  const data = await authFetchJSON('/api/referrals/referrers', { method: 'GET' });
  return data.referrers;
}

/**
 * POST /api/referrals/:id/mark-bonus-paid - Mark bonus as paid
 */
export async function markReferralBonusPaid(referralId, paidAt = null) {
  const data = await authFetchJSON(`/api/referrals/${encodeURIComponent(referralId)}/mark-bonus-paid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paidAt }),
  });
  return data;
}

/**
 * GET /api/referrals/settings - Get referral bonus settings
 */
export async function getReferralSettings() {
  try {
    const data = await authFetchJSON('/api/referrals/settings', { method: 'GET' });
    return data.settings || null;
  } catch (err) {
    // If endpoint doesn't exist, return null (will use defaults)
    return null;
  }
}

/**
 * PUT /api/referrals/settings - Save referral bonus settings
 */
export async function saveReferralSettings(settings) {
  const data = await authFetchJSON('/api/referrals/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings }),
  });
  return data;
}


// GET /api/leads/:id/site-inspection
export async function getSiteInspection(leadId) {
  return authFetchJSON(`/api/leads/${encodeURIComponent(leadId)}/site-inspection`, { method: 'GET' });
}

// PUT /api/leads/:id/site-inspection  → save draft
export async function saveSiteInspectionDraft(leadId, payload) {
  return authFetchJSON(`/api/leads/${encodeURIComponent(leadId)}/site-inspection`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// POST /api/leads/:id/site-inspection/submit  → submit (requires required fields)
export async function submitSiteInspection(leadId, payload) {
  return authFetchJSON(`/api/leads/${encodeURIComponent(leadId)}/site-inspection/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
export async function uploadSiteInspectionFile(leadId, file, section) {
  const fd = new FormData();
  fd.append('file', file);
  if (section) fd.append('section', section);
  const res = await authFetch(`/api/leads/${encodeURIComponent(leadId)}/site-inspection/files/upload`, {
    method: 'POST',
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    const err = new Error(data.message || 'Failed to upload image');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data.data; // { filename, storage_url }
}

// src/services/api.js

// Create User (protected, always performs a real fetch with JWT)
export async function apiCreateUser(payload) {
  console.log('[apiCreateUser] calling /api/users'); // DEBUG
  return authFetchJSON('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getCompanyInspectionTemplates(query = {}) {
  const q = new URLSearchParams(query).toString();
  const res = await authFetch(`/api/company/settings/inspection-templates${q ? `?${q}` : ''}`, { method: 'GET' });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.success) {
    const msg = j.message ?? `Failed to load templates (HTTP ${res.status})`;
    const err = new Error(msg); err.status = res.status; err.body = j; throw err;
  }
  return j;
}
export async function saveInspectionTemplate(payload) {
  const res = await authFetch('/api/company/settings/inspection-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.success) {
    const msg = j.message ?? `Failed to save template (HTTP ${res.status})`;
    const err = new Error(msg); err.status = res.status; err.body = j; throw err;
  }
  return j;
}
export async function publishInspectionTemplate(id) {
  const res = await authFetch(`/api/company/settings/inspection-templates/${id}/publish`, { method: 'POST' });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.success) {
    const msg = j.message ?? `Failed to publish template (HTTP ${res.status})`;
    const err = new Error(msg); err.status = res.status; err.body = j; throw err;
  }
  return j;
}
export async function deleteInspectionTemplate(id) {
  const res = await authFetch(`/api/company/settings/inspection-templates/${id}`, { method: 'DELETE' });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.success) {
    const msg = j.message ?? `Failed to delete template (HTTP ${res.status})`;
    const err = new Error(msg); err.status = res.status; err.body = j; throw err;
  }
  return j;
}

export async function createLeadProposal(leadId) {
  const res = await authFetch(`/api/leads/${encodeURIComponent(leadId)}/proposal`, { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    const msg = data.message ?? `Failed to mark proposal (HTTP ${res.status})`;
    const err = new Error(msg);
    err.status = res.status; err.body = data; throw err;
  }
  return data;
}
export async function listEmployees(params = {}) {
  const q = new URLSearchParams();
  if (params.department_id) q.set('department_id', String(params.department_id));
  if (params.job_role_id) q.set('job_role_id', String(params.job_role_id));
  if (params.status) q.set('status', params.status);
  if (params.q) q.set('q', params.q);
  if (typeof params.limit === 'number') q.set('limit', String(params.limit));
  if (typeof params.offset === 'number') q.set('offset', String(params.offset));
  if (params.companyId) q.set('companyId', String(params.companyId));

  const url = `/api/employees${q.toString() ? `?${q.toString()}` : ''}`;
  const res = await authFetch(url, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? 'Failed to load employees');
  return data; // { success: true, data: [...] }
}

export async function createEmployee(payload) {
  const res = await authFetch('/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 422) {
    const err = new Error('Validation error');
    err.status = 422; err.body = data;
    throw err;
  }
  if (!res.ok) throw new Error(data.message ?? 'Failed to create employee');
  return data.data; // employee row
}

// GET /api/employees/:id (?companyId= for super_admin)
export async function getEmployee(id, params = {}) {
  const q = new URLSearchParams();
  if (params.companyId) q.set('companyId', String(params.companyId));
  const res = await authFetch(`/api/employees/${encodeURIComponent(id)}${q.toString() ? `?${q}` : ''}`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? 'Failed to load employee');
  return data; // { success:true, data:{...} }
}

export async function getCompanyEmployees(params = {}) {
  const q = new URLSearchParams();
  if (params.companyId) q.set('companyId', String(params.companyId));

  const res = await authFetch(`/api/employees${q.toString() ? `?${q}` : ''}`, {
    method: 'GET'
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? 'Failed to load employees');
  return data; // { success:true, data:[...] }
}

// PUT /api/employees/:id (?companyId= for super_admin)
export async function updateEmployee(id, payload, params = {}) {
  const q = new URLSearchParams();
  if (params.companyId) q.set('companyId', String(params.companyId));
  const res = await authFetch(`/api/employees/${encodeURIComponent(id)}${q.toString() ? `?${q}` : ''}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 422) { const err = new Error('Validation error'); err.status = 422; err.body = data; throw err; }
  if (!res.ok) throw new Error(data.message ?? 'Failed to update employee');
  return data.data;
}

export async function deactivateEmployee(id) {
  const res = await authFetch(`/api/employees/${encodeURIComponent(id)}/deactivate`, { method: 'PATCH' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? 'Failed to deactivate employee');
  return data.data; // { id, status: 'inactive' }
}

export async function previewRoleModules(job_role_id) {
  const res = await authFetch(`/api/employees/preview/role-modules/${encodeURIComponent(job_role_id)}`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? 'Failed to get role modules preview');
  return data.data; // [{ module_key, display_name }]
}

export async function getJobRoleOptions(params = {}) {

  const headers = {};
  if (params.companyId) headers['X-Tenant-Id'] = String(params.companyId);
  const res = await authFetch('/api/employees/options/job-roles', { headers });

  const data = await res.json();
  return data.data ?? [];
}
export async function getEmploymentTypeOptions() {
  const res = await authFetch('/api/employees/options/employment-types', { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? 'Failed to load employment types');
  return data.data; // [{ id, name }]
}


export async function getDepartmentOptions(params = {}) {
  const headers = {};
  if (params.companyId) headers['X-Tenant-Id'] = String(params.companyId);
  const res = await authFetch('/api/employees/options/departments', { headers });
  const data = await res.json();
  return data.data ?? []; // [{ id, code, name }]
}


export async function createEmployeeLogin(id, { password, companyId } = {}) {
  const q = new URLSearchParams();
  if (companyId) q.set('companyId', companyId);

  const url = `/api/employees/${id}/create-login?${q.toString()}`;
  const res = await authFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? 'Failed to create login');
  return data.data ?? data; // { user_id }
}

export async function getJobRolesForTenant(companyId) {
  const headers = {};
  if (companyId) headers['X-Tenant-Id'] = String(companyId);
  return authFetchJSON('/api/admin/job-roles', { method: 'GET', headers });
}
export async function getCompanyModulesForTenant(companyId) {
  const headers = {};
  if (companyId) headers['X-Tenant-Id'] = String(companyId);
  return authFetchJSON('/api/admin/modules', { method: 'GET', headers });
}

export async function getJobRoles(params = {}) {
  const q = new URLSearchParams(params).toString();
  return authFetchJSON(`/api/admin/job-roles${q ? `?${q}` : ''}`, { method: 'GET' });
}

export async function getCompanyModules(params = {}) {
  const q = new URLSearchParams(params).toString();
  return authFetchJSON(`/api/admin/modules${q ? `?${q}` : ''}`, { method: 'GET' });
}

export async function setJobRoleModules(jobRoleId, { moduleKeys }) {
  const res = await authFetch(`/api/admin/job-roles/${encodeURIComponent(jobRoleId)}/modules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ moduleKeys }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? 'Failed to update job role modules');
  return data;
}

// List documents of an employee
export async function listEmployeeDocuments(employeeId, params = {}) {
  const q = new URLSearchParams();
  if (params.companyId) q.set('companyId', String(params.companyId));
  const res = await authFetch(`/api/employees/${encodeURIComponent(employeeId)}/documents${q.toString() ? `?${q}` : ''}`, {
    method: 'GET'
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? 'Failed to load documents');
  return data.data ?? [];
}

// Upload a document
export async function uploadEmployeeDocument(employeeId, file, { label, notes, companyId } = {}) {
  const q = new URLSearchParams();
  if (companyId) q.set('companyId', String(companyId));

  const fd = new FormData();
  fd.append('file', file);
  if (label) fd.append('label', label);
  if (notes) fd.append('notes', notes);

  const res = await authFetch(`/api/employees/${encodeURIComponent(employeeId)}/documents${q.toString() ? `?${q}` : ''}`, {
    method: 'POST',
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? 'Failed to upload document');
  return data.data;
}

// Download (returns a blob)
export async function downloadEmployeeDocument(employeeId, docId, params = {}) {
  const q = new URLSearchParams();
  if (params.companyId) q.set('companyId', String(params.companyId));
  const res = await authFetch(`/api/employees/${encodeURIComponent(employeeId)}/documents/${encodeURIComponent(docId)}/download${q.toString() ? `?${q}` : ''}`, {
    method: 'GET'
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? 'Failed to download');
  }
  const blob = await res.blob();
  return blob;
}

// Delete
export async function deleteEmployeeDocument(employeeId, docId, params = {}) {
  const q = new URLSearchParams();
  if (params.companyId) q.set('companyId', String(params.companyId));
  const res = await authFetch(`/api/employees/${encodeURIComponent(employeeId)}/documents/${encodeURIComponent(docId)}${q.toString() ? `?${q}` : ''}`, {
    method: 'DELETE'
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? 'Failed to delete document');
  return true;
}

export async function changePasswordEmp({ currentPassword, newPassword }) {
  const resp = await fetch('/api/auth/change-password-emp', {
    method: 'POST',
    
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.message || 'Failed to change password');
  return data;
}

export async function getLeadsCount(params = {}) {
  const q = new URLSearchParams();
  if (params.stage) q.set('stage', params.stage);
  if (params.search) q.set('search', params.search);
  if (params.assigned_user) q.set('assigned_user', params.assigned_user);

  const res = await authFetch(`/api/leads/count${q.toString() ? `?${q}` : ''}`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? 'Failed to load lead count');
  return data.total ?? 0;
}

/**
 * GET /api/leads/dashboard
 * @param {{ range?: 'week'|'month'|'quarter'|'custom', from?: string, to?: string }} params
 */
export async function getSalesDashboard(params = {}) {
  const q = new URLSearchParams();
  if (params.range) q.set('range', params.range);
  if (params.from)  q.set('from',  params.from);
  if (params.to)    q.set('to',    params.to);
  const res  = await authFetch(`/api/leads/dashboard${q.toString() ? `?${q}` : ''}`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? 'Failed to load dashboard metrics');
  return data.data ?? data;
}

// ---------------------------------------------------------------------------
// Sales activity feed (recent team actions)
// ---------------------------------------------------------------------------
/** GET /api/sales/activity?limit=50&offset=0 */
export async function getSalesActivity(params = {}) {
  const q = new URLSearchParams();
  if (params.limit != null)  q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  const res  = await authFetch(`/api/sales/activity${q.toString() ? `?${q}` : ''}`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? 'Failed to load sales activity');
  return data.data ?? [];
}



 export async function getTrialUsers() {
   const res = await authFetch('/api/trial-users', { method: 'GET' });
   const data = await res.json().catch(() => ({}));
   if (!res.ok) {
     const err = new Error(data.message ?? 'Failed to fetch trial users');
     err.status = res.status;
     err.body = data;
     throw err;
   }
   return data; // { success, data }
 }



 export async function createTrialUser(payload) {
   const res = await authFetch('/api/trial-users', {
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
     const err = new Error(data?.message ?? 'Failed to create trial user');
     err.status = res.status;
     err.body = data;
     throw err;
   }
   return data; // { success, data }
 }



export async function sendTrialLinks() {
  const res = await authFetch('/api/trial-users/send-trial-links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
   
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message ?? 'Failed to send trial links');
    err.status = res.status; err.body = data;
    throw err;
  }
  return data;
}


export async function updateTrialUser(id, payload) {
  const res = await authFetch(`/api/trial-users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
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
    const err = new Error(data?.message ?? 'Failed to update trial user');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data; // { success:true, data:{...updatedRow} }
}

export async function deleteTrialUser(id) {
  const res = await authFetch(`/api/trial-users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message ?? 'Failed to delete trial user');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data; // { success:true, message:'Trial user deleted.' }
}



export async function getProjects(params = {}) {
  const q = new URLSearchParams();
  if (params.stage) q.set('stage', params.stage);
  if (params.search) q.set('search', params.search);
  if (typeof params.limit === 'number') q.set('limit', String(params.limit));
  if (typeof params.offset === 'number') q.set('offset', String(params.offset));
  const url = `/api/projects${q.toString() ? `?${q.toString()}` : ''}`;

  const res = await authFetch(url, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to load projects');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data; // { success:true, data:[...] }
}

/**
 * Fetch a single project by ID
 */
export async function getProject(projectId) {
  const res = await authFetch(`/api/projects/${encodeURIComponent(projectId)}`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || 'Failed to load project');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data; // { success:true, data:{...} }
}

/**
 * GET /api/projects/:id/documents — files uploaded on the project Documents tab.
 */
export async function getProjectDocuments(projectId) {
  const res = await authFetch(`/api/projects/${encodeURIComponent(projectId)}/documents`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to load project documents');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data; // { success:true, data: [...] }
}

/**
 * GET /api/projects/by-lead/:leadId
 * Fetch a single project by its associated lead_id.
 */
export async function getProjectByLeadId(leadId) {
  const res = await authFetch(`/api/projects/by-lead/${encodeURIComponent(leadId)}`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || 'Failed to load project for lead');
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data; // { success:true, data:{...} }
}

/**
 * Customer portal: GET /api/projects/by-lead/:leadId using customer JWT.
 */
export async function getProjectByLeadIdCustomer(leadId) {
  return customerAuthFetchJSON(`/api/projects/by-lead/${encodeURIComponent(leadId)}`, { method: 'GET' });
}

export async function updateProjectStage(projectId, stage) {
  const res = await authFetch(`/api/projects/${encodeURIComponent(projectId)}/stage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to update project stage');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data; // { success:true, data:{...project} }
}

export async function updateProjectApi(projectId, payload) {
  const res = await authFetch(`/api/projects/${encodeURIComponent(projectId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to update project');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data; // { success:true, data:{...project} }
}



export async function getProjectInspection(projectId) {
  const res = await authFetch(`/api/projects/${encodeURIComponent(projectId)}/inspection`, {
    method: 'GET',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to load site inspection');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data; // { success:true, data: {...} | null }
}



export async function saveProjectScheduleAssign(projectId, payload) {
  const res = await authFetch(`/api/projects/${encodeURIComponent(projectId)}/schedule-assign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), // { status, date, time, assignees, notes? }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to save schedule & assignees');
    err.status = res.status; err.body = data;
    throw err;
  }
  return data; // { success:true, data:{ schedule?, assignees? } }
}




export async function getProjectScheduleAssign(projectId) {
  const res = await authFetch(`/api/projects/${encodeURIComponent(projectId)}/schedule-assign`, {
    method: 'GET',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to load project schedule');
    err.status = res.status; err.body = data;
    throw err;
  }
  return data;
}

// ==============================
// Retailer Projects (new table)
// ==============================

/**
 * Fetch retailer projects list with optional filters.
 * - Accepts: { search?: string, stage?: string, limit?: number, offset?: number }
 * - Returns: { success: true, data: [...] }
 *
 * The querystring format matches your existing getProjects() style.
 */
export async function getRetailerProjects(params = {}) {
  // Build querystring from params (keeps parity with getProjects)
  const q = new URLSearchParams();
  if (params.stage) q.set('stage', params.stage);
  if (params.search) q.set('search', params.search);
  if (typeof params.limit === 'number') q.set('limit', String(params.limit));
  if (typeof params.offset === 'number') q.set('offset', String(params.offset));

  // Compose URL based on whether querystring is empty or not
  const url = `/api/retailer-projects${q.toString() ? `?${q.toString()}` : ''}`;

  // Use the same authFetch wrapper already used across your app
  const res = await authFetch(url, { method: 'GET' });
  const data = await res.json().catch(() => ({}));

  // Normalize error handling to your existing convention
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to load retailer projects');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data; // { success:true, data:[...] }
}

/**
 * Fetch a single retailer project by ID
 */
export async function getRetailerProject(projectId) {
  const res = await authFetch(`/api/retailer-projects/${encodeURIComponent(projectId)}`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || 'Failed to load retailer project');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data; // { success:true, project:{...} }
}

export async function updateRetailerProjectApi(projectId, fields = {}) {
  const res = await authFetch(`/api/retailer-projects/${encodeURIComponent(projectId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to update retailer project');
  }
  return data;
}

/**
 * Create a new retailer project.
 * - Payload: {
 *     customer_name: string (required),
 *     stage?: string ('new' by default),
 *     address?: string | null,
 *     suburb?: string | null,
 *     system_size_kw?: number | null,
 *     value_amount?: number | null,
 *     notes?: string | null
 *   }
 * - Backend will auto-generate `code` (e.g., PRJ-01) from the new row's auto-increment id.
 * - Returns: { success:true, data:{ ...createdRowWithCode } }
 */
export async function createRetailerProject(payload) {
  const res = await authFetch('/api/retailer-projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // IMPORTANT: Keep the payload keys as backend expects (snake_case)
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || 'Failed to create retailer project');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data; // { success:true, data:{...} }
}

/**
 * Update retailer project's stage by id.
 * - Args: (projectId: number|string, stage: string)
 * - Returns: { success:true, data:{ ...updatedRow } }
 *
 * NOTE: Stages should match the 14-stage pipeline keys:
 *   'new', 'site_inspection', 'stage_one', 'stage_two', 'full_system',
 *   'cancelled', 'scheduled', 'to_be_rescheduled', 'installation_in_progress',
 *   'installation_completed', 'ces_certificate_applied', 'ces_certificate_received',
 *   'ces_certificate_submitted', 'done'
 */
export async function updateRetailerProjectStage(projectId, stage) {
  const res = await authFetch(`/api/retailer-projects/${encodeURIComponent(projectId)}/stage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage }),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || 'Failed to update retailer project stage');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data; // { success:true, data:{...} }
}

export async function getRetailerProjectSchedule(projectId) {
  const res = await authFetch(`/api/retailer-projects/${encodeURIComponent(projectId)}/schedule`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to load retailer project schedule');
    err.status = res.status; err.body = data; throw err;
  }
  return data;
}

/**
 * Save/Upsert retailer project schedule.
 * Payload: { job_type, date, time?, notes?, assignees? }
 * Returns: { success:true, data:{ schedule } }
 */
export async function saveRetailerProjectSchedule(projectId, payload) {
  const res = await authFetch(`/api/retailer-projects/${encodeURIComponent(projectId)}/schedule`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to save retailer project schedule');
    err.status = res.status; err.body = data; throw err;
  }
  return data;
}

export async function getRetailerProjectAssignees(projectId) {
  const res = await authFetch(`/api/retailer-projects/${encodeURIComponent(projectId)}/assignees`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to load assignees'); err.status = res.status; err.body = data; throw err;
  }
  return data; // { success, data: { assignees: number[] } }
}

export async function saveRetailerProjectAssignees(projectId, assignees) {
  const res = await authFetch(`/api/retailer-projects/${encodeURIComponent(projectId)}/assignees`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignees }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to save assignees'); err.status = res.status; err.body = data; throw err;
  }
  return data; // { success, data: { assignees: number[] } }
}


export async function getPmDashboard(params = {}) {
  const usp = new URLSearchParams(params).toString();
  const res = await authFetch(`/api/pm-dashboard?${usp}`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const err = new Error(data.message || 'Failed to load PM dashboard'); err.status = res.status; throw err; }
  return data; // { success, data: {...} }
}

export async function getPmDashboardDrilldown(params = {}) {
  const usp = new URLSearchParams(params).toString();
  const res = await authFetch(`/api/pm-dashboard/drilldown?${usp}`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const err = new Error(data.message || 'Failed to load drilldown'); err.status = res.status; throw err; }
  return data; // { success, data: [...] }
}

// ---------------------------------------------------------------------------
// Installation Day
// ---------------------------------------------------------------------------
export async function listInstallationJobs(params = {}) {
  const q = new URLSearchParams(params).toString();
  return authFetchJSON(`/api/installation-jobs${q ? `?${q}` : ''}`, { method: 'GET' });
}

export async function getInstallationJob(id) {
  return authFetchJSON(`/api/installation-jobs/${id}`, { method: 'GET' });
}

export async function createInstallationJob(payload) {
  return authFetchJSON('/api/installation-jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateInstallationJobStatus(id, status) {
  return authFetchJSON(`/api/installation-jobs/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function tickInstallationChecklist(jobId, itemId, { checked, note }) {
  return authFetchJSON(`/api/installation-jobs/${jobId}/checklist/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ checked, note }),
  });
}

export async function submitInstallationSignoff(jobId, { customer_name, signature_url, notes }) {
  return authFetchJSON(`/api/installation-jobs/${jobId}/signoff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer_name, signature_url, notes }),
  });
}

// Checklist item template management (T-236 company customisation)
export async function listInstallationChecklistItems() {
  return authFetchJSON('/api/installation-jobs/checklist-items', { method: 'GET' });
}

export async function createInstallationChecklistItem(payload) {
  return authFetchJSON('/api/installation-jobs/checklist-items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateInstallationChecklistItem(itemId, payload) {
  return authFetchJSON(`/api/installation-jobs/checklist-items/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteInstallationChecklistItem(itemId) {
  return authFetchJSON(`/api/installation-jobs/checklist-items/${itemId}`, {
    method: 'DELETE',
  });
}

// Installation photos (T-245/246/247/248)
export async function uploadInstallationPhoto(jobId, formData) {
  // formData is a FormData object containing: photo (file), section, caption, lat, lng, taken_at
  const res = await authFetch(`/api/installation-jobs/${jobId}/photos`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

export async function deleteInstallationPhoto(jobId, photoId) {
  return authFetchJSON(`/api/installation-jobs/${jobId}/photos/${photoId}`, {
    method: 'DELETE',
  });
}

export async function getInstallationPhotoRequirements() {
  return authFetchJSON('/api/installation-jobs/photo-requirements', { method: 'GET' });
}

// ---------------------------------------------------------------------------
// On-Field (employee calendar: inspections + installations)
// ---------------------------------------------------------------------------
/** GET /api/on-field/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD – events for current employee */
export async function getOnFieldCalendar(params = {}) {
  const q = new URLSearchParams(params).toString();
  return authFetchJSON(`/api/on-field/calendar${q ? `?${q}` : ''}`, { method: 'GET' });
}

// ---------------------------------------------------------------------------
// Approvals (unified: leave + expense + attendance)
// ---------------------------------------------------------------------------
/** GET /api/approvals?type=leave|expense|attendance&status=pending|approved|rejected */
export async function listApprovals(params = {}) {
  const q = new URLSearchParams(params).toString();
  return authFetchJSON(`/api/approvals${q ? `?${q}` : ''}`, { method: 'GET' });
}

/** GET /api/approvals/count – returns { pending, by_type: { leave, expense, attendance } } */
export async function getApprovalsPendingCount() {
  return authFetchJSON('/api/approvals/count', { method: 'GET' });
}

/** PATCH /api/approvals/:type/:id/decision – body: { action, comment } */
export async function decideApproval(type, id, body) {
  return authFetchJSON(`/api/approvals/${encodeURIComponent(type)}/${encodeURIComponent(id)}/decision`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** PATCH /api/employees/attendance/edit-requests/:id */
export async function reviewAttendanceEditRequest(id, body) {
  return authFetchJSON(`/api/employees/attendance/edit-requests/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** PATCH /api/employees/leave/:id/review */
export async function reviewLeaveRequest(id, body) {
  return authFetchJSON(`/api/employees/leave/${id}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** PATCH /api/employees/expenses/:id/review */
export async function reviewExpenseClaim(id, body) {
  return authFetchJSON(`/api/employees/expenses/${id}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

