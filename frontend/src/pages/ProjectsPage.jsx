import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import ProjectsKanbanBoard from '../components/projects/ProjectsKanbanBoard.jsx';
import '../styles/LeadsKanban.css'; 

const MOCK_PROJECTS = [
  {
    id: 1,
    customerName: 'Alice Green',
    address: '45 Battery Dr, Hawthorn',
    systemSummary: '6.6 kW + Battery',
    value: 18900,
    marginPct: 18,
    assignees: ['JD', 'MK'],
    stage: 'new',
  },
  {
    id: 2,
    customerName: 'John Doe',
    address: '12 King St, Clayton',
    systemSummary: '10 kW',
    value: 12900,
    marginPct: 22,
    assignees: ['AB'],
    stage: 'pre_approval',
  },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchStage, setSearchStage] = useState(null);
  const searchInputRef = useRef(null);

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(id);
  }, [search]);

  // Initial load (replace with getProjects API)
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        if (alive) setProjects(MOCK_PROJECTS);
      } catch (err) {
        setToast(err.message || 'Failed to load projects');
        setTimeout(() => setToast(''), 3000);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Filter list by search and optional stage
  const filteredProjects = useMemo(() => {
    let list = projects;
    if (searchStage) list = list.filter((p) => p.stage === searchStage);
    if (!debouncedSearch) return list;
    const q = debouncedSearch.toLowerCase();
    return list.filter((p) => {
      const haystacks = [
        p.customerName,
        p.address,
        p.systemSummary,
        p.stage,
        p.value != null ? String(p.value) : '',
      ];
      return haystacks.some((h) => (h || '').toLowerCase().includes(q));
    });
  }, [projects, debouncedSearch, searchStage]);

  // Stage change handler (replace with API call if needed)
  const handleStageChange = useCallback(async (projectId, nextStage) => {
    setProjects((prev) => prev.map((p) => (String(p.id) === String(projectId) ? { ...p, stage: nextStage } : p)));
    try {
      // await apiUpdateProjectStage(projectId, nextStage);
    } catch (err) {
      // rollback on failure
      setProjects((prev) =>
        prev.map((p) => (String(p.id) === String(projectId) ? { ...p, stage: p._raw?.stage ?? p.stage } : p))
      );
      setToast(err.message || 'Failed to update stage');
      setTimeout(() => setToast(''), 3000);
    }
  }, []);

  // Focus search and scope it to a stage
  const focusSearch = useCallback((stageKey = null) => {
    setSearchStage(stageKey);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  // Navigate to project detail (wire up with router in real app)
  const goProjectDetail = useCallback((id) => {
    console.log('Open project detail', id);
  }, []);

  return (
    <div className="leads-kanban-page">
      <header className="leads-kanban-header">
        <div className="leads-kanban-header-top">
          <div className="leads-kanban-title">
            <h1>Projects</h1>
            <p>Track installation progress across stages.</p>
          </div>
        </div>

        <div className="leads-filter-bar">
          <div className="leads-search-wrap">
            <svg className="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={() => { if (!search) setSearchStage(null); }}
              placeholder={searchStage ? `Search in ${searchStage.replace('_', ' ')}...` : 'Search projects...'}
              aria-label="Search projects"
            />
            {search && (
              <button
                type="button"
                className="leads-search-clear"
                onClick={() => { setSearch(''); setSearchStage(null); }}
                title="Clear search"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <span className="leads-result-count">
            {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

      {toast && <div className="leads-toast">{toast}</div>}

      <div className="leads-page-content">
        {loading ? (
          <div className="leads-loading">Loading projects…</div>
        ) : (
          <ProjectsKanbanBoard
            projects={filteredProjects}
            onStageChange={handleStageChange}
            onFocusSearch={focusSearch}
            onSelectProject={(id) => goProjectDetail(id)}
          />
        )}
      </div>
    </div>
  );
}