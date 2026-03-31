// Per-company sales + project pipeline stages (customise / reorder / enable).
import db from '../config/db.js';

export const DEFAULT_SALES_STAGES = [
  { key: 'new', label: 'New', builtin: true },
  { key: 'contacted', label: 'Contacted', builtin: true },
  { key: 'qualified', label: 'Qualified', builtin: true },
  { key: 'inspection_booked', label: 'Site Inspection Booked', builtin: true },
  { key: 'inspection_completed', label: 'Site Inspection Completed', builtin: true },
  { key: 'proposal_sent', label: 'Proposal Sent', builtin: true },
  { key: 'negotiation', label: 'Negotiation', builtin: true },
  { key: 'closed_won', label: 'Closed Won', builtin: true },
  { key: 'closed_lost', label: 'Closed Lost', builtin: true },
];

export const DEFAULT_PROJECT_STAGES = [
  { key: 'new', label: 'New', builtin: true },
  { key: 'scheduled', label: 'Scheduled', builtin: true },
  { key: 'to_be_rescheduled', label: 'To Be Rescheduled', builtin: true },
  { key: 'installation_in_progress', label: 'Installation In-Progress', builtin: true },
  { key: 'installation_completed', label: 'Installation Completed', builtin: true },
  { key: 'ces_certificate_applied', label: 'CES Certificate Applied', builtin: true },
  { key: 'ces_certificate_received', label: 'CES Certificate Received', builtin: true },
  { key: 'grid_connection_initiated', label: 'GRID Connection Initiated', builtin: true },
  { key: 'grid_connection_completed', label: 'GRID Connection Completed', builtin: true },
  { key: 'system_handover', label: 'System Handover', builtin: true },
];

const CUSTOM_KEY_RE = /^custom_[a-z0-9_]{1,48}$/i;

const DEFAULT_KEYS_SALES = new Set(DEFAULT_SALES_STAGES.map((s) => s.key));
const DEFAULT_KEYS_PROJECT = new Set(DEFAULT_PROJECT_STAGES.map((s) => s.key));

function labelForDefault(pipeline, key) {
  const defs = pipeline === 'project_management' ? DEFAULT_PROJECT_STAGES : DEFAULT_SALES_STAGES;
  const d = defs.find((x) => x.key === key);
  return d?.label ?? key;
}

/**
 * Merge stored order with defaults: iterate stored rows first (order), then append missing defaults.
 */
export function mergePipelineStages(pipeline, storedRows) {
  const defaults = pipeline === 'project_management' ? DEFAULT_PROJECT_STAGES : DEFAULT_SALES_STAGES;
  const defaultKeySet = pipeline === 'project_management' ? DEFAULT_KEYS_PROJECT : DEFAULT_KEYS_SALES;
  const seen = new Set();
  const out = [];

  if (Array.isArray(storedRows)) {
    for (const row of storedRows) {
      const key = row?.key != null ? String(row.key).trim() : '';
      if (!key || seen.has(key)) continue;
      if (defaultKeySet.has(key)) {
        seen.add(key);
        out.push({
          key,
          label: String(row.label || labelForDefault(pipeline, key)).slice(0, 80),
          enabled: row.enabled !== false,
          builtin: true,
        });
      } else if (CUSTOM_KEY_RE.test(key)) {
        seen.add(key);
        out.push({
          key,
          label: String(row.label || key).slice(0, 80),
          enabled: row.enabled !== false,
          builtin: false,
        });
      }
    }
  }

  for (const d of defaults) {
    if (!seen.has(d.key)) {
      out.push({
        key: d.key,
        label: d.label,
        enabled: true,
        builtin: true,
      });
    }
  }

  return out;
}

function normalizeWorkflowRoot(raw) {
  let root = raw;
  if (raw == null) return {};
  if (typeof raw === 'string') {
    try {
      root = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return typeof root === 'object' && root !== null ? root : {};
}

export async function getWorkflowConfigRow(companyId) {
  if (companyId == null) return {};
  const [rows] = await db.execute(
    'SELECT workflow_config FROM companies WHERE id = ? LIMIT 1',
    [companyId]
  );
  return normalizeWorkflowRoot(rows[0]?.workflow_config);
}

export function buildFullWorkflowFromStored(storedRoot) {
  const salesStored = storedRoot?.sales?.stages;
  const projStored = storedRoot?.project_management?.stages;
  return {
    sales: { stages: mergePipelineStages('sales', salesStored) },
    project_management: { stages: mergePipelineStages('project_management', projStored) },
  };
}

export async function getFullWorkflow(companyId) {
  if (companyId == null) {
    return buildFullWorkflowFromStored({});
  }
  const stored = await getWorkflowConfigRow(companyId);
  return buildFullWorkflowFromStored(stored);
}

/** Enabled-only stages in order (for Kanban columns). */
export function getEnabledStages(pipelineStages) {
  return (pipelineStages?.stages ?? [])
    .filter((s) => s.enabled !== false)
    .map((s) => ({ key: s.key, label: s.label }));
}

export async function getPublicWorkflow(companyId) {
  const full = await getFullWorkflow(companyId);
  return {
    sales: { stages: getEnabledStages(full.sales) },
    project_management: { stages: getEnabledStages(full.project_management) },
  };
}

export function getAllDefinedKeys(stagesWrap) {
  return new Set((stagesWrap?.stages ?? []).map((s) => s.key));
}

export function getEnabledKeysSet(stagesWrap) {
  return new Set(
    (stagesWrap?.stages ?? []).filter((s) => s.enabled !== false).map((s) => s.key)
  );
}

export async function getLeadStageSets(companyId) {
  if (companyId == null) {
    const full = mergePipelineStages('sales', null);
    const wrap = { stages: full };
    return {
      allKeys: getAllDefinedKeys(wrap),
      enabledKeys: getEnabledKeysSet(wrap),
      orderKeys: full.map((s) => s.key),
    };
  }
  const full = await getFullWorkflow(companyId);
  const sales = full.sales;
  return {
    allKeys: getAllDefinedKeys(sales),
    enabledKeys: getEnabledKeysSet(sales),
    orderKeys: sales.stages.map((s) => s.key),
  };
}

export async function getProjectStageSets(companyId) {
  if (companyId == null) {
    const full = mergePipelineStages('project_management', null);
    const wrap = { stages: full };
    return {
    allKeys: getAllDefinedKeys(wrap),
    enabledKeys: getEnabledKeysSet(wrap),
    orderKeys: full.map((s) => s.key),
  };
  }
  const full = await getFullWorkflow(companyId);
  const pm = full.project_management;
  return {
    allKeys: getAllDefinedKeys(pm),
    enabledKeys: getEnabledKeysSet(pm),
    orderKeys: pm.stages.map((s) => s.key),
  };
}

export async function saveWorkflowPipeline(companyId, pipeline, stages) {
  if (companyId == null) throw new Error('Company required');
  const p = String(pipeline);
  if (p !== 'sales' && p !== 'project_management') {
    throw new Error('Invalid pipeline');
  }
  if (!Array.isArray(stages) || stages.length === 0) {
    throw new Error('At least one stage is required');
  }

  const cleaned = [];
  const keysSeen = new Set();
  for (const row of stages) {
    const key = row?.key != null ? String(row.key).trim() : '';
    if (!key || keysSeen.has(key)) continue;
    const defaultSet = p === 'project_management' ? DEFAULT_KEYS_PROJECT : DEFAULT_KEYS_SALES;
    if (!defaultSet.has(key) && !CUSTOM_KEY_RE.test(key)) continue;
    keysSeen.add(key);
    cleaned.push({
      key,
      label: String(row.label || key).slice(0, 80),
      enabled: row.enabled !== false,
      builtin: defaultSet.has(key),
    });
  }

  if (cleaned.length === 0) throw new Error('No valid stages');

  const enabledCount = cleaned.filter((s) => s.enabled !== false).length;
  if (enabledCount < 1) throw new Error('At least one stage must stay enabled');

  const stored = await getWorkflowConfigRow(companyId);
  const nextRoot = { ...stored, [p]: { stages: cleaned } };
  await db.execute(
    'UPDATE companies SET workflow_config = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [JSON.stringify(nextRoot), companyId]
  );
  return buildFullWorkflowFromStored(nextRoot);
}

export function isSafeStageKey(key) {
  if (key == null || typeof key !== 'string') return false;
  const k = key.trim();
  if (k.length < 1 || k.length > 80) return false;
  return /^[a-z0-9_]+$/i.test(k);
}
