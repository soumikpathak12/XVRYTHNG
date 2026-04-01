// src/routes/adminRoutes.js
import { Router } from 'express';
import fileUpload from 'express-fileupload';
import db from '../config/db.js';
import {
  requireAuth,
  requireSuperAdmin,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,createUser
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
  markCompanyCompensationPaid,
  escalateCompensation,
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
router.post('/support-tickets/:id/company-compensation-paid', requirePermission('support', 'edit'), markCompanyCompensationPaid);
router.post('/support-tickets/:id/escalate-compensation', requirePermission('support', 'edit'), escalateCompensation);

router.post('/users', requireSuperAdmin, createUser);

// List all site inspections with optional status filter
router.get('/site-inspections', requireSuperAdmin, async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = `
      SELECT 
        si.id,
        si.lead_id,
        si.status,
        si.inspected_at,
        si.inspector_name,
        si.roof_type,
        si.roof_pitch_deg,
        si.additional_notes,
        si.created_at,
        si.updated_at,
        l.customer_name,
        l.email,
        l.phone,
        l.suburb,
        l.stage as lead_stage,
        l.site_inspection_date,
        l.system_size_kw
      FROM lead_site_inspections si
      INNER JOIN leads l ON si.lead_id = l.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by status if provided
    if (status && ['draft', 'submitted'].includes(status)) {
      query += ' AND si.status = ?';
      params.push(status);
    }

    // Filter by customer name or suburb if search provided
    if (search) {
      query += ' AND (l.customer_name LIKE ? OR l.suburb LIKE ? OR l.email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY si.updated_at DESC LIMIT 1000';

    const [rows] = await db.execute(query, params);
    res.json({ success: true, data: rows || [] });
  } catch (e) {
    console.error('[ADMIN-SITE-INSPECTIONS] GET error:', e);
    res.status(500).json({ success: false, message: 'Failed to load site inspections' });
  }
});

export default router;