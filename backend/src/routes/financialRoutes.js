import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { profitLossAdjustments } from '../controllers/financialController.js';

const router = Router();

router.use(requireAuth, tenantContext);

router.get('/profit-loss-adjustments', profitLossAdjustments);

export default router;
