// LeadsPage.jsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import KanbanBoard from '../components/leads/KanbanBoard.jsx';
// import LeadsTable from '../components/leads/LeadsTable.jsx'; // 👈 Keep commented until you create it
import Modal from '../components/common/Modal.jsx';
import AddLeadForm from '../components/leads/NewLeadForm.jsx';
import { getLeads, updateLeadStage as apiUpdateLeadStage } from '../services/api.js';

export default function LeadsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openAdd, setOpenAdd] = useState(false);
  const [toast, setToast] = useState('');

  // 🔎 Search state (raw input) + debounced value for smoother UX
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // ✅ View state synced with URL (?view=kanban|table|calendar)
  const getInitialView = () => {
    const params = new URLSearchParams(location.search);
    const v = (params.get('view') || '').toLowerCase();
    return ['kanban', 'table', 'calendar'].includes(v) ? v : 'kanban';
  };
  const [view, setView] = useState(getInitialView);

  // Keep view in sync with URL when the URL changes (e.g., history nav)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const v = (params.get('view') || '').toLowerCase();
    if (['kanban', 'table', 'calendar'].includes(v) && v !== view) {
      setView(v);
    }
  }, [location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  // When user changes view, push it to the URL
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

  // Simple debounce (250ms)
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
        // If you want server-side search later: getLeads({ search: debouncedSearch })
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
    return () => {
      alive = false;
    };
    // We do NOT re-fetch on debouncedSearch (client-side filter).
  }, [transformLead]);

  const handleStageChange = useCallback(async (leadId, nextStage) => {
    // Optimistic UI
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
      // Rollback
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

  // 🔎 Client-side filter — search over key fields
  const filteredLeads = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    if (!q) return leads;

    return leads.filter((l) => {
      // Check meaningful fields; stringify numbers safely
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
  }, [leads, debouncedSearch]);

  // ⛳ Kanban takes the filtered list
  const boardLeads = useMemo(() => filteredLeads, [filteredLeads]);

  // Simple styles reused across buttons
  const tabBtnStyle = (active) => ({
    padding: '8px 12px',
    borderRadius: 8,
    background: active ? '#111827' : '#F3F4F6',
    color: active ? 'white' : '#111827',
    border: '1px solid #E5E7EB',
    fontWeight: 700,
    cursor: 'pointer',
  });

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f1a2b' }}>
            Sales Pipeline
          </h1>
          <p style={{ marginTop: 6, color: '#6B7280' }}>
            Switch between Kanban, Table, and Calendar. Drag &amp; drop or edit stage inline.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* 🔎 Search box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              padding: '8px 10px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 21l-3.8-3.8M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                stroke="#6B7280"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads… (name, suburb, stage, source)"
              style={{
                border: 'none',
                outline: 'none',
                width: 240,
                fontSize: 14,
                color: '#111827',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                title="Clear"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#6B7280',
                  cursor: 'pointer',
                  fontWeight: 700,
                  padding: 2,
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Results count */}
          <span style={{ color: '#6B7280', fontSize: 12 }}>
            {debouncedSearch
              ? `${boardLeads.length} result${boardLeads.length === 1 ? '' : 's'}`
              : `${leads.length} total`}
          </span>

          {/* View switch buttons */}
          <button style={tabBtnStyle(view === 'kanban')} onClick={() => switchView('kanban')}>
            Kanban
          </button>

          {/* Table – active styling handled; does nothing (no render) until you add the component */}
          <button style={tabBtnStyle(view === 'table')} onClick={() => switchView('table')}>
            Table
          </button>

          {/* Calendar – keeps your existing route */}
          <button
            style={tabBtnStyle(view === 'calendar')}
            onClick={() => {
              switchView('calendar'); // set URL ?view=calendar for consistency
              navigate('/admin/leads/calendar');
            }}
          >
            Calendar
          </button>

          <button
            onClick={() => setOpenAdd(true)}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: '#10B981',
              color: 'white',
              border: 'none',
              fontWeight: 700,
              boxShadow: '0 2px 10px rgba(16,185,129,0.3)',
              cursor: 'pointer',
            }}
          >
            + Add New Lead
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            marginTop: 12,
            background: '#FEF2F2',
            color: '#991B1B',
            border: '1px solid #FECACA',
            padding: '8px 10px',
            borderRadius: 8,
          }}
        >
          {toast}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ marginTop: 20, color: '#6B7280' }}>Loading leads…</div>
      ) : error ? (
        <div
          style={{
            marginTop: 20,
            background: '#FEF2F2',
            color: '#991B1B',
            border: '1px solid #FECACA',
            padding: '8px 10px',
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      ) : view === 'table' ? (
        // 👇 Placeholder while table component is not yet created
        <div style={{ marginTop: 20, color: '#6B7280' }}>
          Table view coming soon. (Create <code>LeadsTable.jsx</code> and import it to enable.)
        </div>
        // Once created, replace with:
        // <LeadsTable leads={boardLeads} onStageChange={handleStageChange} />
      ) : (
        // Default = Kanban (local page). Calendar is navigated to a different route.
        <KanbanBoard leads={boardLeads} onStageChange={handleStageChange} />
      )}

      {/* Add Lead */}
      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Add New Lead">
        <AddLeadForm onCancel={() => setOpenAdd(false)} onCreate={handleCreated} />
      </Modal>
    </div>
  );
}
``