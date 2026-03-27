// Maps lead columns + SolarQuotes marketing_payload_json into Site Inspection template
// dropdown values (sectionCatalog core: roof_type, meter_phase, house_storey).

const ROOF_OPTIONS = ['Tin Colorbond', 'Tin Kliplock', 'Tile Concrete', 'Tile Terracotta', 'Tile Shillings'];

function trimStr(v) {
  if (v == null) return '';
  return String(v).trim();
}

function normRoof(s) {
  return trimStr(s)
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Match pipeline / SolarQuotes roof strings to inspection select options.
 * Handles e.g. "Tile (Concrete)" from SQ mapRoofType → "Tile Concrete".
 */
export function matchRoofTypeToInspectionSelect(raw) {
  const r = normRoof(raw);
  if (!r) return null;
  for (const opt of ROOF_OPTIONS) {
    if (normRoof(opt) === r) return opt;
  }
  for (const opt of ROOF_OPTIONS) {
    const n = normRoof(opt).replace(/\s/g, '');
    const rr = r.replace(/\s/g, '');
    if (n === rr || rr.includes(n) || n.includes(rr)) return opt;
  }
  if (r.includes('klip')) return 'Tin Kliplock';
  if (r.includes('colorbond') || r.includes('colourbond')) return 'Tin Colorbond';
  if (r.includes('shilling')) return 'Tile Shillings';
  if (r.includes('terracotta')) return 'Tile Terracotta';
  if (r.includes('concrete') && r.includes('tile')) return 'Tile Concrete';
  if (r.includes('tile')) return 'Tile Concrete';
  return null;
}

export function matchMeterPhaseToInspectionSelect(raw) {
  const s = trimStr(raw).toLowerCase();
  if (!s) return null;
  if (s === '1' || s === 'single' || s === 'one') return 'Single';
  if (s === '2' || s === 'double' || s === 'two') return 'Double';
  if (s === '3' || s === 'three' || s === 'triple') return 'Three';
  const cap = s.charAt(0).toUpperCase() + s.slice(1);
  if (['Single', 'Double', 'Three'].includes(cap)) return cap;
  return null;
}

export function matchHouseStoreyToInspectionSelect(raw) {
  const s = trimStr(raw).toLowerCase();
  if (!s) return null;
  if (s === '1' || s === 'single' || s === 'one' || s === 'one storey' || s === 'one-story')
    return 'Single';
  if (s === '2' || s === 'double' || s === 'two' || s === 'two storey' || s === 'two-story')
    return 'Double';
  if (s === '3' || s === 'triple' || s === 'three' || s === 'multi' || s === 'triple storey')
    return 'Triple';
  const cap = s.charAt(0).toUpperCase() + s.slice(1);
  if (['Single', 'Double', 'Triple'].includes(cap)) return cap;
  return null;
}

export function parseLeadMarketingPayload(lead) {
  const raw = lead?.marketing_payload_json;
  if (raw == null) return null;
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

function fuzzySqValue(sq, patterns) {
  if (!sq || typeof sq !== 'object') return '';
  for (const pattern of patterns) {
    const k = pattern.toLowerCase();
    const match = Object.keys(sq).find((pk) => pk.toLowerCase() === k);
    if (match != null) {
      const v = sq[match];
      if (v != null && String(v).trim() !== '') return String(v).trim();
    }
  }
  const clean = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const pattern of patterns) {
    const cp = clean(pattern);
    for (const pk of Object.keys(sq)) {
      if (clean(pk) === cp || clean(pk).includes(cp)) {
        const v = sq[pk];
        if (v != null && String(v).trim() !== '') return String(v).trim();
      }
    }
  }
  return '';
}

/**
 * System type for Site Inspection summary: lead pipeline value first, then SolarQuotes Features.
 * @param {object|null} lead
 * @returns {string}
 */
export function getSystemTypeForInspection(lead) {
  const fromLead = trimStr(lead?.system_type);
  if (fromLead) return fromLead;
  const sq = parseLeadMarketingPayload(lead);
  return fuzzySqValue(sq, ['features', 'feature', 'systemfeatures', 'system_features']);
}

/**
 * @param {object|null} lead – row from GET /api/leads/:id (snake_case)
 * @returns {{ roof_type?: string, meter_phase?: string, house_storey?: string, 'switchboard.meterNumber'?: string, 'switchboard.nmi'?: string }}
 */
export function buildInspectionDefaultsFromLead(lead) {
  if (!lead) return {};

  const sq = parseLeadMarketingPayload(lead);

  const roofFromLead = trimStr(lead.roof_type);
  const meterFromLead = trimStr(lead.meter_phase);
  const storeyFromLead = trimStr(lead.house_storey);
  const meterNumberFromLead =
    trimStr(lead.meter_number) ||
    trimStr(lead.meterNumber) ||
    trimStr(lead.lead_meter_number);
  const nmiFromLead =
    trimStr(lead.nmi_number) ||
    trimStr(lead.nmiNumber) ||
    trimStr(lead.lead_nmi_number);

  const mappedRoof = sq?.mappedRoofType != null ? trimStr(sq.mappedRoofType) : '';
  const storiesSq = fuzzySqValue(sq, ['stories', 'storeys', 'house_storey', 'housestorey', 'storiescount', 'floors']);

  const roof =
    matchRoofTypeToInspectionSelect(roofFromLead) ||
    matchRoofTypeToInspectionSelect(mappedRoof);
  const meter = matchMeterPhaseToInspectionSelect(meterFromLead);
  const storey =
    matchHouseStoreyToInspectionSelect(storeyFromLead) ||
    matchHouseStoreyToInspectionSelect(storiesSq);

  const out = {};
  if (roof) out.roof_type = roof;
  if (meter) out.meter_phase = meter;
  if (storey) out.house_storey = storey;
  if (meterNumberFromLead) out['switchboard.meterNumber'] = meterNumberFromLead;
  if (nmiFromLead) out['switchboard.nmi'] = nmiFromLead;
  return out;
}

export function isEmptyInspectionValue(val) {
  if (val == null) return true;
  if (typeof val === 'string') return val.trim() === '';
  if (typeof val === 'object') return false;
  return String(val).trim() === '';
}

/**
 * MySQL / API datetime → `YYYY-MM-DDTHH:mm` for datetime-local inputs.
 * Prefer parsing naive `YYYY-MM-DD HH:mm:ss` without `Date` (avoids UTC offset shifting the calendar day).
 * @param {string|Date|number|null|undefined} raw
 * @returns {string|null}
 */
export function dbDatetimeToDatetimeLocalInput(raw) {
  if (raw == null) return null;
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return null;
    const pad = (n) => String(n).padStart(2, '0');
    return `${raw.getFullYear()}-${pad(raw.getMonth() + 1)}-${pad(raw.getDate())}T${pad(raw.getHours())}:${pad(raw.getMinutes())}`;
  }
  const s = String(raw).trim();
  if (!s) return null;
  // Naive SQL datetime (no Z / offset): use wall-clock parts as-is for datetime-local.
  const hasTzSuffix = /[zZ]|[+-]\d{2}:?\d{2}$/.test(s);
  if (!hasTzSuffix) {
    const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/);
    if (m) return `${m[1]}T${m[2]}:${m[3]}`;
  }

  // MySQL DATETIME is timezone-less, but some drivers / serializers may return it with `Z`.
  // For datetime-local inputs, we want the wall-clock parts (ignore timezone marker).
  const wall = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::\d{2})?/);
  if (wall) return `${wall[1]}T${wall[2]}:${wall[3]}`;

  // Fallback: best-effort parsing to local wall-clock.
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Scheduled slot for the visit: inspection row first, then lead columns.
 * @param {object|null} lead
 * @param {object|null} inspectionRow – e.g. GET site-inspection payload (has scheduled_at)
 * @returns {string|null}
 */
export function getInspectionScheduleDatetimeLocal(lead, inspectionRow) {
  const fromInspection = inspectionRow && dbDatetimeToDatetimeLocalInput(inspectionRow.scheduled_at);
  if (fromInspection) return fromInspection;
  const fromLead =
    dbDatetimeToDatetimeLocalInput(lead?.site_inspection_date) ||
    dbDatetimeToDatetimeLocalInput(lead?.siteInspectionDate);
  return fromLead || null;
}

/**
 * Lead `site_inspection_date` → value for HTML datetime-local (local wall time).
 * @param {object|null} lead
 * @returns {string|null}
 */
export function siteInspectionDateToDatetimeLocal(lead) {
  return getInspectionScheduleDatetimeLocal(lead, null);
}

/**
 * Fill only missing keys on the inspection form from the lead / SolarQuotes payload.
 */
export function mergeLeadDefaultsIntoInspectionForm(form, lead) {
  const defaults = buildInspectionDefaultsFromLead(lead);
  const next = { ...form };

  if (Object.keys(defaults).length) {
    for (const [key, val] of Object.entries(defaults)) {
      if (val == null || val === '') continue;
      if (!isEmptyInspectionValue(next[key])) continue;
      next[key] = val;
    }
  }

  if (lead) {
    if (isEmptyInspectionValue(next.inspected_at)) {
      const sched = getInspectionScheduleDatetimeLocal(lead, null);
      if (sched) next.inspected_at = sched;
    }

    const rawRoof = trimStr(lead.roof_type);
    const sq = parseLeadMarketingPayload(lead);
    const mappedRoofSq = sq?.mappedRoofType != null ? trimStr(sq.mappedRoofType) : '';
    const roofCanonical =
      matchRoofTypeToInspectionSelect(rawRoof) ||
      matchRoofTypeToInspectionSelect(mappedRoofSq);
    const roofMaterialVal = roofCanonical || rawRoof || mappedRoofSq;
    if (roofMaterialVal && isEmptyInspectionValue(next['roofProfile.roofMaterial'])) {
      next['roofProfile.roofMaterial'] = roofMaterialVal;
    }
    if (roofCanonical && isEmptyInspectionValue(next.roof_type)) {
      next.roof_type = roofCanonical;
    }
  }

  return next;
}
