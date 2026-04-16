// src/routes/employeeRoutes.js
import { Router } from 'express';
import { tenantContext } from '../middleware/tenantContext.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createEmployee,
  listEmployees,
  getEmployee,
  getInspectorScheduleConflicts,
  updateEmployee,
  deactivateEmployee,
  getRoleModulesPreview,
  getJobRolesForCompany,
  getEmploymentTypes,getDepartmentsForCompany
} from '../controllers/employeeController.js';
import * as employeeService from '../services/employeeService.js'
import * as attendanceController from '../controllers/attendanceController.js';
import * as attendanceEditController from '../controllers/attendanceEditController.js';
import * as leaveController from '../controllers/leaveController.js';
import * as expenseController from '../controllers/expenseController.js';
import * as payrollController from '../controllers/payrollController.js';
import { uploadReceiptMiddleware } from '../controllers/expenseController.js';
const router = Router();
router.use(requireAuth, tenantContext);

router.use((req, res, next) => {
  console.log('[EMP ROUTER]', req.method, req.originalUrl);
  next();
});
router.post('/', createEmployee);
router.get('/', listEmployees);

router.post('/attendance/check-in', attendanceController.checkIn);
router.post('/attendance/check-out', attendanceController.checkOut);
router.get('/attendance/today', attendanceController.todayStatus);
router.get('/attendance/history', attendanceController.history);

// Attendance edit requests (employee)
router.post('/attendance/edit-request', attendanceEditController.submitEditRequest);
router.get('/attendance/edit-requests', attendanceEditController.myEditRequests);

// Attendance edit requests (manager / admin)
router.get('/attendance/edit-requests/pending', attendanceEditController.pendingEditRequests);
router.patch('/attendance/edit-requests/:id', attendanceEditController.reviewEditRequest);

// Payroll
router.post('/payroll/calculate', payrollController.calculatePayroll);
router.post('/payroll/save', payrollController.savePayrollRun);
router.get('/payroll/runs', payrollController.getPayrollRuns);
router.get('/payroll/runs/:id', payrollController.getPayrollRunDetails);

// Payslips
router.post('/payroll/runs/:payrollRunId/payslips/:employeeId/generate', payrollController.generatePayslip);
router.post('/payroll/runs/:payrollRunId/payslips/generate-all', payrollController.generateAllPayslips);
router.get('/payroll/runs/:payrollRunId/payslips/:employeeId/download', payrollController.downloadPayslip);
router.get('/payroll/runs/:payrollRunId/payslips/download-all', payrollController.downloadAllPayslips);
router.post('/payroll/runs/:payrollRunId/payslips/email-all', payrollController.emailAllPayslips);

// Leave
router.get('/leave/balances', leaveController.getBalances);
router.post('/leave/request', leaveController.submitRequest);
router.get('/leave/my-requests', leaveController.myRequests);
router.get('/leave/pending', leaveController.pendingRequests);
router.patch('/leave/:id/review', leaveController.reviewRequest);
router.delete('/leave/:id/cancel', leaveController.cancelRequest);

// Expenses
router.post('/expenses', uploadReceiptMiddleware, expenseController.submitExpense);
router.get('/expenses/my', expenseController.myExpenses);
router.get('/expenses/job/:jobId', expenseController.jobExpenses);
router.get('/expenses/pending', expenseController.pendingExpenses);
router.patch('/expenses/:id/review', expenseController.reviewExpense);
router.delete('/expenses/:id/cancel', expenseController.cancelExpense);

router.get('/preview/role-modules/:job_role_id', getRoleModulesPreview);
router.get('/options/job-roles', getJobRolesForCompany);
router.get('/options/employment-types', getEmploymentTypes);
router.get('/options/departments', getDepartmentsForCompany);
router.get('/:id/schedule', getInspectorScheduleConflicts);
router.get('/:id', getEmployee);
router.put('/:id', updateEmployee);
router.patch('/:id/deactivate', deactivateEmployee);
router.post('/:id/create-login', async (req, res) => {
  try {
    const companyId =
      req.tenant?.company_id ??
      (req.query.companyId != null ? Number(req.query.companyId) : null);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Missing company context' });
    }
    const id = Number(req.params.id);
    const { password } = req.body ?? {};
    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }
    const out = await employeeService.createEmployeeAccount(companyId, id, password);
    return res.status(200).json({ success: true, data: out });
  } catch (err) {
    console.error('Create employee login error:', err);
    return res.status(500).json({ success: false, message: err.message ?? 'Failed to create login' });
  }
});
export default router;