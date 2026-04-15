// src/components/projects/RetailerProjectDetailDetails.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import './RetailerProjectDetails.css'; // Re-use old panel styles if needed, or inline
import {
  getCecMeta,
  getCecBatteryBrands,
  getCecBatteryModels,
  getCecInverterBrands,
  getCecInverterDetails,
  getCecInverterModels,
  getCecInverterSeries,
  getCecPvPanelBrands,
  getCecPvPanelDetails,
  getCecPvPanelModels,
  syncCecNow,
} from '../../services/api.js';

const JOB_TYPES = [
  { key: 'site_inspection', label: 'Site Inspection' },
  { key: 'stage_one',       label: 'Stage One' },
  { key: 'stage_two',       label: 'Stage Two' },
  { key: 'full_system',     label: 'Full System' },
];

/** Matches Lead / retailer create flows */
const SYSTEM_TYPES = [
  'PV only',
  'PV + Battery',
  'Only Battery',
  'Only EV Charger',
  'PV + Battery + EV Charger',
  'Battery + EV Charger',
  'PV + EV Chargers',
];

// Keep Property Characteristics options consistent with LeadDetailDetails.jsx
const HOUSE_STOREY_OPTS = ['Single', 'Double', 'Triple', 'Other'];
const ROOF_TYPE_OPTS = ['Tin(Colorbond)', 'Tin(Kliplock)', 'Tile(Concrete)', 'Tile(Terracotta)', 'Flat', 'Other'];
const METER_PHASE_OPTS = ['Single', 'Double', 'Three'];

function seedInHouseForm(p) {
  if (!p) return null;
  return {
    customer_name: p.customer_name || '',
    email: p.customer_email || '',
    phone: p.customer_contact || '',
    suburb: p.address || '',
    system_size_kw: p.system_size_kw ?? p.pv_system_size_kw ?? '',
    value_amount: p.lead_value_amount ?? p.value_amount ?? '',
    system_type: p.system_type || '',
    house_storey: p.house_storey || '',
    roof_type: p.roof_type || '',
    meter_phase: p.meter_phase || '',
    access_to_second_storey: p.access_to_two_storey === 'Yes',
    access_to_inverter: p.access_to_inverter === 'Yes',
    pv_system_size_kw: p.pv_system_size_kw ?? p.system_size_kw ?? '',
    pv_inverter_size_kw: p.pv_inverter_size_kw ?? p.lead_pv_inverter_size_kw ?? '',
    pv_inverter_brand: p.pv_inverter_brand || p.lead_pv_inverter_brand || '',
    pv_inverter_model: p.pv_inverter_model || p.lead_pv_inverter_model || '',
    pv_inverter_series: p.pv_inverter_series || p.lead_pv_inverter_series || '',
    pv_inverter_power_kw: p.pv_inverter_power_kw ?? p.lead_pv_inverter_power_kw ?? '',
    pv_inverter_quantity: p.pv_inverter_quantity ?? p.lead_pv_inverter_quantity ?? '',
    pv_panel_brand: p.pv_panel_brand || p.lead_pv_panel_brand || '',
    pv_panel_model: p.pv_panel_model || p.lead_pv_panel_model || '',
    pv_panel_quantity: p.pv_panel_quantity ?? p.lead_pv_panel_quantity ?? '',
    pv_panel_module_watts: p.pv_panel_module_watts ?? p.lead_pv_panel_module_watts ?? '',
    ev_charger_brand: p.ev_charger_brand || '',
    ev_charger_model: p.ev_charger_model || '',
    battery_size_kwh: p.battery_size_kwh ?? '',
    battery_brand: p.battery_brand || '',
    battery_model: p.battery_model || '',
    preApprovalRef: p.pre_approval_reference_no || '',
    energyRetailer: p.energy_retailer || '',
    energyDistributor: p.energy_distributor || '',
    solarVic:
      p.solar_vic_eligibility == null || p.solar_vic_eligibility === ''
        ? ''
        : Number(p.solar_vic_eligibility) === 1
          ? '1'
          : '0',
    nmiNumber: p.nmi_number || '',
    meterNumber: p.meter_number || '',
    postInstallRef: p.post_install_reference_no || '',
  };
}

const RETAILER_STAGES = [
  { key: 'site_inspection', label: 'Site Inspection' },
  { key: 'stage_one', label: 'Stage One' },
  { key: 'stage_two', label: 'Stage Two' },
  { key: 'full_system', label: 'Full System' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'to_be_rescheduled', label: 'To Be Rescheduled' },
  { key: 'installation_in_progress', label: 'Installation In‑Progress' },
  { key: 'installation_completed', label: 'Installation Completed' },
  { key: 'ces_certificate_applied', label: 'CES Certificate Applied' },
  { key: 'ces_certificate_received', label: 'CES Certificate Received' },
  { key: 'ces_certificate_submitted', label: 'CES Certificate Submitted' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'done', label: 'Done' },
];

function toDateStrYYYYMMDD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function toTimeStrHHmm(d) {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}
function splitScheduledAt(scheduledAt) {
  if (!scheduledAt) return { date: '', time: '' };
  if (typeof scheduledAt === 'string' && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(scheduledAt)) {
    const s = scheduledAt.replace('T', ' ');
    const [d, tFull] = s.split(' ');
    const t = (tFull || '').slice(0, 5);
    return { date: d, time: t };
  }
  const dt = (scheduledAt instanceof Date) ? scheduledAt : new Date(scheduledAt);
  if (Number.isNaN(dt.getTime())) return { date: '', time: '' };
  return { date: toDateStrYYYYMMDD(dt), time: toTimeStrHHmm(dt) };
}
function inferJobTypeFromStage(stage) {
  switch (stage) {
    case 'site_inspection': return 'site_inspection';
    case 'stage_one':       return 'stage_one';
    case 'stage_two':       return 'stage_two';
    case 'full_system':     return 'full_system';
    default:                return '';
  }
}

/* ---------- Assignee Picker (chips + checkbox list) ---------- */
function AssigneePicker({ users = [], value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const popRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (!open) return;
      if (popRef.current && !popRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return users;
    return users.filter(u => {
      const name = (u.name || '').toLowerCase();
      const ini  = (u.initials || '').toLowerCase();
      return name.includes(qq) || ini.includes(qq);
    });
  }, [q, users]);

  function toggle(id) {
    const num = Number(id);
    const has = value.some(v => Number(v) === num);
    const next = has ? value.filter(v => Number(v) !== num) : [...value, num];
    onChange?.(next);
  }
  function selectAll() {
    onChange?.(Array.from(new Set([...(value || []), ...users.map(u => u.id)])));
  }
  function clearAll() {
    onChange?.([]);
  }
  function removeChip(id) {
    onChange?.(value.filter(v => Number(v) !== Number(id)));
  }

  return (
    <div className="rpdp-assignee" style={{ position: 'relative' }}>
      <div className="rpdp-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
        {value.length === 0 ? (
          <span className="rpdp-chip-muted" style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: '0.9rem' }}>No assignee selected</span>
        ) : (
          value.map(v => {
            const u = users.find(x => String(x.id) === String(v));
            const label = u?.name || u?.initials || `#${v}`;
            return (
              <span key={v} className="rpdp-chip" style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#F1F5F9', padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '500' }}>
                <span className="rpdp-chip-avatar" style={{ marginRight: '6px', color: '#0D9488', fontWeight: 'bold' }}>{(u?.initials || label).slice(0,3).toUpperCase()}</span>
                <span className="rpdp-chip-label">{label}</span>
                <button type="button" className="rpdp-chip-x" onClick={() => removeChip(v)} aria-label={`Remove ${label}`} style={{ marginLeft: '6px', cursor: 'pointer', background: 'none', border: 'none', color: '#64748B' }}>×</button>
              </span>
            );
          })
        )}
      </div>

      <div className="rpdp-row" style={{ display: 'flex', gap: '10px' }}>
        <button type="button" className="lead-detail-btn primary" onClick={() => setOpen(v => !v)}>
          {open ? 'Close list' : 'Add assignees'}
        </button>
        <button type="button" className="lead-detail-btn primary" onClick={selectAll} disabled={users.length === 0}>Select all</button>
        <button type="button" className="lead-detail-btn primary" onClick={clearAll} disabled={value.length === 0}>Clear</button>
      </div>

      {open && (
        <div className="rpdp-assignee-pop" ref={popRef} style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', zIndex: 9999, background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)', width: '100%', maxWidth: '350px', maxHeight: '300px', display: 'flex', flexDirection: 'column' }}>
          <div className="rpdp-assignee-search" style={{ padding: '10px', borderBottom: '1px solid #F1F5F9' }}>
            <input
              type="search"
              placeholder="Search people…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', outline: 'none' }}
            />
          </div>
          <div className="rpdp-assignee-list" style={{ overflowY: 'auto', padding: '10px' }}>
            {filtered.length === 0 ? (
              <div className="rpdp-assignee-empty" style={{ padding: '10px', color: '#94A3B8', textAlign: 'center' }}>No matches</div>
            ) : filtered.map(u => {
              const checked = value.some(v => Number(v) === Number(u.id));
              return (
                <label key={u.id} className="rpdp-assignee-item" style={{ display: 'flex', alignItems: 'center', padding: '8px', gap: '10px', cursor: 'pointer', borderRadius: '4px' }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(u.id)}
                  />
                  <span className="rpdp-assignee-avatar" style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#0F172A', backgroundColor: '#F1F5F9', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>{(u.initials || u.name || '#').slice(0,3).toUpperCase()}</span>
                  <span className="rpdp-assignee-name" style={{ fontSize: '0.95rem' }}>{u.name || `#${u.id}`}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function KV({ label, value }) {
  return (
    <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
      <label className="lead-detail-label" style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>{label}</label>
      <div style={{ fontSize: '0.9375rem', fontWeight: '600', color: '#0F172A', minHeight: '1.5rem' }}>
        {value === null || value === undefined || value === '' ? '—' : String(value)}
      </div>
    </div>
  );
}

function SectionCard({ title, icon, children }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0d9488', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {icon && <span>{icon}</span>}
        {title}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px 24px' }}>
        {children}
      </div>
    </div>
  );
}

export default function RetailerProjectDetailDetails({
  project,
  schedule,
  assignees,
  users,
  activeTab,
  onSaveSchedule,
  onSaveAssignees,
  expectedCompletionDate,
  onChangeExpectedCompletionDate,
  hideJobType,
  projectStages,
  inHouseEditable,
  onSaveInHouseDetails,
  onAnnounceUtilityToCustomer,
}) {
  const [isEditingInHouse, setIsEditingInHouse] = useState(false);
  const [detailForm, setDetailForm] = useState(null);
  const [savingInHouse, setSavingInHouse] = useState(false);
  const [saveToast, setSaveToast] = useState('');
  const [editSection, setEditSection] = useState('system'); // customer | system | property | utility
  const [announcingUtility, setAnnouncingUtility] = useState(null);
  const [cecOptions, setCecOptions] = useState({
    pvPanelBrands: [],
    pvPanelModels: [],
    pvPanelModelsForBrand: '',
    inverterBrands: [],
    inverterModels: [],
    inverterModelsForBrand: '',
    inverterSeries: [],
    inverterSeriesForBrandModel: '',
    batteryBrands: [],
    batteryModels: [],
    batteryModelsForBrand: '',
    loading: false,
  });
  const [syncingCec, setSyncingCec] = useState(false);
  const [cecSyncMessage, setCecSyncMessage] = useState('');
  const [cecLastUpdatedAt, setCecLastUpdatedAt] = useState('');

  const [status, setStatus] = useState(project?.stage ?? '');
  const [jobType, setJobType] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [assigneeIds, setAssigneeIds] = useState([]);

  const showToast = useCallback((message, { isError = false } = {}) => {
    setSaveToast(message);
    window.setTimeout(() => setSaveToast(''), isError ? 3500 : 2500);
  }, []);

  const [scheduleSaveStatus, setScheduleSaveStatus] = useState(null); // { ok:boolean, msg:string } | null
  const clearInlineStatusSoon = useCallback((which) => {
    window.setTimeout(() => {
      if (which === 'schedule') setScheduleSaveStatus(null);
    }, 2500);
  }, []);

  useEffect(() => {
    const s = schedule ?? {};
    let nextDate = s.scheduled_date || '';
    let nextTime = s.scheduled_time || '';
    if (!nextDate || (!nextTime && s.scheduled_at)) {
      const split = splitScheduledAt(s.scheduled_at);
      nextDate = nextDate || split.date;
      nextTime = nextTime || split.time;
    }

    setStatus(project?.stage ?? '');
    setDate(nextDate);
    setTime(nextTime);
    // Retailer schedule API requires job_type. If none is present yet, default to full_system
    // so the user can schedule immediately without hitting a 422.
    setJobType(s.job_type || inferJobTypeFromStage(project?.stage) || 'full_system');
    setNotes(s.notes || '');
    setAssigneeIds(Array.isArray(assignees) ? [...assignees] : []);
  }, [project, schedule, assignees]);

  // If user sets a scheduled date and expected completion isn't set yet, default to +1 month.
  useEffect(() => {
    if (!date) return;
    if (!onChangeExpectedCompletionDate) return;
    if (expectedCompletionDate) return;
    try {
      const d = new Date(`${date}T00:00:00`);
      if (Number.isNaN(d.getTime())) return;
      const next = new Date(d);
      next.setMonth(next.getMonth() + 1);
      const pad = (n) => String(n).padStart(2, '0');
      const ymd = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
      onChangeExpectedCompletionDate(ymd);
    } catch {
      /* ignore */
    }
  }, [date, expectedCompletionDate, onChangeExpectedCompletionDate]);

  if (activeTab === 'schedule') {
    const inputStyle = { width: '100%', padding: '0.65rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.95rem', color: '#0F172A', outline: 'none', transition: 'border-color 0.2s', backgroundColor: '#fff' };
    const labelStyle = { fontWeight: 700, fontSize: '0.75rem', color: '#64748B', marginBottom: '0.4rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' };

    return (
      <div className="lead-detail-form fade-in" style={{ paddingBottom: '200px' }}>
        {saveToast ? (
          <div
            role="status"
            style={{
              position: 'fixed',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              background: /failed|error/i.test(saveToast) ? '#FEF2F2' : '#ECFDF5',
              color: /failed|error/i.test(saveToast) ? '#991B1B' : '#065F46',
              border: `1px solid ${/failed|error/i.test(saveToast) ? '#FECACA' : '#A7F3D0'}`,
              borderRadius: 12,
              padding: '10px 14px',
              fontWeight: 700,
              boxShadow: '0 12px 30px rgba(2,6,23,0.16)',
              maxWidth: 720,
              width: 'calc(100% - 32px)',
            }}
          >
            {saveToast}
          </div>
        ) : null}
        <h3 style={{ margin: '0 0 16px 0', color: '#0d9488', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
          Manage Schedule
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Select status</option>
              {(projectStages || RETAILER_STAGES).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          {!hideJobType && (
            <div>
              <label style={labelStyle}>Job Type</label>
              <select style={inputStyle} value={jobType} onChange={(e) => setJobType(e.target.value)}>
                <option value="">Select job type</option>
                {JOB_TYPES.map(k => <option key={k.key} value={k.key}>{k.label}</option>)}
              </select>
            </div>
          )}

          <div>
            <label style={labelStyle}>Scheduled Date</label>
            <input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Scheduled Time</label>
            <input style={inputStyle} type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={!hideJobType && jobType !== 'site_inspection'} />
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Schedule Notes</label>
          <textarea
            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes related to schedule or visit…"
          />
        </div>

        <h3 style={{ margin: '0 0 16px 0', color: '#0d9488', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
          Assigned Personnel
        </h3>
        <AssigneePicker users={users} value={assigneeIds} onChange={setAssigneeIds} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
          <button 
            type="button" 
            className="lead-detail-btn primary"
            onClick={async () => {
              try {
                await onSaveSchedule?.({
                  job_type: hideJobType ? undefined : jobType,
                  date,
                  time: hideJobType || jobType === 'site_inspection' ? time : null,
                  notes,
                  assignees: assigneeIds,
                  nextStage: status,
                });
                showToast('Saved successfully.');
                setScheduleSaveStatus({ ok: true, msg: 'Saved.' });
                clearInlineStatusSoon('schedule');
              } catch (err) {
                showToast(err?.message || 'Save failed.', { isError: true });
                setScheduleSaveStatus({ ok: false, msg: err?.message || 'Save failed.' });
                clearInlineStatusSoon('schedule');
              }
            }}
          >
            Save
          </button>
          {scheduleSaveStatus ? (
            <span
              role="status"
              aria-live="polite"
              style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color: scheduleSaveStatus.ok ? '#0f766e' : '#b91c1c',
                background: scheduleSaveStatus.ok ? '#ecfdf5' : '#fef2f2',
                border: `1px solid ${scheduleSaveStatus.ok ? '#99f6e4' : '#fecaca'}`,
                padding: '6px 10px',
                borderRadius: '999px',
              }}
            >
              {scheduleSaveStatus.msg}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  const Icons = {
    info: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
    user: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    zap: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    home: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  };

  const editMode = inHouseEditable && onSaveInHouseDetails && isEditingInHouse && detailForm;
  const sysTypeForFlags = editMode ? (detailForm?.system_type ?? '') : (project?.system_type ?? '');
  const hasPV = /PV/i.test(sysTypeForFlags);
  const hasEV = /EV/i.test(sysTypeForFlags);
  const hasBattery = /Battery/i.test(sysTypeForFlags);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!editMode) return;
      if (!hasPV && !hasBattery) return;
      setCecOptions((p) => ({ ...p, loading: true }));
      try {
        const [pvPanelBrands, inverterBrands, batteryBrands] = await Promise.all([
          hasPV ? getCecPvPanelBrands().catch(() => []) : Promise.resolve([]),
          hasPV ? getCecInverterBrands().catch(() => []) : Promise.resolve([]),
          hasBattery ? getCecBatteryBrands().catch(() => []) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setCecOptions((p) => ({
          ...p,
          pvPanelBrands: pvPanelBrands.length ? pvPanelBrands : p.pvPanelBrands,
          inverterBrands: inverterBrands.length ? inverterBrands : p.inverterBrands,
          batteryBrands: batteryBrands.length ? batteryBrands : p.batteryBrands,
          loading: false,
        }));
      } catch {
        if (cancelled) return;
        setCecOptions((p) => ({ ...p, loading: false }));
      }
    }
    run();
    return () => { cancelled = true; };
  }, [editMode, hasPV, hasBattery]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!editMode) return;
      try {
        const meta = await getCecMeta();
        if (cancelled) return;
        setCecLastUpdatedAt(meta?.data?.updatedAt || '');
      } catch {
        if (cancelled) return;
        setCecLastUpdatedAt('');
      }
    }
    run();
    return () => { cancelled = true; };
  }, [editMode]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!editMode || !hasPV) return;
      const brand = String(detailForm?.pv_panel_brand || '').trim();
      if (!brand) {
        setCecOptions((p) => ({ ...p, pvPanelModels: [], pvPanelModelsForBrand: '' }));
        return;
      }
      if (cecOptions.pvPanelModelsForBrand === brand) return;
      const models = await getCecPvPanelModels(brand).catch(() => []);
      if (cancelled) return;
      setCecOptions((p) => ({ ...p, pvPanelModels: Array.isArray(models) ? models : [], pvPanelModelsForBrand: brand }));
    }
    run();
    return () => { cancelled = true; };
  }, [editMode, hasPV, detailForm?.pv_panel_brand, cecOptions.pvPanelModelsForBrand]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!editMode || !hasPV) return;
      const brand = String(detailForm?.pv_inverter_brand || '').trim();
      if (!brand) {
        setCecOptions((p) => ({ ...p, inverterModels: [], inverterModelsForBrand: '' }));
        return;
      }
      if (cecOptions.inverterModelsForBrand === brand) return;
      const models = await getCecInverterModels(brand).catch(() => []);
      if (cancelled) return;
      setCecOptions((p) => ({ ...p, inverterModels: Array.isArray(models) ? models : [], inverterModelsForBrand: brand }));
    }
    run();
    return () => { cancelled = true; };
  }, [editMode, hasPV, detailForm?.pv_inverter_brand, cecOptions.inverterModelsForBrand]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!editMode || !hasPV) return;
      const brand = String(detailForm?.pv_inverter_brand || '').trim();
      const model = String(detailForm?.pv_inverter_model || '').trim();
      if (!brand || !model) {
        setCecOptions((p) => ({ ...p, inverterSeries: [], inverterSeriesForBrandModel: '' }));
        return;
      }
      const key = `${brand}::${model}`;
      if (cecOptions.inverterSeriesForBrandModel === key) return;
      const [seriesList, details] = await Promise.all([
        getCecInverterSeries(brand, model).catch(() => []),
        getCecInverterDetails(brand, model).catch(() => null),
      ]);
      if (cancelled) return;
      setCecOptions((p) => ({ ...p, inverterSeries: Array.isArray(seriesList) ? seriesList : [], inverterSeriesForBrandModel: key }));
      setDetailForm((f) => {
        if (!f) return f;
        const next = { ...f };
        if (!next.pv_inverter_series && details?.series) next.pv_inverter_series = details.series;
        if (!next.pv_inverter_power_kw && details?.power_kw != null) next.pv_inverter_power_kw = String(details.power_kw);
        return next;
      });
    }
    run();
    return () => { cancelled = true; };
  }, [editMode, hasPV, detailForm?.pv_inverter_brand, detailForm?.pv_inverter_model, cecOptions.inverterSeriesForBrandModel]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!editMode || !hasBattery) return;
      const brand = String(detailForm?.battery_brand || '').trim();
      if (!brand) {
        setCecOptions((p) => ({ ...p, batteryModels: [], batteryModelsForBrand: '' }));
        return;
      }
      if (cecOptions.batteryModelsForBrand === brand) return;
      const models = await getCecBatteryModels(brand).catch(() => []);
      if (cancelled) return;
      setCecOptions((p) => ({ ...p, batteryModels: Array.isArray(models) ? models : [], batteryModelsForBrand: brand }));
    }
    run();
    return () => { cancelled = true; };
  }, [editMode, hasBattery, detailForm?.battery_brand, cecOptions.batteryModelsForBrand]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!editMode || !hasPV) return;
      const brand = String(detailForm?.pv_panel_brand || '').trim();
      const model = String(detailForm?.pv_panel_model || '').trim();
      if (!brand || !model) return;
      if (String(detailForm?.pv_panel_module_watts || '').trim() !== '') return;
      const details = await getCecPvPanelDetails(brand, model).catch(() => null);
      if (cancelled) return;
      if (details?.module_watts != null) {
        setDetailForm((f) => (f ? { ...f, pv_panel_module_watts: String(details.module_watts) } : f));
      }
    }
    run();
    return () => { cancelled = true; };
  }, [editMode, hasPV, detailForm?.pv_panel_brand, detailForm?.pv_panel_model, detailForm?.pv_panel_module_watts]);

  useEffect(() => {
    if (!editMode || !hasPV || !detailForm) return;
    const qty = Number(detailForm.pv_panel_quantity);
    const watts = Number(detailForm.pv_panel_module_watts);
    if (!Number.isFinite(qty) || !Number.isFinite(watts) || qty <= 0 || watts <= 0) return;
    const nextKw = String(Number(((qty * watts) / 1000).toFixed(3)));
    if (String(detailForm.system_size_kw || '') === nextKw) return;
    setDetailForm((f) => (f ? { ...f, system_size_kw: nextKw, pv_system_size_kw: nextKw } : f));
  }, [editMode, hasPV, detailForm?.pv_panel_quantity, detailForm?.pv_panel_module_watts, detailForm?.system_size_kw]);

  useEffect(() => {
    if (!editMode || !hasPV || !detailForm) return;
    const powerKw = Number(detailForm.pv_inverter_power_kw);
    const qty = Number(detailForm.pv_inverter_quantity);
    if (!Number.isFinite(powerKw) || !Number.isFinite(qty) || powerKw <= 0 || qty <= 0) return;
    const nextKw = String(Number((powerKw * qty).toFixed(3)));
    if (String(detailForm.pv_inverter_size_kw || '') === nextKw) return;
    setDetailForm((f) => (f ? { ...f, pv_inverter_size_kw: nextKw } : f));
  }, [editMode, hasPV, detailForm?.pv_inverter_power_kw, detailForm?.pv_inverter_quantity, detailForm?.pv_inverter_size_kw]);

  const solarVicLabel =
    project?.solar_vic_eligibility === null ||
    project?.solar_vic_eligibility === undefined ||
    project?.solar_vic_eligibility === ''
      ? null
      : Number(project.solar_vic_eligibility) === 1
        ? 'Eligible'
        : 'Not eligible';

  const preApprovalAnnounced =
    Number(project?.customer_portal_pre_approval_announced) === 1
    || Number(project?.lead_customer_portal_pre_approval_announced) === 1;
  const solarVicPortalAnnounced =
    Number(project?.customer_portal_solar_vic_announced) === 1
    || Number(project?.lead_customer_portal_solar_vic_announced) === 1;
  const preApprovalValue = String(project?.pre_approval_reference_no || '').trim();
  const solarVicRawValue = project?.solar_vic_eligibility;
  const hasSolarVicValue = !(
    solarVicRawValue === null ||
    solarVicRawValue === undefined ||
    solarVicRawValue === ''
  );
  const autoAnnouncedRef = useRef({ preApproval: '', solarVic: '' });

  async function runAnnounce(type) {
    if (!onAnnounceUtilityToCustomer) return;
    setAnnouncingUtility(type);
    try {
      await onAnnounceUtilityToCustomer(type);
    } finally {
      setAnnouncingUtility(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function autoAnnounceUtility() {
      if (editMode) return;
      if (!inHouseEditable) return;
      if (!onAnnounceUtilityToCustomer) return;
      if (announcingUtility) return;

      if (
        preApprovalValue &&
        !preApprovalAnnounced &&
        autoAnnouncedRef.current.preApproval !== preApprovalValue
      ) {
        autoAnnouncedRef.current.preApproval = preApprovalValue;
        await runAnnounce('pre_approval');
        if (cancelled) return;
      }

      const solarVicKey = hasSolarVicValue ? String(solarVicRawValue) : '';
      if (
        solarVicKey &&
        !solarVicPortalAnnounced &&
        autoAnnouncedRef.current.solarVic !== solarVicKey
      ) {
        autoAnnouncedRef.current.solarVic = solarVicKey;
        await runAnnounce('solar_vic');
      }
    }

    autoAnnounceUtility();
    return () => {
      cancelled = true;
    };
  }, [
    editMode,
    inHouseEditable,
    onAnnounceUtilityToCustomer,
    announcingUtility,
    preApprovalValue,
    preApprovalAnnounced,
    hasSolarVicValue,
    solarVicRawValue,
    solarVicPortalAnnounced,
  ]);

  const inputStyle = { width: '100%', padding: '0.65rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.95rem', color: '#0F172A', outline: 'none', backgroundColor: '#fff' };
  const labelStyle = { fontWeight: 700, fontSize: '0.75rem', color: '#64748B', marginBottom: '0.4rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' };

  // Auto-sync CEC once per page load when entering edit mode.
  const didAutoSyncRef = React.useRef(false);
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!editMode) return;
      if (!hasPV && !hasBattery) return;
      if (didAutoSyncRef.current) return;
      didAutoSyncRef.current = true;

      try {
        await syncCecNow({ force: false }).catch(() => null);
      } catch {
        /* silent */
      }

      // Refresh brands + meta after background sync attempt.
      setCecOptions((p) => ({ ...p, loading: true }));
      try {
        const [pvPanelBrands, inverterBrands, batteryBrands, meta] = await Promise.all([
          hasPV ? getCecPvPanelBrands().catch(() => []) : Promise.resolve([]),
          hasPV ? getCecInverterBrands().catch(() => []) : Promise.resolve([]),
          hasBattery ? getCecBatteryBrands().catch(() => []) : Promise.resolve([]),
          getCecMeta().catch(() => null),
        ]);
        if (cancelled) return;
        setCecOptions((p) => ({
          ...p,
          pvPanelBrands: pvPanelBrands.length ? pvPanelBrands : p.pvPanelBrands,
          inverterBrands: inverterBrands.length ? inverterBrands : p.inverterBrands,
          batteryBrands: batteryBrands.length ? batteryBrands : p.batteryBrands,
          loading: false,
        }));
        setCecLastUpdatedAt(meta?.data?.updatedAt || '');
      } catch {
        if (cancelled) return;
        setCecOptions((p) => ({ ...p, loading: false }));
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [editMode, hasPV, hasBattery]);

  async function handleInHouseSaveClick() {
    if (!detailForm || !onSaveInHouseDetails) return;
    setSavingInHouse(true);
    try {
      await onSaveInHouseDetails(detailForm);
      setIsEditingInHouse(false);
      setDetailForm(null);
      setSaveToast('Saved successfully.');
      window.setTimeout(() => setSaveToast(''), 2500);
    } catch (err) {
      console.error(err);
      setSaveToast(err?.message || 'Save failed.');
      window.setTimeout(() => setSaveToast(''), 3500);
    } finally {
      setSavingInHouse(false);
    }
  }

  return (
    <div className="fade-in" style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'minmax(0, 1fr)' }}>
      {saveToast ? (
        <div
          role="status"
          style={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: /failed/i.test(saveToast) ? '#FEF2F2' : '#ECFDF5',
            color: /failed/i.test(saveToast) ? '#991B1B' : '#065F46',
            border: `1px solid ${/failed/i.test(saveToast) ? '#FECACA' : '#A7F3D0'}`,
            borderRadius: 12,
            padding: '10px 14px',
            fontWeight: 700,
            boxShadow: '0 12px 30px rgba(2,6,23,0.16)',
            maxWidth: 720,
            width: 'calc(100% - 32px)',
          }}
        >
          {saveToast}
        </div>
      ) : null}
      {inHouseEditable && onSaveInHouseDetails && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {!isEditingInHouse ? (
            <button
              type="button"
              className="lead-detail-btn secondary"
              onClick={() => {
                setDetailForm(seedInHouseForm(project));
                setIsEditingInHouse(true);
                setEditSection('system');
              }}
            >
              Edit project
            </button>
          ) : (
            <>
              <button
                type="button"
                className="lead-detail-btn secondary"
                disabled={savingInHouse}
                onClick={() => {
                  setIsEditingInHouse(false);
                  setDetailForm(null);
                }}
              >
                Cancel
              </button>
              <button type="button" className="lead-detail-btn primary" disabled={savingInHouse} onClick={handleInHouseSaveClick}>
                {savingInHouse ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>
      )}

      {/* In-house edit: keep UI simple by editing one section at a time */}
      {editMode ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: -6 }}>
          {[
            { key: 'customer', label: 'Customer' },
            { key: 'system', label: 'System' },
            { key: 'property', label: 'Property' },
            { key: 'utility', label: 'Utility' },
          ].map((t) => {
            const active = editSection === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setEditSection(t.key)}
                className="lead-detail-btn"
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: `1px solid ${active ? '#0d9488' : '#E2E8F0'}`,
                  background: active ? '#E6F4F1' : '#fff',
                  color: active ? '#0f766e' : '#334155',
                  fontWeight: 800,
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <SectionCard title="Project Information" icon={Icons.info}>
        <KV label="Project Code" value={project.code} />
        <KV label="Category" value={project.client_type} />
        <KV label="Location URL" value={project.location_url} />
        <KV label="Client Name" value={project.client_name} />
        <KV label="Scheduled Date" value={schedule?.scheduled_date || schedule?.scheduled_at ? new Date(schedule?.scheduled_date || schedule?.scheduled_at).toLocaleDateString() : '—'} />
        {expectedCompletionDate !== undefined && (
          <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
            <label className="lead-detail-label" style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
              Expected Completion
            </label>
            {onChangeExpectedCompletionDate ? (
              <input
                type="date"
                value={expectedCompletionDate || ''}
                onChange={(e) => onChangeExpectedCompletionDate(e.target.value)}
                style={{
                  padding: '6px 8px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.9rem', outline: 'none'
                }}
              />
            ) : (
              <div style={{ fontSize: '0.9375rem', fontWeight: '600', color: '#0F172A', minHeight: '1.5rem' }}>
                {expectedCompletionDate ? new Date(expectedCompletionDate).toLocaleDateString() : '—'}
              </div>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Customer Details" icon={Icons.user}>
        {editMode && editSection === 'customer' ? (
          <>
            <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Customer name</label>
              <input style={inputStyle} value={detailForm.customer_name} onChange={(e) => setDetailForm((f) => ({ ...f, customer_name: e.target.value }))} />
            </div>
            <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} type="email" value={detailForm.email} onChange={(e) => setDetailForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} value={detailForm.phone} onChange={(e) => setDetailForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Address / suburb</label>
              <input style={inputStyle} value={detailForm.suburb} onChange={(e) => setDetailForm((f) => ({ ...f, suburb: e.target.value }))} />
            </div>
            <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Estimated value (AUD)</label>
              <input style={inputStyle} type="number" step="any" min="0" value={detailForm.value_amount} onChange={(e) => setDetailForm((f) => ({ ...f, value_amount: e.target.value }))} />
            </div>
          </>
        ) : (
          <>
            <KV label="Customer Name" value={project.customer_name} />
            <KV label="Email" value={project.customer_email} />
            <KV label="Phone" value={project.customer_contact} />
            <KV label="Address" value={project.address} />
          </>
        )}
      </SectionCard>

      <SectionCard title="System Specifications" icon={Icons.zap}>
        {editMode && editSection === 'system' ? (
          <>
            <div className="lead-detail-field" style={{ gridColumn: '1 / -1', padding: '0.25rem 0 0.75rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  {cecLastUpdatedAt
                    ? `CEC last sync: ${new Date(cecLastUpdatedAt).toLocaleString()}`
                    : 'CEC last sync: pending'}
                </div>
              </div>
              {cecSyncMessage ? (
                <div style={{ fontSize: 12, color: /failed/i.test(cecSyncMessage) ? '#b91c1c' : '#065f46', marginTop: 8 }}>
                  {cecSyncMessage}
                </div>
              ) : null}
            </div>
            <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>System type</label>
              <select
                style={inputStyle}
                value={detailForm.system_type}
                onChange={(e) => setDetailForm((f) => ({ ...f, system_type: e.target.value }))}
              >
                <option value="">Select</option>
                {SYSTEM_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>System size (kW)</label>
              <input style={inputStyle} type="number" step="any" min="0" value={detailForm.system_size_kw} onChange={(e) => setDetailForm((f) => ({ ...f, system_size_kw: e.target.value }))} />
            </div>
            {hasPV && (
              <>
                <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>PV inverter size (kW)</label>
                  <input style={inputStyle} type="number" step="any" min="0" value={detailForm.pv_inverter_size_kw} onChange={(e) => setDetailForm((f) => ({ ...f, pv_inverter_size_kw: e.target.value }))} />
                </div>
                <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>PV inverter brand</label>
                  <SuggestInput
                    value={detailForm.pv_inverter_brand || ''}
                    onChange={(value) => {
                      setDetailForm((f) => {
                        if (!f) return f;
                        if ((f.pv_inverter_brand || '') === value) {
                          return { ...f, pv_inverter_brand: value };
                        }
                        return {
                          ...f,
                          pv_inverter_brand: value,
                          pv_inverter_model: '',
                          pv_inverter_series: '',
                        };
                      });
                      setCecOptions((p) => ({
                        ...p,
                        inverterModels: [],
                        inverterModelsForBrand: '',
                        inverterSeries: [],
                        inverterSeriesForBrandModel: '',
                      }));
                    }}
                    options={cecOptions.inverterBrands}
                    placeholder={cecOptions.loading ? 'Loading approved brands...' : 'Start typing'}
                  />
                </div>
                <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>PV inverter model</label>
                  <SuggestInput
                    value={detailForm.pv_inverter_model || ''}
                    onChange={(value) => {
                      setDetailForm((f) => {
                        if (!f) return f;
                        if ((f.pv_inverter_model || '') === value) {
                          return { ...f, pv_inverter_model: value };
                        }
                        return {
                          ...f,
                          pv_inverter_model: value,
                          pv_inverter_series: '',
                        };
                      });
                      setCecOptions((p) => ({
                        ...p,
                        inverterSeries: [],
                        inverterSeriesForBrandModel: '',
                      }));
                    }}
                    options={cecOptions.inverterModels}
                    placeholder={detailForm.pv_inverter_brand ? 'Start typing' : 'Select/enter inverter brand first'}
                  />
                </div>
                <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>PV inverter series</label>
                  <SuggestInput
                    value={detailForm.pv_inverter_series || ''}
                    onChange={(value) => setDetailForm((f) => ({ ...f, pv_inverter_series: value }))}
                    options={cecOptions.inverterSeries}
                    placeholder={detailForm.pv_inverter_model ? 'Start typing' : 'Select/enter inverter model first'}
                  />
                </div>
                <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>Inverter power (kW)</label>
                  <input style={inputStyle} type="number" step="any" min="0" value={detailForm.pv_inverter_power_kw || ''} onChange={(e) => setDetailForm((f) => ({ ...f, pv_inverter_power_kw: e.target.value }))} />
                </div>
                <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>Number of inverter</label>
                  <input style={inputStyle} type="number" step="1" min="0" value={detailForm.pv_inverter_quantity || ''} onChange={(e) => setDetailForm((f) => ({ ...f, pv_inverter_quantity: e.target.value }))} />
                </div>
                <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>PV panel brand</label>
                  <select
                    value={detailForm.pv_panel_brand || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDetailForm((f) => {
                        if (!f) return f;
                        if ((f.pv_panel_brand || '') === value) {
                          return { ...f, pv_panel_brand: value };
                        }
                        return {
                          ...f,
                          pv_panel_brand: value,
                          pv_panel_model: '',
                          pv_panel_module_watts: '',
                        };
                      });
                      setCecOptions((p) => ({
                        ...p,
                        pvPanelModels: [],
                        pvPanelModelsForBrand: '',
                      }));
                    }}
                    className="lead-detail-input"
                    style={inputStyle}
                  >
                    <option value="">Select</option>
                    {cecOptions.pvPanelBrands.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>PV panel model</label>
                  <select
                    value={detailForm.pv_panel_model || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDetailForm((f) => {
                        if (!f) return f;
                        if ((f.pv_panel_model || '') === value) {
                          return { ...f, pv_panel_model: value };
                        }
                        return {
                          ...f,
                          pv_panel_model: value,
                          pv_panel_module_watts: '',
                        };
                      });
                    }}
                    className="lead-detail-input"
                    style={inputStyle}
                    disabled={!detailForm.pv_panel_brand}
                  >
                    <option value="">{detailForm.pv_panel_brand ? 'Select' : 'Select panel brand first'}</option>
                    {cecOptions.pvPanelModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>Quantity of panel</label>
                  <input style={inputStyle} type="number" step="1" min="0" value={detailForm.pv_panel_quantity || ''} onChange={(e) => setDetailForm((f) => ({ ...f, pv_panel_quantity: e.target.value }))} />
                </div>
                <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>Panel module (W)</label>
                  <input style={inputStyle} type="number" step="any" min="0" value={detailForm.pv_panel_module_watts} onChange={(e) => setDetailForm((f) => ({ ...f, pv_panel_module_watts: e.target.value }))} />
                </div>
              </>
            )}
            {hasEV && (
              <>
                <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>EV charger brand</label>
                  <input style={inputStyle} value={detailForm.ev_charger_brand} onChange={(e) => setDetailForm((f) => ({ ...f, ev_charger_brand: e.target.value }))} />
                </div>
                <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>EV charger model</label>
                  <input style={inputStyle} value={detailForm.ev_charger_model} onChange={(e) => setDetailForm((f) => ({ ...f, ev_charger_model: e.target.value }))} />
                </div>
              </>
            )}
            {hasBattery && (
              <>
                <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>Battery size (kWh)</label>
                  <input style={inputStyle} type="number" step="any" min="0" value={detailForm.battery_size_kwh} onChange={(e) => setDetailForm((f) => ({ ...f, battery_size_kwh: e.target.value }))} />
                </div>
                <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>Battery brand</label>
                  <SuggestInput
                    value={detailForm.battery_brand || ''}
                    onChange={(value) => {
                      setDetailForm((f) => {
                        if (!f) return f;
                        if ((f.battery_brand || '') === value) {
                          return { ...f, battery_brand: value };
                        }
                        return {
                          ...f,
                          battery_brand: value,
                          battery_model: '',
                        };
                      });
                      setCecOptions((p) => ({
                        ...p,
                        batteryModels: [],
                        batteryModelsForBrand: '',
                      }));
                    }}
                    options={cecOptions.batteryBrands}
                    placeholder={cecOptions.loading ? 'Loading approved brands...' : 'Start typing'}
                  />
                </div>
                <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>Battery model</label>
                  <SuggestInput
                    value={detailForm.battery_model || ''}
                    onChange={(value) => setDetailForm((f) => ({ ...f, battery_model: value }))}
                    options={cecOptions.batteryModels}
                    placeholder={detailForm.battery_brand ? 'Start typing' : 'Select/enter battery brand first'}
                  />
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <KV label="System Type" value={project.system_type} />
            {hasPV && (
              <>
                <KV
                  label="System Size"
                  value={project.pv_system_size_kw != null ? `${project.pv_system_size_kw} kW` : project.system_size_kw != null ? `${project.system_size_kw} kW` : null}
                />
                <KV
                  label="Inverter Size"
                  value={project.pv_inverter_size_kw != null ? `${project.pv_inverter_size_kw} kW` : null}
                />
                <KV label="PV Inverter Brand" value={project.pv_inverter_brand || project.lead_pv_inverter_brand} />
                <KV label="PV Inverter Model" value={project.pv_inverter_model || project.lead_pv_inverter_model} />
                <KV label="PV Inverter Series" value={project.pv_inverter_series || project.lead_pv_inverter_series} />
                <KV label="Inverter Power (kW)" value={(project.pv_inverter_power_kw ?? project.lead_pv_inverter_power_kw) != null ? `${project.pv_inverter_power_kw ?? project.lead_pv_inverter_power_kw} kW` : null} />
                <KV label="Number of Inverter" value={(project.pv_inverter_quantity ?? project.lead_pv_inverter_quantity) != null ? String(project.pv_inverter_quantity ?? project.lead_pv_inverter_quantity) : null} />
                <KV label="PV Panel Brand" value={project.pv_panel_brand || project.lead_pv_panel_brand} />
                <KV label="PV Panel Model" value={project.pv_panel_model || project.lead_pv_panel_model} />
                <KV label="Quantity of Panel" value={(project.pv_panel_quantity ?? project.lead_pv_panel_quantity) != null ? String(project.pv_panel_quantity ?? project.lead_pv_panel_quantity) : null} />
                <KV
                  label="Panel Power"
                  value={(project.pv_panel_module_watts ?? project.lead_pv_panel_module_watts) != null ? `${project.pv_panel_module_watts ?? project.lead_pv_panel_module_watts} W` : null}
                />
              </>
            )}

            {hasEV && (
              <>
                <KV label="EV Charger Brand" value={project.ev_charger_brand} />
                <KV label="EV Charger Model" value={project.ev_charger_model} />
              </>
            )}

            {hasBattery && (
              <>
                <KV
                  label="Battery Size"
                  value={project.battery_size_kwh != null ? `${project.battery_size_kwh} kWh` : null}
                />
                <KV label="Battery Brand" value={project.battery_brand} />
                <KV label="Battery Model" value={project.battery_model} />
              </>
            )}
          </>
        )}
      </SectionCard>
      <SectionCard title="Property Characteristics" icon={Icons.home}>
        {editMode && editSection === 'property' ? (
          <>
            <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>House storeys</label>
              <select
                style={inputStyle}
                value={detailForm.house_storey || ''}
                onChange={(e) => setDetailForm((f) => ({ ...f, house_storey: e.target.value }))}
              >
                <option value="">Select</option>
                {HOUSE_STOREY_OPTS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Roof type</label>
              <select
                style={inputStyle}
                value={detailForm.roof_type || ''}
                onChange={(e) => setDetailForm((f) => ({ ...f, roof_type: e.target.value }))}
              >
                <option value="">Select</option>
                {ROOF_TYPE_OPTS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Meter phase</label>
              <select
                style={inputStyle}
                value={detailForm.meter_phase || ''}
                onChange={(e) => setDetailForm((f) => ({ ...f, meter_phase: e.target.value }))}
              >
                <option value="">Select</option>
                {METER_PHASE_OPTS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Access to 2nd Story</label>
              <select
                style={inputStyle}
                value={detailForm.access_to_second_storey == null ? '' : detailForm.access_to_second_storey ? '1' : '0'}
                onChange={(e) =>
                  setDetailForm((f) => ({
                    ...f,
                    access_to_second_storey: e.target.value === '' ? null : e.target.value === '1',
                  }))
                }
              >
                <option value="">Select</option>
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </div>
            <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Access to inverter</label>
              <select
                style={inputStyle}
                value={detailForm.access_to_inverter == null ? '' : detailForm.access_to_inverter ? '1' : '0'}
                onChange={(e) =>
                  setDetailForm((f) => ({
                    ...f,
                    access_to_inverter: e.target.value === '' ? null : e.target.value === '1',
                  }))
                }
              >
                <option value="">Select</option>
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </div>
          </>
        ) : (
          <>
            {/* Keep view-mode consistent with edit-mode seeds (in-house uses lead_* fallbacks). */}
            <KV label="House Storeys" value={project.house_storey || project.lead_house_storey} />
            <KV label="Roof Type" value={project.roof_type || project.lead_roof_type} />
            <KV label="Meter Phase" value={project.meter_phase || project.lead_meter_phase} />
            <KV
              label="Access to 2nd Story"
              value={
                project.access_to_two_storey ||
                (project.lead_access_to_second_storey == null
                  ? null
                  : project.lead_access_to_second_storey
                    ? 'Yes'
                    : 'No')
              }
            />
            <KV
              label="Access to Inverter"
              value={
                project.access_to_inverter ||
                (project.lead_access_to_inverter == null
                  ? null
                  : project.lead_access_to_inverter
                    ? 'Yes'
                    : 'No')
              }
            />
          </>
        )}
      </SectionCard>

      <SectionCard title="Utility Information" icon={Icons.info}>
        {editMode && inHouseEditable && editSection === 'utility' ? (
          <>
            <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Pre-approval reference number</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  style={{ ...inputStyle, flex: '1 1 200px', minWidth: 0, maxWidth: '100%' }}
                  value={detailForm.preApprovalRef}
                  onChange={(e) => setDetailForm((f) => ({ ...f, preApprovalRef: e.target.value }))}
                />
              </div>
            </div>
            <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Energy retailer</label>
              <input style={inputStyle} value={detailForm.energyRetailer} onChange={(e) => setDetailForm((f) => ({ ...f, energyRetailer: e.target.value }))} />
            </div>
            <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Energy distributor</label>
              <input style={inputStyle} value={detailForm.energyDistributor} onChange={(e) => setDetailForm((f) => ({ ...f, energyDistributor: e.target.value }))} />
            </div>
            <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Solar Victoria eligibility</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  style={{ ...inputStyle, flex: '1 1 180px', minWidth: 0, maxWidth: '100%' }}
                  value={detailForm.solarVic}
                  onChange={(e) => setDetailForm((f) => ({ ...f, solarVic: e.target.value }))}
                >
                  <option value="">Select</option>
                  <option value="1">Eligible</option>
                  <option value="0">Not eligible</option>
                </select>
              </div>
            </div>
            <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>NMI number</label>
              <input style={inputStyle} value={detailForm.nmiNumber} onChange={(e) => setDetailForm((f) => ({ ...f, nmiNumber: e.target.value }))} />
            </div>
            <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Meter number</label>
              <input style={inputStyle} value={detailForm.meterNumber} onChange={(e) => setDetailForm((f) => ({ ...f, meterNumber: e.target.value }))} />
            </div>
            <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Post-install reference number</label>
              <input style={inputStyle} value={detailForm.postInstallRef} onChange={(e) => setDetailForm((f) => ({ ...f, postInstallRef: e.target.value }))} />
            </div>
          </>
        ) : (
          <>
            <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={labelStyle}>Pre-Approval Reference Number</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.95rem', color: '#0F172A' }}>{project.pre_approval_reference_no || '—'}</span>
                {announcingUtility === 'pre_approval' ? (
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f766e' }}>Updating customer portal…</span>
                ) : null}
                {preApprovalAnnounced ? (
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#059669' }}>Shared on customer portal</span>
                ) : null}
              </div>
            </div>
            <KV label="Energy Retailer" value={project.energy_retailer} />
            <KV label="Energy Distributor" value={project.energy_distributor} />
            <div className="lead-detail-field" style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={labelStyle}>Solar Victoria Eligibility</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.95rem', color: '#0F172A' }}>{solarVicLabel ?? '—'}</span>
                {announcingUtility === 'solar_vic' ? (
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f766e' }}>Updating customer portal…</span>
                ) : null}
                {solarVicPortalAnnounced ? (
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#059669' }}>Shared on customer portal</span>
                ) : null}
              </div>
            </div>
            <KV label="NMI Number" value={project.nmi_number} />
            <KV label="Meter Number" value={project.meter_number} />
            <KV label="Post-install Reference Number" value={project.post_install_reference_no} />
          </>
        )}
      </SectionCard>
    </div>
  );
}

function SuggestInput({ value, onChange, options = [], placeholder = 'Start typing' }) {
  const [open, setOpen] = useState(false);
  const query = String(value || '').trim().toLowerCase();
  const matches = useMemo(() => {
    const all = Array.isArray(options) ? options : [];
    if (!query) return all.slice(0, 40);
    return all.filter((item) => String(item).toLowerCase().includes(query)).slice(0, 40);
  }, [options, query]);

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 140)}
        style={suggestInputStyle}
        placeholder={placeholder}
      />
      {open && matches.length > 0 ? (
        <div style={suggestMenuStyle}>
          {matches.map((option) => {
            const text = String(option);
            return (
              <button
                key={text}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(text);
                  setOpen(false);
                }}
                style={suggestItemStyle}
                title={text}
              >
                {text}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

const suggestInputStyle = {
  width: '100%',
  padding: '0.65rem',
  border: '1px solid #CBD5E1',
  borderRadius: '8px',
  fontSize: '0.95rem',
  color: '#0F172A',
  outline: 'none',
  backgroundColor: '#fff',
};

const suggestMenuStyle = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: 0,
  right: 0,
  zIndex: 40,
  background: '#fff',
  border: '1px solid #CBD5E1',
  borderRadius: '10px',
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.14)',
  maxHeight: 240,
  overflowY: 'auto',
  padding: 4,
};

const suggestItemStyle = {
  width: '100%',
  textAlign: 'left',
  background: 'transparent',
  border: 'none',
  borderRadius: 8,
  padding: '8px 10px',
  color: '#0f172a',
  cursor: 'pointer',
  fontSize: 13,
};
