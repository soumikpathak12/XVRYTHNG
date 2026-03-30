// src/pages/admin/SiteInspectionPage.jsx
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import '../../styles/SiteInspectionPage.css';
import {
  getLead,
  getSiteInspection,
  saveSiteInspectionDraft,
  submitSiteInspection,
  uploadSiteInspectionFile,
  getLeads,
  getCompanyInspectionTemplates,
} from '../../services/api.js';

// Fetch checklist templates from API (add this API function)
async function getChecklistTemplates(companyId = null) {
  const endpoint = companyId 
    ? `/api/site-inspection-checklists?companyId=${companyId}`
    : `/api/site-inspection-checklists`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error('Failed to load checklist templates');
  return res.json();
}
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import FormRenderer from '../../components/FormRenderer.jsx';
import { getRequiredKeys, formatValueForPdf } from '../../utils/template.js';
import { buildStepsFromEnabled } from '../../templates/sectionCatalog.js';
import {
  mergeLeadDefaultsIntoInspectionForm,
  getSystemTypeForInspection,
  getInspectionScheduleDatetimeLocal,
  isEmptyInspectionValue,
} from '../../utils/inspectionPrefillFromLead.js';

// ================= UI tokens =================
// ================= UI tokens =================
const UI = {
  color: {
    navy: '#0F172A',
    teal: '#1A7B7B',        // BRAND PRIMARY
    tealDark: '#176D6D',    // BRAND PRIMARY - hover/darker
    border: 'rgba(2,6,23,0.08)',
    borderStrong: 'rgba(2,6,23,0.14)',
    muted: '#6B7280',
    sand: '#F8FAFC',
    bg: '#FFFFFF',
    ring: 'rgba(26,123,123,0.35)', // based on #1A7B7B
    shadow: 'rgba(2,6,23,0.06)',
  },
  radius: 14,
  pad: 16,
  gap: 12,
};

const card = {
  background: UI.color.bg,
  border: `1px solid ${UI.color.border}`,
  borderRadius: UI.radius,
  padding: UI.pad,
  boxShadow: `0 1px 2px ${UI.color.shadow}, 0 8px 24px ${UI.color.shadow}`,
};

const barWrap = { height: 10, background: '#EEF2F7', borderRadius: 999, overflow: 'hidden' };

const barFill = {
  height: 10,
  // gradient theo brand
  background: `linear-gradient(90deg, ${UI.color.teal} 0%, ${UI.color.tealDark} 100%)`,
  transition: 'width .25s ease',
};

const input = {
  border: `1px solid ${UI.color.border}`,
  borderRadius: 10,
  padding: '10px 12px',
  background: '#fff',
  outline: 'none',
};

const btn = (variant = 'secondary') => ({
  background: variant === 'primary' ? UI.color.teal : '#fff',
  color: variant === 'primary' ? '#fff' : UI.color.navy,
  border: `1px solid ${variant === 'primary' ? UI.color.teal : UI.color.borderStrong}`,
  padding: '10px 14px',
  borderRadius: 12,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
});
// ================= Checklist Component (Templates Only - No Persistence) =================
function ChecklistWidget({ companyId = null }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [checklistItems, setChecklistItems] = useState([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [loading, setLoading] = useState(false);

  // Load templates on mount
  useEffect(() => {
    async function loadTemplates() {
      try {
        setLoading(true);
        const data = await getChecklistTemplates(companyId);
        setTemplates(Array.isArray(data) ? data : data.data || []);
        // Auto-select first active template
        const first = data.find?.(t => t.is_active) || data[0];
        if (first) {
          setSelectedTemplateId(first.id);
          const items = Array.isArray(first.items) ? first.items : JSON.parse(first.items || '[]');
          setChecklistItems(items.map(item => ({ ...item, completed: false })));
        }
      } catch (err) {
        console.error('[Checklist] Load error:', err);
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    }
    loadTemplates();
  }, [companyId]);

  const handleSelectTemplate = (templateId) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      const items = Array.isArray(template.items) ? template.items : JSON.parse(template.items || '[]');
      setChecklistItems(items.map(item => ({ ...item, completed: false })));
    }
  };

  const handleToggleItem = (index) => {
    setChecklistItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], completed: !updated[index].completed };
      return updated;
    });
  };

  const completedCount = checklistItems.filter(item => item.completed).length;
  const totalCount = checklistItems.length;

  return (
    <div
      style={{
        ...card,
        position: 'sticky',
        top: 20,
        zIndex: 10,
        background: UI.color.bg,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          marginBottom: isExpanded ? 12 : 0,
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ fontWeight: 800, fontSize: 14, color: UI.color.navy }}>
           CHECKLIST TEMPLATES
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: UI.color.muted }}>
            {completedCount}/{totalCount}
          </span>
          <span style={{ fontSize: 12 }}>{isExpanded ? '−' : '+'}</span>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Template Selector */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>
              Select Template:
            </label>
            <select
              value={selectedTemplateId || ''}
              onChange={(e) => handleSelectTemplate(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: `1px solid ${UI.color.border}`,
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
              }}
              disabled={loading || templates.length === 0}
            >
              <option value="">Choose a template...</option>
              {templates.filter(t => t.is_active).map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {templates.length === 0 && (
              <div style={{ fontSize: 12, color: UI.color.muted, marginTop: 6 }}>
                No checklist templates available
              </div>
            )}
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={barWrap}>
                <div
                  style={{
                    ...barFill,
                    width: `${totalCount === 0 ? 0 : (completedCount / totalCount) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Checklist items */}
          <div style={{ display: 'grid', gap: 8 }}>
            {checklistItems.length === 0 ? (
              <div style={{ color: UI.color.muted, fontSize: 13, fontStyle: 'italic' }}>
                Select a template to view checklist items
              </div>
            ) : (
              checklistItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px',
                    background: '#F8FAFC',
                    border: `1px solid ${UI.color.border}`,
                    borderRadius: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={item.completed || false}
                    onChange={() => handleToggleItem(idx)}
                    style={{
                      width: 18,
                      height: 18,
                      cursor: 'pointer',
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      textDecoration: item.completed ? 'line-through' : 'none',
                      color: item.completed ? UI.color.muted : UI.color.navy,
                      fontSize: 13,
                    }}
                  >
                    {item.text}
                  </span>
                </div>
              ))
            )}
          </div>

          
        </>
      )}
    </div>
  );
}

/** Vertical step rail (focused, one step at a time — similar to audit / checklist apps). */
function StepRail({ steps, stepIdx, onStepChange }) {
  const list = steps.length ? steps : [{ id: 'core', label: 'Inspection' }];
  return (
    <nav className="si-rail" aria-label="Inspection steps">
      <p className="si-rail-title">Steps</p>
      <ol className="si-step-list" role="list">
        {list.map((s, i) => {
          const active = i === stepIdx;
          const done = i < stepIdx;
          return (
            <li key={s.id}>
              <button
                type="button"
                className={`si-step-btn${active ? ' si-step-btn--active' : ''}${done ? ' si-step-btn--done' : ''}`}
                onClick={() => onStepChange(i)}
                aria-current={active ? 'step' : undefined}
              >
                <span className="si-step-num" aria-hidden>
                  {done ? '✓' : i + 1}
                </span>
                <span>{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ================= Toolbar =================
function TemplateToolbar({ templates, selectedId, onSelect, onRefresh }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
        padding: '10px 12px',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        background: '#fff',
      }}
    >
      <div style={{ fontWeight: 700 }}>Template:</div>
      <select
        value={selectedId || ''}
        onChange={(e) => onSelect(e.target.value || null)}
        style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px' }}
      >
        <option value="">Default (Full)</option>
        {templates
          .filter((t) => t.key !== 'default')
          .map((t) => (
            <option key={t.id} value={String(t.id)}>
              {t.name} (key: {t.key}, v{t.version})
            </option>
          ))}
      </select>

      <button
        type="button"
        onClick={() => {
          const base = window.location.pathname.startsWith('/employee') ? '/employee' : '/admin';
          window.open(`${base}/settings/inspection-templates`, '_blank');
        }}
        style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', background: '#fff', cursor: 'pointer' }}
      >
        Edit Template
      </button>
      <button
        type="button"
        onClick={onRefresh}
        style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', background: '#fff', cursor: 'pointer' }}
      >
        Refresh
      </button>
    </div>
  );
}

// ================= Guard helpers =================
function isFilled(val) {
  if (val == null) return false;
  if (typeof val === 'string') return val.trim() !== '';
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'object') {
    // file/photo object: expect { filename, storage_url, preview_data_url }
    if (val.filename || val.storage_url || val.preview_data_url) return true;
    // group-like object: consider filled if any child is truthy
    return Object.values(val).some(isFilled);
  }
  return true;
}
function getByPath(obj, path) {
  if (!path) return undefined;
  const norm = String(path).replace(/\[(\d+)\]/g, '.$1');
  return norm.split('.').reduce((acc, k) => (acc && Object.prototype.hasOwnProperty.call(acc, k) ? acc[k] : undefined), obj);
}
function flattenObject(input, prefix = '', out = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
  for (const [k, v] of Object.entries(input)) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flattenObject(v, next, out);
    else out[next] = v;
  }
  return out;
}
/** NEW: đọc cả key phẳng và key lồng */
function getValueFlex(form, key) {
  if (Object.prototype.hasOwnProperty.call(form, key)) return form[key]; // flat key, e.g. "jobDetails.licenseSelfie"
  return getByPath(form, key); // nested path, e.g. form.jobDetails.licenseSelfie
}
function stepPassesGuards(template, stepId, form) {
  const meta = template?.meta && typeof template.meta === 'string' ? JSON.parse(template.meta) : template?.meta || {};
  const guards = Array.isArray(meta.stepGuards) ? meta.stepGuards : [];
  const rule = guards.find((g) => g.stepId === stepId);
  if (!rule || !Array.isArray(rule.fields) || rule.fields.length === 0) return true;
  return rule.fields.every((fkey) => isFilled(getValueFlex(form, fkey)));
}

// Ensure consistent UX overrides across templates (DB templates + sectionCatalog fallback).
function applyTemplateOverrides(tpl) {
  if (!tpl) return tpl;
  const steps = Array.isArray(tpl.steps) ? tpl.steps : [];
  if (!steps.length) return tpl;

  const nextSteps = steps.map((st) => ({
    ...st,
    sections: (st.sections || []).map((sec) => ({
      ...sec,
      fields: (sec.fields || []).filter((f) => f?.key !== 'switchboard.flag').map((f) => {
        if (f?.key === 'switchboard.voltageReadingPhotos' && f?.type === 'array') {
          return {
            ...f,
            type: 'photo',
            accept: f.accept || 'image/*,application/pdf',
          };
        }
        // Roof Type: allow custom "Other" input (store custom text, not "Other")
        const isRoofType =
          f?.key === 'roofProfile.roofMaterial' ||
          f?.key?.endsWith?.('.roofMaterial') ||
          String(f?.label || '').trim().toLowerCase() === 'roof type';
        if (isRoofType) return { ...f, allowOther: true };
        return f;
      }),
    })),
  }));

  return { ...tpl, steps: nextSteps };
}

// Build a human-readable media summary from all photo/file fields in the template.
function buildMediaSummary(template, form) {
  if (!template) return '';
  const steps = Array.isArray(template.steps) ? template.steps : JSON.parse(template.steps || '[]');
  const lines = [];
  for (const st of steps) {
    for (const sec of st.sections || []) {
      for (const f of sec.fields || []) {
        if (f.type !== 'photo' && f.type !== 'file') continue;
        const v = form?.[f.key];
        if (!v) continue;

        let count = 0;
        if (Array.isArray(v)) {
          count = v.filter(
            (it) => it && (it.filename || it.storage_url || it.preview_data_url)
          ).length;
        } else if (v.filename || v.storage_url || v.preview_data_url) {
          count = 1;
        }

        if (count > 0) {
          const suffix = count > 1 ? ` (${count} files)` : '';
          lines.push(`- ${sec.label}: ${f.label}${suffix}`);
        }
      }
    }
  }
  return lines.join('\n');
}

/**
 * Keep only persistable values for API payload / DB storage.
 * - Remove client-only preview blobs (preview_data_url, data:image/... strings)
 * - Keep uploaded file references (filename, storage_url)
 */
function sanitizeForPersist(value) {
  if (value == null) return value;

  if (typeof value === 'string') {
    const s = value.trim();
    // Base64 preview strings can easily exceed MySQL max_allowed_packet.
    if (s.startsWith('data:')) return null;
    return value;
  }

  if (Array.isArray(value)) {
    const arr = value
      .map((item) => sanitizeForPersist(item))
      .filter((item) => item !== undefined && item !== null);
    const allFileRefs =
      arr.length > 0 &&
      arr.every(
        (x) =>
          x &&
          typeof x === 'object' &&
          !Array.isArray(x) &&
          (x.storage_url != null || x.filename != null)
      );
    if (allFileRefs) return arr[0];
    return arr;
  }

  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === 'preview_data_url' || k === 'previewDataUrl' || k === 'dataUrl') continue;
      const sv = sanitizeForPersist(v);
      if (sv !== undefined && sv !== null) out[k] = sv;
    }
    return out;
  }

  return value;
}

// ================= Page =================
export default function SiteInspectionPage() {
  const params = useParams();
  const location = useLocation();
  const leadId = params.id ?? params.leadId;
  const basePath = location.pathname.startsWith('/employee') ? '/employee' : '/admin';

  // Lead + templates
  const [lead, setLead] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [template, setTemplate] = useState(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Form
  const [form, setForm] = useState({});
  const [status, setStatus] = useState('draft');
  const isSubmitted = status === 'submitted';
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Signature (Customer sign-off)
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [customerName, setCustomerName] = useState('');
  const [customerConfirmed, setCustomerConfirmed] = useState(false);
  const [customerNotes, setCustomerNotes] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');

  // Step
  const [stepIdx, setStepIdx] = useState(0);
  const [leadDetailsOpen, setLeadDetailsOpen] = useState(false);
  const [otherInspectionsOpen, setOtherInspectionsOpen] = useState(false);
  const formCardRef = useRef(null);
  const didInitScrollRef = useRef(false);

  // Lists
  const [draftList, setDraftList] = useState([]);
  const [submittedList, setSubmittedList] = useState([]);
  const [listsLoading, setListsLoading] = useState(false);

  // -------- Load lead + inspection --------
  useEffect(() => {
    let aborted = false;
    async function loadAll() {
      try {
        setLoading(true);
        setMsg('');
        const leadResp = await getLead(leadId);
        const leadData = leadResp.lead ?? leadResp.data ?? null;
        if (!aborted) setLead(leadData);
        const si = await getSiteInspection(leadId);
        if (!aborted && si?.data) {
          const d = si.data;
          const { form: apiForm, ...dMeta } = d;
          setStatus(d.status ?? 'draft');
          let extra = {};
          const usedColumnForm = apiForm && typeof apiForm === 'object' && !Array.isArray(apiForm);
          if (usedColumnForm) {
            extra = { ...apiForm };
          } else {
            try {
              const rawForm =
                d.form_data_json && String(d.form_data_json).trim()
                  ? d.form_data_json
                  : d.additional_notes;
              extra = rawForm ? JSON.parse(rawForm) || {} : {};
            } catch {
              extra = {};
            }
          }
          // Only flatten legacy nested JSON; column-backed `apiForm` is already flat dotted keys.
          const flatExtra = usedColumnForm ? {} : flattenObject(extra);
          let merged = { ...extra, ...flatExtra, ...dMeta };
          merged = mergeLeadDefaultsIntoInspectionForm(merged, leadData);
          const schedLocal = getInspectionScheduleDatetimeLocal(leadData, d);
          const isDraft = (d.status ?? 'draft') === 'draft';
          if (isDraft && schedLocal) {
            merged.inspected_at = schedLocal;
          }
          const savedKey = extra?._t || d.template_key || null;
          const savedVer = extra?._v || d.template_version || null;
          if (savedKey) {
            merged.__savedTemplateKey = savedKey;
            merged.__savedTemplateVer = savedVer;
          }
          setForm(merged);
          setCustomerName(d.customer_name || '');
          setCustomerNotes(d.customer_notes || '');
          setSignatureUrl(d.signature_url || '');
          setCustomerConfirmed(Boolean(d.signature_url || d.customer_name));
        } else if (!aborted) {
          let seeded = mergeLeadDefaultsIntoInspectionForm({}, leadData);
          const schedLocal = getInspectionScheduleDatetimeLocal(leadData, null);
          if (schedLocal) {
            seeded = { ...seeded, inspected_at: schedLocal };
          } else if (isEmptyInspectionValue(seeded.inspected_at)) {
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            seeded = {
              ...seeded,
              inspected_at: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(
                now.getMinutes()
              )}`,
            };
          }
          setForm(seeded);
        }
      } catch (e) {
        if (!aborted) setMsg(e.message ?? 'Failed to load site inspection');
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    if (leadId) loadAll();
    return () => {
      aborted = true;
    };
  }, [leadId]);

  // -------- Load published templates --------
  async function refreshTemplates() {
    setTemplatesLoading(true);
    try {
      const resp = await getCompanyInspectionTemplates({ status: 'published' });
      const list = Array.isArray(resp?.data) ? resp.data : [];
      setTemplates(list);

      // Always use the default inspection template (no manual selection)
      setSelectedTemplateId(null);

      /*
      const savedKey = form.__savedTemplateKey;
      const savedVer = Number(form.__savedTemplateVer || NaN);
      let chosenId = null;
      if (savedKey) {
        const exact = list.find((t) => t.key === savedKey && (isNaN(savedVer) || Number(t.version) === savedVer));
        const any = list.find((t) => t.key === savedKey);
        chosenId = String((exact || any || {}).id || '');
      }
      setSelectedTemplateId(chosenId || null);
      */
    } catch (e) {
      setMsg(e.message || 'Failed to load templates');
    } finally {
      setTemplatesLoading(false);
    }
  }
  useEffect(() => {
    refreshTemplates();
  }, [lead]); // after lead loaded

  /*
  // When opening an existing inspection, force template selection from saved metadata.
  useEffect(() => {
    const savedKey = form.__savedTemplateKey;
    if (!savedKey || !Array.isArray(templates) || templates.length === 0) return;
    const savedVer = Number(form.__savedTemplateVer || NaN);
    const exact = templates.find((t) => t.key === savedKey && (isNaN(savedVer) || Number(t.version) === savedVer));
    const any = templates.find((t) => t.key === savedKey);
    const nextId = String((exact || any || {}).id || '');
    if (nextId && String(selectedTemplateId || '') !== nextId) {
      setSelectedTemplateId(nextId);
    }
  }, [templates, form.__savedTemplateKey, form.__savedTemplateVer, selectedTemplateId]);
  */

  // -------- Compute effective template --------
  useEffect(() => {
    if (!templates || templates.length === 0) {
      setTemplate(null);
      return;
    }
    const list = templates;
    const def = list.find((t) => t.key === 'default') || list[0];

    const base = selectedTemplateId ? list.find((t) => String(t.id) === String(selectedTemplateId)) || def : def;

   
const meta = base?.meta && typeof base.meta === 'string'
   ? JSON.parse(base.meta)
   : (base?.meta || {});

 const parsedSteps = Array.isArray(base?.steps)
   ? base.steps
   : base?.steps
     ? (() => { try { return JSON.parse(base.steps); } catch { return []; } })()
     : [];


 let steps = parsedSteps;
 if (!steps.length) {
   const enabled = Array.isArray(meta.enabledSections) ? meta.enabledSections : null;
   steps = enabled ? buildStepsFromEnabled(enabled) : [];
 }

 setTemplate(applyTemplateOverrides({ ...base, steps, meta }));
}, [templates, selectedTemplateId]);


  // -------- Derived: steps / required keys / progress --------
  const steps = useMemo(() => {
    return template ? (Array.isArray(template.steps) ? template.steps : JSON.parse(template.steps || '[]')) : [];
  }, [template]);

  const requiredKeys = useMemo(() => {
    return template ? getRequiredKeys(template) : [];
  }, [template]);

  const progress = useMemo(() => {
    const keys = requiredKeys;
    const filled = keys.reduce((acc, k) => acc + (form[k] && String(form[k]).trim() !== '' ? 1 : 0), 0);
    return Math.round((filled / (keys.length || 1)) * 100);
  }, [form, requiredKeys]);

  // -------- Keep Media Summary in sync (live in form) --------
  useEffect(() => {
    if (!template) return;
    const summary = buildMediaSummary(template, form);
    const currentNested = form?.mediaSummary?.note || '';
    const currentFlat = form?.['mediaSummary.note'] || '';
    const current = currentFlat || currentNested;
    if (summary === current) return;
    setForm((prev) => {
      const base = prev || {};
      const existingNoteNested = base.mediaSummary?.note || '';
      const existingNoteFlat = base['mediaSummary.note'] || '';
      const existingNote = existingNoteFlat || existingNoteNested;
      if (summary === existingNote) return base;
      return {
        ...base,
        mediaSummary: {
          ...(base.mediaSummary || {}),
          note: summary,
        },
        'mediaSummary.note': summary,
      };
    });
  }, [template, form]);

  // -------- Lists --------
  async function loadInspectionLists(limit = 20) {
    setListsLoading(true);
    try {
      const res = await getLeads({ limit });
      const leadsArr = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      const results = await Promise.allSettled(leadsArr.map((l) => getSiteInspection(l.id)));
      const drafts = [];
      const submitted = [];
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') {
          const d = r.value?.data ?? r.value;
          const s = d?.status;
          if (s === 'draft') drafts.push({ lead: leadsArr[idx], inspection: d });
          else if (s === 'submitted') submitted.push({ lead: leadsArr[idx], inspection: d });
        }
      });
      setDraftList(drafts);
      setSubmittedList(submitted);
    } catch (e) {
      setMsg(e.message ?? 'Failed to load inspection lists');
    } finally {
      setListsLoading(false);
    }
  }
  useEffect(() => {
    loadInspectionLists(20);
  }, []);

  // -------- FIX: Auto-clear guard banner when current step becomes valid --------
  useEffect(() => {
    if (!template || !steps?.length) return;
    const currentStep = steps[stepIdx];
    const currentStepId = currentStep?.id;
    // Clear guard-related banner when step becomes valid
    if (msg && msg.startsWith('Please upload the required items') && currentStepId && stepPassesGuards(template, currentStepId, form)) {
      setMsg('');
    }
  }, [form, stepIdx, template, steps, msg]);

  useEffect(() => {
    if (!formCardRef.current) return;
    if (!didInitScrollRef.current) {
      didInitScrollRef.current = true;
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      formCardRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [stepIdx]);

  // -------- File upload --------
  async function onPickFile(field) {
    return new Promise((resolve) => {
      const inputEl = document.createElement('input');
      inputEl.type = 'file';
      inputEl.accept = field.accept || 'image/*,application/pdf';
      inputEl.onchange = async (e) => {
        try {
          const file = e.target?.files?.[0];
          if (!file) return resolve(null);
          const preview_data_url = await new Promise((res) => {
            const fr = new FileReader();
            fr.onload = () => res(fr.result);
            fr.onerror = () => res(null);
            fr.readAsDataURL(file);
          });
          const section = (field.key || 'misc').replace(/\./g, '-').slice(0, 48);
          const uploaded = await uploadSiteInspectionFile(leadId, file, section);
          const payload = { ...uploaded, preview_data_url };
          setForm((prev) => ({ ...prev, [field.key]: payload }));
          resolve(uploaded);
        } catch (err) {
          console.error('[SI] upload error', err);
          setMsg(err?.message ?? 'Upload failed');
          resolve(null);
        } finally {
          inputEl.value = '';
        }
      };
      inputEl.click();
    });
  }

  // -------- Signature Canvas Functions --------
  // Map pointer coords to canvas buffer pixels (internal width/height differ from CSS size when width: 100%).
  const pt = (e) => {
    const canvas = canvasRef.current;
    const t = e.touches?.[0] ?? e.changedTouches?.[0] ?? e;
    if (!canvas || !t) return [0, 0];
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / (r.width || 1);
    const sy = canvas.height / (r.height || 1);
    return [(t.clientX - r.left) * sx, (t.clientY - r.top) * sy];
  };

  const startDraw = (e) => {
    drawingRef.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const [x, y] = pt(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!drawingRef.current) return;
    // Do not call preventDefault here: React attaches touch handlers as passive; use touchAction: 'none' on canvas instead.
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const [x, y] = pt(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const endDraw = () => {
    drawingRef.current = false;
  };

  const clearSignature = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setSignatureUrl('');
  };

  // -------- Signature upload --------
  const uploadSignature = async () => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      // Convert canvas to blob and upload through authenticated helper.
      return new Promise((resolve) => {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }

          try {
            const signatureFile = new File([blob], 'signature.png', { type: 'image/png' });
            const uploaded = await uploadSiteInspectionFile(leadId, signatureFile, 'signature');
            resolve(uploaded?.storage_url || null);
          } catch (err) {
            console.error('Signature upload failed:', err);
            resolve(null);
          }
        }, 'image/png');
      });
    } catch (err) {
      console.error('Signature upload error:', err);
      return null;
    }
  };

  // -------- Save / Submit --------
  function buildPayload(sigUrl = null) {
    const t = template || {};
    const safeForm = sanitizeForPersist(form) || {};
    const form_data_json = JSON.stringify({
      _t: t.key || 'default',
      _v: t.version ?? 1,
      ...safeForm,
    });
    // Persist structured fields in form_data_json; core columns duplicated for reporting / filters.
    return {
      id: safeForm.id ?? form.id ?? null,
      inspected_at: safeForm.inspected_at ?? null,
      inspector_name: safeForm.inspector_name ?? null,
      roof_type: safeForm.roof_type ?? null,
      roof_pitch_deg: safeForm.roof_pitch_deg ?? null,
      house_storey: safeForm.house_storey ?? null,
      meter_phase: safeForm.meter_phase ?? null,
      inverter_location: safeForm.inverter_location ?? null,
      msb_condition: safeForm.msb_condition ?? null,
      shading: safeForm.shading ?? null,
      form_data_json,
      template_key: t.key || 'default',
      template_version: t.version ?? 1,
      customer_name: customerName,
      signature_url: sigUrl || signatureUrl,
      customer_notes: customerNotes,
    };
  }
  async function onSaveDraft() {
    try {
      setSaving(true);
      setMsg('');
      let sigUrl = signatureUrl;
      // Upload signature if canvas has data and no file stored yet
      if (canvasRef.current && !signatureUrl) {
        const uploaded = await uploadSignature();
        if (uploaded) {
          sigUrl = uploaded;
          setSignatureUrl(uploaded);
        }
      }
      await saveSiteInspectionDraft(leadId, buildPayload(sigUrl));
      setStatus('draft');
      setMsg('Draft saved');
      loadInspectionLists(20);
    } catch (e) {
      setMsg(e.message ?? 'Save draft failed');
    } finally {
      setSaving(false);
    }
  }
  async function onSubmit() {
    try {
      if (isSubmitted) {
        setMsg('This site inspection is already submitted.');
        return;
      }
      const missing = requiredKeys.filter((k) => !form[k] || String(form[k]).trim() === '');
      if (missing.length) {
        setMsg('Please complete all required fields.');
        return;
      }
      // Check signature confirmation
      if (!customerConfirmed) {
        setMsg('Please confirm that the customer has signed.');
        return;
      }
      if (!customerName.trim()) {
        setMsg('Please enter the customer name.');
        return;
      }
      setSaving(true);
      setMsg('');
      
      let sigUrl = signatureUrl;
      // Upload signature if canvas has data and no file stored yet
      if (canvasRef.current && !signatureUrl) {
        const uploaded = await uploadSignature();
        if (uploaded) {
          sigUrl = uploaded;
          setSignatureUrl(uploaded);
        }
      }
      if (!sigUrl) {
        setMsg('Please provide a customer signature before submitting.');
        return;
      }
      
      await submitSiteInspection(leadId, buildPayload(sigUrl));
      setStatus('submitted');
      setMsg('Submitted!');
      loadInspectionLists(20);
    } catch (e) {
      setMsg(e.message ?? 'Submit failed');
    } finally {
      setSaving(false);
    }
  }

  // -------- PDF export --------
  async function exportPdf() {
    try {
      setExporting(true);
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const page = { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() };
      const API_BASE = String(import.meta.env.VITE_API_URL || '').trim();
      const BRAND = {
        primary: [20, 107, 107],
        dark: [30, 41, 59],
        gray: [100, 116, 139],
        light: [241, 245, 249],
        border: [226, 232, 240],
      };
      const margin = { l: 50, r: 50, t: 70, b: 60 };
      let y = margin.t;
      const clean = (v) => String(v ?? '').trim() || '—';
      const resolveAssetUrl = (url) => {
        const raw = String(url || '').trim();
        if (!raw) return '';
        // Handle Windows-style paths in DB payloads.
        const s = raw.replace(/\\/g, '/').replace(/^\.?\//, '/');
        if (/^https?:\/\//i.test(s)) return s;
        if (API_BASE) return `${API_BASE}${s.startsWith('/') ? s : `/${s}`}`;
        // Dev fallback: frontend at :5173, backend static uploads usually at :3000
        if (window.location.port === '5173') {
          return `${window.location.protocol}//${window.location.hostname}:3000${s.startsWith('/') ? s : `/${s}`}`;
        }
        return s;
      };
      const fetchImageAsDataUrl = async (url) => {
        const src = resolveAssetUrl(url);
        if (!src) return null;
        const resp = await fetch(src);
        if (!resp.ok) return null;
        const type = String(resp.headers.get('content-type') || '');
        if (!type.startsWith('image/')) return null;
        const blob = await resp.blob();
        return await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      };
      const section = (title) => {
        doc.setFillColor(...BRAND.light);
        doc.rect(margin.l, y, page.w - margin.l - margin.r, 32, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...BRAND.dark);
        doc.text(title, margin.l + 10, y + 21);
        y += 42;
      };
      const maybeNewPage = (extra = 120) => {
        if (y > page.h - margin.b - extra) {
          doc.addPage();
          y = margin.t;
        }
      };
      const keyValueTable = (rows) => {
        maybeNewPage(140);
        autoTable(doc, {
          startY: y,
          theme: 'grid',
          styles: { fontSize: 11, textColor: BRAND.dark, cellPadding: 6, lineColor: BRAND.border },
          headStyles: { fillColor: BRAND.primary, textColor: '#ffffff' },
          body: rows.map(([k, v]) => [k, clean(v)]),
          columns: [
            { header: 'Field', dataKey: '0' },
            { header: 'Value', dataKey: '1' },
          ],
          tableWidth: page.w - margin.l - margin.r,
          margin: { left: margin.l, right: margin.r },
        });
        y = doc.lastAutoTable.finalY + 20;
      };
      const imageCard = async (title, fileObj) => {
        maybeNewPage(200);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(title, margin.l, y);
        y += 10;
        doc.setDrawColor(...BRAND.border);
        doc.rect(margin.l, y, 220, 150);
        let dataURL = fileObj?.preview_data_url || null;
        if (!dataURL && fileObj?.storage_url) {
          dataURL = await fetchImageAsDataUrl(fileObj.storage_url);
        }
        if (dataURL) doc.addImage(dataURL, 'JPEG', margin.l + 5, y + 5, 210, 140);
        else {
          doc.setFontSize(10);
          doc.text('No image', margin.l + 10, y + 20);
        }
        y += 170;
      };

      // Cover
      doc.setFillColor(...BRAND.primary);
      doc.rect(0, 0, page.w, 150, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.text('Site Inspection Report', margin.l, 85);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text('xTechs Renewables', margin.l, 115);
      doc.setFillColor(...BRAND.light);
      doc.rect(margin.l, 190, page.w - margin.l - margin.r, 120, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...BRAND.dark);
      doc.text('Customer Summary', margin.l + 14, 214);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text('Customer: ' + clean(lead?.customer_name), margin.l + 14, 240);
      doc.text('Contact: ' + clean(lead?.phone || lead?.email), margin.l + 14, 260);
      doc.text('Address: ' + clean(lead?.suburb), margin.l + 14, 280);
      doc.text('Inspected At: ' + clean(form.inspected_at), margin.l + 14, 300);
      doc.addPage();
      y = margin.t;

      // Body from template
      if (template && steps.length) {
        for (const st of steps) {
          section(st.label);
          for (const sec of st.sections || []) {
            const tableRows = [];
            const imgs = [];
            for (const f of sec.fields || []) {
              const val = form[f.key];
              if (f.type === 'photo' || f.type === 'file') imgs.push({ title: f.label, fileObj: val });
              else tableRows.push([f.label, formatValueForPdf(val)]);
            }
            if (tableRows.length) keyValueTable(tableRows);
            for (const im of imgs) await imageCard(im.title, im.fileObj);
          }
        }
      }

      // Customer Sign-Off Section
      const effectiveCustomerName = customerName || form.customer_name || '';
      const effectiveCustomerNotes = customerNotes || form.customer_notes || '';
      const effectiveSignatureUrl = signatureUrl || form.signature_url || '';
      const effectiveCustomerConfirmed = customerConfirmed || Boolean(effectiveSignatureUrl || effectiveCustomerName);
      const sigDataUrl = await (async () => {
        if (!effectiveSignatureUrl) return null;
        try {
          return await fetchImageAsDataUrl(effectiveSignatureUrl);
        } catch (err) {
          console.warn('Failed to load signature image:', err);
          return null;
        }
      })();
      const canvasSigDataUrl = (() => {
        try {
          const cv = canvasRef.current;
          if (!cv) return null;
          const ctx = cv.getContext('2d');
          if (!ctx) return null;
          const pixels = ctx.getImageData(0, 0, cv.width, cv.height).data;
          // Check if user has drawn at least one non-transparent pixel.
          for (let i = 3; i < pixels.length; i += 4) {
            if (pixels[i] !== 0) return cv.toDataURL('image/png');
          }
          return null;
        } catch {
          return null;
        }
      })();
      const signatureForPdf = sigDataUrl || canvasSigDataUrl;
      
      if (effectiveCustomerName || signatureForPdf) {
        section('Customer Sign-Off');
        maybeNewPage(200);
        const signOffRows = [
          ['Customer Name', clean(effectiveCustomerName)],
          ['Confirmed', effectiveCustomerConfirmed ? 'Yes' : 'No'],
          ['Notes', clean(effectiveCustomerNotes)],
        ];
        keyValueTable(signOffRows);
        
        // Add signature image if available
        if (signatureForPdf) {
          maybeNewPage(200);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.text('Customer Signature', margin.l, y);
          y += 14;
          doc.setDrawColor(...BRAND.border);
          doc.rect(margin.l, y, 220, 100);
          doc.addImage(signatureForPdf, 'PNG', margin.l + 5, y + 5, 210, 90);
          y += 120;
        }
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...BRAND.gray);
        doc.text(`Generated: ${new Date().toLocaleString()}`, margin.l, page.h - 20);
        const label = `Page ${i} of ${pageCount}`;
        const tw = doc.getTextWidth(label);
        doc.text(label, page.w - margin.r - tw, page.h - 20);
      }

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `site-inspection-${leadId ?? 'report'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setMsg('Error generating PDF');
    } finally {
      setExporting(false);
    }
  }

  // ================= Render =================
  const okMsg = msg === 'Submitted!' || msg === 'Draft saved';

  if (loading) {
    return (
      <div className="si-page">
        <div className="si-shell">
          <div className="si-panel">Loading site inspection…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="si-page">
      <div className="si-shell">
        <header className="si-topbar">
          <div className="si-topbar-title">
            <p className="si-topbar-kicker">Site inspection</p>
            <h1 className="si-topbar-heading">
              {lead?.customer_name ? lead.customer_name : 'Site inspection'}
            </h1>
            <p className="si-topbar-meta">
              {[lead?.suburb, getSystemTypeForInspection(lead)].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>
          <div className="si-topbar-actions">
            <span className="si-status-pill">
              <span
                className={`si-status-dot ${status === 'submitted' ? 'si-status-dot--submitted' : 'si-status-dot--draft'}`}
              />
              {status === 'submitted' ? 'Submitted' : 'Draft'}
            </span>
            <button
              type="button"
              className="si-btn si-btn--ghost"
              onClick={exportPdf}
              disabled={exporting}
            >
              {exporting ? 'Exporting…' : 'Export PDF'}
            </button>
            <button type="button" className="si-btn si-btn--primary" onClick={onSaveDraft} disabled={saving}>
              {saving ? 'Saving…' : 'Save draft'}
            </button>
          </div>
        </header>

        <div className="si-layout">
          <StepRail steps={steps} stepIdx={stepIdx} onStepChange={setStepIdx} />

          <main className="si-main">
            {lead && (
              <section className="si-panel si-panel--subtle">
                <div className="si-panel-head">
                  <h2 className="si-panel-title">Job context</h2>
                  <button
                    type="button"
                    className="si-panel-toggle"
                    onClick={() => setLeadDetailsOpen((o) => !o)}
                    aria-expanded={leadDetailsOpen}
                  >
                    {leadDetailsOpen ? 'Hide details' : 'Show all details'}
                  </button>
                </div>
                {!leadDetailsOpen ? (
                  <p className="si-summary-line">
                    <strong>{lead.customer_name ?? '—'}</strong>
                    {' · '}
                    {lead.suburb ?? '—'}
                    {' · '}
                    {getSystemTypeForInspection(lead) || '—'}
                  </p>
                ) : null}
                {leadDetailsOpen ? (
          <div className="si-summary-grid">
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Customer</div>
              <div>{lead.customer_name ?? '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Contact</div>
              <div>{lead.email ?? '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Phone</div>
              <div>{lead.phone ?? '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Address</div>
              <div>{lead.suburb ?? '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>System Type</div>
              <div>{getSystemTypeForInspection(lead) || '—'}</div>
            </div>
            {lead.pv_system_size_kw != null ||
              lead.pv_panel_brand ||
              lead.pv_panel_module_watts != null ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>PV System</div>
                <div>
                  {[
                    lead.pv_system_size_kw != null ? `${lead.pv_system_size_kw} kW` : null,
                    lead.pv_panel_brand ? `Panel: ${lead.pv_panel_brand}` : null,
                    lead.pv_panel_module_watts != null ? `${lead.pv_panel_module_watts} W` : null,
                  ]
                    .filter(Boolean)
                    .join(' • ') || '—'}
                </div>
              </div>
            ) : null}

            {lead.pv_inverter_size_kw != null || lead.pv_inverter_brand ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Inverter System</div>
                <div>
                  {[
                    lead.pv_inverter_size_kw != null ? `Inverter Size: ${lead.pv_inverter_size_kw} kW` : null,
                    lead.pv_inverter_brand ? `Inverter Brand: ${lead.pv_inverter_brand}` : null,
                  ]
                    .filter(Boolean)
                    .join(' • ') || '—'}
                </div>
              </div>
            ) : null}
            {lead.ev_charger_brand || lead.ev_charger_model ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>EV Charger</div>
                <div>
                  {[
                    lead.ev_charger_brand,
                    lead.ev_charger_model,
                  ]
                    .filter(Boolean)
                    .join(' • ') || '—'}
                </div>
              </div>
            ) : null}
            {lead.battery_size_kwh != null ||
              lead.battery_brand ||
              lead.battery_model ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Battery</div>
                <div>
                  {[
                    lead.battery_size_kwh != null ? `${lead.battery_size_kwh} kWh` : null,
                    lead.battery_brand,
                    lead.battery_model,
                  ]
                    .filter(Boolean)
                    .join(' • ') || '—'}
                </div>
              </div>
            ) : null}
          </div>
                ) : null}
              </section>
            )}

            <section className="si-panel">
              <div className="si-progress-row">
                <span className="si-progress-label">
                  Step {Math.min(stepIdx + 1, Math.max(steps.length, 1))} of {Math.max(steps.length, 1)} · Required
                  fields
                </span>
                <span className="si-progress-pct">{progress}%</span>
              </div>
              <div className="si-progress-bar">
                <div className="si-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <p className="si-hint">
                Complete fields marked <span style={{ color: UI.color.teal }}>*</span> to finish this inspection.
              </p>
            </section>

            <div className="si-panel si-form-card" ref={formCardRef}>
        {/* Temporarily hidden: template selector (always use template default) */}
        {/* <TemplateToolbar
          templates={templates}
          selectedId={selectedTemplateId}
          onSelect={(idOrNull) => setSelectedTemplateId(idOrNull)}
          onRefresh={refreshTemplates}
        /> */}

        {msg && (
          <div className={`si-alert ${okMsg ? 'si-alert--ok' : 'si-alert--err'}`} style={{ marginBottom: 12 }}>
            {msg}
          </div>
        )}

        {template ? (
          <FormRenderer
            template={template}
            stepIndex={stepIdx}
            formData={form}
            setFormData={setForm}
            onPickFile={onPickFile}
          />
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Inspected At *</div>
              <input
                type="datetime-local"
                value={form.inspected_at || ''}
                onChange={(e) => setForm((p) => ({ ...p, inspected_at: e.target.value }))}
                style={input}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Site Inspector Name*</div>
              <input
                value={form.inspector_name || ''}
                onChange={(e) => setForm((p) => ({ ...p, inspector_name: e.target.value }))}
                style={input}
              />
            </div>
          </div>
        )}
            </div>

        {(!template || stepIdx === steps.length - 1) && (
          <section className="si-panel si-signoff">
            <div style={{ fontWeight: 700, fontSize: 16, color: UI.color.navy, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              Customer sign-off
              <span className="si-signoff-badge">Required</span>
            </div>

            {/* Confirmation statement */}
            <div style={{
              padding: '14px 16px', borderRadius: 12,
              background: '#f8fafc', border: '1.5px solid #e2e8f0',
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', lineHeight: 1.5, fontStyle: 'italic' }}>
                "I confirm the site inspection has been completed and I approve all findings."
              </div>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: UI.color.navy }}>Customer Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Full name"
                  style={{ ...input, width: '100%', marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: UI.color.navy }}>Signature *</label>
                <canvas
                  ref={canvasRef}
                  width={480}
                  height={140}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                  style={{
                    border: '1.5px dashed #D1D5DB',
                    borderRadius: 10,
                    background: '#FAFAFA',
                    display: 'block',
                    width: '100%',
                    cursor: 'crosshair',
                    touchAction: 'none',
                    marginTop: 4,
                  }}
                />
                <button
                  type="button"
                  onClick={clearSignature}
                  style={{
                    marginTop: 10,
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#fff',
                    background: UI.color.teal,
                    border: `1px solid ${UI.color.border}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Clear Signature
                </button>
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={customerConfirmed}
                  onChange={(e) => setCustomerConfirmed(e.target.checked)}
                  style={{ marginTop: 2, accentColor: UI.color.teal, width: 16, height: 16, flexShrink: 0 }}
                />
                <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                  I confirm the site inspection has been completed and I approve all findings.
                </span>
              </label>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: UI.color.navy }}>Notes (optional)</label>
                <textarea
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  rows={2}
                  placeholder="Any additional notes…"
                  style={{
                    ...input,
                    width: '100%',
                    marginTop: 4,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>
          </section>
        )}

            <div className="si-footer-actions">
              <div className="si-footer-meta">
                {status} · {progress}% complete
              </div>
              <div className="si-footer-btns">
                {stepIdx > 0 && (
                  <button type="button" onClick={() => setStepIdx((i) => i - 1)} className="si-btn">
                    Back
                  </button>
                )}
                {template && stepIdx < (steps.length - 1) ? (
                  <button
                    type="button"
                    onClick={() => {
                      const currentStep = steps[stepIdx];
                      const currentStepId = currentStep?.id;
                      const failMsg =
                        'Please upload the required items before proceeding. (License selfie is required on Job Details)';
                      if (template && currentStepId && !stepPassesGuards(template, currentStepId, form)) {
                        setMsg(failMsg);
                        return;
                      }
                      setMsg('');
                      setStepIdx((i) => i + 1);
                    }}
                    className="si-btn si-btn--primary"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onSubmit}
                    disabled={saving || isSubmitted || !customerConfirmed || !customerName.trim()}
                    className="si-btn si-btn--primary"
                  >
                    {isSubmitted ? 'Submitted' : saving ? 'Submitting…' : 'Submit'}
                  </button>
                )}
              </div>
            </div>
          </main>
        </div>

        <div className="si-lists">
          <button
            type="button"
            className="si-lists-summary"
            onClick={() => setOtherInspectionsOpen((o) => !o)}
            aria-expanded={otherInspectionsOpen}
          >
            <span>Other inspections</span>
            <span style={{ color: '#94a3b8', fontSize: 13 }}>
              {draftList.length} draft · {submittedList.length} submitted · {otherInspectionsOpen ? '▼' : '▶'}
            </span>
          </button>

          {otherInspectionsOpen ? (
            <div className="si-lists-body">
      <div className="si-list-block">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: UI.color.navy }}>Draft documents</div>
          <button type="button" onClick={() => loadInspectionLists()} style={btn('secondary')}>
            Refresh
          </button>
        </div>
        {listsLoading ? (
          <div>Loading…</div>
        ) : draftList.length === 0 ? (
          <div style={{ color: UI.color.muted }}>No draft found</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {draftList.map(({ lead }) => (
              <div
                key={lead.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1.6fr) 1fr 0.8fr auto',
                  gap: 8,
                  alignItems: 'center',
                  padding: '10px 12px',
                  border: `1px solid ${UI.color.border}`,
                  borderRadius: 10,
                  background: '#fff',
                }}
              >
                <div style={{ fontWeight: 700 }}>{lead.customer_name ?? '—'}</div>
                <div style={{ color: UI.color.muted }}>{lead.suburb ?? '—'}</div>
                <div>
                  <span
                    style={{
                      background: '#FFFBEB',
                      color: '#92400E',
                      border: `1px solid ${UI.color.borderStrong}`,
                      padding: '4px 8px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    DRAFT
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => window.open(`${basePath}/leads/${lead.id}/site-inspection`, '_blank')}
                  style={btn('secondary')}
                >
                  Open
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submitted list */}
      <div style={{ ...card }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: UI.color.navy, marginBottom: 8 }}>Submitted documents</div>
        {listsLoading ? (
          <div>Loading…</div>
        ) : submittedList.length === 0 ? (
          <div style={{ color: UI.color.muted }}>No submitted item</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {submittedList.map(({ lead }) => (
              <div
                key={lead.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1.6fr) 1fr 0.8fr auto',
                  gap: 8,
                  alignItems: 'center',
                  padding: '10px 12px',
                  border: `1px solid ${UI.color.border}`,
                  borderRadius: 10,
                  background: '#fff',
                }}
              >
                <div style={{ fontWeight: 700 }}>{lead.customer_name ?? '—'}</div>
                <div style={{ color: UI.color.muted }}>{lead.suburb ?? '—'}</div>
                <div>
                  <span
                    style={{
                      background: '#ECFDF5',
                      color: '#065F46',
                      border: `1px solid ${UI.color.borderStrong}`,
                      padding: '4px 8px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    SUBMITTED
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => window.open(`${basePath}/leads/${lead.id}/site-inspection`, '_blank')}
                  style={btn('secondary')}
                >
                  Open
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
            </div>
          ) : null}
        </div>

        {/* Right sidebar - Checklist */}
        {/* Temporarily hidden: checklist widget */}
        {/* <ChecklistWidget companyId={form.company_id} /> */}
      </div>
    </div>
  );
}
