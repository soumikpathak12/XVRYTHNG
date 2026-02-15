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
export default function LeadCard({ lead, onDragStart, onDragEnd }) {
  const isWon = lead.stage === 'closed_won';
  const isLost = lead.stage === 'closed_lost';
  const cardVariant = isWon ? 'won' : isLost ? 'lost' : 'default';

  const formattedValue = lead.value != null
    ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(lead.value)
    : null;

  function timeAgo(dateString) {
    if (!dateString) return 'No activity';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const now = new Date();
    const diff = (now - date) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <article
      className={`leads-card ${cardVariant}`}
      draggable
      onDragStart={(e) => onDragStart?.(e, lead)}
      onDragEnd={(e) => onDragEnd?.(e)}
      aria-label={`${lead.customerName} – ${lead.suburb}`}
    >
      <div className="leads-card-name">{lead.customerName}</div>
      <div className="leads-card-suburb">{lead.suburb || '—'}</div>

      <div className="leads-card-tags">
        {lead.systemSize && <span className="leads-card-tag">{lead.systemSize}</span>}
        {lead.source && <span className="leads-card-tag source">{lead.source}</span>}
        {formattedValue && <span className="leads-card-tag value">{formattedValue}</span>}
      </div>

      <div className="leads-card-meta">
        <span>Last activity</span>
        <span>{timeAgo(lead.lastActivity)}</span>
      </div>
    </article>
  );
}
