import React from 'react';
import LeadCard from './LeadCards.jsx';
import { colorForStage } from './theme.js';

export default function KanbanColumn({
  title,
  stageKey,
  leads = [],
  onDragOver,
  onDrop,
  onDragStart,
}) {
  const headerColor = colorForStage(stageKey);

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: 800,
    color: '#fff',
    background: headerColor,          
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  };

  const countStyle = {
    background: 'rgba(0,0,0,.25)',
    color: '#fff',
    fontSize: 12,
    fontWeight: 800,
    padding: '2px 8px',
    borderRadius: 999,
  };

  const colStyle = {
    minWidth: 300,
    maxWidth: 320,
    display: 'flex',
    flexDirection: 'column',
    background: '#E5E7EB',
    borderRadius: 12,
    border: '1px solid #D1D5DB',
  };

  const listStyle = {
    padding: 12,
    display: 'grid',
    gap: 12,
    minHeight: 120,
  };

  return (
    <section
      style={colStyle}
      onDragOver={(e) => onDragOver?.(e, stageKey)}
      onDrop={(e) => onDrop?.(e, stageKey)}
      aria-label={`${title} column`}
    >
      <div style={headerStyle}>
        <span>{title}</span>
        <span style={countStyle}>{leads.length}</span>
      </div>

      <div style={listStyle}>
        {leads.length === 0 ? (
          <div style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', padding: 12 }}>
            No leads in this stage
          </div>
        ) : (
          leads.map((l) => (
            <LeadCard
              key={l.id}
              lead={l}
              onDragStart={onDragStart}
            />
          ))
        )}
      </div>
    </section>
  );
}