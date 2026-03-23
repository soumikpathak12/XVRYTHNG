import { Router } from 'express';
import fileUpload from 'express-fileupload';
import { requireAuth } from '../middleware/auth.js';
import { getProfile, updateProfile, changePassword, getMyPermissions } from '../controllers/profileController.js';
import { getSidebarForUser } from '../services/sidebarService.js';

import { postUser } from '../controllers/userController.js';


const router = Router();

// DEBUG: log ngay khi vào route
router.use((req, res, next) => {
  console.log('[ROUTE:/api/users] hit', req.method, req.originalUrl);
  next();
});

router.use(
  fileUpload({
    createParentPath: false,
    limits: { fileSize: 5 * 1024 * 1024 },
    abortOnLimit: true,
  })
);

router.use(requireAuth);

router.get('/me', getProfile);
router.get('/me/permissions', getMyPermissions);
router.get('/me/sidebar', async (req, res, next) => {
  try {
    console.log('[ROUTE:/api/users/me/sidebar] userId:', req.user.id);
    const data = await getSidebarForUser(req.user.id);
    console.log('[ROUTE:/api/users/me/sidebar] result:', data);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[ROUTE:/api/users/me/sidebar] error:', err);
    next(err);
  }
});
router.put('/me', updateProfile);
router.put('/me/password', changePassword);

router.post('/', requireAuth, async (req, res, next) => {
  console.log('[ROUTE:/api/users] POST body=', req.body);
  next();
}, postUser);


export default router;
