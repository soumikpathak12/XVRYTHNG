
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getLead,
  getSiteInspection,
  saveSiteInspectionDraft,
  submitSiteInspection,
  uploadSiteInspectionFile,
  getLeads,
} from '../../services/api.js';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const REQUIRED = ['inspected_at', 'inspector_name', 'roof_type', 'meter_phase', 'inverter_location', 'msb_condition'];

function toDatetimeLocal(dt) {
  if (!dt) return '';
  const d = dt instanceof Date ? dt : new Date(dt);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

const emptyExtended = {
  jobDetails: {
    lifeSupportRequired: '',
    consumerMains: '',
    isMultiOccupancy: '',
    storey: '',
    inspectionCompany: 'xTechs Renewables',
    licenseSelfie: null,
    fullHousePhoto: null,
  },
  switchboard: {
    meterNumber: '',
    nmi: '',
    isCompliant: '',
    phases: '',
    biDirectionalMeter: '',
    asbestosPresent: '',
    mainSwitchRatingAmps: '',
    pointOfAttachment: '',
    distanceTxToPOA: '',
    distancePOAToMSB: '',
    consumerMainsCableSize: '',
    consumerMainsCableType: '',
    mainsRunMethod: '',
    inverterToThisMSB: '',
    spareForSolarMainBreaker: '',
    spaceForSmartMeter: '',
    distanceInverterFromMSB: '',
    meterPhoto: null,
    neutralEarthPhoto: null,
    photoSwitchboardOn: null,
    photoSwitchboardOff: null,
    voltageReadingPhotos: [],
  },
  subBoard: { msbFeedsSubBoard: '', subBoardPOCPhoto: null },
  inverterLocation: {
    requireACIsolator: '',
    mountingMethod: '',
    ventilationOK: '',
    backingBoardNeeded: '',
    directSunlight: '',
    conduitRunDiscussed: '',
    notes: '',
    locationPhoto: null,
  },
  batteryDetails: { installingBattery: '', notes: '' },
  monitoring: {
    wifiAtLocation: '',
    strongReception: '',
    ethernetRunnable: '',
    spareRouterPort: '',
    wifiName: '',
    wifiPassword: '',
    distanceToEthernetPort: '',
  },
  existingSystem: { existingSolar: '', existingBattery: '' },
  roofProfile: {
    roofHeightMeters: '',
    safeAccess: '',
    accessMethod: '',
    panelCarryMethod: '',
    edgeProtectionRequired: '',
    edgeProtectionAvailable: '',
    edgeProtectionMeters: '',
    roofMaterial: '',
    roofConditionOK: '',
    section1Pitch: '',
    section2Pitch: '',
    section3Pitch: '',
    anchorPoints: '',
    skylights: '',
    designFits: '',
    tiltsRequired: '',
    tiltAngle: '',
    spareTilesAvailable: '',
    structureForModules: '',
    shadingIssues: '',
    dcCableRunMeters: '',
    dcConduitMeters: '',
    edgeProtectionPhoto: null,
    section1Photo: null,
    section2Photo: null,
    section3Photo: null,
  },
  mudMap: { accessNotes: '', mapPhoto: null },
  shading: { sources: [], other: '' },
  electrical: { hazards: [], other: '', notes: '' },
  recommendations: { count: 0, summary: '', items: [] },
};

// Wizard steps (single file — no splitting)
const STEPS = [
  { id: 'core',        label: 'Core Details' },
  { id: 'job',         label: 'Job Details' },
  { id: 'switchboard', label: 'Switchboard' },
  { id: 'inverter',    label: 'Inverter Location' },
  { id: 'monitor',     label: 'Monitoring & Existing' },
  { id: 'roof',        label: 'Roof Profile' },
  { id: 'mudmap',      label: 'Mud Map' },
  { id: 'final',       label: 'Final Checks' }, // Shading + Electrical + Recommendations
];

/** ===================== Modern UI Tokens ===================== */
const UI = {
  color: {
    navy: '#0F172A',
    teal: '#0FA5A5',
    tealDark: '#0C8B8B',
    border: 'rgba(2,6,23,0.08)',
    borderStrong: 'rgba(2,6,23,0.14)',
    muted: '#6B7280',
    sand: '#F8FAFC',
    bg: '#FFFFFF',
    ring: 'rgba(15,165,165,0.35)',
    shadow: 'rgba(2, 6, 23, 0.06)',
  },
  radius: 14,
  pad: 16,
  gap: 12,
};

// Card with subtle elevation
const card = {
  background: UI.color.bg,
  border: `1px solid ${UI.color.border}`,
  borderRadius: UI.radius,
  padding: UI.pad,
  boxShadow: `0 1px 2px ${UI.color.shadow}, 0 8px 24px ${UI.color.shadow}`,
};

const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: UI.gap };
const grid3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: UI.gap };

// Progress bar gradient
const barWrap = { height: 10, background: '#EEF2F7', borderRadius: 999, overflow: 'hidden' };
const barFill = {
  height: 10,
  background: `linear-gradient(90deg, ${UI.color.teal} 0%, ${UI.color.tealDark} 100%)`,
  transition: 'width .25s ease',
};

// Inputs + focus ring
const input = {
  border: `1px solid ${UI.color.border}`,
  borderRadius: 10,
  padding: '10px 12px',
  background: '#fff',
  outline: 'none',
  transition: 'box-shadow .2s, border-color .2s',
};
const focusProps = {
  onFocus: (e) => (e.currentTarget.style.boxShadow = `0 0 0 4px ${UI.color.ring}`),
  onBlur:  (e) => (e.currentTarget.style.boxShadow = 'none'),
};

// Buttons
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
  transition: 'background .2s, transform .02s',
});

// Typography
const h3 = { fontWeight: 800, fontSize: 16, marginBottom: 8, color: UI.color.navy };
const h4 = { fontWeight: 800, fontSize: 13, color: UI.color.navy };

// Inline label
function Lbl({ children, required }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 4 }}>
      {children} {required ? <span style={{ color: UI.color.teal }}>*</span> : null}
    </div>
  );
}
function Row({ children }) {
  return <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>{children}</div>;
}
const Field = ({ label, children, required }) => (
  <div style={{ display: 'grid', gap: 6 }}>
    <Lbl required={required}>{label}</Lbl>
    {children}
  </div>
);

const Icon = ({ path, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d={path} fill="currentColor" />
  </svg>
);
const paths = {
  save: 'M17 3H7a2 2 0 0 0-2 2v14l7-3 7 3V5a2 2 0 0 0-2-2z',
  pdf: 'M6 2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM13 2v4h4',
  back: 'M15 18l-6-6 6-6',
  next: 'M9 6l6 6-6 6',
  submit: 'M5 13l4 4L19 7',
};

export default function SiteInspectionPage() {
  const params = useParams();
  const leadId = params.id ?? params.leadId;

  const [lead, setLead] = useState(null);
  const [form, setForm] = useState({
    inspected_at: '',
    inspector_name: '',
    roof_type: '',
    roof_pitch_deg: '',
    house_storey: '',
    meter_phase: '',
    inverter_location: '',
    msb_condition: '',
    shading: '',
    additional_notes: '',
  });
  const [ext, setExt] = useState(structuredClone(emptyExtended));
  const [status, setStatus] = useState('draft');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Wizard step state
  const [stepIdx, setStepIdx] = useState(0);

  // Lists (Draft / Submitted) shown below form
  const [draftList, setDraftList] = useState([]);
  const [submittedList, setSubmittedList] = useState([]);
  const [listsLoading, setListsLoading] = useState(false);

  /** ---------- Load lead + site inspection ---------- */
  useEffect(() => {
    let aborted = false;
    async function loadAll() {
      try {
        setLoading(true); setMsg('');
        const leadResp = await getLead(leadId);
        if (!aborted) setLead(leadResp.lead ?? leadResp.data ?? null);

        const si = await getSiteInspection(leadId);
        if (!aborted && si?.data) {
          const d = si.data;
          setStatus(d.status ?? 'draft');
          setForm({
            inspected_at: toDatetimeLocal(d.inspected_at) ?? toDatetimeLocal(new Date()),
            inspector_name: d.inspector_name ?? '',
            roof_type: d.roof_type ?? '',
            roof_pitch_deg: d.roof_pitch_deg ?? '',
            house_storey: d.house_storey ?? '',
            meter_phase: d.meter_phase ?? '',
            inverter_location: d.inverter_location ?? '',
            msb_condition: d.msb_condition ?? '',
            shading: d.shading ?? '',
            additional_notes: d.additional_notes ?? '',
          });
          if (d.additional_notes) {
            try { setExt({ ...structuredClone(emptyExtended), ...(JSON.parse(d.additional_notes) ?? {}) }); }
            catch { setExt(structuredClone(emptyExtended)); }
          } else {
            setExt(structuredClone(emptyExtended));
          }
        } else if (!aborted) {
          setForm((f) => ({ ...f, inspected_at: toDatetimeLocal(new Date()) }));
          setExt(structuredClone(emptyExtended));
        }
      } catch (e) {
        if (!aborted) setMsg(e.message ?? 'Failed to load site inspection');
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    if (leadId) loadAll();
    return () => { aborted = true; };
  }, [leadId]);

  /** ---------- Load Draft/Submitted lists (client grouping) ---------- */
  async function loadInspectionLists(limit = 20) {
    setListsLoading(true);
    try {
      const res = await getLeads({ limit }); // { data: [...] } or array
      const leadsArr = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
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
  useEffect(() => { loadInspectionLists(20); }, []);

  const progress = useMemo(() => {
    const filled = REQUIRED.reduce((acc, k) => acc + (form[k] && String(form[k]).trim() !== '' ? 1 : 0), 0);
    return Math.round((filled / REQUIRED.length) * 100);
  }, [form]);

  /** ---------- State helpers ---------- */
  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setExtField = (section, key, value) => setExt((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  const toggleExtArray = (section, field, option) =>
    setExt((prev) => {
      const cur = Array.isArray(prev[section]?.[field]) ? prev[section][field] : [];
      const next = cur.includes(option) ? cur.filter((x) => x !== option) : [...cur, option];
      return { ...prev, [section]: { ...prev[section], [field]: next } };
    });

  /** ---------- Upload (captures preview_data_url for PDF) ---------- */
  function mapSubcategoryToExtSection(sub) {
    if (!sub) return sub;
    if (sub.startsWith('jobdetails-')) return 'jobDetails';
    if (sub.startsWith('switchboard')) return 'switchboard';
    if (sub === 'sub-board') return 'subBoard';
    if (sub === 'inverter-location') return 'inverterLocation';
    if (sub.startsWith('roof-')) return 'roofProfile';
    if (sub === 'mud-map') return 'mudMap';
    return sub;
  }
  async function uploadPhoto({ section, field, multi = false }) {
    return new Promise((resolve) => {
      const inputEl = document.createElement('input');
      inputEl.type = 'file'; inputEl.accept = 'image/*,application/pdf';
      inputEl.onchange = async (e) => {
        try {
          const file = e.target?.files?.[0];
          if (!file) return resolve(null);

          // 1) Get preview (base64) for PDF (CORS-free)
          const preview_data_url = await new Promise((res) => {
            const fr = new FileReader();
            fr.onload = () => res(fr.result);
            fr.onerror = () => res(null);
            fr.readAsDataURL(file);
          });

          // 2) Upload to server (API unchanged)
          const uploaded = await uploadSiteInspectionFile(leadId, file, section); // { filename, storage_url }

          // 3) Save in correct ext section
          const extSection = mapSubcategoryToExtSection(section);
          setExt((prev) => {
            const clone = structuredClone(prev);
            if (!clone[extSection]) clone[extSection] = {};
            const payload = { ...uploaded, preview_data_url };
            if (multi) {
              const arr = Array.isArray(clone[extSection][field]) ? clone[extSection][field] : [];
              arr.push(payload); clone[extSection][field] = arr;
            } else {
              clone[extSection][field] = payload;
            }
            return clone;
          });
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

  /** ---------- Save / Submit ---------- */
  function buildPayload() {
    return {
      ...form,
      roof_pitch_deg: form.roof_pitch_deg === '' ? null : Number(form.roof_pitch_deg),
      additional_notes: JSON.stringify(ext),
    };
  }
  async function onSaveDraft() {
    try { setSaving(true); setMsg('');
      await saveSiteInspectionDraft(leadId, buildPayload());
      setStatus('draft'); setMsg('Draft saved');
      loadInspectionLists(20);
    } catch (e) { setMsg(e.message ?? 'Save draft failed'); }
    finally { setSaving(false); }
  }
  async function onSubmit() {
    try {
      const missing = REQUIRED.filter((k) => !form[k] || String(form[k]).trim() === '');
      if (missing.length) { setMsg('Please complete all required fields before submit.'); return; }
      setSaving(true); setMsg('');
      await submitSiteInspection(leadId, buildPayload());
      setStatus('submitted'); setMsg('Submitted!');
      loadInspectionLists(20);
    } catch (e) { setMsg(e.message ?? 'Submit failed'); }
    finally { setSaving(false); }
  }

async function exportPdf() {
  try {
    setExporting(true);

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const page = {
      w: doc.internal.pageSize.getWidth(),
      h: doc.internal.pageSize.getHeight(),
    };

    // ----------------------
    // BRAND COLORS
    // ----------------------
 const BRAND = {
  primary: [20, 107, 107],
  dark:   [30, 41, 59],    
  gray:   [100, 116, 139], 
  light:  [241, 245, 249], 
  border: [226, 232, 240], 
};

    const margin = { l: 50, r: 50, t: 70, b: 60 };
    let y = margin.t;

  
    const clean = (v) => String(v ?? "").trim() || "—";

    function section(title) {
      doc.setFillColor(...BRAND.light);
      doc.rect(margin.l, y, page.w - margin.l - margin.r, 32, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...BRAND.dark);
      doc.text(title, margin.l + 10, y + 21);

      y += 42;
    }

    function maybeNewPage(extra = 120) {
      if (y > page.h - margin.b - extra) {
        doc.addPage();
        y = margin.t;
      }
    }


    function keyValueTable(rows) {
      maybeNewPage(140);

      autoTable(doc, {
        startY: y,
        theme: "grid",
        styles: {
          fontSize: 11,
          textColor: BRAND.dark,
          cellPadding: 6,
          lineColor: BRAND.border,
        },
        headStyles: {
          fillColor: BRAND.primary,
          textColor: "#ffffff",
        },
        body: rows.map(([k, v]) => [k, clean(v)]),
        columns: [
          { header: "Field", dataKey: "0" },
          { header: "Value", dataKey: "1" },
        ],
        tableWidth: page.w - margin.l - margin.r,
        margin: { left: margin.l, right: margin.r },
      });

      y = doc.lastAutoTable.finalY + 20;
    }


    async function imageCard(title, fileObj) {
      maybeNewPage(200);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(title, margin.l, y);

      y += 10;

      doc.setDrawColor(...BRAND.border);
      doc.rect(margin.l, y, 220, 150);

      const dataURL = fileObj?.preview_data_url;
      if (dataURL) {
        doc.addImage(dataURL, "JPEG", margin.l + 5, y + 5, 210, 140);
      } else {
        doc.setFontSize(10);
        doc.text("No image", margin.l + 10, y + 20);
      }

      y += 170;
    }

    // ----------------------
    // COVER PAGE
    // ----------------------
    doc.setFillColor(...BRAND.primary);
    doc.rect(0, 0, page.w, 150, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text("Site Inspection Report", margin.l, 85);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("xTechs Renewables", margin.l, 115);

    doc.setFillColor(...BRAND.light);
    doc.rect(margin.l, 190, page.w - margin.l - margin.r, 120, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...BRAND.dark);
    doc.text("Customer Summary", margin.l + 14, 214);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Customer: " + clean(lead?.customer_name), margin.l + 14, 240);
    doc.text("Contact:  " + clean(lead?.phone || lead?.email), margin.l + 14, 260);
    doc.text("Address:  " + clean(lead?.suburb), margin.l + 14, 280);
    doc.text("Inspected At: " + clean(form.inspected_at), margin.l + 14, 300);

    doc.addPage();
    y = margin.t;

    // ----------------------
    // SECTIONS
    // ----------------------
    section("Core Details");
    keyValueTable([
      ["Inspector Name", form.inspector_name],
      ["Roof Type", form.roof_type],
      ["Meter Phase", form.meter_phase],
      ["Inverter Location", form.inverter_location],
      ["MSB Condition", form.msb_condition],
      ["House Storey", form.house_storey],
      ["Shading", form.shading],
    ]);

    section("Job Details");
    keyValueTable([
      ["Inspection Company", ext.jobDetails.inspectionCompany],
      ["Consumer Mains", ext.jobDetails.consumerMains],
      ["Multi-Occupancy", ext.jobDetails.isMultiOccupancy],
      ["Storey", ext.jobDetails.storey],
      ["Life Support Required", ext.jobDetails.lifeSupportRequired],
    ]);

    await imageCard("License Selfie", ext.jobDetails.licenseSelfie);
    await imageCard("Full House Image", ext.jobDetails.fullHousePhoto);

    section("Switchboard / MSB");
    keyValueTable([
      ["Meter Number", ext.switchboard.meterNumber],
      ["NMI", ext.switchboard.nmi],
      ["Compliant", ext.switchboard.isCompliant],
      ["Phases", ext.switchboard.phases],
      ["Bi-directional Meter", ext.switchboard.biDirectionalMeter],
      ["Asbestos Present", ext.switchboard.asbestosPresent],
      ["Main Switch Rating", ext.switchboard.mainSwitchRatingAmps],
      ["Point of Attachment", ext.switchboard.pointOfAttachment],
      ["TX → POA", ext.switchboard.distanceTxToPOA],
      ["POA → MSB", ext.switchboard.distancePOAToMSB],
      ["Cable Size", ext.switchboard.consumerMainsCableSize],
      ["Cable Type", ext.switchboard.consumerMainsCableType],
    ]);

    await imageCard("Switchboard - ON", ext.switchboard.photoSwitchboardOn);
    await imageCard("Switchboard - OFF", ext.switchboard.photoSwitchboardOff);

    section("Inverter Location");
    keyValueTable([
      ["Require AC Isolator", ext.inverterLocation.requireACIsolator],
      ["Mounting Method", ext.inverterLocation.mountingMethod],
      ["Ventilation OK", ext.inverterLocation.ventilationOK],
      ["Backing Board Needed", ext.inverterLocation.backingBoardNeeded],
      ["Direct Sunlight", ext.inverterLocation.directSunlight],
      ["Conduit Run Discussed", ext.inverterLocation.conduitRunDiscussed],
      ["Notes", ext.inverterLocation.notes],
    ]);

    await imageCard("Inverter Photo", ext.inverterLocation.locationPhoto);

    section("Roof");
    keyValueTable([
      ["Roof Height", ext.roofProfile.roofHeightMeters],
      ["Safe Access", ext.roofProfile.safeAccess],
      ["Access Method", ext.roofProfile.accessMethod],
      ["Panel Carry Method", ext.roofProfile.panelCarryMethod],
      ["Edge Protection Required", ext.roofProfile.edgeProtectionRequired],
      ["Edge Protection Available", ext.roofProfile.edgeProtectionAvailable],
      ["Edge Protection (m)", ext.roofProfile.edgeProtectionMeters],
      ["Roof Type", ext.roofProfile.roofMaterial],
      ["Roof Condition OK", ext.roofProfile.roofConditionOK],
    ]);

    await imageCard("Roof Section 1", ext.roofProfile.section1Photo);
    await imageCard("Roof Section 2", ext.roofProfile.section2Photo);
    await imageCard("Roof Section 3", ext.roofProfile.section3Photo);

    section("Mud Map");
    keyValueTable([["Access Notes", ext.mudMap.accessNotes]]);
    await imageCard("Mud Map", ext.mudMap.mapPhoto);

    // ----------------------
    // FOOTER (ALL PAGES)
    // ----------------------
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...BRAND.gray);

      doc.text(
        `Generated: ${new Date().toLocaleString()}`,
        margin.l,
        page.h - 20
      );

      const label = `Page ${i} of ${pageCount}`;
      const tw = doc.getTextWidth(label);

      doc.text(label, page.w - margin.r - tw, page.h - 20);
    }

    // ----------------------
    // DOWNLOAD
    // ----------------------
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `site-inspection-${leadId ?? "report"}.pdf`;
    a.click();

    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    setMsg("Error generating PDF");
  } finally {
    setExporting(false);
  }
}

  /** ===================== Render ===================== */
  if (loading) return <div style={card}>Loading site inspection…</div>;

  const okMsg = msg === 'Submitted!' || msg === 'Draft saved';

  // Stepper (sticky, no duplicated numbers)
  const Stepper = () => (
    <div style={{ position: 'sticky', top: 8, zIndex: 5, background: 'transparent', paddingBottom: 8 }}>
      {/* hide default <ol> numbering to avoid duplicated numbers with {i+1}. */}
      <ol style={{ display: 'flex', gap: 8, flexWrap: 'wrap', listStyle: 'none', paddingLeft: 0, margin: 0 }}>
        {STEPS.map((s, i) => {
          const active = i === stepIdx; const done = i < stepIdx;
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
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: 999,
                  background: done ? UI.color.teal : active ? UI.color.teal : '#CBD5E1',
                  display: 'inline-block',
                }} />
                <span style={{ opacity: done ? 0.85 : 1 }}>{i + 1}. {s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );

  // Actions (buttons with icons)
  const NavActions = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
      <div style={{ color: UI.color.muted, fontSize: 12 }}>
        Status: <b>{status}</b> • Core completion: <b>{progress}%</b>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={saving}
          style={btn('secondary')}
          onMouseEnter={(e)=> (e.currentTarget.style.background = '#F3F4F6')}
          onMouseLeave={(e)=> (e.currentTarget.style.background = '#fff')}
        >
          <Icon path={paths.save} />
          {saving && status === 'draft' ? 'Saving…' : 'Save Draft'}
        </button>

        <button
          type="button"
          onClick={exportPdf}
          disabled={exporting}
          style={btn('secondary')}
          onMouseEnter={(e)=> (e.currentTarget.style.background = '#F3F4F6')}
          onMouseLeave={(e)=> (e.currentTarget.style.background = '#fff')}
        >
          <Icon path={paths.pdf} />
          {exporting ? 'Generating…' : 'Export PDF'}
        </button>

        {stepIdx > 0 && (
          <button type="button" onClick={() => setStepIdx((i) => i - 1)} style={btn('secondary')}>
            <Icon path={paths.back} /> Back
          </button>
        )}
        {stepIdx < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStepIdx((i) => i + 1)}
            style={btn('primary')}
            onMouseEnter={(e)=> (e.currentTarget.style.background = UI.color.tealDark)}
            onMouseLeave={(e)=> (e.currentTarget.style.background = UI.color.teal)}
          >
            Next <Icon path={paths.next} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            style={btn('primary')}
            onMouseEnter={(e)=> (e.currentTarget.style.background = UI.color.tealDark)}
            onMouseLeave={(e)=> (e.currentTarget.style.background = UI.color.teal)}
          >
            <Icon path={paths.submit} /> {saving ? 'Submitting…' : 'Submit'}
          </button>
        )}
      </div>
    </div>
  );

  // Upload button with inline thumbnail preview
  function UploaderBtn({ onClick, file, label = 'Upload Photo' }) {
    const isImg = file?.preview_data_url?.startsWith('data:image/');
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={onClick}
          style={btn('secondary')}
          onMouseEnter={(e)=> (e.currentTarget.style.background = '#F3F4F6')}
          onMouseLeave={(e)=> (e.currentTarget.style.background = '#fff')}
        >
          {label}
        </button>
        {isImg && (
          <img
            src={file.preview_data_url}
            alt={file?.filename ?? 'preview'}
            width={64}
            height={64}
            style={{
              borderRadius: 10,
              border: `1px solid ${UI.color.border}`,
              objectFit: 'cover',
              boxShadow: `0 1px 2px ${UI.color.shadow}`,
            }}
          />
        )}
        {file?.filename && (
          <a href={file.storage_url} target="_blank" rel="noreferrer" style={{ color: '#2563EB', textDecoration: 'underline', fontSize: 12 }}>
            {file.filename}
          </a>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* Header (Customer & System summary) */}
      {lead && (
        <div style={{ ...card, position: 'relative' }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6, color: UI.color.navy }}>CUSTOMER & SYSTEM</div>
          <div style={grid2}>
            <div><Lbl>Customer</Lbl><div>{lead.customer_name ?? '—'}</div></div>
            <div><Lbl>Contact</Lbl><div>{lead.email ?? lead.phone ?? '—'}</div></div>
            <div><Lbl>Address</Lbl><div>{lead.suburb ?? '—'}</div></div>
            <div><Lbl>System</Lbl><div>{(lead.system_type ?? '—') + (lead.system_size_kw ? ` • ${lead.system_size_kw} kW` : '')}</div></div>
          </div>
          {/* Status pill */}
          <div
            style={{
              position: 'absolute', top: 12, right: 12,
              border: `1px solid ${UI.color.border}`, background: '#FFFFFF',
              borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 6
            }}
          >
            <span style={{ width:8, height:8, borderRadius:999, background: status==='submitted' ? '#16A34A' : '#F59E0B', display:'inline-block' }} />
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
        <div style={barWrap}><div style={{ ...barFill, width: `${progress}%` }} /></div>
        <div style={{ color: UI.color.muted, fontSize: 12, marginTop: 6, display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ width:8, height:8, borderRadius:999, background:'#22C55E', display:'inline-block' }} />
          Complete all required fields (marked <span style={{ color: UI.color.teal }}>*</span>) to reach 100%.
        </div>
      </div>

      {/* Form card (Stepper + Message + Step content + Actions) */}
      <div style={card}>
        <Stepper />

        {msg && (
          <div style={{
            color: okMsg ? '#065F46' : '#B91C1C',
            background: okMsg ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${UI.color.border}`, padding: 8, borderRadius: 8, marginBottom: 10,
          }}>
            {msg}
          </div>
        )}

        {/* Step 0: Core */}
        {stepIdx === 0 && (
          <div>
            <Row>
              <Lbl required>Inspected At</Lbl>
              <input type="datetime-local" value={form.inspected_at} onChange={(e) => update('inspected_at', e.target.value)} style={input} {...focusProps} />
            </Row>
            <Row>
              <Lbl required>Inspector Name</Lbl>
              <input type="text" value={form.inspector_name} onChange={(e) => update('inspector_name', e.target.value)} style={input} {...focusProps} />
            </Row>
            <div style={grid3}>
              <Row>
                <Lbl required>Roof Type</Lbl>
                <input type="text" value={form.roof_type} onChange={(e) => update('roof_type', e.target.value)} style={input} placeholder="Tile / Tin / Flat / ..." {...focusProps} />
              </Row>
              <Row>
                <Lbl required>Meter Phase</Lbl>
                <select value={form.meter_phase} onChange={(e) => update('meter_phase', e.target.value)} style={input} {...focusProps}>
                  <option value="">Select</option><option value="single">Single</option><option value="three">Three</option>
                </select>
              </Row>
              <Row>
                <Lbl>House Storey</Lbl>
                <select value={form.house_storey} onChange={(e) => update('house_storey', e.target.value)} style={input} {...focusProps}>
                  <option value="">Select</option><option value="single">Single</option><option value="double">Double</option><option value="triple">Triple</option>
                </select>
              </Row>
            </div>
            <Row>
              <Lbl required>Inverter Location</Lbl>
              <input type="text" value={form.inverter_location} onChange={(e) => update('inverter_location', e.target.value)} style={input} placeholder="Garage wall / near MSB" {...focusProps} />
            </Row>
            <Row>
              <Lbl required>Main Switchboard Condition</Lbl>
              <textarea value={form.msb_condition} onChange={(e) => update('msb_condition', e.target.value)} style={{ ...input, minHeight: 64 }} {...focusProps} />
            </Row>
          </div>
        )}

        {/* Step 1: Job Details */}
        {stepIdx === 1 && (
          <section>
            <h3 style={h3}>Job Details</h3>
            <div style={grid2}>
              <Field label="Inspection Company"><input style={input} value={ext.jobDetails.inspectionCompany} onChange={(e) => setExtField('jobDetails', 'inspectionCompany', e.target.value)} {...focusProps} /></Field>
              <Field label="Is Multi‑Occupancy?"><select style={input} value={ext.jobDetails.isMultiOccupancy} onChange={(e) => setExtField('jobDetails', 'isMultiOccupancy', e.target.value)} {...focusProps}><option value="">Select</option><option>Yes</option><option>No</option></select></Field>
              <Field label="Consumer Mains"><select style={input} value={ext.jobDetails.consumerMains} onChange={(e) => setExtField('jobDetails', 'consumerMains', e.target.value)} {...focusProps}><option value="">Select</option><option>Overhead</option><option>Underground</option></select></Field>
              <Field label="Storey"><select style={input} value={ext.jobDetails.storey} onChange={(e) => setExtField('jobDetails', 'storey', e.target.value)} {...focusProps}><option value="">Select</option><option>Single</option><option>Double</option><option>Multi</option></select></Field>
              <Field label="Life Support Required"><select style={input} value={ext.jobDetails.lifeSupportRequired} onChange={(e) => setExtField('jobDetails', 'lifeSupportRequired', e.target.value)} {...focusProps}><option value="">Select</option><option>Yes</option><option>No</option></select></Field>
            </div>
            <div style={grid2}>
              <Field label="License selfie (Photo)"><UploaderBtn onClick={() => uploadPhoto({ section: 'jobdetails-license-selfie', field: 'licenseSelfie' })} file={ext.jobDetails.licenseSelfie} /></Field>
              <Field label="Full house/building image"><UploaderBtn onClick={() => uploadPhoto({ section: 'jobdetails-full-house', field: 'fullHousePhoto' })} file={ext.jobDetails.fullHousePhoto} /></Field>
            </div>
          </section>
        )}

        {/* Step 2: Switchboard */}
        {stepIdx === 2 && (
          <section>
            <h3 style={h3}>Switchboard / Main MSB</h3>
            <div style={grid3}>
              <Field label="Meter Number"><input style={input} value={ext.switchboard.meterNumber} onChange={(e) => setExtField('switchboard', 'meterNumber', e.target.value)} {...focusProps} /></Field>
              <Field label="NMI"><input style={input} value={ext.switchboard.nmi} onChange={(e) => setExtField('switchboard', 'nmi', e.target.value)} {...focusProps} /></Field>
              <Field label="Compliant?"><select style={input} value={ext.switchboard.isCompliant} onChange={(e) => setExtField('switchboard', 'isCompliant', e.target.value)} {...focusProps}><option value="">Select</option><option>Yes</option><option>No</option></select></Field>
              <Field label="Phases"><select style={input} value={ext.switchboard.phases} onChange={(e) => setExtField('switchboard', 'phases', e.target.value)} {...focusProps}><option value="">Select</option><option>Single</option><option>Two</option><option>Three</option></select></Field>
              <Field label="Bi-directional Meter"><select style={input} value={ext.switchboard.biDirectionalMeter} onChange={(e) => setExtField('switchboard', 'biDirectionalMeter', e.target.value)} {...focusProps}><option value="">Select</option><option>Yes</option><option>No</option></select></Field>
              <Field label="Asbestos Present"><select style={input} value={ext.switchboard.asbestosPresent} onChange={(e) => setExtField('switchboard', 'asbestosPresent', e.target.value)} {...focusProps}><option value="">Select</option><option>Yes</option><option>No</option></select></Field>
              <Field label="Main Switch Rating (A)"><input style={input} value={ext.switchboard.mainSwitchRatingAmps} onChange={(e) => setExtField('switchboard', 'mainSwitchRatingAmps', e.target.value)} {...focusProps} /></Field>
              <Field label="Point of Attachment"><input style={input} value={ext.switchboard.pointOfAttachment} onChange={(e) => setExtField('switchboard', 'pointOfAttachment', e.target.value)} {...focusProps} /></Field>
              <Field label="TX → POA (m)"><input style={input} value={ext.switchboard.distanceTxToPOA} onChange={(e) => setExtField('switchboard', 'distanceTxToPOA', e.target.value)} placeholder="75m" {...focusProps} /></Field>
              <Field label="POA → MSB (m)"><input style={input} value={ext.switchboard.distancePOAToMSB} onChange={(e) => setExtField('switchboard', 'distancePOAToMSB', e.target.value)} placeholder="15m" {...focusProps} /></Field>
              <Field label="Consumer Mains Cable Size"><input style={input} value={ext.switchboard.consumerMainsCableSize} onChange={(e) => setExtField('switchboard', 'consumerMainsCableSize', e.target.value)} placeholder="16mm" {...focusProps} /></Field>
              <Field label="Consumer Mains Cable Type"><select style={input} value={ext.switchboard.consumerMainsCableType} onChange={(e) => setExtField('switchboard', 'consumerMainsCableType', e.target.value)} {...focusProps}><option value="">Select</option><option>Single Core / Copper</option><option>Single Core / Aluminium</option><option>Multi Core / Copper</option><option>Multi Core / Aluminium</option></select></Field>
              <Field label="Mains Cable Run"><input style={input} value={ext.switchboard.mainsRunMethod} onChange={(e) => setExtField('switchboard', 'mainsRunMethod', e.target.value)} placeholder="Inside wall / underground" {...focusProps} /></Field>
            </div>
            <div style={grid2}>
              <Field label="Meter Photo"><UploaderBtn onClick={() => uploadPhoto({ section: 'switchboard-meter', field: 'meterPhoto' })} file={ext.switchboard.meterPhoto} /></Field>
              <Field label="Neutral & Earth Bar Photo"><UploaderBtn onClick={() => uploadPhoto({ section: 'switchboard-neutral-earth', field: 'neutralEarthPhoto' })} file={ext.switchboard.neutralEarthPhoto} /></Field>
              <Field label="Switchboard (cover ON)"><UploaderBtn onClick={() => uploadPhoto({ section: 'switchboard-on', field: 'photoSwitchboardOn' })} file={ext.switchboard.photoSwitchboardOn} /></Field>
              <Field label="Switchboard (cover OFF)"><UploaderBtn onClick={() => uploadPhoto({ section: 'switchboard-off', field: 'photoSwitchboardOff' })} file={ext.switchboard.photoSwitchboardOff} /></Field>
              <Field label="Voltage reading photos (A‑N / N‑E / P‑P)">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button type="button" onClick={() => uploadPhoto({ section: 'switchboard-voltage', field: 'voltageReadingPhotos', multi: true })} style={btn('secondary')}>Add Photo</button>
                  {(ext.switchboard.voltageReadingPhotos ?? []).map((p, i) => (
                    <a key={i} href={p.storage_url} target="_blank" rel="noreferrer" style={{ color: '#2563EB', textDecoration: 'underline', fontSize: 12 }}>
                      {p.filename}
                    </a>
                  ))}
                </div>
              </Field>
            </div>

            <h4 style={{ ...h4, marginTop: 12 }}>Sub‑Board</h4>
            <div style={grid2}>
              <Field label="MSB feeds Sub‑Board (POC)?"><select style={input} value={ext.subBoard.msbFeedsSubBoard} onChange={(e) => setExtField('subBoard', 'msbFeedsSubBoard', e.target.value)} {...focusProps}><option value="">Select</option><option>Yes</option><option>No</option></select></Field>
              <Field label="Sub‑Board / POC Photo"><UploaderBtn onClick={() => uploadPhoto({ section: 'sub-board', field: 'subBoardPOCPhoto' })} file={ext.subBoard.subBoardPOCPhoto} /></Field>
            </div>
          </section>
        )}

        {/* Step 3: Inverter Location */}
        {stepIdx === 3 && (
          <section>
            <h3 style={h3}>Inverter Location</h3>
            <div style={grid2}>
              <Field label="Inverter location photo"><UploaderBtn onClick={() => uploadPhoto({ section: 'inverter-location', field: 'locationPhoto' })} file={ext.inverterLocation.locationPhoto} /></Field>
              <Field label="Require AC Isolator?"><select style={input} value={ext.inverterLocation.requireACIsolator} onChange={(e) => setExtField('inverterLocation', 'requireACIsolator', e.target.value)} {...focusProps}><option value="">Select</option><option>Yes</option><option>No</option></select></Field>
              <Field label="Mounting Method"><input style={input} value={ext.inverterLocation.mountingMethod} onChange={(e) => setExtField('inverterLocation', 'mountingMethod', e.target.value)} placeholder="Wall mounted / structure / other" {...focusProps} /></Field>
              <Field label="Ventilation OK?"><select style={input} value={ext.inverterLocation.ventilationOK} onChange={(e) => setExtField('inverterLocation', 'ventilationOK', e.target.value)} {...focusProps}><option value="">Select</option><option>Yes</option><option>No</option></select></Field>
              <Field label="Backing Board Needed?"><select style={input} value={ext.inverterLocation.backingBoardNeeded} onChange={(e) => setExtField('inverterLocation', 'backingBoardNeeded', e.target.value)} {...focusProps}><option value="">Select</option><option>Yes</option><option>No</option></select></Field>
              <Field label="Direct Sunlight?"><select style={input} value={ext.inverterLocation.directSunlight} onChange={(e) => setExtField('inverterLocation', 'directSunlight', e.target.value)} {...focusProps}><option value="">Select</option><option>Yes</option><option>No</option></select></Field>
              <Field label="Conduit Run Discussed?"><select style={input} value={ext.inverterLocation.conduitRunDiscussed} onChange={(e) => setExtField('inverterLocation', 'conduitRunDiscussed', e.target.value)} {...focusProps}><option value="">Select</option><option>Yes</option><option>No</option></select></Field>
              <Field label="Notes"><textarea style={{ ...input, minHeight: 64 }} value={ext.inverterLocation.notes} onChange={(e) => setExtField('inverterLocation', 'notes', e.target.value)} {...focusProps} /></Field>
            </div>
          </section>
        )}

        {/* Step 4: Monitoring & Existing */}
        {stepIdx === 4 && (
          <section>
            <h3 style={h3}>Monitoring</h3>
            <div style={grid3}>
              <Field label="Wi‑Fi at Location?"><select style={input} value={ext.monitoring.wifiAtLocation} onChange={(e) => setExtField('monitoring', 'wifiAtLocation', e.target.value)} {...focusProps}><option value="">Select</option><option>Yes</option><option>No</option></select></Field>
              <Field label="Strong Reception?"><select style={input} value={ext.monitoring.strongReception} onChange={(e) => setExtField('monitoring', 'strongReception', e.target.value)} {...focusProps}><option value="">Select</option><option>Yes</option><option>No</option></select></Field>
              <Field label="Ethernet Runnable?"><select style={input} value={ext.monitoring.ethernetRunnable} onChange={(e) => setExtField('monitoring', 'ethernetRunnable', e.target.value)} {...focusProps}><option value="">Select</option><option>Yes</option><option>No</option></select></Field>
              <Field label="Spare Router Port?"><select style={input} value={ext.monitoring.spareRouterPort} onChange={(e) => setExtField('monitoring', 'spareRouterPort', e.target.value)} {...focusProps}><option value="">Select</option><option>Yes</option><option>No</option></select></Field>
              <Field label="Wi‑Fi Name"><input style={input} value={ext.monitoring.wifiName} onChange={(e) => setExtField('monitoring', 'wifiName', e.target.value)} {...focusProps} /></Field>
              <Field label="Wi‑Fi Password"><input style={input} value={ext.monitoring.wifiPassword} onChange={(e) => setExtField('monitoring', 'wifiPassword', e.target.value)} {...focusProps} /></Field>
              <Field label="Distance to Ethernet Port"><input style={input} value={ext.monitoring.distanceToEthernetPort} onChange={(e) => setExtField('monitoring', 'distanceToEthernetPort', e.target.value)} placeholder="15m" {...focusProps} /></Field>
            </div>

            <h3 style={{ ...h3, marginTop: 16 }}>Existing System</h3>
            <div style={grid2}>
              <Field label="Existing Solar?"><select style={input} value={ext.existingSystem.existingSolar} onChange={(e) => setExtField('existingSystem', 'existingSolar', e.target.value)} {...focusProps}><option value="">Select</option><option>Yes</option><option>No</option></select></Field>
              <Field label="Existing Battery?"><select style={input} value={ext.existingSystem.existingBattery} onChange={(e) => setExtField('existingSystem', 'existingBattery', e.target.value)} {...focusProps}><option value="">Select</option><option>Yes</option><option>No</option></select></Field>
            </div>
          </section>
        )}

        {/* Step 5: Roof */}
        {stepIdx === 5 && (
          <section>
            <h3 style={h3}>Roof Profile Details</h3>
            <div style={grid3}>
              <Field label="Roof Height (m)"><input style={input} value={ext.roofProfile.roofHeightMeters} onChange={(e) => setExtField('roofProfile', 'roofHeightMeters', e.target.value)} placeholder="5.2" {...focusProps} /></Field>
              <Field label="Safe Access?"><select style={input} value={ext.roofProfile.safeAccess} onChange={(e) => setExtField('roofProfile', 'safeAccess', e.target.value)} {...focusProps}><option value="">Select</option><option>Yes</option><option>No</option></select></Field>
              <Field label="Access Method"><select style={input} value={ext.roofProfile.accessMethod} onChange={(e) => setExtField('roofProfile', 'accessMethod', e.target.value)} {...focusProps}><option value="">Select</option><option>Extension Ladder</option><option>Scissor Lift</option><option>Boom Lift</option></select></Field>
              <Field label="Panel Carry Method"><select style={input} value={ext.roofProfile.panelCarryMethod} onChange={(e) => setExtField('roofProfile', 'panelCarryMethod', e.target.value)} {...focusProps}><option value="">Select</option><option>Hand Passed</option><option>Scissor Lift</option><option>Boom Lift</option><option>Crane Lift</option></select></Field>
              <Field label="Edge Protection Required?"><select style={input} value={ext.roofProfile.edgeProtectionRequired} onChange={(e) => setExtField('roofProfile', 'edgeProtectionRequired', e.target.value)} {...focusProps}><option value="">Select</option><option>Yes</option><option>No</option></select></Field>
              <Field label="Edge Protection Available?"><select style={input} value={ext.roofProfile.edgeProtectionAvailable} onChange={(e) => setExtField('roofProfile', 'edgeProtectionAvailable', e.target.value)} {...focusProps}><option value="">Select</option><option>Yes</option><option>No</option></select></Field>
              <Field label="Edge Protection (m)"><input style={input} value={ext.roofProfile.edgeProtectionMeters} onChange={(e) => setExtField('roofProfile', 'edgeProtectionMeters', e.target.value)} placeholder="20" {...focusProps} /></Field>
              <Field label="Edge Protection Photo"><UploaderBtn onClick={() => uploadPhoto({ section: 'roof-edge-protection', field: 'edgeProtectionPhoto' })} file={ext.roofProfile.edgeProtectionPhoto} /></Field>
              <Field label="Roof Type"><select style={input} value={ext.roofProfile.roofMaterial} onChange={(e) => setExtField('roofProfile', 'roofMaterial', e.target.value)} {...focusProps}><option value="">Select Roof Type</option><option>Tin Colorbond</option><option>Tin Kliplock</option><option>Tile Concrete</option><option>Tile Terracotta</option></select></Field>
              <Field label="Roof Condition OK?"><select style={input} value={ext.roofProfile.roofConditionOK} onChange={(e) => setExtField('roofProfile', 'roofConditionOK', e.target.value)} {...focusProps}><option value="">Select</option><option>Yes</option><option>No</option></select></Field>
              <Field label="Section 1 Pitch"><input style={input} value={ext.roofProfile.section1Pitch} onChange={(e) => setExtField('roofProfile', 'section1Pitch', e.target.value)} {...focusProps} /></Field>
              <Field label="Section 1 Photo"><UploaderBtn onClick={() => uploadPhoto({ section: 'roof-section1', field: 'section1Photo' })} file={ext.roofProfile.section1Photo} /></Field>
              <Field label="Section 2 Pitch"><input style={input} value={ext.roofProfile.section2Pitch} onChange={(e) => setExtField('roofProfile', 'section2Pitch', e.target.value)} {...focusProps} /></Field>
              <Field label="Section 2 Photo"><UploaderBtn onClick={() => uploadPhoto({ section: 'roof-section2', field: 'section2Photo' })} file={ext.roofProfile.section2Photo} /></Field>
              <Field label="Section 3 Pitch"><input style={input} value={ext.roofProfile.section3Pitch} onChange={(e) => setExtField('roofProfile', 'section3Pitch', e.target.value)} {...focusProps} /></Field>
              <Field label="Section 3 Photo"><UploaderBtn onClick={() => uploadPhoto({ section: 'roof-section3', field: 'section3Photo' })} file={ext.roofProfile.section3Photo} /></Field>
            </div>
          </section>
        )}

        {/* Step 6: Mud Map */}
        {stepIdx === 6 && (
          <section>
            <h3 style={h3}>Mud Map</h3>
            <div style={grid2}>
              <Field label="Mud Map Photo"><UploaderBtn onClick={() => uploadPhoto({ section: 'mud-map', field: 'mapPhoto' })} file={ext.mudMap.mapPhoto} /></Field>
              <Field label="Access Notes"><input style={input} value={ext.mudMap.accessNotes} onChange={(e) => setExtField('mudMap', 'accessNotes', e.target.value)} placeholder="POC/TX, access routes..." {...focusProps} /></Field>
            </div>
          </section>
        )}

        {/* Step 7: Final (Shading + Electrical + Recommendations) */}
        {stepIdx === 7 && (
          <section>
            <h3 style={h3}>Shading Assessment (multi‑select)</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['No significant shading', 'Partial AM', 'Partial PM', 'Heavy (trees)', 'Heavy (buildings)', 'Other'].map((opt) => {
                const active = ext.shading.sources.includes(opt);
                return (
                  <button key={opt} type="button" onClick={() => toggleExtArray('shading', 'sources', opt)}
                          style={{ ...btn('secondary'),
                            background: active ? UI.color.teal : '#fff',
                            color: active ? '#fff' : UI.color.navy,
                            borderColor: active ? UI.color.teal : UI.color.borderStrong }}>
                    {opt}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 8 }}>
              <Lbl>Other shading</Lbl>
              <input style={input} value={ext.shading.other} onChange={(e) => setExtField('shading', 'other', e.target.value)} {...focusProps} />
            </div>

            <h3 style={{ ...h3, marginTop: 16 }}>Electrical Hazards (multi‑select)</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Exposed wiring', 'Water damage', 'Overloaded circuits', 'Corrosion', 'Faulty breakers', 'Code violations', 'Poor grounding', 'Other'].map((opt) => {
                const active = ext.electrical.hazards.includes(opt);
                return (
                  <button key={opt} type="button" onClick={() => toggleExtArray('electrical', 'hazards', opt)}
                          style={{ ...btn('secondary'),
                            background: active ? UI.color.teal : '#fff',
                            color: active ? '#fff' : UI.color.navy,
                            borderColor: active ? UI.color.teal : UI.color.borderStrong }}>
                    {opt}
                  </button>
                );
              })}
            </div>
            <div style={grid2}>
              <Field label="Other hazard"><input style={input} value={ext.electrical.other} onChange={(e) => setExtField('electrical', 'other', e.target.value)} {...focusProps} /></Field>
              <Field label="Hazard notes"><input style={input} value={ext.electrical.notes} onChange={(e) => setExtField('electrical', 'notes', e.target.value)} placeholder="Mitigations / recommendations" {...focusProps} /></Field>
            </div>

            <h3 style={{ ...h3, marginTop: 16 }}>Recommendations</h3>
            <div style={grid3}>
              <Field label="Number of options">
                <select style={input} value={ext.recommendations.count}
                        onChange={(e) => {
                          const n = Math.max(0, Math.min(10, Number(e.target.value) || 0));
                          const items = (ext.recommendations.items ?? []).slice(0, n);
                          while (items.length < n) items.push('');
                          setExt((prev) => ({ ...prev, recommendations: { ...prev.recommendations, count: n, items } }));
                        }} {...focusProps}>
                  {Array.from({ length: 11 }).map((_, i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </Field>
              <Field label="Summary (optional)"><input style={input} value={ext.recommendations.summary} onChange={(e) => setExtField('recommendations', 'summary', e.target.value)} {...focusProps} /></Field>
            </div>
            {ext.recommendations.count > 0 && (
              <div style={grid2}>
                {(ext.recommendations.items ?? []).map((val, idx) => (
                  <Field key={idx} label={`Option ${idx + 1}`}>
                    <input style={input} value={val} onChange={(e) => {
                      const items = [...(ext.recommendations.items ?? [])];
                      items[idx] = e.target.value;
                      setExt((prev) => ({ ...prev, recommendations: { ...prev.recommendations, items } }));
                    }} {...focusProps} />
                  </Field>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Actions */}
        <div style={{ marginTop: 12 }}>
          <NavActions />
        </div>
      </div>

      {/* Draft documents list */}
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

      {/* Submitted documents list */}
      <div style={{ ...card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: UI.color.navy }}>Submitted documents</div>
        </div>

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
``