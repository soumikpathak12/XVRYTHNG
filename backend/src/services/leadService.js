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
    suburb,
    system_size_kw,
    value_amount,
    source,site_inspection_date
  } = payload;

  if (!STAGES.has(stage)) {
    const err = new Error('Invalid stage');
    err.statusCode = 400;
    throw err;
  }

  const { is_closed, is_won } = deriveFlags(stage);

  const sql = `
    INSERT INTO leads
      (stage, customer_name, suburb, system_size_kw, value_amount,
       source, is_closed, is_won, won_lost_at, last_activity_at,site_inspection_date)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 1 THEN NOW() ELSE NULL END, NOW(),?)
  `;

  //            stage
  //            customer_name
  //            suburb
  //            system_size_kw
  //            value_amount
  //            source
  //            is_closed
  //            is_won
  //            [CASE flag: is_closed ? 1 : 0]
  const params = [
    stage,
    customer_name,
    suburb,
    system_size_kw,
    value_amount,
    source,
    is_closed ? 1 : 0,
    is_won ? 1 : 0,
    is_closed ? 1 : 0,
    site_inspection_date ?? null,
  ];

  const [result] = await db.execute(sql, params);
  const insertedId = result.insertId;

  const [rows] = await db.execute('SELECT * FROM leads WHERE id = ?', [insertedId]);
  return rows[0];
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
