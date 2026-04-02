import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getMeta,
  listBatteryBrands,
  listBatteryModels,
  getInverterDetails,
  listInverterBrands,
  listInverterModels,
  listInverterSeries,
  listPvPanelBrands,
  getPvPanelDetails,
  listPvPanelModels,
  syncNow,
} from '../controllers/cecApprovedProductsController.js';

const router = Router();

router.use(requireAuth);

router.get('/meta', getMeta);
router.post('/sync', syncNow);

router.get('/options/pv-panel-brands', listPvPanelBrands);
router.get('/options/pv-panel-models', listPvPanelModels);
router.get('/options/pv-panel-details', getPvPanelDetails);
router.get('/options/inverter-brands', listInverterBrands);
router.get('/options/inverter-models', listInverterModels);
router.get('/options/inverter-series', listInverterSeries);
router.get('/options/inverter-details', getInverterDetails);
router.get('/options/battery-brands', listBatteryBrands);
router.get('/options/battery-models', listBatteryModels);

export default router;

