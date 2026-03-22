// src/controllers/retailerProjectController.js
// Controller for retailer projects: list, create (with schedule), update stage,
// get/update schedule. Resolves company_id from tenant context/headers.

import {
  createRetailerProject,
  listRetailerProjects,
  updateRetailerProjectStage,
  updateRetailerProject,
  getRetailerProjectSchedule,
  saveRetailerProjectSchedule,getRetailerProjectAssignees,saveRetailerProjectAssignees,
  getRetailerProjectById
} from '../services/retailerProjectService.js';
import * as expenseService from '../services/expenseService.js';

function resolveCompanyId(req) {
  // Same pattern as your existing controllers
  const fromTenant = req.tenant?.company_id ?? req.tenant?.companyId ?? req.tenantId ?? null;
  const fromQuery = req.query.companyId != null ? Number(req.query.companyId) : null;
  const fromHeader = req.headers['x-company-id']
    ? Number(req.headers['x-company-id'])
    : (req.headers['x-tenant-id'] ? Number(req.headers['x-tenant-id']) : null);
  return Number(fromTenant ?? fromQuery ?? fromHeader ?? 0) || null;
}

export async function retailerList(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });

    const filters = {
      stage: req.query.stage ?? undefined,
      job_type: req.query.job_type ?? undefined,
      search: req.query.search ?? undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    };
    const rows = await listRetailerProjects(companyId, filters);
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    const status = err.statusCode ?? err.status ?? 500;
    return res.status(status).json({ success: false, message: err.message ?? 'Failed to load retailer projects.' });
  }
}

export async function retailerGetById(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });

    const projectId = Number(req.params.id);
    const project = await getRetailerProjectById(companyId, projectId);
    const approvedExpenseTotal = await expenseService.approvedExpenseTotalForRetailerProject(
      companyId,
      projectId
    );
    return res.status(200).json({
      success: true,
      project: { ...project, approved_expense_total: approvedExpenseTotal },
    });
  } catch (err) {
    const status = err.statusCode ?? err.status ?? 500;
    return res.status(status).json({ success: false, message: err.message ?? 'Failed to load project.' });
  }
}

export async function retailerCreate(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });

    // Pass req.user.id so schedule audit fields (created_by/updated_by) are set
    const result = await createRetailerProject(companyId, req.body ?? {}, req.user?.id ?? null);

    // Shape response similar to other endpoints
    return res.status(201).json({ success: true, data: result.project, schedule: result.schedule });
  } catch (err) {
    const status = err.statusCode ?? err.status ?? 500;
    return res.status(status).json({ success: false, message: err.message ?? 'Failed to create retailer project.' });
  }
}

export async function retailerUpdate(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });

    const projectId = Number(req.params.id);
    const updated = await updateRetailerProject(companyId, projectId, req.body ?? {});
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    const status = err.statusCode ?? err.status ?? 500;
    return res.status(status).json({ success: false, message: err.message ?? 'Failed to update retailer project.' });
  }
}

export async function retailerUpdateStage(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });

    const projectId = Number(req.params.id);
    const { stage } = req.body ?? {};
    if (!stage) return res.status(422).json({ success: false, errors: { stage: 'Stage is required.' } });

    const updated = await updateRetailerProjectStage(companyId, projectId, stage);
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    const status = err.statusCode ?? err.status ?? 500;
    return res.status(status).json({ success: false, message: err.message ?? 'Failed to update stage.' });
  }
}

export async function retailerGetSchedule(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });

    const projectId = Number(req.params.id);
    const schedule = await getRetailerProjectSchedule(companyId, projectId);
    return res.status(200).json({ success: true, data: schedule });
  } catch (err) {
    const status = err.statusCode ?? err.status ?? 500;
    return res.status(status).json({ success: false, message: err.message ?? 'Failed to load retailer project schedule.' });
  }
}

export async function retailerPatchSchedule(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });

    const projectId = Number(req.params.id);
    const out = await saveRetailerProjectSchedule(companyId, projectId, req.body ?? {}, req.user?.id ?? null);
    return res.status(200).json({ success: true, data: out });
  } catch (err) {
    const status = err.statusCode ?? err.status ?? 500;
    return res.status(status).json({ success: false, message: err.message ?? 'Failed to save retailer project schedule.' });
  }
}

export async function retailerGetAssignees(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });

    const projectId = Number(req.params.id);
    const ids = await getRetailerProjectAssignees(companyId, projectId);
    return res.status(200).json({ success: true, data: { assignees: ids } });
  } catch (err) {
    const status = err.statusCode ?? err.status ?? 500;
    return res.status(status).json({ success: false, message: err.message ?? 'Failed to load assignees.' });
  }
}

export async function retailerPatchAssignees(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });

    const projectId = Number(req.params.id);
    const ids = Array.isArray(req.body?.assignees) ? req.body.assignees : [];
    const saved = await saveRetailerProjectAssignees(companyId, projectId, ids, req.user?.id ?? null);
    return res.status(200).json({ success: true, data: { assignees: saved } });
  } catch (err) {
    const status = err.statusCode ?? err.status ?? 500;
    return res.status(status).json({ success: false, message: err.message ?? 'Failed to save assignees.' });
  }
}
