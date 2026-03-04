// src/routes/trialUserRoutes.js
import { Router } from 'express';
import {
  listTrialUsers,
  getTrialUsersCount,
  getTrialUserById,
  createTrialUser,
  updateTrialUser,
  deleteTrialUser,
  sendTrialLinks
} from '../controllers/trialUserController.js';

import { tenantContext } from '../middleware/tenantContext.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Protect routes similar to your lead module
router.use(requireAuth, tenantContext);

router.get('/', listTrialUsers);             // GET /api/trial-users
router.get('/count', getTrialUsersCount);    // GET /api/trial-users/count
router.get('/:id', getTrialUserById);        // GET /api/trial-users/:id
router.post('/', createTrialUser);           // POST /api/trial-users
router.patch('/:id', updateTrialUser);       // PATCH /api/trial-users/:id
router.delete('/:id', deleteTrialUser);      // DELETE /api/trial-users/:id

router.post('/send-trial-links', sendTrialLinks);

export default router;