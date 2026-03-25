// Per-company module toggles (US-085) — maps to sidebar `module_key` values.
import db from '../config/db.js';

export const MODULE_TOGGLE_IDS = [
  'sales',
  'on_field',
  'project_management',
  'operations',
  'customer_portal',
  'communications',
];

export const DEFAULT_MODULE_FLAGS = Object.fromEntries(MODULE_TOGGLE_IDS.map((id) => [id, true]));

/** Sidebar keys that are never hidden by company toggles (core / HR). */
export const ALWAYS_ON_MODULE_KEYS = new Set([
  'settings',
  'support',
  'attendance',
  'payroll',
  'leave',
  'expenses',
]);

export const TOGGLE_META = [
  {
    id: 'sales',
    label: 'Sales',
    description: 'Lead pipeline, site inspection, and sales workflows.',
    keys: ['leads', 'site_inspection'],
  },
  {
    id: 'on_field',
    label: 'On-Field',
    description: 'Field work, installation day, and on-site activities.',
    keys: ['on_field', 'installation'],
  },
  {
    id: 'project_management',
    label: 'Project Management',
    description: 'In-house and retailer project tracking.',
    keys: ['projects'],
  },
  {
    id: 'operations',
    label: 'Operations',
    description: 'Approvals and operational workflows.',
    keys: ['operations'],
  },
  {
    id: 'customer_portal',
    label: 'Customer Portal',
    description: 'Referral program and customer-facing touchpoints your team manages.',
    keys: ['referrals'],
  },
  {
    id: 'communications',
    label: 'Communications',
    description: 'Team messaging.',
    keys: ['messages'],
  },
];

export const CORE_MODULE_DESCRIPTION =
  'Dashboard, Settings, Support, Attendance, Payroll, Leave, and Expenses remain available for users who already have access. These cannot be disabled here.';

const keyToToggles = new Map();
for (const t of TOGGLE_META) {
  for (const k of t.keys) {
    if (!keyToToggles.has(k)) keyToToggles.set(k, []);
    keyToToggles.get(k).push(t.id);
  }
}

export function normalizeEnabledModulesJson(raw) {
  const base = { ...DEFAULT_MODULE_FLAGS };
  if (raw == null) return base;
  let obj = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      return base;
    }
  }
  if (typeof obj !== 'object' || obj === null) return base;
  for (const id of MODULE_TOGGLE_IDS) {
    if (Object.prototype.hasOwnProperty.call(obj, id)) {
      base[id] = Boolean(obj[id]);
    }
  }
  return base;
}

export function moduleKeyAllowedByCompanyFlags(moduleKey, flags) {
  if (ALWAYS_ON_MODULE_KEYS.has(moduleKey)) return true;
  const toggles = keyToToggles.get(moduleKey);
  if (!toggles || toggles.length === 0) return true;
  return toggles.some((tid) => flags[tid] !== false);
}

export async function getCompanyModuleFlags(companyId) {
  if (companyId == null) return { ...DEFAULT_MODULE_FLAGS };
  const [rows] = await db.execute(
    'SELECT enabled_modules FROM companies WHERE id = ? LIMIT 1',
    [companyId]
  );
  const row = rows[0];
  return normalizeEnabledModulesJson(row?.enabled_modules);
}

export async function mergeAndSaveCompanyModuleFlags(companyId, partial) {
  const current = await getCompanyModuleFlags(companyId);
  const next = { ...current };
  if (partial && typeof partial === 'object') {
    for (const id of MODULE_TOGGLE_IDS) {
      if (Object.prototype.hasOwnProperty.call(partial, id)) {
        next[id] = Boolean(partial[id]);
      }
    }
  }
  await db.execute(
    'UPDATE companies SET enabled_modules = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [JSON.stringify(next), companyId]
  );
  return next;
}

export async function filterModulesByCompanyPolicy(modules, companyId) {
  if (companyId == null || !Array.isArray(modules)) return modules;
  const flags = await getCompanyModuleFlags(companyId);
  return modules.filter((k) => moduleKeyAllowedByCompanyFlags(k, flags));
}
