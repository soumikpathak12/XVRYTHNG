// src/components/employees/PendingLeaveList.jsx
import React, { useMemo, useState } from 'react';

const Item = ({ req, onApprove, onDecline }) => {
  return (
    <div style={{
      border: '1px solid #E5E7EB',
      borderRadius: 12,
      background: '#fff',
      padding: 14,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 999, background: '#E5E7EB' }} />
        <div>
          <div style={{ fontWeight: 800, color: '#111827' }}>{req.name}</div>
          <div style={{ fontSize: 13, color: '#374151' }}>
            {req.type} • {req.range} ({req.days} {req.days > 1 ? 'days' : 'day'})
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onApprove(req.id)}
          style={{
            background: '#111827', color: '#fff',
            border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer'
          }}
        >Approve</button>
        <button
          onClick={() => onDecline(req.id)}
          style={{
            background: '#fff', color: '#111827',
            border: '1px solid #D1D5DB', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer'
          }}
        >Decline</button>
      </div>
    </div>
  );
};

export default function PendingLeaveList({ brand = '#146b6b' }) {
  // Dummy data (UI-only)
  const [items, setItems] = useState([]);

  const pendingCount = useMemo(() => items.filter(i => i.status === 'pending').length, [items]);

  const approve = (id) => setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'approved' } : i));
  const decline = (id) => setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'declined' } : i));

  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
      <div style={{
        padding: 16, borderBottom: '1px solid #E5E7EB',
        display: 'flex', alignItems: 'center'
      }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>Pending Leave Requests</div>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#6B7280' }}>
          <span style={{
            display: 'inline-block', padding: '4px 10px', borderRadius: 999,
            border: '1px solid #E5E7EB', background: '#F9FAFB'
          }}>
            {pendingCount} Pending
          </span>
        </div>
      </div>
      <div style={{ padding: 12, display: 'grid', gap: 10 }}>
        {items.map(i => (
          <Item key={i.id} req={i} onApprove={approve} onDecline={decline} />
        ))}
        {items.length === 0 && (
          <div style={{ color: '#6B7280', fontSize: 13, padding: 16 }}>(no pending requests)</div>
        )}
      </div>
    </div>
  );
}