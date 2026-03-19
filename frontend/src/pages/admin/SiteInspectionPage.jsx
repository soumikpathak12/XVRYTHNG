// src/pages/admin/SiteInspectionPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
  getLead,
  getSiteInspection,
  saveSiteInspectionDraft,
  submitSiteInspection,
  uploadSiteInspectionFile,
  getLeads,
  getCompanyInspectionTemplates,
} from '../../services/api.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import FormRenderer from '../../components/FormRenderer.jsx';
import { getRequiredKeys, formatValueForPdf } from '../../utils/template.js';
import { buildStepsFromEnabled } from '../../templates/sectionCatalog.js';

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
      fields: (sec.fields || []).map((f) => {
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

// ================= Page =================
export default function SiteInspectionPage() {
  const params = useParams();
  const leadId = params.id ?? params.leadId;

  // Lead + templates
  const [lead, setLead] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [template, setTemplate] = useState(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Form
  const [form, setForm] = useState({});
  const [status, setStatus] = useState('draft');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Step
  const [stepIdx, setStepIdx] = useState(0);

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
          setStatus(d.status ?? 'draft');
          let extra = {};
          try {
            extra = d.additional_notes ? JSON.parse(d.additional_notes) || {} : {};
          } catch {
            extra = {};
          }
          setForm({ ...extra, ...d });
          const savedKey = extra?._t || d.template_key || null;
          const savedVer = extra?._v || d.template_version || null;
          if (savedKey) setForm((p) => ({ ...p, __savedTemplateKey: savedKey, __savedTemplateVer: savedVer }));
        } else if (!aborted) {
          const now = new Date();
          const pad = (n) => String(n).padStart(2, '0');
          const inspected_at = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(
            now.getMinutes()
          )}`;
          setForm({ inspected_at });
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

      const savedKey = form.__savedTemplateKey;
      const savedVer = Number(form.__savedTemplateVer || NaN);
      let chosenId = null;
      if (savedKey) {
        const exact = list.find((t) => t.key === savedKey && (isNaN(savedVer) || Number(t.version) === savedVer));
        const any = list.find((t) => t.key === savedKey);
        chosenId = String((exact || any || {}).id || '');
      }
      setSelectedTemplateId(chosenId || null);
    } catch (e) {
      setMsg(e.message || 'Failed to load templates');
    } finally {
      setTemplatesLoading(false);
    }
  }
  useEffect(() => {
    refreshTemplates();
  }, [lead]); // after lead loaded

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
    // chỉ clear banner liên quan guard
    if (msg && msg.startsWith('Please upload the required items') && currentStepId && stepPassesGuards(template, currentStepId, form)) {
      setMsg('');
    }
  }, [form, stepIdx, template, steps, msg]);

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

  // -------- Save / Submit --------
  function buildPayload() {
    const t = template || {};
    const additional_notes = JSON.stringify({ _t: t.key || 'default', _v: t.version ?? 1, ...form });
    return {
      ...form,
      additional_notes,
      template_key: t.key || 'default',
      template_version: t.version ?? 1,
    };
  }
  async function onSaveDraft() {
    try {
      setSaving(true);
      setMsg('');
      await saveSiteInspectionDraft(leadId, buildPayload());
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
      const missing = requiredKeys.filter((k) => !form[k] || String(form[k]).trim() === '');
      if (missing.length) {
        setMsg('Please complete all required fields.');
        return;
      }
      setSaving(true);
      setMsg('');
      await submitSiteInspection(leadId, buildPayload());
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
        const dataURL = fileObj?.preview_data_url;
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

  const Stepper = () => (
    <div style={{ position: 'sticky', top: 8, zIndex: 5, background: 'transparent', paddingBottom: 8 }}>
      <ol style={{ display: 'flex', gap: 8, flexWrap: 'wrap', listStyle: 'none', paddingLeft: 0, margin: 0 }}>
        {(steps.length ? steps : [{ id: 'core', label: 'Core' }]).map((s, i) => {
          const active = i === stepIdx;
          const done = i < stepIdx;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setStepIdx(i)}
                style={{
                  ...btn('secondary'),
                  borderColor: active ? UI.color.teal : UI.color.border,
                  background: active ? '#E6FFFB' : '#fff',
                  color: active ? UI.color.teal : UI.color.navy,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: done ? UI.color.teal : active ? UI.color.teal : '#CBD5E1',
                    display: 'inline-block',
                  }}
                />
                <span style={{ marginLeft: 6 }}>{i + 1}. {s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );

  if (loading) return <div style={card}>Loading site inspection…</div>;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* Header */}
      {lead && (
        <div style={{ ...card, position: 'relative' }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6, color: UI.color.navy }}>BASIC DETAILS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
              <div>{lead.system_type ?? '—'}</div>
            </div>
            {lead.pv_system_size_kw != null ||
              lead.pv_inverter_brand ||
              lead.pv_panel_brand ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>PV System</div>
                <div>
                  {[
                    lead.pv_system_size_kw != null ? `${lead.pv_system_size_kw} kW` : null,
                    lead.pv_inverter_brand ? `Inverter: ${lead.pv_inverter_brand}` : null,
                    lead.pv_panel_brand ? `Panel: ${lead.pv_panel_brand}` : null,
                    lead.pv_panel_module_watts != null ? `${lead.pv_panel_module_watts} W` : null,
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
          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              border: `1px solid ${UI.color.border}`,
              background: '#FFFFFF',
              borderRadius: 999,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: status === 'submitted' ? '#16A34A' : '#F59E0B',
                display: 'inline-block',
              }}
            />
            {status.toUpperCase()}
          </div>
        </div>
      )}

      {/* Progress */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: UI.color.navy }}>SITE INSPECTION</div>
          <div style={{ fontWeight: 700, color: '#111827' }}>{progress}%</div>
        </div>
        <div style={barWrap}>
          <div style={{ ...barFill, width: `${progress}%` }} />
        </div>
        <div style={{ color: UI.color.muted, fontSize: 12, marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: '#22C55E', display: 'inline-block' }} />
          Complete all required fields (marked <span style={{ color: UI.color.teal }}>*</span>) to reach 100%.
        </div>
      </div>

      {/* Form + Toolbar */}
      <div style={card}>
        <TemplateToolbar
          templates={templates}
          selectedId={selectedTemplateId}
          onSelect={(idOrNull) => setSelectedTemplateId(idOrNull)}
          onRefresh={refreshTemplates}
        />

        <Stepper />

        {msg && (
          <div
            style={{
              color: okMsg ? '#065F46' : '#B91C1C',
              background: okMsg ? '#ECFDF5' : '#FEF2F2',
              border: `1px solid ${UI.color.border}`,
              padding: 8,
              borderRadius: 8,
              marginBottom: 10,
            }}
          >
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

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ color: UI.color.muted, fontSize: 12 }}>
            Status: <b>{status}</b> • Core completion: <b>{progress}%</b>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onSaveDraft} disabled={saving} style={btn('secondary')}>
              Save Draft
            </button>
            <button type="button" onClick={exportPdf} disabled={exporting} style={btn('secondary')}>
              Export PDF
            </button>
            {stepIdx > 0 && (
              <button type="button" onClick={() => setStepIdx((i) => i - 1)} style={btn('secondary')}>
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
                    // window.scrollTo({ top: 0, behavior: 'smooth' });
                    return;
                  }
                  setMsg('');
                  setStepIdx((i) => i + 1);
                }}
                style={btn('primary')}
              >
                Next
              </button>
            ) : (
              <button type="button" onClick={onSubmit} disabled={saving} style={btn('primary')}>
                {saving ? 'Submitting…' : 'Submit'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Draft list */}
      <div style={{ ...card }}>
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
                  onClick={() => window.open(`/admin/leads/${lead.id}/site-inspection`, '_blank')}
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
                  onClick={() => window.open(`/admin/leads/${lead.id}/site-inspection`, '_blank')}
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
  );
}
