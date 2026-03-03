import React from 'react';
import './project-card.css'; 

function formatMoney(value) {
  if (value == null || value === '') return '';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return String(value);
  }
}

/**
 * ProjectCard: matches the provided visual sample.
 *
 * Props:
 * - data: {
 *     id: string|number,
 *     customerName: string,
 *     address?: string,          // e.g. "45 Battery Dr, Hawthorn"
 *     systemSummary?: string,    // e.g. "6.6 kW + Battery"
 *     value?: number|string,     // contract value
 *     marginPct?: number|string, // e.g. 18 (renders "Margin: 18%")
 *     assignees?: string[],      // initials, e.g. ["JD", "MK"]
 *   }
 * - onClick?: () => void
 * - onDragStart?: (e: DragEvent) => void
 * - onDragEnd?: (e: DragEvent) => void
 */
export default function ProjectCard({ data, onClick, onDragStart, onDragEnd }) {
  const {
    customerName = '—',
    address,
    systemSummary,
    value,
    marginPct,
    assignees = [],
  } = data || {};

  return (
    <div
      role="listitem"
      className="pcard"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      {/* Header: customer name */}
      <div className="pcard__title">{customerName}</div>

      {/* Subline: address with location dot icon */}
      {address && (
        <div className="pcard__address">
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            className="pcard__addressIcon"
          >
            {/* Simple map-pin glyph */}
            <path
              fill="currentColor"
              d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"
            />
          </svg>
          <span>{address}</span>
        </div>
      )}

      {/* Main line: system summary (left) + value (right) */}
      <div className="pcard__row">
        <div className="pcard__system">{systemSummary}</div>
        {value != null && <div className="pcard__value">{formatMoney(value)}</div>}
      </div>

      {/* Divider */}
      <div className="pcard__divider" />

      {/* Footer: margin pill (left) + assignee initials (right) */}
      <div className="pcard__footer">
        {marginPct != null && (
          <span className="pcard__margin">
            {/* Keep text strictly as in sample: "Margin: 18%" */}
            Margin: {String(marginPct).replace('%', '')}%
          </span>
        )}

        {assignees?.length > 0 && (
          <div className="pcard__assignees">
            {assignees.slice(0, 3).map((abbr, i) => (
              <span key={`${abbr}-${i}`} className="pcard__chip" title={abbr}>
                {abbr}
              </span>
            ))}
            {/* Optional: +N more indicator if more than 3 assignees */}
            {assignees.length > 3 && (
              <span className="pcard__chip pcard__chip--muted" title={`${assignees.length - 3} more`}>
                +{assignees.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}