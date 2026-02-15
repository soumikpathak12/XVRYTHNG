import React, { useState, useMemo } from 'react';
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
  isHighlighted,
}) {
  const headerColor = colorForStage(stageKey);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const displayLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads;
    const q = searchQuery.toLowerCase();
    return leads.filter((l) => {
      const searchStr = `${l.customerName} ${l.suburb} ${l.value} ${l.systemSize}`.toLowerCase();
      return searchStr.includes(q);
    });
  }, [leads, searchQuery]);

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
      className={`leads-column ${isHighlighted ? 'highlighted' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-label={`${title} column`}
    >
      <div
        className="leads-column-header"
        style={{ backgroundColor: headerColor, minHeight: '48px' }}
      >
        {isSearchOpen ? (
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }}>
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              style={{
                flex: 1,
                border: 'none',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.8125rem',
                outline: 'none',
                color: '#334155'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setIsSearchOpen(false);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
              }}
              aria-label="Close search"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            <span>{title}</span>
            <div className="leads-column-header-right">
              <button
                type="button"
                className="leads-column-search-btn"
                onClick={() => setIsSearchOpen(true)}
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
          </>
        )}
      </div>

      <div className="leads-column-cards">
        {displayLeads.length === 0 ? (
          <div className="leads-column-empty">
            {searchQuery ? 'No matching leads' : 'No leads in this stage'}
          </div>
        ) : (
          displayLeads.map((l) => (
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
