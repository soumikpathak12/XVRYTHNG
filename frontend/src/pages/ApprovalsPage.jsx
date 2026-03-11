import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api.js';
import {
  ThumbsUp, ThumbsDown, Hourglass, CheckCircle, XCircle,
  ClipboardCheck, PalmtreeIcon, Receipt, Eye,
} from 'lucide-react';

const BRAND = '#146b6b';
const BRAND_LIGHT = '#e8f4f4';
const BRAND_MID = '#8fb3b3';

const fmt = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const fmtDateTime = (iso) => iso ? `${fmtDate(iso)} ${fmt(iso)}` : '-';
const fmtCurrency = (amt) => `₹${Number(amt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const LEAVE_COLORS = { annual: '#3B82F6', sick: '#EF4444', personal: '#8B5CF6', unpaid: '#6B7280' };
const LEAVE_LABELS = { annual: 'Annual', sick: 'Sick', personal: 'Personal', unpaid: 'Unpaid' };
const EXP_COLORS  = { travel: '#3B82F6', materials: '#F59E0B', equipment: '#8B5CF6', other: '#6B7280' };
const EXP_LABELS  = { travel: 'Travel', materials: 'Materials', equipment: 'Equipment', other: 'Other' };

const statusBadge = (s) => {
  const map = { pending: ['#FEF3C7', '#92400E'], approved: ['#DCFCE7', '#166534'], rejected: ['#FEE2E2', '#991B1B'], cancelled: ['#F3F4F6', '#6B7280'] };
  const [bg, fg] = map[s] ?? ['#F3F4F6', '#374151'];
  return <span style={{ background: bg, color: fg, padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s}</span>;
};

const ActionButtons = ({ id, actionBusy, onReview }) => (
  <div style={{ display: 'flex', gap: 10 }}>
    <button onClick={() => onReview(id, 'approved')} disabled={!!actionBusy}
      style={{ flex: 1, padding: '10px 0', background: actionBusy ? '#9CA3AF' : BRAND, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: actionBusy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'background 0.15s' }}>
      <ThumbsUp size={16} />{actionBusy === id + 'approved' ? 'Approving…' : 'Approve'}
    </button>
    <button onClick={() => onReview(id, 'rejected')} disabled={!!actionBusy}
      style={{ flex: 1, padding: '10px 0', background: '#fff', color: '#B91C1C', border: '1.5px solid #FCA5A5', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: actionBusy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'background 0.15s' }}>
      <ThumbsDown size={16} />{actionBusy === id + 'rejected' ? 'Rejecting…' : 'Reject'}
    </button>
  </div>
);

export default function ApprovalsPage() {
  const [attPending, setAttPending] = useState([]);
  const [lvPending, setLvPending] = useState([]);
  const [expPending, setExpPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState({});
  const [section, setSection] = useState('leave');
  const [actionBusy, setActionBusy] = useState(null);
  const [flash, setFlash] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [attRes, lvRes, expRes] = await Promise.allSettled([
        api.authFetchJSON('/api/employees/attendance/edit-requests/pending', { method: 'GET' }),
        api.authFetchJSON('/api/employees/leave/pending', { method: 'GET' }),
        api.authFetchJSON('/api/employees/expenses/pending', { method: 'GET' }),
      ]);
      setAttPending(attRes.status === 'fulfilled' ? (attRes.value?.data || []) : []);
      setLvPending(lvRes.status === 'fulfilled' ? (lvRes.value?.data || []) : []);
      setExpPending(expRes.status === 'fulfilled' ? (expRes.value?.data || []) : []);
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const makeReviewFn = (urlFn) => async (id, action) => {
    setActionBusy(id + action);
    try {
      await api.authFetchJSON(urlFn(id), {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reviewerNote: note[section + '-' + id] || '' }),
      });
      showFlash(action); loadAll();
    } catch (e) { alert(e.message || 'Failed'); }
    finally { setActionBusy(null); }
  };

  const reviewAttendance = makeReviewFn(id => `/api/employees/attendance/edit-requests/${id}`);
  const reviewLeave = makeReviewFn(id => `/api/employees/leave/${id}/review`);
  const reviewExpense = makeReviewFn(id => `/api/employees/expenses/${id}/review`);

  const showFlash = (action) => { setFlash(action); setTimeout(() => setFlash(null), 3000); };

  const totalPending = attPending.length + lvPending.length + expPending.length;

  const tabBtn = (active, count) => ({
    padding: '8px 20px', border: `1.5px solid ${active ? BRAND : '#E5E7EB'}`, borderRadius: 8,
    cursor: 'pointer', fontWeight: 700, fontSize: 13,
    background: active ? BRAND : '#fff', color: active ? '#fff' : '#374151',
    transition: 'all 0.15s', position: 'relative',
  });

  const noteInput = (key) => (
    <textarea placeholder="Optional reviewer note…" value={note[key] || ''}
      onChange={e => setNote(prev => ({ ...prev, [key]: e.target.value }))}
      style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, minHeight: 48, resize: 'vertical', marginBottom: 12, boxSizing: 'border-box', outline: 'none' }}
    />
  );

  const emptyState = (msg) => (
    <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', color: '#9CA3AF' }}>
      <CheckCircle size={44} color={BRAND_MID} style={{ marginBottom: 12 }} />
      <div style={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>All caught up!</div>
      <div style={{ fontSize: 13, marginTop: 4 }}>{msg}</div>
    </div>
  );

  const cardHeader = (item) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>
          {item.employee_name}
          {item.employee_code && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, background: BRAND_LIGHT, color: BRAND, padding: '2px 8px', borderRadius: 6 }}>{item.employee_code}</span>}
          {item.company_name && <span style={{ marginLeft: 8, fontSize: 12, color: '#9CA3AF', fontWeight: 400 }}>· {item.company_name}</span>}
        </div>
        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Submitted: {fmtDateTime(item.created_at)}</div>
      </div>
      {statusBadge(item.status)}
    </div>
  );

  const cardStyle = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20, marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' };
  const infoBox = (label, children, opts = {}) => (
    <div style={{ background: opts.bg || '#F9FAFB', border: `1px solid ${opts.border || '#E5E7EB'}`, borderRadius: 10, padding: 14, ...opts.style }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: opts.labelColor || '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, padding: '16px 20px', background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: BRAND_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardCheck size={22} color={BRAND} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#111827' }}>Approvals</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginTop: 1 }}>Leave, attendance, and expense approvals</div>
          </div>
        </div>
        {totalPending > 0 && (
          <span style={{ background: '#FEE2E2', color: '#B91C1C', borderRadius: 999, padding: '5px 14px', fontSize: 13, fontWeight: 800, border: '1px solid #FCA5A5' }}>
            {totalPending} pending
          </span>
        )}
      </div>

      {/* Flash */}
      {flash && (
        <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14, fontWeight: 600, background: flash === 'approved' ? '#DCFCE7' : '#FEE2E2', color: flash === 'approved' ? '#166534' : '#991B1B', display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${flash === 'approved' ? '#86EFAC' : '#FCA5A5'}` }}>
          {flash === 'approved' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          Request <strong>{flash}</strong> successfully.
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button style={tabBtn(section === 'leave')} onClick={() => setSection('leave')}>
          <PalmtreeIcon size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Leave {lvPending.length > 0 && `(${lvPending.length})`}
        </button>
        <button style={tabBtn(section === 'expenses')} onClick={() => setSection('expenses')}>
          <Receipt size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Expenses {expPending.length > 0 && `(${expPending.length})`}
        </button>
        <button style={tabBtn(section === 'attendance')} onClick={() => setSection('attendance')}>
          <ClipboardCheck size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Attendance {attPending.length > 0 && `(${attPending.length})`}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
          <Hourglass size={28} style={{ marginBottom: 8, color: BRAND_MID }} /><div>Loading…</div>
        </div>

      /* ════ LEAVE ════ */
      ) : section === 'leave' ? (
        lvPending.length === 0 ? emptyState('No pending leave requests.') :
        lvPending.map(item => (
          <div key={item.id} style={cardStyle}>
            {cardHeader(item)}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 14 }}>
              {infoBox('Leave Type',
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: '#111827' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 999, background: LEAVE_COLORS[item.leave_type] || '#6B7280' }} />
                  {LEAVE_LABELS[item.leave_type] || item.leave_type} Leave
                </div>,
                { bg: BRAND_LIGHT, border: BRAND_MID, labelColor: BRAND }
              )}
              {infoBox('Period',
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{fmtDate(item.start_date)} – {fmtDate(item.end_date)}</div>
              )}
              {infoBox('Days',
                <div style={{ fontSize: 22, fontWeight: 900, color: '#111827' }}>{Number(item.days_count)}</div>,
                { bg: '#FFFBEB', border: '#FDE68A', labelColor: '#92400E' }
              )}
            </div>
            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#374151', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, color: '#111827' }}>Reason: </span>{item.reason}
            </div>
            {noteInput('leave-' + item.id)}
            <ActionButtons id={item.id} actionBusy={actionBusy} onReview={reviewLeave} />
          </div>
        ))

      /* ════ EXPENSES ════ */
      ) : section === 'expenses' ? (
        expPending.length === 0 ? emptyState('No pending expense claims.') :
        expPending.map(item => (
          <div key={item.id} style={cardStyle}>
            {cardHeader(item)}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 14 }}>
              {infoBox('Category',
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: '#111827' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 999, background: EXP_COLORS[item.category] || '#6B7280' }} />
                  {EXP_LABELS[item.category] || item.category}
                </div>,
                { bg: BRAND_LIGHT, border: BRAND_MID, labelColor: BRAND }
              )}
              {infoBox('Amount',
                <div style={{ fontSize: 22, fontWeight: 900, color: '#111827' }}>{fmtCurrency(item.amount)}</div>,
                { bg: '#FFFBEB', border: '#FDE68A', labelColor: '#92400E' }
              )}
              {infoBox('Date',
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{fmtDate(item.expense_date)}</div>
              )}
              {item.project_name && infoBox('Project',
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{item.project_name}</div>
              )}
            </div>
            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#374151', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, color: '#111827' }}>Description: </span>{item.description}
            </div>
            {item.receipt_path && (
              <a href={item.receipt_path} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: BRAND, marginBottom: 12, textDecoration: 'none' }}>
                <Eye size={14} /> View Receipt
              </a>
            )}
            {noteInput('exp-' + item.id)}
            <ActionButtons id={item.id} actionBusy={actionBusy} onReview={reviewExpense} />
          </div>
        ))

      /* ════ ATTENDANCE ════ */
      ) : (
        attPending.length === 0 ? emptyState('No pending attendance edits.') :
        attPending.map(item => (
          <div key={item.id} style={cardStyle}>
            {cardHeader(item)}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              {infoBox('Original Record',
                <div style={{ fontSize: 13, color: '#374151', display: 'grid', gap: 4 }}>
                  <div>Check In: <strong>{fmt(item.orig_check_in)}</strong></div>
                  <div>Check Out: <strong>{fmt(item.orig_check_out)}</strong></div>
                  <div>Hours: <strong>{item.orig_hours ? Number(item.orig_hours).toFixed(2) : '—'}</strong></div>
                </div>,
                { bg: '#FFFBEB', border: '#FDE68A', labelColor: '#92400E' }
              )}
              {infoBox('Requested Correction',
                <div style={{ fontSize: 13, color: '#374151', display: 'grid', gap: 4 }}>
                  <div>Check In: <strong>{fmt(item.req_check_in)}</strong></div>
                  <div>Check Out: <strong>{fmt(item.req_check_out)}</strong></div>
                </div>,
                { bg: BRAND_LIGHT, border: BRAND_MID, labelColor: BRAND }
              )}
            </div>
            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#374151', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, color: '#111827' }}>Reason: </span>{item.reason}
            </div>
            {noteInput('att-' + item.id)}
            <ActionButtons id={item.id} actionBusy={actionBusy} onReview={reviewAttendance} />
          </div>
        ))
      )}
    </div>
  );
}
