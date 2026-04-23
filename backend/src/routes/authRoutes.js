/**
 * Auth routes: mounted at /api/auth
 */
import express from 'express';
import * as authController from '../controllers/authController.js';

import { postRequestReset,getValidateToken,postResetPassword,
 } from '../controllers/passwordResetController.js';

 import * as authService from '../services/authService.js';
 import { requireAuth } from '../middleware/auth.js';
const router = express.Router();

router.post('/login', authController.login);
router.post('/pin/login', authController.loginWithPin);
router.post('/refresh', authController.refresh);

router.post('/request-reset', postRequestReset);
router.get('/validate-reset-token', getValidateToken);
router.post('/reset-password', postResetPassword);
router.get('/pin/status', requireAuth, authController.getMobilePinStatus);
router.post('/pin/setup', requireAuth, authController.setupMobilePin);
router.post('/pin/verify', requireAuth, authController.verifyMobilePin);
router.post(
  '/pin/verify-security-answer',
  requireAuth,
  authController.verifyMobilePinSecurityAnswer,
);
router.post(
  '/pin/request-email-recovery',
  requireAuth,
  authController.requestMobilePinRecoveryEmail,
);
router.post(
  '/pin/verify-email-recovery-code',
  requireAuth,
  authController.verifyMobilePinEmailRecoveryCode,
);
router.post(
  '/pin/reset-with-email-recovery',
  requireAuth,
  authController.resetMobilePinWithEmailRecovery,
);
router.post('/pin/reset', requireAuth, authController.resetMobilePin);


router.post('/change-password-emp', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body ?? {};
    await authService.changePassword(userId, currentPassword, newPassword);
    return res.json({ success: true, message: 'Password changed' });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message ?? 'Failed' });
  }
});

export default router;
