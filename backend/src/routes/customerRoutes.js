import { Router } from 'express';
import { verifyLink, requestOtp, customerLogin } from '../controllers/customerController.js';

const router = Router();

router.get('/verify-link', verifyLink);
router.post('/request-otp', requestOtp);
router.post('/login', customerLogin);

export default router;
