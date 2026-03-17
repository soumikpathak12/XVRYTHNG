// src/controllers/projectMangementDashboardController.js
// Purpose: Glue layer between routes and service.
// - Keeps your file name as-is (with the 'Mangement' typo) to match your current imports.
// - Adds 3 debug endpoints to quickly verify data presence and see raw rows / SQL logging.

import {
  buildDashboard,
  getDrilldown,
  getUnionRaw,
  getQuickCounts,
} from '../services/ProjectManagementDashboardService.js';

const DEBUG = String(process.env.PMDB_DEBUG || '').toLowerCase() === 'true';

// Resolve companyId from query (?companyId=...), otherwise null.
// When null, retailer branch may still return data if PMDB_RETAILER_REQUIRE_COMPANY=false (for debugging).
function resolveCompanyId(req) {
  if (req.query.companyId != null && req.query.companyId !== '') {
    const n = Number(req.query.companyId);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function getPmDashboard(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    const {
      range = 'all',
      from = null,
      to = null,
      stage = null,
      includeClosed = '0', // include closed stages when '1' (debug)
      allCompanies  = '0', // ignore retailer company filter when '1' (debug)
    } = req.query;

    // Frontend đôi khi gửi chuỗi 'undefined' -> coi như không filter stage
    const effectiveStage = !stage || stage === 'undefined' ? null : stage;

    const data = await buildDashboard(companyId, {
      range, from, to, stage: effectiveStage,
      includeClosed: includeClosed === '1',
      allCompanies:  allCompanies === '1',
    });

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[PMDB] getPmDashboard error:', err);
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message || 'Failed to load dashboard' });
  }
}

export async function getPmDashboardDrilldown(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    const { kind, key, range = 'all', from = null, to = null, allCompanies = '0' } = req.query;

    const rows = await getDrilldown(companyId, { kind, key, range, from, to, allCompanies: allCompanies === '1' });
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('[PMDB] getPmDashboardDrilldown error:', err);
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message || 'Failed to load drilldown' });
  }
}

/** DEBUG only: responds but actual SQL + params are printed by the service (console). */
export async function getPmDashboardDebug(req, res) {
  if (!DEBUG) return res.status(403).json({ success: false, message: 'Enable PMDB_DEBUG=true to use this endpoint' });
  try {
    return res.status(200).json({ success: true, message: 'Check server logs for SQL & params (PMDB_DEBUG=true)' });
  } catch (err) {
    console.error('[PMDB] debug endpoint error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/** DEBUG: return UNION raw rows + histogram by stage (make sure PMDB_DEBUG=true). */
export async function getPmDashboardDebugRaw(req, res) {
  try {
    if (!DEBUG) return res.status(403).json({ success: false, message: 'Enable PMDB_DEBUG=true' });

    const companyId = resolveCompanyId(req);
    const { range = 'all', from = null, to = null, stage = null, allCompanies = '0' } = req.query;

    const data = await getUnionRaw(companyId, { range, from, to, stage, allCompanies: allCompanies === '1' });
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    console.error('[PMDB] getPmDashboardDebugRaw error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to run debug raw' });
  }
}

/** DEBUG: quick counts from tables to verify DB population (PMDB_DEBUG=true). */
export async function getPmDashboardDebugCounts(req, res) {
  try {
    if (!DEBUG) return res.status(403).json({ success: false, message: 'Enable PMDB_DEBUG=true' });

    const companyId = resolveCompanyId(req);
    const counts = await getQuickCounts(companyId);
    return res.status(200).json({ success: true, counts, companyId });
  } catch (err) {
    console.error('[PMDB] getPmDashboardDebugCounts error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to run counts' });
  }
}