/**
 * Support ticket service – customer portal tickets, liaison routing (T-335, T-337, T-340).
 */
import db from '../config/db.js';
import * as referralService from './referralService.js';

const STATUSES = new Set(['open', 'in_progress', 'resolved', 'closed', 'withdrawn']);
const PRIORITIES = new Set(['low', 'medium', 'high', 'urgent']);
const CATEGORIES = new Set(['installation', 'referral', 'others']);
const COMPENSATION_STATUSES = new Set([
  'none',
  'company_due',
  'company_paid',
  'xvrything_paid',
  'company_removed',
]);

function addMinutes(date, minutes) {
  const ts = new Date(date).getTime();
  return new Date(ts + Math.max(0, Number(minutes) || 0) * 60000);
}

function serializeSupportPolicy(settings) {
  return {
    enabled: true,
    responseMinutes: Number(settings.supportResponseMinutes) || 90,
    companyCompensationAmount: Number(settings.supportCompensationAmount) || 50,
    escalationAmount: Number(settings.supportEscalationAmount) || 250,
    autoRemoveCompany: Boolean(settings.supportAutoRemoveCompany),
  };
}

async function getSupportPolicy() {
  const settings = await referralService.getSettings();
  return serializeSupportPolicy(settings || referralService.getDefaultSettings());
}

function withPolicyState(ticket) {
  if (!ticket) return ticket;
  const isClosedLike = ['closed', 'resolved', 'withdrawn'].includes(ticket.status);
  const dueAt = ticket.response_due_at ? new Date(ticket.response_due_at) : null;
  const isSlaBreached = Boolean(
    dueAt && !ticket.first_staff_reply_at && !isClosedLike && Date.now() > dueAt.getTime()
  );
  const effectiveCompensationStatus =
    isSlaBreached && ticket.compensation_status === 'none'
      ? 'company_due'
      : ticket.compensation_status || 'none';
  return {
    ...ticket,
    is_sla_breached: isSlaBreached,
    effective_compensation_status: effectiveCompensationStatus,
  };
}

/**
 * Route ticket to liaison based on project (lead).
 * Uses lead.assigned_user_id if set; else first company_admin/manager in lead.company_id.
 * Returns null if columns don't exist (migration 005 not run) or no liaison found.
 */
async function resolveLiaison(leadId) {
  try {
    const [leadRows] = await db.execute(
      'SELECT assigned_user_id, company_id FROM leads WHERE id = ? LIMIT 1',
      [Number(leadId)]
    );
    const lead = leadRows?.[0];
    if (!lead) return null;

    if (lead.assigned_user_id) return lead.assigned_user_id;
    const companyId = lead.company_id;
    if (!companyId) return null;

    const [userRows] = await db.execute(
      `SELECT u.id FROM users u
       INNER JOIN roles r ON u.role_id = r.id
       WHERE u.company_id = ? AND u.status = 'active'
         AND r.name IN ('company_admin', 'manager')
       ORDER BY FIELD(r.name, 'company_admin', 'manager')
       LIMIT 1`,
      [companyId]
    );
    return userRows?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Create a support ticket. Routes to liaison based on lead/project.
 */
export async function createTicket({ leadId, subject, body, priority = 'medium', category = 'installation', categoryOther = null }) {
  if (!leadId || Number.isNaN(Number(leadId))) {
    const err = new Error('Invalid lead id');
    err.statusCode = 400;
    throw err;
  }
  if (!subject || !String(subject).trim()) {
    const err = new Error('Subject is required');
    err.statusCode = 400;
    throw err;
  }
  if (!body || !String(body).trim()) {
    const err = new Error('Message is required');
    err.statusCode = 400;
    throw err;
  }
  if (priority && !PRIORITIES.has(priority)) {
    const err = new Error('Invalid priority');
    err.statusCode = 400;
    throw err;
  }
  const cat = (category || 'installation').toLowerCase();
  if (!CATEGORIES.has(cat)) {
    const err = new Error('Invalid category');
    err.statusCode = 400;
    throw err;
  }
  if (cat === 'others' && (!categoryOther || !String(categoryOther).trim())) {
    const err = new Error('Please specify the issue category when selecting "Others"');
    err.statusCode = 400;
    throw err;
  }

  let companyId = null;
  try {
    const [leadRows] = await db.execute(
      'SELECT id, company_id FROM leads WHERE id = ? LIMIT 1',
      [Number(leadId)]
    );
    companyId = leadRows?.[0]?.company_id ?? null;
  } catch {
    // company_id may not exist on leads yet
  }
  const [leadRows] = await db.execute(
    'SELECT id FROM leads WHERE id = ? LIMIT 1',
    [Number(leadId)]
  );
  const lead = leadRows?.[0];
  if (!lead) {
    const err = new Error('Lead not found');
    err.statusCode = 404;
    throw err;
  }

  const assignedUserId = await resolveLiaison(Number(leadId));
  const supportPolicy = await getSupportPolicy();
  const responseDueAt = supportPolicy.enabled ? addMinutes(new Date(), supportPolicy.responseMinutes) : null;
  const policySnapshot = JSON.stringify(supportPolicy);

  const categoryOtherVal = cat === 'others' ? String(categoryOther).trim().slice(0, 255) : null;
  const [result] = await db.execute(
    `INSERT INTO support_tickets (
      lead_id, company_id, subject, category, category_other, body, status, priority, assigned_user_id,
      response_due_at, company_compensation_amount, xvrything_compensation_amount, compensation_status, policy_snapshot_json
    )
     VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, 'none', ?)`,
    [
      Number(leadId),
      companyId,
      String(subject).trim().slice(0, 255),
      cat,
      categoryOtherVal,
      String(body).trim(),
      priority || 'medium',
      assignedUserId,
      responseDueAt,
      supportPolicy.companyCompensationAmount,
      supportPolicy.escalationAmount,
      policySnapshot,
    ]
  );
  const ticketId = result.insertId;

  // Insert initial reply (customer's message as first reply for thread consistency)
  await db.execute(
    `INSERT INTO support_ticket_replies (ticket_id, author_type, author_lead_id, body)
     VALUES (?, 'customer', ?, ?)`,
    [ticketId, Number(leadId), String(body).trim()]
  );

  const [rows] = await db.execute(
    'SELECT * FROM support_tickets WHERE id = ? LIMIT 1',
    [ticketId]
  );
  return withPolicyState(rows[0]);
}

/**
 * List tickets for a customer (by lead_id).
 */
export async function listTicketsByLead(leadId) {
  if (!leadId || Number.isNaN(Number(leadId))) {
    const err = new Error('Invalid lead id');
    err.statusCode = 400;
    throw err;
  }
  const [rows] = await db.execute(
    `SELECT id, lead_id, subject, status, priority, assigned_user_id, created_at, updated_at,
            response_due_at, first_staff_reply_at, company_compensation_amount,
            xvrything_compensation_amount, compensation_status, company_compensation_paid_at,
            xvrything_compensation_paid_at, company_removed_at
     FROM support_tickets
     WHERE lead_id = ?
     ORDER BY updated_at DESC, created_at DESC`,
    [Number(leadId)]
  );
  return rows.map(withPolicyState);
}

/**
 * Get ticket by id, ensuring it belongs to the given lead.
 */
export async function getTicketById(ticketId, leadId) {
  if (!ticketId || Number.isNaN(Number(ticketId))) {
    const err = new Error('Invalid ticket id');
    err.statusCode = 400;
    throw err;
  }
  if (!leadId || Number.isNaN(Number(leadId))) {
    const err = new Error('Invalid lead id');
    err.statusCode = 400;
    throw err;
  }
  const [rows] = await db.execute(
    'SELECT * FROM support_tickets WHERE id = ? AND lead_id = ? LIMIT 1',
    [Number(ticketId), Number(leadId)]
  );
  const ticket = rows?.[0];
  if (!ticket) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }
  return withPolicyState(ticket);
}

/**
 * Get ticket with replies (thread-style).
 */
export async function getTicketWithReplies(ticketId, leadId) {
  const ticket = await getTicketById(ticketId, leadId);
  const [replies] = await db.execute(
    `SELECT id, ticket_id, author_type, author_lead_id, author_user_id, body, created_at
     FROM support_ticket_replies
     WHERE ticket_id = ?
     ORDER BY created_at ASC`,
    [Number(ticketId)]
  );
  return { ticket, replies };
}

/**
 * List tickets for admin (filtered by company, status; super_admin sees all).
 * When companyId is set: include tickets where st.company_id matches OR
 * (st.company_id IS NULL and lead.company_id matches) – handles tickets created before company_id was set.
 */
export async function listTicketsForAdmin(filters = {}) {
  const { companyId, status, limit = 50, offset = 0 } = filters;
  const where = [];
  const params = [];

  if (companyId != null) {
    where.push('(st.company_id = ? OR (st.company_id IS NULL AND l.company_id = ?))');
    params.push(Number(companyId), Number(companyId));
  }
  if (status && STATUSES.has(status)) {
    where.push('st.status = ?');
    params.push(status);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  params.push(Number(limit), Number(offset));

  const [rows] = await db.execute(
        `SELECT st.id, st.lead_id, st.company_id, st.subject, st.category, st.category_other, st.status, st.priority,
          st.assigned_user_id, st.created_at, st.updated_at,
          st.response_due_at, st.first_staff_reply_at, st.company_compensation_amount,
          st.xvrything_compensation_amount, st.compensation_status, st.company_compensation_paid_at,
          st.xvrything_compensation_paid_at, st.company_removed_at,
            l.customer_name, l.email
     FROM support_tickets st
     LEFT JOIN leads l ON l.id = st.lead_id
     ${whereSql}
     ORDER BY st.updated_at DESC, st.created_at DESC
     LIMIT ? OFFSET ?`,
    params
  );
  return rows.map(withPolicyState);
}

/**
 * Get ticket by id for admin (no lead ownership check).
 */
export async function getTicketByIdAdmin(ticketId) {
  if (!ticketId || Number.isNaN(Number(ticketId))) {
    const err = new Error('Invalid ticket id');
    err.statusCode = 400;
    throw err;
  }
  const [rows] = await db.execute(
    `SELECT st.*, l.customer_name, l.email
     FROM support_tickets st
     LEFT JOIN leads l ON l.id = st.lead_id
     WHERE st.id = ? LIMIT 1`,
    [Number(ticketId)]
  );
  const ticket = rows?.[0];
  if (!ticket) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }
  return withPolicyState(ticket);
}

/**
 * Get ticket with replies for admin.
 */
export async function getTicketWithRepliesAdmin(ticketId) {
  const ticket = await getTicketByIdAdmin(ticketId);
  const [replies] = await db.execute(
    `SELECT r.id, r.ticket_id, r.author_type, r.author_lead_id, r.author_user_id, r.body, r.created_at,
            u.name AS author_user_name
     FROM support_ticket_replies r
     LEFT JOIN users u ON u.id = r.author_user_id
     WHERE r.ticket_id = ?
     ORDER BY r.created_at ASC`,
    [Number(ticketId)]
  );
  return { ticket, replies };
}

/**
 * Add staff reply to a ticket.
 */
export async function addStaffReply(ticketId, userId, { body }) {
  if (!body || !String(body).trim()) {
    const err = new Error('Message is required');
    err.statusCode = 400;
    throw err;
  }
  const ticket = await getTicketByIdAdmin(ticketId);
  if (['closed', 'resolved', 'withdrawn'].includes(ticket.status)) {
    const err = new Error('Cannot reply to a closed, resolved, or withdrawn ticket');
    err.statusCode = 400;
    throw err;
  }
  const [result] = await db.execute(
    `INSERT INTO support_ticket_replies (ticket_id, author_type, author_user_id, body)
     VALUES (?, 'staff', ?, ?)`,
    [Number(ticketId), Number(userId), String(body).trim()]
  );
  await db.execute(
    `UPDATE support_tickets
     SET updated_at = NOW(),
         status = ?,
         first_staff_reply_at = COALESCE(first_staff_reply_at, NOW()),
         compensation_status = CASE
           WHEN compensation_status = 'none' AND response_due_at IS NOT NULL AND NOW() > response_due_at
             THEN 'company_due'
           ELSE compensation_status
         END
     WHERE id = ?`,
    ['in_progress', Number(ticketId)]
  );
  const [rows] = await db.execute(
    'SELECT * FROM support_ticket_replies WHERE id = ? LIMIT 1',
    [result.insertId]
  );
  return rows[0];
}

/**
 * Update ticket status (admin).
 */
export async function updateTicketStatus(ticketId, status) {
  if (!STATUSES.has(status)) {
    const err = new Error('Invalid status');
    err.statusCode = 400;
    throw err;
  }
  await getTicketByIdAdmin(ticketId);
  await db.execute(
    'UPDATE support_tickets SET status = ?, updated_at = NOW() WHERE id = ?',
    [status, Number(ticketId)]
  );
  const [rows] = await db.execute('SELECT * FROM support_tickets WHERE id = ? LIMIT 1', [Number(ticketId)]);
  return withPolicyState(rows[0]);
}

/**
 * Add a reply to a ticket (customer or staff).
 */
export async function addReply(ticketId, leadId, { body, authorType = 'customer' }) {
  if (!body || !String(body).trim()) {
    const err = new Error('Message is required');
    err.statusCode = 400;
    throw err;
  }
  const ticket = await getTicketById(ticketId, leadId);
  if (['closed', 'resolved', 'withdrawn'].includes(ticket.status)) {
    const err = new Error('Cannot reply to a closed, resolved, or withdrawn ticket');
    err.statusCode = 400;
    throw err;
  }
  const [result] = await db.execute(
    `INSERT INTO support_ticket_replies (ticket_id, author_type, author_lead_id, body)
     VALUES (?, 'customer', ?, ?)`,
    [Number(ticketId), Number(leadId), String(body).trim()]
  );
  const replyId = result.insertId;
  await db.execute(
    `UPDATE support_tickets
     SET updated_at = NOW(),
         compensation_status = CASE
           WHEN compensation_status = 'none' AND response_due_at IS NOT NULL AND NOW() > response_due_at
             THEN 'company_due'
           ELSE compensation_status
         END
     WHERE id = ?`,
    [Number(ticketId)]
  );
  const [rows] = await db.execute(
    'SELECT * FROM support_ticket_replies WHERE id = ? LIMIT 1',
    [replyId]
  );
  return rows[0];
}

/**
 * Withdraw a ticket (customer only). Ticket history remains visible.
 */
export async function withdrawTicket(ticketId, leadId) {
  const ticket = await getTicketById(ticketId, leadId);
  if (['closed', 'resolved', 'withdrawn'].includes(ticket.status)) {
    const err = new Error('Ticket is already closed, resolved, or withdrawn');
    err.statusCode = 400;
    throw err;
  }
  await db.execute(
    'UPDATE support_tickets SET status = ?, updated_at = NOW() WHERE id = ? AND lead_id = ?',
    ['withdrawn', Number(ticketId), Number(leadId)]
  );
  const [rows] = await db.execute('SELECT * FROM support_tickets WHERE id = ? LIMIT 1', [Number(ticketId)]);
  return withPolicyState(rows[0]);
}

export async function markCompanyCompensationPaid(ticketId) {
  const ticket = await getTicketByIdAdmin(ticketId);
  const current = ticket.effective_compensation_status || ticket.compensation_status || 'none';
  if (!COMPENSATION_STATUSES.has(current) || !['company_due', 'company_paid'].includes(current)) {
    const err = new Error('Company compensation is not currently due for this ticket');
    err.statusCode = 400;
    throw err;
  }

  await db.execute(
    `UPDATE support_tickets
     SET compensation_status = 'company_paid',
         company_compensation_paid_at = COALESCE(company_compensation_paid_at, NOW()),
         updated_at = NOW()
     WHERE id = ?`,
    [Number(ticketId)]
  );

  const [rows] = await db.execute('SELECT * FROM support_tickets WHERE id = ? LIMIT 1', [Number(ticketId)]);
  return withPolicyState(rows[0]);
}

export async function escalateCompensationAndSuspendCompany(ticketId) {
  const ticket = await getTicketByIdAdmin(ticketId);
  const current = ticket.effective_compensation_status || ticket.compensation_status || 'none';
  if (!['company_due', 'company_paid', 'xvrything_paid', 'company_removed'].includes(current)) {
    const err = new Error('Ticket is not eligible for escalation');
    err.statusCode = 400;
    throw err;
  }

  await db.execute(
    `UPDATE support_tickets
     SET compensation_status = 'xvrything_paid',
         xvrything_compensation_paid_at = COALESCE(xvrything_compensation_paid_at, NOW()),
         updated_at = NOW()
     WHERE id = ?`,
    [Number(ticketId)]
  );

  if (ticket.company_id) {
    await db.execute(
      `UPDATE companies
       SET status = 'suspended', updated_at = NOW()
       WHERE id = ?`,
      [Number(ticket.company_id)]
    );

    await db.execute(
      `UPDATE support_tickets
       SET compensation_status = 'company_removed',
           company_removed_at = COALESCE(company_removed_at, NOW()),
           updated_at = NOW()
       WHERE id = ?`,
      [Number(ticketId)]
    );
  }

  const [rows] = await db.execute('SELECT * FROM support_tickets WHERE id = ? LIMIT 1', [Number(ticketId)]);
  return withPolicyState(rows[0]);
}
