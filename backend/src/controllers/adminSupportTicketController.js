/**
 * Admin support ticket controller – list, view, reply, update status.
 */
import * as supportTicketService from '../services/supportTicketService.js';

/** GET /api/admin/support-tickets – list tickets (filtered by company for tenant) */
export async function listTickets(req, res) {
  try {
    const companyId = req.tenantId ?? req.query.companyId ?? null;
    const status = req.query.status || null;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = parseInt(req.query.offset, 10) || 0;

    const tickets = await supportTicketService.listTicketsForAdmin({
      companyId,
      status,
      limit,
      offset,
    });
    return res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (err) {
    const code = err.statusCode || 500;
    return res.status(code).json({
      success: false,
      message: err.message || 'Failed to load tickets',
    });
  }
}

/** GET /api/admin/support-tickets/:id – get ticket with replies */
export async function getTicket(req, res) {
  try {
    const ticketId = req.params.id;
    const { ticket, replies } = await supportTicketService.getTicketWithRepliesAdmin(ticketId);
    return res.status(200).json({
      success: true,
      data: { ticket, replies },
    });
  } catch (err) {
    const code = err.statusCode || 500;
    return res.status(code).json({
      success: false,
      message: err.message || 'Failed to load ticket',
    });
  }
}

/** POST /api/admin/support-tickets/:id/replies – add staff reply */
export async function addReply(req, res) {
  try {
    const ticketId = req.params.id;
    const userId = req.user.id;
    const { body } = req.body || {};
    const reply = await supportTicketService.addStaffReply(ticketId, userId, { body });
    return res.status(201).json({
      success: true,
      message: 'Reply sent.',
      data: reply,
    });
  } catch (err) {
    const code = err.statusCode || 500;
    return res.status(code).json({
      success: false,
      message: err.message || 'Failed to send reply',
    });
  }
}

/** PATCH /api/admin/support-tickets/:id/status – update status */
export async function updateStatus(req, res) {
  try {
    const ticketId = req.params.id;
    const { status } = req.body || {};
    const ticket = await supportTicketService.updateTicketStatus(ticketId, status);
    return res.status(200).json({
      success: true,
      message: 'Status updated.',
      data: ticket,
    });
  } catch (err) {
    const code = err.statusCode || 500;
    return res.status(code).json({
      success: false,
      message: err.message || 'Failed to update status',
    });
  }
}
