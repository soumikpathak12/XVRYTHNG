// frontend/src/utils/template.js

// Default-first selection: if a selected template is not provided, use "default".
export function chooseTemplate({ templates, selectedId }) {
  const list = Array.isArray(templates) ? templates : [];
  const selected = selectedId ? list.find(t => String(t.id) === String(selectedId)) : null;
  const def = list.find(t => t.key === 'default') || null;
  return selected || def || null;
}

export function getRequiredKeys(template) {
  const t = template || {};
  let explicit = [];
  try {
    explicit = t.validation?.requiredFields || JSON.parse(t.validation || '{}')?.requiredFields || [];
  } catch { /* ignore */ }

  const steps = Array.isArray(t.steps) ? t.steps : JSON.parse(t.steps || '[]');
  const fromFields = steps
    .flatMap(s => s.sections || [])
    .flatMap(sec => sec.fields || [])
    .filter(f => f.required)
    .map(f => f.key);

  return Array.from(new Set([...(explicit || []), ...fromFields]));
}

export function isVisible(field, formData) {
  const v = field.visibleIf;
  if (!v) return true;
  const cur = formData[v.field];
  switch (v.operator || 'eq') {
    case 'eq': return cur === v.value;
    case 'ne': return cur !== v.value;
    case 'in': {
      const vals = v.value || [];
      if (Array.isArray(cur)) return cur.some(x => vals.includes(x));
      return vals.includes(cur);
    }
    case 'notin': {
      const vals = v.value || [];
      if (Array.isArray(cur)) return !cur.some(x => vals.includes(x));
      return !vals.includes(cur);
    }
    case 'truthy': return !!cur;
    case 'falsy': return !cur;
    default: return true;
  }
}

export function formatValueForPdf(val) {
  if (val == null || val === '') return '—';
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'object' && val.preview_data_url) return val.filename || 'file';
  return String(val);
}