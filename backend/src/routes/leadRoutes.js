// src/routes/leadsRoutes.js
import { Router } from 'express';
import { createLead,listLeads,updateLeadStage } from '../controllers/leadController.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, tenantContext);

// POST /api/leads
router.post('/', createLead);
router.get('/', listLeads);

router.patch('/:id/stage', updateLeadStage);

export default router;