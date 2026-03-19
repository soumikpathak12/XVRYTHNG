// src/services/projectService.js
import db from '../config/db.js';

const PROJECT_STAGES = new Set([
  'new',
  'pre_approval',
  'state_rebate',
  'design_engineering',
  'procurement',
  'scheduled',
  'installation_in_progress',
  'installation_completed',
  'compliance_check',
  'inspection_grid_connection',
  'rebate_stc_claims',
  'project_completed',
]);

/* ---------- helpers ---------- */
function toCamelInspection(row = {}) {
  return {
    id: row.id,
    leadId: row.lead_id,
    status: row.status,
    inspectedAt: row.inspected_at,
    inspectorName: row.inspector_name,
    roofType: row.roof_type,
    roofPitchDeg: row.roof_pitch_deg,
    houseStorey: row.house_storey,
    meterPhase: row.meter_phase,
    inverterLocation: row.inverter_location,
    msbCondition: row.msb_condition,
    shading: row.shading,
    additionalNotesRaw: row.additional_notes,
    templateKey: row.template_key,
    templateVersion: row.template_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseAdditionalNotesDouble(str) {
  if (!str) return null;
  try {
    const lvl1 = JSON.parse(str);
    if (typeof lvl1?.additional_notes === 'string') {
      try {
        const lvl2 = JSON.parse(lvl1.additional_notes);
        return { ...lvl1, additional_notes: lvl2 };
      } catch {
        return lvl1;
      }
    }
    return lvl1;
  } catch {
    return null;
  }
}

/* ---------- projects listing ---------- */
export async function getProjects(filters = {}) {
  const where = [];
  const params = [];

  if (filters.stage && PROJECT_STAGES.has(filters.stage)) {
    where.push('p.stage = ?');
    params.push(filters.stage);
  }
  if (filters.search) {
    where.push('(p.customer_name LIKE ? OR l.email LIKE ? OR l.phone LIKE ? OR l.suburb LIKE ?)');
    const q = `%${filters.search}%`;
    params.push(q, q, q, q);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  let limitSql = '';
  if (typeof filters.limit === 'number' && filters.limit > 0) {
    limitSql = 'LIMIT ?';
    params.push(filters.limit);
    if (typeof filters.offset === 'number' && filters.offset >= 0) {
      limitSql = 'LIMIT ? OFFSET ?';
      params.push(filters.offset);
    }
  }

  const sql = `
    SELECT
      p.*,
      l.email        AS lead_email,
      l.phone        AS lead_phone,
      l.suburb       AS lead_suburb,
      l.system_size_kw AS lead_system_size_kw,
      l.value_amount AS lead_value_amount,
      l.source       AS lead_source,
      l.referred_by_lead_id AS lead_referred_by_lead_id,
      l.is_closed    AS lead_is_closed,
      l.is_won       AS lead_is_won,
      l.won_lost_at  AS lead_won_lost_at,
      l.last_activity_at AS lead_last_activity_at,
      l.site_inspection_date AS lead_site_inspection_date,
      l.system_type  AS lead_system_type,
      l.house_storey AS lead_house_storey,
      l.roof_type    AS lead_roof_type,
      l.meter_phase  AS lead_meter_phase,
      l.access_to_second_storey AS lead_access_to_second_storey,
      l.access_to_inverter AS lead_access_to_inverter,
      l.pre_approval_reference_no AS lead_pre_approval_reference_no,
      l.energy_retailer AS lead_energy_retailer,
      l.energy_distributor AS lead_energy_distributor,
      l.solar_vic_eligibility AS lead_solar_vic_eligibility,
      l.nmi_number   AS lead_nmi_number,
      l.meter_number AS lead_meter_number
    FROM projects p
    LEFT JOIN leads l ON l.id = p.lead_id
    ${whereSql}
    ORDER BY p.updated_at DESC, p.created_at DESC
    ${limitSql}
  `;
  const [rows] = await db.execute(sql, params);
  return rows;
}

const PROJECT_STAGE_ORDER = [
  'new',
  'pre_approval',
  'state_rebate',
  'design_engineering',
  'procurement',
  'scheduled',
  'installation_in_progress',
  'installation_completed',
  'compliance_check',
  'inspection_grid_connection',
  'rebate_stc_claims',
  'project_completed',
];

export async function updateProjectStage(projectId, nextStage) {
  if (!projectId || Number.isNaN(Number(projectId))) {
    const err = new Error('Invalid project id');
    err.statusCode = 400;
    throw err;
  }
  if (!PROJECT_STAGES.has(nextStage)) {
    const err = new Error('Invalid stage transition');
    err.statusCode = 422;
    throw err;
  }

  // Business rules: for Grid Connection stage and beyond, ensure post‑install info is present.
  const project = await getProjectById(projectId);
  const idxTarget = PROJECT_STAGE_ORDER.indexOf(nextStage);
  const idxGrid = PROJECT_STAGE_ORDER.indexOf('inspection_grid_connection');

  if (idxTarget !== -1 && idxGrid !== -1 && idxTarget >= idxGrid) {
    if (!project.post_install_reference_no) {
      const err = new Error('Please enter Post-install reference number before moving to this stage.');
      err.statusCode = 422;
      throw err;
    }
    // Require at least one document uploaded for this project.
    const [rows] = await db.execute(
      'SELECT COUNT(*) AS cnt FROM project_documents WHERE project_id = ?',
      [projectId]
    );
    const count = rows?.[0]?.cnt ?? 0;
    if (!count) {
      const err = new Error('Please upload at least one post-install document before moving to this stage.');
      err.statusCode = 422;
      throw err;
    }
  }

  return updateProject(projectId, { stage: nextStage });
}

export async function updateProject(projectId, updates = {}) {
  // Extract only allowed fields
  const allowed = ['expected_completion_date', 'stage', 'post_install_reference_no'];
  const sets = [];
  const params = [];
  for (const k of allowed) {
    if (updates[k] !== undefined) {
      sets.push(`${k} = ?`);
      params.push(updates[k] === '' ? null : updates[k]);
    }
  }

  if (sets.length === 0) return getProjectById(projectId);

  sets.push('updated_at = NOW()');
  params.push(projectId);

  await db.execute(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`, params);
  const [updated] = await db.execute('SELECT * FROM projects WHERE id = ? LIMIT 1', [projectId]);
  return updated[0];
}

export async function getProjectById(projectId) {
  if (!projectId || Number.isNaN(Number(projectId))) {
    const err = new Error('Invalid project id');
    err.statusCode = 400;
    throw err;
  }
  const sql = `
    SELECT
      p.*,
      l.email        AS lead_email,
      l.phone        AS lead_phone,
      l.suburb       AS lead_suburb,
      l.system_size_kw AS lead_system_size_kw,
      l.value_amount AS lead_value_amount,
      l.source       AS lead_source,
      l.referred_by_lead_id AS lead_referred_by_lead_id,
      l.is_closed    AS lead_is_closed,
      l.is_won       AS lead_is_won,
      l.won_lost_at  AS lead_won_lost_at,
      l.last_activity_at AS lead_last_activity_at,
      l.site_inspection_date AS lead_site_inspection_date,
      l.system_type  AS lead_system_type,
      l.house_storey AS lead_house_storey,
      l.roof_type    AS lead_roof_type,
      l.meter_phase  AS lead_meter_phase,
      l.access_to_second_storey AS lead_access_to_second_storey,
      l.access_to_inverter AS lead_access_to_inverter,
      l.pre_approval_reference_no AS lead_pre_approval_reference_no,
      l.energy_retailer AS lead_energy_retailer,
      l.energy_distributor AS lead_energy_distributor,
      l.solar_vic_eligibility AS lead_solar_vic_eligibility,
      l.nmi_number   AS lead_nmi_number,
      l.meter_number AS lead_meter_number
    FROM projects p
    LEFT JOIN leads l ON l.id = p.lead_id
    WHERE p.id = ?
    LIMIT 1
  `;
  const [rows] = await db.execute(sql, [projectId]);
  if (!rows?.[0]) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
}

/* ---------- site inspection (NEW) ---------- */
/**
 * Get latest inspection by projectId (primary) or explicit leadId (fallback via req.query.leadId at controller).
 * Returns: { data: camelCase | null, meta: { projectId, leadIdTried, rowCount } }
 */
export async function getLatestInspectionForProject(projectId, { leadIdOverride } = {}) {
  if (!projectId || Number.isNaN(Number(projectId))) {
    const err = new Error('Invalid project id');
    err.statusCode = 400;
    throw err;
  }

  // 1) Resolve project's lead_id
  const [prows] = await db.execute(
    'SELECT id, lead_id FROM projects WHERE id = ? LIMIT 1',
    [projectId]
  );
  const proj = prows?.[0];
  if (!proj) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }

  const leadIdToUse = leadIdOverride ?? proj.lead_id ?? null;
  let row = null;
  let rowCount = 0;

  if (leadIdToUse) {
    const [irows] = await db.execute(
      `SELECT
          id, lead_id, status, inspected_at, inspector_name, roof_type, roof_pitch_deg,
          house_storey, meter_phase, inverter_location, msb_condition, shading,
          additional_notes, template_key, template_version, created_at, updated_at
       FROM lead_site_inspections
       WHERE lead_id = ?
       ORDER BY inspected_at DESC, id DESC
       LIMIT 1`,
      [leadIdToUse]
    );
    row = irows?.[0] ?? null;
    rowCount = irows?.length ?? 0;
  }

  // 2) Map & parse
  let data = null;
  if (row) {
    data = toCamelInspection(row);
    data.additionalNotes = parseAdditionalNotesDouble(row.additional_notes);
  }

  // 3) Return with meta for quick debugging at FE
  return {
    data,
    meta: {
      projectId: Number(projectId),
      leadIdTried: leadIdToUse,
      rowCount,
    },
  };
}


export async function saveScheduleAndAssignees(companyId, projectId, payload = {}, userId = null) {
  const { status, date, time, assignees, notes } = payload;

  const scheduledAt = date && time ? `${date} ${time}:00` : null;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // UPSERT project schedule
    await conn.execute(`
      INSERT INTO project_schedules (company_id, project_id, status, scheduled_at, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        scheduled_at = VALUES(scheduled_at),
        notes = VALUES(notes),
        updated_by = ?,
        updated_at = NOW()
    `, [
      companyId, projectId, status, scheduledAt, notes ?? null, userId,
      userId
    ]);

    await conn.execute(
      `DELETE FROM project_assignees WHERE project_id = ? AND company_id = ?`,
      [projectId, companyId]
    );

    if (Array.isArray(assignees) && assignees.length > 0) {
      const values = assignees.map(eid => [projectId, eid, companyId, userId]);
      const placeholders = values.map(() => '(?,?,?,?)').join(',');
      await conn.query(
        `INSERT INTO project_assignees (project_id, employee_id, company_id, assigned_by)
         VALUES ${placeholders}`,
        values.flat()
      );
    }

    // Sync to installation_jobs so "Installation Day" can show scheduled work immediately.
    // Project stage statuses we care about:
    // - scheduled                 -> installation_jobs.status = 'scheduled'
    // - installation_in_progress  -> installation_jobs.status = 'in_progress'
    // - installation_completed    -> installation_jobs.status = 'completed'
    const projectStageToJobStatus = {
      scheduled: 'scheduled',
      installation_in_progress: 'in_progress',
      installation_completed: 'completed',
    };

    const targetJobStatus = projectStageToJobStatus[status];
    const shouldCreateOrUpdateInstallationJob =
      !!targetJobStatus && !!scheduledAt && !!date && !!time;

    if (shouldCreateOrUpdateInstallationJob) {
      // 1) Load minimal lead/project info for the job card list
      const [[projRow]] = await conn.execute(
        `SELECT
           l.customer_name AS lead_customer_name,
           l.email         AS lead_email,
           l.phone         AS lead_phone,
           l.suburb        AS lead_suburb,
           l.system_size_kw AS lead_system_size_kw,
           l.system_type     AS lead_system_type,
           p.customer_name  AS project_customer_name,
           p.suburb          AS project_suburb,
           p.system_size_kw AS project_system_size_kw
         FROM projects p
         JOIN leads l ON l.id = p.lead_id
         WHERE p.id = ?
         LIMIT 1`,
        [Number(projectId)]
      );

      const customerName = projRow?.project_customer_name ?? projRow?.lead_customer_name ?? '';
      const customerEmail = projRow?.lead_email ?? null;
      const customerPhone = projRow?.lead_phone ?? null;
      const suburb = projRow?.project_suburb ?? projRow?.lead_suburb ?? null;
      // Your `projects` table doesn't have an `address` column in this DB dump.
      // Installation jobs has `address`, but we can safely keep it null and rely on `suburb` for UI.
      const address = null;
      const systemSizeKw = projRow?.project_system_size_kw ?? projRow?.lead_system_size_kw ?? null;
      const systemType = projRow?.lead_system_type ?? null;

      // 2) Upsert installation_jobs by latest job for this project/company
      const [[existingJobRow]] = await conn.execute(
        `SELECT id
           FROM installation_jobs
          WHERE company_id = ? AND project_id = ?
          ORDER BY id DESC
          LIMIT 1`,
        [Number(companyId), Number(projectId)]
      );

      const jobDate = date;
      const jobTime = String(time).slice(0, 5); // expect HH:mm
      const jobNotes = notes ?? null;

      let jobId = null;
      if (existingJobRow?.id) {
        jobId = existingJobRow.id;
        await conn.execute(
          `UPDATE installation_jobs
              SET status = ?,
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
            targetJobStatus,
            customerName,
            customerPhone,
            customerEmail,
            address,
            suburb,
            systemSizeKw,
            systemType,
            jobDate,
            jobTime,
            jobNotes,
            userId,
            Number(jobId),
            Number(companyId),
          ]
        );
      } else {
        const [result] = await conn.execute(
          `INSERT INTO installation_jobs
            (company_id, project_id, retailer_project_id,
             customer_name, customer_phone, customer_email, address, suburb,
             system_size_kw, system_type, panel_count, inverter_model, battery_included,
             scheduled_date, scheduled_time, estimated_hours, notes,
             created_by, updated_by)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            Number(companyId),
            Number(projectId),
            null,
            customerName,
            customerPhone,
            customerEmail,
            address,
            suburb,
            systemSizeKw,
            systemType,
            null, // panel_count
            null, // inverter_model
            0, // battery_included
            jobDate,
            jobTime,
            null, // estimated_hours
            jobNotes,
            userId,
            userId,
          ]
        );
        jobId = result.insertId;
      }

      // 3) Sync installation_job_assignees from project_assignees
      await conn.execute(
        `DELETE FROM installation_job_assignees
          WHERE job_id = ? AND company_id = ?`,
        [Number(jobId), Number(companyId)]
      );

      if (Array.isArray(assignees) && assignees.length > 0) {
        const values = assignees.map((empId) => [Number(jobId), Number(empId), Number(companyId), userId]);
        const placeholders = values.map(() => '(?,?,?,?)').join(',');
        await conn.query(
          `INSERT IGNORE INTO installation_job_assignees (job_id, employee_id, company_id, assigned_by)
           VALUES ${placeholders}`,
          values.flat()
        );
      }
    }

    await conn.commit();
    return { success: true };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getScheduleAndAssignees(companyId, projectId) {
  if (!Number.isFinite(Number(projectId))) {
    const err = new Error('Invalid project id'); err.statusCode = 400; throw err;
  }
  if (!Number.isFinite(Number(companyId))) {
    const err = new Error('Invalid company id'); err.statusCode = 400; throw err;
  }

  // One schedule per project (unique by project_id). Also filter by company_id for safety.
  const [[schedule]] = await db.execute(
    `SELECT id, company_id, project_id, status, scheduled_at, notes, created_at, updated_at
       FROM project_schedules
      WHERE project_id = ? AND company_id = ?
      LIMIT 1`,
    [Number(projectId), Number(companyId)]
  );

  // Load assignees for this company + project
  const [rows] = await db.execute(
    `SELECT employee_id
       FROM project_assignees
      WHERE project_id = ? AND company_id = ?`,
    [Number(projectId), Number(companyId)]
  );

  const assignees = rows.map(r => Number(r.employee_id)).filter(Boolean);
  return { schedule: schedule ?? null, assignees };
}