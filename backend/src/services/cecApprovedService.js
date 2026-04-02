import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CEC_CACHE_PATH = path.resolve(__dirname, '../../data/cec-approved/cache.json');
const CEC_PV_MODULES_PAGE = 'https://cleanenergycouncil.org.au/industry-programs/products-program/modules';
const CEC_PV_MODULES_API = 'https://cleanenergycouncil.org.au/api/PvModule/get';
const CEC_INVERTERS_PAGE = 'https://cleanenergycouncil.org.au/industry-programs/products-program/inverters';
const CEC_INVERTERS_API = 'https://cleanenergycouncil.org.au/api/Inverter/get';
const CEC_BATTERIES_PAGE = 'https://cleanenergycouncil.org.au/industry-programs/products-program/batteries';
const CEC_BATTERIES_API = 'https://cleanenergycouncil.org.au/api/Battery/get';
const CATALOG_TTL_MS = 12 * 60 * 60 * 1000;

let parsedCache = null;
let livePanelCatalog = null;
let livePanelCatalogLoadedAt = 0;
let livePanelCatalogPromise = null;
let liveInverterCatalog = null;
let liveInverterCatalogLoadedAt = 0;
let liveInverterCatalogPromise = null;
let liveBatteryCatalog = null;
let liveBatteryCatalogLoadedAt = 0;
let liveBatteryCatalogPromise = null;

function sortAlpha(a, b) {
  return a.localeCompare(b, 'en', { sensitivity: 'base', numeric: true });
}

function normalizeText(value) {
  if (value == null) return '';
  return String(value).trim();
}

function canonicalKey(value) {
  return normalizeText(value).toLowerCase();
}

function pickFirstText(obj, keys) {
  for (const k of keys) {
    const v = normalizeText(obj?.[k]);
    if (v) return v;
  }
  return '';
}

async function fetchLivePanelCatalogPage(pageNumber, itemsPerPage = 60) {
  const res = await fetch(CEC_PV_MODULES_API, {
    method: 'POST',
    headers: {
      'User-Agent': 'XVRYTHNG/1.0 (panel catalog sync)',
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Referer: CEC_PV_MODULES_PAGE,
    },
    body: JSON.stringify({ pageNumber, itemsPerPage }),
  });

  if (!res.ok) {
    const err = new Error(`Failed to download CEC PV module page ${pageNumber} (HTTP ${res.status})`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  if (!data || !Array.isArray(data.list)) {
    throw new Error('CEC PV module response did not include a list');
  }

  return data;
}

async function fetchLiveInverterCatalogPage(pageNumber, itemsPerPage = 60) {
  const res = await fetch(CEC_INVERTERS_API, {
    method: 'POST',
    headers: {
      'User-Agent': 'XVRYTHNG/1.0 (inverter catalog sync)',
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Referer: CEC_INVERTERS_PAGE,
    },
    body: JSON.stringify({ pageNumber, itemsPerPage }),
  });

  if (!res.ok) {
    const err = new Error(`Failed to download CEC inverter page ${pageNumber} (HTTP ${res.status})`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  if (!data || !Array.isArray(data.list)) {
    throw new Error('CEC inverter response did not include a list');
  }

  return data;
}

async function fetchLiveBatteryCatalogPage(pageNumber, itemsPerPage = 60) {
  const res = await fetch(CEC_BATTERIES_API, {
    method: 'POST',
    headers: {
      'User-Agent': 'XVRYTHNG/1.0 (battery catalog sync)',
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Referer: CEC_BATTERIES_PAGE,
    },
    body: JSON.stringify({ pageNumber, itemsPerPage }),
  });

  if (!res.ok) {
    const err = new Error(`Failed to download CEC battery page ${pageNumber} (HTTP ${res.status})`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  if (!data || !Array.isArray(data.list)) {
    throw new Error('CEC battery response did not include a list');
  }

  return data;
}

function buildPanelCatalogFromRows(rows) {
  const brands = new Map();
  const modelsByBrand = new Map();

  for (const row of rows || []) {
    const brand = normalizeText(
      row?.manufacturers || row?.Manufacturer || row?.['Licensee/Certificate Holder'],
    );
    const model = normalizeText(row?.modelNumber || row?.['Model Number']);
    if (!brand || !model) continue;

    const brandKey = canonicalKey(brand);
    if (!brands.has(brandKey)) brands.set(brandKey, brand);

    let modelSet = modelsByBrand.get(brandKey);
    if (!modelSet) {
      modelSet = new Map();
      modelsByBrand.set(brandKey, modelSet);
    }

    const modelKey = canonicalKey(model);
    if (!modelSet.has(modelKey)) modelSet.set(modelKey, model);
  }

  return {
    updatedAt: new Date().toISOString(),
    brands: Array.from(brands.values()).sort(sortAlpha),
    modelsByBrand: new Map(
      Array.from(modelsByBrand.entries(), ([brandKey, modelSet]) => [
        brandKey,
        Array.from(modelSet.values()).sort(sortAlpha),
      ]),
    ),
  };
}

function buildInverterCatalogFromRows(rows) {
  const brands = new Map(); // brandKey -> brand
  const modelsByBrand = new Map(); // brandKey -> Map(modelKey -> model)
  const seriesByBrandModel = new Map(); // `${brandKey}::${modelKey}` -> Map(seriesKey -> series)
  const detailsByBrandModel = new Map(); // `${brandKey}::${modelKey}` -> { series?, power_kw? }

  for (const row of rows || []) {
    const brand = pickFirstText(row, [
      'brand',
      'Brand',
      'manufacturer',
      'Manufacturer',
      'manufacturerName',
      'ManufacturerName',
      'manufacturers',
      'Manufacturers',
      'licensee',
      'Licensee/Certificate Holder',
    ]);
    const model = pickFirstText(row, ['modelNumber', 'Model Number', 'model', 'Model']);
    if (!brand || !model) continue;

    const brandKey = canonicalKey(brand);
    const modelKey = canonicalKey(model);

    if (!brands.has(brandKey)) brands.set(brandKey, brand);

    let modelSet = modelsByBrand.get(brandKey);
    if (!modelSet) {
      modelSet = new Map();
      modelsByBrand.set(brandKey, modelSet);
    }
    if (!modelSet.has(modelKey)) modelSet.set(modelKey, model);

    const series = pickFirstText(row, ['series', 'Series', 'inverterSeries', 'Inverter Series']);
    if (series) {
      const key = `${brandKey}::${modelKey}`;
      let seriesSet = seriesByBrandModel.get(key);
      if (!seriesSet) {
        seriesSet = new Map();
        seriesByBrandModel.set(key, seriesSet);
      }
      const seriesKey = canonicalKey(series);
      if (!seriesSet.has(seriesKey)) seriesSet.set(seriesKey, series);

      // Prefer first non-empty series for details
      if (!detailsByBrandModel.has(key)) {
        detailsByBrandModel.set(key, { series, power_kw: null });
      } else if (!detailsByBrandModel.get(key)?.series) {
        detailsByBrandModel.set(key, { ...detailsByBrandModel.get(key), series });
      }
    }

    const rawPower = pickFirstText(row, [
      'acPowerKw',
      'acPowerKW',
      'AC Power (kW)',
      'acPower',
      'AC Power',
      'ratedPowerKw',
      'Rated Power (kW)',
    ]);
    const power_kw = rawPower ? Number(String(rawPower).replace(/[^\d.]/g, '')) : NaN;
    if (Number.isFinite(power_kw) && power_kw > 0) {
      const key = `${brandKey}::${modelKey}`;
      const prev = detailsByBrandModel.get(key) || { series: series || null, power_kw: null };
      if (prev.power_kw == null) {
        detailsByBrandModel.set(key, { ...prev, power_kw });
      }
    }
  }

  return {
    updatedAt: new Date().toISOString(),
    brands: Array.from(brands.values()).sort(sortAlpha),
    modelsByBrand: new Map(
      Array.from(modelsByBrand.entries(), ([brandKey, modelSet]) => [
        brandKey,
        Array.from(modelSet.values()).sort(sortAlpha),
      ]),
    ),
    seriesByBrandModel: new Map(
      Array.from(seriesByBrandModel.entries(), ([k, set]) => [k, Array.from(set.values()).sort(sortAlpha)]),
    ),
    detailsByBrandModel,
  };
}

async function loadLivePanelCatalog() {
  const ageMs = Date.now() - livePanelCatalogLoadedAt;
  if (livePanelCatalog && ageMs < CATALOG_TTL_MS) {
    return livePanelCatalog;
  }

  if (livePanelCatalogPromise) return livePanelCatalogPromise;

  livePanelCatalogPromise = (async () => {
    const firstPage = await fetchLivePanelCatalogPage(1, 60);
    const pageCount = Number(firstPage.pageCount) || 1;
    const rows = [...firstPage.list];

    for (let pageNumber = 2; pageNumber <= pageCount; pageNumber += 1) {
      const nextPage = await fetchLivePanelCatalogPage(pageNumber, 60);
      rows.push(...nextPage.list);
    }

    livePanelCatalog = buildPanelCatalogFromRows(rows);
    livePanelCatalogLoadedAt = Date.now();
    return livePanelCatalog;
  })()
    .catch((error) => {
      livePanelCatalog = null;
      livePanelCatalogLoadedAt = 0;
      throw error;
    })
    .finally(() => {
      livePanelCatalogPromise = null;
    });

  return livePanelCatalogPromise;
}

async function loadFallbackPanelCatalog() {
  const cache = await loadCache();
  const rows = Array.isArray(cache?.pv_modules?.rows) ? cache.pv_modules.rows : [];
  return buildPanelCatalogFromRows(
    rows.map((row) => ({
      manufacturers: row?.Manufacturer || row?.['Licensee/Certificate Holder'] || '',
      modelNumber: row?.['Model Number'] || '',
    })),
  );
}

async function getPanelCatalog() {
  try {
    return await loadLivePanelCatalog();
  } catch {
    // If the CEC site/API is unavailable, fall back to our cached CER CSV sync
    // to keep the UI usable for selecting approved brands/models.
    return await loadFallbackPanelCatalog();
  }
}

async function loadCache() {
  if (parsedCache) return parsedCache;
  const raw = await readFile(CEC_CACHE_PATH, 'utf8');
  parsedCache = JSON.parse(raw);
  return parsedCache;
}

export async function getPanelBrandOptions() {
  const catalog = await getPanelCatalog();

  return {
    updatedAt: catalog.updatedAt ?? null,
    brands: catalog.brands,
  };
}

export async function getPanelModelOptionsByBrand(brand) {
  const normalizedBrand = normalizeText(brand);
  if (!normalizedBrand) {
    return { brand: '', models: [] };
  }

  const catalog = await getPanelCatalog();
  const models = catalog.modelsByBrand.get(canonicalKey(normalizedBrand)) ?? [];

  return {
    brand: normalizedBrand,
    models,
  };
}

async function loadLiveInverterCatalog() {
  const ageMs = Date.now() - liveInverterCatalogLoadedAt;
  if (liveInverterCatalog && ageMs < CATALOG_TTL_MS) {
    return liveInverterCatalog;
  }

  if (liveInverterCatalogPromise) return liveInverterCatalogPromise;

  liveInverterCatalogPromise = (async () => {
    const firstPage = await fetchLiveInverterCatalogPage(1, 60);
    const pageCount = Number(firstPage.pageCount) || 1;
    const rows = [...firstPage.list];

    for (let pageNumber = 2; pageNumber <= pageCount; pageNumber += 1) {
      const nextPage = await fetchLiveInverterCatalogPage(pageNumber, 60);
      rows.push(...nextPage.list);
    }

    liveInverterCatalog = buildInverterCatalogFromRows(rows);
    liveInverterCatalogLoadedAt = Date.now();
    return liveInverterCatalog;
  })()
    .catch((error) => {
      liveInverterCatalog = null;
      liveInverterCatalogLoadedAt = 0;
      throw error;
    })
    .finally(() => {
      liveInverterCatalogPromise = null;
    });

  return liveInverterCatalogPromise;
}

async function getInverterCatalog() {
  try {
    return await loadLiveInverterCatalog();
  } catch {
    return {
      updatedAt: null,
      brands: [],
      modelsByBrand: new Map(),
      seriesByBrandModel: new Map(),
      detailsByBrandModel: new Map(),
    };
  }
}

export async function getInverterBrandOptions() {
  const catalog = await getInverterCatalog();

  return {
    updatedAt: catalog.updatedAt ?? null,
    brands: catalog.brands,
  };
}

export async function getInverterModelOptionsByBrand(brand) {
  const normalizedBrand = normalizeText(brand);
  if (!normalizedBrand) {
    return { brand: '', models: [] };
  }

  const catalog = await getInverterCatalog();
  const models = catalog.modelsByBrand.get(canonicalKey(normalizedBrand)) ?? [];

  return {
    brand: normalizedBrand,
    models,
  };
}

export async function getInverterSeriesOptionsByBrandModel(brand, model) {
  const normalizedBrand = normalizeText(brand);
  const normalizedModel = normalizeText(model);
  if (!normalizedBrand || !normalizedModel) {
    return { brand: normalizedBrand || '', model: normalizedModel || '', series: [] };
  }
  const catalog = await getInverterCatalog();
  const key = `${canonicalKey(normalizedBrand)}::${canonicalKey(normalizedModel)}`;
  const series = catalog.seriesByBrandModel.get(key) ?? [];
  return { brand: normalizedBrand, model: normalizedModel, series };
}

export async function getInverterDetailsLive(brand, model) {
  const normalizedBrand = normalizeText(brand);
  const normalizedModel = normalizeText(model);
  if (!normalizedBrand || !normalizedModel) return null;
  const catalog = await getInverterCatalog();
  const key = `${canonicalKey(normalizedBrand)}::${canonicalKey(normalizedModel)}`;
  const details = catalog.detailsByBrandModel?.get(key) ?? null;
  if (!details) return null;
  return {
    series: details.series ?? null,
    power_kw: details.power_kw ?? null,
  };
}

async function loadLiveBatteryCatalog() {
  const ageMs = Date.now() - liveBatteryCatalogLoadedAt;
  if (liveBatteryCatalog && ageMs < CATALOG_TTL_MS) {
    return liveBatteryCatalog;
  }

  if (liveBatteryCatalogPromise) return liveBatteryCatalogPromise;

  liveBatteryCatalogPromise = (async () => {
    const firstPage = await fetchLiveBatteryCatalogPage(1, 60);
    const pageCount = Number(firstPage.pageCount) || 1;
    const rows = [...firstPage.list];

    for (let pageNumber = 2; pageNumber <= pageCount; pageNumber += 1) {
      const nextPage = await fetchLiveBatteryCatalogPage(pageNumber, 60);
      rows.push(...nextPage.list);
    }

    liveBatteryCatalog = buildPanelCatalogFromRows(rows);
    liveBatteryCatalogLoadedAt = Date.now();
    return liveBatteryCatalog;
  })()
    .catch((error) => {
      liveBatteryCatalog = null;
      liveBatteryCatalogLoadedAt = 0;
      throw error;
    })
    .finally(() => {
      liveBatteryCatalogPromise = null;
    });

  return liveBatteryCatalogPromise;
}

async function getBatteryCatalog() {
  try {
    return await loadLiveBatteryCatalog();
  } catch {
    return {
      updatedAt: null,
      brands: [],
      modelsByBrand: new Map(),
    };
  }
}

export async function getBatteryBrandOptions() {
  const catalog = await getBatteryCatalog();

  return {
    updatedAt: catalog.updatedAt ?? null,
    brands: catalog.brands,
  };
}

export async function getBatteryModelOptionsByBrand(brand) {
  const normalizedBrand = normalizeText(brand);
  if (!normalizedBrand) {
    return { brand: '', models: [] };
  }

  const catalog = await getBatteryCatalog();
  const models = catalog.modelsByBrand.get(canonicalKey(normalizedBrand)) ?? [];

  return {
    brand: normalizedBrand,
    models,
  };
}
