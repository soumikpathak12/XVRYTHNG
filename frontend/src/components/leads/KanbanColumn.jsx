import React, { useState, useMemo } from 'react';
import LeadCard from './LeadCards.jsx';


export default function KanbanColumn({
  title,
  stageKey,
  leads = [],
  onDragOver,
  onDrop,
  onDragStart,
  onDragEnd,
  onFocusSearch,
  onSelectLead,
  isHighlighted,
  renderItem,
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const displayLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads;
    const q = searchQuery.toLowerCase();
    return leads.filter((l) => {
      const prj = l.projectCode || l?._raw?.project_code || (l.id != null ? `PRJ-${l.id}` : '');
      const email = l._raw?.email ?? l._raw?.lead_email ?? '';
      const phone = l._raw?.phone ?? l._raw?.lead_phone ?? '';
      const searchStr = `${prj} ${l.id ?? ''} ${email} ${phone} ${l.customerName ?? ''} ${l.suburb ?? ''} ${l.value ?? ''} ${l.systemSize ?? ''} ${l.systemSummary ?? ''}`.toLowerCase();
      return searchStr.includes(q);
    });
  }, [leads, searchQuery]);

  function handleDragOverInternal(e) {
    e.preventDefault();
    const content = e.currentTarget.querySelector('.leads-column-cards');
    if (content) content.classList.add('drag-over');
    onDragOver?.(e, stageKey);
  }

  function handleDragLeave(e) {
    const content = e.currentTarget.querySelector('.leads-column-cards');
    if (content) content.classList.remove('drag-over');
  }

  function handleDropInternal(e) {
    const content = e.currentTarget.querySelector('.leads-column-cards');
    if (content) content.classList.remove('drag-over');
    onDrop?.(e, stageKey);
  }

  return (
    <section
      className={`leads-column stage-${stageKey} ${isHighlighted ? 'highlighted' : ''}`}
      onDragOver={handleDragOverInternal}
      onDragLeave={handleDragLeave}
      onDrop={handleDropInternal}
      aria-label={`${title} column`}
    >
      <div
        className="leads-column-header"
        style={{ minHeight: '48px' }}
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
                padding: '6px 8px',
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
              className="leads-column-search-close"
              onClick={() => {
                setSearchQuery('');
                setIsSearchOpen(false);
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
                onClick={() => {
                  setIsSearchOpen(true);
                  onFocusSearch?.(stageKey);
                }}
                title="Search in column"
                aria-label="Search in column"
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

      {/* Cards area */}
      <div className="leads-column-cards">
        {displayLeads.length === 0 ? (
          <div className="leads-column-empty">
            {searchQuery ? 'No matching items' : 'No items in this stage'}
          </div>
        ) : (
          displayLeads.map((item) => {
            const handlers = {
              onDragStart: (e) => onDragStart?.(e, item),
              onDragEnd: onDragEnd,
              onClick: onSelectLead ? () => onSelectLead(item.id) : undefined,
            };

            return (
              <div key={item.id} className="leads-card-wrap">
                {renderItem ? (
                  // Custom renderer (e.g., ProjectCard)
                  renderItem(item, handlers)
                ) : (
                  // Backward-compat: default to LeadCard used by Leads
                  <LeadCard
                    lead={item}
                    onDragStart={handlers.onDragStart}
                    onDragEnd={handlers.onDragEnd}
                    onSelect={handlers.onClick}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}