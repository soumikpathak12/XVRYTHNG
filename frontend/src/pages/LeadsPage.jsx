// LeadsPage.jsx
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import KanbanBoard from '../components/leads/KanbanBoard.jsx';
import Modal from '../components/common/Modal.jsx';
import AddLeadForm from '../components/leads/LeadForm.jsx';
import { getLeads, updateLeadStage as apiUpdateLeadStage } from '../services/api.js';
import '../styles/LeadsKanban.css';

export default function LeadsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openAdd, setOpenAdd] = useState(false);
  const [toast, setToast] = useState('');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchInputRef = useRef(null);
  const [sourceFilter, setSourceFilter] = useState('');
  const [daysFilter, setDaysFilter] = useState('');

  const getInitialView = () => {
    const params = new URLSearchParams(location.search);
    const v = (params.get('view') || '').toLowerCase();
    return ['kanban', 'table', 'calendar'].includes(v) ? v : 'kanban';
  };
  const [view, setView] = useState(getInitialView);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const v = (params.get('view') || '').toLowerCase();
    if (['kanban', 'table', 'calendar'].includes(v) && v !== view) {
      setView(v);
    }
  }, [location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchView = useCallback(
    (next) => {
      if (next === view) return;
      const params = new URLSearchParams(location.search);
      params.set('view', next);
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: false });
      setView(next);
    },
    [view, navigate, location.pathname, location.search]
  );

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(id);
  }, [search]);

  const transformLead = useCallback((row) => {
    const systemSizeKw = row.system_size_kw != null ? Number(row.system_size_kw) : null;
    const valueNum = row.value_amount != null ? Number(row.value_amount) : null;
    return {
      id: row.id,
      customerName: row.customer_name,
      suburb: row.suburb || '',
      systemSize: systemSizeKw != null ? `${systemSizeKw}kW` : '',
      value: valueNum != null ? valueNum : null,
      source: row.source || '',
      lastActivity: row.last_activity_at || '',
      stage: row.stage,
      _raw: row,
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getLeads();
        const arr = Array.isArray(res?.data) ? res.data : [];
        const mapped = arr.map(transformLead);
        if (alive) setLeads(mapped);
      } catch (err) {
        if (alive) setError(err.message || 'Failed to load leads');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [transformLead]);

  const handleStageChange = useCallback(async (leadId, nextStage) => {
    setLeads((prev) =>
      prev.map((l) => (String(l.id) === String(leadId) ? { ...l, stage: nextStage } : l))
    );
    try {
      const res = await apiUpdateLeadStage(leadId, nextStage);
      const updated = res?.data;
      if (updated) {
        setLeads((prev) =>
          prev.map((l) =>
            String(l.id) === String(leadId)
              ? {
                ...l,
                stage: updated.stage,
                lastActivity: updated.last_activity_at || l.lastActivity,
                _raw: updated,
              }
              : l
          )
        );
      }
    } catch (err) {
      setLeads((prev) =>
        prev.map((l) =>
          String(l.id) === String(leadId) ? { ...l, stage: l._raw?.stage || l.stage } : l
        )
      );
      setToast(err.message || 'Failed to update stage');
      setTimeout(() => setToast(''), 3000);
    }
  }, []);

  const handleCreated = useCallback(
    (createdFromForm) => {
      const row = createdFromForm?.data ?? createdFromForm;
      const card = transformLead(row);
      setLeads((prev) => [card, ...prev]);
      setOpenAdd(false);
    },
    [transformLead]
  );

  const distinctSources = useMemo(() => {
    const s = new Set(leads.map((l) => l.source).filter(Boolean));
    return Array.from(s).sort();
  }, [leads]);

  const [searchStage, setSearchStage] = useState(null);

  const filteredLeads = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    let list = leads;

    if (searchStage) {
      list = list.filter((l) => l.stage === searchStage);
    }

    if (sourceFilter) {
      list = list.filter((l) => l.source === sourceFilter);
    }
    if (daysFilter) {
      const maxDays = Number(daysFilter);
      const now = new Date();
      list = list.filter((l) => {
        if (!l.lastActivity) return false;
        const d = new Date(l.lastActivity);
        const diff = (now - d) / (1000 * 3600 * 24);
        return diff <= maxDays;
      });
    }
    if (q) {
      list = list.filter((l) => {
        const haystacks = [
          l.customerName,
          l.suburb,
          l.source,
          l.stage,
          l.systemSize,
          l.value != null ? String(l.value) : '',
        ];
        return haystacks.some((h) => (h || '').toLowerCase().includes(q));
      });
    }
    return list;
  }, [leads, debouncedSearch, sourceFilter, daysFilter, searchStage]);

  const boardLeads = filteredLeads;

  const focusSearch = useCallback((stageKey = null) => {
    setSearchStage(stageKey);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  return (
    <div className="leads-kanban-page">
      <header className="leads-kanban-header">
        <div className="leads-kanban-header-top">
          <div className="leads-kanban-title">
            <h1>Sales Pipeline</h1>
            <p>Manage leads across stages. Search, filter, and drag cards between columns.</p>
          </div>
          <div className="leads-kanban-actions">
            <div className="leads-view-tabs">
              <button
                type="button"
                className={`leads-view-tab ${view === 'kanban' ? 'active' : ''}`}
                onClick={() => switchView('kanban')}
              >
                Kanban
              </button>
              <button
                type="button"
                className={`leads-view-tab ${view === 'table' ? 'active' : ''}`}
                onClick={() => switchView('table')}
              >
                Table
              </button>
              <button
                type="button"
                className={`leads-view-tab ${view === 'calendar' ? 'active' : ''}`}
                onClick={() => {
                  switchView('calendar');
                  navigate('/admin/leads/calendar');
                }}
              >
                Calendar
              </button>
            </div>
            <button type="button" className="leads-add-btn" onClick={() => setOpenAdd(true)}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Lead
            </button>
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
              onBlur={() => {
                // If empty, collapse on blur
                if (!search) {
                  setSearchStage(null);
                }
              }}
              placeholder={searchStage ? `Search in ${searchStage.replace('_', ' ')}...` : "Search by name, suburb, source, stage..."}
              aria-label="Search leads"
            />
            {search && (
              <button
                type="button"
                className="leads-search-clear"
                onClick={() => {
                  setSearch('');
                  setSearchStage(null);
                }}
                title="Clear search"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          <select
            className="leads-filter-select"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            aria-label="Filter by source"
          >
            <option value="">All sources</option>
            {distinctSources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            className="leads-filter-select"
            value={daysFilter}
            onChange={(e) => setDaysFilter(e.target.value)}
            aria-label="Filter by last activity"
          >
            <option value="">Any time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <span className="leads-result-count">
            {boardLeads.length} lead{boardLeads.length !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

      {toast && <div className="leads-toast">{toast}</div>}

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div className="leads-loading">Loading leads…</div>
        ) : error ? (
          <div className="leads-error-box">{error}</div>
        ) : view === 'table' ? (
          <div className="leads-loading">Table view coming soon.</div>
        ) : (
          <KanbanBoard leads={boardLeads} onStageChange={handleStageChange} onFocusSearch={focusSearch} />
        )}
      </div>

      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Add New Lead">
        <AddLeadForm onCancel={() => setOpenAdd(false)} onSubmit={handleCreated} />
      </Modal>
    </div>
  );
}
