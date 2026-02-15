// src/routes/leadsRoutes.js
import { Router } from 'express';
import { createLead, listLeads, getLeadById, updateLead, updateLeadStage } from '../controllers/leadController.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, tenantContext);

router.post('/', createLead);
router.get('/', listLeads);
router.get('/:id', getLeadById);
router.put('/:id', updateLead);
router.patch('/:id/stage', updateLeadStage);

export default router;