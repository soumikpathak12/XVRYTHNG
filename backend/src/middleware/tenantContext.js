import db from '../config/db.js';

/**
 * Tenant context middleware: sets req.tenantId for query filtering.
 * - Non-super_admin: req.tenantId = req.user.companyId (from JWT or DB lookup if missing).
 * - Super_admin: req.tenantId = null unless X-Tenant-Id or query.companyId is set (for platform ops).
 * All tenant-scoped queries must use req.tenantId (or req.user.companyId) to isolate data.
 */
export async function tenantContext(req, res, next) {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    let companyId = req.user?.companyId ?? null;

    if (role === 'super_admin') {
      const headerTenant = req.headers['x-tenant-id'];
      const queryTenant = req.query.companyId;
      const bodyTenant = req.body?.companyId;
      const raw = headerTenant ?? queryTenant ?? bodyTenant;
      const parsed = raw !== undefined && raw !== null && raw !== '' ? parseInt(raw, 10) : NaN;
      req.tenantId = Number.isNaN(parsed) ? null : parsed;
      req.isSuperAdmin = true;
    } else {
      if (companyId == null && req.user?.id) {
        const [[row]] = await db.execute(
          'SELECT company_id FROM users WHERE id = ? LIMIT 1',
          [req.user.id],
        );
        companyId = row?.company_id ?? null;
        if (req.user) req.user.companyId = companyId;
      }
      req.tenantId = companyId != null ? companyId : null;
      req.isSuperAdmin = false;
    }

    next();
  } catch (err) {
    next(err);
  }
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
