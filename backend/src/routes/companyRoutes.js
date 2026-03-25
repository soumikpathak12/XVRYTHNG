// src/routes/companyRoutes.js
import { Router } from 'express';
import { requireAuth } from '../controllers/adminController.js'; // tái dùng guard JWT của bạn
import { getCompanyProfile, updateCompanyProfile } from '../controllers/adminCompanyController.js';
import { getSidebarForUser } from '../services/sidebarService.js';
import {
  getCompanyModuleSettings,
  patchCompanyModuleSettings,
  requireCompanyAdminOrManager,
} from '../controllers/companyModuleSettingsController.js';
import {
  getCompanyWorkflowPublic,
  getCompanyWorkflowSettings,
  patchCompanyWorkflowSettings,
} from '../controllers/companyWorkflowController.js';

const router = Router();

router.use(requireAuth);

router.get('/me', getCompanyProfile);
router.post('/me', updateCompanyProfile);

router.get('/module-settings', requireCompanyAdminOrManager, getCompanyModuleSettings);
router.patch('/module-settings', requireCompanyAdminOrManager, patchCompanyModuleSettings);

router.get('/workflow', getCompanyWorkflowPublic);
router.get('/workflow-settings', requireCompanyAdminOrManager, getCompanyWorkflowSettings);
router.patch('/workflow-settings', requireCompanyAdminOrManager, patchCompanyWorkflowSettings);

router.get('/sidebar', async (req, res, next) => {
  try {
    const data = await getSidebarForUser(req.user.id, req.user.companyId ?? null);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;