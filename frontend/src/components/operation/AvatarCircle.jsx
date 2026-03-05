// src/pages/approvals/components/AvatarCircle.jsx
import React from 'react';

export default function AvatarCircle({ initials }) {
  return (
    <div
      aria-label="user-initials"
      style={{
        width: 36, height: 36, borderRadius: 999,
        background: '#E6F4F1', color:'#176D6D',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontWeight: 800, fontSize: 12, border: '1px solid #D6E5E3'
      }}
    >
      {initials || 'NA'}
    </div>
  );
}