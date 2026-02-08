/**
 * Tenant context middleware: sets req.tenantId for query filtering.
 * - Non-super_admin: req.tenantId = req.user.companyId (enforces isolation).
 * - Super_admin: req.tenantId = null unless X-Tenant-Id or query.companyId is set (for platform ops).
 * All tenant-scoped queries must use req.tenantId (or req.user.companyId) to isolate data.
 */
export function tenantContext(req, res, next) {
  const role = String(req.user?.role || '').toLowerCase();
  const companyId = req.user?.companyId ?? null;

  if (role === 'super_admin') {
    const headerTenant = req.headers['x-tenant-id'];
    const queryTenant = req.query.companyId;
    const bodyTenant = req.body?.companyId;
    const tenantId = headerTenant || queryTenant || bodyTenant;
    req.tenantId = tenantId != null ? parseInt(tenantId, 10) : null;
    req.isSuperAdmin = true;
  } else {
    req.tenantId = companyId != null ? companyId : null;
    req.isSuperAdmin = false;
  }

  next();
}

/**
 * Require that the request has a tenant context (tenantId set).
 * Use for routes that must operate within a single tenant.
 */
export function requireTenant(req, res, next) {
  if (req.tenantId == null) {
    return res.status(400).json({ success: false, message: 'Tenant context required' });
  }
  next();
}
