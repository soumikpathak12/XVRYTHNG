import { Router } from 'express';
import fileUpload from 'express-fileupload';
import { requireAuth } from '../middleware/auth.js';
import { getProfile, updateProfile, changePassword, getMyPermissions } from '../controllers/profileController.js';

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
router.put('/me', updateProfile);
router.put('/me/password', changePassword);

router.post('/', requireAuth, async (req, res, next) => {
  console.log('[ROUTE:/api/users] POST body=', req.body);
  next();
}, postUser);


export default router;
