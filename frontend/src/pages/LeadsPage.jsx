// LeadsPage.jsx
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import KanbanBoard from '../components/leads/KanbanBoard.jsx';
import { STAGES } from '../components/leads/KanbanBoard.jsx';
import LeadsTable from '../components/leads/LeadsTable.jsx';
import LeadsCalendar from '../components/leads/LeadsCalendar.jsx';
import Modal from '../components/common/Modal.jsx';
import AddLeadForm from '../components/leads/LeadForm.jsx';
import {
  getLeads,
  updateLeadStage as apiUpdateLeadStage,
  createLead as apiCreateLead,
  importSolarQuotesLeads,
} from '../services/api.js';
import ImportLeadsModal from '../components/leads/ImportLeadsModal.jsx';
import '../styles/LeadsKanban.css';

function useLeadBase() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/admin')) return '/admin';
  if (pathname.startsWith('/employee')) return '/employee';
  return '/dashboard'; // fallback cho company
}

export default function LeadsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const base = useLeadBase();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openAdd, setOpenAdd] = useState(false);
  const [leadCreatedModalOpen, setLeadCreatedModalOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [toast, setToast] = useState('');
  const [toastVariant, setToastVariant] = useState('error'); // 'success' | 'error'
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchInputRef = useRef(null);
  const [sourceFilter, setSourceFilter] = useState('');
  const [daysFilter, setDaysFilter] = useState('');

  const isEmployeeView = base === '/employee';
  const getInitialView = () => {
    const params = new URLSearchParams(location.search);
    const v = (params.get('view') || '').toLowerCase();
    return ['kanban', 'table', 'calendar'].includes(v) ? v : 'kanban';
  };
  const [view, setView] = useState(getInitialView());
  const [calendarViewMode, setCalendarViewMode] = useState('month'); // day | week | month

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

  const handleLeadCreatedOk = useCallback(() => {
    setLeadCreatedModalOpen(false);
    navigate({ pathname: location.pathname, search: '?view=kanban' }, { replace: true });
    setView('kanban');
  }, [navigate, location.pathname]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(id);
  }, [search]);

  // Accept both snake_case (GET) and camelCase (create API)
  const transformLead = useCallback((row) => {
    if (!row) return null;
    const systemSizeKw =
      row.system_size_kw != null
        ? Number(row.system_size_kw)
        : row.systemSize != null
        ? Number(row.systemSize)
        : null;

    const valueNum =
      row.value_amount != null
        ? Number(row.value_amount)
        : row.value != null
        ? Number(row.value)
        : null;

    return {
      id: row.id,
      customerName: row.customer_name ?? row.customerName ?? '',
      suburb: row.suburb ?? '',
      systemSize: systemSizeKw != null ? `${systemSizeKw}kW` : '',
      value: valueNum != null ? valueNum : null,
      source: row.source ?? '',
      lastActivity: row.last_activity_at ?? row.lastActivity ?? '',
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
        const mapped = arr.map(transformLead).filter(Boolean);
        if (alive) setLeads(mapped);
      } catch (err) {
        if (alive) setError(err.message || 'Failed to load leads');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [transformLead, refreshTrigger]);

  const handleStageChange = useCallback(
    async (leadId, nextStage) => {
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
                lastActivity: view === 'table' ? l.lastActivity : updated.last_activity_at || l.lastActivity,
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
        setToastVariant('error');
        setToast(err.message || 'Failed to update stage');
        setTimeout(() => setToast(''), 3000);
      }
    },
    [view]
  );

  const goLeadDetail = useCallback(
    (id) => navigate(`${base}/leads/${id}`),
    [navigate, base]
  );

  const handleCreateLead = useCallback(
    async (payload) => {
      try {
        const created = await apiCreateLead(payload); // returns camelCase with numeric id
        const card = transformLead(created);
        if (card) setLeads((prev) => [card, ...prev]);
        setOpenAdd(false);
        return created;
      } catch (err) {
        throw err;
      }
    },
    [transformLead]
  );

  const handleImportSolarQuotes = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await importSolarQuotesLeads();
      const count = res.count || 0;
      setSyncResult({ success: true, count });
      setRefreshTrigger((t) => t + 1);
    } catch (err) {
      console.error('Import failed', err);
      setSyncResult({ success: false, error: err.message || 'SolarQuotes import failed' });
    } finally {
      setSyncing(false);
    }
  }, []);

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
            return isNaN(d.getTime())
              ? lead.lastActivity
              : d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
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

  const calendarLeads = useMemo(
    () => boardLeads.filter((l) => l._raw?.site_inspection_date),
    [boardLeads]
  );

  const focusSearch = useCallback((stageKey = null) => {
    setSearchStage(stageKey);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  return (
    <div className="leads-kanban-page">
      <header className="leads-kanban-header">
        <div className="leads-kanban-header-top">
          <div className="leads-kanban-title">
            <h1>Leads Pipeline</h1>
            <p>
              Manage leads across stages. Search, filter, and drag cards between columns.
            </p>
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
                onClick={() => switchView('calendar')}
              >
                Calendar
              </button>
            </div>
            <button type="button" className="leads-add-btn" onClick={() => setOpenAdd(true)}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add New Lead
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
                if (!search) {
                  setSearchStage(null);
                }
              }}
              placeholder={
                searchStage ? `Search in ${searchStage.replace('_', ' ')}...` : 'Search by name, suburb, source, stage...'
              }
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
              <option key={s} value={s}>
                {s}
              </option>
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
              <button type="button" className="leads-export-csv-btn" onClick={exportLeadsCsv} disabled={boardLeads.length === 0}>
                Export CSV
              </button>
            </div>
          )}
          <div
            className="leads-filter-bar-right"
            style={{ marginLeft: view === 'table' ? '8px' : 'auto', display: 'flex', gap: '8px' }}
          >
            <button
              type="button"
              className="leads-add-btn bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              onClick={() => setShowImport(true)}
              style={{ backgroundColor: '#fff', color: '#374151', border: '1px solid #d1d5db' }}
            >
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                className="mr-1"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Import CSV
            </button>
            <button
              type="button"
              className="leads-add-btn"
              style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b' }}
              onClick={handleImportSolarQuotes}
              title="Fetch latest leads from SolarQuotes"
            >
              Sync SolarQuotes
            </button>
          </div>
        </div>
      </header>

      {toast && <div className={`leads-toast ${toastVariant === 'success' ? 'leads-toast-success' : ''}`}>{toast}</div>}

      <div className="leads-page-content">
        {loading ? (
          <div className="leads-loading">Loading leads…</div>
        ) : error ? (
          <div className="leads-error-box">{error}</div>
        ) : view === 'table' ? (
          <LeadsTable
            leads={boardLeads}
            onStageChange={handleStageChange}
            onSelectLead={(id) => goLeadDetail(id)}
          />
        ) : view === 'calendar' ? (
          <div className="leads-calendar-wrap">
            {isEmployeeView && (
              <div className="leads-calendar-view-tabs" style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
                {['day', 'week', 'month'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`leads-view-tab ${calendarViewMode === mode ? 'active' : ''}`}
                    onClick={() => setCalendarViewMode(mode)}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {mode === 'day' ? 'Daily' : mode === 'week' ? 'Weekly' : 'Monthly'}
                  </button>
                ))}
              </div>
            )}
            <LeadsCalendar
              leads={calendarLeads}
              getDate={(l) => l._raw?.site_inspection_date ?? null}
              titleForLead={(l) => l.customerName || `Lead #${l.id}`}
              subtitleForLead={(l) => [l.suburb, l.stage].filter(Boolean).join(' • ') || ''}
              onLeadClick={(lead) => navigate(`${base}/leads/${lead.id}/site-inspection`)}
              weekStartsOn={1}
              viewMode={isEmployeeView ? calendarViewMode : 'month'}
            />
          </div>
        ) : (
          <KanbanBoard
            leads={boardLeads}
            onStageChange={handleStageChange}
            onFocusSearch={focusSearch}
            onSelectLead={(id) => goLeadDetail(id)}
          />
        )}
      </div>

      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Add New Lead" width={720}>
        <AddLeadForm
          embedded
          suppressInlineSuccess
          onAfterCreate={() => setLeadCreatedModalOpen(true)}
          onCancel={() => setOpenAdd(false)}
          onSubmit={handleCreateLead}
        />
      </Modal>

      <Modal
        open={leadCreatedModalOpen}
        onClose={() => setLeadCreatedModalOpen(false)}
        title="Lead created"
        width={440}
      >
        <div style={{ padding: '4px 0 12px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 22px', color: '#374151', fontSize: 15, lineHeight: 1.55 }}>
            Your lead was saved successfully.
          </p>
          <button
            type="button"
            onClick={handleLeadCreatedOk}
            style={{
              padding: '12px 32px',
              borderRadius: 10,
              border: 'none',
              background: '#1A7B7B',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            OK
          </button>
        </div>
      </Modal>

      {/* Sync Modal */}
      <Modal
        open={syncing || !!syncResult}
        onClose={() => !syncing && setSyncResult(null)}
        title="Sync SolarQuotes"
        width={400}
      >
        <div style={{ padding: '20px', textAlign: 'center' }}>
          {syncing ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div className="leads-loading" style={{ margin: 0 }}></div>
              <p style={{ marginTop: '10px', color: '#6b7280' }}>Fetching leads from SolarQuotes...</p>
            </div>
          ) : syncResult?.success ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#d1fae5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>Sync Complete</h3>
              <p style={{ color: '#6b7280' }}>Successfully synced.</p>
              <button
                onClick={() => setSyncResult(null)}
                style={{
                  marginTop: '16px',
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Close
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#dc2626" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>Sync Failed</h3>
              <p style={{ color: '#ef4444' }}>{syncResult?.error || 'Unknown error occurred'}</p>
              <button
                onClick={() => setSyncResult(null)}
                style={{
                  marginTop: '16px',
                  padding: '8px 16px',
                  backgroundColor: '#e5e7eb',
                  color: '#374151',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </Modal>

      {showImport && (
        <ImportLeadsModal
          onClose={() => setShowImport(false)}
          onSuccess={(result) => {
            setRefreshTrigger((p) => p + 1);
            const imported = result?.imported ?? 0;
            setToastVariant('success');
            setToast(imported > 0 ? `Imported ${imported} lead(s) successfully` : 'Import complete');
            setTimeout(() => setToast(''), 3000);
          }}
          onError={(msg) => {
            setToastVariant('error');
            setToast(msg);
            setTimeout(() => setToast(''), 4000);
          }}
        />
      )}
    </div>
  );
}
