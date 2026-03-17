import db from '../config/db.js';

/**
 * Insert activity log row.
 * @param {object} params
 * @param {number|null} params.companyId
 * @param {number|null} params.userId
 * @param {number|null} params.leadId
 * @param {'lead_created'|'stage_changed'|'proposal_sent'|'call_logged'} params.actionType
 * @param {string} params.description
 * @param {object|null} params.meta
 */
export async function logActivity({
  companyId = null,
  userId = null,
  leadId = null,
  actionType,
  description,
  meta = null,
}) {
  if (!actionType || !description) return;
  const sql = `
    INSERT INTO activity_logs
      (company_id, user_id, lead_id, action_type, description, meta_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const metaJson =
    meta == null
      ? null
      : typeof meta === 'string'
      ? meta
      : JSON.stringify(meta);

  await db.execute(sql, [
    companyId ?? null,
    userId ?? null,
    leadId ?? null,
    actionType,
    description.slice(0, 255),
    metaJson,
  ]);
}

/**
 * Recent activity feed for a company (or all when companyId is null).
 * Returns latest `limit` rows with user + lead info.
 */
export async function getRecentActivity({ companyId = null, limit = 50, offset = 0 } = {}) {
  const where = [];
  const params = [];
  if (companyId != null) {
    where.push('al.company_id = ?');
    params.push(companyId);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sql = `
    SELECT
      al.id,
      al.action_type,
      al.description,
      al.created_at,
      al.lead_id,
      al.user_id,
      u.name       AS user_name,
      u.email      AS user_email,
      l.customer_name,
      l.stage      AS lead_stage
    FROM activity_logs al
    LEFT JOIN users u  ON u.id  = al.user_id
    LEFT JOIN leads l  ON l.id  = al.lead_id
    ${whereSql}
    ORDER BY al.created_at DESC, al.id DESC
    LIMIT ? OFFSET ?
  `;
  params.push(Number(limit) || 50, Number(offset) || 0);

  const [rows] = await db.execute(sql, params);
  return rows;
}

