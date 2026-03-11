import { Router } from 'express';
import { getProjectInspection, listProjects, updateProjectStage, patchProjectScheduleAssign,getProjectScheduleAssign } from '../controllers/projectController.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, tenantContext);

router.get('/', listProjects);
router.patch('/:id/stage', updateProjectStage);

router.get('/:id/inspection', getProjectInspection);

router.get('/:id/schedule-assign', getProjectScheduleAssign);

router.patch('/:id/schedule-assign', patchProjectScheduleAssign);
export default router;