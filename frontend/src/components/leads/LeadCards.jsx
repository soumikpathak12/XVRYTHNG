// components/leads/LeadCard.jsx
import React from 'react';

/**
 * @param {{
 *   lead: {
 *     id: string|number,
 *     customerName: string,
 *     suburb: string,
 *     systemSize: string,
 *     value: number,
 *     source: string,
 *     assignedUser: string,
 *     lastActivity: string,
 *     stage: string
 *   },
 *   onDragStart?: (e: DragEvent, lead: any) => void,
 *   colors?: {
 *     won?: string;     // default '#16a34a'
 *     lost?: string;    // default '#dc2626'
 *     default?: string; // default '#146b6b' (your teal)
 *   }
 * }} props
 */
export default function LeadCard({ lead, onDragStart, colors }) {
  const palette = {
    won: colors?.won ?? '#16a34a',       // green
    lost: colors?.lost ?? '#dc2626',     // red
    default: colors?.default ?? '#146b6b', // teal (brand)
  };

  const isWon = lead.stage === 'closed_won';
  const isLost = lead.stage === 'closed_lost';
  const borderColor = isWon ? palette.won : isLost ? palette.lost : palette.default;

  const rootStyle = {
    background: '#fff',
    border: `2px solid ${borderColor}`,
    borderRadius: 12,
    padding: 12,
    display: 'grid',
    gap: 8,
    cursor: 'grab',
    userSelect: 'none',
  };

  const tag = {
    display: 'inline-block',
    fontSize: 12,
    fontWeight: 700,
    padding: '4px 8px',
    borderRadius: 8,
    background: '#F3F4F6',
    color: '#374151',
  };

  const metaRow = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 12,
    color: '#6B7280',
  };

  return (
    <article
      style={rootStyle}
      draggable
      onDragStart={(e) => onDragStart?.(e, lead)}
      aria-label={`${lead.customerName} – ${lead.suburb}`}
    >
      <div style={{ fontWeight: 800, color: '#111827' }}>{lead.customerName}</div>
      <div style={{ fontSize: 12, color: '#6B7280' }}>{lead.suburb}</div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={tag}>{lead.systemSize}</span>
        <span style={tag}>
          {Intl.NumberFormat(undefined, { style: 'currency', currency: 'AUD' }).format(lead.value)}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={tag}>{lead.source}</span>
      </div>

      <div style={metaRow}>
        <span>Last activity</span>
        <span>{lead.lastActivity}</span>
      </div>
    </article>
  );
}
