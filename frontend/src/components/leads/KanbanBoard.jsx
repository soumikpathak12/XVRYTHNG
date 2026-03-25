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

function bucketStageForLead(leadStage, stageList) {
  const keys = stageList.map((s) => s.key);
  const set = new Set(keys);
  if (set.has(leadStage)) return leadStage;
  return keys[0] || 'new';
}

/**
 * @param {{
 *   leads: Array<{ id: string|number, stage: string, [key: string]: any }>,
 *   stages?: Array<{ key: string, label: string }>,
 *   onStageChange?: (leadId: string|number, nextStage: string) => void,
 * }} props
 */
export default function KanbanBoard({
  leads = [],
  stages: stagesProp,
  onStageChange,
  onFocusSearch,
  onSelectLead,
}) {
  const STAGES_LIST = stagesProp && stagesProp.length ? stagesProp : STAGES;
  const [dragLead, setDragLead] = useState(null);
  const scrollRef = useRef(null);
  const [scrollState, setScrollState] = useState({ canScrollLeft: false, canScrollRight: false });
  const [activeColumnIndex, setActiveColumnIndex] = useState(0);

  const byStage = useMemo(() => {
    const map = Object.fromEntries(STAGES_LIST.map((s) => [s.key, []]));
    for (const l of leads) {
      const raw = l.stage;
      const key = bucketStageForLead(raw, STAGES_LIST);
      if (!map[key]) map[key] = [];
      map[key].push(l);
    }
    return map;
  }, [leads, STAGES_LIST]);

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

  const ignoreScrollRef = useRef(false);

  function updateScrollState() {
    if (ignoreScrollRef.current) return;

    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setScrollState({
      canScrollLeft: scrollLeft > 8,
      canScrollRight: scrollLeft < scrollWidth - clientWidth - 8,
    });

    const adjustedLeft = scrollLeft - BOARD_PADDING + (COL_WIDTH + COL_GAP) / 2;
    let index = Math.floor(adjustedLeft / (COL_WIDTH + COL_GAP));
    index = Math.max(0, Math.min(STAGES_LIST.length - 1, index));
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
  }, [leads, STAGES_LIST.length]);

  const [highlightedStage, setHighlightedStage] = useState(null);

  function scrollToColumn(index) {
    const el = scrollRef.current;
    if (!el) return;

    ignoreScrollRef.current = true;
    setActiveColumnIndex(index);

    const s = STAGES_LIST[index];
    if (s) {
      setHighlightedStage(s.key);
      setTimeout(() => setHighlightedStage(null), 1000);
    }

    const left = BOARD_PADDING + index * (COL_WIDTH + COL_GAP);
    el.scrollTo({ left, behavior: 'smooth' });

    setTimeout(() => {
      ignoreScrollRef.current = false;
    }, 1000);
  }

  function handleDragEnd() {
    setDragLead(null);
    dragScrollSpeed.current = 0;
  }

  const dragScrollSpeed = useRef(0);

  useEffect(() => {
    if (!dragLead) {
      dragScrollSpeed.current = 0;
      return;
    }

    let animId;
    const scrollStep = () => {
      const el = scrollRef.current;
      if (el && dragScrollSpeed.current !== 0) {
        el.scrollLeft += dragScrollSpeed.current;
      }
      animId = requestAnimationFrame(scrollStep);
    };
    animId = requestAnimationFrame(scrollStep);

    return () => cancelAnimationFrame(animId);
  }, [dragLead]);

  function handleContainerDragOver(e) {
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;

    const { left, width } = el.getBoundingClientRect();
    const x = e.clientX - left;

    const zone = 100;

    if (x < zone) {
      const intensity = 1 - x / zone;
      dragScrollSpeed.current = -15 * intensity - 5;
    } else if (x > width - zone) {
      const intensity = 1 - (width - x) / zone;
      dragScrollSpeed.current = 15 * intensity + 5;
    } else {
      dragScrollSpeed.current = 0;
    }
  }

  return (
    <div className="leads-board-root">
      <div className="leads-column-jump" role="navigation" aria-label="Jump to pipeline stage">
        {STAGES_LIST.map((s, i) => (
          <button
            key={s.key}
            type="button"
            className={activeColumnIndex === i ? 'active' : ''}
            onClick={() => scrollToColumn(i)}
            title={`Go to ${s.label}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="leads-board-wrap">
        <div
          ref={scrollRef}
          className="leads-board-scroll"
          role="region"
          aria-label="Pipeline columns – scroll horizontally to see all stages"
          onDragOver={handleContainerDragOver}
        >
          <div className="leads-board" role="list" aria-label="Sales pipeline kanban">
            {STAGES_LIST.map((s) => (
              <KanbanColumn
                key={s.key}
                title={s.label}
                stageKey={s.key}
                leads={byStage[s.key]}
                isHighlighted={s.key === highlightedStage}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onFocusSearch={onFocusSearch}
                onSelectLead={onSelectLead}
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
