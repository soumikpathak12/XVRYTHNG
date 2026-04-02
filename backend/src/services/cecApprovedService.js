import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CEC_CACHE_PATH = path.resolve(__dirname, '../../data/cec-approved/cache.json');

let parsedCache = null;

function sortAlpha(a, b) {
  return a.localeCompare(b, 'en', { sensitivity: 'base', numeric: true });
}

function normalizeText(value) {
  if (value == null) return '';
  return String(value).trim();
}

async function loadCache() {
  if (parsedCache) return parsedCache;
  const raw = await readFile(CEC_CACHE_PATH, 'utf8');
  parsedCache = JSON.parse(raw);
  return parsedCache;
}

export async function getPanelBrandOptions() {
  const cache = await loadCache();
  const rows = Array.isArray(cache?.pv_modules?.rows) ? cache.pv_modules.rows : [];

  const brands = Array.from(
    rows.reduce((set, row) => {
      const brand = normalizeText(row?.['Licensee/Certificate Holder']);
      if (brand) set.add(brand);
      return set;
    }, new Set()),
  ).sort(sortAlpha);

  return {
    updatedAt: cache?.updatedAt ?? null,
    brands,
  };
}

export async function getPanelModelOptionsByBrand(brand) {
  const normalizedBrand = normalizeText(brand);
  if (!normalizedBrand) {
    return { brand: '', models: [] };
  }

  const cache = await loadCache();
  const rows = Array.isArray(cache?.pv_modules?.rows) ? cache.pv_modules.rows : [];
  const wanted = normalizedBrand.toLowerCase();

  const models = Array.from(
    rows.reduce((set, row) => {
      const rowBrand = normalizeText(row?.['Licensee/Certificate Holder']).toLowerCase();
      if (rowBrand !== wanted) return set;

      const model = normalizeText(row?.['Model Number']);
      if (model) set.add(model);
      return set;
    }, new Set()),
  ).sort(sortAlpha);

  return {
    brand: normalizedBrand,
    models,
  };
}
