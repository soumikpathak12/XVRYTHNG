// src/services/installationService.js
import db from '../config/db.js';

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────
function notFound(msg = 'Installation job not found') {
  const e = new Error(msg); e.statusCode = 404; return e;
}

const ALLOWED_PHOTO_SECTIONS = new Set(['before', 'during', 'after', 'general']);

function normalizePhotoSection(rawSection) {
  const value = String(rawSection ?? 'general').trim().toLowerCase();
  if (value === 'signoff') return 'general';
  return ALLOWED_PHOTO_SECTIONS.has(value) ? value : 'general';
}

// Map installation status → project stage (T-233 sync)
const STATUS_TO_PROJECT_STAGE = {
  in_progress: 'installation_in_progress',
  completed:   'installation_completed',
};

/**
 * Compute total elapsed seconds from all time record pairs.
 * Pairs: start/resume → pause/end/now
 */
function computeElapsed(records) {
  let total = 0;
  let openAt = null;

  for (const r of records) {
    const ts = new Date(r.recorded_at).getTime();
    if (r.event === 'start' || r.event === 'resume') {
      openAt = ts;
    } else if (r.event === 'pause' || r.event === 'end') {
      if (openAt !== null) { total += (ts - openAt) / 1000; openAt = null; }
    }
  }
  // if still running (no closing event) count up to now
  if (openAt !== null) total += (Date.now() - openAt) / 1000;

  return Math.round(total);
}

// ─────────────────────────────────────────────────────────────────────────────
// List jobs
// ─────────────────────────────────────────────────────────────────────────────
export async function listJobs(companyId, { status, date, search, project_id, employee_id, limit = 50, offset = 0 } = {}) {
  const where = ['ij.company_id = ?'];
  const params = [companyId];

  if (status)     { where.push('ij.status = ?');      params.push(status); }
  if (date)       { where.push('ij.scheduled_date = ?'); params.push(date); }
  if (project_id) { where.push('(ij.project_id = ? OR ij.retailer_project_id = ?)'); params.push(Number(project_id), Number(project_id)); }
  if (search) {
    where.push('(ij.customer_name LIKE ? OR ij.address LIKE ? OR ij.suburb LIKE ?)');
    const q = `%${search}%`;
    params.push(q, q, q);
  }

  // Employee portal: only show jobs assigned to this employee.
  // Assignment can come from:
  // - installation_job_assignees (direct)
  // - project_assignees (via ij.project_id)
  // - retailer_project_assignees (via ij.retailer_project_id)
  if (employee_id) {
    const employeeId = Number(employee_id);
    if (Number.isFinite(employeeId) && employeeId > 0) {
      where.push(
        `(
          EXISTS (
            SELECT 1 FROM installation_job_assignees ija2
            WHERE ija2.job_id = ij.id AND ija2.company_id = ij.company_id AND ija2.employee_id = ?
          )
          OR (
            ij.project_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM project_assignees pa
              WHERE pa.project_id = ij.project_id AND pa.company_id = ij.company_id AND pa.employee_id = ?
            )
          )
          OR (
            ij.retailer_project_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM retailer_project_assignees rpa
              WHERE rpa.project_id = ij.retailer_project_id AND rpa.company_id = ij.company_id AND rpa.employee_id = ?
            )
          )
        )`
      );
      params.push(employeeId, employeeId, employeeId);
    }
  }

  const [rows] = await db.execute(
    `SELECT
       ij.id, ij.company_id,
       ij.project_id, ij.retailer_project_id,
       ij.status,
       ij.customer_name, ij.customer_phone, ij.customer_email,
       ij.address, ij.suburb,
       ij.system_size_kw, ij.system_type, ij.panel_count, ij.inverter_model, ij.battery_included,
       ij.scheduled_date, ij.scheduled_time, ij.estimated_hours,
       ij.started_at, ij.paused_at, ij.completed_at, ij.total_elapsed_seconds,
       ij.notes, ij.created_at, ij.updated_at,
       COUNT(DISTINCT ija.employee_id) AS team_count,
       GROUP_CONCAT(DISTINCT e.first_name ORDER BY e.first_name SEPARATOR ', ') AS team_names
     FROM installation_jobs ij
     LEFT JOIN installation_job_assignees ija ON ija.job_id = ij.id
     LEFT JOIN employees e ON e.id = ija.employee_id
     WHERE ${where.join(' AND ')}
     GROUP BY ij.id
     ORDER BY ij.scheduled_date ASC, ij.scheduled_time ASC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Get single job (full detail)
// ─────────────────────────────────────────────────────────────────────────────
export async function getJob(companyId, jobId) {
  const [[job]] = await db.execute(
    `SELECT ij.* FROM installation_jobs ij
     WHERE ij.id = ? AND ij.company_id = ? LIMIT 1`,
    [Number(jobId), Number(companyId)]
  );
  if (!job) throw notFound();

  const [assignees] = await db.execute(
    `SELECT e.id, e.first_name, e.last_name, e.email, e.phone, e.avatar_url,
            jr.name AS job_role_name, ija.role AS install_role
     FROM installation_job_assignees ija
     JOIN employees e ON e.id = ija.employee_id
     LEFT JOIN job_roles jr ON jr.id = e.job_role_id
     WHERE ija.job_id = ?
     ORDER BY e.first_name`,
    [Number(jobId)]
  );

  const [checklist] = await db.execute(
    `SELECT
       ici.id AS item_id, ici.section, ici.label, ici.sort_order, ici.is_required,
       COALESCE(icr.checked, 0) AS checked,
       icr.note, icr.checked_at, icr.checked_by
     FROM installation_checklist_items ici
     LEFT JOIN installation_checklist_responses icr
       ON icr.item_id = ici.id AND icr.job_id = ?
     WHERE ici.company_id IS NULL OR ici.company_id = ?
     ORDER BY ici.section, ici.sort_order`,
    [Number(jobId), Number(companyId)]
  );

  const [photos] = await db.execute(
    `SELECT id, section, storage_url, filename, mime_type, size_bytes, caption, created_at
     FROM installation_photos WHERE job_id = ? ORDER BY created_at ASC`,
    [Number(jobId)]
  );

  const [[signoff]] = await db.execute(
    `SELECT id, customer_name, signature_url, signed_at, notes
     FROM installation_signoffs WHERE job_id = ? LIMIT 1`,
    [Number(jobId)]
  );

  // time records (for client-side timer reconstruction)
  const [timeRecords] = await db.execute(
    `SELECT id, event, recorded_at, recorded_by, note
     FROM installation_time_records
     WHERE job_id = ? ORDER BY recorded_at ASC`,
    [Number(jobId)]
  );

  return { ...job, assignees, checklist, photos, signoff: signoff ?? null, timeRecords };
}

// ─────────────────────────────────────────────────────────────────────────────
// Create job
// ─────────────────────────────────────────────────────────────────────────────
export async function createJob(companyId, body, createdBy) {
  const {
    project_id = null, retailer_project_id = null,
    customer_name = '', customer_phone = null, customer_email = null,
    address = null, suburb = null,
    system_size_kw = null, system_type = null, panel_count = null,
    inverter_model = null, battery_included = 0,
    scheduled_date = null, scheduled_time = null, estimated_hours = null,
    notes = null,
  } = body;

  const [result] = await db.execute(
    `INSERT INTO installation_jobs
       (company_id, project_id, retailer_project_id,
        customer_name, customer_phone, customer_email, address, suburb,
        system_size_kw, system_type, panel_count, inverter_model, battery_included,
        scheduled_date, scheduled_time, estimated_hours, notes, created_by, updated_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      companyId, project_id, retailer_project_id,
      customer_name, customer_phone, customer_email, address, suburb,
      system_size_kw, system_type, panel_count, inverter_model, battery_included ? 1 : 0,
      scheduled_date, scheduled_time, estimated_hours, notes, createdBy, createdBy,
    ]
  );
  const jobId = result.insertId;

  if (Array.isArray(body.assignee_ids) && body.assignee_ids.length) {
    for (const empId of body.assignee_ids) {
      await db.execute(
        `INSERT IGNORE INTO installation_job_assignees (job_id, employee_id, company_id, assigned_by)
         VALUES (?, ?, ?, ?)`,
        [jobId, empId, companyId, createdBy]
      );
    }
  }

  return getJob(companyId, jobId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Status state machine  (T-230 / T-231)
//
// Transitions:
//   scheduled  → in_progress  (Start Job)
//   in_progress→ paused       (Pause)
//   in_progress→ completed    (End Job)
//   paused     → in_progress  (Resume)
//   paused     → completed    (End Job from paused)
//
// Side-effects:
//   • Writes a time record  (start | pause | resume | end)
//   • Updates started_at, paused_at, completed_at, total_elapsed_seconds
//   • Syncs project/retailer_project stage (T-233)
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_TRANSITIONS = {
  scheduled:    ['in_progress'],
  in_progress:  ['paused', 'completed'],
  paused:       ['in_progress', 'completed'],
  completed:    [],
};

const STATUS_TO_EVENT = {
  in_progress: null,           // resolved below (start vs resume)
  paused:      'pause',
  completed:   'end',
};

export async function updateStatus(companyId, jobId, newStatus, updatedBy) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[job]] = await conn.execute(
      `SELECT id, status, started_at, project_id, retailer_project_id
       FROM installation_jobs WHERE id = ? AND company_id = ? LIMIT 1`,
      [Number(jobId), Number(companyId)]
    );
    if (!job) { await conn.rollback(); conn.release(); throw notFound(); }

    const allowed = STATUS_TRANSITIONS[job.status] ?? [];
    if (!allowed.includes(newStatus)) {
      const e = new Error(`Cannot transition from "${job.status}" to "${newStatus}"`);
      e.statusCode = 422;
      await conn.rollback(); conn.release(); throw e;
    }

    const now = new Date();

    // ── 1. Determine time record event ───────────────────────────────────────
    let event;
    if (newStatus === 'in_progress') {
      event = job.started_at ? 'resume' : 'start';
    } else {
      event = STATUS_TO_EVENT[newStatus]; // 'pause' | 'end'
    }

    // ── 2. Write time record ─────────────────────────────────────────────────
    await conn.execute(
      `INSERT INTO installation_time_records (job_id, company_id, event, recorded_at, recorded_by)
       VALUES (?, ?, ?, ?, ?)`,
      [Number(jobId), Number(companyId), event, now, updatedBy]
    );

    // ── 3. Compute new elapsed if pausing or ending ───────────────────────────
    let elapsedUpdate = '';
    if (event === 'pause' || event === 'end') {
      const [records] = await conn.execute(
        `SELECT event, recorded_at FROM installation_time_records
         WHERE job_id = ? ORDER BY recorded_at ASC`,
        [Number(jobId)]
      );
      const elapsed = computeElapsed(records);
      elapsedUpdate = `, total_elapsed_seconds = ${elapsed}`;
    }

    // ── 4. Lifecycle timestamps ───────────────────────────────────────────────
    const setClauses = [`status = ?`, `updated_by = ?`, `updated_at = NOW()${elapsedUpdate}`];
    const setParams  = [newStatus, updatedBy];
    if (event === 'start')  { setClauses.push('started_at = ?');   setParams.push(now); }
    if (event === 'pause')  { setClauses.push('paused_at = ?');    setParams.push(now); }
    if (event === 'end')    { setClauses.push('completed_at = ?'); setParams.push(now); }

    await conn.execute(
      `UPDATE installation_jobs SET ${setClauses.join(', ')} WHERE id = ?`,
      [...setParams, Number(jobId)]
    );

    // ── 5. Sync project / retailer_project stage (T-233) ─────────────────────
    const projectStage = STATUS_TO_PROJECT_STAGE[newStatus];
    if (projectStage) {
      if (job.project_id) {
        await conn.execute(
          `UPDATE projects SET stage = ?, updated_at = NOW() WHERE id = ?`,
          [projectStage, job.project_id]
        ).catch(() => {}); // non-fatal if projects table edge case
      }
      if (job.retailer_project_id) {
        // map installation stages to retailer stage enum
        const retailerStage = newStatus === 'in_progress' ? 'installation_in_progress' : 'installation_completed';
        await conn.execute(
          `UPDATE retailer_projects SET stage = ?, updated_at = NOW() WHERE id = ?`,
          [retailerStage, job.retailer_project_id]
        ).catch(() => {});
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return getJob(companyId, jobId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Update general fields
// ─────────────────────────────────────────────────────────────────────────────
export async function updateJob(companyId, jobId, body, updatedBy) {
  const allowed = [
    'customer_name','customer_phone','customer_email','address','suburb',
    'system_size_kw','system_type','panel_count','inverter_model','battery_included',
    'scheduled_date','scheduled_time','estimated_hours','notes',
  ];
  const setClauses = ['updated_by = ?', 'updated_at = NOW()'];
  const params = [updatedBy];
  for (const key of allowed) {
    if (body[key] !== undefined) { setClauses.push(`${key} = ?`); params.push(body[key]); }
  }
  await db.execute(
    `UPDATE installation_jobs SET ${setClauses.join(', ')} WHERE id = ? AND company_id = ?`,
    [...params, Number(jobId), Number(companyId)]
  );
  return getJob(companyId, jobId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Checklist item templates (T-236 – per-company customisation)
// ─────────────────────────────────────────────────────────────────────────────

/** Returns global items + this company's custom items, ordered by section + sort_order */
export async function listChecklistItems(companyId) {
  const [rows] = await db.execute(
    `SELECT id, company_id, section, label, sort_order, is_required, created_at
     FROM installation_checklist_items
     WHERE company_id IS NULL OR company_id = ?
     ORDER BY FIELD(section,'pre_install','install','post_install','general'), sort_order, id`,
    [Number(companyId)]
  );
  return rows;
}

export async function createChecklistItem(companyId, { section = 'general', label, sort_order = 0, is_required = 0 }) {
  if (!label?.trim()) { const e = new Error('label is required'); e.statusCode = 422; throw e; }
  const [result] = await db.execute(
    `INSERT INTO installation_checklist_items (company_id, section, label, sort_order, is_required)
     VALUES (?, ?, ?, ?, ?)`,
    [Number(companyId), section, label.trim(), Number(sort_order), is_required ? 1 : 0]
  );
  const [[item]] = await db.execute(
    'SELECT * FROM installation_checklist_items WHERE id = ?', [result.insertId]
  );
  return item;
}

export async function updateChecklistItem(companyId, itemId, { section, label, sort_order, is_required }) {
  // Only allow editing company-owned items (not global)
  const [[item]] = await db.execute(
    'SELECT id, company_id FROM installation_checklist_items WHERE id = ? LIMIT 1',
    [Number(itemId)]
  );
  if (!item) { const e = new Error('Checklist item not found'); e.statusCode = 404; throw e; }
  if (item.company_id !== null && Number(item.company_id) !== Number(companyId)) {
    const e = new Error('Not authorised to edit this item'); e.statusCode = 403; throw e;
  }

  const setClauses = [];
  const params     = [];
  if (section    !== undefined) { setClauses.push('section = ?');     params.push(section); }
  if (label      !== undefined) { setClauses.push('label = ?');       params.push(label.trim()); }
  if (sort_order !== undefined) { setClauses.push('sort_order = ?');  params.push(Number(sort_order)); }
  if (is_required!== undefined) { setClauses.push('is_required = ?'); params.push(is_required ? 1 : 0); }
  if (!setClauses.length) return item;

  await db.execute(
    `UPDATE installation_checklist_items SET ${setClauses.join(', ')} WHERE id = ?`,
    [...params, Number(itemId)]
  );
  const [[updated]] = await db.execute(
    'SELECT * FROM installation_checklist_items WHERE id = ?', [Number(itemId)]
  );
  return updated;
}

export async function deleteChecklistItem(companyId, itemId) {
  const [[item]] = await db.execute(
    'SELECT id, company_id FROM installation_checklist_items WHERE id = ? LIMIT 1',
    [Number(itemId)]
  );
  if (!item) { const e = new Error('Checklist item not found'); e.statusCode = 404; throw e; }
  if (item.company_id === null) {
    const e = new Error('Global checklist items cannot be deleted'); e.statusCode = 403; throw e;
  }
  if (Number(item.company_id) !== Number(companyId)) {
    const e = new Error('Not authorised to delete this item'); e.statusCode = 403; throw e;
  }
  await db.execute('DELETE FROM installation_checklist_items WHERE id = ?', [Number(itemId)]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Checklist
// ─────────────────────────────────────────────────────────────────────────────
export async function upsertChecklistResponse(companyId, jobId, itemId, { checked, note }, userId) {
  const [[job]] = await db.execute(
    'SELECT id FROM installation_jobs WHERE id = ? AND company_id = ? LIMIT 1',
    [Number(jobId), Number(companyId)]
  );
  if (!job) throw notFound();

  await db.execute(
    `INSERT INTO installation_checklist_responses (job_id, item_id, checked, note, checked_by, checked_at)
     VALUES (?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       checked = VALUES(checked), note = VALUES(note),
       checked_by = VALUES(checked_by), checked_at = NOW(), updated_at = NOW()`,
    [Number(jobId), Number(itemId), checked ? 1 : 0, note ?? null, userId]
  );

  const [[response]] = await db.execute(
    `SELECT icr.*, ici.section, ici.label, ici.sort_order, ici.is_required
     FROM installation_checklist_responses icr
     JOIN installation_checklist_items ici ON ici.id = icr.item_id
     WHERE icr.job_id = ? AND icr.item_id = ?`,
    [Number(jobId), Number(itemId)]
  );
  return response;
}

// ─────────────────────────────────────────────────────────────────────────────
// Photos (T-245/246/247/248)
// ─────────────────────────────────────────────────────────────────────────────
export async function addPhoto(companyId, jobId, {
  section = 'general', filename, storage_url, mime_type, size_bytes,
  caption, lat, lng, taken_at, device_info,
}, uploadedBy) {
  const [[job]] = await db.execute(
    'SELECT id FROM installation_jobs WHERE id = ? AND company_id = ? LIMIT 1',
    [Number(jobId), Number(companyId)]
  );
  if (!job) throw notFound();

  const normalizeMySqlDateTime = (value) => {
    if (!value) return null;
    if (value instanceof Date) {
      if (isNaN(value.getTime())) return null;
      return value.toISOString().slice(0, 19).replace('T', ' ');
    }
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 19).replace('T', ' ');
  };

  const takenAtNormalized = normalizeMySqlDateTime(taken_at);

  const normalizedSection = normalizePhotoSection(section);

  const [result] = await db.execute(
    `INSERT INTO installation_photos
       (job_id, company_id, section, storage_url, filename, mime_type, size_bytes,
        caption, lat, lng, taken_at, device_info, uploaded_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      Number(jobId), Number(companyId), normalizedSection, storage_url, filename,
      mime_type ?? null, size_bytes ?? null, caption ?? null,
      lat ?? null, lng ?? null, takenAtNormalized, device_info ?? null, uploadedBy ?? null,
    ]
  );

  const [[photo]] = await db.execute(
    `SELECT id, section, storage_url, filename, mime_type, size_bytes,
            caption, lat, lng, taken_at, device_info, created_at
     FROM installation_photos WHERE id = ?`,
    [result.insertId]
  );
  return photo;
}

export async function deletePhoto(companyId, jobId, photoId) {
  const [[photo]] = await db.execute(
    `SELECT id, storage_url FROM installation_photos
     WHERE id = ? AND job_id = ? AND company_id = ? LIMIT 1`,
    [Number(photoId), Number(jobId), Number(companyId)]
  );
  if (!photo) { const e = new Error('Photo not found'); e.statusCode = 404; throw e; }
  await db.execute('DELETE FROM installation_photos WHERE id = ?', [Number(photoId)]);
  return photo; // caller can unlink the file
}

/** Get/set per-company photo requirements (min photos per tab) */
export async function getPhotoRequirements(companyId) {
  const [rows] = await db.execute(
    `SELECT section, min_count, is_required
     FROM installation_photo_requirements WHERE company_id = ?`,
    [Number(companyId)]
  );
  // Default: 1 photo required per section
  const defaults = { before: { min_count: 1, is_required: 1 }, during: { min_count: 1, is_required: 1 }, after: { min_count: 1, is_required: 1 } };
  rows.forEach(r => { defaults[r.section] = { min_count: r.min_count, is_required: r.is_required }; });
  return defaults;
}

export async function upsertPhotoRequirements(companyId, section, { min_count = 1, is_required = 1 }) {
  await db.execute(
    `INSERT INTO installation_photo_requirements (company_id, section, min_count, is_required)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE min_count = VALUES(min_count), is_required = VALUES(is_required)`,
    [Number(companyId), section, Number(min_count), is_required ? 1 : 0]
  );
  return getPhotoRequirements(companyId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sign-off
// ─────────────────────────────────────────────────────────────────────────────
export async function createSignoff(companyId, jobId, { customer_name, signature_url, notes }, ip) {
  const [[job]] = await db.execute(
    'SELECT id, status FROM installation_jobs WHERE id = ? AND company_id = ? LIMIT 1',
    [Number(jobId), Number(companyId)]
  );
  if (!job) throw notFound();

  await db.execute(
    `INSERT INTO installation_signoffs (job_id, customer_name, signature_url, notes, signed_by_ip)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       customer_name = VALUES(customer_name), signature_url = VALUES(signature_url),
       notes = VALUES(notes), signed_by_ip = VALUES(signed_by_ip), signed_at = NOW()`,
    [Number(jobId), customer_name ?? '', signature_url ?? null, notes ?? null, ip ?? null]
  );

  return getJob(companyId, jobId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Assignees
// ─────────────────────────────────────────────────────────────────────────────
export async function addAssignee(companyId, jobId, employeeId, assignedBy) {
  const [[job]] = await db.execute(
    'SELECT id FROM installation_jobs WHERE id = ? AND company_id = ? LIMIT 1',
    [Number(jobId), Number(companyId)]
  );
  if (!job) throw notFound();
  await db.execute(
    `INSERT IGNORE INTO installation_job_assignees (job_id, employee_id, company_id, assigned_by)
     VALUES (?, ?, ?, ?)`,
    [Number(jobId), Number(employeeId), Number(companyId), assignedBy]
  );
  return getJob(companyId, jobId);
}

export async function removeAssignee(companyId, jobId, employeeId) {
  await db.execute(
    'DELETE FROM installation_job_assignees WHERE job_id = ? AND employee_id = ?',
    [Number(jobId), Number(employeeId)]
  );
}
