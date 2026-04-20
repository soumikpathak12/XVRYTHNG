import * as attendanceService from '../services/attendanceService.js';
import * as permissionService from '../services/permissionService.js';

function resolveCompanyId(req) {
  const fromTenant = req.tenantId != null ? Number(req.tenantId) : null;
  const fromQuery = req.query.companyId != null ? Number(req.query.companyId) : null;
  const fromHeader = req.headers['x-tenant-id']
    ? Number(req.headers['x-tenant-id'])
    : req.headers['x-company-id']
    ? Number(req.headers['x-company-id'])
    : null;
  const fromUser = req.user?.companyId != null ? Number(req.user.companyId) : null;
  return fromTenant ?? fromQuery ?? fromHeader ?? fromUser ?? null;
}

export async function checkIn(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });
    
    const employeeId = await attendanceService.getEmployeeIdByUserId(companyId, req.user.id);
    const { lat, lng, lunchBreakMinutes } = req.body;
    await attendanceService.checkIn(companyId, employeeId, lat, lng, lunchBreakMinutes);
    
    const status = await attendanceService.getTodayStatus(companyId, employeeId);
    return res.status(200).json({ success: true, data: status });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function checkOut(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });
    
    const employeeId = await attendanceService.getEmployeeIdByUserId(companyId, req.user.id);
    const { lat, lng, lunchBreakMinutes } = req.body;
    await attendanceService.checkOut(companyId, employeeId, lat, lng, lunchBreakMinutes);
    
    const status = await attendanceService.getTodayStatus(companyId, employeeId);
    return res.status(200).json({ success: true, data: status });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function todayStatus(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });
    
    const employeeId = await attendanceService.getEmployeeIdByUserId(companyId, req.user.id);
    const status = await attendanceService.getTodayStatus(companyId, employeeId);
    return res.status(200).json({ success: true, data: status || null });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function history(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });
    
    const employeeId = await attendanceService.getEmployeeIdByUserId(companyId, req.user.id);
    const historyData = await attendanceService.getHistory(companyId, employeeId, 30);
    return res.status(200).json({ success: true, data: historyData });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/** GET ?date=YYYY-MM-DD — company roster for one day (requires attendance_history:view). */
export async function companyDayAttendance(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    const platformRole = String(req.user?.role || '').toLowerCase();
    if (!companyId) {
      const hint =
        platformRole === 'super_admin'
          ? 'Missing company context — pass companyId as a query parameter (e.g. ?companyId=1&date=YYYY-MM-DD).'
          : 'Missing company context';
      return res.status(400).json({ success: false, message: hint });
    }

    const dateStr = String(req.query.date ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing date (use YYYY-MM-DD)' });
    }

    const allowed = await permissionService.userHasPermission(
      req.user.id,
      'attendance_history',
      'view',
    );
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const rows = await attendanceService.listCompanyAttendanceForDate(companyId, dateStr);
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
