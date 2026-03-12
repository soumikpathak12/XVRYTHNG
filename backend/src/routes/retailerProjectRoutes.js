// src/routes/retailerProjectRoutes.js
import { Router } from 'express';
import { tenantContext } from '../middleware/tenantContext.js';
import { requireAuth } from '../middleware/auth.js';
import {
  retailerList,
  retailerCreate,
  retailerUpdateStage,
  retailerGetSchedule,
  retailerPatchSchedule,retailerGetAssignees,retailerPatchAssignees
} from '../controllers/retailerProjectController.js';

const router = Router();

// Apply auth + multi-tenant context
router.use(requireAuth, tenantContext);

// List
router.get('/', retailerList);

// Create (project + schedule in one go)
router.post('/', retailerCreate);

// Update stage
router.patch('/:id/stage', retailerUpdateStage);
router.get('/:id/schedule', retailerGetSchedule);
router.patch('/:id/schedule', retailerPatchSchedule);

router.get('/:id/assignees', retailerGetAssignees);
router.patch('/:id/assignees', retailerPatchAssignees);

export default router;