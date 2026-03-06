// src/routes/adminRoutes.js
import { Router } from 'express';
import fileUpload from 'express-fileupload';
import {
  requireAuth,
  requireSuperAdmin,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
} from '../controllers/adminController.js';
import {
  getCompanyTypes,
  registerCompany,
  listCompanies,
  updateCompany,
  deleteCompany,
  getCompany
} from '../controllers/companyController.js';
import {
  // RBAC
  listRoles,
  listPermissions,
  getRolePermissions,
  createCustomRole,
  setCustomRolePermissions,
  // NEW: Job Roles (Modules)
  listJobRoles,
  getJobRoleModules,
  setJobRoleModules,
  listModulesForCompany,
} from '../controllers/rolesController.js';
import {
  listTickets,
  getTicket,
  addReply,
  updateStatus,
} from '../controllers/adminSupportTicketController.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requirePermission } from '../middleware/requirePermission.js';

const router = Router();

router.use(
  fileUpload({
    createParentPath: false,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    abortOnLimit: true,
  })
);

// Tenant context for query filtering (sets req.tenantId)
router.use(requireAuth, tenantContext);

router.get('/me', getAdminProfile);
router.post('/me', updateAdminProfile);
router.post('/change-password', requireAuth, changeAdminPassword);

router.get('/company-types', getCompanyTypes);

router.get('/companies', requireSuperAdmin, listCompanies);
router.post('/companies', requireSuperAdmin, registerCompany);
router.get('/companies/:id', requireSuperAdmin, getCompany);
router.put('/companies/:id', requireSuperAdmin, updateCompany);
router.delete('/companies/:id', requireSuperAdmin, deleteCompany);

router.get('/roles', listRoles);
router.get('/permissions', listPermissions);
router.get('/roles/:id/permissions', getRolePermissions);
router.post('/roles', createCustomRole);
router.put('/roles/custom/:id/permissions', setCustomRolePermissions);

router.get('/job-roles', listJobRoles);
router.get('/job-roles/:id/modules', getJobRoleModules);
router.put('/job-roles/:id/modules', setJobRoleModules);
router.get('/modules', listModulesForCompany);

// Support tickets (admin)
router.get('/support-tickets', requirePermission('support', 'view'), listTickets);
router.get('/support-tickets/:id', requirePermission('support', 'view'), getTicket);
router.post('/support-tickets/:id/replies', requirePermission('support', 'edit'), addReply);
router.patch('/support-tickets/:id/status', requirePermission('support', 'edit'), updateStatus);

export default router;