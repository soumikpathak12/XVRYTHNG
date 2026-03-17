/**
 * Internal messaging API. Tenant-scoped (company).
 * Company users: tenant from JWT. Super admin: send X-Tenant-Id or ?companyId=.
 * Controllers return 400 "Company context required" when no tenant.
 */
import { Router } from 'express';
import fileUpload from 'express-fileupload';
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
  uploadAttachment,
  getConversationAttachments
} from '../controllers/chatController.js';

const router = Router();

router.use(requireAuth, tenantContext);

router.use(
  fileUpload({
    createParentPath: true,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for chat attachments
    abortOnLimit: true,
  })
);

// Specific routes must come before parameterized routes
router.get('/company-users', listCompanyUsers);
router.get('/platform-users', listPlatformUsers);
router.get('/', listConversations);
router.post('/', createConversation);
// Parameterized routes last
router.get('/:id', getConversation);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendMessage);
router.post('/:id/upload', uploadAttachment);
router.get('/:id/attachments', getConversationAttachments);
router.patch('/:id/read', markConversationRead);
router.post('/:id/participants', addGroupParticipants);
router.delete('/:id/participants/:userId', removeGroupParticipant);

export default router;
