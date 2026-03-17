// src/middleware/tenantContext.js
import db from '../config/db.js';

export async function tenantContext(req, res, next) {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    let userCompanyId = req.user?.companyId ?? null; 

    const headerTenant = req.headers['x-tenant-id'] ?? req.headers['x-company-id'];
    const queryTenant  = req.query.companyId;
    const bodyTenant   = req.body?.companyId;
    const rawRequested = headerTenant ?? queryTenant ?? bodyTenant;
    const parsedRequested =
      rawRequested !== undefined && rawRequested !== null && rawRequested !== ''
        ? parseInt(rawRequested, 10)
        : NaN;

    let tenantId = Number.isNaN(parsedRequested) ? null : parsedRequested;

    if (tenantId == null) {
      if (userCompanyId == null && req.user?.id) {
        const [[row]] = await db.execute(
          'SELECT company_id FROM users WHERE id = ? LIMIT 1',
          [req.user.id],
        );
        userCompanyId = row?.company_id ?? null;
        req.user.companyId = userCompanyId;
        req.user.company_id = userCompanyId; 
      }
      tenantId = userCompanyId != null ? Number(userCompanyId) : null;
    }

    req.tenantId = tenantId;                            
    req.tenant   = tenantId != null ? { company_id: tenantId } : null; 
    req.isSuperAdmin = role === 'super_admin';

    // (DEBUG) Xoá khi xong
    console.log('[TENANT]', {
      user: { id: req.user?.id, role: req.user?.role, companyId: req.user?.companyId },
      requested: rawRequested ?? null,
      tenantId: req.tenantId,
    });

    next();
  } catch (err) {
    next(err);
  }
}