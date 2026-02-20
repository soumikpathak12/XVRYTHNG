// src/routes/leadRoutes.js
import { Router } from 'express';
import {
  createLead,
  importLeads,
  listLeads,
  getLeadById,
  updateLead,
  updateLeadStage,
  addLeadNote,
  listLeadNotes,
  sendCustomerCredentials,
  getCustomerPortalTestLink,
} from '../controllers/leadController.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, tenantContext);

router.post('/', createLead);
router.post('/import', importLeads);
router.get('/', listLeads);
router.get('/customer-portal-test-link', getCustomerPortalTestLink); // ?leadId=69
router.post('/customer-portal-test-link', getCustomerPortalTestLink); // body: { leadId: 69 }
router.get('/:id/customer-portal-test-link', getCustomerPortalTestLink);
router.get('/:id/notes', listLeadNotes);
router.post('/:id/notes', addLeadNote);
router.post('/:id/send-customer-credentials', sendCustomerCredentials);
router.get('/:id', getLeadById);
router.put('/:id', updateLead);
router.patch('/:id/stage', updateLeadStage);

export default router;
