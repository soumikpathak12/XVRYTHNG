import { Router } from 'express';
import { verifyLink, requestOtp, customerLogin, submitReferral } from '../controllers/customerController.js';
import { requireCustomerAuth } from '../middleware/auth.js';

const router = Router();

router.get('/verify-link', verifyLink);
router.post('/request-otp', requestOtp);
router.post('/login', customerLogin);
router.post('/submit-referral', requireCustomerAuth, submitReferral);

export default router;
