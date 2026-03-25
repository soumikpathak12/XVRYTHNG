import {
  getFullWorkflow,
  getPublicWorkflow,
  saveWorkflowPipeline,
} from '../services/companyWorkflowService.js';
import { requireCompanyAdminOrManager } from './companyModuleSettingsController.js';

export async function getCompanyWorkflowPublic(req, res) {
  try {
    const companyId = req.tenantId ?? req.user?.companyId ?? null;
    if (companyId == null) {
      const full = await getFullWorkflow(null);
      return res.json({
        success: true,
        data: {
          sales: { stages: full.sales.stages.filter((s) => s.enabled !== false).map((s) => ({ key: s.key, label: s.label })) },
          project_management: {
            stages: full.project_management.stages
              .filter((s) => s.enabled !== false)
              .map((s) => ({ key: s.key, label: s.label })),
          },
        },
      });
    }
    const data = await getPublicWorkflow(companyId);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('getCompanyWorkflowPublic', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getCompanyWorkflowSettings(req, res) {
  try {
    const data = await getFullWorkflow(req.user.companyId);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('getCompanyWorkflowSettings', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function patchCompanyWorkflowSettings(req, res) {
  try {
    const { pipeline, stages } = req.body ?? {};
    const full = await saveWorkflowPipeline(req.user.companyId, pipeline, stages);
    return res.json({ success: true, data: full });
  } catch (err) {
    console.error('patchCompanyWorkflowSettings', err);
    const msg = err?.message || 'Failed to save workflow';
    const status = /required|Invalid|At least/i.test(msg) ? 422 : 500;
    return res.status(status).json({ success: false, message: msg });
  }
}
