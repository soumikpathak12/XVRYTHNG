/**
 * Create Installation Job — slide-over panel
 *
 * Props:
 *   open       {boolean}   – controls visibility
 *   onClose    {function}  – called when panel closes (no save)
 *   onCreated  {function}  – called with the new job object after successful save
 */
import { useEffect, useRef, useState } from 'react';
import { X, Loader2, User, MapPin, Zap, CalendarDays, Users, FileText, ChevronDown, Check } from 'lucide-react';
import { createInstallationJob, listEmployees } from '../../services/api.js';

// ─── brand tokens ─────────────────────────────────────────────────────────────
const BRAND      = '#146b6b';
const BRAND_DARK = '#0f5555';
const BRAND_BG   = '#E6F4F1';

// ─────────────────────────────────────────────────────────────────────────────
// Small shared atoms
// ─────────────────────────────────────────────────────────────────────────────
function FieldWrap({ label, required, children, hint }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}{required && <span style={{ color: '#EF4444', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', required, style }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '10px 12px',
        border: '1px solid #D1D5DB', borderRadius: 10,
        fontSize: 14, outline: 'none',
        background: '#fff',
        fontFamily: 'inherit',
        ...style,
      }}
      onFocus={e  => e.target.style.borderColor = BRAND}
      onBlur={e   => e.target.style.borderColor = '#D1D5DB'}
    />
  );
}

function Select({ value, onChange, children, style }) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={onChange}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '10px 34px 10px 12px',
          border: '1px solid #D1D5DB', borderRadius: 10,
          fontSize: 14, outline: 'none', background: '#fff',
          appearance: 'none', cursor: 'pointer',
          fontFamily: 'inherit',
          ...style,
        }}
        onFocus={e => e.target.style.borderColor = BRAND}
        onBlur={e  => e.target.style.borderColor = '#D1D5DB'}
      >
        {children}
      </select>
      <ChevronDown size={14} color="#9CA3AF" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    </div>
  );
}

function SectionHeader({ icon: Icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0 6px', borderBottom: '2px solid #F3F4F6', marginBottom: 14 }}>
      <Icon size={16} color={BRAND} />
      <span style={{ fontWeight: 800, fontSize: 13, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Assignee multi-select picker
// ─────────────────────────────────────────────────────────────────────────────
function AssigneePicker({ selected, onChange }) {
  const [employees, setEmployees] = useState([]);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(false);
  const [open,      setOpen]      = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    listEmployees({ limit: 200 })
      .then(res => setEmployees(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setEmployees([]))
      .finally(() => setLoading(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = employees.filter(e => {
    const name = `${e.first_name ?? ''} ${e.last_name ?? ''}`.toLowerCase();
    const role = (e.job_role_name ?? e.role_name ?? '').toLowerCase();
    const q    = search.toLowerCase();
    return !q || name.includes(q) || role.includes(q);
  });

  const toggle = (id) => {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };

  const selectedEmployees = employees.filter(e => selected.includes(e.id));

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          minHeight: 42, padding: '8px 12px', border: `1px solid ${open ? BRAND : '#D1D5DB'}`,
          borderRadius: 10, background: '#fff', cursor: 'pointer',
          display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center',
        }}
      >
        {selectedEmployees.length === 0 && (
          <span style={{ fontSize: 14, color: '#9CA3AF' }}>Select team members…</span>
        )}
        {selectedEmployees.map(e => (
          <span key={e.id} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 20,
            background: BRAND_BG, color: BRAND, fontSize: 12, fontWeight: 700,
          }}>
            {e.first_name} {e.last_name}
            <button
              type="button"
              onClick={ev => { ev.stopPropagation(); toggle(e.id); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: BRAND, padding: 0, lineHeight: 1 }}
            >×</button>
          </span>
        ))}
        <ChevronDown size={14} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4,
          maxHeight: 240, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: 8, borderBottom: '1px solid #F3F4F6' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search employees…"
              autoFocus
              style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading && <div style={{ padding: 12, fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>Loading…</div>}
            {!loading && filtered.length === 0 && <div style={{ padding: 12, fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>No employees found</div>}
            {filtered.map(e => {
              const isSelected = selected.includes(e.id);
              return (
                <div
                  key={e.id}
                  onClick={() => toggle(e.id)}
                  style={{
                    padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    background: isSelected ? BRAND_BG : '#fff',
                  }}
                  onMouseEnter={ev => { if (!isSelected) ev.currentTarget.style.background = '#F9FAFB'; }}
                  onMouseLeave={ev => { ev.currentTarget.style.background = isSelected ? BRAND_BG : '#fff'; }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: BRAND_BG, color: BRAND,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800,
                  }}>
                    {(e.first_name?.[0] ?? '?')}{(e.last_name?.[0] ?? '')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{e.first_name} {e.last_name}</div>
                    {(e.job_role_name ?? e.role_name) && <div style={{ fontSize: 11, color: '#9CA3AF' }}>{e.job_role_name ?? e.role_name}</div>}
                  </div>
                  {isSelected && <Check size={15} color={BRAND} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main modal
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_TYPES = ['Solar Only', 'Solar + Battery', 'Solar + EV Charger', 'Solar + Battery + EV', 'Battery Only', 'Other'];

const EMPTY_FORM = {
  // Customer
  customer_name:    '',
  customer_phone:   '',
  customer_email:   '',
  // Address
  address:          '',
  suburb:           '',
  // System
  system_size_kw:   '',
  system_type:      '',
  panel_count:      '',
  inverter_model:   '',
  battery_included: false,
  // Schedule
  scheduled_date:   '',
  scheduled_time:   '',
  estimated_hours:  '',
  // Notes
  notes:            '',
};

export default function CreateInstallationJobModal({ open, onClose, onCreated }) {
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [assignees,  setAssignees]  = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [errors,     setErrors]     = useState({});
  const panelRef = useRef(null);

  // Reset form each time the modal opens
  useEffect(() => {
    if (open) { setForm(EMPTY_FORM); setAssignees([]); setErrors({}); }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.customer_name.trim()) errs.customer_name = 'Customer name is required';
    if (!form.scheduled_date)       errs.scheduled_date = 'Scheduled date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        customer_name:    form.customer_name.trim(),
        customer_phone:   form.customer_phone.trim() || null,
        customer_email:   form.customer_email.trim() || null,
        address:          form.address.trim() || null,
        suburb:           form.suburb.trim() || null,
        system_size_kw:   form.system_size_kw   ? Number(form.system_size_kw)   : null,
        system_type:      form.system_type       || null,
        panel_count:      form.panel_count       ? Number(form.panel_count)       : null,
        inverter_model:   form.inverter_model.trim() || null,
        battery_included: form.battery_included ? 1 : 0,
        scheduled_date:   form.scheduled_date,
        scheduled_time:   form.scheduled_time    || null,
        estimated_hours:  form.estimated_hours   ? Number(form.estimated_hours)   : null,
        notes:            form.notes.trim()      || null,
        assignee_ids:     assignees,
      };
      const res = await createInstallationJob(payload);
      if (!res?.success) throw new Error(res?.message ?? 'Failed to create job');
      onCreated?.(res.data);
      onClose();
    } catch (err) {
      setErrors({ _form: err.message ?? 'Failed to create job' });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
      />

      {/* Slide-over panel */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 401,
          width: '100%', maxWidth: 540,
          background: '#F9FAFB',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.14)',
          display: 'flex', flexDirection: 'column',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          animation: 'slideInRight 0.22s ease-out',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px 16px',
          background: '#fff', borderBottom: '1px solid #E5E7EB',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: BRAND_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 16 }}>🔧</span>
              </div>
              New Installation Job
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>Fill in the details below to create a job card</div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid #E5E7EB', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="#6B7280" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 22 }}>

          {errors._form && (
            <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, color: '#EF4444', fontSize: 13, fontWeight: 600 }}>
              {errors._form}
            </div>
          )}

          {/* ── Customer ── */}
          <div>
            <SectionHeader icon={User} title="Customer" />
            <div style={{ display: 'grid', gap: 12 }}>
              <FieldWrap label="Customer Name" required>
                <Input value={form.customer_name} onChange={set('customer_name')} placeholder="Full name" required style={errors.customer_name ? { borderColor: '#EF4444' } : {}} />
                {errors.customer_name && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 3 }}>{errors.customer_name}</div>}
              </FieldWrap>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <FieldWrap label="Phone">
                  <Input value={form.customer_phone} onChange={set('customer_phone')} placeholder="04xx xxx xxx" type="tel" />
                </FieldWrap>
                <FieldWrap label="Email">
                  <Input value={form.customer_email} onChange={set('customer_email')} placeholder="email@example.com" type="email" />
                </FieldWrap>
              </div>
            </div>
          </div>

          {/* ── Address ── */}
          <div>
            <SectionHeader icon={MapPin} title="Address" />
            <div style={{ display: 'grid', gap: 10 }}>
              <FieldWrap label="Street Address">
                <Input value={form.address} onChange={set('address')} placeholder="e.g. 42 Solar Street" />
              </FieldWrap>
              <FieldWrap label="Suburb">
                <Input value={form.suburb} onChange={set('suburb')} placeholder="e.g. Sunshine" />
              </FieldWrap>
            </div>
          </div>

          {/* ── System Specs ── */}
          <div>
            <SectionHeader icon={Zap} title="System Specs" />
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <FieldWrap label="System Size (kW)">
                  <Input value={form.system_size_kw} onChange={set('system_size_kw')} placeholder="e.g. 6.6" type="number" style={{ textAlign: 'right' }} />
                </FieldWrap>
                <FieldWrap label="Panel Count">
                  <Input value={form.panel_count} onChange={set('panel_count')} placeholder="e.g. 16" type="number" style={{ textAlign: 'right' }} />
                </FieldWrap>
              </div>
              <FieldWrap label="System Type">
                <Select value={form.system_type} onChange={set('system_type')}>
                  <option value="">Select type…</option>
                  {SYSTEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </FieldWrap>
              <FieldWrap label="Inverter Model">
                <Input value={form.inverter_model} onChange={set('inverter_model')} placeholder="e.g. Fronius Symo 6.0" />
              </FieldWrap>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 10, background: form.battery_included ? BRAND_BG : '#fff' }}>
                <input
                  type="checkbox"
                  checked={form.battery_included}
                  onChange={set('battery_included')}
                  style={{ accentColor: BRAND, width: 16, height: 16 }}
                />
                <span style={{ fontWeight: 700, fontSize: 14, color: form.battery_included ? BRAND : '#374151' }}>
                  Battery included in this installation
                </span>
              </label>
            </div>
          </div>

          {/* ── Schedule ── */}
          <div>
            <SectionHeader icon={CalendarDays} title="Schedule" />
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <FieldWrap label="Date" required>
                  <Input value={form.scheduled_date} onChange={set('scheduled_date')} type="date" style={errors.scheduled_date ? { borderColor: '#EF4444' } : {}} />
                  {errors.scheduled_date && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 3 }}>{errors.scheduled_date}</div>}
                </FieldWrap>
                <FieldWrap label="Start Time">
                  <Input value={form.scheduled_time} onChange={set('scheduled_time')} type="time" />
                </FieldWrap>
              </div>
              <FieldWrap label="Estimated Duration (hours)">
                <Input value={form.estimated_hours} onChange={set('estimated_hours')} placeholder="e.g. 6" type="number" />
              </FieldWrap>
            </div>
          </div>

          {/* ── Team ── */}
          <div>
            <SectionHeader icon={Users} title="Assign Team" />
            <FieldWrap label="Team Members">
              <AssigneePicker selected={assignees} onChange={setAssignees} />
            </FieldWrap>
          </div>

          {/* ── Notes ── */}
          <div>
            <SectionHeader icon={FileText} title="Notes" />
            <FieldWrap label="Job Notes">
              <textarea
                value={form.notes}
                onChange={set('notes')}
                placeholder="Any additional notes for this installation…"
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                  border: '1px solid #D1D5DB', borderRadius: 10,
                  fontSize: 14, resize: 'vertical', outline: 'none',
                  fontFamily: 'inherit', lineHeight: 1.5,
                }}
                onFocus={e => e.target.style.borderColor = BRAND}
                onBlur={e  => e.target.style.borderColor = '#D1D5DB'}
              />
            </FieldWrap>
          </div>

          {/* spacer to prevent last field being hidden by footer */}
          <div style={{ height: 8 }} />
        </form>

        {/* ── Footer ── */}
        <div style={{
          padding: '14px 22px', background: '#fff',
          borderTop: '1px solid #E5E7EB', flexShrink: 0,
          display: 'flex', gap: 10,
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, padding: '12px', border: '1px solid #E5E7EB', borderRadius: 12,
              background: '#F9FAFB', color: '#374151', fontWeight: 700, fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              flex: 2, padding: '12px',
              background: saving ? '#9CA3AF' : BRAND,
              color: '#fff', border: 'none', borderRadius: 12,
              fontWeight: 800, fontSize: 14,
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: saving ? 'none' : `0 2px 10px ${BRAND}44`,
            }}
          >
            {saving && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
            {saving ? 'Creating Job…' : 'Create Job'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
