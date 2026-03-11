import * as leaveService from '../services/leaveService.js';
import * as attendanceService from '../services/attendanceService.js';

function resolveCompanyId(req) {
  const fromTenant = req.tenantId != null ? Number(req.tenantId) : null;
  const fromQuery  = req.query.companyId != null ? Number(req.query.companyId) : null;
  const fromHeader = req.headers['x-tenant-id']
    ? Number(req.headers['x-tenant-id'])
    : req.headers['x-company-id']
    ? Number(req.headers['x-company-id'])
    : null;
  return fromTenant ?? fromQuery ?? fromHeader ?? null;
}

// GET /api/employees/leave/balances
export async function getBalances(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });
    const employeeId = await attendanceService.getEmployeeIdByUserId(companyId, req.user.id);
    const data = await leaveService.getBalances(companyId, employeeId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

// POST /api/employees/leave/request
export async function submitRequest(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });
    const employeeId = await attendanceService.getEmployeeIdByUserId(companyId, req.user.id);
    const { leaveType, startDate, endDate, reason } = req.body;
    const data = await leaveService.submitLeaveRequest(companyId, employeeId, { leaveType, startDate, endDate, reason });
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

// GET /api/employees/leave/my-requests
export async function myRequests(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });
    const employeeId = await attendanceService.getEmployeeIdByUserId(companyId, req.user.id);
    const data = await leaveService.getMyLeaveRequests(companyId, employeeId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

// GET /api/employees/leave/pending
export async function pendingRequests(req, res) {
  try {
    const companyId = resolveCompanyId(req); // null = super admin
    const data = await leaveService.getPendingLeaveRequests(companyId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

// PATCH /api/employees/leave/:id/review
export async function reviewRequest(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    const { action, reviewerNote } = req.body;
    if (!action) return res.status(400).json({ success: false, message: 'action is required.' });
    const data = await leaveService.reviewLeaveRequest(companyId, Number(req.params.id), req.user.id, action, reviewerNote || '');
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

// DELETE /api/employees/leave/:id/cancel
export async function cancelRequest(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });
    const employeeId = await attendanceService.getEmployeeIdByUserId(companyId, req.user.id);
    const data = await leaveService.cancelLeaveRequest(companyId, employeeId, Number(req.params.id));
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}
