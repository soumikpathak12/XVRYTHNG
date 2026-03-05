// src/pages/approvals/components/KPIHeader.jsx
import React from 'react';

const card = {
  background:'#fff',
  border:'1px solid #E5E7EB',
  borderRadius:12,
  padding:16
};

export default function KPIHeader({ data }) {
  const items = [
    { key:'pending',    title:'Pending Approvals', value:data?.pending ?? 12, color:'#DC2626' },
    { key:'employees',  title:'Active Employees',  value:data?.employees ?? 34, color:'#176D6D' },
    { key:'payroll',    title:'Payroll Due',       value:data?.payroll ?? '$45,200', color:'#F59E0B' },
    { key:'compliance', title:'Compliance Rate',   value:`${data?.compliance ?? 98}%`, color:'#16A34A' }
  ];
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0,1fr))', gap:12 }}>
      {items.map(it => (
        <div key={it.key} style={card}>
          <div style={{ color:'#64748B', fontWeight:700 }}>{it.title}</div>
          <div style={{ fontSize:22, fontWeight:800, color: it.color, marginTop:6 }}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}