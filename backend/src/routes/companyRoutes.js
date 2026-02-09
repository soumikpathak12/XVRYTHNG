// src/routes/companyRoutes.js
import { Router } from 'express';
import { requireAuth } from '../controllers/adminController.js'; // tái dùng guard JWT của bạn
import { getCompanyProfile, updateCompanyProfile } from '../controllers/adminCompanyController.js';
import { getSidebarForUser } from '../services/sidebarService.js';

const router = Router();

router.use(requireAuth);

router.get('/me', getCompanyProfile);
router.post('/me', updateCompanyProfile);

router.get('/sidebar', async (req, res, next) => {
  try {
    const data = await getSidebarForUser(req.user.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;