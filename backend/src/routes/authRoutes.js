/**
 * Auth routes: mounted at /api/auth
 */
import express from 'express';
import * as authController from '../controllers/authController.js';

const router = express.Router();

router.post('/login', authController.login);

export default router;
