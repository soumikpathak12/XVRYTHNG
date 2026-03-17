import React, { useEffect, useMemo, useState } from 'react';

/**
 * TrialUserForm:
 * - Accepts `initial` for edit mode (prefill fields).
 * - User can click "Save" even if fields are empty/invalid.
 *   On submit: show errors and stop if invalid; proceed if valid.
 * - "Save" is disabled only while `submitting`.
 */
export default function TrialUserForm({ onSubmit, onCancel, submitting, initial }) {
  const [name, setName] = useState(initial?.name || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [email, setEmail] = useState(initial?.email || '');

  // Reset fields when switching between different records
  useEffect(() => {
    if (initial) {
      setName(initial.name || '');
      setPhone(initial.phone || '');
      setEmail(initial.email || '');
      setSubmitted(false);
    }
  }, [initial?.id]); // re-run when editing a different user

  // Track first submit attempt (to reveal errors)
  const [submitted, setSubmitted] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[0-9+\-() ]{8,20}$/;

  const errors = useMemo(() => {
    const e = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!emailRegex.test(email)) e.email = 'Invalid email format';
    if (phone && !phoneRegex.test(phone)) e.phone = 'Invalid phone format';
    return e;
  }, [name, email, phone]);

  const isValid = Object.keys(errors).length === 0;

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    if (!isValid) return;
    onSubmit?.({
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim(),
    });
  }

  const showError = submitted;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
      {/* Name */}
      <div>
        <label style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          autoFocus
          required
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            outline: 'none',
          }}
        />
        {showError && errors.name && (
          <div style={{ color: '#DC3545', fontSize: 12, marginTop: 4 }}>{errors.name}</div>
        )}
      </div>

      {/* Phone */}
      <div>
        <label style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>Phone</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+61 4xx xxx xxx"
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            outline: 'none',
          }}
        />
        {showError && errors.phone && (
          <div style={{ color: '#DC3545', fontSize: 12, marginTop: 4 }}>{errors.phone}</div>
        )}
      </div>

      {/* Email */}
      <div>
        <label style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          required
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            outline: 'none',
          }}
        />
        {showError && errors.email && (
          <div style={{ color: '#DC3545', fontSize: 12, marginTop: 4 }}>{errors.email}</div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: '#F5F5F5',
            border: '1px solid #e5e7eb',
            padding: '8px 14px',
            borderRadius: 10,
            cursor: 'pointer',
            color: '#1A1A2E',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          style={{
            background: submitting ? '#9ca3af' : '#1A7B7B', 
            color: '#fff',
            border: 'none',
            padding: '8px 14px',
            borderRadius: 10,
            cursor: submitting ? 'not-allowed' : 'pointer',
            boxShadow: submitting ? 'none' : '0 4px 14px rgba(26,123,123,.25)',
          }}
        >
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}