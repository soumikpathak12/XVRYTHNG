import { Router } from 'express';
import { fetchLeads } from '../controllers/solarQuotesController.js';
import { requireAuth } from '../middleware/auth.js';
// import { tenantContext } from '../middleware/tenantContext.js'; // Not needed for global integration sync?

const router = Router();

router.use(requireAuth);

router.post('/fetch', fetchLeads);

export default router;
