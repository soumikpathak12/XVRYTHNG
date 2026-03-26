import { Router } from 'express';
import { getProjectInspection, listProjects, getProject, updateProject, updateProjectStage, patchProjectScheduleAssign,getProjectScheduleAssign, getProjectByLeadId } from '../controllers/projectController.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, tenantContext);

router.get('/', listProjects);
// Must be declared before '/:id' route.
router.get('/by-lead/:leadId', getProjectByLeadId);
router.get('/:id', getProject);
router.put('/:id', updateProject);
router.patch('/:id/stage', updateProjectStage);

router.get('/:id/inspection', getProjectInspection);

router.get('/:id/schedule-assign', getProjectScheduleAssign);

router.patch('/:id/schedule-assign', patchProjectScheduleAssign);
export default router;