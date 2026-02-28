// src/components/employees/OverviewStatCards.jsx
import React from 'react';

const cardStyle = {
  flex: 1,
  minWidth: 180,
  border: '1px solid #E5E7EB',
  borderRadius: 12,
  background: '#fff',
  padding: '14px 16px',
};

export default function OverviewStatCards({ stats }) {
  const items = [
    { label: 'Checked in today', value: stats.checkedInToday ?? 0 },
    { label: 'On leave', value: stats.onLeave ?? 0 },
    { label: 'Pending expenses', value: stats.pendingExpenses ?? 0 },
    { label: 'Total employees', value: stats.totalEmployees ?? 0 },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {items.map((i) => (
        <div key={i.label} style={cardStyle}>
          <div style={{ color: '#6B7280', fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>
            {i.label}
          </div>
          <div style={{ marginTop: 4, fontSize: 26, fontWeight: 800, color: '#111827' }}>
            {i.value}
          </div>
        </div>
      ))}
    </div>
  );
}