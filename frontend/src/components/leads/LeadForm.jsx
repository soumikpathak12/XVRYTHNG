// components/leads/LeadForm.jsx
import React, { useState, useEffect } from 'react';

const STAGES = [
  'new',
  'contacted',
  'qualified',
  'inspection_booked',
  'inspection_completed',
  'proposal_sent',
  'negotiation',
  'closed_won',
  'closed_lost',
];

const STAGE_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  inspection_booked: 'Site Inspection Booked',
  inspection_completed: 'Site Inspection Completed',
  proposal_sent: 'Proposal Sent',
  negotiation: 'Negotiation',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
};

export default function LeadForm({ initialValues, onSubmit, onCancel, title = 'Add New Lead', submitLabel = 'Create Lead', embedded = false }) {
  const [form, setForm] = useState({
    customer_name: '',
    suburb: '',
    system_size_kw: '',
    value_amount: '',
    source: '',
    stage: 'new',
    site_inspection_date: '',
  });

  useEffect(() => {
    if (initialValues) {
      setForm({
        customer_name: initialValues.customerName || initialValues.customer_name || '',
        suburb: initialValues.suburb || '',
        system_size_kw: initialValues.systemSize ? parseFloat(initialValues.systemSize) : (initialValues.system_size_kw || ''),
        value_amount: initialValues.value || initialValues.value_amount || '',
        source: initialValues.source || '',
        stage: initialValues.stage || 'new',
        site_inspection_date: formatDateTimeLocal(initialValues.site_inspection_date || initialValues.siteInspectionDate),
      });
    }
  }, [initialValues]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));

    if (fieldErrors[key]) {
      setFieldErrors((fe) => {
        const next = { ...fe };
        delete next[key];
        return next;
      });
    }
  };

  // Convert MySQL DATETIME or ISO -> datetime-local string
  const formatDateTimeLocal = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };

  const toMySQLDateTime = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:00`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Validation
    if (!form.customer_name.trim()) {
      setError('Customer name is required.');
      return;
    }
    if (!STAGES.includes(form.stage)) {
      setError('Invalid stage selected.');
      return;
    }
    if (form.system_size_kw && isNaN(Number(form.system_size_kw))) {
      setError('System size must be a number (kW).');
      return;
    }
    if (form.value_amount && isNaN(Number(form.value_amount))) {
      setError('Value amount must be a number.');
      return;
    }

    const inspectionDate = toMySQLDateTime(form.site_inspection_date);
    const payload = {
      stage: form.stage,
      customer_name: form.customer_name,
      suburb: form.suburb || null,
      system_size_kw: form.system_size_kw ? Number(form.system_size_kw) : null,
      value_amount: form.value_amount ? Number(form.value_amount) : null,
      source: form.source || null,
      site_inspection_date: inspectionDate,
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
      // Reset only if not editing (optional, but handled by parent closing modal usually)
      if (!initialValues) {
        setForm({
          customer_name: '',
          suburb: '',
          system_size_kw: '',
          value_amount: '',
          source: '',
          stage: 'new',
          site_inspection_date: '',
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to save lead.');
      if (err.body && err.body.errors) {
        setFieldErrors(err.body.errors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <>
        {error && (
          <div
            style={{
              background: '#FCE7F3',
              color: '#9D174D',
              border: '1px solid #FBCFE8',
              padding: '8px 10px',
              borderRadius: 8,
              marginBottom: 12,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          {/* CUSTOMER NAME */}
          <Field
            label="Customer name *"
            error={fieldErrors.customer_name}
          >
            <input
              type="text"
              value={form.customer_name}
              onChange={(e) => update('customer_name', e.target.value)}
              placeholder="e.g. Jane Doe"
              style={inputStyle}
            />
          </Field>

          {/* SUBURB */}
          <Field label="Suburb" error={fieldErrors.suburb}>
            <input
              type="text"
              value={form.suburb}
              onChange={(e) => update('suburb', e.target.value)}
              placeholder="e.g. Parramatta, NSW"
              style={inputStyle}
            />
          </Field>

          {/* SYSTEM SIZE + VALUE */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="System size (kW)" error={fieldErrors.system_size_kw}>
              <input
                type="number"
                step="0.01"
                value={form.system_size_kw}
                onChange={(e) => update('system_size_kw', e.target.value)}
                placeholder="e.g. 6.60"
                style={inputStyle}
              />
            </Field>

            <Field label="Value amount" error={fieldErrors.value_amount}>
              <input
                type="number"
                step="0.01"
                value={form.value_amount}
                onChange={(e) => update('value_amount', e.target.value)}
                placeholder="e.g. 9000"
                style={inputStyle}
              />
            </Field>
          </div>

          {/* SOURCE */}
          <Field label="Source" error={fieldErrors.source}>
            <input
              type="text"
              value={form.source}
              onChange={(e) => update('source', e.target.value)}
              placeholder="e.g. Web, Google Ads"
              style={inputStyle}
            />
          </Field>

          {/* STAGE */}
          <Field label="Stage *" error={fieldErrors.stage}>
            <select
              value={form.stage}
              onChange={(e) => update('stage', e.target.value)}
              style={inputStyle}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>{STAGE_LABELS[s] || s}</option>
              ))}
            </select>
          </Field>

          {/* SITE INSPECTION DATE */}
          <Field label="Site inspection date (optional)" error={fieldErrors.site_inspection_date}>
            <input
              type="datetime-local"
              value={form.site_inspection_date}
              onChange={(e) => update('site_inspection_date', e.target.value)}
              style={inputStyle}
            />
            <small style={{ color: '#6B7280' }}>
              Leave empty if not scheduled yet.
            </small>
          </Field>

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                background: '#F3F4F6',
                color: '#374151',
                border: '1px solid #E5E7EB',
                padding: '8px 12px',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              style={{
                backgroundColor: submitting ? '#93C5FD' : '#2563EB',
                color: 'white',
                padding: '8px 12px',
                borderRadius: 8,
                border: 'none',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Saving...' : submitLabel}
            </button>
          </div>
        </form>
    </>
  );

  if (embedded) {
    return <div style={{ maxWidth: 560 }}>{content}</div>;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 12,
          width: '100%',
          maxWidth: 560,
          padding: 20,
          boxShadow:
            '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
        }}
      >
        {title ? (
          <>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f1a2b' }}>
              {title}
            </h2>
            <p style={{ margin: '6px 0 16px', color: '#6B7280' }}>
              {initialValues ? 'Update the details below.' : 'Enter the details below and click Create.'}
            </p>
          </>
        ) : null}
        {content}
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <label style={{ fontWeight: 600 }}>
        {label}
        {error && (
          <span style={{ color: '#B91C1C', marginLeft: 8, fontWeight: 400 }}>
            {error}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  border: '1px solid #E5E7EB',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 14,
};