import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { listApprovals, getPendingCount, decideApproval } from '../controllers/approvalsController.js';

const router = Router();

router.use(requireAuth, tenantContext);

// Company context comes from tenantContext middleware (JWT companyId or X-Tenant-Id).
router.get('/count', getPendingCount);
router.get('/', listApprovals);
router.patch('/:type/:id/decision', decideApproval);

export default router;
