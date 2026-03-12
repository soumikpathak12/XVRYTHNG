// src/services/ProjectManagementDashboardService.js
// Purpose: Build the PM Dashboard data from retailer_projects + projects.
// Notes:
// - We DO NOT use columns that your DB does not have (e.g., p.company_id, rp.assigned_pm_user_id).
// - Projects branch does not filter by company because your 'projects' table lacks company_id.
// - Retailer branch optionally filters by company (toggle via env and/or query flags).
// - Includes 2 debug helpers: getUnionRaw (see raw rows) and getQuickCounts (table counts).

import db from '../config/db.js';

// Debug flags via env vars
const DEBUG = String(process.env.PMDB_DEBUG || '').toLowerCase() === 'true';
// When true, retailer branch requires companyId to filter; otherwise it scans all companies (for debugging).
const REQUIRE_COMPANY_FOR_RETAILER = String(process.env.PMDB_RETAILER_REQUIRE_COMPANY ?? 'true').toLowerCase() === 'true';

function dlog(...args) {
  if (DEBUG) console.log('[PMDB]', ...args);
}

// Stages considered closed (not active)
const CLOSED_STAGES = new Set(['done', 'project_completed', 'cancelled', 'installation_completed']);

// Stage label mapping for display
const STAGE_GROUPS = {
  new: 'New',
  pre_approval: 'Pre-approval',
  state_rebate: 'State rebate',
  design_engineering: 'Design & engineering',
  procurement: 'Procurement',
  scheduled: 'Scheduled',
  installation_in_progress: 'Installation in progress',
  installation_completed: 'Installation completed',
  compliance_check: 'Compliance check',
  inspection_grid_connection: 'Inspection & grid connection',
  rebate_stc_claims: 'Rebate & STC claims',
  site_inspection: 'Site Inspection',
  stage_one: 'Stage One',
  stage_two: 'Stage Two',
  full_system: 'Full System',
  cancelled: 'Cancelled',
  project_completed: 'Project Completed',
  done: 'Done',
};

// Reverse mapping (label -> list of raw stage keys)
const REVERSE_STAGE_GROUPS = Object.entries(STAGE_GROUPS).reduce((acc, [raw, label]) => {
  (acc[label] ||= []).push(raw);
  return acc;
}, {});

/* ---------------- Date range filter builder ---------------- */
// Returns a fragment like " AND p.updated_at >= DATE_SUB(...) " and its parameters.
// We later replace p. -> t. after wrapping the UNION into subquery "t".
function rangeToSql({ range, from, to }) {
  if (range === 'custom' && from && to) {
    return { where: ' AND p.updated_at BETWEEN ? AND ? ', params: [from, to] };
  }
  if (range === '30d') return { where: ' AND p.updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) ', params: [] };
  if (range === '90d') return { where: ' AND p.updated_at >= DATE_SUB(NOW(), INTERVAL 90 DAY) ', params: [] };
  if (range === 'fy') return { where: ' AND YEAR(p.updated_at) = YEAR(DATE_SUB(CURDATE(), INTERVAL (MONTH(CURDATE())<7) YEAR)) ', params: [] };
  return { where: '', params: [] };
}

/**
 * Build UNION ALL SQL for retailer_projects + projects.
 * - Retailer WHERE:
 *    * If REQUIRE_COMPANY_FOR_RETAILER=true and allCompanies=false:
 *      - requires companyId; if missing, returns 0 rows (1=0 guard).
 *    * Otherwise no company filter (debug scan).
 * - Projects WHERE:
 *    * Does NOT filter companyId (your 'projects' table has no company_id).
 * - stageKey (raw) applied to both branches if provided.
 */
function baseUnionSql({ companyId, stageKey, allCompanies }) {
  // Retailer WHERE builder
  const retailerWhereParts = [];
  const retailerParams = [];

  const applyRetailerCompanyFilter = REQUIRE_COMPANY_FOR_RETAILER && !allCompanies;
  // Nếu không có companyId, vẫn cho lấy tất cả retailer_projects (không chặn 1=0)
  if (applyRetailerCompanyFilter && companyId != null) {
    retailerWhereParts.push('rp.company_id = ?');
    retailerParams.push(companyId);
  }
  if (stageKey) { retailerWhereParts.push('rp.stage = ?'); retailerParams.push(stageKey); }
  const retailerWhere = retailerWhereParts.length ? `WHERE ${retailerWhereParts.join(' AND ')}` : 'WHERE 1=1';

  // Projects WHERE builder (no company filter)
  const projectWhereParts = [];
  const projectParams = [];
  if (stageKey) { projectWhereParts.push('p.stage = ?'); projectParams.push(stageKey); }
  const projectsWhere = projectWhereParts.length ? `WHERE ${projectWhereParts.join(' AND ')}` : 'WHERE 1=1';

  const sql = `
    /* RETAILER */
    SELECT
      'retailer'       AS type,
      rp.id            AS id,
      rp.company_id    AS company_id,
      rp.code          AS code,
      rp.stage         AS stage,
      rp.value_amount  AS revenue,
      NULL             AS cost,           -- cost not used in current DB
      NULL             AS pm_user_id,     -- no PM column on retailer in current DB
      rp.updated_at    AS updated_at,
      rps.scheduled_date AS scheduled_date,
      rps.job_type     AS job_type,
      NULL             AS compliance_due_at,
      NULL             AS compliance_flags
    FROM retailer_projects rp
    LEFT JOIN retailer_project_schedules rps
      ON rps.company_id = rp.company_id AND rps.project_id = rp.id
    ${retailerWhere}

    UNION ALL

    /* PROJECTS (classic) */
    SELECT
      'project'        AS type,
      p.id             AS id,
      NULL             AS company_id,   -- 'projects' table has no company_id (by your dump)
      NULL             AS code,         -- if you add a code column later, wire it here
      p.stage          AS stage,
      p.value_amount   AS revenue,
      NULL             AS cost,         -- no cost column yet
      NULL             AS pm_user_id,   -- if you add this column later, wire it here
      p.updated_at     AS updated_at,
      ps.scheduled_at  AS scheduled_date,
      NULL             AS job_type,
      NULL             AS compliance_due_at,
      NULL             AS compliance_flags
    FROM projects p
    LEFT JOIN project_schedules ps
      ON ps.project_id = p.id
    ${projectsWhere}
  `;

  const params = [...retailerParams, ...projectParams];
  return { sql, params };
}

/* ---------------- Helpers ---------------- */
function summarizeActivePhases(activeRows) {
  const installPhase = activeRows.filter(r => ['installation_in_progress', 'full_system', 'scheduled'].includes(r.stage)).length;
  return installPhase ? `${installPhase} in installation phase` : '';
}

/* ---------------- Main dashboard builder ---------------- */
export async function buildDashboard(
  companyId,
  { range, from, to, stage, includeClosed = false, allCompanies = false }
) {
  const time = rangeToSql({ range, from, to });
  const { sql, params } = baseUnionSql({ companyId, stageKey: stage, allCompanies });

  const q = `
    SELECT * FROM (
      ${sql}
    ) t
    WHERE 1=1
    ${time.where.replaceAll('p.', 't.')}
  `;
  const finalParams = [...params, ...time.params];

  dlog('SQL (buildDashboard):\n', q);
  dlog('PARAMS:', finalParams);

  const [rows] = await db.execute(q, finalParams);

  // Debug histograms
  if (DEBUG) {
    const histAll = rows.reduce((m, r) => (m[r.stage] = (m[r.stage] || 0) + 1, m), {});
    dlog('Rows count:', rows.length, 'Histogram (ALL):', histAll);
  }

  // Active = exclude closed unless includeClosed flag = true
  const isActive = (r) => includeClosed ? true : !CLOSED_STAGES.has(r.stage);
  const active = rows.filter(isActive);
  const totalActive = active.length;

  if (DEBUG) {
    const histActive = active.reduce((m, r) => (m[r.stage] = (m[r.stage] || 0) + 1, m), {});
    dlog('Active count:', totalActive, 'Histogram (ACTIVE):', histActive);
  }

  // Split active rows by source type
  const activeRetailer = active.filter(r => r.type === 'retailer');
  const activeClassic = active.filter(r => r.type === 'project');
  const totalActiveRetailer = activeRetailer.length;
  const totalActiveClassic = activeClassic.length;

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  const startMs = today.getTime();

  // End of 7th day from today (today + 7 days, set to 23:59:59)
  const endOf7thDay = new Date(today);
  endOf7thDay.setDate(endOf7thDay.getDate() + 7);
  endOf7thDay.setHours(23, 59, 59, 999);
  const endMs = endOf7thDay.getTime();
  const upcoming = active.filter(r => {
    if (!r.scheduled_date) return false;
    const t = new Date(r.scheduled_date).getTime();
    return t >= startMs && t <= endMs;
  });

  // Compliance alerts: skipped for now (no due/flags in your DB)
  const complianceAlerts = [];

  // Revenue / Costs (cost is 0 until columns exist)
  const revenue = active.reduce((s, r) => s + (Number(r.revenue) || 0), 0);
  const revenueRetailer = activeRetailer.reduce((s, r) => s + (Number(r.revenue) || 0), 0);
  const revenueClassic = activeClassic.reduce((s, r) => s + (Number(r.revenue) || 0), 0);
  const cost = 0;
  const margin = revenue - cost;
  const avgProjectValue = totalActive ? revenue / totalActive : 0;

  // Projects by Status (group by raw stage, render label where available)
  const rawCount = new Map();
  active.forEach(r => {
    const raw = r.stage || 'unknown';
    rawCount.set(raw, (rawCount.get(raw) || 0) + 1);
  });
  const byStatus = Array.from(rawCount.entries())
    .map(([raw, count]) => ({ raw, label: STAGE_GROUPS[raw] ?? raw, count }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // Attention flags (basic heuristic)
  const nowMs = Date.now();
  const needsAttention = active
    .map(r => {
      const overdue = r.scheduled_date && new Date(r.scheduled_date).getTime() < nowMs;
      const blocked = String(r.stage || '').toLowerCase().includes('blocked');
      const pending = ['pre_approval', 'state_rebate'].includes(r.stage);
      let reason = null;
      if (blocked) reason = 'blocked';
      else if (overdue) reason = 'overdue';
      else if (pending) reason = 'pending_approval';
      return { ...r, attention_reason: reason };
    })
    .filter(r => r.attention_reason);

  const recent = [...rows].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 5);
  const recentRetailer = recent.filter(r => r.type === 'retailer');
  const recentClassic = recent.filter(r => r.type === 'project');

  return {
    summaryCards: {
      activeProjects: { value: totalActive, extra: summarizeActivePhases(active) },
      activeRetailerProjects: { value: totalActiveRetailer },
      activeClassicProjects: { value: totalActiveClassic },
      upcomingInstallations: { value: upcoming.length, extra: 'Next 7 days' },
      complianceAlerts: { value: complianceAlerts.length, extra: 'Requires attention' },
      totalProjectValue: { value: revenue, currency: 'AUD' },
    },
    complianceList: [],
    projectsByStatus: byStatus,
    profitability: {
      totalRevenue: revenue,
      totalCosts: cost,
      grossMargin: margin,
      avgProjectValue,
    },
    recentProjects: recent,
    recentRetailerProjects: recentRetailer,
    recentClassicProjects: recentClassic,
    attentionList: needsAttention.slice(0, 10),
  };
}

/* ---------------- Drilldown list ---------------- */
export async function getDrilldown(companyId, { kind, key, range, from, to, allCompanies = false }) {
  const time = rangeToSql({ range, from, to });
  const { sql, params } = baseUnionSql({ companyId, allCompanies });

  let where = ' WHERE 1=1 ';
  let having = '';
  const p = [...params, ...time.params];

  switch (kind) {
    case 'active':
      where += ` AND t.stage NOT IN ('installation_completed','done','project_completed','cancelled') `;
      break;
    case 'upcoming':
      where += ` AND t.stage NOT IN ('installation_completed','done','project_completed','cancelled')
                 AND t.scheduled_date IS NOT NULL
                 AND DATE(t.scheduled_date) >= CURDATE()
                 AND DATE(t.scheduled_date) <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) `;
      break;
    case 'compliance':
      where += ` AND 1=0 `;
      break;
    case 'attention':
      having = `
        HAVING
          CASE
            WHEN (t.scheduled_date IS NOT NULL AND t.scheduled_date < NOW()
                  AND t.stage NOT IN ('installation_completed','done','project_completed','cancelled')) THEN 'overdue'
            WHEN (t.stage LIKE '%blocked%') THEN 'blocked'
            WHEN (t.stage IN ('pre_approval','state_rebate')) THEN 'pending_approval'
            ELSE NULL
          END = ?
      `;
      p.push(key);
      break;
    case 'status': {
      // key can be a label (e.g., "Scheduled") or raw (e.g., "scheduled")
      const raws = REVERSE_STAGE_GROUPS[key] || [key];
      where += ` AND t.stage IN (${raws.map(() => '?').join(',')}) `;
      p.push(...raws);
      break;
    }
    case 'revenue':
      where += ` AND t.stage NOT IN ('cancelled','done','project_completed') `;
      break;
    default:
    // no-op
  }

  const q = `
    SELECT * FROM (
      SELECT * FROM (
        ${sql}
      ) t
      ${time.where.replaceAll('p.', 't.')}
    ) z
    ${where}
    ${having}
    ORDER BY z.updated_at DESC
    LIMIT 500
  `;

  dlog('SQL (drilldown):\n', q);
  dlog('PARAMS:', p);

  const [rows] = await db.execute(q, p);
  return rows;
}

/* ---------------- Debug helpers ---------------- */
// Returns raw UNION rows and a simple histogram by stage.
export async function getUnionRaw(companyId, { range, from, to, stage, allCompanies = false }) {
  const time = rangeToSql({ range, from, to });
  const { sql, params } = baseUnionSql({ companyId, stageKey: stage, allCompanies });

  const q = `
    SELECT * FROM (
      ${sql}
    ) t
    WHERE 1=1
    ${time.where.replaceAll('p.', 't.')}
  `;
  const finalParams = [...params, ...time.params];
  dlog('SQL (raw):\n', q);
  dlog('PARAMS:', finalParams);

  const [rows] = await db.execute(q, finalParams);
  const histogram = rows.reduce((m, r) => (m[r.stage] = (m[r.stage] || 0) + 1, m), {});
  return { rows, histogram };
}

// Quick counts to verify the DB is populated.
export async function getQuickCounts(companyId) {
  const retQuery = (companyId != null)
    ? 'SELECT COUNT(*) AS c FROM retailer_projects WHERE company_id = ?'
    : 'SELECT COUNT(*) AS c FROM retailer_projects';
  const retParams = (companyId != null) ? [companyId] : [];
  const [[ret]] = await db.execute(retQuery, retParams);

  const [[proj]] = await db.execute('SELECT COUNT(*) AS c FROM projects');

  return {
    retailer_projects: ret.c,
    projects: proj.c,
  };
}