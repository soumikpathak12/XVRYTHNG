// src/routes/adminRoutes.js
import { Router } from 'express';
import fileUpload from 'express-fileupload';
import { requireAuth, requireSuperAdmin, getAdminProfile, updateAdminProfile,createUser } from '../controllers/adminController.js';
import { getCompanyTypes, registerCompany, listCompanies } from '../controllers/companyController.js';
import { tenantContext } from '../middleware/tenantContext.js';


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

// GET current admin profile
router.get('/me', getAdminProfile);

// Update current admin profile (multipart)
router.post('/me', updateAdminProfile);

// Company types with modules (for onboarding wizard; any authenticated admin)
router.get('/company-types', getCompanyTypes);

// Multi-tenant company management (super_admin only)
router.get('/companies', requireSuperAdmin, listCompanies);
router.post('/companies', requireSuperAdmin, registerCompany);

router.post('/users', requireSuperAdmin, createUser);

export default router;