// src/services/leadsService.js
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
    marketing_payload_json ? (typeof marketing_payload_json === 'string' ? marketing_payload_json : JSON.stringify(marketing_payload_json)) : null,
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

  return rows[0];
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
    SELECT *
    FROM leads
    ${whereSql}
    ORDER BY last_activity_at DESC, created_at DESC
    ${limitSql}
  `;

  const [rows] = await db.execute(sql, params);
  return rows;
}

/**
 * Get leads with site_inspection_date in the given date range (inclusive of start/end).
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Array>}
 */
export async function getLeadsByDateRange(startDate, endDate) {
  if (!startDate || !endDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return [];
  }
  const startDt = `${startDate} 00:00:00`;
  const endNext = new Date(endDate + 'T12:00:00Z');
  endNext.setUTCDate(endNext.getUTCDate() + 1);
  const endNextStr = endNext.toISOString().slice(0, 10);
  const endDt = `${endNextStr} 00:00:00`;

  const [rows] = await db.execute(
    `SELECT * FROM leads
     WHERE site_inspection_date IS NOT NULL AND site_inspection_date >= ? AND site_inspection_date < ?
     ORDER BY site_inspection_date ASC, last_activity_at DESC`,
    [startDt, endDt]
  );
  return rows;
}

/**
 * Get a single lead by id (with relations placeholder).
 * Returns { lead, activities: [], documents: [], communications: [] } for future relations.
 */
/*export async function getLeadById(leadId) {
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
  return {
    lead,
    activities: [],
    documents: [],
    communications: [],
  };
}*/

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

  // Stage (nếu hợp lệ)
  if (stage !== undefined && STAGES.has(stage)) {
    const { is_closed, is_won } = deriveFlags(stage);
    updates.push('stage = ?', 'is_closed = ?', 'is_won = ?');
    params.push(stage, is_closed ? 1 : 0, is_won ? 1 : 0);
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

  // Không có gì để cập nhật -> trả về hiện trạng
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

  // Fetch current lead to decide how to handle won_lost_at
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

  // won_lost_at logic:
  //  - enteringClosed → NOW()
  //  - leavingClosed → NULL
  //  - staying in same “closedness” (e.g., closed_won → closed_lost) → keep NOW() by re-setting to NOW()
  let wonLostSql = 'won_lost_at = won_lost_at'; // default: unchanged
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
      last_activity_at = NOW()
    WHERE id = ?
  `;
  const params = [nextStage, is_closed ? 1 : 0, is_won ? 1 : 0, leadId];

  await db.execute(sql, params);

  const [updated] = await db.execute('SELECT * FROM leads WHERE id = ? LIMIT 1', [leadId]);
  return updated[0];
}


export async function addLeadNote(leadId, { body, followUpAt = null, createdBy = null }) {
  if (!leadId || Number.isNaN(Number(leadId))) {
    const err = new Error('Invalid lead id');
    err.statusCode = 400;
    throw err;
  }
  // Ensure lead exists
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

  // Touch last_activity_at on the lead
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

/** -------------------- GET BY ID (with real activities from notes) -------------------- */
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

  // Pull notes as activities for the timeline
  const notes = await getLeadNotes(leadId);
  const activities = notes.map((n) => ({
    id: `note-${n.id}`,
    type: 'note',
    title: 'Comment added',
    created_at: n.created_at,
    body: n.body + (n.follow_up_at ? `\n\nNext follow-up: ${String(n.follow_up_at).slice(0, 10)}` : ''),
  }));

  // If this lead was referred by a customer, fetch referrer info for CRM display
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

  return {
    lead,
    referredBy,
    activities,
    documents: [],
    communications: [],
  };
}
