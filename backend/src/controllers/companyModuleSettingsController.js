import {
  TOGGLE_META,
  CORE_MODULE_DESCRIPTION,
  getCompanyModuleFlags,
  mergeAndSaveCompanyModuleFlags,
  MODULE_TOGGLE_IDS,
} from '../services/companyModuleService.js';

export function requireCompanyAdminOrManager(req, res, next) {
  const r = String(req.user?.role || '').toLowerCase();
  if (!['company_admin', 'manager'].includes(r)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  if (req.user?.companyId == null) {
    return res.status(400).json({ success: false, message: 'Company context required' });
  }
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
    const toggles = await getCompanyModuleFlags(req.user.companyId);
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
    const toggles = await mergeAndSaveCompanyModuleFlags(req.user.companyId, partial);
    return res.json({ success: true, data: settingsPayload(toggles) });
  } catch (err) {
    console.error('patchCompanyModuleSettings', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
