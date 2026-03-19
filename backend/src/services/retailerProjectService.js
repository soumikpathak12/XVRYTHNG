// src/services/retailerProjectService.js
// Backend service for Retailer Projects:
// - Create project with Job Type-driven validation (date/time rules)
// - Map Job Type -> Stage so the card appears in the right kanban column
// - Persist extended fields and schedule in a transaction
// - List and filter by stage/search/job_type
// - Update stage (company-scoped)

import db from '../config/db.js';

/** Canonical stage keys for the 14-column board (we use a subset here) */
export const RETAILER_STAGES = new Set([
  'new',
  'site_inspection',
  'stage_one',
  'stage_two',
  'full_system',
  'cancelled',
  'scheduled',
  'to_be_rescheduled',
  'installation_in_progress',
  'installation_completed',
  'ces_certificate_applied',
  'ces_certificate_received',
  'ces_certificate_submitted',
  'done',
]);

/** Job Types supported in the modal */
export const JOB_TYPES = new Set(['site_inspection', 'stage_one', 'stage_two', 'full_system']);

/** Map Job Type -> Stage */
const JOB_TYPE_TO_STAGE = {
  site_inspection: 'site_inspection',
  stage_one: 'stage_one',
  stage_two: 'stage_two',
  full_system: 'full_system',
};

/** Format human-readable code from numeric id (PRJ-01, PRJ-02, ...) */
function formatRetailerCodeFromId(id, pad = 2) {
  const width = Math.max(pad, String(id).length);
  return `PRJ-${String(id).padStart(width, '0')}`;
}

/** Resolve a stage from job_type with a safe fallback to 'new' */
function resolveStageFromJobType(jobType) {
  const mapped = JOB_TYPE_TO_STAGE[jobType];
  return RETAILER_STAGES.has(mapped) ? mapped : 'new';
}

/** Basic guard to coerce empty strings to null to keep DB clean */
function nn(v) {
  return v === '' || v === undefined ? null : v;
}

/**
 * Create a new retailer project + schedule in one transaction
 * - Validates job_type and date/time constraints:
 *   * site_inspection -> requires date AND time
 *   * others -> require date only (time optional)
 * - Maps job_type -> stage (if stage not explicitly provided)
 * - Persists extended fields from the modal
 * - Returns the created project row (and schedule joined if needed)
 */
export async function createRetailerProject(companyId, payload = {}, userId = null) {
  if (!companyId || !Number.isFinite(Number(companyId))) {
    const err = new Error('Invalid company id'); err.statusCode = 400; throw err;
  }

  // Extract modal payload (snake_case to match DB)
  const {
    // Required minimal fields
    customer_name,

    // Scheduling
    job_type,                 // 'site_inspection' | 'stage_one' | 'stage_two' | 'full_system'
    scheduled_date,           // 'YYYY-MM-DD' (required for all job types)
    scheduled_time,           // 'HH:mm' (required ONLY for site_inspection)

    // Optional override for stage (FE already maps stage from job_type; we still enforce here)
    stage: stageInBody,

    // Customer & location
    customer_email,
    customer_contact,
    address,
    suburb,                   // optional: you can split address later if needed
    location_url,
    client_type,
    client_name,
    value_amount,

    // System & property
    system_type,
    system_size_kw,
    house_storey,
    roof_type,
    meter_phase,
    access_to_two_storey,
    access_to_inverter,

    // Notes
    notes,
  } = payload;

  // ---- Validation: required business rules ----
  if (!customer_name || String(customer_name).trim() === '') {
    const err = new Error('customer_name is required'); err.statusCode = 422; throw err;
  }
  if (!job_type || !JOB_TYPES.has(job_type)) {
    const err = new Error('job_type is required and must be one of: site_inspection, stage_one, stage_two, full_system');
    err.statusCode = 422; throw err;
  }
  if (!scheduled_date) {
    const err = new Error('scheduled_date is required'); err.statusCode = 422; throw err;
  }
  if (job_type === 'site_inspection' && !scheduled_time) {
    const err = new Error('scheduled_time is required for site_inspection'); err.statusCode = 422; throw err;
  }

  // Compute target stage (FE also sends it, but we enforce server-side)
  const stage = stageInBody && RETAILER_STAGES.has(stageInBody)
    ? stageInBody
    : resolveStageFromJobType(job_type);

  // Compute a convenient scheduled_at for calendar use
  // If time is present -> compose at "date time:00", otherwise set to start-of-day "date 00:00:00"
  const scheduledAt = scheduled_date
    ? `${scheduled_date} ${scheduled_time ? `${scheduled_time}:00` : '00:00:00'}`
    : null;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Insert project without code (code is filled after we have insertId)
    const [res] = await conn.execute(
      `INSERT INTO retailer_projects
       (company_id, code, job_type, stage, customer_name, customer_email, customer_contact,
        address, suburb, location_url, client_type, client_name,
        system_type, system_size_kw, value_amount,
        house_storey, roof_type, meter_phase, access_to_two_storey, access_to_inverter,
        notes, created_at, updated_at)
       VALUES (?, '', ?, ?, ?, ?, ?,
               ?, ?, ?, ?, ?,
               ?, ?, ?,
               ?, ?, ?, ?, ?,
               ?, NOW(), NOW())`,
      [
        Number(companyId), job_type, stage, customer_name, nn(customer_email), nn(customer_contact),
        nn(address), nn(suburb), nn(location_url), nn(client_type), nn(client_name),
        nn(system_type), nn(system_size_kw), nn(value_amount),
        nn(house_storey), nn(roof_type), nn(meter_phase), nn(access_to_two_storey), nn(access_to_inverter),
        nn(notes),
      ]
    );
    const newId = res.insertId;

    // 2) Generate code from id and update
    const code = formatRetailerCodeFromId(newId, 2);
    await conn.execute('UPDATE retailer_projects SET code = ? WHERE id = ?', [code, newId]);

    // 3) Upsert schedule for this project (one schedule per project)
    await conn.execute(
      `INSERT INTO retailer_project_schedules
       (company_id, project_id, job_type, scheduled_date, scheduled_time, scheduled_at, notes, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         job_type = VALUES(job_type),
         scheduled_date = VALUES(scheduled_date),
         scheduled_time = VALUES(scheduled_time),
         scheduled_at = VALUES(scheduled_at),
         notes = VALUES(notes),
         updated_by = VALUES(updated_by),
         updated_at = NOW()`,
      [
        Number(companyId), newId, job_type, scheduled_date, nn(scheduled_time), scheduledAt, nn(notes),
        userId ?? null, userId ?? null,
      ]
    );

    // 4) Return newly created project (join schedule for convenience)
    const [[project]] = await conn.execute(
      'SELECT * FROM retailer_projects WHERE id = ? LIMIT 1',
      [newId]
    );
    const [[schedule]] = await conn.execute(
      'SELECT * FROM retailer_project_schedules WHERE company_id = ? AND project_id = ? LIMIT 1',
      [Number(companyId), newId]
    );

    await conn.commit();

    // Attach schedule for callers who need it
    return { project, schedule: schedule ?? null };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Get a single retailer project by ID */
export async function getRetailerProjectById(companyId, projectId) {
  if (!Number.isFinite(Number(projectId))) {
    const err = new Error('Invalid project id'); err.statusCode = 400; throw err;
  }
  const [[project]] = await db.execute(
    'SELECT * FROM retailer_projects WHERE id = ? AND company_id = ? LIMIT 1',
    [Number(projectId), Number(companyId)]
  );
  if (!project) {
    const err = new Error('Retailer project not found'); err.statusCode = 404; throw err;
  }
  return project;
}

/** List retailer projects (optional filters: stage, search, job_type; pagination) */
export async function listRetailerProjects(companyId, filters = {}) {
  if (!companyId || !Number.isFinite(Number(companyId))) {
    const err = new Error('Invalid company id'); err.statusCode = 400; throw err;
  }

  const where = ['rp.company_id = ?'];
  const params = [Number(companyId)];

  if (filters.stage && RETAILER_STAGES.has(filters.stage)) {
    where.push('rp.stage = ?'); params.push(filters.stage);
  }
  if (filters.job_type && JOB_TYPES.has(filters.job_type)) {
    where.push('rp.job_type = ?'); params.push(filters.job_type);
  }
  if (filters.search) {
    // search across code, customer_name, suburb, address
    where.push('(rp.code LIKE ? OR rp.customer_name LIKE ? OR rp.suburb LIKE ? OR rp.address LIKE ?)');
    const q = `%${filters.search}%`;
    params.push(q, q, q, q);
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;

  let limitSql = '';
  if (typeof filters.limit === 'number' && filters.limit > 0) {
    limitSql = 'LIMIT ?';
    params.push(filters.limit);
    if (typeof filters.offset === 'number' && filters.offset >= 0) {
      limitSql = 'LIMIT ? OFFSET ?';
      params.push(filters.limit, filters.offset);
    }
  }

  const sql = `
    SELECT rp.*
    FROM retailer_projects rp
    ${whereSql}
    ORDER BY rp.updated_at DESC, rp.created_at DESC
    ${limitSql}
  `;
  const [rows] = await db.execute(sql, params);
  return rows;
}

/** Update a retailer project's general fields */
export async function updateRetailerProject(companyId, projectId, updates = {}) {
  if (!Number.isFinite(Number(projectId))) {
    const err = new Error('Invalid project id'); err.statusCode = 400; throw err;
  }

  // Extract only allowed fields
  const allowed = ['expected_completion_date', 'stage'];
  const sets = [];
  const params = [];
  for (const k of allowed) {
    if (updates[k] !== undefined) {
      sets.push(`${k} = ?`);
      params.push(updates[k] === '' ? null : updates[k]);
    }
  }

  if (sets.length === 0) return getRetailerProjectById(companyId, projectId);

  sets.push('updated_at = NOW()');
  params.push(Number(projectId), Number(companyId));

  await db.execute(
    `UPDATE retailer_projects SET ${sets.join(', ')} WHERE id = ? AND company_id = ?`,
    params
  );
  return getRetailerProjectById(companyId, projectId);
}

/** Update a retailer project's stage (company-scoped) */
export async function updateRetailerProjectStage(companyId, projectId, nextStage) {
  if (!Number.isFinite(Number(projectId))) {
    const err = new Error('Invalid project id'); err.statusCode = 400; throw err;
  }
  if (!RETAILER_STAGES.has(nextStage)) {
    const err = new Error('Invalid stage'); err.statusCode = 422; throw err;
  }

  const [[exists]] = await db.execute(
    'SELECT id FROM retailer_projects WHERE id = ? AND company_id = ? LIMIT 1',
    [Number(projectId), Number(companyId)]
  );
  if (!exists) {
    const err = new Error('Retailer project not found'); err.statusCode = 404; throw err;
  }

  await db.execute(
    'UPDATE retailer_projects SET stage = ?, updated_at = NOW() WHERE id = ? AND company_id = ?',
    [nextStage, Number(projectId), Number(companyId)]
  );

  const [[updated]] = await db.execute(
    'SELECT * FROM retailer_projects WHERE id = ? AND company_id = ? LIMIT 1',
    [Number(projectId), Number(companyId)]
  );
  return updated;
}

/** Get schedule for a retailer project (for future calendar usage) */
export async function getRetailerProjectSchedule(companyId, projectId) {
  if (!Number.isFinite(Number(projectId))) {
    const err = new Error('Invalid project id'); err.statusCode = 400; throw err;
  }
  const [[schedule]] = await db.execute(
    `SELECT * FROM retailer_project_schedules WHERE company_id = ? AND project_id = ? LIMIT 1`,
    [Number(companyId), Number(projectId)]
  );
  return schedule ?? null;
}

/** Update/Upsert schedule for a retailer project with validation rules */
export async function saveRetailerProjectSchedule(companyId, projectId, payload = {}, userId = null) {
  if (!Number.isFinite(Number(projectId))) {
    const err = new Error('Invalid project id'); err.statusCode = 400; throw err;
  }

  const {
    job_type,          // may update job type when rescheduling
    date,              // required for all
    time,              // required if job_type === site_inspection
    notes,
    assignees,         // optional: persist assignees together with schedule
  } = payload;

  if (!job_type || !JOB_TYPES.has(job_type)) {
    const err = new Error('job_type is required and must be one of: site_inspection, stage_one, stage_two, full_system');
    err.statusCode = 422; throw err;
  }
  if (!date) {
    const err = new Error('date is required'); err.statusCode = 422; throw err;
  }
  if (job_type === 'site_inspection' && !time) {
    const err = new Error('time is required for site_inspection'); err.statusCode = 422; throw err;
  }

  const scheduledAt = `${date} ${time ? `${time}:00` : '00:00:00'}`;

  // Upsert schedule
  await db.execute(
    `INSERT INTO retailer_project_schedules
     (company_id, project_id, job_type, scheduled_date, scheduled_time, scheduled_at, notes, created_by, updated_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       job_type = VALUES(job_type),
       scheduled_date = VALUES(scheduled_date),
       scheduled_time = VALUES(scheduled_time),
       scheduled_at = VALUES(scheduled_at),
       notes = VALUES(notes),
       updated_by = VALUES(updated_by),
       updated_at = NOW()`,
    [Number(companyId), Number(projectId), job_type, date, nn(time), scheduledAt, nn(notes), userId ?? null, userId ?? null]
  );

  // Optionally sync stage to match job_type change
  const stage = resolveStageFromJobType(job_type);
  await db.execute(
    'UPDATE retailer_projects SET job_type = ?, stage = ?, updated_at = NOW() WHERE id = ? AND company_id = ?',
    [job_type, stage, Number(projectId), Number(companyId)]
  );

  // If assignees were provided, persist them now (so installation sync uses the latest list)
  if (Array.isArray(assignees)) {
    await saveRetailerProjectAssignees(companyId, projectId, assignees, userId ?? null);
  }

  // Sync to Installation Day (installation_jobs) ONLY for install job types
  if (['stage_one', 'stage_two', 'full_system'].includes(job_type)) {
    // Fetch retailer project for job fields
    const [[rp]] = await db.execute(
      `SELECT
         id, company_id,
         customer_name, customer_email, customer_contact,
         address, suburb,
         system_size_kw, system_type
       FROM retailer_projects
       WHERE id = ? AND company_id = ?
       LIMIT 1`,
      [Number(projectId), Number(companyId)]
    );

    // Upsert the latest installation job for this retailer_project
    const [[existingJob]] = await db.execute(
      `SELECT id
         FROM installation_jobs
        WHERE company_id = ? AND retailer_project_id = ?
        ORDER BY id DESC
        LIMIT 1`,
      [Number(companyId), Number(projectId)]
    );

    const jobDate = date;
    const jobTime = nn(time) ? `${String(time).slice(0, 5)}:00` : null; // TIME expects HH:mm:ss
    const jobNotes = nn(notes);

    let jobId = null;
    if (existingJob?.id) {
      jobId = existingJob.id;
      await db.execute(
        `UPDATE installation_jobs
            SET status = 'scheduled',
                customer_name = ?,
                customer_phone = ?,
                customer_email = ?,
                address = ?,
                suburb = ?,
                system_size_kw = ?,
                system_type = ?,
                scheduled_date = ?,
                scheduled_time = ?,
                notes = ?,
                updated_by = ?,
                updated_at = NOW()
          WHERE id = ? AND company_id = ?`,
        [
          rp?.customer_name ?? '',
          rp?.customer_contact ?? null,
          rp?.customer_email ?? null,
          rp?.address ?? null,
          rp?.suburb ?? null,
          rp?.system_size_kw ?? null,
          rp?.system_type ?? null,
          jobDate,
          jobTime,
          jobNotes,
          userId ?? null,
          Number(jobId),
          Number(companyId),
        ]
      );
    } else {
      const [ins] = await db.execute(
        `INSERT INTO installation_jobs
          (company_id, project_id, retailer_project_id,
           status,
           customer_name, customer_phone, customer_email, address, suburb,
           system_size_kw, system_type,
           panel_count, inverter_model, battery_included,
           scheduled_date, scheduled_time, estimated_hours, notes,
           created_by, updated_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          Number(companyId),
          null,
          Number(projectId),
          'scheduled',
          rp?.customer_name ?? '',
          rp?.customer_contact ?? null,
          rp?.customer_email ?? null,
          rp?.address ?? null,
          rp?.suburb ?? null,
          rp?.system_size_kw ?? null,
          rp?.system_type ?? null,
          null,
          null,
          0,
          jobDate,
          jobTime,
          null,
          jobNotes,
          userId ?? null,
          userId ?? null,
        ]
      );
      jobId = ins.insertId;
    }

    // Sync assignees from retailer_project_assignees -> installation_job_assignees
    const [asgRows] = await db.execute(
      `SELECT employee_id
         FROM retailer_project_assignees
        WHERE company_id = ? AND project_id = ?`,
      [Number(companyId), Number(projectId)]
    );
    const assigneeIds = (asgRows ?? []).map(r => Number(r.employee_id)).filter(Boolean);

    if (jobId) {
      await db.execute(
        `DELETE FROM installation_job_assignees WHERE job_id = ? AND company_id = ?`,
        [Number(jobId), Number(companyId)]
      );
      if (assigneeIds.length) {
        const values = assigneeIds.map(eid => [Number(jobId), Number(eid), Number(companyId), userId ?? null]);
        const placeholders = values.map(() => '(?,?,?,?)').join(',');
        await db.query(
          `INSERT IGNORE INTO installation_job_assignees (job_id, employee_id, company_id, assigned_by)
           VALUES ${placeholders}`,
          values.flat()
        );
      }
    }
  }

  const schedule = await getRetailerProjectSchedule(companyId, projectId);
  return { schedule };
}



// --- Assignees (Retailer) ---

/** Read current assignees for a retailer project (array of employee ids) */
export async function getRetailerProjectAssignees(companyId, projectId) {
  if (!Number.isFinite(Number(projectId))) {
    const err = new Error('Invalid project id'); err.statusCode = 400; throw err;
  }
  const [rows] = await db.execute(
    `SELECT employee_id FROM retailer_project_assignees
     WHERE company_id = ? AND project_id = ?
     ORDER BY assigned_at ASC`,
    [Number(companyId), Number(projectId)]
  );
  return rows.map(r => r.employee_id);
}

/**
 * Replace assignees (id[]) for a retailer project in one go.
 * This function:
 *  - Validates that all employee ids belong to the same company
 *  - Replaces previous assignments with the new set
 *  - Returns the final list of ids
 */
export async function saveRetailerProjectAssignees(companyId, projectId, ids = [], userId = null) {
  if (!Number.isFinite(Number(projectId))) {
    const err = new Error('Invalid project id'); err.statusCode = 400; throw err;
  }
  const assignees = Array.from(new Set((ids || []).map(Number).filter(Boolean)));

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Guard project belongs to company
    const [[proj]] = await conn.execute(
      'SELECT id FROM retailer_projects WHERE id = ? AND company_id = ? LIMIT 1',
      [Number(projectId), Number(companyId)]
    );
    if (!proj) {
      const err = new Error('Retailer project not found'); err.statusCode = 404; throw err;
    }

    // Validate employees are in the same company
    if (assignees.length > 0) {
      const [emps] = await conn.execute(
        `SELECT id FROM employees WHERE company_id = ? AND id IN (${assignees.map(()=>'?').join(',')})`,
        [Number(companyId), ...assignees]
      );
      const valid = new Set(emps.map(e => Number(e.id)));
      const invalid = assignees.filter(x => !valid.has(Number(x)));
      if (invalid.length) {
        const err = new Error(`Invalid employee ids: ${invalid.join(', ')}`); err.statusCode = 422; throw err;
      }
    }

    // Replace assignments: delete all → insert current
    await conn.execute(
      'DELETE FROM retailer_project_assignees WHERE company_id = ? AND project_id = ?',
      [Number(companyId), Number(projectId)]
    );

    if (assignees.length > 0) {
      const now = new Date();
      const values = assignees.map(empId => [
        Number(projectId), Number(empId), Number(companyId),
        now, userId ?? null
      ]);
      await conn.query(
        `INSERT INTO retailer_project_assignees
         (project_id, employee_id, company_id, assigned_at, assigned_by)
         VALUES ${values.map(()=>'(?, ?, ?, ?, ?)').join(', ')}`,
        values.flat()
      );
    }

    // Sync to installation_job_assignees for the linked Installation Day job (if exists).
    // Installation Day reads from installation_job_assignees, so this keeps UI consistent
    // even when user only clicks "Save Assignees" (without re-saving schedule).
    const [jobs] = await conn.execute(
      `SELECT id
         FROM installation_jobs
        WHERE company_id = ? AND retailer_project_id = ?`,
      [Number(companyId), Number(projectId)]
    );
    const jobIds = (jobs ?? []).map(r => Number(r.id)).filter(Boolean);

    for (const jobId of jobIds) {
      await conn.execute(
        `DELETE FROM installation_job_assignees
          WHERE job_id = ? AND company_id = ?`,
        [Number(jobId), Number(companyId)]
      );
      if (assignees.length > 0) {
        const values = assignees.map((empId) => [Number(jobId), Number(empId), Number(companyId), userId ?? null]);
        const placeholders = values.map(() => '(?,?,?,?)').join(',');
        await conn.query(
          `INSERT IGNORE INTO installation_job_assignees (job_id, employee_id, company_id, assigned_by)
           VALUES ${placeholders}`,
          values.flat()
        );
      }
    }

    await conn.commit();
    return assignees;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}