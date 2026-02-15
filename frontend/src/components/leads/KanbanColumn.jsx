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
  onFocusSearch,
}) {
  const headerColor = colorForStage(stageKey);

  function handleDragOver(e) {
    e.preventDefault();
    const content = e.currentTarget.querySelector('.leads-column-cards');
    if (content) content.classList.add('drag-over');
    onDragOver?.(e, stageKey);
  }

  function handleDragLeave(e) {
    const content = e.currentTarget.querySelector('.leads-column-cards');
    if (content) content.classList.remove('drag-over');
  }

  function handleDrop(e) {
    const content = e.currentTarget.querySelector('.leads-column-cards');
    if (content) content.classList.remove('drag-over');
    onDrop?.(e, stageKey);
  }

  return (
    <section
      className="leads-column"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-label={`${title} column`}
    >
      <div
        className="leads-column-header"
        style={{ backgroundColor: headerColor }}
      >
        <span>{title}</span>
        <div className="leads-column-header-right">
          <button
            type="button"
            className="leads-column-search-btn"
            onClick={() => onFocusSearch?.()}
            title="Search leads"
            aria-label="Search leads"
          >
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
          <span className="leads-column-count">{leads.length}</span>
        </div>
      </div>

      <div className="leads-column-cards">
        {leads.length === 0 ? (
          <div className="leads-column-empty">No leads in this stage</div>
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
