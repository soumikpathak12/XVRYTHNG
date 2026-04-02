// components/leads/LeadForm.jsx
import React, { useState, useEffect, useMemo } from 'react';

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
import { dbDatetimeToDatetimeLocalInput } from '../../utils/inspectionPrefillFromLead.js';

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
  onCancel, // callback only; parent handles navigation
  title = 'Add New Lead',
  submitLabel = 'Create Lead',
  embedded = false,

  cancelLabel = 'Cancel',        
  formId,                      
  hideActions = false,
  /** When true (new lead only), skip the green banner; parent can show a modal via onAfterCreate */
  suppressInlineSuccess = false,
  onAfterCreate = null,
  /** Optional [{ key, label }] from company workflow (enabled stages only). */
  stageOptions = null,
  /** When creating from B2C/B2B pipeline, pre-select segment (`b2c` | `b2b`). */
  defaultSalesSegment = null,
}) {
  const SOURCE_OPTIONS = ['Website', 'Solar Quotes', 'Facebook', 'Other'];

  const stageList = useMemo(() => {
    if (Array.isArray(stageOptions) && stageOptions.length) {
      return stageOptions.map((s) =>
        typeof s === 'string' ? { key: s, label: STAGE_LABELS[s] || s } : s
      );
    }
    return STAGES.map((k) => ({ key: k, label: STAGE_LABELS[k] || k }));
  }, [stageOptions]);
  const [form, setForm] = useState({
    customer_name: '',
    email: '',
    phone: '',
    suburb: '',
    source: '',
    stage: 'new',
    site_inspection_date: '',
    inspector_id: '',
    sales_segment: '',
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
      const rawSource = (initialValues.source || '').trim();
      const matchedSource = SOURCE_OPTIONS.find(
        (s) => s.toLowerCase() === rawSource.toLowerCase()
      );
      const sourceSel = matchedSource ?? (rawSource ? 'Other' : '');
      const sourceOther = matchedSource || !rawSource ? '' : rawSource;

      const rawSeg = initialValues.sales_segment ?? initialValues.salesSegment;
      const segNorm =
        rawSeg === 'b2c' || rawSeg === 'b2b' ? rawSeg : '';
      setForm({
        customer_name:
          initialValues.customerName ||
          initialValues.customer_name ||
          '',
        email: initialValues.email || '',
        phone: initialValues.phone || '',
        suburb: initialValues.suburb || '',
        source: sourceSel,
        sourceOther,
        stage: initialValues.stage || 'new',
        site_inspection_date: formatDateTimeLocal(
          initialValues.site_inspection_date ||
            initialValues.siteInspectionDate
        ),
        inspector_id:
          initialValues.inspector_id == null || initialValues.inspector_id === ''
            ? ''
            : String(initialValues.inspector_id),
        sales_segment: segNorm,
      });
    }
  }, [initialValues]);

  const segmentLocked =
    !initialValues && (defaultSalesSegment === 'b2c' || defaultSalesSegment === 'b2b');

  useEffect(() => {
    if (!initialValues && (defaultSalesSegment === 'b2c' || defaultSalesSegment === 'b2b')) {
      setForm((f) => ({ ...f, sales_segment: defaultSalesSegment }));
    }
  }, [defaultSalesSegment, initialValues]);

  useEffect(() => {
    const keys = new Set(stageList.map((s) => s.key));
    setForm((f) => (keys.has(f.stage) ? f : { ...f, stage: stageList[0]?.key || 'new' }));
  }, [stageList]);

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

  const formatDateTimeLocal = (raw) => {
    // site_inspection_date should be treated as naive wall-clock time.
    // Avoid `new Date(...)` to prevent timezone shifts on server vs local.
    return dbDatetimeToDatetimeLocalInput(raw) ?? '';
  };

  const toMySQLDateTime = (value) => {
    if (!value) return null;
    const s = String(value).trim();
    if (!s) return null;

    // Expected from datetime-local: "YYYY-MM-DDTHH:mm"
    const m = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})$/);
    if (m) return `${m[1]} ${m[2]}:00`;

    // Fallback: best-effort conversion
    const d = new Date(s);
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
    if (!form.suburb.trim()) nextFieldErrors.suburb = 'Location is required.';
    if (!form.stage || !stageList.some((s) => s.key === form.stage)) {
      nextFieldErrors.stage = 'Invalid stage selected.';
    }

    if (!form.source) {
      nextFieldErrors.source = 'Please select a source.';
    } else if (form.source === 'Other' && !form.sourceOther?.trim()) {
      nextFieldErrors.sourceOther = 'Please specify the source.';
    }

    // New leads must choose B2C or B2B unless the pipeline URL locks the segment.
    if (!initialValues && !segmentLocked) {
      if (form.sales_segment !== 'b2c' && form.sales_segment !== 'b2b') {
        nextFieldErrors.sales_segment = 'Select Residential (B2C) or Commercial (B2B).';
      }
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError('Please correct the errors and try again.');
      return;
    }

    const sourceFinal =
      form.source === 'Other' ? form.sourceOther.trim() : form.source.trim();

    const inspectionDate = toMySQLDateTime(form.site_inspection_date);
    const payload = {
      stage: form.stage,
      customer_name: form.customer_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      suburb: form.suburb.trim(),
      source: sourceFinal || null,
      site_inspection_date: inspectionDate,
      inspector_id: form.inspector_id ? Number(form.inspector_id) : undefined,
    };

    if (initialValues) {
      payload.sales_segment =
        form.sales_segment === 'b2c' || form.sales_segment === 'b2b' ? form.sales_segment : null;
    } else {
      const seg = segmentLocked ? defaultSalesSegment : form.sales_segment;
      if (seg === 'b2c' || seg === 'b2b') {
        payload.sales_segment = seg;
      }
    }

    setSubmitting(true);
    try {
      await onSubmit(payload);
      if (!initialValues && suppressInlineSuccess) {
        onAfterCreate?.();
      } else {
        setSuccess(true);
      }
      if (!initialValues) {
        // Reset form for new record
        setForm({
          customer_name: '',
          email: '',
          phone: '',
          suburb: '',
          source: '',
          sourceOther: '',
          stage: 'new',
          site_inspection_date: '',
          inspector_id: '',
          sales_segment:
            defaultSalesSegment === 'b2c' || defaultSalesSegment === 'b2b' ? defaultSalesSegment : '',
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
      {success && !suppressInlineSuccess && (
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

        <Field label="Source" error={fieldErrors.source}>
          <select
            value={form.source}
            onChange={(e) => {
              const value = e.target.value;
              update('source', value);
              if (value !== 'Other') update('sourceOther', '');
            }}
            style={styles.input}
            aria-describedby={fieldErrors.source ? 'source-error' : undefined}
          >
            <option value="" disabled>Select a source</option>
            <option value="Website">Website</option>
            <option value="Solar Quotes">Solar Quotes</option>
            <option value="Facebook">Facebook</option>
            <option value="Other">Other</option>
          </select>

          {form.source === 'Other' && (
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

        <Field
          label={initialValues ? 'Sales channel' : 'Sales channel *'}
          error={fieldErrors.sales_segment}
        >
          {segmentLocked ? (
            <div
              style={{
                ...styles.input,
                display: 'flex',
                alignItems: 'center',
                background: COLORS.neutralBg,
                borderColor: COLORS.neutralBorder,
                color: COLORS.text,
                fontWeight: 600,
              }}
              role="status"
            >
              {defaultSalesSegment === 'b2c'
                ? 'Residential (B2C) — locked to this pipeline'
                : 'Commercial (B2B) — locked to this pipeline'}
            </div>
          ) : (
            <select
              value={form.sales_segment || ''}
              onChange={(e) => update('sales_segment', e.target.value)}
              style={{
                ...styles.input,
                borderColor: fieldErrors.sales_segment ? COLORS.dangerText : COLORS.border,
              }}
              aria-label="Sales channel"
              required={!initialValues}
            >
              {initialValues ? (
                <>
                  <option value="">Not specified</option>
                  <option value="b2c">Residential (B2C)</option>
                  <option value="b2b">Commercial (B2B)</option>
                </>
              ) : (
                <>
                  <option value="">— Select B2C or B2B —</option>
                  <option value="b2c">Residential (B2C)</option>
                  <option value="b2b">Commercial (B2B)</option>
                </>
              )}
            </select>
          )}
          {!initialValues && !segmentLocked && (
            <small style={{ color: COLORS.subtext, display: 'block', marginTop: 6 }}>
              New leads need a channel so they appear in the correct B2C or B2B pipeline.
            </small>
          )}
        </Field>

        {/* Location + stage on one row (pipeline UX) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          <Field label="Location *" error={fieldErrors.suburb}>
            <input
              type="text"
              value={form.suburb}
              onChange={(e) => update('suburb', e.target.value)}
              placeholder="Suburb or area"
              style={{
                ...styles.input,
                borderColor: fieldErrors.suburb ? COLORS.dangerText : COLORS.border,
              }}
              required
            />
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
              {stageList.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

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
              <option key={emp.id} value={String(emp.id)}>
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
