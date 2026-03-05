// src/pages/approvals/components/EmptyState.jsx
import React from 'react';

export default function EmptyState({ title="No results", subtitle="Try changing filters." }) {
  return (
    <div style={{
      border:'1px dashed #CBD5E1',
      borderRadius: 12, padding: 24,
      textAlign:'center', color:'#64748B', background:'#fff'
    }}>
      <div style={{ fontWeight: 800, color:'#0F172A' }}>{title}</div>
      <div style={{ marginTop: 6 }}>{subtitle}</div>
    </div>
  );
}