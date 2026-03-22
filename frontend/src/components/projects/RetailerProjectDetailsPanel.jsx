// src/components/projects/RetailerProjectDetailsPanel.jsx
// Retailer Project details (centered modal):
// - Prefills schedule (job_type, date, time, notes) in "YYYY-MM-DD" / "HH:mm"
// - Time editable & required only if job_type === 'site_inspection'
// - Assignee picker: chips + checkbox list with search/select all/clear
// - Brand-color toasts for success/error (persist even when parent props refresh)
// - FIX: Do not clear toast when parent updates schedule/assignees after saving.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './RetailerProjectDetails.css';

/* ---- Job types and stages ---- */
const JOB_TYPES = [
  { key: 'site_inspection', label: 'Site Inspection' },
  { key: 'stage_one',       label: 'Stage One' },
  { key: 'stage_two',       label: 'Stage Two' },
  { key: 'full_system',     label: 'Full System' },
];

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

/* ---- Helpers to split scheduled_at safely for HTML date/time inputs ---- */
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
  // "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DDTHH:mm:ss(.sss)(Z)"
  if (typeof scheduledAt === 'string' && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(scheduledAt)) {
    const s = scheduledAt.replace('T', ' ');
    const [d, tFull] = s.split(' ');
    const t = (tFull || '').slice(0, 5); // "HH:mm"
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
function fmtAUD(v) {
  if (v == null || v === '') return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(Number(v));
  } catch { return String(v); }
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
    <div className="rpdp-assignee">
      <div className="rpdp-chips">
        {value.length === 0 ? (
          <span className="rpdp-chip-muted">No assignee selected</span>
        ) : (
          value.map(v => {
            const u = users.find(x => String(x.id) === String(v));
            const label = u?.name || u?.initials || `#${v}`;
            return (
              <span key={v} className="rpdp-chip">
                <span className="rpdp-chip-avatar">{(u?.initials || label).slice(0,3).toUpperCase()}</span>
                <span className="rpdp-chip-label">{label}</span>
                <button type="button" className="rpdp-chip-x" onClick={() => removeChip(v)} aria-label={`Remove ${label}`}>×</button>
              </span>
            );
          })
        )}
      </div>

      <div className="rpdp-row">
        <button type="button" className="rpdp-secondary" onClick={() => setOpen(v => !v)}>
          {open ? 'Close list' : 'Add assignees'}
        </button>
        <button type="button" className="rpdp-tertiary" onClick={selectAll} disabled={users.length === 0}>Select all</button>
        <button type="button" className="rpdp-tertiary" onClick={clearAll} disabled={value.length === 0}>Clear</button>
      </div>

      {open && (
        <div className="rpdp-assignee-pop" ref={popRef}>
          <div className="rpdp-assignee-search">
            <input
              type="search"
              placeholder="Search people…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="rpdp-assignee-list">
            {filtered.length === 0 ? (
              <div className="rpdp-assignee-empty">No matches</div>
            ) : filtered.map(u => {
              const checked = value.some(v => Number(v) === Number(u.id));
              return (
                <label key={u.id} className="rpdp-assignee-item">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(u.id)}
                  />
                  <span className="rpdp-assignee-avatar">{(u.initials || u.name || '#').slice(0,3).toUpperCase()}</span>
                  <span className="rpdp-assignee-name">{u.name || `#${u.id}`}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
      <small className="rpdp-hint">Use checkboxes to pick multiple, or the buttons to select/clear quickly.</small>
    </div>
  );
}

/* ---------- Main Panel ---------- */
export default function RetailerProjectDetailsPanel({
  visible,
  project,            // normalized project object
  schedule,           // { scheduled_at?, scheduled_date?, scheduled_time?, job_type?, notes? } (optional)
  users = [],         // [{ id, name, initials }]
  assignees = [],     // preload assignees as array of ids
  onClose,
  onSaveSchedule,     // ({ id, job_type, date, time?, notes?, assignees?, nextStage? }) => Promise
  onUpdateStage,      // (id, nextStage) => Promise (optional)
  onAssign,           // ({ id, assignees }) => Promise (optional)
}) {
  const [status, setStatus] = useState(project?.stage ?? '');
  const [jobType, setJobType] = useState('');
  const [date, setDate] = useState('');   // YYYY-MM-DD
  const [time, setTime] = useState('');   // HH:mm (24h)
  const [notes, setNotes] = useState('');
  const [assigneeIds, setAssigneeIds] = useState([]); // number[]

  const [saving, setSaving] = useState(false);
  /** toast = { type: 'success'|'error'|'info'|'warn', message: string } | null */
  const [toast, setToast] = useState(null);

  const requiresTime = jobType === 'site_inspection';
  const mountedRef = useRef(false);
  const lastProjectIdRef = useRef(null);

  // Reset form ONLY when opening (visible true) or project.id changes.
  useEffect(() => {
    if (!visible) {
      mountedRef.current = false;
      return;
    }

    // If newly opened or switched to a different project
    const switchingProject = lastProjectIdRef.current !== project?.id;
    if (!mountedRef.current || switchingProject) {
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
      setJobType(s.job_type || inferJobTypeFromStage(project?.stage) || '');
      setNotes(s.notes || '');

      if (Array.isArray(assignees) && assignees.length >= 0) {
        setAssigneeIds(assignees.map(Number));
      } else if (Array.isArray(project?.assignees)) {
        setAssigneeIds(project.assignees.map(a => a.id).filter(Boolean));
      } else {
        setAssigneeIds([]);
      }

      setSaving(false);
      setToast(null);                 // <-- only clear toast on OPEN or when project changes
      mountedRef.current = true;
      lastProjectIdRef.current = project?.id ?? null;
    }
    // IMPORTANT: do not include schedule/assignees in deps to avoid clearing toast
  }, [visible, project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const projectInfo = useMemo(() => ({
    code: project?.code ?? '—',
    name: project?._raw?.project_name || project?.customerName || '—',
    category: 'retailer',
    location_url: project?._raw?.location_url ?? '—',
    client_type: project?._raw?.client_type ?? '—',
    client_name: project?._raw?.client_name ?? '—',
    price: project?.value ?? project?._raw?.value_amount ?? null,
  }), [project]);

  async function handleSaveSchedule() {
    if (!project?.id) return;
    try {
      if (!jobType) throw new Error('Please select a job type');
      if (!date) throw new Error('Please select a date');
      if (jobType === 'site_inspection' && !time) throw new Error('Time is required for Site Inspection');

      setSaving(true);
      await onSaveSchedule?.({
        id: project.id,
        job_type: jobType,
        date,
        time: jobType === 'site_inspection' ? time : null,
        notes,
        assignees: assigneeIds,
        nextStage: status || null,
      });

      setToast({ type: 'success', message: 'Schedule saved successfully' });
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to save schedule' });
      setTimeout(() => setToast(null), 2800);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAssignees() {
    if (!project?.id) return;
    try {
      await onAssign?.({ id: project.id, assignees: assigneeIds });
      setToast({ type: 'success', message: 'Assignees saved successfully' });
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to update assignees' });
      setTimeout(() => setToast(null), 2800);
    }
  }

  if (!visible || typeof document === 'undefined') return null;

  return createPortal(
    <div className="rpdp-overlay" onClick={() => onClose?.()} role="dialog" aria-modal="true" aria-labelledby="rpdp-title">
      <div className="rpdp-card" onClick={(e) => e.stopPropagation()} role="document">
        {/* Header */}
        <div className="rpdp-header">
          <h2 id="rpdp-title">Project Details</h2>
          <div className="rpdp-header-actions">
            <button className="rpdp-close" aria-label="Close" onClick={() => onClose?.()}>×</button>
          </div>
        </div>

        {/* Body */}
        <div className="rpdp-body">
          {/* Toast/Alert area */}
          <div className="rpdp-toastbar" aria-live="polite">
            {toast && (
              <div
                className={
                  `rpdp-alert ${
                    toast.type === 'success' ? 'rpdp-alert--success' :
                    toast.type === 'error'   ? 'rpdp-alert--error'   :
                    toast.type === 'warn'    ? 'rpdp-alert--warn'    :
                                                'rpdp-alert--info'
                  }`
                }
                role="status"
              >
                {toast.message}
              </div>
            )}
          </div>

          {/* Status + Schedule + Assignees */}
          <div className="rpdp-block">
            <div className="rpdp-form-2col">
              {/* Status */}
              <label className="rpdp-field">
                <span className="rpdp-label">Status</span>
                <select className="rpdp-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">Select status</option>
                  {RETAILER_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </label>

              {/* Job Type */}
              <label className="rpdp-field">
                <span className="rpdp-label">Job Type</span>
                <select className="rpdp-input" value={jobType} onChange={(e) => setJobType(e.target.value)}>
                  <option value="">Select job type</option>
                  {JOB_TYPES.map(k => <option key={k.key} value={k.key}>{k.label}</option>)}
                </select>
              </label>

              {/* Date */}
              <label className="rpdp-field">
                <span className="rpdp-label">Date</span>
                <input className="rpdp-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>

              {/* Time (enabled only for Site Inspection) */}
              <label className="rpdp-field">
                <span className="rpdp-label">Time</span>
                <input
                  className="rpdp-input"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={jobType !== 'site_inspection'}
                />
              </label>
            </div>

            <div className="rpdp-row">
              <button className="rpdp-primary" disabled={saving} onClick={handleSaveSchedule}>
                {saving ? 'Saving…' : 'Save schedule'}
              </button>
            </div>

            {/* Assignees */}
            <div className="rpdp-form-1col">
              <span className="rpdp-label">Assignees</span>
              <AssigneePicker users={users} value={assigneeIds} onChange={setAssigneeIds} />
              <div className="rpdp-row">
                <button className="rpdp-secondary" onClick={handleSaveAssignees}>Save assignees</button>
              </div>
            </div>
          </div>

          {/* Project Information */}
          <div className="rpdp-section">
            <div className="rpdp-section-title">Project Information</div>
            <div className="rpdp-kv-grid">
              <KV label="Project Code" value={projectInfo.code} />
              <KV label="Project Name" value={projectInfo.name} />
              <KV label="Category" value={projectInfo.category} />
              <KV label="Location (Google Maps)" value={projectInfo.location_url} />
              <KV label="Client Type" value={projectInfo.client_type} />
              <KV label="Client Name" value={projectInfo.client_name} />
              <KV label="Price (AUD)" value={fmtAUD(projectInfo.price)} />
              <KV
                label="Cost (expenses)"
                value={fmtAUD(
                  project?._raw?.approved_expense_total ?? project?.approved_expense_total
                )}
              />
              <KV label="Scheduled Date" value={date || '—'} />
            </div>
          </div>

          {/* Customer Information */}
          <div className="rpdp-section">
            <div className="rpdp-section-title">Customer Information</div>
            <div className="rpdp-kv-grid">
              <KV label="Customer Name" value={project?.customerName ?? project?._raw?.customer_name ?? '—'} />
              <KV label="Email" value={project?._raw?.customer_email ?? '—'} />
              <KV label="Phone" value={project?._raw?.customer_contact ?? '—'} />
              <KV label="Address" value={project?.address ?? '—'} />
            </div>
          </div>

          {/* System Information */}
          <div className="rpdp-section">
            <div className="rpdp-section-title">System Information</div>
            <div className="rpdp-kv-grid">
              <KV label="System Type" value={project?._raw?.system_type ?? '—'} />
              <KV label="System Size (kW)" value={project?._raw?.system_size_kw ?? '—'} />
              <KV label="Panel Brand" value={project?._raw?.panel_brand ?? '—'} />
              <KV label="Panel Module (Watts)" value={project?._raw?.panel_module_watts ?? '—'} />
              <KV label="Inverter Brand" value={project?._raw?.inverter_brand ?? '—'} />
              <KV label="Inverter Size (kW)" value={project?._raw?.inverter_size_kw ?? '—'} />
            </div>
          </div>

          {/* Property Information */}
          <div className="rpdp-section">
            <div className="rpdp-section-title">Property Information</div>
            <div className="rpdp-kv-grid">
              <KV label="House Storey" value={project?._raw?.house_storey ?? '—'} />
              <KV label="Roof Type" value={project?._raw?.roof_type ?? '—'} />
              <KV label="Meter Phase" value={project?._raw?.meter_phase ?? '—'} />
              <KV label="Access to 2nd Story" value={project?._raw?.access_to_two_storey ?? '—'} />
              <KV label="Access to Inverter" value={project?._raw?.access_to_inverter ?? '—'} />
            </div>
          </div>

          {/* Notes */}
          <div className="rpdp-section">
            <div className="rpdp-section-title">Notes</div>
            <textarea
              className="rpdp-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes related to schedule or visit…"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="rpdp-footer">
          <button className="rpdp-outline" onClick={() => onClose?.()}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function KV({ label, value }) {
  return (
    <div className="rpdp-kv">
      <div className="rpdp-kv-label">{label}</div>
      <div className="rpdp-kv-value">{value ?? '—'}</div>
    </div>
  );
}