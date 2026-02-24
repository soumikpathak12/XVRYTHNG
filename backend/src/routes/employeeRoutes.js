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

export default router;