// src/components/projects/ProjectsTable.jsx
import React, { useMemo, useState } from 'react';

/** 12 project pipeline stages (same as DB enum) */
const PROJECT_STAGES = [
  'new',
  'pre_approval',
  'state_rebate',
  'design_engineering',
  'procurement',
  'scheduled',
  'installation_in_progress',
  'installation_completed',
  'compliance_check',
  'inspection_grid_connection',
  'rebate_stc_claims',
  'project_completed',
];

const STAGE_LABELS = {
  new: 'New',
  pre_approval: 'Pre-approval',
  state_rebate: 'State rebate',
  design_engineering: 'Design & engineering',
  procurement: 'Procurement',
  scheduled: 'Scheduled',
  installation_in_progress: 'Installation in progress',
  installation_completed: 'Installation completed',
  compliance_check: 'Compliance check',
  inspection_grid_connection: 'Inspection & grid connection',
  rebate_stc_claims: 'Rebate & STC claims',
  project_completed: 'Project completed',
};

function money(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';

  return (
    <span style={{
      color: '#0ea5a4',   
      fontWeight: 700,      
      fontSize: '13px',     
      letterSpacing: '0.2px'
    }}>
      A${Number(v)}
    </span>
  );
}
/** Relative time like "21d ago" / "3h ago" / "just now" */
function relativeTime(input) {
  if (!input) return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

/** Sortable <th> (arrow indicator) */
function Th({ children, sortKey, sort, onSort, align = 'left' }) {
  const active = sort.key === sortKey;
  const arrow = active ? (sort.dir === 'asc' ? '▲' : '▼') : '▼';
  return (
    <th
      onClick={() => onSort?.(sortKey)}
      style={{
        textAlign: align,
        cursor: 'pointer',
        userSelect: 'none',
        padding: '12px 14px',
        whiteSpace: 'nowrap',
        fontSize: 12,
        letterSpacing: 0.2,
        color: '#0b3a34',
        background: '#f8fafc',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 1,
      }}
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {children}
        <span style={{ opacity: active ? 1 : 0.25, fontSize: 10 }}>{arrow}</span>
      </span>
    </th>
  );
}

/** Stage select styled like a mint pill */
function StageSelect({ value, onChange, stages }) {
  const list =
    stages && stages.length
      ? stages
      : PROJECT_STAGES.map((k) => ({ key: k, label: STAGE_LABELS[k] ?? k }));
  const keys = new Set(list.map((s) => s.key));
  const v = keys.has(value) ? value : list[0]?.key;
  return (
    <select
      value={v || ''}
      onChange={(e) => onChange?.(e.target.value)}
      style={{
        borderRadius: 999,
        border: '1px solid #cbe7e2',
        background: '#ecfdf5',
        color: '#0f6b63',
        padding: '6px 10px',
        fontSize: 12,
        fontWeight: 600,
        outline: 'none',
      }}
    >
      {!keys.has(value) && value && (
        <option value={value}>{STAGE_LABELS[value] ?? value} (inactive)</option>
      )}
      {list.map((s) => (
        <option key={s.key} value={s.key}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

/** Source badge (blue pill) */
function SourceBadge({ children }) {
  if (!children) return <span>—</span>;
  return (
    <span
      style={{
        display: 'inline-block',
        borderRadius: 999,
        background: '#dbeafe',     
        color: '#1d4ed8',         
        padding: '4px 10px',
        fontSize: 12,
        fontWeight: 600,
        border: '1px solid #bfdbfe', 
      }}
    >
      {children}
    </span>
  );
}

/** Main table */
export default function ProjectsTable({ projects = [], onRowClick, onStageChange, stages }) {
  const [sort, setSort] = useState({ key: 'customerName', dir: 'asc' });

  const data = useMemo(() => {
    const arr = [...projects];
    const k = sort.key;
    const mul = sort.dir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      const av = (a?.[k] ?? a?._raw?.[k] ?? '').toString().toLowerCase();
      const bv = (b?.[k] ?? b?._raw?.[k] ?? '').toString().toLowerCase();
      if (av < bv) return -1 * mul;
      if (av > bv) return 1 * mul;
      return 0;
    });
    return arr;
  }, [projects, sort]);

  function onSort(key) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }

  return (
    <div style={{ width: '100%', overflow: 'auto', borderRadius: 12, border: '1px solid #e5e7eb' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr>
            <Th sortKey="customerName" sort={sort} onSort={onSort}>Name</Th>
            <Th sortKey="suburb" sort={sort} onSort={onSort}>Suburb</Th>
            <Th sortKey="stage" sort={sort} onSort={onSort}>Stage</Th>
            <Th sortKey="value" sort={sort} onSort={onSort} align="right">Value</Th>
            <Th sortKey="systemSummary" sort={sort} onSort={onSort}>System</Th>
            <Th sortKey="lastActivity" sort={sort} onSort={onSort}>Last activity</Th>
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: 24, color: '#6b7280', textAlign: 'center' }}>No projects</td>
            </tr>
          ) : (
            data.map((p, idx) => (
              <tr
                key={p.id}
                style={{
                  borderBottom: '1px solid #f1f5f9',
                  background: idx % 2 ? '#fff' : '#fcfcfd',
                  cursor: 'pointer',
                }}
                onClick={() => onRowClick?.(p.id)}
              >
                {/* Name */}
                <td style={{ padding: '10px 14px', minWidth: 200 }}>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.customerName}</div>
                  {p._raw?.email && (
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{p._raw.email}</div>
                  )}
                </td>

                {/* Suburb */}
                <td style={{ padding: '10px 14px', color: '#374151', minWidth: 160 }}>
                  {p.suburb ?? '—'}
                </td>

                {/* Stage (stop row click) */}
                <td
                  style={{ padding: '10px 14px', minWidth: 230 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <StageSelect
                    value={p.stage}
                    stages={stages}
                    onChange={(next) => onStageChange?.(p.id, next)}
                  />
                </td>

                {/* Value (right aligned) */}
                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0ea5a4', minWidth: 120 }}>
                  {money(p.value)}
                </td>

                {/* System */}
                <td style={{ padding: '10px 14px', color: '#374151', minWidth: 140 }}>
                  {p.systemSummary ?? '—'}
                </td>

               

                {/* Last activity */}
                <td style={{ padding: '10px 14px', color: '#64748b', minWidth: 130 }}>
                  {relativeTime(p.lastActivity)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}