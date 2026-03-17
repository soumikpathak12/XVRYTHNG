import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import * as api from '../../services/api.js';
import {
  CalendarDays, Clock, Send, X, AlertCircle, CheckCircle,
  ChevronDown, ChevronUp, XCircle, Hourglass, PalmtreeIcon,
} from 'lucide-react';

const BRAND = '#146b6b';
const BRAND_LIGHT = '#e8f4f4';
const BRAND_MID = '#8fb3b3';

const LEAVE_TYPES = [
  { value: 'annual',   label: 'Annual Leave',   color: '#3B82F6' },
  { value: 'sick',     label: 'Sick Leave',     color: '#EF4444' },
  { value: 'personal', label: 'Personal Leave', color: '#8B5CF6' },
  { value: 'unpaid',   label: 'Unpaid Leave',   color: '#6B7280' },
];

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const statusBadge = (s) => {
  const map = {
    pending:   ['#FEF3C7', '#92400E'],
    approved:  ['#DCFCE7', '#166534'],
    rejected:  ['#FEE2E2', '#991B1B'],
    cancelled: ['#F3F4F6', '#6B7280'],
  };
  const [bg, fg] = map[s] ?? ['#F3F4F6', '#374151'];
  return (
    <span style={{ background: bg, color: fg, padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {s}
    </span>
  );
};

function businessDays(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start), e = new Date(end);
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/* ─── Balance Cards ─── */
function BalanceCards({ balances }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
      {LEAVE_TYPES.map(lt => {
        const bal = balances.find(b => b.leave_type === lt.value);
        const total = bal ? Number(bal.total_days) : 0;
        const used  = bal ? Number(bal.used_days) : 0;
        const remaining = total - used;
        const pct = total > 0 ? (used / total) * 100 : 0;

        return (
          <div key={lt.value} style={{
            background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
            padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: 999, background: lt.color }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{lt.label}</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#111827', marginBottom: 4 }}>
              {remaining}
              <span style={{ fontSize: 13, fontWeight: 500, color: '#9CA3AF' }}> / {total}</span>
            </div>
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>{used} used</div>
            {lt.value !== 'unpaid' && (
              <div style={{ height: 4, borderRadius: 999, background: '#F3F4F6', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: lt.color, borderRadius: 999, transition: 'width 0.3s' }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Leave Request Form ─── */
function LeaveRequestForm({ balances, onSubmitted }) {
  const [leaveType, setLeaveType] = useState('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState(false);

  const days = businessDays(startDate, endDate);
  const bal = balances.find(b => b.leave_type === leaveType);
  const remaining = bal ? bal.remaining : 0;
  const afterRequest = remaining - days;

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setSuccess(false);
    if (!startDate || !endDate) { setErr('Please select both dates.'); return; }
    if (!reason.trim()) { setErr('Please provide a reason.'); return; }
    if (days <= 0) { setErr('Selected dates contain no working days.'); return; }
    if (leaveType !== 'unpaid' && afterRequest < 0) { setErr(`Insufficient balance (${remaining} days remaining).`); return; }

    try {
      setSaving(true);
      await api.authFetchJSON('/api/employees/leave/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaveType, startDate, endDate, reason }),
      });
      setSuccess(true);
      setLeaveType('annual'); setStartDate(''); setEndDate(''); setReason('');
      onSubmitted?.();
    } catch (e) {
      setErr(e.message || 'Failed to submit request.');
    } finally { setSaving(false); }
  };

  const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none' };
  const labelStyle = { fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 };

  return (
    <div style={{
      background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
      padding: 20, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Send size={18} color={BRAND} /> Apply for Leave
      </div>

      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <div>
            <label style={labelStyle}>Leave Type *</label>
            <select style={inputStyle} value={leaveType} onChange={e => setLeaveType(e.target.value)}>
              {LEAVE_TYPES.map(lt => (
                <option key={lt.value} value={lt.value}>{lt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Start Date *</label>
            <input type="date" style={inputStyle} value={startDate} onChange={e => setStartDate(e.target.value)} required />
          </div>
          <div>
            <label style={labelStyle}>End Date *</label>
            <input type="date" style={inputStyle} value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} required />
          </div>
        </div>

        {/* Balance preview */}
        {days > 0 && leaveType !== 'unpaid' && (
          <div style={{
            background: BRAND_LIGHT, border: `1px solid ${BRAND_MID}`, borderRadius: 8,
            padding: '10px 14px', fontSize: 13, color: '#374151',
            display: 'flex', gap: 24, flexWrap: 'wrap',
          }}>
            <div>Working days: <strong>{days}</strong></div>
            <div>Current balance: <strong>{remaining}</strong></div>
            <div>
              After request:{' '}
              <strong style={{ color: afterRequest < 0 ? '#B91C1C' : BRAND }}>
                {afterRequest}
              </strong>
            </div>
          </div>
        )}

        <div>
          <label style={labelStyle}>Reason *</label>
          <textarea
            style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
            placeholder="e.g. Family wedding, medical appointment, personal work…"
            value={reason} onChange={e => setReason(e.target.value)} required
          />
        </div>

        {err && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#B91C1C', fontSize: 13 }}>
            <AlertCircle size={14} />{err}
          </div>
        )}
        {success && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#166534', fontSize: 13 }}>
            <CheckCircle size={14} />Leave request submitted successfully! It is now pending approval.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="submit" disabled={saving}
            style={{
              padding: '8px 24px', background: saving ? '#9CA3AF' : BRAND, color: '#fff',
              border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14,
              cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <Send size={14} />
            {saving ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─── My Leave Requests ─── */
function MyLeaveRequests({ requests, onCancel }) {
  const [open, setOpen] = useState(true);

  return (
    <div style={{
      background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
      overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <button onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 15, color: '#111827',
        }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarDays size={18} color={BRAND} />
          My Leave Requests ({requests.length})
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div style={{ padding: '0 16px 16px' }}>
          {requests.length === 0 ? (
            <div style={{ color: '#9CA3AF', fontSize: 13, padding: 12 }}>No leave requests yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                    {['Type', 'From', 'To', 'Days', 'Status', 'Reason', 'Action'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#6B7280', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.map(r => {
                    const lt = LEAVE_TYPES.find(t => t.value === r.leave_type);
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 6, height: 6, borderRadius: 999, background: lt?.color || '#6B7280' }} />
                            {lt?.label || r.leave_type}
                          </div>
                        </td>
                        <td style={{ padding: '10px' }}>{fmtDate(r.start_date)}</td>
                        <td style={{ padding: '10px' }}>{fmtDate(r.end_date)}</td>
                        <td style={{ padding: '10px', fontWeight: 700 }}>{Number(r.days_count)}</td>
                        <td style={{ padding: '10px' }}>{statusBadge(r.status)}</td>
                        <td style={{ padding: '10px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.reason}
                        </td>
                        <td style={{ padding: '10px' }}>
                          {r.status === 'pending' && (
                            <button onClick={() => onCancel(r.id)}
                              style={{
                                padding: '4px 10px', background: '#FEF2F2', color: '#B91C1C',
                                border: '1px solid #FCA5A5', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                cursor: 'pointer',
                              }}>
                              Cancel
                            </button>
                          )}
                          {r.reviewer_note && (
                            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                              Note: <em>{r.reviewer_note}</em>
                            </div>
                          )}
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
  );
}

/* ─── Main Page ─── */
export default function LeavePage() {
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [balRes, reqRes] = await Promise.all([
        api.authFetchJSON('/api/employees/leave/balances', { method: 'GET' }),
        api.authFetchJSON('/api/employees/leave/my-requests', { method: 'GET' }),
      ]);
      setBalances(balRes?.data || []);
      setRequests(reqRes?.data || []);
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this leave request?')) return;
    try {
      await api.authFetchJSON(`/api/employees/leave/${id}/cancel`, { method: 'DELETE' });
      loadAll();
    } catch (e) { alert(e.message || 'Failed to cancel'); }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF' }}>
        <Hourglass size={28} style={{ marginBottom: 8 }} />
        <div>Loading leave data…</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
        padding: '16px 20px', background: '#fff', borderRadius: 12,
        border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: BRAND_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <PalmtreeIcon size={22} color={BRAND} />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#111827' }}>Leave Management</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 1 }}>View balances, apply for leave, and track requests</div>
        </div>
      </div>

      <BalanceCards balances={balances} />
      <LeaveRequestForm balances={balances} onSubmitted={loadAll} />
      <MyLeaveRequests requests={requests} onCancel={handleCancel} />
    </div>
  );
}
