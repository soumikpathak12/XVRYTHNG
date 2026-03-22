/**
 * Expenses & Reimbursements for a single Installation Day job.
 * Claims use backend project_name = Installation job #{id}; flow matches Approvals.
 * Full amount / description / receipt visible only after approval.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Receipt, ChevronDown, ChevronUp, Plus, Send, Upload, AlertCircle, CheckCircle,
  Eye, X, Loader2, DollarSign,
} from 'lucide-react';
import * as api from '../../services/api.js';

const BRAND = '#146b6b';
const BRAND_LIGHT = '#e8f4f4';

const CATEGORIES = [
  { value: 'materials', label: 'Materials', hint: 'Supplies, consumables' },
  { value: 'travel', label: 'Travel & parking', hint: 'Parking, tolls, fuel' },
  { value: 'equipment', label: 'Equipment', hint: 'Tools, hire' },
  { value: 'other', label: 'Other', hint: 'Anything else' },
];

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtCurrency = (amt) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 }).format(Number(amt));

function statusBadge(status) {
  const map = {
    pending: ['#FEF3C7', '#92400E', 'Pending'],
    approved: ['#DCFCE7', '#166534', 'Approved'],
    rejected: ['#FEE2E2', '#991B1B', 'Rejected'],
    cancelled: ['#F3F4F6', '#6B7280', 'Cancelled'],
  };
  const [bg, fg, label] = map[status] ?? ['#F3F4F6', '#374151', status];
  return (
    <span
      style={{
        background: bg,
        color: fg,
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
      }}
    >
      {label}
    </span>
  );
}

export default function InstallationJobExpensesSection({ jobId }) {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [category, setCategory] = useState('materials');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const companyId = localStorage.getItem('companyId');
      const q = new URLSearchParams({ installationJobId: String(jobId) });
      if (companyId) q.set('companyId', companyId);
      const res = await api.authFetchJSON(`/api/employees/expenses/my?${q}`, { method: 'GET' });
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setCategory('materials');
    setAmount('');
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setDescription('');
    setReceipt(null);
    if (fileRef.current) fileRef.current.value = '';
    setErr('');
    setSuccess(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setSuccess(false);
    if (!amount || Number(amount) <= 0) {
      setErr('Enter a valid amount.');
      return;
    }
    if (!description.trim()) {
      setErr('Description is required.');
      return;
    }
    if (!receipt) {
      setErr('Receipt upload is required.');
      return;
    }

    const fd = new FormData();
    fd.append('installationJobId', String(jobId));
    fd.append('category', category);
    fd.append('amount', amount);
    fd.append('expenseDate', expenseDate);
    fd.append('description', description);
    fd.append('receipt', receipt);

    try {
      setSaving(true);
      const companyId = localStorage.getItem('companyId');
      const qs = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
      const resp = await api.authFetch(`/api/employees/expenses${qs}`, {
        method: 'POST',
        body: fd,
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.message || 'Submit failed');
      setSuccess(true);
      resetForm();
      setShowForm(false);
      load();
    } catch (e2) {
      setErr(e2.message || 'Failed to submit.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this expense claim?')) return;
    try {
      await api.authFetchJSON(`/api/employees/expenses/${id}/cancel`, { method: 'DELETE' });
      load();
    } catch (e) {
      alert(e.message || 'Failed');
    }
  };

  const apiBase = typeof window !== 'undefined' && window.location.origin.includes('localhost') ? '' : '';

  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #D1D5DB',
    borderRadius: 8,
    fontSize: 14,
    boxSizing: 'border-box',
    outline: 'none',
  };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 };

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 14,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: BRAND_LIGHT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <DollarSign size={18} color={BRAND} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15, color: '#111827' }}>
              Expenses &amp; Reimbursements
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 1.45, maxWidth: 420 }}>
              Track materials, parking, and other job costs. Submitted claims go to{' '}
              <strong>Approvals</strong>. You can review full details and receipts after approval.
            </div>
          </div>
        </div>
        {open ? <ChevronUp size={18} color="#9CA3AF" /> : <ChevronDown size={18} color="#9CA3AF" />}
      </button>

      {open && (
        <div style={{ padding: '0 16px 16px' }}>
          {!showForm && (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: 12,
                border: `1.5px dashed ${BRAND}`,
                background: BRAND_LIGHT,
                color: BRAND,
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 14,
              }}
            >
              <Plus size={18} />
              Add expense for this job
            </button>
          )}

          {showForm && (
            <div
              style={{
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                padding: 14,
                marginBottom: 14,
                background: '#FAFAFA',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>New claim</span>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6B7280' }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                    {CATEGORIES.find((c) => c.value === category)?.hint}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Amount (AUD)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      style={inputStyle}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Date</label>
                    <input
                      type="date"
                      style={inputStyle}
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
                    placeholder="e.g. Parking at site, conduit, fasteners…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Receipt <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(image or PDF, max 5 MB)</span>
                  </label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    style={{
                      border: `2px dashed ${receipt ? BRAND : '#D1D5DB'}`,
                      borderRadius: 10,
                      padding: 14,
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: receipt ? BRAND_LIGHT : '#fff',
                    }}
                  >
                    <Upload size={20} color={receipt ? BRAND : '#9CA3AF'} style={{ marginBottom: 4 }} />
                    <div style={{ fontSize: 12, color: receipt ? BRAND : '#6B7280', fontWeight: receipt ? 700 : 500 }}>
                      {receipt ? receipt.name : 'Tap to upload receipt'}
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*,.pdf"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files[0]) setReceipt(e.target.files[0]);
                      }}
                    />
                  </div>
                </div>

                {err && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#B91C1C', fontSize: 12 }}>
                    <AlertCircle size={14} />
                    {err}
                  </div>
                )}
                {success && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#166534', fontSize: 12 }}>
                    <CheckCircle size={14} />
                    Submitted — pending approval.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '11px 16px',
                    background: saving ? '#9CA3AF' : BRAND,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                  {saving ? 'Submitting…' : 'Submit for approval'}
                </button>
              </form>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#9CA3AF', fontSize: 13 }}>
              <Loader2 size={22} color={BRAND} style={{ animation: 'spin 1s linear infinite' }} />
              <div style={{ marginTop: 8 }}>Loading expenses…</div>
            </div>
          ) : rows.length === 0 ? (
            <div style={{ fontSize: 13, color: '#9CA3AF', padding: '8px 4px 4px', textAlign: 'center' }}>
              No expenses for this job yet. Add a claim to track costs here.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {rows.map((r) => {
                const cat = CATEGORIES.find((c) => c.value === r.category);
                const isApproved = r.status === 'approved';
                const isPending = r.status === 'pending';
                const isRejected = r.status === 'rejected';

                return (
                  <div
                    key={r.id}
                    style={{
                      border: '1px solid #E5E7EB',
                      borderRadius: 12,
                      padding: 12,
                      background: '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Receipt size={16} color={BRAND} />
                        <span style={{ fontWeight: 800, fontSize: 13, color: '#111827' }}>
                          {isApproved ? cat?.label || r.category : 'Expense claim'}
                        </span>
                      </div>
                      {statusBadge(r.status)}
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>
                      Submitted {fmtDate(r.created_at)}
                      {isApproved && r.expense_date && ` · Expense date ${fmtDate(r.expense_date)}`}
                    </div>

                    {isPending && (
                      <div
                        style={{
                          marginTop: 10,
                          padding: 10,
                          borderRadius: 8,
                          background: '#FFFBEB',
                          border: '1px solid #FDE68A',
                          fontSize: 12,
                          color: '#92400E',
                          lineHeight: 1.5,
                        }}
                      >
                        This claim is awaiting manager approval. Amount, description and receipt will be visible here
                        after it is approved.
                      </div>
                    )}

                    {isApproved && (
                      <>
                        <div style={{ marginTop: 10, fontSize: 18, fontWeight: 900, color: BRAND }}>
                          {fmtCurrency(r.amount)}
                        </div>
                        <div style={{ fontSize: 13, color: '#374151', marginTop: 6 }}>{r.description}</div>
                        {r.receipt_path && (
                          <a
                            href={apiBase + r.receipt_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              marginTop: 10,
                              fontSize: 13,
                              fontWeight: 700,
                              color: BRAND,
                              textDecoration: 'none',
                            }}
                          >
                            <Eye size={14} /> View receipt
                          </a>
                        )}
                      </>
                    )}

                    {isRejected && (
                      <div style={{ marginTop: 10, fontSize: 13, color: '#374151' }}>
                        {r.reviewer_note ? (
                          <span>
                            <strong style={{ color: '#991B1B' }}>Note:</strong> {r.reviewer_note}
                          </span>
                        ) : (
                          <span style={{ color: '#6B7280' }}>This claim was not approved.</span>
                        )}
                      </div>
                    )}

                    {isPending && (
                      <button
                        type="button"
                        onClick={() => handleCancel(r.id)}
                        style={{
                          marginTop: 10,
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#B91C1C',
                          background: '#FEF2F2',
                          border: '1px solid #FECACA',
                          borderRadius: 8,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel claim
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
