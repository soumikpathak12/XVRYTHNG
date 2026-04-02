import {
  getBatteryBrands,
  getBatteryModelsByBrand,
  getCecCacheMeta,
  getInverterBrands,
  getInverterModelDetails,
  getPvPanelModelDetails,
  getInverterModelsByBrand,
  getInverterSeriesByBrandModel,
  getPvPanelBrands,
  getPvPanelModelsByBrand,
  syncCecApprovedProducts,
} from '../services/cecApprovedProductsService.js';
import {
  getPanelBrandOptions,
  getPanelModelOptionsByBrand,
  getInverterBrandOptions,
  getInverterModelOptionsByBrand,
  getInverterSeriesOptionsByBrandModel,
  getInverterDetailsLive,
  getBatteryBrandOptions,
  getBatteryModelOptionsByBrand,
} from '../services/cecApprovedService.js';

export async function getMeta(_req, res) {
  const meta = await getCecCacheMeta();
  return res.status(200).json({ success: true, data: meta });
}

export async function listPvPanelBrands(_req, res) {
  const result = await getPanelBrandOptions();
  const data = result.brands || [];
  return res.status(200).json({ success: true, data });
}

export async function listInverterBrands(_req, res) {
  const result = await getInverterBrandOptions();
  const data = result.brands || [];
  return res.status(200).json({ success: true, data });
}

export async function listInverterModels(req, res) {
  const brand = req.query.brand ?? '';
  const result = await getInverterModelOptionsByBrand(brand);
  const data = result.models || [];
  return res.status(200).json({ success: true, data });
}

export async function listInverterSeries(req, res) {
  const brand = req.query.brand ?? '';
  const model = req.query.model ?? '';
  const result = await getInverterSeriesOptionsByBrandModel(brand, model);
  const data = result.series || [];
  return res.status(200).json({ success: true, data });
}

export async function getInverterDetails(req, res) {
  const brand = req.query.brand ?? '';
  const model = req.query.model ?? '';
  const data = await getInverterDetailsLive(brand, model);
  return res.status(200).json({ success: true, data });
}

export async function listPvPanelModels(req, res) {
  const brand = req.query.brand ?? '';
  const result = await getPanelModelOptionsByBrand(brand);
  const data = result.models || [];
  return res.status(200).json({ success: true, data });
}

export async function getPvPanelDetails(req, res) {
  const brand = req.query.brand ?? '';
  const model = req.query.model ?? '';
  const data = await getPvPanelModelDetails(brand, model);
  return res.status(200).json({ success: true, data });
}

export async function listBatteryBrands(_req, res) {
  const result = await getBatteryBrandOptions();
  const data = result.brands || [];
  return res.status(200).json({ success: true, data });
}

export async function listBatteryModels(req, res) {
  const brand = req.query.brand ?? '';
  const result = await getBatteryModelOptionsByBrand(brand);
  const data = result.models || [];
  return res.status(200).json({ success: true, data });
}

export async function syncNow(req, res) {
  const force = String(req.query.force ?? '0') === '1';
  const result = await syncCecApprovedProducts({ force });
  return res.status(200).json({ success: true, data: result });
}

