/**
 * Internal messaging API. Tenant-scoped (company).
 * Company users: tenant from JWT. Super admin: send X-Tenant-Id or ?companyId=.
 * Controllers return 400 "Company context required" when no tenant.
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import {
  listCompanyUsers,
  listPlatformUsers,
  listConversations,
  createConversation,
  getConversation,
  getMessages,
  sendMessage,
  markConversationRead,
  addGroupParticipants,
  removeGroupParticipant,
} from '../controllers/chatController.js';

const router = Router();

router.use(requireAuth, tenantContext);

// Specific routes must come before parameterized routes
router.get('/company-users', listCompanyUsers);
router.get('/platform-users', listPlatformUsers);
router.get('/', listConversations);
router.post('/', createConversation);
// Parameterized routes last
router.get('/:id', getConversation);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendMessage);
router.patch('/:id/read', markConversationRead);
router.post('/:id/participants', addGroupParticipants);
router.delete('/:id/participants/:userId', removeGroupParticipant);

export default router;
