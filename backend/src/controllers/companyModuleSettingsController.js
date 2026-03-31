import {
  TOGGLE_META,
  CORE_MODULE_DESCRIPTION,
  getCompanyModuleFlags,
  mergeAndSaveCompanyModuleFlags,
  MODULE_TOGGLE_IDS,
} from '../services/companyModuleService.js';

import db from '../config/db.js';

async function resolveCompanyIdForSettings(req) {
  const r = String(req.user?.role || '').toLowerCase();
  // Prefer tenantId if tenantContext middleware is in use, else companyId from JWT.
  let companyId = req.tenantId ?? req.user?.companyId ?? null;
  if (companyId != null) return companyId;

  // Super admin can pass companyId via query or headers.
  if (r === 'super_admin') {
    const headerTenant = req.headers['x-tenant-id'] ?? req.headers['x-company-id'];
    const headerParsed = headerTenant != null ? parseInt(headerTenant, 10) : NaN;
    const queryParsed = req.query?.companyId != null ? parseInt(req.query.companyId, 10) : NaN;
    const bodyParsed = req.body?.companyId != null ? parseInt(req.body.companyId, 10) : NaN;
    const maybe = [headerParsed, queryParsed, bodyParsed].find((n) => !Number.isNaN(n));
    if (maybe != null) return maybe;

    // Fallback: if there is only one company, use it.
    const [rows] = await db.execute('SELECT id FROM companies LIMIT 2');
    if (rows.length === 1) return rows[0].id;
  }

  return null;
}

export async function requireCompanyAdminOrManager(req, res, next) {
  const r = String(req.user?.role || '').toLowerCase();
  if (!['company_admin', 'manager', 'super_admin'].includes(r)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const companyId = await resolveCompanyIdForSettings(req);
  if (companyId == null) {
    return res.status(400).json({ success: false, message: 'Company context required' });
  }

  req.companyIdForSettings = companyId;
  next();
}

function settingsPayload(toggles) {
  return {
    toggles,
    definitions: TOGGLE_META.map(({ id, label, description }) => ({ id, label, description })),
    coreDescription: CORE_MODULE_DESCRIPTION,
  };
}

export async function getCompanyModuleSettings(req, res) {
  try {
    const toggles = await getCompanyModuleFlags(req.companyIdForSettings);
    return res.json({ success: true, data: settingsPayload(toggles) });
  } catch (err) {
    console.error('getCompanyModuleSettings', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function patchCompanyModuleSettings(req, res) {
  try {
    const body = req.body ?? {};
    const partial = {};
    for (const id of MODULE_TOGGLE_IDS) {
      if (Object.prototype.hasOwnProperty.call(body, id)) {
        partial[id] = Boolean(body[id]);
      }
    }
    const toggles = await mergeAndSaveCompanyModuleFlags(req.companyIdForSettings, partial);
    return res.json({ success: true, data: settingsPayload(toggles) });
  } catch (err) {
    console.error('patchCompanyModuleSettings', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
