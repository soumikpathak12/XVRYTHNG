import React, { useMemo, useState, useEffect } from 'react';
import './project-details.css';
import { getProjectScheduleAssign } from '../../services/api.js';

const PROJECT_STAGES = [
  'new',
  'scheduled',
  'to_be_rescheduled',
  'installation_in_progress',
  'installation_completed',
  'ces_certificate_applied',
  'ces_certificate_received',
  'grid_connection_initiated',
  'grid_connection_completed',
  'system_handover',
];

const PROJECT_STAGE_LABELS = {
  new: 'New',
  scheduled: 'Scheduled',
  to_be_rescheduled: 'To be rescheduled',
  installation_in_progress: 'Installation in progress',
  installation_completed: 'Installation completed',
  ces_certificate_applied: 'CES certificate applied',
  ces_certificate_received: 'CES certificate received',
  grid_connection_initiated: 'GRID connection initiated',
  grid_connection_completed: 'GRID connection completed',
  system_handover: 'System handover',
  pre_approval: 'Pre-approval',
  state_rebate: 'State rebate',
  design_engineering: 'Design & engineering',
  procurement: 'Procurement',
  compliance_check: 'Compliance check',
  inspection_grid_connection: 'Inspection & grid connection',
  rebate_stc_claims: 'Rebate & STC claims',
  project_completed: 'Project completed',
};


function LabelValue({ label, children }) {
  return (
    <div className="pdet__lv">
      <div className="pdet__lvLabel">{label}</div>
      <div className="pdet__lvValue">{children ?? '—'}</div>
    </div>
  );
}


/** Convert a Date to "YYYY-MM-DD" */
function toYMD(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Convert a Date to "hh:mm AM/PM" */
function to12h(d) {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Parse various scheduled_at shapes into { date: 'YYYY-MM-DD', time: 'hh:mm AM/PM' } */
function splitDateTimeToForm(scheduledAt) {
  if (!scheduledAt) return { date: '', time: '' };
  // Accept "YYYY-MM-DD HH:MM:SS", ISO, or Date
  let dt;
  if (scheduledAt instanceof Date) {
    dt = scheduledAt;
  } else if (typeof scheduledAt === 'string') {
    // Normalize "YYYY-MM-DD HH:MM:SS" to ISO-ish so Date() can parse locally
    const isoish = scheduledAt.includes('T') ? scheduledAt : scheduledAt.replace(' ', 'T');
    const tmp = new Date(isoish);
    if (!Number.isNaN(tmp.getTime())) dt = tmp;
  }
  if (!dt) return { date: '', time: '' };
  return { date: toYMD(dt), time: to12h(dt) };
}

/**
 * Fixed time slots shown in the "Time" select.
 * You can customize these to match your business hours.
 */
const TIME_SLOTS = [
  '08:00 AM','08:30 AM','09:00 AM','09:30 AM','10:00 AM','10:30 AM',
  '11:00 AM','11:30 AM','12:00 PM','12:30 PM','01:00 PM','01:30 PM',
  '02:00 PM','02:30 PM','03:00 PM','03:30 PM','04:00 PM','04:30 PM',
];

/**
 * Utility to format currency without external deps
 */
function formatMoney(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  try {
    return `$${Number(amount).toLocaleString()}`;
  } catch {
    return `$${amount}`;
  }
}

/**
 * ProjectDetailsPanel
 * - Shows project/customer/system/inspection info
 * - Lets user pick status/date/time
 * - Lets user assign multiple employees (chips)
 * - Calls onSaveSchedule({ id, status, date, time, assignees, notes })
 */
export default function ProjectDetailsPanel({
  visible,
  project,
  inspection,         // Row from lead_site_inspections (camelized in BE; FE still guards snake_case)
  onClose,
  onSaveSchedule,
  onAssign,
  users = [],         // [{ id, name, initials }]
}) {
  // Form local states
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');     // yyyy-mm-dd
  const [time, setTime] = useState('');     // "hh:mm AM/PM"
  const [notes, setNotes] = useState('');   // optional notes to store in schedule
  const [assignees, setAssignees] = useState([]); // number[] of employee ids
  const [saving, setSaving] = useState(false);

  /**
   * Reset the panel state each time it becomes visible for a new project
   */
useEffect(() => {
  if (visible) {
    // Default status to current project stage (from _raw.stage or stage)
    setStatus(project?._raw?.stage ?? project?.stage ?? '');
    setDate('');
    setTime('');
    setNotes('');
    setAssignees([]);
    setSaving(false);
  }
}, [visible, project?.id, project?.stage]);
useEffect(() => {
  let ignore = false;

  async function loadExisting() {
    if (!visible || !project?.id) return;
    try {
      const resp = await getProjectScheduleAssign(project.id);
      // Accept {success, data:{schedule, assignees}} or {schedule, assignees}
      const payload = resp?.data ?? resp ?? {};
      const schedule = payload.schedule ?? null;
      const assigned = Array.isArray(payload.assignees) ? payload.assignees : [];

      if (ignore) return;

      // 1) Pre-fill status: prefer schedule.status, otherwise keep project stage default
      if (schedule?.status) {
        setStatus(String(schedule.status));
      }

      // 2) Pre-fill date & time from schedule.scheduled_at
      if (schedule?.scheduled_at) {
        const { date: d, time: t } = splitDateTimeToForm(schedule.scheduled_at);
        setDate(d || '');
        setTime(t || '');
      }

      // 3) Pre-fill notes
      if (typeof schedule?.notes === 'string') {
        setNotes(schedule.notes);
      }

      // 4) Pre-fill assignees (dedupe + coerce to number)
      if (assigned.length) {
        const ids = Array.from(new Set(assigned.map(Number).filter(Boolean)));
        setAssignees(ids);
        // If you want to notify parent immediately (optional):
        onAssign?.({ id: project?.id, assignees: ids });
      }
    } catch (err) {
      // Silent fail is fine; user can still create a new schedule
      // console.error('[DEBUG] loadExisting schedule error:', err);
    }
  }

  loadExisting();
  return () => { ignore = true; };
}, [visible, project?.id]);
  /**
   * Derive all display fields (merge camelCase & snake_case to be safe)
   */
  const fields = useMemo(() => {
    const r = inspection ?? {};

    // Read both camel & snake to be bulletproof
    const roofType = r.roofType ?? r.roof_type ?? null;
    const houseStorey = r.houseStorey ?? r.house_storey ?? null;
    const meterPhase = r.meterPhase ?? r.meter_phase ?? null;
    const inspectorName = r.inspectorName ?? r.inspector_name ?? null;
    const inverterLocation = r.inverterLocation ?? r.inverter_location ?? null;
    const msbCondition = r.msbCondition ?? r.msb_condition ?? null;
    const shading = r.shading ?? r.shading ?? null;

    // Convert inspected_at to date if present
    const inspected = (r.inspectedAt ?? r.inspected_at)
      ? new Date(r.inspectedAt ?? r.inspected_at)
      : null;

    // Project/customer convenience reads (with fallbacks)
    const customerName = project?.customerName ?? project?._raw?.customer_name ?? '—';
    const email = project?._raw?.lead_email ?? project?._raw?.email ?? '—';
    const phone = project?._raw?.lead_phone ?? project?._raw?.phone ?? '—';
    const address = project?._raw?.address ?? project?._raw?.lead_suburb ?? project?.address ?? '—';
    const price = project?._raw?.value_amount ?? project?.value ?? null;

    return {
      // Project info
      projectCode: project?._raw?.project_code ?? '—',
      projectName: project?._raw?.project_name ?? '—',
      category: project?._raw?.category ?? '—',
      location: project?._raw?.map_location ?? '—',
      clientType: project?._raw?.client_type ?? '—',
      clientName: customerName,
      price,
      scheduledDate: inspected ? inspected.toISOString().slice(0, 10) : null,

      // Customer
      customerName,
      email,
      phone,
      address,

      // System (basic summary—adjust as needed)
      systemType: project?._raw?.system_type ?? project?._raw?.lead_system_type ?? '—',
      systemKw: project?._raw?.system_size_kw ?? project?._raw?.lead_system_size_kw ?? null,
      panelBrand: null,
      panelWatt: null,
      inverterBrand: null,
      inverterKw: null,

      // Property from inspection
      houseStorey,
      roofType,
      meterPhase,
      access2nd: project?._raw?.access_to_second_storey ?? null,
      accessInverter: project?._raw?.access_to_inverter ?? null,
      inspectorName,
      inverterLocation,
      msbCondition,
      shading,
      status: r.status ?? null,
      additionalNotes: r.additionalNotes ?? r.additional_notes ?? null,
    };
  }, [inspection, project]);

  // Basic guard
  if (!visible) return null;

  /**
   * Handler to add an assignee from the dropdown
   */
  function handleAddAssignee(e) {
    const value = e.target.value;
    if (!value) return;
    setAssignees(prev => {
      const id = Number(value);
      if (prev.some(a => Number(a) === id)) return prev;
      const next = [...prev, id];
      onAssign?.({ id: project?.id, assignees: next });
      return next;
    });
  }

  /**
   * Handler to remove a selected assignee (chip ×)
   */
  function handleRemoveAssignee(id) {
    setAssignees(prev => {
      const next = prev.filter(a => Number(a) !== Number(id));
      onAssign?.({ id: project?.id, assignees: next });
      return next;
    });
  }

  /**
   * Validate and call onSaveSchedule with all required fields
   */
  async function handleSave() {
    // Minimal validation: require project.id and status/date/time
    if (!project?.id) return;
    if (!status) {
      alert('Please select a status.');
      return;
    }
    if (!date) {
      alert('Please select a date.');
      return;
    }
    if (!time) {
      alert('Please select a time.');
      return;
    }

    try {
      setSaving(true);
      await onSaveSchedule?.({
        id: project.id,
        status,
        date,        // yyyy-mm-dd
        time,        // e.g. "08:30 AM"
        assignees,   // number[]
      
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pdet__backdrop" role="dialog" aria-modal="true" aria-label="Project details">
      <div className="pdet__modal">
        {/* Header */}
        <div className="pdet__header">
          <div className="pdet__title">
            {project?.customerName ?? project?._raw?.customer_name ?? 'Project'}
          </div>
          <button type="button" className="pdet__close" onClick={onClose} aria-label="Close">×</button>
        </div>

     {/* Status / Schedule / Assign */}
<div className="pdet__section">
  <div className="pdet__sectionTitle">Status</div>

  <div className="pdet__grid pdet__grid--2">
    <LabelValue label="Select status">
      <select
        className="pdet__control"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        aria-label="Select status"
      >
        <option value="">Select status</option>
        <option value="scheduled">Scheduled</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
      </select>
    </LabelValue>

    <div />

    <LabelValue label="Date">
      <input
        className="pdet__control"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        aria-label="Select date"
      />
    </LabelValue>

    <LabelValue label="Time">
      <select
        className="pdet__control"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        aria-label="Select time"
      >
        <option value="">Select time</option>
        {TIME_SLOTS.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </LabelValue>

   

    <div className="pdet__actions">
      <button
        type="button"
        className="pdet__btn"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving…' : 'Save schedule'}
      </button>
    </div>

    <LabelValue label="Assignee">
      <div className="pdet__assignees">
        {/* Assignee dropdown populated from `users` prop */}
        <select
          className="pdet__control"
          value=""
          onChange={handleAddAssignee}
          aria-label="Select assignees"
        >
          <option value="">Select assignees</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.name ?? u.initials ?? u.id}
            </option>
          ))}
        </select>

        {/* Chips for selected assignees */}
        {assignees?.length > 0 && (
          <div className="pdet__chips">
            {assignees.map(a => {
              const emp = users.find(u => String(u.id) === String(a));
              const label = emp?.initials || emp?.name || a;
              return (
                <span key={a} className="pdet__chip">
                  {label}
                  <button
                    type="button"
                    className="pdet__chipClose"
                    onClick={() => handleRemoveAssignee(a)}
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <div className="pdet__hint">
          Use the dropdown to add multiple assignees. Click × on a chip to remove.
        </div>
      </div>
    </LabelValue>
  </div>
</div>

        {/* Project Information */}
        <div className="pdet__section">
          <div className="pdet__sectionTitle">Project Information</div>
          <div className="pdet__grid pdet__grid--2">
            <LabelValue label="Project Code">{fields.projectCode ?? '—'}</LabelValue>
            <LabelValue label="Project Name">{fields.projectName ?? '—'}</LabelValue>
            <LabelValue label="Category">{fields.category ?? '—'}</LabelValue>
            <LabelValue label="Location (Google Maps)">{fields.location ?? '—'}</LabelValue>
            <LabelValue label="Client Type">{fields.clientType ?? '—'}</LabelValue>
            <LabelValue label="Client Name">{fields.clientName ?? '—'}</LabelValue>
            <LabelValue label="Price (AUD)">{formatMoney(fields.price)}</LabelValue>
            <LabelValue label="Cost (expenses)">
              {project?._raw?.approved_expense_total != null
                ? formatMoney(project._raw.approved_expense_total)
                : '—'}
            </LabelValue>
            <LabelValue label="Scheduled Date">
              {fields.scheduledDate ? String(fields.scheduledDate) : '—'}
            </LabelValue>
          </div>
        </div>

        {/* Customer Information */}
        <div className="pdet__section">
          <div className="pdet__sectionTitle">Customer Information</div>
          <div className="pdet__grid pdet__grid--2">
            <LabelValue label="Customer Name">{fields.customerName ?? '—'}</LabelValue>
            <LabelValue label="Email">{fields.email ?? '—'}</LabelValue>
            <LabelValue label="Phone">{fields.phone ?? '—'}</LabelValue>
            <LabelValue label="Address">{fields.address ?? '—'}</LabelValue>
          </div>
        </div>

        {/* System Information */}
        <div className="pdet__section">
          <div className="pdet__sectionTitle">System Information</div>
          <div className="pdet__grid pdet__grid--2">
            <LabelValue label="System Type">{fields.systemType ?? '—'}</LabelValue>
            <LabelValue label="System Size (kW)">
              {fields.systemKw != null ? String(fields.systemKw) : '—'}
            </LabelValue>
            <LabelValue label="Panel Brand">{fields.panelBrand ?? '—'}</LabelValue>
            <LabelValue label="Panel Module (Watt)">
              {fields.panelWatt != null ? String(fields.panelWatt) : '—'}
            </LabelValue>
            <LabelValue label="Inverter Brand">{fields.inverterBrand ?? '—'}</LabelValue>
            <LabelValue label="Inverter Size (kW)">
              {fields.inverterKw != null ? String(fields.inverterKw) : '—'}
            </LabelValue>
          </div>
        </div>

        {/* Property / Inspection */}
        <div className="pdet__section">
          <div className="pdet__sectionTitle">Property Information</div>
          <div className="pdet__grid pdet__grid--2">
            <LabelValue label="House Storey">{fields.houseStorey ?? '—'}</LabelValue>
            <LabelValue label="Roof Type">{fields.roofType ?? '—'}</LabelValue>
            <LabelValue label="Meter Phase">{fields.meterPhase ?? '—'}</LabelValue>
            <LabelValue label="Access to 2nd Storey">
              {fields.access2nd == null ? '—' : fields.access2nd ? 'Yes' : 'No'}
            </LabelValue>
            <LabelValue label="Access to Inverter">
              {fields.accessInverter == null ? '—' : fields.accessInverter ? 'Yes' : 'No'}
            </LabelValue>
            <LabelValue label="Inspector">{fields.inspectorName ?? '—'}</LabelValue>
            <LabelValue label="Inverter Location">{fields.inverterLocation ?? '—'}</LabelValue>
            <LabelValue label="MSB Condition">{fields.msbCondition ?? '—'}</LabelValue>
            <LabelValue label="Shading">{fields.shading ?? '—'}</LabelValue>
            <LabelValue label="Additional Notes">
              {fields.additionalNotes ? (
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                  {typeof fields.additionalNotes === 'string'
                    ? fields.additionalNotes
                    : JSON.stringify(fields.additionalNotes, null, 2)}
                </pre>
              ) : '—'}
            </LabelValue>
            <LabelValue label="Inspection Status">
              {inspection?.status ?? '—'}
            </LabelValue>
          </div>
        </div>
      </div>
    </div>
  );
}