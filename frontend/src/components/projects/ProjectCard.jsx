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
 *     address?: string,
 *     systemSummary?: string,
 *     value?: number|string,
 *     marginPct?: number|string,
 *     assignees?: string[],
 *   }
 * - onClick?: () => void
 * - onDragStart?: (e: DragEvent) => void
 * - onDragEnd?: (e: DragEvent) => void
 */
export default function ProjectCard({ data, onClick, onDragStart, onDragEnd }) {
  const {
    customerName = '—',
    projectCode,
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
      {/* Header: customer name + project code */}
      <div className="pcard__titleRow">
        <div className="pcard__title">{customerName}</div>
        {projectCode ? <span className="pcard__code">{projectCode}</span> : null}
      </div>

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

      {/* Footer: margin pill (left) + assignee initials (right) + view button */}
      <div className="pcard__footer">
        {marginPct != null && (
          <span className="pcard__margin">Margin: {String(marginPct).replace('%', '')}%</span>
        )}

        {assignees?.length > 0 && (
          <div className="pcard__assignees">
            {assignees.slice(0, 3).map((abbr, i) => (
              <span key={`${abbr}-${i}`} className="pcard__chip" title={abbr}>
                {abbr}
              </span>
            ))}
            {assignees.length > 3 && (
              <span className="pcard__chip pcard__chip--muted" title={`${assignees.length - 3} more`}>
                +{assignees.length - 3}
              </span>
            )}
          </div>
        )}

       <button
          style={{
            backgroundColor: '#1A7B7B',  
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1A7B7B')}   
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1A7B7B')}  
          onMouseDown={(e) => (e.currentTarget.style.transform = 'translateY(1px)')}  
          onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
        >
          View details
        </button>
      </div>
    </div>
  );
}
