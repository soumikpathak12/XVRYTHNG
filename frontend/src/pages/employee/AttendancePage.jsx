import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import * as api from '../../services/api.js';
import {
  MapPin, Clock, CheckCircle, LogOut, CalendarDays,
  History, AlertCircle, PencilLine, X, ChevronDown, ChevronUp,
  ThumbsUp, ThumbsDown, Hourglass
} from 'lucide-react';

/* ─────────────── helpers ─────────────── */
const fmt = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString() : '-';
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const calcDuration = (ms) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};
const statusBadge = (s) => {
  const map = { pending: ['#FEF3C7', '#92400E'], approved: ['#DCFCE7', '#166534'], rejected: ['#FEE2E2', '#991B1B'] };
  const [bg, fg] = map[s] ?? ['#F3F4F6', '#374151'];
  return <span style={{ background: bg, color: fg, padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{s}</span>;
};

/* ─────────────── Edit Request Form ─────────────── */
function EditRequestForm({ record, onClose, onSubmitted }) {
  const [reqCheckIn, setReqCheckIn] = useState(toLocalInput(record.check_in_time));
  const [reqCheckOut, setReqCheckOut] = useState(toLocalInput(record.check_out_time));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!reason.trim()) { setErr('Please provide a reason.'); return; }
    if (!reqCheckIn || !reqCheckOut) { setErr('Both corrected times are required.'); return; }
    if (new Date(reqCheckOut) <= new Date(reqCheckIn)) { setErr('Check-out must be after check-in.'); return; }
    try {
      setSaving(true);
      await api.authFetchJSON('/api/employees/attendance/edit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceId: record.id, reqCheckIn, reqCheckOut, reason }),
      });
      onSubmitted?.();
      onClose();
    } catch (e) {
      setErr(e.message || 'Failed to submit request.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' };
  const labelStyle = { fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', zIndex: 60 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 480, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#111827' }}>
            <PencilLine size={18} style={{ marginRight: 8, verticalAlign: 'middle', color: '#1A7B7B' }} />
            Request Attendance Edit
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}><X size={20} /></button>
        </div>

        {/* Original values */}
        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13 }}>
          <div style={{ fontWeight: 700, color: '#374151', marginBottom: 6 }}>📋 Original Record — {fmtDate(record.date)}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, color: '#6B7280' }}>
            <div><span style={{ fontWeight: 600 }}>Check In:</span><br />{fmt(record.check_in_time)}</div>
            <div><span style={{ fontWeight: 600 }}>Check Out:</span><br />{fmt(record.check_out_time)}</div>
            <div><span style={{ fontWeight: 600 }}>Hours:</span><br />{record.hours_worked ? Number(record.hours_worked).toFixed(2) : '-'}</div>
          </div>
        </div>

        <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Corrected Check In</label>
              <input type="datetime-local" style={inputStyle} value={reqCheckIn} onChange={e => setReqCheckIn(e.target.value)} required />
            </div>
            <div>
              <label style={labelStyle}>Corrected Check Out</label>
              <input type="datetime-local" style={inputStyle} value={reqCheckOut} onChange={e => setReqCheckOut(e.target.value)} required />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Reason *</label>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              placeholder="e.g. Forgot to check in when I arrived at 9 AM due to a fieldwork rush…"
              value={reason}
              onChange={e => setReason(e.target.value)}
              required
            />
          </div>
          {err && <div style={{ color: '#B91C1C', fontSize: 13 }}><AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />{err}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '8px 16px', background: '#fff', border: '1px solid #D1D5DB', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '8px 20px', background: saving ? '#9CA3AF' : '#1A7B7B', color: '#fff', border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700 }}>
              {saving ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────── My Edit Requests list ─────────────── */
function MyEditRequests({ companyError }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.authFetchJSON('/api/employees/attendance/edit-requests', { method: 'GET' });
      setItems(res?.data || []);
    } catch (_) { }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (items.length === 0) return null;

  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', marginTop: 8 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: '#111827' }}>
        <span><Hourglass size={16} style={{ verticalAlign: 'middle', marginRight: 6, color: '#F59E0B' }} />My Edit Requests ({items.length})</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div style={{ padding: '0 12px 12px' }}>
          {items.map(item => (
            <div key={item.id} style={{ border: '1px solid #F3F4F6', borderRadius: 8, padding: 12, marginTop: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontWeight: 700 }}>{fmtDate(item.attendance_date)}</span>
                {statusBadge(item.status)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, color: '#6B7280', marginBottom: 6 }}>
                <div><strong>Original:</strong> {fmt(item.orig_check_in)} – {fmt(item.orig_check_out)}</div>
                <div><strong>Requested:</strong> {fmt(item.req_check_in)} – {fmt(item.req_check_out)}</div>
              </div>
              <div style={{ color: '#374151' }}><strong>Reason:</strong> {item.reason}</div>
              {item.reviewer_note && <div style={{ color: '#6B7280', marginTop: 4 }}><strong>Reviewer note:</strong> {item.reviewer_note}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────── Manager Approvals Queue ─────────────── */
function ApprovalsQueue() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const [note, setNote] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.authFetchJSON('/api/employees/attendance/edit-requests/pending', { method: 'GET' });
      setItems(res?.data || []);
    } catch (_) { } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const review = async (id, action) => {
    try {
      await api.authFetchJSON(`/api/employees/attendance/edit-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reviewerNote: note[id] || '' }),
      });
      load();
    } catch (e) { alert(e.message || 'Failed'); }
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', marginTop: 16 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 15, color: '#111827' }}>
        <span>
          <Hourglass size={18} style={{ verticalAlign: 'middle', marginRight: 8, color: '#F59E0B' }} />
          Attendance Edit Approvals
          {items.length > 0 && (
            <span style={{ marginLeft: 8, background: '#EF4444', color: '#fff', borderRadius: 999, padding: '1px 8px', fontSize: 12, fontWeight: 700 }}>{items.length}</span>
          )}
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div style={{ padding: '0 16px 16px' }}>
          {loading ? <div style={{ color: '#9CA3AF', fontSize: 13 }}>Loading…</div>
            : items.length === 0 ? <div style={{ color: '#9CA3AF', fontSize: 13 }}>No pending requests 🎉</div>
              : items.map(item => (
                <div key={item.id} style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: 14, marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>{item.employee_name} <span style={{ color: '#9CA3AF', fontWeight: 400 }}>({item.employee_code})</span></div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>{fmtDate(item.attendance_date)}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13, marginBottom: 10 }}>
                    <div style={{ background: '#FEF3C7', borderRadius: 8, padding: 10 }}>
                      <div style={{ fontWeight: 700, color: '#92400E', marginBottom: 4 }}>Original</div>
                      <div>Check In: <strong>{fmt(item.orig_check_in)}</strong></div>
                      <div>Check Out: <strong>{fmt(item.orig_check_out)}</strong></div>
                      <div>Hours: <strong>{item.orig_hours ? Number(item.orig_hours).toFixed(2) : '-'}</strong></div>
                    </div>
                    <div style={{ background: '#DCFCE7', borderRadius: 8, padding: 10 }}>
                      <div style={{ fontWeight: 700, color: '#166534', marginBottom: 4 }}>Requested</div>
                      <div>Check In: <strong>{fmt(item.req_check_in)}</strong></div>
                      <div>Check Out: <strong>{fmt(item.req_check_out)}</strong></div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: '#374151', marginBottom: 10 }}>
                    <strong>Reason:</strong> {item.reason}
                  </div>
                  <textarea
                    placeholder="Optional reviewer note…"
                    value={note[item.id] || ''}
                    onChange={e => setNote(prev => ({ ...prev, [item.id]: e.target.value }))}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, minHeight: 50, resize: 'vertical', marginBottom: 10, boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => review(item.id, 'approved')}
                      style={{ flex: 1, padding: '8px 0', background: '#10B981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <ThumbsUp size={16} /> Approve
                    </button>
                    <button onClick={() => review(item.id, 'rejected')}
                      style={{ flex: 1, padding: '8px 0', background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FCA5A5', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <ThumbsDown size={16} /> Reject
                    </button>
                  </div>
                </div>
              ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────── Main Page ─────────────── */
export default function AttendancePage() {
  const { user } = useAuth();
  const isManager = ['company_admin', 'manager', 'admin', 'super_admin'].includes(user?.role);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [editRecord, setEditRecord] = useState(null); // record to edit

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.authFetchJSON('/api/employees/attendance/today', { method: 'GET' });
      setStatus(data?.data || null);
    } catch (err) { setError('Failed to load attendance status'); }
    finally { setLoading(false); }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await api.authFetchJSON('/api/employees/attendance/history', { method: 'GET' });
      setHistory(data?.data || []);
    } catch (_) { }
  }, []);

  useEffect(() => { fetchStatus(); fetchHistory(); }, [fetchStatus, fetchHistory]);

  // Live timer
  useEffect(() => {
    let interval;
    if (status?.check_in_time && !status?.check_out_time) {
      interval = setInterval(() => {
        setElapsed(Date.now() - new Date(status.check_in_time).getTime());
      }, 1000);
    } else { setElapsed(0); }
    return () => clearInterval(interval);
  }, [status]);

  const getLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) reject(new Error('Geolocation not supported'));
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => reject(err)
    );
  });

  const handleAction = async (action) => {
    setError(null); setLoading(true);
    try {
      let lat = null, lng = null;
      try { ({ lat, lng } = await getLocation()); } catch (_) { }
      await api.authFetchJSON(`/api/employees/attendance/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });
      await fetchStatus(); await fetchHistory();
    } catch (err) {
      setError(err?.message || `Failed to ${action.replace('-', ' ')}`);
    } finally { setLoading(false); }
  };

  const isCheckedIn = !!status?.check_in_time && !status?.check_out_time;

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1A1A2E' }}>Attendance</h1>

      {error && (
        <div style={{ padding: '1rem', background: '#FEE2E2', color: '#B91C1C', borderRadius: 8, display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <AlertCircle size={18} style={{ marginRight: 8 }} />{error}
        </div>
      )}

      {/* Today's Status Card */}
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.07)', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarDays size={20} color="#1A7B7B" /> Today's Status
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Check In</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={16} color="#10B981" /> {fmt(status?.check_in_time)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Check Out</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={16} color="#EF4444" /> {fmt(status?.check_out_time)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Hours</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>
              {status?.hours_worked
                ? `${Number(status.hours_worked).toFixed(2)} hr`
                : elapsed > 0 ? calcDuration(elapsed) : '--'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          {!isCheckedIn && !status?.check_out_time && (
            <button onClick={() => handleAction('check-in')} disabled={loading}
              style={{ background: '#10B981', color: '#fff', padding: '12px 36px', borderRadius: 999, fontSize: 17, fontWeight: 800, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={22} /> {loading ? 'Checking in…' : 'Check In'}
            </button>
          )}
          {isCheckedIn && (
            <button onClick={() => handleAction('check-out')} disabled={loading}
              style={{ background: '#EF4444', color: '#fff', padding: '12px 36px', borderRadius: 999, fontSize: 17, fontWeight: 800, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <LogOut size={22} /> {loading ? 'Checking out…' : 'Check Out'}
            </button>
          )}
          {status?.check_in_time && status?.check_out_time && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10B981', fontWeight: 700, fontSize: 15 }}>
              <CheckCircle size={22} /> Shift completed for today
            </div>
          )}
        </div>

        {/* "Edit Attendance" for today if hours < 8 and shift complete */}
        {status?.check_in_time && status?.check_out_time && Number(status.hours_worked) < 8 && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button onClick={() => setEditRecord(status)}
              style={{ background: '#FEF9C3', color: '#92400E', border: '1px solid #FDE68A', borderRadius: 8, padding: '6px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <PencilLine size={14} /> Edit Attendance (hours &lt; 8)
            </button>
          </div>
        )}
      </div>

      {/* My Pending Edit Requests (collapsible) */}
      <MyEditRequests />

      {/* Manager: Approvals Queue */}
      {isManager && <ApprovalsQueue />}

      {/* History Table */}
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.07)', marginTop: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <History size={18} /> Attendance History
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                {['Date', 'Check In', 'Check Out', 'Hours', 'Action'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#6B7280', fontWeight: 600, fontSize: 13 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#9CA3AF' }}>No history found</td></tr>
              ) : history.map(item => {
                const hrs = Number(item.hours_worked);
                const needsEdit = item.check_in_time && item.check_out_time && hrs < 8;
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '10px 12px' }}>{fmtDate(item.date)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {fmt(item.check_in_time)}
                        {item.check_in_lat && <MapPin size={12} color="#9CA3AF" />}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {fmt(item.check_out_time)}
                        {item.check_out_lat && <MapPin size={12} color="#9CA3AF" />}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ color: needsEdit ? '#D97706' : 'inherit', fontWeight: needsEdit ? 700 : 400 }}>
                        {item.hours_worked ? hrs.toFixed(2) : '-'}
                        {needsEdit && ' ⚠'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {needsEdit && (
                        <button onClick={() => setEditRecord(item)}
                          style={{ background: '#FEF9C3', color: '#92400E', border: '1px solid #FDE68A', borderRadius: 6, padding: '4px 10px', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <PencilLine size={12} /> Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Request Modal */}
      {editRecord && (
        <EditRequestForm
          record={editRecord}
          onClose={() => setEditRecord(null)}
          onSubmitted={() => { fetchHistory(); }}
        />
      )}
    </div>
  );
}
