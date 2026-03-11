import * as editService from '../services/attendanceEditService.js';
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

/**
 * POST /api/employees/attendance/edit-request
 * Employee submits a correction request for one of their attendance records.
 */
export async function submitEditRequest(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });

    const employeeId = await attendanceService.getEmployeeIdByUserId(companyId, req.user.id);
    const { attendanceId, reqCheckIn, reqCheckOut, reason } = req.body;

    if (!attendanceId || !reqCheckIn || !reqCheckOut || !reason) {
      return res.status(400).json({ success: false, message: 'attendanceId, reqCheckIn, reqCheckOut, and reason are required.' });
    }

    const result = await editService.submitEditRequest(companyId, employeeId, Number(attendanceId), {
      reqCheckIn, reqCheckOut, reason,
    });
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/employees/attendance/edit-requests
 * Employee: list their own edit requests.
 */
export async function myEditRequests(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });

    const employeeId = await attendanceService.getEmployeeIdByUserId(companyId, req.user.id);
    const data = await editService.getMyEditRequests(companyId, employeeId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/employees/attendance/edit-requests/pending
 * Manager/Admin: list all pending edit requests for the company.
 */
export async function pendingEditRequests(req, res) {
  try {
    const companyId = resolveCompanyId(req); // null = super admin (all companies)
    const data = await editService.getPendingEditRequests(companyId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/**
 * PATCH /api/employees/attendance/edit-requests/:id
 * Manager/Admin: approve or reject a request.
 * Body: { action: 'approved'|'rejected', reviewerNote?: string }
 */
export async function reviewEditRequest(req, res) {
  try {
    // For super admin, companyId may be null — the service validates via request ID
    const companyId = resolveCompanyId(req);

    const { action, reviewerNote } = req.body;
    if (!action) return res.status(400).json({ success: false, message: 'action is required.' });

    const result = await editService.reviewEditRequest(
      companyId,
      Number(req.params.id),
      req.user.id,
      action,
      reviewerNote || ''
    );
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}
