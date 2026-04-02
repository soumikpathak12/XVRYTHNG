// src/services/projectService.js
import db from '../config/db.js';
import * as companyWorkflowService from './companyWorkflowService.js';
import { inspectionFormFromRowWithLegacyFallback } from './siteInspectionFormMapper.js';

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
    formDataJsonRaw: row.form_data_json,
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

  if (filters.stage && String(filters.stage).length <= 80) {
    where.push('p.stage = ?');
    params.push(filters.stage);
  }
  if (filters.search) {
    const raw = String(filters.search || '').trim();
    const prj = raw.match(/^prj-\s*(\d+)\s*$/i);
    const idOnly = raw.match(/^\d+$/);
    if (prj) {
      // Project code is derived from lead_id: PRJ-<lead_id>
      where.push('p.lead_id = ?');
      params.push(Number(prj[1]));
    } else if (idOnly) {
      // Allow searching by either project.id or lead_id for convenience
      where.push('(p.id = ? OR p.lead_id = ?)');
      params.push(Number(raw), Number(raw));
    } else {
      where.push('(p.customer_name LIKE ? OR l.email LIKE ? OR l.phone LIKE ? OR l.suburb LIKE ? OR CAST(p.id AS CHAR) LIKE ? OR CAST(p.lead_id AS CHAR) LIKE ?)');
      const q = `%${raw}%`;
      params.push(q, q, q, q, q, q);
    }
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
      p.id,
      p.lead_id,
      p.stage,
      p.customer_name,
      p.email,
      p.phone,
      p.suburb,
      p.system_size_kw,
      p.value_amount,
      p.created_at,
      p.updated_at,
      p.expected_completion_date,
      p.post_install_reference_no,
      COALESCE(p.project_code, CONCAT('PRJ-', p.lead_id)) AS project_code,
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
    ORDER BY p.created_at DESC, p.id DESC
    ${limitSql}
  `;
  const [rows] = await db.execute(sql, params);
  return rows;
}

const PROJECT_STAGE_ORDER_FALLBACK = [
  'new',
  'scheduled',
  'to_be_rescheduled',
  'installation_in_progress',
  'installation_completed',
  'ces_certificate_applied',
  'ces_certificate_received',
  'grid_connection_initiated',
  'grid_connection_completed',
  'system_handover',
];

/**
 * Enforce business rules when changing to a different pipeline stage.
 * `project` must be a row from getProjectById (includes lead_* columns).
 */
async function assertProjectStageChangeAllowed(project, projectId, nextStage, orderKeys) {
  if (!project || String(project.stage) === String(nextStage)) {
    return;
  }

  const order = Array.isArray(orderKeys) && orderKeys.length ? orderKeys : PROJECT_STAGE_ORDER_FALLBACK;
  const idxCurrent = order.indexOf(project.stage);
  const nextStageIndex = order.indexOf(nextStage);
  const isForward =
    idxCurrent !== -1 && nextStageIndex !== -1 && nextStageIndex > idxCurrent;

  if (isForward) {
    const pre = String(project.lead_pre_approval_reference_no ?? '').trim();
    if (!pre) {
      const err = new Error(
        'Pre-approval reference number is required before moving this project to a later stage. Add it under Utility information on the project.',
      );
      err.statusCode = 422;
      throw err;
    }
    const solar = project.lead_solar_vic_eligibility;
    if (solar == null || solar === '') {
      const err = new Error(
        'Solar Victoria eligibility must be set (eligible or not eligible) before moving this project to a later stage. Update Utility information on the project.',
      );
      err.statusCode = 422;
      throw err;
    }
  }

  // Past "GRID Connection Initiated": post-install reference + at least one project document (Documents tab).
  const idxGridInitiated = order.indexOf('grid_connection_initiated');

  if (
    nextStageIndex !== -1
    && idxGridInitiated !== -1
    && nextStageIndex > idxGridInitiated
  ) {
    const ref = String(project.post_install_reference_no ?? '').trim();
    if (!ref) {
      const err = new Error(
        'Post-install reference number is required before moving past GRID Connection Initiated. Add it on the project.',
      );
      err.statusCode = 422;
      throw err;
    }
    const [rows] = await db.execute(
      'SELECT COUNT(*) AS cnt FROM project_documents WHERE project_id = ?',
      [projectId],
    );
    const count = rows?.[0]?.cnt ?? 0;
    if (!count) {
      const err = new Error(
        'Upload at least one file in the project Documents tab before moving past GRID Connection Initiated.',
      );
      err.statusCode = 422;
      throw err;
    }
  }
}

export async function updateProjectStage(projectId, nextStage, companyId = null) {
  if (!projectId || Number.isNaN(Number(projectId))) {
    const err = new Error('Invalid project id');
    err.statusCode = 400;
    throw err;
  }
  const { enabledKeys, orderKeys } = await companyWorkflowService.getProjectStageSets(companyId);
  if (!companyWorkflowService.isSafeStageKey(nextStage) || !enabledKeys.has(nextStage)) {
    const err = new Error('Invalid stage transition');
    err.statusCode = 422;
    throw err;
  }

  const project = await getProjectById(projectId);
  await assertProjectStageChangeAllowed(project, projectId, nextStage, orderKeys);

  return updateProject(projectId, { stage: nextStage }, { skipStageValidation: true, companyId });
}

export async function updateProject(projectId, updates = {}, options = {}) {
  if (updates.stage !== undefined && !options.skipStageValidation) {
    const companyId = options.companyId ?? null;
    const { enabledKeys, orderKeys } = await companyWorkflowService.getProjectStageSets(companyId);
    if (!companyWorkflowService.isSafeStageKey(updates.stage) || !enabledKeys.has(updates.stage)) {
      const err = new Error('Invalid or disabled stage.');
      err.statusCode = 422;
      throw err;
    }
    const current = await getProjectById(projectId);
    if (String(current.stage) !== String(updates.stage)) {
      await assertProjectStageChangeAllowed(current, projectId, updates.stage, orderKeys);
    }
  }

  // Extract only allowed fields
  const allowed = [
    'expected_completion_date',
    'stage',
    'post_install_reference_no',
    'customer_name',
    'email',
    'phone',
    'suburb',
    'system_size_kw',
    'value_amount',
  ];
  const sets = [];
  const params = [];
  for (const k of allowed) {
    if (updates[k] !== undefined) {
      sets.push(`${k} = ?`);
      if (k === 'system_size_kw' || k === 'value_amount') {
        const v = updates[k];
        params.push(v === '' || v == null ? null : Number(v));
      } else if (k === 'customer_name') {
        const v = updates[k];
        params.push(v == null || v === '' ? '' : String(v).trim());
      } else {
        params.push(updates[k] === '' ? null : updates[k]);
      }
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
      p.id,
      p.lead_id,
      p.stage,
      p.customer_name,
      p.email,
      p.phone,
      p.suburb,
      p.system_size_kw,
      p.value_amount,
      p.created_at,
      p.updated_at,
      p.expected_completion_date,
      p.post_install_reference_no,
      COALESCE(p.project_code, CONCAT('PRJ-', p.lead_id)) AS project_code,
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
      l.meter_number AS lead_meter_number,
      l.pv_system_size_kw AS lead_pv_system_size_kw,
      l.pv_inverter_size_kw AS lead_pv_inverter_size_kw,
      l.pv_inverter_brand AS lead_pv_inverter_brand,
      l.pv_panel_brand AS lead_pv_panel_brand,
      l.pv_panel_module_watts AS lead_pv_panel_module_watts,
      l.ev_charger_brand AS lead_ev_charger_brand,
      l.ev_charger_model AS lead_ev_charger_model,
      l.battery_size_kwh AS lead_battery_size_kwh,
      l.battery_brand AS lead_battery_brand,
      l.battery_model AS lead_battery_model,
      l.customer_portal_pre_approval_announced AS lead_customer_portal_pre_approval_announced,
      l.customer_portal_solar_vic_announced AS lead_customer_portal_solar_vic_announced
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

/**
 * Fetch a single project by `lead_id`.
 * Used by the customer portal to show the same stage pipeline as ProjectsPage.
 */
export async function getProjectByLeadId(leadId) {
  if (!leadId || Number.isNaN(Number(leadId))) {
    const err = new Error('Invalid lead id');
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
      l.meter_number AS lead_meter_number,
      l.pv_system_size_kw AS lead_pv_system_size_kw,
      l.pv_inverter_size_kw AS lead_pv_inverter_size_kw,
      l.pv_inverter_brand AS lead_pv_inverter_brand,
      l.pv_panel_brand AS lead_pv_panel_brand,
      l.pv_panel_module_watts AS lead_pv_panel_module_watts,
      l.ev_charger_brand AS lead_ev_charger_brand,
      l.ev_charger_model AS lead_ev_charger_model,
      l.battery_size_kwh AS lead_battery_size_kwh,
      l.battery_brand AS lead_battery_brand,
      l.battery_model AS lead_battery_model,
      l.customer_portal_pre_approval_announced AS lead_customer_portal_pre_approval_announced,
      l.customer_portal_solar_vic_announced AS lead_customer_portal_solar_vic_announced
    FROM projects p
    LEFT JOIN leads l ON l.id = p.lead_id
    WHERE p.lead_id = ?
    LIMIT 1
  `;

  const [rows] = await db.execute(sql, [leadId]);
  return rows?.[0] ?? null;
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
      `SELECT *
       FROM lead_site_inspections
       WHERE lead_id = ?
       ORDER BY
         CASE WHEN status = 'submitted' THEN 2 WHEN status = 'draft' THEN 1 ELSE 0 END DESC,
         updated_at DESC,
         id DESC
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
    const formFromCols = inspectionFormFromRowWithLegacyFallback(row);
    const formRaw = row.form_data_json && String(row.form_data_json).trim()
      ? row.form_data_json
      : row.additional_notes;
    data.additionalNotes =
      formFromCols && Object.keys(formFromCols).length > 0
        ? formFromCols
        : parseAdditionalNotesDouble(formRaw);
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