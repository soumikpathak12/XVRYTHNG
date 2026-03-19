// src/controllers/installationController.js
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as svc from '../services/installationService.js';
import { getEmployeeIdByUserId } from '../services/attendanceService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

function resolveCompanyId(req) {
  return (
    req.tenant?.company_id ??
    req.tenantId ??
    (req.query.companyId != null ? Number(req.query.companyId) : null) ??
    (req.headers['x-tenant-id'] ? Number(req.headers['x-tenant-id']) : null) ??
    req.user?.companyId ??
    null
  );
}

function companyOrFail(req, res) {
  const id = resolveCompanyId(req);
  if (!id) { res.status(400).json({ success: false, message: 'Missing company context' }); return null; }
  return id;
}

// GET /api/installation-jobs
export async function listJobs(req, res) {
  try {
    const companyId = companyOrFail(req, res);
    if (!companyId) return;
    const role = String(req.user?.role || '').toLowerCase();
    const employeeId = role === 'field_agent'
      ? await getEmployeeIdByUserId(companyId, req.user.id).catch(() => null)
      : null;
    const rows = await svc.listJobs(companyId, {
      status:     req.query.status,
      date:       req.query.date,
      search:     req.query.search,
      project_id: req.query.project_id ? Number(req.query.project_id) : undefined,
      employee_id: employeeId || undefined,
      limit:      req.query.limit  ? Number(req.query.limit)  : 50,
      offset:     req.query.offset ? Number(req.query.offset) : 0,
    });
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(err.statusCode ?? 500).json({ success: false, message: err.message });
  }
}

// GET /api/installation-jobs/:id
export async function getJob(req, res) {
  try {
    const companyId = companyOrFail(req, res);
    if (!companyId) return;
    const job = await svc.getJob(companyId, req.params.id);
    return res.json({ success: true, data: job });
  } catch (err) {
    return res.status(err.statusCode ?? 500).json({ success: false, message: err.message });
  }
}

// POST /api/installation-jobs
export async function createJob(req, res) {
  try {
    const companyId = companyOrFail(req, res);
    if (!companyId) return;
    const job = await svc.createJob(companyId, req.body ?? {}, req.user.id);
    return res.status(201).json({ success: true, data: job });
  } catch (err) {
    return res.status(err.statusCode ?? 500).json({ success: false, message: err.message });
  }
}

// PUT /api/installation-jobs/:id
export async function updateJob(req, res) {
  try {
    const companyId = companyOrFail(req, res);
    if (!companyId) return;
    const job = await svc.updateJob(companyId, req.params.id, req.body ?? {}, req.user.id);
    return res.json({ success: true, data: job });
  } catch (err) {
    return res.status(err.statusCode ?? 500).json({ success: false, message: err.message });
  }
}

// PATCH /api/installation-jobs/:id/status
export async function updateStatus(req, res) {
  try {
    const companyId = companyOrFail(req, res);
    if (!companyId) return;
    const { status } = req.body ?? {};
    if (!status) return res.status(422).json({ success: false, message: 'status is required' });
    const job = await svc.updateStatus(companyId, req.params.id, status, req.user.id);
    return res.json({ success: true, data: job });
  } catch (err) {
    return res.status(err.statusCode ?? 500).json({ success: false, message: err.message });
  }
}

// ── Checklist item templates (T-236 company customisation) ───────────────────

// GET /api/installation-jobs/checklist-items
export async function listChecklistItems(req, res) {
  try {
    const companyId = companyOrFail(req, res);
    if (!companyId) return;
    const items = await svc.listChecklistItems(companyId);
    return res.json({ success: true, data: items });
  } catch (err) {
    return res.status(err.statusCode ?? 500).json({ success: false, message: err.message });
  }
}

// POST /api/installation-jobs/checklist-items
export async function createChecklistItem(req, res) {
  try {
    const companyId = companyOrFail(req, res);
    if (!companyId) return;
    const item = await svc.createChecklistItem(companyId, req.body ?? {});
    return res.status(201).json({ success: true, data: item });
  } catch (err) {
    return res.status(err.statusCode ?? 500).json({ success: false, message: err.message });
  }
}

// PUT /api/installation-jobs/checklist-items/:itemId
export async function updateChecklistItem(req, res) {
  try {
    const companyId = companyOrFail(req, res);
    if (!companyId) return;
    const item = await svc.updateChecklistItem(companyId, req.params.itemId, req.body ?? {});
    return res.json({ success: true, data: item });
  } catch (err) {
    return res.status(err.statusCode ?? 500).json({ success: false, message: err.message });
  }
}

// DELETE /api/installation-jobs/checklist-items/:itemId
export async function deleteChecklistItem(req, res) {
  try {
    const companyId = companyOrFail(req, res);
    if (!companyId) return;
    await svc.deleteChecklistItem(companyId, req.params.itemId);
    return res.json({ success: true });
  } catch (err) {
    return res.status(err.statusCode ?? 500).json({ success: false, message: err.message });
  }
}

// ── Per-job checklist responses ───────────────────────────────────────────────

// PATCH /api/installation-jobs/:id/checklist/:itemId
export async function upsertChecklist(req, res) {
  try {
    const companyId = companyOrFail(req, res);
    if (!companyId) return;
    const { checked, note } = req.body ?? {};
    const response = await svc.upsertChecklistResponse(
      companyId, req.params.id, req.params.itemId,
      { checked: !!checked, note },
      req.user.id
    );
    return res.json({ success: true, data: response });
  } catch (err) {
    return res.status(err.statusCode ?? 500).json({ success: false, message: err.message });
  }
}

// POST /api/installation-jobs/:id/signoff
export async function createSignoff(req, res) {
  try {
    const companyId = companyOrFail(req, res);
    if (!companyId) return;
    const { customer_name, signature_url, notes } = req.body ?? {};
    if (!customer_name) return res.status(422).json({ success: false, message: 'customer_name is required' });
    const ip = req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? null;
    const job = await svc.createSignoff(companyId, req.params.id, { customer_name, signature_url, notes }, ip);
    return res.json({ success: true, data: job });
  } catch (err) {
    return res.status(err.statusCode ?? 500).json({ success: false, message: err.message });
  }
}

// POST /api/installation-jobs/:id/assignees
export async function addAssignee(req, res) {
  try {
    const companyId = companyOrFail(req, res);
    if (!companyId) return;
    const { employee_id } = req.body ?? {};
    if (!employee_id) return res.status(422).json({ success: false, message: 'employee_id is required' });
    const job = await svc.addAssignee(companyId, req.params.id, employee_id, req.user.id);
    return res.json({ success: true, data: job });
  } catch (err) {
    return res.status(err.statusCode ?? 500).json({ success: false, message: err.message });
  }
}

// DELETE /api/installation-jobs/:id/assignees/:employeeId
export async function removeAssignee(req, res) {
  try {
    const companyId = companyOrFail(req, res);
    if (!companyId) return;
    await svc.removeAssignee(companyId, req.params.id, req.params.employeeId);
    return res.json({ success: true });
  } catch (err) {
    return res.status(err.statusCode ?? 500).json({ success: false, message: err.message });
  }
}

// ── Photos (T-245/246/247/248) ────────────────────────────────────────────────

// POST /api/installation-jobs/:id/photos  (multipart/form-data)
export async function uploadPhoto(req, res) {
  try {
    const companyId = companyOrFail(req, res);
    if (!companyId) return;
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const { section = 'general', caption, lat, lng, taken_at, device_info } = req.body ?? {};
    const jobId   = req.params.id;

    // Build storage URL (served statically)
    const storageUrl = `/uploads/installation-jobs/${jobId}/${section}/${req.file.filename}`;

    const photo = await svc.addPhoto(companyId, jobId, {
      section,
      filename:     req.file.filename,
      storage_url:  storageUrl,
      mime_type:    req.file.mimetype,
      size_bytes:   req.file.size,
      caption,
      lat:          lat     ? parseFloat(lat)  : null,
      lng:          lng     ? parseFloat(lng)  : null,
      taken_at:     taken_at ?? null,
      device_info:  device_info ?? null,
    }, req.user?.id);

    return res.status(201).json({ success: true, data: photo });
  } catch (err) {
    return res.status(err.statusCode ?? 500).json({ success: false, message: err.message });
  }
}

// DELETE /api/installation-jobs/:id/photos/:photoId
export async function deletePhoto(req, res) {
  try {
    const companyId = companyOrFail(req, res);
    if (!companyId) return;
    const photo = await svc.deletePhoto(companyId, req.params.id, req.params.photoId);

    // Remove file from disk (non-fatal if missing)
    try {
      const diskPath = path.join(__dirname, '..', photo.storage_url);
      if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
    } catch (_) {}

    return res.json({ success: true });
  } catch (err) {
    return res.status(err.statusCode ?? 500).json({ success: false, message: err.message });
  }
}

// GET /api/installation-jobs/photo-requirements
export async function getPhotoRequirements(req, res) {
  try {
    const companyId = companyOrFail(req, res);
    if (!companyId) return;
    const reqs = await svc.getPhotoRequirements(companyId);
    return res.json({ success: true, data: reqs });
  } catch (err) {
    return res.status(err.statusCode ?? 500).json({ success: false, message: err.message });
  }
}

// PUT /api/installation-jobs/photo-requirements/:section
export async function upsertPhotoRequirements(req, res) {
  try {
    const companyId = companyOrFail(req, res);
    if (!companyId) return;
    const { section } = req.params;
    if (!['before', 'during', 'after'].includes(section)) {
      return res.status(422).json({ success: false, message: 'Invalid section' });
    }
    const reqs = await svc.upsertPhotoRequirements(companyId, section, req.body ?? {});
    return res.json({ success: true, data: reqs });
  } catch (err) {
    return res.status(err.statusCode ?? 500).json({ success: false, message: err.message });
  }
}
