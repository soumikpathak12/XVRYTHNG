import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../services/api.js';
import {
  ClipboardCheck, ThumbsUp, ThumbsDown, Hourglass, CheckCircle, XCircle,
  PalmtreeIcon, Receipt, Clock3, Search, ChevronDown, ChevronUp,
  AlertCircle, Eye, Calendar, DollarSign, User,
} from 'lucide-react';

// ── Brand palette ─────────────────────────────────────────────────────────────
const BRAND      = '#146b6b';
const BRAND_DARK = '#0d4f4f';
const BRAND_LIGHT= '#e8f4f4';
const BRAND_MID  = '#8fb3b3';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtTime     = iso => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
const fmtDate     = iso => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const fmtDateTime = iso => iso ? `${fmtDate(iso)}, ${fmtTime(iso)}` : '-';
const fmtCurrency = amt  => `₹${Number(amt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const relTime = iso => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const LEAVE_META = {
  annual:   { label: 'Annual',   color: '#3B82F6', bg: '#EFF6FF' },
  sick:     { label: 'Sick',     color: '#EF4444', bg: '#FEF2F2' },
  personal: { label: 'Personal', color: '#8B5CF6', bg: '#F5F3FF' },
  unpaid:   { label: 'Unpaid',   color: '#6B7280', bg: '#F9FAFB' },
};
const EXP_META = {
  travel:    { label: 'Travel',    color: '#3B82F6', bg: '#EFF6FF' },
  materials: { label: 'Materials', color: '#F59E0B', bg: '#FFFBEB' },
  equipment: { label: 'Equipment', color: '#8B5CF6', bg: '#F5F3FF' },
  other:     { label: 'Other',     color: '#6B7280', bg: '#F9FAFB' },
};

const STATUS_META = {
  pending:   { label: 'Pending',   bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },
  approved:  { label: 'Approved',  bg: '#DCFCE7', color: '#166534', dot: '#22C55E' },
  rejected:  { label: 'Rejected',  bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' },
  cancelled: { label: 'Cancelled', bg: '#F3F4F6', color: '#6B7280', dot: '#9CA3AF' },
};

const TYPE_META = {
  leave:      { label: 'Leave',           icon: PalmtreeIcon, color: '#8B5CF6', bg: '#F5F3FF' },
  expense:    { label: 'Expense',         icon: Receipt,      color: '#F59E0B', bg: '#FFFBEB' },
  attendance: { label: 'Attendance Edit', icon: Clock3,       color: '#3B82F6', bg: '#EFF6FF' },
};

// ── Small reusable components ─────────────────────────────────────────────────
function StatusBadge({ status }) {
  const m = STATUS_META[status] ?? STATUS_META.cancelled;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: m.bg, color: m.color, padding: '3px 10px',
      borderRadius: 999, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: m.dot }} />
      {m.label}
    </span>
  );
}

function TypeChip({ type }) {
  const m = TYPE_META[type] ?? {};
  const Icon = m.icon ?? ClipboardCheck;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: m.bg ?? '#F3F4F6', color: m.color ?? '#374151',
      padding: '2px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700,
    }}>
      <Icon size={11} /> {m.label ?? type}
    </span>
  );
}

function InfoBox({ label, children, accent }) {
  return (
    <div style={{
      background: accent ? BRAND_LIGHT : '#F9FAFB',
      border: `1px solid ${accent ? BRAND_MID : '#E5E7EB'}`,
      borderRadius: 10, padding: '10px 14px',
    }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: accent ? BRAND : '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

function ReviewNote({ noteKey, notes, onChange }) {
  return (
    <textarea
      placeholder="Manager comment (required)…"
      value={notes[noteKey] || ''}
      onChange={e => onChange(noteKey, e.target.value)}
      style={{
        width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB',
        borderRadius: 8, fontSize: 13, minHeight: 48, resize: 'vertical',
        boxSizing: 'border-box', outline: 'none', color: '#374151',
        fontFamily: 'inherit',
      }}
    />
  );
}

function ActionRow({ itemId, itemType, busy, canAct, onReview }) {
  const isApproving = busy === `${itemId}-${itemType}-approved`;
  const isRejecting = busy === `${itemId}-${itemType}-rejected`;
  const disabled = !!busy || !canAct;
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <button
        onClick={() => onReview(itemId, itemType, 'approved')}
        disabled={disabled}
        style={{
          flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
          background: disabled ? '#9CA3AF' : BRAND,
          color: '#fff', fontWeight: 700, fontSize: 14,
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'background .15s',
        }}
        onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = BRAND_DARK; }}
        onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = BRAND; }}
      >
        <ThumbsUp size={15} />
        {isApproving ? 'Approving…' : 'Approve'}
      </button>
      <button
        onClick={() => onReview(itemId, itemType, 'rejected')}
        disabled={disabled}
        style={{
          flex: 1, padding: '10px 0', borderRadius: 8,
          border: '1.5px solid #FCA5A5',
          background: '#fff', color: '#B91C1C',
          fontWeight: 700, fontSize: 14,
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'background .15s',
        }}
        onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = '#FEF2F2'; }}
        onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = '#fff'; }}
      >
        <ThumbsDown size={15} />
        {isRejecting ? 'Rejecting…' : 'Reject'}
      </button>
    </div>
  );
}

// ── Card components (one per type) ────────────────────────────────────────────
function LeaveCard({ item, busy, notes, onNoteChange, onReview }) {
  const [open, setOpen] = useState(true);
  const meta = LEAVE_META[item.leave_type] ?? { label: item.leave_type, color: '#6B7280', bg: '#F9FAFB' };
  const noteKey = `leave-${item.id}`;
  const canAct = String(notes[noteKey] || '').trim().length > 0;

  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden', marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      {/* Card header */}
      <div
        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <PalmtreeIcon size={18} color={meta.color} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>{item.employee_name}</span>
              {item.employee_code && <span style={{ fontSize: 11, fontWeight: 600, background: BRAND_LIGHT, color: BRAND, padding: '2px 7px', borderRadius: 6 }}>{item.employee_code}</span>}
              {item.company_name && <span style={{ fontSize: 12, color: '#9CA3AF' }}>· {item.company_name}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <TypeChip type="leave" />
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: meta.bg, color: meta.color }}>{meta.label} Leave</span>
              <StatusBadge status={item.status} />
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{relTime(item.created_at)}</span>
            </div>
          </div>
        </div>
        {open ? <ChevronUp size={18} color="#9CA3AF" style={{ flexShrink: 0, marginTop: 6 }} /> : <ChevronDown size={18} color="#9CA3AF" style={{ flexShrink: 0, marginTop: 6 }} />}
      </div>

      {open && (
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 14 }}>
            <InfoBox label="Leave Period">
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                <Calendar size={12} style={{ verticalAlign: 'middle', marginRight: 4, color: '#6B7280' }} />
                {fmtDate(item.start_date)}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>to {fmtDate(item.end_date)}</div>
            </InfoBox>
            <InfoBox label="Days Requested" accent>
              <div style={{ fontSize: 26, fontWeight: 900, color: BRAND, lineHeight: 1 }}>{Number(item.days_count)}</div>
              <div style={{ fontSize: 11, color: BRAND_MID, marginTop: 2 }}>working days</div>
            </InfoBox>
            <InfoBox label="Submitted">
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{fmtDateTime(item.created_at)}</div>
            </InfoBox>
          </div>

          <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#374151', marginBottom: 14 }}>
            <span style={{ fontWeight: 700, color: '#111827' }}>Reason: </span>{item.reason}
          </div>

          {item.reviewer_note && item.status !== 'pending' && (
            <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#0C4A6E', marginBottom: 14 }}>
              <span style={{ fontWeight: 700 }}>Reviewer note: </span>{item.reviewer_note}
            </div>
          )}

          {item.status === 'pending' && (
            <>
              <div style={{ marginBottom: 10 }}>
                <ReviewNote noteKey={noteKey} notes={notes} onChange={onNoteChange} />
                {!canAct && (
                  <div style={{ marginTop: 6, fontSize: 12, color: '#B91C1C', fontWeight: 600 }}>
                    Comment is required to approve or reject.
                  </div>
                )}
              </div>
              <ActionRow itemId={item.id} itemType="leave" busy={busy} canAct={canAct} onReview={onReview} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ExpenseCard({ item, busy, notes, onNoteChange, onReview }) {
  const [open, setOpen] = useState(true);
  const meta = EXP_META[item.category] ?? { label: item.category, color: '#6B7280', bg: '#F9FAFB' };
  const noteKey = `exp-${item.id}`;
  const canAct = String(notes[noteKey] || '').trim().length > 0;

  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden', marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div
        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Receipt size={18} color={meta.color} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>{item.employee_name}</span>
              {item.employee_code && <span style={{ fontSize: 11, fontWeight: 600, background: BRAND_LIGHT, color: BRAND, padding: '2px 7px', borderRadius: 6 }}>{item.employee_code}</span>}
              {item.company_name && <span style={{ fontSize: 12, color: '#9CA3AF' }}>· {item.company_name}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <TypeChip type="expense" />
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: meta.bg, color: meta.color }}>{meta.label}</span>
              <StatusBadge status={item.status} />
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{relTime(item.created_at)}</span>
            </div>
          </div>
        </div>
        {open ? <ChevronUp size={18} color="#9CA3AF" style={{ flexShrink: 0, marginTop: 6 }} /> : <ChevronDown size={18} color="#9CA3AF" style={{ flexShrink: 0, marginTop: 6 }} />}
      </div>

      {open && (
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 14 }}>
            <InfoBox label="Amount" accent>
              <div style={{ fontSize: 24, fontWeight: 900, color: BRAND, lineHeight: 1 }}>{fmtCurrency(item.amount)}</div>
              <div style={{ fontSize: 11, color: BRAND_MID, marginTop: 2 }}>{item.currency || 'INR'}</div>
            </InfoBox>
            <InfoBox label="Expense Date">
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                <Calendar size={12} style={{ verticalAlign: 'middle', marginRight: 4, color: '#6B7280' }} />
                {fmtDate(item.expense_date)}
              </div>
            </InfoBox>
            {item.project_name && (
              <InfoBox label="Project">
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{item.project_name}</div>
              </InfoBox>
            )}
          </div>

          <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#374151', marginBottom: 14 }}>
            <span style={{ fontWeight: 700, color: '#111827' }}>Description: </span>{item.description}
          </div>

          {item.receipt_path && (
            <a href={item.receipt_path} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: BRAND, marginBottom: 14, textDecoration: 'none' }}>
              <Eye size={14} /> View Receipt
            </a>
          )}

          {item.reviewer_note && item.status !== 'pending' && (
            <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#0C4A6E', marginBottom: 14 }}>
              <span style={{ fontWeight: 700 }}>Reviewer note: </span>{item.reviewer_note}
            </div>
          )}

          {item.status === 'pending' && (
            <>
              <div style={{ marginBottom: 10 }}>
                <ReviewNote noteKey={noteKey} notes={notes} onChange={onNoteChange} />
                {!canAct && (
                  <div style={{ marginTop: 6, fontSize: 12, color: '#B91C1C', fontWeight: 600 }}>
                    Comment is required to approve or reject.
                  </div>
                )}
              </div>
              <ActionRow itemId={item.id} itemType="expense" busy={busy} canAct={canAct} onReview={onReview} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AttendanceCard({ item, busy, notes, onNoteChange, onReview }) {
  const [open, setOpen] = useState(true);
  const noteKey = `att-${item.id}`;
  const canAct = String(notes[noteKey] || '').trim().length > 0;

  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden', marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div
        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock3 size={18} color="#3B82F6" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>{item.employee_name}</span>
              {item.employee_code && <span style={{ fontSize: 11, fontWeight: 600, background: BRAND_LIGHT, color: BRAND, padding: '2px 7px', borderRadius: 6 }}>{item.employee_code}</span>}
              {item.company_name && <span style={{ fontSize: 12, color: '#9CA3AF' }}>· {item.company_name}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <TypeChip type="attendance" />
              <StatusBadge status={item.status} />
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{relTime(item.created_at)}</span>
            </div>
          </div>
        </div>
        {open ? <ChevronUp size={18} color="#9CA3AF" style={{ flexShrink: 0, marginTop: 6 }} /> : <ChevronDown size={18} color="#9CA3AF" style={{ flexShrink: 0, marginTop: 6 }} />}
      </div>

      {open && (
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <InfoBox label="Original Record">
              <div style={{ fontSize: 13, color: '#374151', display: 'grid', gap: 5 }}>
                <div>Check In: <strong>{fmtTime(item.orig_check_in)}</strong></div>
                <div>Check Out: <strong>{fmtTime(item.orig_check_out)}</strong></div>
                <div>Hours: <strong>{item.orig_hours ? Number(item.orig_hours).toFixed(2) : '—'}</strong></div>
              </div>
            </InfoBox>
            <InfoBox label="Requested Correction" accent>
              <div style={{ fontSize: 13, color: '#374151', display: 'grid', gap: 5 }}>
                <div>Check In: <strong style={{ color: BRAND }}>{fmtTime(item.req_check_in)}</strong></div>
                <div>Check Out: <strong style={{ color: BRAND }}>{fmtTime(item.req_check_out)}</strong></div>
              </div>
            </InfoBox>
          </div>

          <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#374151', marginBottom: 14 }}>
            <span style={{ fontWeight: 700, color: '#111827' }}>Reason: </span>{item.reason}
          </div>

          {item.reviewer_note && item.status !== 'pending' && (
            <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#0C4A6E', marginBottom: 14 }}>
              <span style={{ fontWeight: 700 }}>Reviewer note: </span>{item.reviewer_note}
            </div>
          )}

          {item.status === 'pending' && (
            <>
              <div style={{ marginBottom: 10 }}>
                <ReviewNote noteKey={noteKey} notes={notes} onChange={onNoteChange} />
                {!canAct && (
                  <div style={{ marginTop: 6, fontSize: 12, color: '#B91C1C', fontWeight: 600 }}>
                    Comment is required to approve or reject.
                  </div>
                )}
              </div>
              <ActionRow itemId={item.id} itemType="attendance" busy={busy} canAct={canAct} onReview={onReview} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const TYPE_TABS = [
  { key: 'all',        label: 'All',            icon: ClipboardCheck },
  { key: 'leave',      label: 'Leave',          icon: PalmtreeIcon   },
  { key: 'expense',    label: 'Expense',        icon: Receipt        },
  { key: 'attendance', label: 'Attendance Edit',icon: Clock3         },
];

const STATUS_FILTERS = [
  { key: 'pending',  label: 'Pending'  },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export default function ApprovalsPage() {
  const [items, setItems]         = useState([]);
  const [counts, setCounts]       = useState({ pending: 0, by_type: {} });
  const [loading, setLoading]     = useState(false);
  const [typeTab, setTypeTab]     = useState('all');
  const [statusFilter, setStatus] = useState('pending');
  const [search, setSearch]       = useState('');
  const [notes, setNotes]         = useState({});
  const [busy, setBusy]           = useState(null);
  const [toast, setToast]         = useState(null); // { type: 'success'|'error', msg }
  const toastTimer = useRef(null);

  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeTab !== 'all')   params.type   = typeTab;
      if (statusFilter)        params.status = statusFilter;

      const [listRes, countRes] = await Promise.allSettled([
        api.listApprovals(params),
        api.getApprovalsPendingCount(),
      ]);
      if (listRes.status === 'fulfilled')  setItems(listRes.value?.data  ?? []);
      if (countRes.status === 'fulfilled') setCounts(countRes.value ?? { pending: 0, by_type: {} });
    } finally {
      setLoading(false);
    }
  }, [typeTab, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleNoteChange = useCallback((key, val) => {
    setNotes(prev => ({ ...prev, [key]: val }));
  }, []);

  const handleReview = useCallback(async (itemId, itemType, action) => {
    setBusy(`${itemId}-${itemType}-${action}`);
    try {
      const noteKey = `${itemType === 'attendance' ? 'att' : itemType === 'expense' ? 'exp' : 'leave'}-${itemId}`;
      const comment = String(notes[noteKey] || '').trim();
      if (!comment) {
        showToast('error', 'Comment is required.');
        return;
      }

      await api.decideApproval(itemType, itemId, { action, comment });

      showToast('success', `Request ${action} successfully.`);
      load();
    } catch (e) {
      showToast('error', e.message || 'Action failed.');
    } finally {
      setBusy(null);
    }
  }, [notes, load, showToast]);

  // Local search filter (across name, code, company, reason, description)
  const visible = items.filter(item => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [item.employee_name, item.employee_code, item.company_name, item.reason, item.description]
      .filter(Boolean).some(v => v.toLowerCase().includes(q));
  });

  const pendingByType = counts.by_type ?? {};
  const totalPending  = counts.pending ?? 0;

  return (
    <div style={{ padding: '1.5rem', width: '100%', boxSizing: 'border-box' }}>

      {/* ── Page header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, padding: '16px 20px',
        background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: BRAND_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardCheck size={22} color={BRAND} />
          </div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 900, color: '#111827' }}>Approvals</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginTop: 1 }}>
              Manage leave, expense, and attendance requests
            </div>
          </div>
        </div>
        {totalPending > 0 && (
          <span style={{
            background: '#FEE2E2', color: '#B91C1C', borderRadius: 999,
            padding: '6px 16px', fontSize: 13, fontWeight: 800,
            border: '1px solid #FCA5A5', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <AlertCircle size={14} />
            {totalPending} pending
          </span>
        )}
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          padding: '11px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
          background: toast.type === 'success' ? '#DCFCE7' : '#FEE2E2',
          color:      toast.type === 'success' ? '#166534' : '#991B1B',
          border:    `1px solid ${toast.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
        }}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── Type tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {TYPE_TABS.map(({ key, label, icon: Icon }) => {
          const badgeCount = key === 'all'
            ? totalPending
            : pendingByType[key] ?? 0;
          const active = typeTab === key;
          return (
            <button
              key={key}
              onClick={() => setTypeTab(key)}
              style={{
                padding: '8px 16px', borderRadius: 10, border: `1.5px solid ${active ? BRAND : '#E5E7EB'}`,
                background: active ? BRAND : '#fff', color: active ? '#fff' : '#374151',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all .15s',
              }}
            >
              <Icon size={14} />
              {label}
              {badgeCount > 0 && statusFilter === 'pending' && (
                <span style={{
                  background: active ? 'rgba(255,255,255,.25)' : '#FEE2E2',
                  color: active ? '#fff' : '#B91C1C',
                  borderRadius: 999, padding: '1px 7px', fontSize: 11, fontWeight: 800,
                }}>
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Toolbar (status filter + search) ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Status pills */}
        <div style={{ display: 'flex', gap: 6, background: '#F3F4F6', borderRadius: 10, padding: '4px 6px' }}>
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatus(key)}
              style={{
                padding: '5px 14px', borderRadius: 8, border: 'none',
                background: statusFilter === key ? '#fff' : 'transparent',
                color: statusFilter === key ? '#111827' : '#6B7280',
                fontWeight: statusFilter === key ? 700 : 500,
                fontSize: 13, cursor: 'pointer',
                boxShadow: statusFilter === key ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                transition: 'all .15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Search by name, code, reason…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px 8px 34px', borderRadius: 10,
              border: '1.5px solid #E5E7EB', fontSize: 13, outline: 'none',
              boxSizing: 'border-box', color: '#374151',
            }}
          />
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 70, color: '#9CA3AF' }}>
          <Hourglass size={30} style={{ marginBottom: 10, color: BRAND_MID }} />
          <div style={{ fontSize: 14 }}>Loading…</div>
        </div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 70, background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', color: '#9CA3AF' }}>
          <CheckCircle size={48} color={BRAND_MID} style={{ marginBottom: 14 }} />
          <div style={{ fontSize: 17, fontWeight: 700, color: '#374151' }}>All caught up!</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>
            {search
              ? 'No results match your search.'
              : statusFilter === 'pending'
                ? 'No pending approvals.'
                : `No ${statusFilter} requests found.`}
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12, fontWeight: 600 }}>
            Showing {visible.length} request{visible.length !== 1 ? 's' : ''}
          </div>
          {visible.map(item => {
            if (item._type === 'leave') {
              return <LeaveCard key={`leave-${item.id}`} item={item} busy={busy} notes={notes} onNoteChange={handleNoteChange} onReview={handleReview} />;
            }
            if (item._type === 'expense') {
              return <ExpenseCard key={`expense-${item.id}`} item={item} busy={busy} notes={notes} onNoteChange={handleNoteChange} onReview={handleReview} />;
            }
            if (item._type === 'attendance') {
              return <AttendanceCard key={`attendance-${item.id}`} item={item} busy={busy} notes={notes} onNoteChange={handleNoteChange} onReview={handleReview} />;
            }
            return null;
          })}
        </>
      )}
    </div>
  );
}
