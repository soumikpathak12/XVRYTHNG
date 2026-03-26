import { INSPECTION_FORM_FIELD_KEYS, formKeyToSiColumn } from './siteInspectionFormColumns.js';

const KEY_TO_COL = Object.fromEntries(
  INSPECTION_FORM_FIELD_KEYS.map((k) => [k, formKeyToSiColumn(k)])
);

export function serializeInspectionFieldValue(val) {
  if (val === undefined) return null;
  if (val === null) return null;
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return val === '' ? null : String(val);
  }
  try {
    return JSON.stringify(val);
  } catch {
    return null;
  }
}

export function deserializeInspectionFieldValue(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw !== 'string') return raw;
  const t = raw.trim();
  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      return JSON.parse(t);
    } catch {
      return raw;
    }
  }
  return raw;
}

/** Build { formKey: value } from a DB row (snake_case si_* columns). */
export function rowToInspectionForm(row) {
  if (!row || typeof row !== 'object') return {};
  const out = {};
  for (const formKey of INSPECTION_FORM_FIELD_KEYS) {
    const col = KEY_TO_COL[formKey];
    if (!col || !(col in row)) continue;
    const raw = row[col];
    if (raw == null || raw === '') continue;
    out[formKey] = deserializeInspectionFieldValue(raw);
  }
  return out;
}

/** `si_x = ?, ...` fragments and bound values for UPDATE/INSERT */
export function formObjectToSiSqlParts(formObj) {
  const fragments = [];
  const vals = [];
  for (const formKey of INSPECTION_FORM_FIELD_KEYS) {
    const col = KEY_TO_COL[formKey];
    const v =
      formObj && Object.prototype.hasOwnProperty.call(formObj, formKey)
        ? serializeInspectionFieldValue(formObj[formKey])
        : null;
    fragments.push(`${col} = ?`);
    vals.push(v);
  }
  return { fragments, vals };
}

export function siInsertColumnListSql() {
  return INSPECTION_FORM_FIELD_KEYS.map((k) => KEY_TO_COL[k]).join(', ');
}

export function siInsertPlaceholders() {
  return INSPECTION_FORM_FIELD_KEYS.map(() => '?').join(', ');
}

export function formObjectToSiInsertValues(formObj) {
  return INSPECTION_FORM_FIELD_KEYS.map((formKey) =>
    formObj && Object.prototype.hasOwnProperty.call(formObj, formKey)
      ? serializeInspectionFieldValue(formObj[formKey])
      : null
  );
}

export function stripSiColumnsFromRow(row) {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  for (const k of Object.keys(out)) {
    if (k.startsWith('si_')) delete out[k];
  }
  return out;
}

/** Prefer normalized `si_*` columns; fall back to legacy JSON blobs. */
export function inspectionFormFromRowWithLegacyFallback(row) {
  const fromCols = rowToInspectionForm(row);
  if (fromCols && Object.keys(fromCols).length > 0) return fromCols;
  const formRaw =
    row?.form_data_json && String(row.form_data_json).trim()
      ? row.form_data_json
      : row?.additional_notes;
  if (!formRaw) return {};
  try {
    const obj = typeof formRaw === 'string' ? JSON.parse(formRaw) : formRaw;
    if (!obj || typeof obj !== 'object') return {};
    const rest = { ...obj };
    delete rest._t;
    delete rest._v;
    return rest;
  } catch {
    return {};
  }
}

export function parseFormDataJsonBody(formDataJsonBody) {
  let obj = {};
  if (formDataJsonBody != null && typeof formDataJsonBody === 'object' && !Array.isArray(formDataJsonBody)) {
    obj = { ...formDataJsonBody };
  } else if (typeof formDataJsonBody === 'string' && formDataJsonBody.trim()) {
    try {
      const parsed = JSON.parse(formDataJsonBody);
      obj = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      obj = {};
    }
  }
  return obj;
}

/** Merge DB-backed / legacy form with incoming draft payload so partial saves do not wipe si_* columns. */
export function mergeInspectionFormPayload(existingRow, formDataJsonBody) {
  const base = existingRow ? inspectionFormFromRowWithLegacyFallback(existingRow) : {};
  const incoming = parseFormDataJsonBody(formDataJsonBody);
  return { ...base, ...incoming };
}
