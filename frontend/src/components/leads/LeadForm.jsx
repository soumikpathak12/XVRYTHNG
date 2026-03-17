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

import { listEmployees } from '../../services/api';

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

const COLORS = {
  primary: '#1A7B7B',
  primaryHover: '#4DB8A8',
  text: '#0F172A',
  subtext: '#6B7280',
  border: '#E5E7EB',
  inputBg: '#FFFFFF',
  inputHover: '#F9FAFB',
  inputFocusRing: 'rgba(26, 123, 123, 0.25)',

  dangerBg: '#FEF2F2',
  dangerText: '#B91C1C',
  dangerBorder: '#FECACA',

  neutralBg: '#F3F4F6',
  neutralBorder: '#E5E7EB',

  overlay: 'rgba(0,0,0,0.35)',
  shadow:
    '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',

  successBg: 'rgba(26,123,123,0.08)',
  successBorder: '#1A7B7B',
  successText: '#0F5132',
  warnBg: '#FFFBEB',
  warnBorder: '#FCD34D',
  warnText: '#92400E',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9()+\-\s]*[0-9][0-9()+\-\s]*$/;

export default function LeadForm({
  initialValues,
  onSubmit,
  onCancel,                      // chỉ gọi callback, KHÔNG điều hướng history
  title = 'Add New Lead',
  submitLabel = 'Create Lead',
  embedded = false,

  cancelLabel = 'Cancel',        
  formId,                      
  hideActions = false,           
}) {
  const [form, setForm] = useState({
    customer_name: '',
    email: '',
    phone: '',
    suburb: '',
    system_size_kw: '',
    value_amount: '',
    source: '',
    stage: 'new',
    site_inspection_date: '',
    inspector_id: '',
  });

  const [inspectors, setInspectors] = useState([]);

  useEffect(() => {
    let active = true;
    listEmployees({ status: 'active' })
      .then((res) => {
        if (active) setInspectors(res.data || []);
      })
      .catch((err) => console.error('Failed to load inspectors', err));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (initialValues) {
      setForm({
        customer_name:
          initialValues.customerName ||
          initialValues.customer_name ||
          '',
        email: initialValues.email || '',
        phone: initialValues.phone || '',
        suburb: initialValues.suburb || '',
        system_size_kw: initialValues.systemSize
          ? parseFloat(initialValues.systemSize)
          : initialValues.system_size_kw || '',
        value_amount:
          initialValues.value || initialValues.value_amount || '',
        source: initialValues.source || '',
        stage: initialValues.stage || 'new',
        site_inspection_date: formatDateTimeLocal(
          initialValues.site_inspection_date ||
            initialValues.siteInspectionDate
        ),
        inspector_id: initialValues.inspector_id || '',
      });
    }
  }, [initialValues]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);

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
    setSuccess(false);
    setFieldErrors({});

    const nextFieldErrors = {};

    if (!form.customer_name.trim()) nextFieldErrors.customer_name = 'Customer name is required.';
    if (!form.email.trim()) {
      nextFieldErrors.email = 'Email is required.';
    } else if (!EMAIL_RE.test(form.email.trim())) {
      nextFieldErrors.email = 'Invalid email format.';
    }
    if (!form.phone.trim()) {
      nextFieldErrors.phone = 'Phone is required.';
    } else if (!PHONE_RE.test(form.phone.trim())) {
      nextFieldErrors.phone = 'Invalid phone format.';
    }
    if (!form.suburb.trim()) nextFieldErrors.suburb = 'Suburb is required.';
    if (!form.stage || !STAGES.includes(form.stage)) {
      nextFieldErrors.stage = 'Invalid stage selected.';
    }
    if (form.system_size_kw === '' || form.system_size_kw === null) {
      nextFieldErrors.system_size_kw = 'System size (kW) is required.';
    } else if (Number.isNaN(Number(form.system_size_kw))) {
      nextFieldErrors.system_size_kw = 'System size must be a number (kW).';
    } else if (Number(form.system_size_kw) < 0) {
      nextFieldErrors.system_size_kw = 'System size cannot be negative.';
    }
    if (form.value_amount === '' || form.value_amount === null) {
      nextFieldErrors.value_amount = 'Value amount is required.';
    } else if (Number.isNaN(Number(form.value_amount))) {
      nextFieldErrors.value_amount = 'Value amount must be a number.';
    } else if (Number(form.value_amount) < 0) {
      nextFieldErrors.value_amount = 'Value amount cannot be negative.';
    }

    if (!form.source) {
      nextFieldErrors.source = 'Please select a source.';
    } else if (form.source === 'Others' && !form.sourceOther?.trim()) {
      nextFieldErrors.sourceOther = 'Please specify the source.';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError('Please correct the errors and try again.');
      return;
    }

    const sourceFinal =
      form.source === 'Others' ? form.sourceOther.trim() : form.source.trim();

    const inspectionDate = toMySQLDateTime(form.site_inspection_date);
    const payload = {
      stage: form.stage,
      customer_name: form.customer_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      suburb: form.suburb.trim(),
      system_size_kw: Number(form.system_size_kw),
      value_amount: Number(form.value_amount),
      source: sourceFinal || null,
      site_inspection_date: inspectionDate,
      inspector_id: form.inspector_id || undefined,
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
      setSuccess(true);
      if (!initialValues) {
        // Reset form for new record
        setForm({
          customer_name: '',
          email: '',
          phone: '',
          suburb: '',
          system_size_kw: '',
          value_amount: '',
          source: '',
          sourceOther: '',
          stage: 'new',
          site_inspection_date: '',
          inspector_id: '',
        });
      }
    } catch (err) {
      setError(err?.message || 'Failed to save lead.');
      if (err?.body?.errors) {
        setFieldErrors(err.body.errors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const hasFieldErrors = Object.keys(fieldErrors || {}).length > 0;

  const content = (
    <>
      {success && (
        <div style={styles.alertSuccess} role="status" aria-live="polite">
          ✅ Lead has been created successfully.
        </div>
      )}

      {error && (
        <div style={styles.alertError} role="alert">
          {error}
        </div>
      )}

      {hasFieldErrors && (
        <div style={styles.alertWarn} role="alert">
          ⚠️ Please review the highlighted fields.
        </div>
      )}

      <form id={formId} onSubmit={handleSubmit} style={styles.formGrid}>
        <Field label="Customer name *" error={fieldErrors.customer_name}>
          <input
            type="text"
            value={form.customer_name}
            onChange={(e) => update('customer_name', e.target.value)}
            style={{
              ...styles.input,
              borderColor: fieldErrors.customer_name ? COLORS.dangerText : COLORS.border,
            }}
            required
          />
        </Field>

        <div style={styles.twoCol}>
          <Field label="Email *" error={fieldErrors.email}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              style={{
                ...styles.input,
                borderColor: fieldErrors.email ? COLORS.dangerText : COLORS.border,
              }}
              required
            />
          </Field>

          <Field label="Phone *" error={fieldErrors.phone}>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              style={{
                ...styles.input,
                borderColor: fieldErrors.phone ? COLORS.dangerText : COLORS.border,
              }}
              required
            />
          </Field>
        </div>

        <Field label="Suburb *" error={fieldErrors.suburb}>
          <input
            type="text"
            value={form.suburb}
            onChange={(e) => update('suburb', e.target.value)}
            style={{
              ...styles.input,
              borderColor: fieldErrors.suburb ? COLORS.dangerText : COLORS.border,
            }}
            required
          />
        </Field>

        <div style={styles.twoCol}>
          <Field label="System size (kW) *" error={fieldErrors.system_size_kw}>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.system_size_kw}
              onChange={(e) => update('system_size_kw', e.target.value)}
              style={{
                ...styles.input,
                borderColor: fieldErrors.system_size_kw ? COLORS.dangerText : COLORS.border,
              }}
              required
            />
          </Field>

          <Field label="Value amount *" error={fieldErrors.value_amount}>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.value_amount}
              onChange={(e) => update('value_amount', e.target.value)}
              style={{
                ...styles.input,
                borderColor: fieldErrors.value_amount ? COLORS.dangerText : COLORS.border,
              }}
              required
            />
          </Field>
        </div>

        <Field label="Source" error={fieldErrors.source}>
          <select
            value={form.source}
            onChange={(e) => {
              const value = e.target.value;
              update('source', value);
              if (value !== 'Others') update('sourceOther', '');
            }}
            style={styles.input}
            aria-describedby={fieldErrors.source ? 'source-error' : undefined}
          >
            <option value="" disabled>Select a source</option>
            <option value="Website">Website</option>
            <option value="Solar Quote">Solar Quote</option>
            <option value="Facebook">Facebook</option>
            <option value="Others">Others</option>
          </select>

          {form.source === 'Others' && (
            <div style={{ marginTop: 8 }}>
              <label htmlFor="source-other" style={{ display: 'block', marginBottom: 4 }}>
                Source type:
              </label>
              <input
                id="source-other"
                type="text"
                value={form.sourceOther || ''}
                onChange={(e) => update('sourceOther', e.target.value)}
                style={styles.input}
                placeholder="Type the source"
                aria-label="Other source"
              />
              {fieldErrors.sourceOther && (
                <div id="source-other-error" role="alert" style={{ color: 'crimson', marginTop: 4 }}>
                  {fieldErrors.sourceOther}
                </div>
              )}
            </div>
          )}
        </Field>

        <Field label="Stage *" error={fieldErrors.stage}>
          <select
            value={form.stage}
            onChange={(e) => update('stage', e.target.value)}
            style={{
              ...styles.input,
              appearance: 'none',
              paddingRight: 36,
              backgroundImage: dropdownChevron,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
              backgroundSize: '14px',
              borderColor: fieldErrors.stage ? COLORS.dangerText : COLORS.border,
            }}
            required
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s] || s}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Site inspection date (optional)"
          error={fieldErrors.site_inspection_date}
        >
          <input
            type="datetime-local"
            value={form.site_inspection_date}
            onChange={(e) => update('site_inspection_date', e.target.value)}
            style={styles.input}
          />
          <small style={{ color: COLORS.subtext }}>Leave empty if not scheduled yet.</small>
        </Field>

        <Field label="Inspector" error={fieldErrors.inspector_id}>
          <select
            value={form.inspector_id}
            onChange={(e) => update('inspector_id', e.target.value)}
            style={styles.input}
          >
            <option value="">Select Inspector</option>
            {inspectors.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name}
              </option>
            ))}
          </select>
        </Field>

        {!hideActions && (
          <div style={styles.actions}>
            <button type="button" onClick={onCancel} style={styles.btnSecondary}>
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                ...styles.btnPrimary,
                backgroundColor: submitting ? '#7FB9B9' : COLORS.primary,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.9 : 1,
              }}
              onMouseEnter={(e) => {
                if (!submitting) e.currentTarget.style.backgroundColor = COLORS.primaryHover;
              }}
              onMouseLeave={(e) => {
                if (!submitting) e.currentTarget.style.backgroundColor = COLORS.primary;
              }}
            >
              {submitting ? 'Saving...' : submitLabel}
            </button>
          </div>
        )}
      </form>
    </>
  );

  if (embedded) {
    return <div style={{ width: '100%' }}>{content}</div>;
  }

  return (
    <div role="dialog" aria-modal="true" style={styles.overlay}>
      <div style={styles.modal}>
        {title ? (
          <>
            <h2 style={styles.title}>
              {success ? 'Lead Created' : title}
            </h2>
            {!success && (
              <p style={styles.subtitle}>
                {initialValues
                  ? 'Update the details below.'
                  : 'Enter the details below and click Create.'}
              </p>
            )}
          </>
        ) : null}
        {content}
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  const formattedLabel = (
    <>
      {label.replace('*', '')}
      {label.includes('*') && (
        <span style={{ color: '#B91C1C', marginLeft: 2 }}>*</span>
      )}
    </>
  );

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <label style={{ fontWeight: 600 }}>
        {formattedLabel}
        {error && (
          <span style={{ color: COLORS.dangerText, marginLeft: 8, fontWeight: 400 }}>
            {error}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: COLORS.overlay,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 50,
  },
  modal: {
    background: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 600,
    padding: 24,
    boxShadow: COLORS.shadow,
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  subtitle: {
    margin: '6px 0 18px',
    color: COLORS.subtext,
  },
  alertError: {
    background: COLORS.dangerBg,
    color: COLORS.dangerText,
    border: `1px solid ${COLORS.dangerBorder}`,
    padding: '10px 12px',
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  alertSuccess: {
    background: COLORS.successBg,
    color: COLORS.successText,
    border: `1px solid ${COLORS.successBorder}`,
    padding: '10px 12px',
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  alertWarn: {
    background: COLORS.warnBg,
    color: COLORS.warnText,
    border: `1px solid ${COLORS.warnBorder}`,
    padding: '10px 12px',
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  formGrid: {
    display: 'grid',
    gap: 14,
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 14,
    background: COLORS.inputBg,
    color: COLORS.text,
    transition:
      'background-color 120ms ease, box-shadow 120ms ease, border-color 120ms ease',
  },
  focusShadow: `0 0 0 4px ${COLORS.inputFocusRing}`,
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  btnSecondary: {
    background: COLORS.neutralBg,
    color: '#374151',
    border: `1px solid ${COLORS.neutralBorder}`,
    padding: '10px 14px',
    borderRadius: 10,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'border-color 120ms ease, background-color 120ms ease',
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    color: '#FFFFFF',
    padding: '10px 14px',
    borderRadius: 10,
    border: 'none',
    fontWeight: 700,
    letterSpacing: 0.2,
    cursor: 'pointer',
    transition: 'background-color 120ms ease, opacity 120ms ease',
  },
};

const dropdownChevron =
  'url("data:image/svg+xml;utf8, \
  <svg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 20 20\'> \
    <path fill=\'%23737B8C\' d=\'M5.23 7.21a.75.75 0 011.06.02L10 10.17l3.71-2.94a.75.75 0 111.04 1.08l-4.24 3.36a.75.75 0 01-.94 0L5.21 8.31a.75.75 0 01.02-1.1z\'/> \
  </svg>")';
