// src/components/operation/ApprovalCard.jsx
import React, { useState } from 'react';
import AvatarCircle from './AvatarCircle'; // keep your existing avatar component if any

const badgeStyle = { padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700 };

function TypeBadge({ type }) {
  // Map request type to a small colored badge
  const map = {
    attendance: { text: 'Attendance Edit', bg: '#EEF2F7', color: '#334155' },
    leave:      { text: 'Leave Request',   bg: '#E6F4F1', color: '#176D6D' },
    expense:    { text: 'Expense Claim',   bg: '#FFF1F2', color: '#9F1239' },
  };
  const s = map[type] || { text: type, bg: '#E5E7EB', color: '#334155' };
  return <span style={{ ...badgeStyle, background: s.bg, color: s.color }}>{s.text}</span>;
}

/**
 * Props:
 * - item: approval record
 * - onApprove(item, comment): async
 * - onReject(item, comment): async
 */
export default function ApprovalCard({ item, onApprove, onReject }) {

  const [mode, setMode] = useState(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function start(action) {
    setMode(action);       
    setComment('');        
    setError('');         
  }
  function cancel() {
    setMode(null);
    setComment('');
    setError('');
  }

  async function confirm() {
    // Enforce mandatory comment (trimmed)
    const c = String(comment || '').trim();
    if (!c) {
      setError('Comment is required.');
      return;
    }
    try {
      setBusy(true);
      setError('');
      if (mode === 'approve') {
        await onApprove(item, c);
      } else if (mode === 'reject') {
        await onReject(item, c);
      }
      // Reset local UI state after successful action
      setMode(null);
      setComment('');
    } catch (e) {
      // Surface any error from parent
      setError(e?.message || 'Action failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="article"
      style={{
        border: '1px solid #E5E7EB',
        borderRadius: 12,
        padding: 12,
        background: '#fff',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: 12,
        alignItems: 'center'
      }}
    >
      {/* Left: requester avatar */}
      <div style={{ width: 36, height: 36 }}>
        {/* Use your existing AvatarCircle; initials fallback to first letters */}
        <AvatarCircle initials={item.requester?.initials || 'NA'} />
      </div>

      {/* Middle: content */}
      <div style={{ minWidth: 0 }}>
        {/* Name + Type badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 800, color: '#0F172A' }}>{item.requester?.name}</div>
          <TypeBadge type={item.type} />
        </div>

        {/* Title and meta */}
        {item.title && <div style={{ color: '#0F172A', marginTop: 2 }}>{item.title}</div>}
        {item.meta && <div style={{ color: '#334155', fontSize: 14, marginTop: 2 }}>{item.meta}</div>}

        {/* Subtitle (time/place/info) */}
        {item.subtitle && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: 13, marginTop: 6 }}>
            <span aria-hidden>⏱</span> <span>{item.subtitle}</span>
          </div>
        )}

        {/* Inline comment area appears when Approve/Reject is initiated */}
        {mode && (
          <div style={{
            marginTop: 10, padding: 10, border: '1px solid #CBD5E1',
            borderRadius: 8, background: '#F9FAFB'
          }}>
            <label style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>
              Comment <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={mode === 'approve'
                ? 'Explain why this request is approved…'
                : 'Explain why this request is rejected…'}
              rows={3}
              style={{
                width: '100%',
                marginTop: 6,
                border: '1px solid #E5E7EB',
                borderRadius: 8,
                padding: '8px 10px',
                outline: 'none',
                resize: 'vertical'
              }}
            />
            {error && (
              <div style={{
                marginTop: 6, padding: 8,
                border: '1px solid #FECACA', background: '#FEF2F2',
                borderRadius: 8, color: '#991B1B', fontSize: 13
              }}>
                {error}
              </div>
            )}

            {/* Confirm/Cancel bar */}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                type="button"
                onClick={cancel}
                disabled={busy}
                style={{
                  height: 32, padding: '0 12px',
                  borderRadius: 8,
                  background: '#fff', color: '#0F172A',
                  border: '1px solid #CBD5E1', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={busy}
                style={{
                  height: 32, padding: '0 12px',
                  borderRadius: 8,
                  background: mode === 'approve' ? '#176D6D' : '#fff',
                  color: mode === 'approve' ? '#fff' : '#DC3545',
                  border: `1px solid ${mode === 'approve' ? '#176D6D' : '#F1B8BF'}`,
                  fontWeight: 800, cursor: 'pointer'
                }}
                title={mode === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
              >
                {busy ? '...' : (mode === 'approve' ? 'Confirm Approve' : 'Confirm Reject')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right: primary actions (hidden when comment box is open) */}
      {!mode && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => start('reject')}
            style={{
              height: 36, padding: '0 12px', borderRadius: 10,
              background: '#FFF', color: '#DC3545',
              border: '1px solid #F1B8BF', fontWeight: 700, cursor: 'pointer'
            }}
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => start('approve')}
            style={{
              height: 36, padding: '0 12px', borderRadius: 10,
              background: '#176D6D', color: '#fff',
              border: '1px solid #176D6D', fontWeight: 700, cursor: 'pointer'
            }}
          >
            Approve
          </button>
        </div>
      )}
    </div>
  );
}