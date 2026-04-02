// components/projects/ProjectsKanbanBoard.jsx
import React, { useMemo, useState, useRef, useEffect } from 'react';
import KanbanColumn from '../leads/KanbanColumn.jsx';
import ProjectCard from './ProjectCard.jsx';

// ---- DEFAULT project pipeline stages (company workflow may override) ----
export const DEFAULT_PROJECT_STAGES = [
  { key: 'new', label: 'New' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'to_be_rescheduled', label: 'To Be Rescheduled' },
  { key: 'installation_in_progress', label: 'Installation In-Progress' },
  { key: 'installation_completed', label: 'Installation Completed' },
  { key: 'ces_certificate_applied', label: 'CES Certificate Applied' },
  { key: 'ces_certificate_received', label: 'CES Certificate Received' },
  { key: 'grid_connection_initiated', label: 'GRID Connection Initiated' },
  { key: 'grid_connection_completed', label: 'GRID Connection Completed' },
  { key: 'system_handover', label: 'System Handover' },
];

const COL_WIDTH = 300;
const COL_GAP = 20;
const BOARD_PADDING = 28;

function makeStageSet(stages) {
  return new Set((stages ?? []).map((s) => s.key));
}

function normalizeStageKey(input, stageSet, legacyMap) {
  if (!input) return null;
  if (stageSet.has(input)) return input;
  const mapped = legacyMap?.[input];
  return stageSet.has(mapped) ? mapped : null;
}

export default function ProjectsKanbanBoard({
  projects = [],
  stages,            // NEW: optional custom stages list
  legacyStageMap,    // NEW: optional mapping from legacy -> new keys
  onStageChange,
  onFocusSearch,
  onSelectProject,
}) {
  const PROJECT_STAGES = stages && stages.length ? stages : DEFAULT_PROJECT_STAGES;
  const STAGE_KEYS_SET = makeStageSet(PROJECT_STAGES);
  const LEGACY_TO_NEW_STAGE_KEY = legacyStageMap ?? {};

  const [dragItem, setDragItem] = useState(null);
  const scrollRef = useRef(null);
  const [scrollState, setScrollState] = useState({ canScrollLeft: false, canScrollRight: false });
  const [activeColumnIndex, setActiveColumnIndex] = useState(0);

  // Group items by stage
  const byStage = useMemo(() => {
    const map = Object.fromEntries(PROJECT_STAGES.map((s) => [s.key, []]));
    const firstKey = PROJECT_STAGES[0]?.key || 'new';
    for (const p of projects) {
      const normalized = normalizeStageKey(p.stage, STAGE_KEYS_SET, LEGACY_TO_NEW_STAGE_KEY);
      let key = normalized && map[normalized] != null ? normalized : p.stage;
      if (!STAGE_KEYS_SET.has(key)) key = firstKey;
      if (!map[key]) map[key] = [];
      map[key].push(p);
    }
    return map;
  }, [projects, PROJECT_STAGES, STAGE_KEYS_SET, LEGACY_TO_NEW_STAGE_KEY]);

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
  }, [projects, PROJECT_STAGES.length]);

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
            {s.label}
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
                onSelectLead={onSelectProject}
                renderItem={(item, handlers) => (
                  <ProjectCard
                    data={{
                      id: item.id,
                      projectCode: item.projectCode || item?._raw?.project_code || (item.id != null ? `PRJ-${item.id}` : ''),
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