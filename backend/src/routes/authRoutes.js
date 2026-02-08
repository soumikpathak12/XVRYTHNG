/**
 * Auth routes: mounted at /api/auth
 */
import express from 'express';
import * as authController from '../controllers/authController.js';

import { postRequestReset,getValidateToken,postResetPassword,
 } from '../controllers/passwordResetController.js';

const router = express.Router();

router.post('/login', authController.login);
router.post('/refresh', authController.refresh);

router.post('/request-reset', postRequestReset);
router.get('/validate-reset-token', getValidateToken);
router.post('/reset-password', postResetPassword);


export default router;
