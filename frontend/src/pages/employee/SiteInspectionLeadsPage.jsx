import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LeadsCalendar from '../../components/leads/LeadsCalendar.jsx';
import { getLeads } from '../../services/api.js';
import '../../styles/LeadsKanban.css';

export default function SiteInspectionLeadsPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('month'); // day | week | month

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchInputRef = useRef(null);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(id);
  }, [search]);

  const transformLead = useCallback((row) => {
    if (!row) return null;
    return {
      id: row.id,
      stage: row.stage,
      customerName: row.customer_name ?? row.customerName ?? '—',
      suburb: row.suburb ?? '',
      source: row.source ?? '',
      systemSize: row.system_size_kw ?? row.systemSize ?? null,
      value: row.value_amount ?? row.value ?? null,
      lastActivity: row.last_activity_at ?? row.updated_at ?? null,
      _raw: row,
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        // IMPORTANT: Site Inspection scope (employee only) -> backend filters by lead_site_inspections.inspector_id
        const resp = await getLeads({ search: debouncedSearch || undefined, site_inspection: true });
        const rows = Array.isArray(resp?.data) ? resp.data : [];
        const next = rows.map(transformLead).filter(Boolean);
        if (alive) setLeads(next);
      } catch (e) {
        if (alive) setError(e?.message || 'Failed to load leads');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [debouncedSearch, transformLead]);

  const calendarLeads = useMemo(
    () => leads.filter((l) => l?._raw?.site_inspection_scheduled_at || l?._raw?.scheduled_at),
    [leads]
  );

  if (loading) return <div className="leads-loading">Loading…</div>;
  if (error) return <div className="leads-toast">{error}</div>;

  return (
    <div className="leads-kanban-page">
      <header className="leads-kanban-header">
        <div className="leads-kanban-header-top">
          <div className="leads-kanban-title">
            <h1>Site Inspection</h1>
            <p>Your scheduled inspections. Use the calendar to open an inspection.</p>
          </div>
          <div className="leads-kanban-actions">
            <div className="leads-view-tabs">
              {['day', 'week', 'month'].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`leads-view-tab ${viewMode === m ? 'active' : ''}`}
                  onClick={() => setViewMode(m)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {m === 'day' ? 'Daily' : m === 'week' ? 'Weekly' : 'Monthly'}
                </button>
              ))}
            </div>
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
              placeholder="Search by name, suburb, source…"
              aria-label="Search inspections"
            />
            {search && (
              <button
                type="button"
                className="leads-search-clear"
                onClick={() => setSearch('')}
                title="Clear search"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
          <span className="leads-result-count">
            {calendarLeads.length} inspection{calendarLeads.length !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

      <div className="leads-page-content">
        <div className="leads-calendar-wrap">
          <LeadsCalendar
            leads={calendarLeads}
            getDate={(l) => l._raw?.site_inspection_scheduled_at ?? l._raw?.scheduled_at ?? null}
            onLeadClick={(lead) => navigate(`/employee/leads/${lead.id}/site-inspection`)}
            viewMode={viewMode}
          />
        </div>
      </div>
    </div>
  );
}

