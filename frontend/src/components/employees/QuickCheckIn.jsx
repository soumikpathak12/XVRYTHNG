// src/components/employees/QuickCheckIn.jsx
import React, { useState } from 'react';

export default function QuickCheckIn({ employees = [], onRecord, brand = '#146b6b' }) {
  const [selectedId, setSelectedId] = useState('');
  const [type, setType] = useState('check_in');

  const handleRecord = () => {
    if (!selectedId) return;
    onRecord?.({ employeeId: Number(selectedId), checkinType: type });
    setSelectedId('');
  };

  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
      <div style={{ padding: 16, borderBottom: '1px solid #E5E7EB', fontSize: 16, fontWeight: 800, color: '#111827' }}>
        Quick Check-In / Check-Out
      </div>
      <div style={{ padding: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ display: 'grid', gap: 4, flex: '1 1 200px' }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Employee</label>
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            style={{ padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }}
          >
            <option value="">-- Select employee --</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'grid', gap: 4, flex: '1 1 150px' }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Type</label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            style={{ padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }}
          >
            <option value="check_in">Check In</option>
            <option value="check_out">Check Out</option>
          </select>
        </div>
        <button
          onClick={handleRecord}
          disabled={!selectedId}
          style={{
            padding: '8px 20px', background: selectedId ? brand : '#9CA3AF',
            color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: selectedId ? 'pointer' : 'not-allowed'
          }}
        >
          Record
        </button>
      </div>
    </div>
  );
}