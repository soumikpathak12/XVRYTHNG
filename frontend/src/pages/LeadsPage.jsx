// LeadsPage.jsx
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import KanbanBoard from '../components/leads/KanbanBoard.jsx';
import { STAGES } from '../components/leads/KanbanBoard.jsx';
import LeadsTable from '../components/leads/LeadsTable.jsx';
import LeadDetailModal from '../components/leads/LeadDetailModal.jsx';
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
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
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
  }, [transformLead, refreshTrigger]);

  const handleStageChange = useCallback(async (leadId, nextStage) => {
    setLeads((prev) =>
      prev.map((l) => (String(l.id) === String(leadId) ? { ...l, stage: nextStage } : l))
    );
    try {
      const res = await apiUpdateLeadStage(leadId, nextStage);
      const updated = res?.data;
      if (updated) {
        setLeads((prev) =>
          prev.map((l) => {
            if (String(l.id) !== String(leadId)) return l;
            return {
              ...l,
              stage: updated.stage,
              lastActivity: view === 'table' ? l.lastActivity : (updated.last_activity_at || l.lastActivity),
              _raw: updated,
            };
          })
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
  }, [view]);

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

  function exportLeadsCsv() {
    const stageLabelByKey = Object.fromEntries(STAGES.map((s) => [s.key, s.label]));
    const escape = (v) => {
      const s = (v ?? '').toString();
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const headers = ['Name', 'Suburb', 'Stage', 'Value', 'System', 'Source', 'Last activity'];
    const rows = boardLeads.map((lead) => {
      const lastActivity = lead.lastActivity
        ? (() => {
            const d = new Date(lead.lastActivity);
            return isNaN(d.getTime()) ? lead.lastActivity : d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
          })()
        : '';
      const value = lead.value != null ? String(lead.value) : '';
      return [
        escape(lead.customerName),
        escape(lead.suburb),
        escape(stageLabelByKey[lead.stage] || lead.stage),
        escape(value),
        escape(lead.systemSize),
        escape(lead.source),
        escape(lastActivity),
      ];
    });
    const csvContent = [headers.map(escape).join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
          {view === 'table' && (
            <div className="leads-filter-bar-right">
              <button
                type="button"
                className="leads-export-csv-btn"
                onClick={exportLeadsCsv}
                disabled={boardLeads.length === 0}
              >
                Export CSV
              </button>
            </div>
          )}
        </div>
      </header>

      {toast && <div className="leads-toast">{toast}</div>}

      <div className="leads-page-content">
        {loading ? (
          <div className="leads-loading">Loading leads…</div>
        ) : error ? (
          <div className="leads-error-box">{error}</div>
        ) : view === 'table' ? (
          <LeadsTable leads={boardLeads} onStageChange={handleStageChange} onSelectLead={setSelectedLeadId} />
        ) : (
          <KanbanBoard leads={boardLeads} onStageChange={handleStageChange} onFocusSearch={focusSearch} onSelectLead={setSelectedLeadId} />
        )}
      </div>

      {selectedLeadId != null && (
        <LeadDetailModal
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onLeadUpdated={(id, newStage) => {
            if (newStage) {
              setLeads((prev) => prev.map((l) => (String(l.id) === String(id) ? { ...l, stage: newStage } : l)));
            } else {
              setRefreshTrigger((t) => t + 1);
            }
          }}
        />
      )}

      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Add New Lead">
        <AddLeadForm onCancel={() => setOpenAdd(false)} onSubmit={handleCreated} />
      </Modal>
    </div>
  );
}
