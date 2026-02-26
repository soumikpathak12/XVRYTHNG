// src/components/employees/FiltersBar.jsx
import React from 'react';

export default function FiltersBar({
  q, setQ,
  roleFilter, setRoleFilter, roleOptions = [],
  statusFilter, setStatusFilter,
  onAddEmployee,
  brand = '#146b6b',
}) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <input
        placeholder="Search employees..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{
          flex: '1 1 auto',
          border: '1px solid #D1D5DB',
          borderRadius: 12,
          padding: '10px 12px',
        }}
        aria-label="Search employees"
      />

      {/* Role filter */}
      <select
        value={roleFilter}
        onChange={(e) => setRoleFilter(e.target.value)}
        title="Filter by role"
        style={{
          flex: '0 0 220px',
          border: '1px solid #D1D5DB',
          borderRadius: 12,
          padding: '10px 12px',
          background: '#fff',
        }}
      >
        <option value="">All Roles</option>
        {roleOptions.map((r) => (
          <option key={r.id} value={String(r.id)}>
            {r.name} {r.code ? `(${r.code})` : ''}
          </option>
        ))}
      </select>

      {/* Status filter */}
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        title="Filter by status"
        style={{
          flex: '0 0 180px',
          border: '1px solid #D1D5DB',
          borderRadius: 12,
          padding: '10px 12px',
          background: '#fff',
        }}
      >
        <option value="">All Statuses</option>
        <option value="active">Active</option>
        <option value="on_leave">On Leave</option>
        <option value="inactive">Inactive</option>
        <option value="terminated">Terminated</option>
      </select>

      <button
        onClick={onAddEmployee}
        style={{
          padding: '10px 14px',
          background: brand,
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          fontWeight: 800,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{
          display: 'inline-flex',
          width: 18, height: 18,
          borderRadius: 4,
          background: 'rgba(255,255,255,.25)',
          alignItems: 'center', justifyContent: 'center',
          fontWeight: 900,
        }}>＋</span>
        Add Employee
      </button>
    </div>
  );
}