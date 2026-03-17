// src/components/projects/RetailerProjectCreatePanel.jsx
// Centered modal for scheduling/creating a Retailer Project.
// - Inline CSS only (no external stylesheet required)
// - Job Type-driven validation: Site Inspection → requires date & time; others → date only
// - Job Type → Stage mapping so the new card appears in the correct Kanban column

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Job types & mapping to Kanban stages
const JOB_TYPES = [
  { key: 'site_inspection', label: 'Site Inspection' },
  { key: 'stage_one', label: 'Stage One' },
  { key: 'stage_two', label: 'Stage Two' },
  { key: 'full_system', label: 'Full System' },
];
const JOB_TYPE_TO_STAGE = {
  site_inspection: 'site_inspection',
  stage_one: 'stage_one',
  stage_two: 'stage_two',
  full_system: 'full_system',
};

// Option lists for selects (adjust freely)
const CLIENT_TYPES = ['Residential', 'Commercial', 'Government', 'Other'];
const SYSTEM_TYPES = ['Solar PV', 'Battery', 'Hybrid', 'EV Charger', 'Other'];
const HOUSE_STOREYS = ['Single', 'Double', 'Triple+'];
const ROOF_TYPES = ['Tile', 'Metal (Colorbond)', 'Concrete', 'Other'];
const METER_PHASES = ['Single Phase', 'Two Phase', 'Three Phase'];
const ACCESS_OPTIONS = ['Yes', 'No', 'Unknown'];

export default function RetailerProjectCreatePanel({ visible, onClose, onCreate }) {
  // ---- Core state ----
  const [jobType, setJobType] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [clientType, setClientType] = useState('');
  const [clientName, setClientName] = useState('');
  const [priceAud, setPriceAud] = useState('');

  const [systemType, setSystemType] = useState('');
  const [systemSizeKw, setSystemSizeKw] = useState('');
  const [houseStorey, setHouseStorey] = useState('');
  const [roofType, setRoofType] = useState('');
  const [meterPhase, setMeterPhase] = useState('');
  const [accessTo2Storey, setAccessTo2Storey] = useState('');
  const [accessToInverter, setAccessToInverter] = useState('');

  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Focus & dialog refs
  const firstFieldRef = useRef(null);
  const dialogRef = useRef(null);

  // ----- Helpers -----
  const requiresTime = jobType === 'site_inspection';
  const canSave = useMemo(() => {
    if (!customerName.trim() || !jobType || !date) return false;
    if (requiresTime && !time) return false;
    return !saving;
  }, [customerName, jobType, date, time, requiresTime, saving]);

  // Reset when opening
  useEffect(() => {
    if (!visible) return;
    setJobType('');
    setDate('');
    setTime('');
    setCustomerName('');
    setCustomerEmail('');
    setCustomerContact('');
    setCustomerAddress('');
    setLocationUrl('');
    setClientType('');
    setClientName('');
    setPriceAud('');
    setSystemType('');
    setSystemSizeKw('');
    setHouseStorey('');
    setRoofType('');
    setMeterPhase('');
    setAccessTo2Storey('');
    setAccessToInverter('');
    setNotes('');
    setSaving(false);
    setError('');
    setTimeout(() => firstFieldRef.current?.focus(), 0);
  }, [visible]);

  // Lock body scroll while open
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev || ''; };
  }, [visible]);

  // Escape + simple focus trap
  useEffect(() => {
    if (!visible) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [visible, onClose]);

  // Inline style system
  const s = {
    overlay: {
      position: 'fixed', inset: 0, zIndex: 2300,
      background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    },
    card: {
      width: 920, maxWidth: '96vw', maxHeight: '86vh',
      display: 'flex', flexDirection: 'column',
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
      boxShadow: '0 24px 64px rgba(15,23,42,0.35)', overflow: 'hidden',
      transform: 'translateY(6px)',
    },
    header: {
      position: 'sticky', top: 0, zIndex: 1,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 10, padding: '14px 18px', background: '#fff', borderBottom: '1px solid #e5e7eb',
    },
    title: { margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' },
    close: {
      border: 'none', background: '#f1f5f9', color: '#0f172a',
      width: 28, height: 28, borderRadius: 8, cursor: 'pointer',
    },
    body: {
      padding: 18, overflow: 'auto', display: 'grid', gap: 14, background: '#fff',
    },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    grid2Compact: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'end' },
    group: { border: '1px solid #cbd5e1', borderRadius: 12, padding: 12 },
    groupTitle: { fontWeight: 700, color: '#0f172a', marginBottom: 10 },
    field: { display: 'flex', flexDirection: 'column', gap: 6 },
    label: { fontWeight: 600, color: '#0f172a', fontSize: 13 },
    input: {
      border: '1.5px solid #14b8a6', borderRadius: 12, padding: '10px 12px',
      fontSize: 14, color: '#0f172a', outline: 'none',
    },
    select: {
      border: '1.5px solid #14b8a6', borderRadius: 12, padding: '10px 12px',
      fontSize: 14, color: '#0f172a', outline: 'none', background: '#fff',
    },
    textarea: {
      border: '1.5px solid #14b8a6', borderRadius: 12, padding: '10px 12px',
      fontSize: 14, color: '#0f172a', outline: 'none', resize: 'vertical', minHeight: 84,
    },
    footer: {
      display: 'flex', justifyContent: 'flex-end', gap: 12,
      padding: '12px 18px', background: '#fff', borderTop: '1px solid #e5e7eb',
    },
    cancelBtn: {
      background: '#fff', border: '1px solid #e2e8f0', color: '#0f172a',
      padding: '10px 14px', borderRadius: 10, fontWeight: 600, cursor: 'pointer',
    },
    saveBtn: {
      background: '#0d9488', border: '1px solid #0d9488', color: '#fff',
      padding: '10px 14px', borderRadius: 10, fontWeight: 700, cursor: 'pointer',
    },
    rowGap: { display: 'grid', gap: 12 },
    hint: { fontSize: 12, color: '#64748b' },
  };

  // Create handler (builds payload for backend)
  async function handleCreate() {
    try {
      setSaving(true); setError('');
      const stage = JOB_TYPE_TO_STAGE[jobType] || 'new';
      const payload = {
        customer_name: customerName.trim(),
        job_type: jobType,
        scheduled_date: date || null,
        scheduled_time: requiresTime ? time || null : null,
        stage, // server also validates this
        // Extended fields
        customer_email: customerEmail || null,
        customer_contact: customerContact || null,
        address: customerAddress || null,
        suburb: null,
        location_url: locationUrl || null,
        client_type: clientType || null,
        client_name: clientName || null,
        value_amount: priceAud ? Number(priceAud) : null,
        system_type: systemType || null,
        system_size_kw: systemSizeKw ? Number(systemSizeKw) : null,
        house_storey: houseStorey || null,
        roof_type: roofType || null,
        meter_phase: meterPhase || null,
        access_to_two_storey: accessTo2Storey || null,
        access_to_inverter: accessToInverter || null,
        notes: notes || null,
      };
      await onCreate?.(payload);
    } catch (err) {
      setError(err.message || 'Failed to create retailer project');
      setSaving(false);
      return;
    }
    setSaving(false);
    onClose?.();
  }

  if (!visible || typeof document === 'undefined') return null;

  return createPortal(
    <div style={s.overlay} role="dialog" aria-modal="true" aria-labelledby="create-retailer-project-title" onClick={() => onClose?.()}>
      <div ref={dialogRef} style={s.card} role="document" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={s.header}>
          <h2 id="create-retailer-project-title" style={s.title}>Schedule New Project</h2>
          <button type="button" style={s.close} onClick={() => onClose?.()} aria-label="Close">×</button>
        </div>

        {/* Body */}
        <div style={s.body}>
          {error && (
            <div style={{ padding: 10, borderRadius: 10, background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e' }}>
              {error}
            </div>
          )}

          {/* Row 1: Project Code (readonly hint) + Job Type */}
          <div style={s.grid2}>
            <label style={s.field}>
              <span style={s.label}>Project Code</span>
              <input style={s.input} placeholder="Will be auto-generated (e.g. PRJ-22)" disabled />
              <small style={s.hint}>The code is generated after creation.</small>
            </label>

            <label style={s.field}>
              <span style={s.label}>Job Type *</span>
              <select style={s.select} value={jobType} onChange={(e) => setJobType(e.target.value)}>
                <option value="">Select job type</option>
                {JOB_TYPES.map(j => <option key={j.key} value={j.key}>{j.label}</option>)}
              </select>
            </label>
          </div>

          {/* Row 2: Schedule section placed IMMEDIATELY under Job Type */}
          <div style={requiresTime ? s.grid2Compact : s.rowGap}>
            <label style={s.field}>
              <span style={s.label}>Schedule Date *</span>
              <input style={s.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            {requiresTime && (
              <label style={s.field}>
                <span style={s.label}>Schedule Time *</span>
                <input style={s.input} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </label>
            )}
          </div>

          {/* Row 3: Customer Name + Email */}
          <div style={s.grid2}>
            <label style={s.field}>
              <span style={s.label}>Customer Name *</span>
              <input ref={firstFieldRef} style={s.input} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter customer name" />
            </label>
            <label style={s.field}>
              <span style={s.label}>Customer Email</span>
              <input style={s.input} type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="Enter customer email" />
            </label>
          </div>

          {/* Row 4: Contact + Address */}
          <div style={s.grid2}>
            <label style={s.field}>
              <span style={s.label}>Customer Contact</span>
              <input style={s.input} value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} placeholder="Enter contact number" />
            </label>
            <label style={s.field}>
              <span style={s.label}>Customer Address</span>
              <input style={s.input} value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Enter address" />
            </label>
          </div>

          {/* Row 5: Location URL + Client Type */}
          <div style={s.grid2}>
            <label style={s.field}>
              <span style={s.label}>Location (Google Maps)</span>
              <input style={s.input} value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)} placeholder="Paste Google Maps link or add" />
            </label>
            <label style={s.field}>
              <span style={s.label}>Client Type</span>
              <select style={s.select} value={clientType} onChange={(e) => setClientType(e.target.value)}>
                <option value="">Select client type</option>
                {CLIENT_TYPES.map(sv => <option key={sv} value={sv}>{sv}</option>)}
              </select>
            </label>
          </div>

          {/* Row 6: Client Name + Price */}
          <div style={s.grid2}>
            <label style={s.field}>
              <span style={s.label}>Client Name</span>
              <input style={s.input} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Enter client name" />
            </label>
            <label style={s.field}>
              <span style={s.label}>Price (AUD)</span>
              <input style={s.input} type="number" min="0" step="0.01" value={priceAud} onChange={(e) => setPriceAud(e.target.value)} placeholder="e.g., 8500" />
            </label>
          </div>

          {/* Row 7: System Type */}
          <label style={s.field}>
            <span style={s.label}>System Type</span>
            <select style={s.select} value={systemType} onChange={(e) => setSystemType(e.target.value)}>
              <option value="">Select system type</option>
              {SYSTEM_TYPES.map(sv => <option key={sv} value={sv}>{sv}</option>)}
            </select>
          </label>

          {/* Row 8: System Size + (empty slot reserved to keep rhythm) */}
          <div style={s.grid2}>
            <label style={s.field}>
              <span style={s.label}>System Size (kW)</span>
              <input style={s.input} type="number" min="0" step="0.01" value={systemSizeKw} onChange={(e) => setSystemSizeKw(e.target.value)} />
            </label>
            <div />
          </div>

          {/* Property Information */}
          <div style={s.group}>
            <div style={s.groupTitle}>Property Information</div>

            <div style={s.grid2}>
              <label style={s.field}>
                <span style={s.label}>House Storey</span>
                <select style={s.select} value={houseStorey} onChange={(e) => setHouseStorey(e.target.value)}>
                  <option value="">Select</option>
                  {HOUSE_STOREYS.map(sv => <option key={sv} value={sv}>{sv}</option>)}
                </select>
              </label>

              <label style={s.field}>
                <span style={s.label}>Roof Type</span>
                <select style={s.select} value={roofType} onChange={(e) => setRoofType(e.target.value)}>
                  <option value="">Select</option>
                  {ROOF_TYPES.map(sv => <option key={sv} value={sv}>{sv}</option>)}
                </select>
              </label>
            </div>

            <div style={s.grid2}>
              <label style={s.field}>
                <span style={s.label}>Meter Phase</span>
                <select style={s.select} value={meterPhase} onChange={(e) => setMeterPhase(e.target.value)}>
                  <option value="">Select</option>
                  {METER_PHASES.map(sv => <option key={sv} value={sv}>{sv}</option>)}
                </select>
              </label>

              <label style={s.field}>
                <span style={s.label}>Access to 2 Storey</span>
                <select style={s.select} value={accessTo2Storey} onChange={(e) => setAccessTo2Storey(e.target.value)}>
                  <option value="">Select</option>
                  {ACCESS_OPTIONS.map(sv => <option key={sv} value={sv}>{sv}</option>)}
                </select>
              </label>
            </div>

            <label style={s.field}>
              <span style={s.label}>Access to Inverter</span>
              <select style={s.select} value={accessToInverter} onChange={(e) => setAccessToInverter(e.target.value)}>
                <option value="">Select</option>
                {ACCESS_OPTIONS.map(sv => <option key={sv} value={sv}>{sv}</option>)}
              </select>
            </label>
          </div>

          {/* Notes */}
          <label style={s.field}>
            <span style={s.label}>Notes</span>
            <textarea style={s.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any additional notes" />
          </label>
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <button type="button" style={s.cancelBtn} onClick={() => onClose?.()}>Cancel</button>
          <button type="button" style={{ ...s.saveBtn, opacity: canSave ? 1 : 0.6, cursor: canSave ? 'pointer' : 'not-allowed' }} disabled={!canSave} onClick={handleCreate}>
            {saving ? 'Creating…' : '+ Create Project'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}