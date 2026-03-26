import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getMeta,
  listBatteryBrands,
  listBatteryModels,
  listInverterBrands,
  listPvPanelBrands,
  syncNow,
} from '../controllers/cecApprovedProductsController.js';

const router = Router();

router.use(requireAuth);

router.get('/meta', getMeta);
router.post('/sync', syncNow);

router.get('/options/pv-panel-brands', listPvPanelBrands);
router.get('/options/inverter-brands', listInverterBrands);
router.get('/options/battery-brands', listBatteryBrands);
router.get('/options/battery-models', listBatteryModels);

export default router;

