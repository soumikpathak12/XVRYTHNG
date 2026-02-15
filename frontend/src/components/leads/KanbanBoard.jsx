// components/leads/KanbanBoard.jsx
import React, { useMemo, useState, useRef, useEffect } from 'react';
import KanbanColumn from './KanbanColumn.jsx';

export const STAGES = [
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'inspection_booked', label: 'Site Inspection Booked' },
  { key: 'inspection_completed', label: 'Site Inspection Completed' },
  { key: 'proposal_sent', label: 'Proposal Sent' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'closed_won', label: 'Closed Won' },
  { key: 'closed_lost', label: 'Closed Lost' },
];

const COL_WIDTH = 300;
const COL_GAP = 20;
const BOARD_PADDING = 28;

/**
 * @param {{
 *   leads: Array<{ id: string|number, stage: string, [key: string]: any }>,
 *   onStageChange?: (leadId: string|number, nextStage: string) => void,
 * }} props
 */
export default function KanbanBoard({ leads = [], onStageChange, onFocusSearch }) {
  const [dragLead, setDragLead] = useState(null);
  const scrollRef = useRef(null);
  const [scrollState, setScrollState] = useState({ canScrollLeft: false, canScrollRight: false });
  const [activeColumnIndex, setActiveColumnIndex] = useState(0);

  const byStage = useMemo(() => {
    const map = Object.fromEntries(STAGES.map((s) => [s.key, []]));
    for (const l of leads) {
      const key = l.stage && map[l.stage] ? l.stage : 'new';
      map[key].push(l);
    }
    return map;
  }, [leads]);

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

  function updateScrollState() {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setScrollState({
      canScrollLeft: scrollLeft > 8,
      canScrollRight: scrollLeft < scrollWidth - clientWidth - 8,
    });
    const center = scrollLeft + clientWidth / 2;
    let index = Math.floor((center - BOARD_PADDING) / (COL_WIDTH + COL_GAP));
    index = Math.max(0, Math.min(STAGES.length - 1, index));
    setActiveColumnIndex(index);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState);
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [leads]);

  function scrollToColumn(index) {
    const el = scrollRef.current;
    if (!el) return;
    const left = BOARD_PADDING + index * (COL_WIDTH + COL_GAP);
    el.scrollTo({ left, behavior: 'smooth' });
  }

  return (
    <div className="leads-board-root">
      <div className="leads-column-jump" role="navigation" aria-label="Jump to pipeline stage">
        {STAGES.map((s, i) => (
          <button
            key={s.key}
            type="button"
            className={activeColumnIndex === i ? 'active' : ''}
            onClick={() => scrollToColumn(i)}
            title={`Go to ${s.label}`}
          >
            {s.label.length > 14 ? s.label.slice(0, 12) + '…' : s.label}
          </button>
        ))}
      </div>

      <div className="leads-board-wrap">
        <div
          ref={scrollRef}
          className="leads-board-scroll"
          role="region"
          aria-label="Pipeline columns – scroll horizontally to see all stages"
        >
          <div className="leads-board" role="list" aria-label="Sales pipeline kanban">
            {STAGES.map((s) => (
              <KanbanColumn
                key={s.key}
                title={s.label}
                stageKey={s.key}
                leads={byStage[s.key]}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onFocusSearch={onFocusSearch}
              />
            ))}
          </div>
        </div>

        <div
          className={`leads-scroll-shadow left ${scrollState.canScrollLeft ? 'visible' : ''}`}
          aria-hidden="true"
        />
        <div
          className={`leads-scroll-shadow right ${scrollState.canScrollRight ? 'visible' : ''}`}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
