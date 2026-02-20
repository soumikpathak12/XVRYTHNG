/**
 * Referral routes: List referrals, filter, manage bonuses.
 */
import { Router } from 'express';
import {
  listReferrals,
  getReferralCounts,
  getReferrers,
  markBonusPaid,
  getSettings,
  saveSettings,
} from '../controllers/referralController.js';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';

const router = Router();

router.use(requireAuth, tenantContext);

router.get('/', listReferrals);
router.get('/counts', getReferralCounts);
router.get('/referrers', getReferrers);
router.get('/settings', getSettings);
router.put('/settings', saveSettings);
router.post('/:id/mark-bonus-paid', markBonusPaid);

export default router;
