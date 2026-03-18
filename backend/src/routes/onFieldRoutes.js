import { Router } from 'express';
import { getCalendar } from '../controllers/onFieldController.js';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';

const router = Router();
router.use(requireAuth, tenantContext);

router.get('/calendar', getCalendar);

export default router;
