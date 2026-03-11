import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../../services/api.js';
import {
  Receipt, Send, AlertCircle, CheckCircle, Upload,
  ChevronDown, ChevronUp, Hourglass, XCircle, Eye, X,
} from 'lucide-react';

const BRAND = '#146b6b';
const BRAND_LIGHT = '#e8f4f4';

const CATEGORIES = [
  { value: 'travel',    label: 'Travel',    color: '#3B82F6' },
  { value: 'materials', label: 'Materials', color: '#F59E0B' },
  { value: 'equipment', label: 'Equipment', color: '#8B5CF6' },
  { value: 'other',     label: 'Other',     color: '#6B7280' },
];

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const fmtCurrency = (amt) => `₹${Number(amt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const statusBadge = (s) => {
  const map = { pending: ['#FEF3C7', '#92400E'], approved: ['#DCFCE7', '#166534'], rejected: ['#FEE2E2', '#991B1B'], cancelled: ['#F3F4F6', '#6B7280'] };
  const [bg, fg] = map[s] ?? ['#F3F4F6', '#374151'];
  return <span style={{ background: bg, color: fg, padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s}</span>;
};

/* ─── Expense Form ─── */
function ExpenseForm({ onSubmitted }) {
  const [projectName, setProjectName] = useState('');
  const [category, setCategory] = useState('travel');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState(false);
  const fileRef = useRef();

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setSuccess(false);
    if (!amount || Number(amount) <= 0) { setErr('Enter a valid amount.'); return; }
    if (!description.trim()) { setErr('Description is required.'); return; }
    if (!receipt) { setErr('Receipt upload is required.'); return; }

    const fd = new FormData();
    fd.append('projectName', projectName);
    fd.append('category', category);
    fd.append('amount', amount);
    fd.append('expenseDate', expenseDate);
    fd.append('description', description);
    fd.append('receipt', receipt);

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const companyId = localStorage.getItem('companyId');
      const resp = await fetch(`/api/employees/expenses${companyId ? `?companyId=${companyId}` : ''}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || 'Submit failed');
      setSuccess(true);
      setProjectName(''); setCategory('travel'); setAmount(''); setDescription(''); setReceipt(null);
      if (fileRef.current) fileRef.current.value = '';
      onSubmitted?.();
    } catch (e) {
      setErr(e.message || 'Failed to submit.');
    } finally { setSaving(false); }
  };

  const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none' };
  const labelStyle = { fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 };

  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Send size={18} color={BRAND} /> Submit Expense Claim
      </div>

      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <div>
            <label style={labelStyle}>Project (optional)</label>
            <input style={inputStyle} placeholder="e.g. Solar Install – Site A" value={projectName} onChange={e => setProjectName(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Category *</label>
            <select style={inputStyle} value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Amount (₹) *</label>
            <input type="number" min="0" step="0.01" style={inputStyle} placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div>
            <label style={labelStyle}>Date *</label>
            <input type="date" style={inputStyle} value={expenseDate} onChange={e => setExpenseDate(e.target.value)} required />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Description *</label>
          <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} placeholder="What was this expense for?" value={description} onChange={e => setDescription(e.target.value)} required />
        </div>

        <div>
          <label style={labelStyle}>Receipt * <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(Image or PDF, max 5 MB)</span></label>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${receipt ? BRAND : '#D1D5DB'}`,
              borderRadius: 10, padding: 20, textAlign: 'center', cursor: 'pointer',
              background: receipt ? BRAND_LIGHT : '#FAFAFA', transition: 'all 0.15s',
            }}>
            <Upload size={22} color={receipt ? BRAND : '#9CA3AF'} style={{ marginBottom: 6 }} />
            <div style={{ fontSize: 13, color: receipt ? BRAND : '#6B7280', fontWeight: receipt ? 700 : 400 }}>
              {receipt ? receipt.name : 'Click to upload receipt'}
            </div>
            <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
              onChange={e => { if (e.target.files[0]) setReceipt(e.target.files[0]); }}
            />
          </div>
        </div>

        {err && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#B91C1C', fontSize: 13 }}><AlertCircle size={14} />{err}</div>}
        {success && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#166534', fontSize: 13 }}><CheckCircle size={14} />Expense submitted! It's now pending approval.</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={saving}
            style={{ padding: '8px 24px', background: saving ? '#9CA3AF' : BRAND, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Send size={14} />{saving ? 'Submitting…' : 'Submit Claim'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─── My Expenses Table ─── */
function MyExpenses({ expenses, onCancel }) {
  const [open, setOpen] = useState(true);
  const [previewUrl, setPreviewUrl] = useState(null);

  const apiBase = window.location.origin.includes('localhost') ? '' : '';

  return (
    <>
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <button onClick={() => setOpen(o => !o)}
          style={{ width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 15, color: '#111827' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Receipt size={18} color={BRAND} />
            My Expenses ({expenses.length})
          </span>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {open && (
          <div style={{ padding: '0 16px 16px' }}>
            {expenses.length === 0 ? (
              <div style={{ color: '#9CA3AF', fontSize: 13, padding: 12 }}>No expenses yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                      {['Date', 'Category', 'Project', 'Amount', 'Status', 'Receipt', 'Action'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#6B7280', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(r => {
                      const cat = CATEGORIES.find(c => c.value === r.category);
                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '10px' }}>{fmtDate(r.expense_date)}</td>
                          <td style={{ padding: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 6, height: 6, borderRadius: 999, background: cat?.color || '#6B7280' }} />
                              {cat?.label || r.category}
                            </div>
                          </td>
                          <td style={{ padding: '10px' }}>{r.project_name || '—'}</td>
                          <td style={{ padding: '10px', fontWeight: 700 }}>{fmtCurrency(r.amount)}</td>
                          <td style={{ padding: '10px' }}>{statusBadge(r.status)}</td>
                          <td style={{ padding: '10px' }}>
                            {r.receipt_path && (
                              <button onClick={() => setPreviewUrl(r.receipt_path)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: BRAND, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 12 }}>
                                <Eye size={14} /> View
                              </button>
                            )}
                          </td>
                          <td style={{ padding: '10px' }}>
                            {r.status === 'pending' && (
                              <button onClick={() => onCancel(r.id)}
                                style={{ padding: '4px 10px', background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FCA5A5', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                                Cancel
                              </button>
                            )}
                            {r.reviewer_note && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Note: <em>{r.reviewer_note}</em></div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Receipt preview modal */}
      {previewUrl && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', zIndex: 60 }} onClick={() => setPreviewUrl(null)}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewUrl(null)} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            {previewUrl.toLowerCase().endsWith('.pdf')
              ? <iframe src={apiBase + previewUrl} style={{ width: '80vw', height: '80vh', border: 'none' }} />
              : <img src={apiBase + previewUrl} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 8 }} />
            }
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Summary Cards ─── */
function SummaryCards({ expenses }) {
  const totals = { pending: 0, approved: 0, rejected: 0 };
  expenses.forEach(e => { if (totals[e.status] !== undefined) totals[e.status] += Number(e.amount); });

  const cards = [
    { label: 'Pending', amount: totals.pending, color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Approved', amount: totals.approved, color: '#10B981', bg: '#ECFDF5' },
    { label: 'Rejected', amount: totals.rejected, color: '#EF4444', bg: '#FEF2F2' },
    { label: 'Total Claims', amount: expenses.length, color: BRAND, bg: BRAND_LIGHT, isCount: true },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 20 }}>
      {cards.map(c => (
        <div key={c.label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 6 }}>{c.label}</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: c.color }}>
            {c.isCount ? c.amount : fmtCurrency(c.amount)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Page ─── */
export default function ExpensePage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.authFetchJSON('/api/employees/expenses/my', { method: 'GET' });
      setExpenses(res?.data || []);
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this expense claim?')) return;
    try {
      await api.authFetchJSON(`/api/employees/expenses/${id}/cancel`, { method: 'DELETE' });
      loadAll();
    } catch (e) { alert(e.message || 'Failed'); }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF' }}>
        <Hourglass size={28} style={{ marginBottom: 8 }} /><div>Loading expenses…</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
        padding: '16px 20px', background: '#fff', borderRadius: 12,
        border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: BRAND_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Receipt size={22} color={BRAND} />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#111827' }}>Expense Claims</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 1 }}>Submit and track your expense reimbursements</div>
        </div>
      </div>

      <SummaryCards expenses={expenses} />
      <ExpenseForm onSubmitted={loadAll} />
      <MyExpenses expenses={expenses} onCancel={handleCancel} />
    </div>
  );
}
