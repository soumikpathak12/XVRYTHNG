// components/leads/LeadCards.jsx
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
 *     lastActivity: string,
 *     stage: string
 *   },
 *   onDragStart?: (e: DragEvent, lead: any) => void,
 * }} props
 */
export default function LeadCard({ lead, onDragStart, onDragEnd, onSelect }) {
  const isWon = lead.stage === 'closed_won';
  const isLost = lead.stage === 'closed_lost';
  const cardVariant = isWon ? 'won' : isLost ? 'lost' : 'default';

  const formattedValue = lead.value != null
    ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(lead.value)
    : null;

  return (
    <article
      className={`leads-card ${cardVariant}`}
      draggable
      onDragStart={(e) => onDragStart?.(e, lead)}
      onDragEnd={(e) => onDragEnd?.(e)}
      onClick={() => onSelect?.()}
      aria-label={`${lead.customerName} – ${lead.suburb}`}
    >
      <div className="leads-card-name">{lead.customerName}</div>
      <div className="leads-card-suburb">{lead.suburb || '—'}</div>

      <div className="leads-card-tags">
        {lead.systemSize && <span className="leads-card-tag">{lead.systemSize}</span>}
        {formattedValue && <span className="leads-card-tag value">{formattedValue}</span>}
      </div>

      <div className="leads-card-meta">
        {lead.source ? (
          <span className="leads-card-meta-source">{lead.source}</span>
        ) : (
          <span className="leads-card-meta-muted">—</span>
        )}
      </div>
    </article>
  );
}
