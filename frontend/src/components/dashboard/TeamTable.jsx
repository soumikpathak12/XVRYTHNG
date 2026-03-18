import React, { useMemo, useState } from 'react';

const BRAND = {
  headerBg: '#F9FAFB',
  border: '#E5E7EB',
  text: '#1A1A2E',
  muted: '#6B7280',
};

const columns = [
  { key: 'user_name', label: 'Name' },
  { key: 'leads_contacted', label: 'Leads Contacted' },
  { key: 'proposals_sent', label: 'Proposals Sent' },
  { key: 'close_rate', label: 'Close Rate' },
];

export default function TeamTable({ rows = [], onRowClick }) {
  const [sort, setSort] = useState({ key: 'leads_contacted', dir: 'desc' });

  const sorted = useMemo(() => {
    const data = [...rows];
    data.sort((a, b) => {
      const { key, dir } = sort;
      const av = a[key] ?? 0;
      const bv = b[key] ?? 0;
      if (av === bv) return 0;
      if (typeof av === 'string' || typeof bv === 'string') {
        return dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      }
      return dir === 'asc' ? av - bv : bv - av;
    });
    return data;
  }, [rows, sort]);

  const toggleSort = (key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'user_name' ? 'asc' : 'desc' },
    );
  };

  const sortIcon = (key) => {
    if (sort.key !== key) return '⇅';
    return sort.dir === 'asc' ? '↑' : '↓';
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: `1px solid ${BRAND.border}`, background: BRAND.headerBg, color: BRAND.muted }}>
            {columns.map(col => (
              <th
                key={col.key}
                style={{ padding: '8px 10px', fontWeight: 700, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                onClick={() => toggleSort(col.key)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {col.label}
                  <span style={{ fontSize: 11, color: BRAND.muted }}>{sortIcon(col.key)}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr
              key={r.user_id}
              onClick={() => onRowClick?.(r)}
              style={{
                borderBottom: `1px solid ${BRAND.border}`,
                cursor: onRowClick ? 'pointer' : 'default',
                background: i % 2 ? '#FBFDFF' : '#FFFFFF',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')}
              onMouseLeave={e => (e.currentTarget.style.background = i % 2 ? '#FBFDFF' : '#FFFFFF')}
            >
              <td style={{ padding: '10px 12px', color: BRAND.text, fontWeight: 600 }}>{r.user_name}</td>
              <td style={{ padding: '10px 12px' }}>{r.leads_contacted}</td>
              <td style={{ padding: '10px 12px' }}>{r.proposals_sent}</td>
              <td style={{ padding: '10px 12px' }}>{r.close_rate.toFixed(1)}%</td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ padding: '12px 10px', textAlign: 'center', color: BRAND.muted }}>
                No team data for this period.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}