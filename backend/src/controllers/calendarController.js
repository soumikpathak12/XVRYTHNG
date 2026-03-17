/**
 * Calendar API: leads by date range (site_inspection_date).
 * GET /api/calendar/leads?start=YYYY-MM-DD&end=YYYY-MM-DD
 * When the user is an employee, only returns leads where they are the assigned inspector.
 */
import * as leadService from '../services/leadService.js';

function toYYYYMMDD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function getCalendarLeads(req, res) {
  try {
    let start = (req.query.start || '').toString().trim();
    let end = (req.query.end || '').toString().trim();

    const now = new Date();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      start = toYYYYMMDD(first);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end = toYYYYMMDD(last);
    }

    if (start > end) {
      [start, end] = [end, start];
    }

    let inspectorId = null;
    const companyId = req.tenantId ?? req.user?.companyId ?? null;
    if (companyId != null && req.user?.id) {
      try {
        const { getEmployeeIdByUserId } = await import('../services/attendanceService.js');
        inspectorId = await getEmployeeIdByUserId(companyId, req.user.id);
      } catch (e) {
        // ignore
      }
    }

    const rows = await leadService.getLeadsByDateRange(start, end, inspectorId);
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('Calendar leads error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to load calendar leads.',
    });
  }
}
