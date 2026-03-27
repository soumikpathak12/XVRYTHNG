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

export async function getMeta(_req, res) {
  const meta = await getCecCacheMeta();
  return res.status(200).json({ success: true, data: meta });
}

export async function listPvPanelBrands(_req, res) {
  const data = await getPvPanelBrands();
  return res.status(200).json({ success: true, data });
}

export async function listInverterBrands(_req, res) {
  const data = await getInverterBrands();
  return res.status(200).json({ success: true, data });
}

export async function listInverterModels(req, res) {
  const brand = req.query.brand ?? '';
  const data = await getInverterModelsByBrand(brand);
  return res.status(200).json({ success: true, data });
}

export async function listInverterSeries(req, res) {
  const brand = req.query.brand ?? '';
  const model = req.query.model ?? '';
  const data = await getInverterSeriesByBrandModel(brand, model);
  return res.status(200).json({ success: true, data });
}

export async function getInverterDetails(req, res) {
  const brand = req.query.brand ?? '';
  const model = req.query.model ?? '';
  const data = await getInverterModelDetails(brand, model);
  return res.status(200).json({ success: true, data });
}

export async function listPvPanelModels(req, res) {
  const brand = req.query.brand ?? '';
  const data = await getPvPanelModelsByBrand(brand);
  return res.status(200).json({ success: true, data });
}

export async function getPvPanelDetails(req, res) {
  const brand = req.query.brand ?? '';
  const model = req.query.model ?? '';
  const data = await getPvPanelModelDetails(brand, model);
  return res.status(200).json({ success: true, data });
}

export async function listBatteryBrands(_req, res) {
  const data = await getBatteryBrands();
  return res.status(200).json({ success: true, data });
}

export async function listBatteryModels(req, res) {
  const brand = req.query.brand ?? '';
  const data = await getBatteryModelsByBrand(brand);
  return res.status(200).json({ success: true, data });
}

export async function syncNow(req, res) {
  const force = String(req.query.force ?? '0') === '1';
  const result = await syncCecApprovedProducts({ force });
  return res.status(200).json({ success: true, data: result });
}

