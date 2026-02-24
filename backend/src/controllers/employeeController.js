// src/controllers/employeeController.js
import * as employeeService from '../services/employeeService.js';

function resolveCompanyId(req) {
  const fromTenant = req.tenantId != null ? Number(req.tenantId) : null;
  const fromQuery =
    req.query.companyId != null ? Number(req.query.companyId) : null;
  const fromHeader =
    req.headers['x-tenant-id']
      ? Number(req.headers['x-tenant-id'])
      : req.headers['x-company-id']
      ? Number(req.headers['x-company-id'])
      : null;

  return fromTenant ?? fromQuery ?? fromHeader ?? null;
}

export async function createEmployee(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing company context' });
    }
    const emp = await employeeService.createEmployee(companyId, req.body ?? {});
    return res.status(201).json({ success: true, data: emp });
  } catch (err) {
    console.error('Create employee error:', err);
    return res
      .status(err.statusCode ?? 500)
      .json({ success: false, message: err.message ?? 'Failed to create employee' });
  }
}

export async function listEmployees(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(200).json({ success: true, data: [] });
    }

    const filters = {
      department_id: req.query.department_id ? Number(req.query.department_id) : undefined,
      job_role_id: req.query.job_role_id ? Number(req.query.job_role_id) : undefined,
      status: req.query.status ?? undefined,
      q: req.query.q ?? undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    };

    const rows = await employeeService.listEmployees(companyId, filters);
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('List employees error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load employees' });
  }
}

export async function getEmployee(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing company context' });
    }

    const id = Number(req.params.id);
    const data = await employeeService.getEmployee(companyId, id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Get employee error:', err);
    return res
      .status(err.statusCode ?? 500)
      .json({ success: false, message: err.message ?? 'Failed to load employee' });
  }
}

export async function updateEmployee(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing company context' });
    }

    const id = Number(req.params.id);
    const data = await employeeService.updateEmployee(companyId, id, req.body ?? {});
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Update employee error:', err);
    return res
      .status(err.statusCode ?? 500)
      .json({ success: false, message: err.message ?? 'Failed to update employee' });
  }
}

export async function deactivateEmployee(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing company context' });
    }

    const id = Number(req.params.id);
    const data = await employeeService.deactivateEmployee(companyId, id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Deactivate employee error:', err);
    return res
      .status(err.statusCode ?? 500)
      .json({ success: false, message: err.message ?? 'Failed to deactivate employee' });
  }
}

export async function getRoleModulesPreview(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing company context' });
    }

    const jobRoleId = Number(req.params.job_role_id);
    const rows = await employeeService.getRoleModulesPreview(companyId, jobRoleId);
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('Preview modules error:', err);
    return res.status(500).json({ success: false, message: 'Failed to get preview' });
  }
}

export async function getJobRolesForCompany(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    console.log('[EMP CTRL] job-roles companyId =', companyId, ' tenantId =', req.tenantId);

    if (!companyId) {
      return res.status(200).json({ success: true, data: [] });
    }
    const rows = await employeeService.getJobRolesForCompany(companyId);
    console.log('[EMP CTRL] job-roles rows =', rows?.length);
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('Get job roles error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load job roles' });
  }
}


export async function getEmploymentTypes(req, res) {
  try {
    const rows = await employeeService.getEmploymentTypes();
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('Get employment types error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load employment types' });
  }
}
``