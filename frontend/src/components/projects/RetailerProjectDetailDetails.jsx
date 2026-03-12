// src/components/projects/RetailerProjectDetailDetails.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import './RetailerProjectDetails.css'; // Re-use old panel styles if needed, or inline

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
        <button type="button" className="lead-detail-btn secondary" onClick={() => setOpen(v => !v)}>
          {open ? 'Close list' : 'Add assignees'}
        </button>
        <button type="button" className="lead-detail-btn secondary" onClick={selectAll} disabled={users.length === 0}>Select all</button>
        <button type="button" className="lead-detail-btn secondary" onClick={clearAll} disabled={value.length === 0}>Clear</button>
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
      <div style={{ fontSize: '0.9375rem', fontWeight: '600', color: '#0F172A', minHeight: '1.5rem' }}>{value || '—'}</div>
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
  onSaveAssignees
}) {
  const [status, setStatus] = useState(project?.stage ?? '');
  const [jobType, setJobType] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [assigneeIds, setAssigneeIds] = useState([]);

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
    setJobType(s.job_type || inferJobTypeFromStage(project?.stage) || '');
    setNotes(s.notes || '');
    setAssigneeIds(Array.isArray(assignees) ? [...assignees] : []);
  }, [project, schedule, assignees]);

  if (activeTab === 'schedule') {
    const inputStyle = { width: '100%', padding: '0.65rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.95rem', color: '#0F172A', outline: 'none', transition: 'border-color 0.2s', backgroundColor: '#fff' };
    const labelStyle = { fontWeight: 700, fontSize: '0.75rem', color: '#64748B', marginBottom: '0.4rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' };

    return (
      <div className="lead-detail-form fade-in" style={{ paddingBottom: '200px' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#0d9488', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
          Manage Schedule
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Select status</option>
              {RETAILER_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Job Type</label>
            <select style={inputStyle} value={jobType} onChange={(e) => setJobType(e.target.value)}>
              <option value="">Select job type</option>
              {JOB_TYPES.map(k => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Scheduled Date</label>
            <input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Scheduled Time</label>
            <input style={inputStyle} type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={jobType !== 'site_inspection'} />
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

        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '32px' }}>
          <button 
            type="button" 
            className="lead-detail-btn primary"
            onClick={() => onSaveSchedule({ job_type: jobType, date, time: jobType === 'site_inspection' ? time : null, notes, nextStage: status })}
          >
            Save Schedule Updates
          </button>
        </div>

        <h3 style={{ margin: '0 0 16px 0', color: '#0d9488', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
          Assigned Personnel
        </h3>
        <AssigneePicker users={users} value={assigneeIds} onChange={setAssigneeIds} />
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-start' }}>
          <button 
            type="button" 
            className="lead-detail-btn secondary"
            onClick={() => onSaveAssignees(assigneeIds)}
          >
            Save Assignees
          </button>
        </div>
      </div>
    );
  }

  // Active Tab === Details (Read-only view mimicking the initial form state, user requested layout)
  // For next phase, this could be editable fields like LeadDetailDetails.
  const Icons = {
    info: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
    user: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    zap: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    home: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  };

  return (
    <div className="fade-in" style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <SectionCard title="Project Information" icon={Icons.info}>
        <KV label="Project Code" value={project.code} />
        <KV label="Category" value={project.client_type} />
        <KV label="Location URL" value={project.location_url} />
        <KV label="Client Name" value={project.client_name} />
        <KV label="Scheduled Date" value={schedule?.scheduled_date || schedule?.scheduled_at ? new Date(schedule?.scheduled_date || schedule?.scheduled_at).toLocaleDateString() : '—'} />
      </SectionCard>

      <SectionCard title="Customer Details" icon={Icons.user}>
        <KV label="Customer Name" value={project.customer_name} />
        <KV label="Email" value={project.customer_email} />
        <KV label="Phone" value={project.customer_contact} />
        <KV label="Address" value={project.address} />
      </SectionCard>

      <SectionCard title="System Specifications" icon={Icons.zap}>
        <KV label="System Type" value={project.system_type} />
        <KV label="System Size" value={project.system_size_kw != null ? `${project.system_size_kw} kW` : null} />
        <KV label="Panel Brand" value={project.panel_brand} />
        <KV label="Panel Power" value={project.panel_module_watts != null ? `${project.panel_module_watts} W` : null} />
        <KV label="Inverter Brand" value={project.inverter_brand} />
        <KV label="Inverter Size" value={project.inverter_size_kw != null ? `${project.inverter_size_kw} kW` : null} />
      </SectionCard>

      <SectionCard title="Property Characteristics" icon={Icons.home}>
        <KV label="House Storeys" value={project.house_storey} />
        <KV label="Roof Type" value={project.roof_type} />
        <KV label="Meter Phase" value={project.meter_phase} />
        <KV label="Access to 2nd Story" value={project.access_to_two_storey} />
        <KV label="Access to Inverter" value={project.access_to_inverter} />
      </SectionCard>
    </div>
  );
}
