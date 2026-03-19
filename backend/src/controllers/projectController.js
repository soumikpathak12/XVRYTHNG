import * as projectService from '../services/projectService.js';

export async function listProjects(req, res) {
  try {
    const filters = {
      stage: req.query.stage ?? undefined,
      search: req.query.search ?? undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    };
    const rows = await projectService.getProjects(filters);
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    const status = err.statusCode ?? err.status ?? 500;
    return res.status(status).json({ success: false, message: err.message ?? 'Failed to load projects.' });
  }
}

export async function getProject(req, res) {
  try {
    const projectId = req.params.id;
    const project = await projectService.getProjectById(projectId);
    return res.status(200).json({ success: true, data: project });
  } catch (err) {
    const status = err.statusCode ?? err.status ?? 500;
    return res.status(status).json({ success: false, message: err.message ?? 'Failed to load project.' });
  }
}

export async function updateProjectStage(req, res) {
  try {
    const projectId = req.params.id;
    const { stage } = req.body ?? {};
    if (!stage) {
      return res.status(422).json({ success: false, errors: { stage: 'Stage is required.' } });
    }
    const updated = await projectService.updateProjectStage(projectId, stage);
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    const status = err.statusCode ?? err.status ?? 500;
    return res.status(status).json({ success: false, message: err.message ?? 'Failed to update project stage.' });
  }
}

export async function updateProject(req, res) {
  try {
    const projectId = req.params.id;
    const body = req.body ?? {};
    
    // currently we only allow a subset of fields in service
    const allowedUpdates = {};
    if ('expected_completion_date' in body) {
      allowedUpdates.expected_completion_date = body.expected_completion_date;
    }
    if ('stage' in body) {
      allowedUpdates.stage = body.stage;
    }
     if ('post_install_reference_no' in body) {
       allowedUpdates.post_install_reference_no = body.post_install_reference_no;
     }

    const updated = await projectService.updateProject(projectId, allowedUpdates);
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    const status = err.statusCode ?? err.status ?? 500;
    return res.status(status).json({ success: false, message: err.message ?? 'Failed to update project.' });
  }
}


export async function getProjectInspection(req, res) {
  try {
    const projectId = req.params.id;
    const leadIdOverride = req.query.leadId ? Number(req.query.leadId) : undefined;
    const result = await projectService.getLatestInspectionForProject(projectId, { leadIdOverride });
    return res.status(200).json({ success: true, ...result }); // { success, data, meta }
  } catch (err) {
    const status = err.statusCode ?? err.status ?? 500;
    return res.status(status).json({ success: false, message: err.message ?? 'Failed to load site inspection.' });
  }
}


export async function patchProjectScheduleAssign(req, res) {
  try {
    const companyId = req.tenant.company_id;
    const projectId = Number(req.params.id);
    const userId = req.user.id;

    const out = await projectService.saveScheduleAndAssignees(
      companyId,
      projectId,
      req.body,
      userId
    );

    return res.status(200).json({ success: true, data: out });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}



function resolveCompanyId(req) {
  const fromTenant = req.tenant?.company_id ?? req.tenant?.companyId ?? req.tenantId ?? null;
  const fromQuery  = req.query.companyId != null ? Number(req.query.companyId) : null;
  const fromHeader = req.headers['x-company-id']
    ? Number(req.headers['x-company-id'])
    : (req.headers['x-tenant-id'] ? Number(req.headers['x-tenant-id']) : null);
  return Number(fromTenant ?? fromQuery ?? fromHeader ?? 0) || null;
}

export async function getProjectScheduleAssign(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Missing company context' });
    }
    const projectId = Number(req.params.id);

    const out = await projectService.getScheduleAndAssignees(companyId, projectId);
    return res.status(200).json({ success: true, data: out });
  } catch (err) {
    const status = err.statusCode ?? err.status ?? 500;
    return res.status(status).json({
      success: false,
      message: err.message ?? 'Failed to load project schedule',
    });
  }
}