import { Router } from 'express';
import { getCalendarLeads } from '../controllers/calendarController.js';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';

const router = Router();
router.use(requireAuth, tenantContext);

router.get('/leads', getCalendarLeads);

export default router;
