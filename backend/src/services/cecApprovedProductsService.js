import fs from 'fs/promises';
import path from 'path';
import Papa from 'papaparse';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Keep runtime cache out of src/ so it doesn't look like source code changes.
// Path: backend/data/cec-approved/cache.json
const CACHE_DIR = path.join(__dirname, '..', '..', 'data', 'cec-approved');
const CACHE_FILE = path.join(CACHE_DIR, 'cache.json');

const SOURCES = {
  pv_modules: {
    csvUrl: 'https://cer.gov.au/document/cec-approved-pv-modules-0',
  },
  inverters: {
    csvUrl: 'https://cer.gov.au/document/cec-approved-inverters-0',
  },
  batteries: {
    csvUrl: 'https://cer.gov.au/document/cec-approved-solar-batteries-0',
  },
};

function normalizeStr(v) {
  return String(v ?? '').trim();
}

function canonicalKey(v) {
  return normalizeStr(v).toLowerCase();
}

const ALLOWED_INVERTER_BRANDS = [
  'AERL', 'Afore', 'AKAI Energy', 'Alpha ESS', 'ALTIUS', 'Ambrion', 'AMPAURA', 'ANKER', 'APstorage', 'APsystems',
  'Atess', 'Bluetti', 'CE+T POWER', 'Clenergy ESS', 'CSE', 'Dawn Solar', 'DELTA', 'Deye', 'DMEGC', 'DYNESS',
  'Each Energy', 'Eaton', 'eCACTUS', 'ECOFLOW', 'Empower Energy', 'Energizer', 'Enermax', 'Enphase', 'ESY', 'ESYSUNHOME',
  'EVANTRA', 'FelicityESS', 'FIMER', 'FOXESS', 'FRANKLINWH', 'Fronius', 'GE', 'GivEnergy', 'GoodWe', 'Growatt',
  'GRUNDFOS', 'Haier', 'Hiconics', 'Hinen', 'Hoymiles', 'HYXiPOWER', 'iHot', 'IN-Power', 'INFYPOWER', 'iPotisEdge',
  'iStore', 'iSUNA', 'Jinko', 'Koyoe', 'LAVO', 'Lorentz', 'MANGO POWER', 'MG ENERGY', 'Midea', 'Morningstar',
  'NAHUI', 'NEOVOLT', 'NOARK', 'OLiPower', 'PIXII', 'Plasmatronics', 'PYLONTECH', 'RCT Power', 'Redback Technologies', 'Redx',
  'Risen', 'ROYPOW', 'SAJ', 'Selectronic', 'Sigenergy', 'Sinexcel', 'SMA', 'SMART LIFESTYLE', 'SOFARSOLAR', 'SolarEdge',
  'SolarEdge Technologies Ltd', 'SOLATHERM', 'SolaX', 'SolaX Power', 'Solinteg', 'Solis', 'Solplanet', 'SONNEN', 'SPHERE', 'SRNE',
  'Star Charge', 'Stealth Energy', 'Studer', 'Sungrow', 'SUNPOWER', 'Sunsynk', 'Sunvolt', 'Sunways', 'Swatten', 'TBB POWER',
  'Tesla', 'VACON', 'Victron Energy', 'WEIHENG', 'WHES',
];
const ALLOWED_INVERTER_BRAND_MAP = new Map(
  ALLOWED_INVERTER_BRANDS.map((brand) => [canonicalKey(brand), brand])
);

function toAllowedInverterBrand(name) {
  return ALLOWED_INVERTER_BRAND_MAP.get(canonicalKey(name)) || '';
}

const BRAND_STOPWORDS = new Set([
  'single',
  'three',
  'phase',
  'hybrid',
  'battery',
  'inverter',
  'series',
  'solar',
  'energy',
  'power',
  'storage',
  'grid',
  'off',
  'on',
  'micro',
  'string',
]);

function isLikelyModelToken(token) {
  const t = normalizeStr(token);
  return !t || /[\d()/]/.test(t);
}

function cleanCompanySuffix(name) {
  return normalizeStr(name)
    .replace(/\b(pty\.?\s*ltd\.?|ltd\.?|limited|inc\.?|llc|gmbh|co\.?)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function inferInverterBrand(row) {
  const direct = (
    normalizeStr(row?.Brand) ||
    normalizeStr(row?.['Brand Name']) ||
    normalizeStr(row?.brand)
  );
  if (direct && !isLikelyModelToken(direct)) return direct;

  const series = normalizeStr(row?.Series);
  if (series) {
    const beforeSeries = series.split(/\bSeries\b/i)[0].trim();
    const tokens = beforeSeries.split(/\s+/).filter(Boolean);
    for (const rawToken of tokens) {
      const token = rawToken.replace(/[^A-Za-z+\-.]/g, '');
      const key = canonicalKey(token);
      if (!token) continue;
      if (isLikelyModelToken(token)) continue;
      if (BRAND_STOPWORDS.has(key)) continue;
      if (token.length < 2) continue;
      return token;
    }
  }

  const manufacturer = cleanCompanySuffix(row?.Manufacturer);
  if (!manufacturer) return '';
  const token = manufacturer.split(/\s+/).filter(Boolean)[0] || '';
  return isLikelyModelToken(token) ? '' : token;
}

function parseCsv(text) {
  const res = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (res.errors?.length) {
    const first = res.errors[0];
    const err = new Error(`CSV parse error: ${first.message || 'unknown error'}`);
    err.detail = first;
    throw err;
  }
  return Array.isArray(res.data) ? res.data : [];
}

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

async function readDiskCache() {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

async function writeDiskCache(cache) {
  await ensureCacheDir();
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
}

let memoryCache = {
  updatedAt: null,
  sources: {},
  pv_modules: { rows: [] },
  inverters: { rows: [] },
  batteries: { rows: [] },
};

let initPromise = null;
async function initFromDiskOnce() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const disk = await readDiskCache();
    if (disk?.pv_modules?.rows && disk?.inverters?.rows && disk?.batteries?.rows) {
      memoryCache = disk;
    }
  })();
  return initPromise;
}

export async function syncCecApprovedProducts({ force = false } = {}) {
  await initFromDiskOnce();

  const now = new Date();
  const last = memoryCache.updatedAt ? new Date(memoryCache.updatedAt) : null;
  const ageMs = last ? now.getTime() - last.getTime() : Infinity;

  // Default: refresh at most every 12h unless forced
  if (!force && ageMs < 12 * 60 * 60 * 1000) {
    return { ok: true, skipped: true, updatedAt: memoryCache.updatedAt };
  }

  const nextCache = {
    updatedAt: now.toISOString(),
    sources: {},
    pv_modules: { rows: [] },
    inverters: { rows: [] },
    batteries: { rows: [] },
  };

  for (const [type, src] of Object.entries(SOURCES)) {
    const resp = await fetch(src.csvUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'XVRYTHNG/1.0 (approved-products sync)',
        Accept: 'text/csv,*/*',
      },
    });
    if (!resp.ok) {
      const err = new Error(`Failed to download ${type} CSV (HTTP ${resp.status})`);
      err.status = resp.status;
      throw err;
    }
    const text = await resp.text();
    const rows = parseCsv(text);
    nextCache[type] = { rows };
    nextCache.sources[type] = { csvUrl: src.csvUrl, rowCount: rows.length };
  }

  memoryCache = nextCache;
  await writeDiskCache(memoryCache);
  return { ok: true, skipped: false, updatedAt: memoryCache.updatedAt, sources: memoryCache.sources };
}

export async function getCecCacheMeta() {
  await initFromDiskOnce();
  return {
    updatedAt: memoryCache.updatedAt,
    sources: memoryCache.sources || {},
  };
}

export async function getPvPanelBrands() {
  await initFromDiskOnce();
  const set = new Map(); // canonical -> display
  for (const r of memoryCache.pv_modules.rows || []) {
    const name = normalizeStr(r['Manufacturer']) || normalizeStr(r['Licensee/Certificate Holder']);
    if (!name) continue;
    const key = canonicalKey(name);
    if (!set.has(key)) set.set(key, name);
  }
  return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
}

export async function getPvPanelModelsByBrand(brand) {
  await initFromDiskOnce();
  const want = canonicalKey(brand);
  if (!want) return [];
  const set = new Map();
  for (const r of memoryCache.pv_modules.rows || []) {
    const b = normalizeStr(r['Manufacturer']) || normalizeStr(r['Licensee/Certificate Holder']);
    if (!b || canonicalKey(b) !== want) continue;
    const model = normalizeStr(r['Model Number']);
    if (!model) continue;
    const key = canonicalKey(model);
    if (!set.has(key)) set.set(key, model);
  }
  return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
}

function parsePanelWattsFromRow(row, model) {
  const candidates = [
    row?.['Module Power (W)'],
    row?.['Power (W)'],
    row?.['Rated Power (W)'],
    row?.['Nominal Power (W)'],
    row?.['Pmax (W)'],
  ];
  for (const raw of candidates) {
    const n = Number(String(raw ?? '').replace(/[^\d.]/g, ''));
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  }

  // Fallback: infer watts from model number patterns (e.g. "...-425", "... 440W")
  const s = normalizeStr(model);
  if (!s) return null;
  const mW = s.match(/(?:^|[^0-9])([2-8]\d{2})(?:\s*W\b|[^0-9]|$)/i);
  if (mW) {
    const n = Number(mW[1]);
    if (Number.isFinite(n) && n >= 200 && n <= 900) return n;
  }
  return null;
}

export async function getPvPanelModelDetails(brand, model) {
  await initFromDiskOnce();
  const wantBrand = canonicalKey(brand);
  const wantModel = canonicalKey(model);
  if (!wantBrand || !wantModel) return null;

  for (const r of memoryCache.pv_modules.rows || []) {
    const b = normalizeStr(r['Manufacturer']) || normalizeStr(r['Licensee/Certificate Holder']);
    if (!b || canonicalKey(b) !== wantBrand) continue;
    const m = normalizeStr(r['Model Number']);
    if (!m || canonicalKey(m) !== wantModel) continue;
    return {
      module_watts: parsePanelWattsFromRow(r, m),
    };
  }
  return null;
}

export async function getInverterBrands() {
  await initFromDiskOnce();
  const set = new Map();
  for (const r of memoryCache.inverters.rows || []) {
    const name = toAllowedInverterBrand(inferInverterBrand(r));
    if (!name) continue;
    const key = canonicalKey(name);
    if (!set.has(key)) set.set(key, name);
  }
  return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
}

export async function getInverterModelsByBrand(brand) {
  await initFromDiskOnce();
  const want = canonicalKey(toAllowedInverterBrand(brand));
  if (!want) return [];
  const set = new Map();
  for (const r of memoryCache.inverters.rows || []) {
    const b = toAllowedInverterBrand(inferInverterBrand(r));
    if (!b || canonicalKey(b) !== want) continue;
    const model = normalizeStr(r['Model Number']);
    if (!model) continue;
    const key = canonicalKey(model);
    if (!set.has(key)) set.set(key, model);
  }
  return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
}

export async function getInverterSeriesByBrandModel(brand, model = '') {
  await initFromDiskOnce();
  const wantBrand = canonicalKey(toAllowedInverterBrand(brand));
  const wantModel = canonicalKey(model);
  if (!wantBrand) return [];
  const set = new Map();
  for (const r of memoryCache.inverters.rows || []) {
    const b = toAllowedInverterBrand(inferInverterBrand(r));
    if (!b || canonicalKey(b) !== wantBrand) continue;
    const m = normalizeStr(r['Model Number']);
    if (wantModel && canonicalKey(m) !== wantModel) continue;
    const series = normalizeStr(r['Series']);
    if (!series) continue;
    const key = canonicalKey(series);
    if (!set.has(key)) set.set(key, series);
  }
  return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
}

export async function getInverterModelDetails(brand, model) {
  await initFromDiskOnce();
  const wantBrand = canonicalKey(toAllowedInverterBrand(brand));
  const wantModel = canonicalKey(model);
  if (!wantBrand || !wantModel) return null;

  for (const r of memoryCache.inverters.rows || []) {
    const b = toAllowedInverterBrand(inferInverterBrand(r));
    if (!b || canonicalKey(b) !== wantBrand) continue;
    const m = normalizeStr(r['Model Number']);
    if (!m || canonicalKey(m) !== wantModel) continue;
    const series = normalizeStr(r['Series']) || null;
    const powerKwRaw = normalizeStr(r['AC Power (kW)']);
    const powerKw = powerKwRaw === '' ? null : Number(powerKwRaw);
    return {
      series,
      power_kw: Number.isFinite(powerKw) ? powerKw : null,
    };
  }
  return null;
}

export async function getBatteryBrands() {
  await initFromDiskOnce();
  const set = new Map();
  for (const r of memoryCache.batteries.rows || []) {
    const name = normalizeStr(r['Brand Name']);
    if (!name) continue;
    const key = canonicalKey(name);
    if (!set.has(key)) set.set(key, name);
  }
  return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
}

export async function getBatteryModelsByBrand(brand) {
  await initFromDiskOnce();
  const want = canonicalKey(brand);
  if (!want) return [];
  const set = new Map();
  for (const r of memoryCache.batteries.rows || []) {
    const b = normalizeStr(r['Brand Name']);
    if (!b || canonicalKey(b) !== want) continue;
    const model = normalizeStr(r['Model Number']);
    if (!model) continue;
    const key = canonicalKey(model);
    if (!set.has(key)) set.set(key, model);
  }
  return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
}

