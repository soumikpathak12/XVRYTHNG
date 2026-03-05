// src/components/operation/ApprovalsFilters.jsx
import React from 'react';

const chipBase = {
  padding: '6px 12px',
  borderRadius: 999,
  border: '1px solid #CBD5E1',
  background: '#fff',
  cursor: 'pointer',
  fontWeight: 700,
  color: '#0F172A'
};

function Chip({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...chipBase,
        background: active ? '#176D6D' : '#fff',
        color: active ? '#fff' : '#0F172A',
        borderColor: active ? '#176D6D' : '#CBD5E1'
      }}
    >
      {children}
    </button>
  );
}

export default function ApprovalsFilters({ type, onTypeChange, status, onStatusChange }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', margin: '12px 0' }}>
      {/* Type Tabs */}
      <div style={{ display:'flex', gap: 8 }}>
        {[
          { key:'all', label:'All' },
          { key:'attendance', label:'Attendance' },
          { key:'leave', label:'Leave' },
          { key:'expense', label:'Expenses' },
        ].map(t => (
          <Chip key={t.key} active={type===t.key} onClick={() => onTypeChange(t.key)}>{t.label}</Chip>
        ))}
      </div>

      {/* Status Filter */}
      <div style={{ display:'flex', gap: 8 }}>
        {[
          { key:'pending', label:'Pending' },
          { key:'approved', label:'Approved' },
          { key:'rejected', label:'Rejected' },
        ].map(s => (
          <Chip key={s.key} active={status===s.key} onClick={() => onStatusChange(s.key)}>{s.label}</Chip>
        ))}
      </div>
    </div>
  );
}