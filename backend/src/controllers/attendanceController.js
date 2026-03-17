import * as attendanceService from '../services/attendanceService.js';

function resolveCompanyId(req) {
  const fromTenant = req.tenantId != null ? Number(req.tenantId) : null;
  const fromQuery = req.query.companyId != null ? Number(req.query.companyId) : null;
  const fromHeader = req.headers['x-tenant-id']
    ? Number(req.headers['x-tenant-id'])
    : req.headers['x-company-id']
    ? Number(req.headers['x-company-id'])
    : null;
  return fromTenant ?? fromQuery ?? fromHeader ?? null;
}

export async function checkIn(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });
    
    const employeeId = await attendanceService.getEmployeeIdByUserId(companyId, req.user.id);
    const { lat, lng } = req.body;
    await attendanceService.checkIn(companyId, employeeId, lat, lng);
    
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
    const { lat, lng } = req.body;
    await attendanceService.checkOut(companyId, employeeId, lat, lng);
    
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
