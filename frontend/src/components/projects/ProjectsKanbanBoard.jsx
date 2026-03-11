// components/projects/ProjectsKanbanBoard.jsx
import React, { useMemo, useState, useRef, useEffect } from 'react';
import KanbanColumn from '../leads/KanbanColumn.jsx';
import ProjectCard from './ProjectCard.jsx';

// ---- Project pipeline stages (12 columns in display order) ----
export const PROJECT_STAGES = [
  { key: 'new',                        label: 'New' },
  { key: 'pre_approval',               label: 'Pre-Approval' },
  { key: 'state_rebate',               label: 'State Rebate' },
  { key: 'design_engineering',         label: 'Design & Engineering' },
  { key: 'procurement',                label: 'Procurement' },
  { key: 'scheduled',                  label: 'Scheduled' },
  { key: 'installation_in_progress',   label: 'Installation In Progress' },
  { key: 'installation_completed',     label: 'Installation Completed' },
  { key: 'compliance_check',           label: 'Compliance Check' },
  { key: 'inspection_grid_connection', label: 'Inspection & Grid Connection' },
  { key: 'rebate_stc_claims',          label: 'Rebate & STC Claims' },
  { key: 'project_completed',          label: 'Project Completed' },
];

const COL_WIDTH = 300;
const COL_GAP = 20;
const BOARD_PADDING = 28;

const LEGACY_TO_NEW_STAGE_KEY = {
  new: 'new',
  pre_approval: 'pre_approval',
  design_engineering: 'design_engineering',
  scheduled: 'scheduled',
  installation_in_progress: 'installation_in_progress',
  installation_completed: 'installation_completed',
  rebate_stc_claims: 'rebate_stc_claims',
  project_completed: 'project_completed',

  
};

const STAGE_KEYS_SET = new Set(PROJECT_STAGES.map(s => s.key));

function normalizeStageKey(input) {
  if (!input) return null;
  if (STAGE_KEYS_SET.has(input)) return input;
  const mapped = LEGACY_TO_NEW_STAGE_KEY[input];
  return STAGE_KEYS_SET.has(mapped) ? mapped : null;
}

export default function ProjectsKanbanBoard({
  projects = [],
  onStageChange,
  onFocusSearch,
  onSelectProject,
}) {
  const [dragItem, setDragItem] = useState(null);
  const scrollRef = useRef(null);
  const [scrollState, setScrollState] = useState({ canScrollLeft: false, canScrollRight: false });
  const [activeColumnIndex, setActiveColumnIndex] = useState(0);

  // Group items by stage
  const byStage = useMemo(() => {
    const map = Object.fromEntries(PROJECT_STAGES.map((s) => [s.key, []]));
    for (const p of projects) {
      const normalized = normalizeStageKey(p.stage);
      const key = normalized && map[normalized] ? normalized : 'new';
      map[key].push(p);
    }
    return map;
  }, [projects]);

  // Drag handlers
  function handleDragStart(e, item) {
    setDragItem(item);
    e.dataTransfer.setData('text/plain', String(item.id));
    e.dataTransfer.effectAllowed = 'move';
  }
  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }
  function handleDrop(e, nextStage) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const draggedId = id ?? dragItem?.id;
    if (!draggedId) return;
    if (dragItem?.stage === nextStage) return;
    onStageChange?.(draggedId, nextStage);
    setDragItem(null);
  }
  function handleDragEnd() {
    setDragItem(null);
    dragScrollSpeed.current = 0;
  }

  // Scroll state & active column calculation
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
    index = Math.max(0, Math.min(PROJECT_STAGES.length - 1, index));
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
  }, [projects]);

  // Smooth scroll to a column and brief highlight
  const [highlightedStage, setHighlightedStage] = useState(null);
  function scrollToColumn(index) {
    const el = scrollRef.current;
    if (!el) return;
    ignoreScrollRef.current = true;
    setActiveColumnIndex(index);
    const s = PROJECT_STAGES[index];
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

  // Auto-scroll during drag near edges
  const dragScrollSpeed = useRef(0);
  useEffect(() => {
    if (!dragItem) {
      dragScrollSpeed.current = 0;
      return;
    }
    let animId;
    const step = () => {
      const el = scrollRef.current;
      if (el && dragScrollSpeed.current !== 0) {
        el.scrollLeft += dragScrollSpeed.current;
      }
      animId = requestAnimationFrame(step);
    };
    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [dragItem]);

  function handleContainerDragOver(e) {
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    const { left, width } = el.getBoundingClientRect();
    const x = e.clientX - left;
    const zone = 100; // px near edges
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
      {/* Jump buttons to quickly navigate across columns */}
      <div className="leads-column-jump" role="navigation" aria-label="Jump to project stage">
        {PROJECT_STAGES.map((s, i) => (
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
          aria-label="Project pipeline columns – scroll horizontally to see all stages"
          onDragOver={handleContainerDragOver}
        >
          <div className="leads-board" role="list" aria-label="Projects kanban">
            {PROJECT_STAGES.map((s) => (
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
                // NOTE: reusing onSelectLead prop name to avoid changing KanbanColumn API
                onSelectLead={onSelectProject}
                // Render ProjectCard instead of the default LeadCard
                renderItem={(item, handlers) => (
                  <ProjectCard
                    data={{
                      id: item.id,
                      customerName: item.customerName,
                      address: item.address,               
                      systemSummary: item.systemSummary,  
                      value: item.value,                   
                      marginPct: item.marginPct,          
                      assignees: item.assignees,         
                    }}
                    {...handlers}
                  />
                )}
              />
            ))}
          </div>
        </div>

        {/* Scroll shadows */}
        <div className={`leads-scroll-shadow left ${scrollState.canScrollLeft ? 'visible' : ''}`} aria-hidden="true" />
        <div className={`leads-scroll-shadow right ${scrollState.canScrollRight ? 'visible' : ''}`} aria-hidden="true" />
      </div>
    </div>
  );
}