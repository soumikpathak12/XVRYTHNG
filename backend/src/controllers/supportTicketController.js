/**
 * Support ticket controller – customer portal (T-337).
 */
import * as supportTicketService from '../services/supportTicketService.js';

/** POST /api/customer/support-tickets – create ticket */
export async function createTicket(req, res) {
  try {
    const { leadId } = req.customer || {};
    if (!leadId) {
      return res.status(403).json({ success: false, message: 'Customer access required' });
    }
    const { subject, body, priority, category, categoryOther } = req.body || {};
    const ticket = await supportTicketService.createTicket({
      leadId,
      subject,
      body,
      priority,
      category,
      categoryOther,
    });
    return res.status(201).json({
      success: true,
      message: 'Support ticket submitted. Our team will respond shortly.',
      data: ticket,
    });
  } catch (err) {
    const code = err.statusCode || 500;
    return res.status(code).json({
      success: false,
      message: err.message || 'Failed to submit ticket',
    });
  }
}

/** GET /api/customer/support-tickets – list customer's tickets */
export async function listTickets(req, res) {
  try {
    const { leadId } = req.customer || {};
    if (!leadId) {
      return res.status(403).json({ success: false, message: 'Customer access required' });
    }
    const tickets = await supportTicketService.listTicketsByLead(leadId);
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

/** GET /api/customer/support-tickets/:id – get ticket with replies */
export async function getTicket(req, res) {
  try {
    const { leadId } = req.customer || {};
    if (!leadId) {
      return res.status(403).json({ success: false, message: 'Customer access required' });
    }
    const ticketId = req.params.id;
    const { ticket, replies } = await supportTicketService.getTicketWithReplies(ticketId, leadId);
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

/** POST /api/customer/support-tickets/:id/replies – add reply */
export async function addReply(req, res) {
  try {
    const { leadId } = req.customer || {};
    if (!leadId) {
      return res.status(403).json({ success: false, message: 'Customer access required' });
    }
    const ticketId = req.params.id;
    const { body } = req.body || {};
    const reply = await supportTicketService.addReply(ticketId, leadId, { body });
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
