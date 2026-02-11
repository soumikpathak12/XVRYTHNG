// components/leads/KanbanBoard.jsx
import React, { useMemo, useState } from 'react';
import KanbanColumn from './KanbanColumn.jsx';

export const STAGES = [
  { key: 'new',                    label: 'New' },
  { key: 'contacted',              label: 'Contacted' },
  { key: 'qualified',              label: 'Qualified' },
  { key: 'inspection_booked',      label: 'Site Inspection Booked' },
  { key: 'inspection_completed',   label: 'Site Inspection Completed' },
  { key: 'proposal_sent',          label: 'Proposal Sent' },
  { key: 'negotiation',            label: 'Negotiation' },
  { key: 'closed_won',             label: 'Closed Won' },
  { key: 'closed_lost',            label: 'Closed Lost' },
];

/**
 * @param {{
 *   leads: Lead[],
 *   onStageChange?: (leadId: string|number, nextStage: string) => void,
 * }} props
 */
export default function KanbanBoard({ leads = [], onStageChange }) {
  const [dragLead, setDragLead] = useState(null);

  const byStage = useMemo(() => {
    const map = Object.fromEntries(STAGES.map(s => [s.key, []]));
    for (const l of leads) {
      const key = l.stage && map[l.stage] ? l.stage : 'new';
      map[key].push(l);
    }
    return map;
  }, [leads]);

  const rootStyle = {
    display: 'flex',
    gap: 16,
    overflowX: 'auto',          
    paddingBottom: 12,          
  };

  function handleDragStart(e, lead) {
    setDragLead(lead);
    e.dataTransfer.setData('text/plain', String(lead.id));
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e, nextStage) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const draggedId = id || dragLead?.id;
    if (!draggedId) return;
    if (dragLead?.stage === nextStage) return; 
    onStageChange?.(draggedId, nextStage);
    setDragLead(null);
  }

  return (
    <div style={rootStyle} role="list" aria-label="Sales pipeline kanban">
      {STAGES.map((s) => (
        <KanbanColumn
          key={s.key}
          title={s.label}
          stageKey={s.key}
          leads={byStage[s.key]}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}