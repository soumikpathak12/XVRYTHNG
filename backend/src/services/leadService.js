import db from '../config/db.js';

const STAGES = new Set([
  'new',
  'contacted',
  'qualified',
  'inspection_booked',
  'inspection_completed',
  'proposal_sent',
  'negotiation',
  'closed_won',
  'closed_lost',
]);

function deriveFlags(stage) {
  const is_closed = stage === 'closed_won' || stage === 'closed_lost';
  const is_won = stage === 'closed_won';
  return { is_closed, is_won };
}

/**
 * Insert a new lead and return the created row.
 */
export async function createLead(payload) {
  const {
    stage,
    customer_name,
    email,
    phone,
    suburb,
    system_size_kw,
    value_amount,
    source,
    referred_by_lead_id = null,
    site_inspection_date,
    external_id = null,
    marketing_payload_json = null,
  } = payload;

  if (!STAGES.has(stage)) {
    const err = new Error('Invalid stage');
    err.statusCode = 400;
    throw err;
  }

  const { is_closed, is_won } = deriveFlags(stage);
  const won_lost_at = is_closed ? new Date() : null;

  const sql = `
    INSERT INTO leads
    (stage, customer_name, email, phone, suburb, system_size_kw, value_amount,
     source, referred_by_lead_id, is_closed, is_won, won_lost_at, last_activity_at, site_inspection_date, 
     external_id, marketing_payload_json)
    VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)
  `;
  const params = [
    stage,
    customer_name,
    email,
    phone,
    suburb ?? null,
    system_size_kw == null ? null : Number(system_size_kw),
    value_amount == null ? null : Number(value_amount),
    source ?? null,
    referred_by_lead_id == null ? null : Number(referred_by_lead_id),
    is_closed ? 1 : 0,
    is_won ? 1 : 0,
    won_lost_at,
    site_inspection_date ?? null,
    external_id,
    marketing_payload_json
      ? (typeof marketing_payload_json === 'string' ? marketing_payload_json : JSON.stringify(marketing_payload_json))
      : null,
  ];

  const [result] = await db.execute(sql, params);
  if (!result?.affectedRows) {
    const err = new Error('Insert returned 0 affected rows');
    err.statusCode = 500;
    throw err;
  }
  const insertedId = result.insertId;

  const [rows] = await db.execute('SELECT * FROM leads WHERE id = ? LIMIT 1', [insertedId]);
  if (!rows?.[0]) {
    const err = new Error('Insert succeeded but row not found when re-querying');
    err.statusCode = 500;
    throw err;
  }

  const created = rows[0];
  if (created.is_won) {
    try {
      await ensureProjectForLead(created.id);
    } catch (e) {
      console.error('ensureProjectForLead after createLead failed:', e);
    }
  }

  return created;
}

/**
 * Bulk import leads.
 * @param {Array} leads
 * @returns {Promise<{ imported: number, failed: number, errors: Array<{ row: number, error: string }> }>}
 */
export async function importLeads(leads) {
  let imported = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    try {
      await createLead(lead);
      imported++;
    } catch (err) {
      failed++;
      errors.push({ row: i + 1, error: err.message, lead });
    }
  }

  return { imported, failed, errors };
}

/**
 * Get leads (optionally filterable). Returns flat array.
 * @param {{
 *   stage?: string,
 *   search?: string,
 *   assigned_user?: string,
 *   limit?: number,
 *   offset?: number
 * }} filters
 */
export async function getLeads(filters = {}) {
  const where = [];
  const params = [];

  if (filters.stage && STAGES.has(filters.stage)) {
    where.push('stage = ?');
    params.push(filters.stage);
  }
  if (filters.assigned_user) {
    where.push('assigned_user = ?');
    params.push(filters.assigned_user);
  }
  if (filters.search) {
    where.push('(customer_name LIKE ? OR suburb LIKE ? OR source LIKE ?)');
    const q = `%${filters.search}%`;
    params.push(q, q, q);
  }

  // When inspector_id is set, only return leads assigned to that inspector (join lead_site_inspections).
  const joinInspector =
    filters.inspector_id != null && Number.isInteger(Number(filters.inspector_id));
  if (joinInspector) {
    where.push('lsi.inspector_id = ?');
    params.push(Number(filters.inspector_id));
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const joinSql = joinInspector
    ? ' INNER JOIN lead_site_inspections lsi ON lsi.lead_id = leads.id '
    : '';
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
    SELECT leads.*
    FROM leads
    ${joinSql}
    ${whereSql}
    ORDER BY leads.last_activity_at DESC, leads.created_at DESC
    ${limitSql}
  `;
  const [rows] = await db.execute(sql, params);
  return rows;
}

/**
 * Get leads with site_inspection_date in the given date range (inclusive of start/end).
 * When inspectorId is set, only return leads assigned to that inspector.
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @param {number|null} [inspectorId] - optional; filter by lead_site_inspections.inspector_id
 * @returns {Promise<Array>}
 */
export async function getLeadsByDateRange(startDate, endDate, inspectorId = null) {
  if (
    !startDate ||
    !endDate ||
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
  ) {
    return [];
  }
  const startDt = `${startDate} 00:00:00`;

  const endNext = new Date(endDate + 'T12:00:00Z');
  endNext.setUTCDate(endNext.getUTCDate() + 1);
  const endNextStr = endNext.toISOString().slice(0, 10);
  const endDt = `${endNextStr} 00:00:00`;

  const joinInspector = inspectorId != null && Number.isInteger(Number(inspectorId));
  const joinSql = joinInspector
    ? ' INNER JOIN lead_site_inspections lsi ON lsi.lead_id = leads.id AND lsi.inspector_id = ? '
    : '';
  const whereSql =
    ' WHERE leads.site_inspection_date IS NOT NULL AND leads.site_inspection_date >= ? AND leads.site_inspection_date < ? ';
  const params = joinInspector ? [Number(inspectorId), startDt, endDt] : [startDt, endDt];

  const [rows] = await db.execute(
    `SELECT leads.* FROM leads ${joinSql} ${whereSql}
     ORDER BY leads.site_inspection_date ASC, leads.last_activity_at DESC`,
    params
  );
  return rows;
}

/** -------------------- COMMUNICATIONS (NEW) -------------------- */
export async function getLeadCommunications(leadId) {
  if (!leadId || Number.isNaN(Number(leadId))) {
    const err = new Error('Invalid lead id');
    err.statusCode = 400;
    throw err;
  }
  const [rows] = await db.execute(
    `SELECT id, lead_id, direction, channel, subject, body, automated,
            provider_message_id, related_message_id, sent_at, delivered_at, created_at
     FROM lead_communications
     WHERE lead_id = ?
     ORDER BY created_at DESC`,
    [leadId]
  );
  return rows;
}

/**
 * Optional helper to log a communication manually from API.
 */
export async function addLeadCommunication(leadId, {
  direction = 'outbound',
  channel = 'email',
  subject = null,
  body = null,
  automated = false,
  provider_message_id = null,
  related_message_id = null,
  sent_at = null,
  delivered_at = null,
}) {
  if (!leadId || Number.isNaN(Number(leadId))) {
    const err = new Error('Invalid lead id');
    err.statusCode = 400;
    throw err;
  }
  const [rows] = await db.execute('SELECT id FROM leads WHERE id = ? LIMIT 1', [leadId]);
  if (!rows?.[0]) {
    const err = new Error('Lead not found');
    err.statusCode = 404;
    throw err;
  }
  const sql = `
    INSERT INTO lead_communications
    (lead_id, direction, channel, subject, body, automated, provider_message_id, related_message_id, sent_at, delivered_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;
  const params = [
    Number(leadId),
    direction,
    channel,
    subject ?? null,
    body ?? null,
    automated ? 1 : 0,
    provider_message_id ?? null,
    related_message_id ?? null,
    sent_at ?? null,
    delivered_at ?? null,
  ];
  const [ins] = await db.execute(sql, params);
  if (!ins?.affectedRows) {
    const err = new Error('Insert communication returned 0 affected rows');
    err.statusCode = 500;
    throw err;
  }
  const insertedId = ins.insertId;
  const [commRows] = await db.execute(
    `SELECT id, lead_id, direction, channel, subject, body, automated, provider_message_id, related_message_id, sent_at, delivered_at, created_at
     FROM lead_communications WHERE id = ? LIMIT 1`,
    [insertedId]
  );
  return commRows[0];
}

/** -------------------- UPDATE LEAD -------------------- */
export async function updateLead(leadId, payload) {
  if (!leadId || Number.isNaN(Number(leadId))) {
    const err = new Error('Invalid lead id');
    err.statusCode = 400;
    throw err;
  }
  const [rows] = await db.execute('SELECT id FROM leads WHERE id = ? LIMIT 1', [leadId]);
  if (!rows[0]) {
    const err = new Error('Lead not found');
    err.statusCode = 404;
    throw err;
  }

  const {
    stage,
    customer_name,
    suburb,
    system_size_kw,
    value_amount,
    source,
    site_inspection_date,
  } = payload;

  const updates = [];
  const params = [];

  // Stage (if valid)
  if (stage !== undefined && STAGES.has(stage)) {
    const { is_closed, is_won } = deriveFlags(stage);
    updates.push('stage = ?', 'is_closed = ?', 'is_won = ?');
    params.push(stage, is_closed ? 1 : 0, is_won ? 1 : 0);

    // set contacted_at when entering 'contacted' (if null)
    updates.push(
      'contacted_at = CASE WHEN ? = "contacted" AND contacted_at IS NULL THEN NOW() ELSE contacted_at END'
    );
    params.push(stage);
  }

  // Core fields
  if (customer_name !== undefined) {
    updates.push('customer_name = ?');
    params.push(String(customer_name).trim());
  }
  if (suburb !== undefined) {
    updates.push('suburb = ?');
    params.push(suburb ? String(suburb).trim() : null);
  }
  if (system_size_kw !== undefined) {
    updates.push('system_size_kw = ?');
    params.push(system_size_kw == null ? null : Number(system_size_kw));
  }
  if (value_amount !== undefined) {
    updates.push('value_amount = ?');
    params.push(value_amount == null ? null : Number(value_amount));
  }
  if (source !== undefined) {
    updates.push('source = ?');
    params.push(source ? String(source).trim() : null);
  }
  if (site_inspection_date !== undefined) {
    updates.push('site_inspection_date = ?');
    params.push(site_inspection_date);
  }

  // NEW: System / Property / Utility
  if (payload.system_type !== undefined) {
    updates.push('system_type = ?');
    params.push(payload.system_type ?? null);
  }
  if (payload.house_storey !== undefined) {
    updates.push('house_storey = ?');
    params.push(payload.house_storey ?? null);
  }
  if (payload.roof_type !== undefined) {
    updates.push('roof_type = ?');
    params.push(payload.roof_type ?? null);
  }
  if (payload.meter_phase !== undefined) {
    updates.push('meter_phase = ?');
    params.push(payload.meter_phase ?? null);
  }
  if (payload.access_to_second_storey !== undefined) {
    updates.push('access_to_second_storey = ?');
    params.push(
      payload.access_to_second_storey == null ? null : (payload.access_to_second_storey ? 1 : 0),
    );
  }
  if (payload.access_to_inverter !== undefined) {
    updates.push('access_to_inverter = ?');
    params.push(
      payload.access_to_inverter == null ? null : (payload.access_to_inverter ? 1 : 0),
    );
  }
  if (payload.pre_approval_reference_no !== undefined) {
    updates.push('pre_approval_reference_no = ?');
    params.push(payload.pre_approval_reference_no ?? null);
  }
  if (payload.energy_retailer !== undefined) {
    updates.push('energy_retailer = ?');
    params.push(payload.energy_retailer ?? null);
  }
  if (payload.energy_distributor !== undefined) {
    updates.push('energy_distributor = ?');
    params.push(payload.energy_distributor ?? null);
  }
  if (payload.solar_vic_eligibility !== undefined) {
    updates.push('solar_vic_eligibility = ?');
    params.push(
      payload.solar_vic_eligibility == null ? null : (payload.solar_vic_eligibility ? 1 : 0),
    );
  }
  if (payload.nmi_number !== undefined) {
    updates.push('nmi_number = ?');
    params.push(payload.nmi_number ?? null);
  }
  if (payload.meter_number !== undefined) {
    updates.push('meter_number = ?');
    params.push(payload.meter_number ?? null);
  }

  // PV details
  if (payload.pv_system_size_kw !== undefined) {
    updates.push('pv_system_size_kw = ?');
    params.push(
      payload.pv_system_size_kw == null ? null : Number(payload.pv_system_size_kw),
    );
  }
  if (payload.pv_inverter_size_kw !== undefined) {
    updates.push('pv_inverter_size_kw = ?');
    params.push(
      payload.pv_inverter_size_kw == null ? null : Number(payload.pv_inverter_size_kw),
    );
  }
  if (payload.pv_inverter_brand !== undefined) {
    updates.push('pv_inverter_brand = ?');
    params.push(payload.pv_inverter_brand ?? null);
  }
  if (payload.pv_panel_brand !== undefined) {
    updates.push('pv_panel_brand = ?');
    params.push(payload.pv_panel_brand ?? null);
  }
  if (payload.pv_panel_module_watts !== undefined) {
    updates.push('pv_panel_module_watts = ?');
    params.push(
      payload.pv_panel_module_watts == null ? null : Number(payload.pv_panel_module_watts),
    );
  }

  // EV charger details
  if (payload.ev_charger_brand !== undefined) {
    updates.push('ev_charger_brand = ?');
    params.push(payload.ev_charger_brand ?? null);
  }
  if (payload.ev_charger_model !== undefined) {
    updates.push('ev_charger_model = ?');
    params.push(payload.ev_charger_model ?? null);
  }

  // Battery details
  if (payload.battery_size_kwh !== undefined) {
    updates.push('battery_size_kwh = ?');
    params.push(
      payload.battery_size_kwh == null ? null : Number(payload.battery_size_kwh),
    );
  }
  if (payload.battery_brand !== undefined) {
    updates.push('battery_brand = ?');
    params.push(payload.battery_brand ?? null);
  }
  if (payload.battery_model !== undefined) {
    updates.push('battery_model = ?');
    params.push(payload.battery_model ?? null);
  }

  // Handle inline assignment of inspector
  if (payload.inspector_id !== undefined) {
    // inspector_id will be saved down below or we can update `lead_site_inspections` here
    await saveLeadInspector(leadId, payload.inspector_id);
  }

  // No fields to update -> return current row
  if (updates.length === 0) {
    const [updated] = await db.execute('SELECT * FROM leads WHERE id = ? LIMIT 1', [leadId]);
    return updated[0];
  }

  // Touch last_activity_at
  updates.push('last_activity_at = NOW()');
  params.push(leadId);

  const sql = `UPDATE leads SET ${updates.join(', ')} WHERE id = ?`;
  await db.execute(sql, params);

  const [updated] = await db.execute('SELECT * FROM leads WHERE id = ? LIMIT 1', [leadId]);
  return updated[0];
}

/** -------------------- UPDATE STAGE (set contacted_at when entering 'contacted') -------------------- */
export async function updateLeadStage(leadId, nextStage) {
  if (!leadId || Number.isNaN(Number(leadId))) {
    const err = new Error('Invalid lead id');
    err.statusCode = 400;
    throw err;
  }
  if (!STAGES.has(nextStage)) {
    const err = new Error('Invalid stage');
    err.statusCode = 400;
    throw err;
  }

  const [rows] = await db.execute('SELECT id, stage, is_closed FROM leads WHERE id = ? LIMIT 1', [leadId]);
  const current = rows[0];
  if (!current) {
    const err = new Error('Lead not found');
    err.statusCode = 404;
    throw err;
  }

  const { is_closed, is_won } = deriveFlags(nextStage);
  const enteringClosed = !current.is_closed && is_closed;
  const leavingClosed = current.is_closed && !is_closed;

  let wonLostSql = 'won_lost_at = won_lost_at';
  if (enteringClosed) {
    wonLostSql = 'won_lost_at = NOW()';
  } else if (leavingClosed) {
    wonLostSql = 'won_lost_at = NULL';
  } else if (is_closed) {
    wonLostSql = 'won_lost_at = NOW()';
  }

  const sql = `
    UPDATE leads
    SET
      stage = ?,
      is_closed = ?,
      is_won = ?,
      ${wonLostSql},
      contacted_at = CASE WHEN ? = 'contacted' AND contacted_at IS NULL THEN NOW() ELSE contacted_at END,
      last_activity_at = NOW()
    WHERE id = ?
  `;
  const params = [nextStage, is_closed ? 1 : 0, is_won ? 1 : 0, nextStage, leadId];

  await db.execute(sql, params);
  const [updated] = await db.execute('SELECT * FROM leads WHERE id = ? LIMIT 1', [leadId]);
  const lead = updated[0];

  let project = null;
  if (nextStage === 'closed_won') {
    try {
      project = await ensureProjectForLead(leadId);
    } catch (e) {
      console.error('ensureProjectForLead after updateLeadStage failed:', e);
    }
  }
  if (project?.id && !lead.project_id) {
    lead.project_id = project.id;
  }
  return lead;
}

async function saveLeadInspector(leadId, inspectorId) {
  if (!inspectorId) return;

  // Get inspector_name
  const [empRows] = await db.execute('SELECT first_name, last_name FROM employees WHERE id = ? LIMIT 1', [inspectorId]);
  if (!empRows[0]) {
    const err = new Error('Inspector not found');
    err.statusCode = 404;
    throw err;
  }
  const inspectorName = `${empRows[0].first_name} ${empRows[0].last_name}`.trim();

  const [inspRows] = await db.execute('SELECT id FROM lead_site_inspections WHERE lead_id = ? LIMIT 1', [leadId]);
  if (inspRows[0]) {
    await db.execute(
      'UPDATE lead_site_inspections SET inspector_id = ?, inspector_name = ? WHERE lead_id = ?',
      [inspectorId, inspectorName, leadId]
    );
  } else {
    await db.execute(
      'INSERT INTO lead_site_inspections (lead_id, inspector_id, inspector_name, status) VALUES (?, ?, ?, ?)',
      [leadId, inspectorId, inspectorName, 'draft']
    );
  }
}

/** -------------------- SCHEDULE INSPECTION -------------------- */
export async function scheduleLeadInspection(leadId, payload) {
  const { scheduledDate, scheduledTime, inspectorId } = payload;
  if (!leadId || !scheduledDate || !scheduledTime || !inspectorId) {
    const err = new Error('Missing required scheduling fields');
    err.statusCode = 400;
    throw err;
  }

  // 1. Get inspector_name
  const [empRows] = await db.execute('SELECT first_name, last_name FROM employees WHERE id = ? LIMIT 1', [inspectorId]);
  if (!empRows[0]) {
    const err = new Error('Inspector not found');
    err.statusCode = 404;
    throw err;
  }
  const inspectorName = `${empRows[0].first_name} ${empRows[0].last_name}`.trim();

  const site_inspection_date = `${scheduledDate} ${scheduledTime}:00`;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 2. Update leads table: site_inspection_date, stage='inspection_booked'
    const [current] = await conn.execute('SELECT stage FROM leads WHERE id = ? LIMIT 1', [leadId]);
    if (!current[0]) {
      const err = new Error('Lead not found');
      err.statusCode = 404;
      throw err;
    }

    // Only set to inspection_booked if the stage is before it or contacted/qualified etc (unless closed)
    // For simplicity, we just set the site_inspection_date, and update stage to 'inspection_booked'
    await conn.execute(
      `UPDATE leads 
       SET site_inspection_date = ?, 
           stage = 'inspection_booked', 
           last_activity_at = NOW() 
       WHERE id = ? AND stage NOT IN ('closed_won', 'closed_lost')`,
      [site_inspection_date, leadId]
    );
    // If it was closed, we still want to set the date, just not change the stage:
    await conn.execute(
      `UPDATE leads 
       SET site_inspection_date = ?, 
           last_activity_at = NOW() 
       WHERE id = ? AND stage IN ('closed_won', 'closed_lost')`,
      [site_inspection_date, leadId]
    );

    // 3. Update or Insert lead_site_inspections (store scheduled_at = date+time)
    const [inspRows] = await conn.execute('SELECT id FROM lead_site_inspections WHERE lead_id = ? LIMIT 1', [leadId]);
    if (inspRows[0]) {
      await conn.execute(
        'UPDATE lead_site_inspections SET inspector_id = ?, inspector_name = ?, scheduled_at = ? WHERE lead_id = ?',
        [inspectorId, inspectorName, site_inspection_date, leadId]
      );
    } else {
      await conn.execute(
        'INSERT INTO lead_site_inspections (lead_id, inspector_id, inspector_name, scheduled_at, status) VALUES (?, ?, ?, ?, ?)',
        [leadId, inspectorId, inspectorName, site_inspection_date, 'draft']
      );
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  // Fetch updated lead
  const [updatedLead] = await db.execute('SELECT * FROM leads WHERE id = ? LIMIT 1', [leadId]);
  return updatedLead[0];
}

/** -------------------- NOTES -------------------- */
export async function addLeadNote(leadId, { body, followUpAt = null, createdBy = null }) {
  if (!leadId || Number.isNaN(Number(leadId))) {
    const err = new Error('Invalid lead id');
    err.statusCode = 400;
    throw err;
  }
  const [rows] = await db.execute('SELECT id FROM leads WHERE id = ? LIMIT 1', [leadId]);
  if (!rows?.[0]) {
    const err = new Error('Lead not found');
    err.statusCode = 404;
    throw err;
  }
  const sql = `
    INSERT INTO lead_notes (lead_id, body, follow_up_at, created_by)
    VALUES (?, ?, ?, ?)
  `;
  const params = [Number(leadId), String(body), followUpAt ?? null, createdBy ?? null];
  const [ins] = await db.execute(sql, params);
  if (!ins?.affectedRows) {
    const err = new Error('Insert note returned 0 affected rows');
    err.statusCode = 500;
    throw err;
  }
  await db.execute('UPDATE leads SET last_activity_at = NOW() WHERE id = ?', [leadId]);
  const insertedId = ins.insertId;
  const [noteRows] = await db.execute(
    'SELECT id, lead_id, body, follow_up_at, created_by, created_at FROM lead_notes WHERE id = ? LIMIT 1',
    [insertedId],
  );
  return noteRows[0];
}

/** -------------------- NOTES: LIST -------------------- */
export async function getLeadNotes(leadId) {
  if (!leadId || Number.isNaN(Number(leadId))) {
    const err = new Error('Invalid lead id');
    err.statusCode = 400;
    throw err;
  }
  const [rows] = await db.execute(
    'SELECT id, lead_id, body, follow_up_at, created_by, created_at FROM lead_notes WHERE lead_id = ? ORDER BY created_at DESC',
    [leadId],
  );
  return rows;
}

/** -------------------- GET BY ID (activities from notes + communications) -------------------- */
export async function getLeadById(leadId) {
  if (!leadId || Number.isNaN(Number(leadId))) {
    const err = new Error('Invalid lead id');
    err.statusCode = 400;
    throw err;
  }

  const [rows] = await db.execute('SELECT * FROM leads WHERE id = ? LIMIT 1', [leadId]);
  const lead = rows[0];
  if (!lead) {
    const err = new Error('Lead not found');
    err.statusCode = 404;
    throw err;
  }

  const [inspRows] = await db.execute('SELECT inspector_id, inspector_name FROM lead_site_inspections WHERE lead_id = ? LIMIT 1', [leadId]);
  if (inspRows[0]) {
    if (inspRows[0].inspector_name) lead.inspector_name = inspRows[0].inspector_name;
    if (inspRows[0].inspector_id != null) lead.inspector_id = inspRows[0].inspector_id;
  }

  const notes = await getLeadNotes(leadId);
  const activities = notes.map((n) => ({
    id: `note-${n.id}`,
    type: 'note',
    title: 'Comment added',
    created_at: n.created_at,
    body: n.body + (n.follow_up_at ? `\n\nNext follow-up: ${String(n.follow_up_at).slice(0, 10)}` : ''),
  }));

  let referredBy = null;
  const refLeadId = lead.referred_by_lead_id;
  if (refLeadId != null && Number(refLeadId)) {
    const [refRows] = await db.execute(
      'SELECT id, customer_name, email FROM leads WHERE id = ? LIMIT 1',
      [refLeadId]
    );
    if (refRows?.[0]) {
      referredBy = {
        id: refRows[0].id,
        customer_name: refRows[0].customer_name,
        email: refRows[0].email,
      };
    }
  }
  const communications = await getLeadCommunications(leadId);

  return {
    lead,
    referredBy,
    activities,
    documents: [],
    communications,
  };
}

// ─── Sales Dashboard Metrics (T-037) ─────────────────────────────────────────

/**
 * Compute date window boundaries from a named range or explicit from/to.
 * Returns { from: Date, to: Date, prevFrom: Date, prevTo: Date }
 */
function resolveDateRange(range = 'month', customFrom = null, customTo = null) {
  const now = new Date();
  let from, to;

  if (range === 'custom' && customFrom && customTo) {
    from = new Date(customFrom);
    to   = new Date(customTo);
    to.setHours(23, 59, 59, 999);
  } else if (range === 'week') {
    // Mon → today
    const day = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0=Mon
    from = new Date(now); from.setDate(now.getDate() - day); from.setHours(0, 0, 0, 0);
    to   = new Date(now); to.setHours(23, 59, 59, 999);
  } else if (range === 'quarter') {
    const q = Math.floor(now.getMonth() / 3);
    from = new Date(now.getFullYear(), q * 3, 1, 0, 0, 0, 0);
    to   = new Date(now); to.setHours(23, 59, 59, 999);
  } else {
    // month (default)
    from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    to   = new Date(now); to.setHours(23, 59, 59, 999);
  }

  // Previous period: same length immediately before `from`
  const periodMs = to.getTime() - from.getTime();
  const prevTo   = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - periodMs);

  return { from, to, prevFrom, prevTo };
}

function toSQL(d) {
  const p = v => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function calcDelta(curr, prev) {
  if (!prev || prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

/**
 * GET /api/leads/dashboard
 * Returns 6 KPI metrics + trend indicators + pipeline_by_stage + leads_by_source.
 */
export async function getSalesDashboardMetrics({ range = 'month', customFrom = null, customTo = null } = {}) {
  const { from, to, prevFrom, prevTo } = resolveDateRange(range, customFrom, customTo);
  const f  = toSQL(from);
  const t  = toSQL(to);
  const pf = toSQL(prevFrom);
  const pt = toSQL(prevTo);

  // ── Current period aggregate ──
  const [[curr]] = await db.execute(
    `SELECT
       COUNT(*) AS total_leads,
       COUNT(CASE WHEN stage != 'new' THEN 1 END) AS leads_contacted,
       COUNT(CASE WHEN stage = 'closed_won' THEN 1 END) AS closed_won,
       COUNT(CASE WHEN stage IN ('proposal_sent','negotiation','closed_won','closed_lost') THEN 1 END) AS proposals_sent,
       SUM(CASE WHEN is_closed = 0 AND value_amount IS NOT NULL THEN value_amount ELSE 0 END) AS pipeline_value
     FROM leads
     WHERE created_at BETWEEN ? AND ?`,
    [f, t]
  );

  // ── Previous period aggregate ──
  const [[prev]] = await db.execute(
    `SELECT
       COUNT(*) AS total_leads,
       COUNT(CASE WHEN stage != 'new' THEN 1 END) AS leads_contacted,
       COUNT(CASE WHEN stage = 'closed_won' THEN 1 END) AS closed_won,
       COUNT(CASE WHEN stage IN ('proposal_sent','negotiation','closed_won','closed_lost') THEN 1 END) AS proposals_sent,
       SUM(CASE WHEN is_closed = 0 AND value_amount IS NOT NULL THEN value_amount ELSE 0 END) AS pipeline_value
     FROM leads
     WHERE created_at BETWEEN ? AND ?`,
    [pf, pt]
  );

  const cTotal   = Number(curr.total_leads       ?? 0);
  const cContact = Number(curr.leads_contacted    ?? 0);
  const cWon     = Number(curr.closed_won         ?? 0);
  const cProp    = Number(curr.proposals_sent     ?? 0);
  const cPipe    = Number(curr.pipeline_value     ?? 0);
  const cConv    = cTotal > 0 ? parseFloat(((cWon / cTotal) * 100).toFixed(1)) : 0;

  const pTotal   = Number(prev.total_leads        ?? 0);
  const pContact = Number(prev.leads_contacted    ?? 0);
  const pWon     = Number(prev.closed_won         ?? 0);
  const pProp    = Number(prev.proposals_sent     ?? 0);
  const pPipe    = Number(prev.pipeline_value     ?? 0);
  const pConv    = pTotal > 0 ? parseFloat(((pWon / pTotal) * 100).toFixed(1)) : 0;

  // ── Pipeline value by stage (open leads only) ──
  const STAGE_LABELS = {
    new: 'New', contacted: 'Contacted', qualified: 'Qualified',
    inspection_booked: 'Inspection Booked', inspection_completed: 'Inspection Done',
    proposal_sent: 'Proposal Sent', negotiation: 'Negotiation',
  };
  const [stageRows] = await db.execute(
    `SELECT stage, COUNT(*) AS count, COALESCE(SUM(value_amount), 0) AS value
     FROM leads
     WHERE is_closed = 0
       AND created_at BETWEEN ? AND ?
     GROUP BY stage
     ORDER BY FIELD(stage, 'new','contacted','qualified','inspection_booked','inspection_completed','proposal_sent','negotiation')`,
    [f, t]
  );

  // ── Leads by source (top 8, current period) ──
  const [sourceRows] = await db.execute(
    `SELECT COALESCE(NULLIF(TRIM(source),''), 'Unknown') AS source, COUNT(*) AS count
     FROM leads
     WHERE created_at BETWEEN ? AND ?
     GROUP BY source
     ORDER BY count DESC
     LIMIT 8`,
    [f, t]
  );

  // ── Closed Won trend over period days (for sparkline) ──
  const [wonTrend] = await db.execute(
    `SELECT DATE(won_lost_at) AS day, COUNT(*) AS count
     FROM leads
     WHERE is_won = 1 AND won_lost_at BETWEEN ? AND ?
     GROUP BY DATE(won_lost_at)
     ORDER BY day ASC`,
    [f, t]
  );

  return {
    period: { from: f, to: t, prevFrom: pf, prevTo: pt },
    metrics: {
      total_leads:     { value: cTotal,  prev: pTotal,  delta: calcDelta(cTotal,  pTotal)  },
      leads_contacted: { value: cContact,prev: pContact, delta: calcDelta(cContact,pContact)},
      conversion_rate: { value: cConv,   prev: pConv,   delta: calcDelta(cConv,   pConv)   },
      pipeline_value:  { value: cPipe,   prev: pPipe,   delta: calcDelta(cPipe,   pPipe)   },
      proposals_sent:  { value: cProp,   prev: pProp,   delta: calcDelta(cProp,   pProp)   },
      closed_won:      { value: cWon,    prev: pWon,    delta: calcDelta(cWon,    pWon)    },
    },
    pipeline_by_stage: stageRows.map(r => ({
      stage: r.stage,
      label: STAGE_LABELS[r.stage] ?? r.stage,
      count: Number(r.count),
      value: Number(r.value),
    })),
    leads_by_source: sourceRows.map(r => ({
      source: r.source,
      count:  Number(r.count),
    })),
    won_trend: wonTrend.map(r => ({ day: r.day, count: Number(r.count) })),
  };
}

/**
 * Team performance aggregation per assigned_user_id within the same date window
 * used by getSalesDashboardMetrics (created_at between from/to).
 */
export async function getTeamPerformance({ range = 'month', customFrom = null, customTo = null } = {}) {
  const { from, to } = resolveDateRange(range, customFrom, customTo);
  const f = toSQL(from);
  const t = toSQL(to);

  const sql = `
    SELECT
      u.id   AS user_id,
      u.name AS user_name,
      COUNT(l.id) AS total_leads,
      COUNT(CASE WHEN l.stage <> 'new' THEN 1 END) AS leads_contacted,
      COUNT(CASE WHEN l.stage IN ('proposal_sent','negotiation','closed_won','closed_lost') THEN 1 END) AS proposals_sent,
      COUNT(CASE WHEN l.stage = 'closed_won' THEN 1 END) AS closed_won
    FROM leads l
    JOIN users u ON u.id = l.assigned_user_id
    WHERE l.created_at BETWEEN ? AND ?
    GROUP BY u.id, u.name
    ORDER BY leads_contacted DESC, user_name ASC
  `;

  const [rows] = await db.execute(sql, [f, t]);

  return rows.map(row => {
    const total = Number(row.total_leads ?? 0);
    const won   = Number(row.closed_won ?? 0);
    const closeRate = total > 0 ? parseFloat(((won / total) * 100).toFixed(1)) : 0;
    return {
      user_id: row.user_id,
      user_name: row.user_name,
      leads_contacted: Number(row.leads_contacted ?? 0),
      proposals_sent: Number(row.proposals_sent ?? 0),
      closed_won: won,
      total_leads: total,
      close_rate: closeRate,
    };
  });
}

export async function countLeads({ stage, search } = {}) {
  const where = [];
  const args = [];

  if (stage) {
    where.push('stage = ?');
    args.push(stage);
  }
  if (search) {
    where.push('(customer_name LIKE ? OR suburb LIKE ? OR source LIKE ?)');
    const q = `%${search}%`;
    args.push(q, q, q);
  }

  const sql = `
    SELECT COUNT(*) AS total
    FROM leads
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
  `;
  const [rows] = await db.execute(sql, args);
  return rows?.[0]?.total ?? 0;
}

async function ensureProjectForLead(leadId) {
  const [rows] = await db.execute(
    'SELECT id, customer_name, email, phone, suburb, system_size_kw, value_amount FROM leads WHERE id = ? LIMIT 1',
    [leadId]
  );
  const lead = rows?.[0];
  if (!lead) {
    const err = new Error('Lead not found for project creation');
    err.statusCode = 404;
    throw err;
  }

  const sqlInsert = `
    INSERT INTO projects (lead_id, stage, customer_name, email, phone, suburb, system_size_kw, value_amount)
    VALUES (?, 'new', ?, ?, ?, ?, ?, ?)
  `;
  try {
    await db.execute(sqlInsert, [
      lead.id,
      lead.customer_name,
      lead.email ?? null,
      lead.phone ?? null,
      lead.suburb ?? null,
      lead.system_size_kw == null ? null : Number(lead.system_size_kw),
      lead.value_amount == null ? null : Number(lead.value_amount),
    ]);
  } catch (e) {
    if (e.code !== 'ER_DUP_ENTRY') throw e;
  }

  const [projRows] = await db.execute('SELECT * FROM projects WHERE lead_id = ? LIMIT 1', [leadId]);
  return projRows?.[0] ?? null;
}