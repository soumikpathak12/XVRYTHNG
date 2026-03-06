/**
 * Support ticket service – customer portal tickets, liaison routing (T-335, T-337, T-340).
 */
import db from '../config/db.js';

const STATUSES = new Set(['open', 'in_progress', 'resolved', 'closed']);
const PRIORITIES = new Set(['low', 'medium', 'high', 'urgent']);
const CATEGORIES = new Set(['installation', 'referral', 'others']);

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

  const categoryOtherVal = cat === 'others' ? String(categoryOther).trim().slice(0, 255) : null;
  const [result] = await db.execute(
    `INSERT INTO support_tickets (lead_id, company_id, subject, category, category_other, body, status, priority, assigned_user_id)
     VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
    [
      Number(leadId),
      companyId,
      String(subject).trim().slice(0, 255),
      cat,
      categoryOtherVal,
      String(body).trim(),
      priority || 'medium',
      assignedUserId,
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
  return rows[0];
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
    `SELECT id, lead_id, subject, status, priority, assigned_user_id, created_at, updated_at
     FROM support_tickets
     WHERE lead_id = ?
     ORDER BY updated_at DESC, created_at DESC`,
    [Number(leadId)]
  );
  return rows;
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
  return ticket;
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
 * Add a reply to a ticket (customer or staff).
 */
export async function addReply(ticketId, leadId, { body, authorType = 'customer' }) {
  if (!body || !String(body).trim()) {
    const err = new Error('Message is required');
    err.statusCode = 400;
    throw err;
  }
  const ticket = await getTicketById(ticketId, leadId);
  if (ticket.status === 'closed' || ticket.status === 'resolved') {
    const err = new Error('Cannot reply to a closed or resolved ticket');
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
    'UPDATE support_tickets SET updated_at = NOW() WHERE id = ?',
    [Number(ticketId)]
  );
  const [rows] = await db.execute(
    'SELECT * FROM support_ticket_replies WHERE id = ? LIMIT 1',
    [replyId]
  );
  return rows[0];
}
