// src/routes/employeeRoutes.js
import { Router } from 'express';
import { tenantContext } from '../middleware/tenantContext.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createEmployee,
  listEmployees,
  getEmployee,
  updateEmployee,
  deactivateEmployee,
  getRoleModulesPreview,
  getJobRolesForCompany,
  getEmploymentTypes,
} from '../controllers/employeeController.js';

const router = Router();
router.use(requireAuth, tenantContext);

router.use((req, res, next) => {
  console.log('[EMP ROUTER]', req.method, req.originalUrl);
  next();
});
router.post('/', createEmployee);
router.get('/', listEmployees);

router.get('/preview/role-modules/:job_role_id', getRoleModulesPreview);
router.get('/options/job-roles', getJobRolesForCompany);
router.get('/options/employment-types', getEmploymentTypes);

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