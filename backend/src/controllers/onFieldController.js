/**
 * On-Field calendar API for employees.
 * GET /api/on-field/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
import { getOnFieldCalendar } from '../services/onFieldService.js';
import { getEmployeeIdByUserId } from '../services/attendanceService.js';

function toYYYYMMDD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function getCalendar(req, res) {
  try {
    const companyId = req.tenant?.company_id ?? req.tenantId ?? req.user?.companyId ?? null;
    if (!companyId || !req.user?.id) {
      return res.status(400).json({ success: false, message: 'Missing company or user context' });
    }

    let employeeId;
    try {
      employeeId = await getEmployeeIdByUserId(companyId, req.user.id);
    } catch (e) {
      return res.status(403).json({ success: false, message: 'Employee not found or inactive' });
    }

    let from = (req.query.from || '').toString().trim();
    let to = (req.query.to || '').toString().trim();
    const now = new Date();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) from = toYYYYMMDD(now);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(to)) to = toYYYYMMDD(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    if (from > to) [from, to] = [to, from];

    const events = await getOnFieldCalendar(companyId, employeeId, from, to);
    return res.json({ success: true, data: events });
  } catch (err) {
    console.error('On-field calendar error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to load calendar' });
  }
}
