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
    const name = normalizeStr(r['Licensee/Certificate Holder']);
    if (!name) continue;
    const key = canonicalKey(name);
    if (!set.has(key)) set.set(key, name);
  }
  return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
}

export async function getInverterBrands() {
  await initFromDiskOnce();
  const set = new Map();
  for (const r of memoryCache.inverters.rows || []) {
    const name = normalizeStr(r['Manufacturer']);
    if (!name) continue;
    const key = canonicalKey(name);
    if (!set.has(key)) set.set(key, name);
  }
  return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
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

