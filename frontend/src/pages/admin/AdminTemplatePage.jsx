// frontend/src/pages/admin/AdminTemplatesPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  getCompanyInspectionTemplates,
  saveInspectionTemplate,
  publishInspectionTemplate,
  deleteInspectionTemplate
} from '../../services/api.js';
import { SECTION_KEYS, getSectionCatalog } from '../../templates/sectionCatalog.js';

/** Brand palette */
const BRAND = {
  primaryTeal: '#1A7B7B',
  primaryTealHover: '#176D6D',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',
  surfaceAlt2: '#F3F4F6',
  border: '#E5E7EB',
  borderStrong: '#CBD5E1',
  textPrimary: '#0F172A',
  textMuted: '#6B7280',
  danger: '#DC3545',
  dangerHover: '#B02A37',
  info: '#17A2B8',
  ring: 'rgba(26,123,123,0.35)',
  shadow: 'rgba(2,6,23,0.06)',
};

/** Common UI tokens (pure style objects) */
const S = {
  card: {
    background: BRAND.surface,
    border: `1px solid ${BRAND.border}`,
    borderRadius: 14,
    padding: 16,
    boxShadow: `0 1px 2px ${BRAND.shadow}, 0 8px 24px ${BRAND.shadow}`,
  },
  input: {
    width: '100%',
    border: `1px solid ${BRAND.border}`,
    borderRadius: 10,          // rounded input
    padding: '10px 12px',
    outline: 'none',
    background: '#fff',
    color: BRAND.textPrimary,
    transition: 'border-color .15s ease, box-shadow .15s ease',
  },
  inputFocus: {
    borderColor: BRAND.primaryTeal,
    boxShadow: `0 0 0 3px ${BRAND.ring}`,
  },

  /* ==== Buttons (compact & consistent) ==== */
  btnBase: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,                 // fixed height
    padding: '0 12px',          // compact horizontal padding
    borderRadius: 10,           // moderately rounded
    fontWeight: 600,
    lineHeight: 1,
    cursor: 'pointer',
    border: `1px solid ${BRAND.border}`,
    background: '#fff',
    color: BRAND.textPrimary,
    transition: 'background .15s ease, color .15s ease, border-color .15s ease, transform .02s ease',
    userSelect: 'none',
  },
  btnPrimary: {
    background: BRAND.primaryTeal,
    color: '#fff',
    borderColor: BRAND.primaryTeal,
  },
  btnPrimaryHover: {
    background: BRAND.primaryTealHover,
    borderColor: BRAND.primaryTealHover,
  },
  btnGhost: {
    background: '#fff',
    color: BRAND.textPrimary,
    borderColor: BRAND.borderStrong, // visible outline
  },
  btnGhostHover: {
    background: '#F8FAFC',
    borderColor: BRAND.border,
  },
  btnDanger: {
    background: '#fff',
    color: BRAND.danger,
    borderColor: '#F1B8BF', // stronger outline
  },
  btnDangerHover: {
    background: '#FFF3F4',
    borderColor: '#E78E98',
    color: BRAND.dangerHover,
  },

  /* ==== List row (tighter & cleaner) ==== */
  listItem: {
    padding: '10px 8px',
    borderBottom: `1px solid ${BRAND.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 8,
    transition: 'background .12s ease, border-color .12s ease',
  },
  listItemHover: {
    background: BRAND.surfaceAlt,
    borderColor: BRAND.borderStrong,
  },
  pill: (bg, color) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 8px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background: bg,
    color,
    border: `1px solid ${BRAND.border}`,
  }),
};

const LABELS = {
  core: "Core Details",
  job: "Job Details",
  switchboard: "Switchboard / Main MSB",
  subBoard: "Sub‑Board",
  inverter: "Inverter Installation Location",
  battery: "Battery Details",
  monitor: "Monitoring & Existing",
  roof: "Roof Type",
  mudmap: "Mud Map",
  final: "Final Checks",
};

const emptyTemplate = {
  id: null,
  key: "",
  name: "",
  version: 1,
  status: "draft",
  appliesTo: [],
  steps: [], // will be built from enabledSections + fieldConfig
  validation: { requiredFields: [
    "inspected_at",
    "inspector_name",
    "meter_phase",
    "inverter_location",
    "msb_condition",
    "roof_type"
  ]},
  meta: {
    enabledSections: [...SECTION_KEYS], // default enable all
    stepGuards: []
  }
};

/** Utility: parse DB values safely */
function ensureObject(val, fallback) {
  if (!val) return fallback;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return fallback; }
  }
  return val;
}
function ensureArray(val, fallback = []) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const arr = JSON.parse(val);
      return Array.isArray(arr) ? arr : fallback;
    } catch { return fallback; }
  }
  return fallback;
}

/** Build a default "fieldConfig" from catalog (used when template has no steps yet) */
function buildDefaultFieldConfigFromCatalog() {
  const catalog = getSectionCatalog();
  const config = {};
  for (const [secKey, entry] of Object.entries(catalog)) {
    const secObj = {};
    for (const sub of entry.sections || []) {
      const fldObj = {};
      for (const f of sub.fields || []) {
        fldObj[f.key] = {
          include: true,
          label: f.label || f.key,
          required: !!f.required,
        };
      }
      secObj[sub.id] = { fields: fldObj };
    }
    config[secKey] = secObj;
  }
  return config;
}

/** Build "fieldConfig" from existing steps (when template is being edited) */
function buildFieldConfigFromSteps(steps) {
  const config = {};
  const arr = ensureArray(steps, []);
  for (const st of arr) {
    const secKey = st.id; // top-level section key
    for (const sub of (st.sections || [])) {
      config[secKey] = config[secKey] || {};
      const fldObj = {};
      for (const f of (sub.fields || [])) {
        fldObj[f.key] = {
          include: true,
          label: f.label || f.key,
          required: !!f.required,
        };
      }
      config[secKey][sub.id] = { fields: fldObj };
    }
  }
  return config;
}

/** Merge catalog with fieldConfig to produce "steps" saved to DB */
function materializeSteps(enabledSections, fieldConfig) {
  const catalog = getSectionCatalog();
  const keys = Array.isArray(enabledSections) && enabledSections.length ? enabledSections : SECTION_KEYS;
  const steps = [];

  for (const secKey of keys) {
    const entry = catalog[secKey];
    if (!entry) continue;

    const cfgSec = fieldConfig?.[secKey] || {};
    const outSections = [];

    for (const sub of (entry.sections || [])) {
      const cfgSub = cfgSec[sub.id]?.fields || {};
      const fields = [];

      for (const f of (sub.fields || [])) {
        const overrides = cfgSub[f.key];
        const include = overrides ? !!overrides.include : true;
        if (!include) continue;

        fields.push({
          ...f,
          label: overrides?.label ?? f.label,
          required: overrides?.required ?? !!f.required,
        });
      }

      outSections.push({
        id: sub.id,
        label: sub.label,
        fields
      });
    }

    steps.push({ id: entry.id, label: entry.label, sections: outSections });
  }

  return steps;
}

/** Button component with variants (no icons) */
function Btn({ children, onClick, variant = 'ghost', style, title }) {
  const [hover, setHover] = useState(false);
  const base = { ...S.btnBase };
  let spec = {};
  if (variant === 'primary') spec = S.btnPrimary;
  else if (variant === 'danger') spec = S.btnDanger;
  else spec = S.btnGhost;
  let hoverStyle = {};
  if (variant === 'primary') hoverStyle = S.btnPrimaryHover;
  else if (variant === 'danger') hoverStyle = S.btnDangerHover;
  else hoverStyle = S.btnGhostHover;

  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.99)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      style={{ ...base, ...spec, ...(hover ? hoverStyle : {}), ...style }}
    >
      {children}
    </button>
  );
}

/** Single list row component (keeps hooks out of parent map) */
function TemplateListItem({ t, onEdit, onDelete }) {
  const [hover, setHover] = useState(false);
  const statusColor = t.status === 'published' ? '#DCFCE7' : '#E5E7EB';
  const statusText = t.status === 'published' ? '#166534' : BRAND.textMuted;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...S.listItem, ...(hover ? S.listItemHover : {}) }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            color: BRAND.textPrimary,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={t.name}
        >
          {t.name}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: BRAND.textMuted }}>
            {t.key} • v{t.version}
          </span>
          <span style={S.pill(statusColor, statusText)}>{t.status}</span>
        </div>
      </div>

      {/* Right-side action buttons */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <Btn onClick={() => onEdit(t)} variant="ghost" title="Edit">Edit</Btn>
        <Btn onClick={() => onDelete(t.id)} variant="danger" title="Delete">Delete</Btn>
      </div>
    </div>
  );
}

/** Admin page */
export default function AdminTemplatesPage() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(emptyTemplate);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  // Field configurator state
  const [fieldConfig, setFieldConfig] = useState(buildDefaultFieldConfigFromCatalog());
  const [activeSectionKey, setActiveSectionKey] = useState('core');

  /** Track focus key for input focus ring */
  const [focusKey, setFocusKey] = useState(null);
  const onFocus = (k) => setFocusKey(k);
  const onBlur = () => setFocusKey(null);

  /** Load templates list */
  async function load() {
    setLoading(true);
    try {
      const r = await getCompanyInspectionTemplates(); // { success, data: [...] }
      setList(r.data ?? []);
    } catch (e) {
      setError(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  /** Select a template from the left list */
  function pick(tpl) {
    const validation = ensureObject(tpl.validation, emptyTemplate.validation);
    const meta = ensureObject(tpl.meta, {});
    const appliesTo = ensureArray(tpl.appliesTo ?? tpl.applies_to, []);

    const steps = ensureArray(tpl.steps, []);
    const cfg = steps.length > 0
      ? buildFieldConfigFromSteps(steps)
      : buildDefaultFieldConfigFromCatalog();

    const enabledSections = (meta.enabledSections && meta.enabledSections.length)
      ? meta.enabledSections
      : [...SECTION_KEYS];

    const stepGuards = Array.isArray(meta.stepGuards) ? meta.stepGuards : [];

    setForm({
      id: tpl.id,
      key: tpl.key,
      name: tpl.name,
      version: tpl.version,
      status: tpl.status,
      appliesTo,
      steps,             // we will rebuild on save
      validation,
      meta: { enabledSections, stepGuards }
    });
    setFieldConfig(cfg);
    setActiveSectionKey(enabledSections[0] ?? 'core');
    setMsg("");
    setError("");
  }

  /** Toggle a top-level section on/off */
  function toggleSection(secKey) {
    const enabled = new Set(form.meta?.enabledSections ?? []);
    const wasEnabled = enabled.has(secKey);
    if (wasEnabled) enabled.delete(secKey);
    else enabled.add(secKey);
    const next = [...enabled];
    setForm((f) => ({
      ...f,
      meta: { ...f.meta, enabledSections: next }
    }));
    if (wasEnabled) {
      // Section disabled: if it was active, jump to first enabled
      if (activeSectionKey === secKey && next.length) setActiveSectionKey(next[0]);
    } else {
      // Section enabled: select it immediately so user can edit content in one go
      setActiveSectionKey(secKey);
    }
  }

  /** Example step guard */
  function toggleSelfieGuardJob() {
    const guards = Array.isArray(form.meta?.stepGuards) ? [...form.meta.stepGuards] : [];
    const idx = guards.findIndex((g) => g.stepId === "job");
    const rule = { stepId: "job", fields: ["jobDetails.licenseSelfie"] };
    if (idx >= 0) {
      const same = JSON.stringify(guards[idx]) === JSON.stringify(rule);
      if (same) guards.splice(idx, 1);
      else guards[idx] = rule;
    } else {
      guards.push(rule);
    }
    setForm((f) => ({ ...f, meta: { ...f.meta, stepGuards: guards } }));
  }
  function hasSelfieGuardJob() {
    return Array.isArray(form.meta?.stepGuards) &&
      form.meta.stepGuards.some(
        (g) =>
          g.stepId === "job" &&
          Array.isArray(g.fields) &&
          g.fields.includes("jobDetails.licenseSelfie")
      );
  }

  /** Catalog + enabled sections */
  const catalog = useMemo(() => getSectionCatalog(), []);
  const enabledSections = form.meta?.enabledSections ?? [];
  const activeEntry = catalog[activeSectionKey];

  /** Field config mutators */
  function setFieldInclude(secKey, subId, fldKey, include) {
    setFieldConfig((cfg) => ({
      ...cfg,
      [secKey]: {
        ...(cfg[secKey] || {}),
        [subId]: {
          fields: {
            ...((cfg[secKey]?.[subId]?.fields) || {}),
            [fldKey]: {
              ...((cfg[secKey]?.[subId]?.fields?.[fldKey]) || {}),
              include
            }
          }
        }
      }
    }));
  }
  function setFieldLabel(secKey, subId, fldKey, label) {
    setFieldConfig((cfg) => ({
      ...cfg,
      [secKey]: {
        ...(cfg[secKey] || {}),
        [subId]: {
          fields: {
            ...((cfg[secKey]?.[subId]?.fields) || {}),
            [fldKey]: {
              ...((cfg[secKey]?.[subId]?.fields?.[fldKey]) || {}),
              label
            }
          }
        }
      }
    }));
  }
  function setFieldRequired(secKey, subId, fldKey, required) {
    setFieldConfig((cfg) => ({
      ...cfg,
      [secKey]: {
        ...(cfg[secKey] || {}),
        [subId]: {
          fields: {
            ...((cfg[secKey]?.[subId]?.fields) || {}),
            [fldKey]: {
              ...((cfg[secKey]?.[subId]?.fields?.[fldKey]) || {}),
              required
            }
          }
        }
      }
    }));
  }
  function resetSectionToDefaults(secKey) {
    const def = buildDefaultFieldConfigFromCatalog()[secKey];
    setFieldConfig((cfg) => ({ ...cfg, [secKey]: def }));
  }

  /** Sync this template's fields to the latest section catalog (all sections). */
  function syncFromCatalog() {
    const nextCfg = buildDefaultFieldConfigFromCatalog();
    setFieldConfig(nextCfg);
    // Clear custom steps so the next save fully regenerates them from catalog
    setForm((f) => ({ ...f, steps: [] }));
    setMsg("Synced fields from latest catalog. Click Save Draft to apply.");
  }

  /** Save (draft) */
  async function onSave() {
    try {
      setMsg("");
      setError("");

      const stepsBuilt = materializeSteps(form.meta?.enabledSections, fieldConfig);

      // Aggregate required fields into validation.requiredFields
      const requiredFields = [];
      for (const st of stepsBuilt) {
        for (const sub of (st.sections || [])) {
          for (const f of (sub.fields || [])) {
            if (f.required) requiredFields.push(f.key);
          }
        }
      }

      const payload = {
        id: form.id,
        key: form.key,
        name: form.name,
        version: form.version,
        status: form.status,
        appliesTo: form.appliesTo ?? [],
        steps: stepsBuilt,
        validation: { ...(form.validation || {}), requiredFields: Array.from(new Set(requiredFields)) },
        meta: {
          enabledSections: form.meta?.enabledSections ?? [],
          stepGuards: form.meta?.stepGuards ?? []
        }
      };

      const r = await saveInspectionTemplate(payload); // { success, id? }
      if (!form.id && r?.id) setForm((f) => ({ ...f, id: r.id }));
      setMsg("Saved");
      load();
    } catch (e) {
      setError(e.message ?? "Save failed");
    }
  }

  /** Publish */
  async function onPublish() {
    try {
      setMsg("");
      setError("");
      if (!form.id) return setError("Save before publish");
      await publishInspectionTemplate(form.id);
      setMsg("Published");
      load();
    } catch (e) {
      setError(e.message ?? "Publish failed");
    }
  }

  /** Delete */
  async function onDelete(id) {
    if (!window.confirm("Delete this template?")) return;
    try {
      await deleteInspectionTemplate(id);
      setForm({ ...emptyTemplate });
      setFieldConfig(buildDefaultFieldConfigFromCatalog());
      setActiveSectionKey('core');
      load();
    } catch (e) {
      setError(e.message ?? "Delete failed");
    }
  }

  /** Inputs with focus ring */
  const Input = (props) => {
    const isFocused = focusKey === props.name;
    return (
      <input
        {...props}
        onFocus={() => onFocus(props.name)}
        onBlur={onBlur}
        style={{ ...S.input, ...(isFocused ? S.inputFocus : {}), ...(props.style || {}) }}
      />
    );
  };
  const Select = (props) => {
    const isFocused = focusKey === props.name;
    return (
      <select
        {...props}
        onFocus={() => onFocus(props.name)}
        onBlur={onBlur}
        style={{ ...S.input, ...(isFocused ? S.inputFocus : {}), ...(props.style || {}) }}
      />
    );
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, padding: 20 }}>
      {/* LEFT: List */}
      <div style={{ ...S.card, height: "calc(100vh - 60px)", overflowY: "auto" }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12, color: BRAND.textPrimary }}>
          Templates
        </div>

        <Btn
          onClick={() => { setForm({ ...emptyTemplate }); setFieldConfig(buildDefaultFieldConfigFromCatalog()); setActiveSectionKey('core'); }}
          variant="primary"
          style={{ width: "100%", marginBottom: 12 }}
        >
          New Template
        </Btn>

        {loading ? (
          <div>Loading...</div>
        ) : (
          (list ?? []).map((t) => (
            <TemplateListItem
              key={t.id}
              t={t}
              onEdit={pick}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      {/* RIGHT: Editor */}
      <div style={{ ...S.card, padding: 20 }}>
        {msg && (
          <div
            style={{
              marginBottom: 12,
              padding: 10,
              background: "#ECFDF5",
              color: BRAND.primaryTeal,
              borderRadius: 10,
              border: `1px solid ${BRAND.border}`,
            }}
          >
            {msg}
          </div>
        )}
        {error && (
          <div
            style={{
              marginBottom: 12,
              padding: 10,
              background: "#FDECEE",
              color: BRAND.danger,
              borderRadius: 10,
              border: `1px solid ${BRAND.border}`,
            }}
          >
            {error}
          </div>
        )}

        {/* Basic Info */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <label style={{ fontWeight: 600 }}>
            Key
            <Input
              name="key"
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
              style={{ marginTop: 6 }}
              placeholder="e.g. residential_v1"
            />
          </label>
          <label style={{ fontWeight: 600 }}>
            Name
            <Input
              name="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              style={{ marginTop: 6 }}
              placeholder="Template display name"
            />
          </label>
          <label style={{ fontWeight: 600 }}>
            Version
            <Input
              name="version"
              type="number"
              value={form.version}
              onChange={(e) => setForm((f) => ({ ...f, version: Number(e.target.value) }))}
              style={{ marginTop: 6 }}
              min={1}
            />
          </label>
          <label style={{ fontWeight: 600 }}>
            Status
            <Select
              name="status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              style={{ marginTop: 6 }}
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
            </Select>
          </label>
          <label style={{ fontWeight: 600, gridColumn: 'span 3' }}>
            Applies To (comma separated)
            <Input
              name="appliesTo"
              value={(form.appliesTo ?? []).join(",")}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  appliesTo: e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                }))
              }
              style={{ marginTop: 6 }}
              placeholder="e.g. residential, commercial"
            />
          </label>
        </div>

        {/* Sections toggle */}
        <hr style={{ margin: "20px 0" }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, color: BRAND.textPrimary }}>Sections to show</div>
          <Btn
            onClick={syncFromCatalog}
            variant="ghost"
            title="Rebuild all sections from latest catalog"
          >
            Sync from latest catalog
          </Btn>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
          {SECTION_KEYS.map((k) => (
            <label
              key={k}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: 10,
                border: `1px solid ${BRAND.border}`,
                borderRadius: 10,
                background: BRAND.surfaceAlt2,
                cursor: "pointer",
                transition: 'border-color .12s ease, background .12s ease',
              }}
              onClick={(e) => {
                // Allow clicking anywhere in the card except the checkbox to select active section
                if (e.target?.type !== 'checkbox') setActiveSectionKey(k);
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#EEF2F7')}
              onMouseLeave={(e) => (e.currentTarget.style.background = BRAND.surfaceAlt2)}
            >
              <input
                type="checkbox"
                checked={(form.meta?.enabledSections ?? []).includes(k)}
                onChange={() => toggleSection(k)}
                onClick={(e) => e.stopPropagation()}
              />
              <span style={{ fontWeight: (activeSectionKey === k ? 800 : 600), color: BRAND.textPrimary }}>
                {LABELS[k] ?? k}
              </span>
              {activeSectionKey === k && (
                <span style={{ marginLeft: 'auto', color: BRAND.info, fontSize: 12 }}>
                  configuring…
                </span>
              )}
            </label>
          ))}
        </div>

        {/* Field Configurator */}
        <hr style={{ margin: "20px 0" }} />
        <div style={{ fontWeight: 800, marginBottom: 8, color: BRAND.textPrimary }}>
          Configure fields in: <span style={{ color: BRAND.textMuted }}>{LABELS[activeSectionKey] ?? activeSectionKey}</span>
        </div>
        {!activeEntry ? (
          <div style={{ color: BRAND.textMuted }}>Pick a section to configure fields.</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Btn
                type="button"
                onClick={() => resetSectionToDefaults(activeSectionKey)}
                variant="ghost"
                title="Reset this section to default fields"
              >
                Reset section to defaults
              </Btn>
            </div>

            {(activeEntry.sections || []).map((sub) => {
              const subCfg = fieldConfig?.[activeSectionKey]?.[sub.id]?.fields || {};
              return (
                <div key={sub.id} style={{ border: `1px solid ${BRAND.border}`, borderRadius: 12, padding: 12, background: '#fff' }}>
                  <div style={{ fontWeight: 700, marginBottom: 8, color: BRAND.textPrimary }}>{sub.label}</div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 90px', gap: 8, alignItems: 'center' }}>
                    <div style={{ fontSize: 12, color: BRAND.textMuted }}>Field key</div>
                    <div style={{ fontSize: 12, color: BRAND.textMuted }}>Field label</div>
                    <div style={{ fontSize: 12, color: BRAND.textMuted, textAlign: 'center' }}>Required</div>
                    <div style={{ fontSize: 12, color: BRAND.textMuted, textAlign: 'center' }}>Include</div>

                    {sub.fields.map((f) => {
                      const overrides = subCfg[f.key] || { include: true, label: f.label, required: !!f.required };
                      return (
                        <React.Fragment key={f.key}>
                          <div style={{ fontFamily: 'monospace', fontSize: 12, color: BRAND.textMuted, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {f.key}
                          </div>
                          <div>
                            <Input
                              name={`label-${sub.id}-${f.key}`}
                              value={overrides.label ?? f.label ?? f.key}
                              onChange={(e) => setFieldLabel(activeSectionKey, sub.id, f.key, e.target.value)}
                            />
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={!!overrides.required}
                              onChange={(e) => setFieldRequired(activeSectionKey, sub.id, f.key, e.target.checked)}
                            />
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={overrides.include !== false}
                              onChange={(e) => setFieldInclude(activeSectionKey, sub.id, f.key, e.target.checked)}
                            />
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Step Guards */}
        <hr style={{ margin: "20px 0" }} />
        <div style={{ padding: 12, border: `1px solid ${BRAND.border}`, borderRadius: 10, background: BRAND.surfaceAlt }}>
          <div style={{ fontWeight: 700, marginBottom: 10, color: BRAND.textPrimary }}>Step Guards</div>
          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input type="checkbox" checked={hasSelfieGuardJob()} onChange={toggleSelfieGuardJob} />
            <span>
              Require <b>License Selfie</b> before leaving <b>Job Details</b>
            </span>
          </label>
        </div>

        {/* Footer actions */}
        <hr style={{ margin: "20px 0" }} />
        <div style={{ display: "flex", gap: 10, flexWrap: 'wrap' }}>
          <Btn onClick={onSave} variant="primary">Save Draft</Btn>
          <Btn onClick={onPublish} variant="ghost">Publish</Btn>
        </div>
      </div>
    </div>
  );
}