import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { listSalesActivity } from '../controllers/activityController.js';

const router = Router();

router.use(requireAuth, tenantContext);

router.get('/sales/activity', listSalesActivity);

export default router;

