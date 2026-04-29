import { Router } from 'express';
import {
  verifyLink,
  requestOtp,
  customerLogin,
  submitReferral,
  bookSiteInspection,
} from '../controllers/customerController.js';
import {
  createTicket,
  listTickets,
  getTicket,
  addReply,
  withdrawTicket,
} from '../controllers/supportTicketController.js';
import { requireCustomerAuth } from '../middleware/auth.js';

const router = Router();

router.get('/verify-link', verifyLink);
router.post('/request-otp', requestOtp);
router.post('/login', customerLogin);
router.post('/site-inspection/book', bookSiteInspection);
router.post('/submit-referral', requireCustomerAuth, submitReferral);

// Support tickets (T-337)
router.get('/support-tickets', requireCustomerAuth, listTickets);
router.post('/support-tickets', requireCustomerAuth, createTicket);
router.get('/support-tickets/:id', requireCustomerAuth, getTicket);
router.post('/support-tickets/:id/replies', requireCustomerAuth, addReply);
router.post('/support-tickets/:id/withdraw', requireCustomerAuth, withdrawTicket);

export default router;
