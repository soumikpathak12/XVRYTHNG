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

  const formattedValue = lead.value != null && Number(lead.value) > 0
    ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(lead.value)
    : null;

  const dateLabel = (() => {
    const raw = lead.lastActivity || lead._raw?.last_activity_at || lead._raw?.created_at;
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  })();

  const sourceLabel = lead.source
    ? (lead.source.toLowerCase() === 'referral' ? 'Referral' : lead.source)
    : null;

  const email = lead?._raw?.email || 'No email';
  const phone = lead?._raw?.phone || 'No phone';
  const projectCode = lead.projectCode || lead?._raw?.project_code || (lead.id != null ? `PRJ-${lead.id}` : '');

  return (
    <article
      className={`leads-card ${cardVariant} stage-${lead.stage}`}
      draggable
      onDragStart={(e) => onDragStart?.(e, lead)}
      onDragEnd={(e) => onDragEnd?.(e)}
      onClick={() => onSelect?.()}
      aria-label={`${lead.customerName} – ${lead.suburb}`}
    >
      <div className="leads-card-top">
        <div className="leads-card-top-main">
          <div className="leads-card-name">
            {lead.customerName}
            {projectCode ? <span className="leads-card-prj">{projectCode}</span> : null}
          </div>
          <div className="leads-card-suburb">
            <span className="leads-card-meta-dot">⌖</span> {lead.suburb || 'No location'}
          </div>
        </div>
      </div>

      <div className="leads-card-contact-list">
        <div className="leads-card-contact-item">✉ {email}</div>
        <div className="leads-card-contact-item">☎ {phone}</div>
      </div>

      <div className="leads-card-meta">
        {dateLabel ? <span className="leads-card-date">◷ {dateLabel}</span> : <span className="leads-card-meta-muted">No recent activity</span>}
        {sourceLabel ? <span className="leads-card-meta-source">{sourceLabel}</span> : <span className="leads-card-meta-muted">—</span>}
        {formattedValue && <span className="leads-card-tag value">{formattedValue}</span>}
      </div>
    </article>
  );
}
