/**
 * CalendarLeadEntry – single lead chip on the calendar grid (T-083).
 * Renders title, optional subtitle, and a dot; clickable when onClick is provided.
 */
import React from 'react';

export default function CalendarLeadEntry({ lead, title, subtitle, onClick, className = 'lc2-chip' }) {
  return (
    <div
      className={className}
      onClick={(e) => { e.stopPropagation(); onClick?.(lead); }}
      role={onClick ? 'button' : 'group'}
      title={title}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <span className="lc2-dot" aria-hidden />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="lc2-chipTitle">{title}</div>
        {subtitle && <div className="lc2-chipSub">{subtitle}</div>}
      </div>
    </div>
  );
}
