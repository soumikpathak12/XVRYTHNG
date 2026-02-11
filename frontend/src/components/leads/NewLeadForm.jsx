// components/leads/AddLeadForm.jsx
import React, { useState } from 'react';

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

export default function AddLeadForm({ onCreate, onCancel }) {
  const [form, setForm] = useState({
    customer_name: '',
    suburb: '',
    system_size_kw: '',
    value_amount: '',
    source: '',
    stage: 'new',
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Client-side validation
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

    setSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: form.stage,
          customer_name: form.customer_name,
          suburb: form.suburb || null,
          system_size_kw: form.system_size_kw ? Number(form.system_size_kw) : null,
          value_amount: form.value_amount ? Number(form.value_amount) : null,
          source: form.source || null,
        }),
      });

      const payload = await res.json().catch(() => ({}));

      // Handle 422 validation
      if (res.status === 422) {
        setFieldErrors(payload?.errors || {});
        throw new Error('Please fix the highlighted errors.');
      }

      if (!res.ok) {
        throw new Error(payload?.message || payload?.error || `Request failed: ${res.status}`);
      }

      const created = payload?.data ?? payload;

      if (typeof onCreate === 'function') {
        onCreate(created);
      }

      setForm({
        customer_name: '',
        suburb: '',
        system_size_kw: '',
        value_amount: '',
        source: '',
        stage: 'new',
      });
    } catch (err) {
      setError(err.message || 'Failed to create lead.');
    } finally {
      setSubmitting(false);
    }
  };

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
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f1a2b' }}>
          Add New Lead
        </h2>
        <p style={{ margin: '6px 0 16px', color: '#6B7280' }}>
          Enter the details below and click Create.
        </p>

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
          <div style={{ display: 'grid', gap: 6 }}>
            <label style={{ fontWeight: 600 }}>
              Customer name *
              {fieldErrors.customer_name && (
                <span style={{ color: '#B91C1C', marginLeft: 8, fontWeight: 400 }}>
                  {fieldErrors.customer_name}
                </span>
              )}
            </label>
            <input
              type="text"
              value={form.customer_name}
              onChange={(e) => update('customer_name', e.target.value)}
              placeholder="e.g. Jane Doe"
              style={inputStyle}
              aria-invalid={!!fieldErrors.customer_name}
            />
          </div>

          {/* SUBURB */}
          <div style={{ display: 'grid', gap: 6 }}>
            <label style={{ fontWeight: 600 }}>
              Suburb
              {fieldErrors.suburb && (
                <span style={{ color: '#B91C1C', marginLeft: 8, fontWeight: 400 }}>
                  {fieldErrors.suburb}
                </span>
              )}
            </label>
            <input
              type="text"
              value={form.suburb}
              onChange={(e) => update('suburb', e.target.value)}
              placeholder="e.g. Parramatta, NSW"
              style={inputStyle}
              aria-invalid={!!fieldErrors.suburb}
            />
          </div>

          {/* SYSTEM SIZE & VALUE */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontWeight: 600 }}>
                System size (kW)
                {fieldErrors.system_size_kw && (
                  <span style={{ color: '#B91C1C', marginLeft: 8, fontWeight: 400 }}>
                    {fieldErrors.system_size_kw}
                  </span>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                value={form.system_size_kw}
                onChange={(e) => update('system_size_kw', e.target.value)}
                placeholder="e.g. 6.60"
                style={inputStyle}
                aria-invalid={!!fieldErrors.system_size_kw}
              />
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontWeight: 600 }}>
                Value amount
                {fieldErrors.value_amount && (
                  <span style={{ color: '#B91C1C', marginLeft: 8, fontWeight: 400 }}>
                    {fieldErrors.value_amount}
                  </span>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                value={form.value_amount}
                onChange={(e) => update('value_amount', e.target.value)}
                placeholder="e.g. 9000"
                style={inputStyle}
                aria-invalid={!!fieldErrors.value_amount}
              />
            </div>
          </div>

          {/* SOURCE */}
          <div style={{ display: 'grid', gap: 6 }}>
            <label style={{ fontWeight: 600 }}>
              Source
              {fieldErrors.source && (
                <span style={{ color: '#B91C1C', marginLeft: 8, fontWeight: 400 }}>
                  {fieldErrors.source}
                </span>
              )}
            </label>
            <input
              type="text"
              value={form.source}
              onChange={(e) => update('source', e.target.value)}
              placeholder="e.g. Web, Google Ads"
              style={inputStyle}
              aria-invalid={!!fieldErrors.source}
            />
          </div>

          {/* STAGE */}
          <div style={{ display: 'grid', gap: 6 }}>
            <label style={{ fontWeight: 600 }}>
              Stage *
              {fieldErrors.stage && (
                <span style={{ color: '#B91C1C', marginLeft: 8, fontWeight: 400 }}>
                  {fieldErrors.stage}
                </span>
              )}
            </label>
            <select
              value={form.stage}
              onChange={(e) => update('stage', e.target.value)}
              style={inputStyle}
              aria-invalid={!!fieldErrors.stage}
            >
              {STAGES.map((s) => (
                <option value={s} key={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
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
              {submitting ? 'Creating...' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  border: '1px solid #E5E7EB',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 14,
};
