// src/pages/RetailerProjectsPage.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ProjectsKanbanBoard from '../components/projects/ProjectsKanbanBoard.jsx';
import ProjectsTable from '../components/projects/ProjectsTable.jsx';
import ProjectsCalendar from '../components/projects/ProjectCalendar.jsx';
import ProjectsTimeline from '../components/projects/ProjectsTimeline.jsx';

// Retailer-specific APIs
import {
  getRetailerProjects,
  createRetailerProject,
  updateRetailerProjectStage,
  getRetailerProjectSchedule,
  saveRetailerProjectSchedule,

  // Optional (reuse): inspection + employees (if you show them in details)
  getProjectInspection,
  getCompanyEmployees,

  // NEW: assignees endpoints
  getRetailerProjectAssignees,
  saveRetailerProjectAssignees,
} from '../services/api.js';

// Modals
import RetailerProjectCreatePanel from '../components/projects/RetailerProjectCreatePanel.jsx';
import RetailerProjectDetailsPanel from '../components/projects/RetailerProjectDetailsPanel.jsx';

import '../styles/LeadsKanban.css';

// ---- Retailer Projects: 14 columns (display order) ----
const RETAILER_PROJECT_STAGES = [
  { key: 'new', label: 'New' },
  { key: 'site_inspection', label: 'Site Inspection' },
  { key: 'stage_one', label: 'Stage One' },
  { key: 'stage_two', label: 'Stage Two' },
  { key: 'full_system', label: 'Full System' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'to_be_rescheduled', label: 'To Be Rescheduled' },
  { key: 'installation_in_progress', label: 'Installation In‑Progress' },
  { key: 'installation_completed', label: 'Installation Completed' },
  { key: 'ces_certificate_applied', label: 'CES Certificate Applied' },
  { key: 'ces_certificate_received', label: 'CES Certificate Received' },
  { key: 'ces_certificate_submitted', label: 'CES Certificate Submitted' },
  { key: 'done', label: 'Done' },
];

// Optional mapping for legacy/alternate keys returned by the API
const RETAILER_LEGACY_STAGE_MAP = {
  siteinspection: 'site_inspection',
  stage1: 'stage_one',
  stage2: 'stage_two',
  fullsystem: 'full_system',
  to_be_re_scheduled: 'to_be_rescheduled',
  install_in_progress: 'installation_in_progress',
  installation_in_progress: 'installation_in_progress',
  installation_completed: 'installation_completed',
  ces_applied: 'ces_certificate_applied',
  ces_received: 'ces_certificate_received',
  ces_submitted: 'ces_certificate_submitted',
  project_completed: 'done',
};

const stageLabelByKey = new Map(RETAILER_PROJECT_STAGES.map(s => [s.key, s.label]));

/** Map job_type to stage for optimistic UI after schedule save */
function stageFromJobType(jobType, fallback) {
  switch (jobType) {
    case 'site_inspection': return 'site_inspection';
    case 'stage_one':       return 'stage_one';
    case 'stage_two':       return 'stage_two';
    case 'full_system':     return 'full_system';
    default:                return fallback;
  }
}

/**
 * Normalize a retailer_projects DB row into the UI-friendly object
 * that Kanban cards, table rows, and calendar tiles expect.
 */
function normalizeProject(row) {
  // Retailer table uses `system_size_kw` & `value_amount`
  const sizeKw = row.system_size_kw;
  const value = row.value_amount;

  // Minimal system summary: "X kW"
  let systemSummary;
  if (sizeKw != null && !Number.isNaN(Number(sizeKw))) {
    const kw = Number(sizeKw);
    systemSummary = `${kw} kW`;
  } else if (row.systemSummary) {
    systemSummary = row.systemSummary;
  }

  // Basic presentation fields
  const suburb = row.suburb ?? '';
  const address = row.address ?? undefined;

  return {
    id: row.id,
    code: row.code,                                  // e.g., "PRJ-01"
    stage: row.stage,
    customerName: row.customer_name ?? '—',
    address,
    suburb,
    source: null,
    lastActivity: row.updated_at ?? null,
    systemSummary,
    value,
    marginPct: null,                                 // Not used in Retailer page
    assignees: [],                                   // Not wired on list; details loads them as needed
    _raw: row,
  };
}

/** Utility to format local time label for calendar subtitle */
function formatLocalTimeLabel(dateLike) {
  if (!dateLike) return '';
  try {
    const ds = typeof dateLike === 'string' && !dateLike.includes('T')
      ? dateLike.replace(' ', 'T')
      : dateLike;
    const d = new Date(ds);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(d);
  } catch {
    return '';
  }
}

function getBaseFromPathname(pathname) {
  if (pathname.startsWith('/admin')) return '/admin';
  if (pathname.startsWith('/employee')) return '/employee';
  return '/dashboard';
}

export default function RetailerProjectsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const base = getBaseFromPathname(location.pathname);

  // Core list state
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error'); // 'success' | 'error'

  // Search/filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchStage, setSearchStage] = useState(null);
  const [daysFilter, setDaysFilter] = useState('');
  const searchInputRef = useRef(null);

  // Details modal state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [inspection, setInspection] = useState(null);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [detailsSchedule, setDetailsSchedule] = useState(null);
  const [detailsAssignees, setDetailsAssignees] = useState([]); // NEW

  // Calendar state (retailer schedule)
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [scheduleMap, setScheduleMap] = useState(new Map()); // Map<projectId, { scheduled_at, job_type?, notes? }>

  // View tabs
  const [view, setView] = useState('kanban');

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);

  /** Debounce search input to avoid spamming the server */
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(id);
  }, [search]);

  /** Load retailer projects from the dedicated endpoint */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const resp = await getRetailerProjects({ search: debouncedSearch, stage: searchStage || undefined });
        if (alive) {
          const rows = Array.isArray(resp?.data) ? resp.data : [];
          setProjects(rows.map(normalizeProject));
        }
      } catch (err) {
        setToastType('error');
        setToast(err.message || 'Failed to load projects');
        setTimeout(() => setToast(''), 3000);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [debouncedSearch, searchStage]);

  const filteredProjects = useMemo(() => {
    let list = projects;
    if (daysFilter) {
      const maxDays = Number(daysFilter);
      const now = new Date();
      list = list.filter((p) => {
        if (!p.lastActivity) return false;
        const d = new Date(p.lastActivity);
        const diff = (now - d) / (1000 * 3600 * 24);
        return diff <= maxDays;
      });
    }
    return list;
  }, [projects, daysFilter]);

  /**
   * Handle stage change when dragging a card between columns in the Kanban board.
   * Uses retailer-specific endpoint.
   */
  const handleStageChange = useCallback(async (projectId, nextStage) => {
    // Optimistic UI update
    setProjects((prev) =>
      prev.map((p) =>
        String(p.id) === String(projectId) ? { ...p, stage: nextStage, _reverting: p.stage } : p
      )
    );

    try {
      await updateRetailerProjectStage(projectId, nextStage);
    } catch (err) {
      // Revert on error
      setProjects((prev) =>
        prev.map((p) =>
          String(p.id) === String(projectId)
            ? { ...p, stage: p._reverting ?? p.stage, _reverting: undefined }
            : p
        )
      );
      setToast(err.message || 'Failed to update stage');
      setToastType('error');
      setTimeout(() => setToast(''), 3000);
    } finally {
      // Clear the reverting flag
      setProjects((prev) => prev.map((p) => ({ ...p, _reverting: undefined })));
    }
  }, []);

  /** Focus the search box and optionally constrain by a single stage (from Kanban jump buttons) */
  const focusSearch = useCallback((stageKey = null) => {
    setSearchStage(stageKey);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  /** Open details full page */
  const openDetails = useCallback((id) => {
    navigate(`${base}/projects/retailer/${id}`);
  }, [navigate, base]);

  // Prefer user's chosen Status (nextStage) over job_type mapping.
  // If nextStage is provided, set that stage and patch to backend.
  // Otherwise, fall back to stageFromJobType(job_type).
  const handleSaveSchedule = useCallback(
    async ({ id, job_type, date, time, notes, assignees, nextStage }) => {
      try {
        // 1) Save schedule to retailer endpoint (BE may sync stage to job_type)
        await saveRetailerProjectSchedule(id, { job_type, date, time, notes });

        // 2) Decide final stage on FE:
        //    - If user picked a Status => use it and patch it.
        //    - Else => rely on job_type mapping (same as server behavior).
        if (nextStage) {
          // Optimistic UI to chosen status
          setProjects(prev =>
            prev.map(p =>
              String(p.id) === String(id) ? { ...p, stage: nextStage } : p
            )
          );
          // Persist stage to backend
          await updateRetailerProjectStage(id, nextStage);
        } else {
          // No explicit Status chosen -> fallback to job_type mapping
          setProjects(prev =>
            prev.map(p =>
              String(p.id) === String(id)
                ? { ...p, stage: stageFromJobType(job_type, p.stage) }
                : p
            )
          );
        }

        // 3) Refresh schedule in details (optional but nice)
        try {
          const sch = await getRetailerProjectSchedule(id);
          setDetailsSchedule(sch?.data ?? null);
        } catch { /* ignore */ }

        // 4) Optionally persist assignees together with schedule (kept separate in our flow)
        if (Array.isArray(assignees) && assignees.length >= 0) {
          await saveRetailerProjectAssignees(id, assignees);
          setDetailsAssignees(assignees.map(Number));
        }
      } catch (err) {
        setToastType('error');
        setToast(err.message || 'Failed to save schedule');
        setTimeout(() => setToast(''), 3000);
      }
    },
    [projects]
  );

  /** Save assignees from panel (chips) */
  const handleAssign = useCallback(async ({ id, assignees }) => {
    await saveRetailerProjectAssignees(id, assignees || []);
    setDetailsAssignees((assignees || []).map(Number));
  }, []);

  /** View mode switcher */
  const switchView = useCallback((next) => {
    setView(next);
    // Clear filters unless moving back to kanban
    if (next !== 'kanban') {
      setSearch('');
      setSearchStage(null);
    }
  }, []);

  /** Export (table view): includes project code to make CSV more informative */
  const exportProjectsCsv = useCallback(() => {
    const headers = ['Code', 'Customer', 'Stage', 'Address', 'System', 'Value'];
    const rows = filteredProjects.map((p) => [
      p.code || '',
      p.customerName || '',
      p.stage || '',
      p.address || '',
      p.systemSummary || '',
      p.value != null ? String(p.value) : '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((s) => {
      const v = (s ?? '').toString();
      return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retailer-projects-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredProjects]);

  /** Load schedules for calendar view (retailer endpoint per project) */
  useEffect(() => {
    if (view !== 'calendar') return;
    let alive = true;
    (async () => {
      try {
        setCalendarLoading(true);
        const results = await Promise.allSettled(
          projects.map(p => getRetailerProjectSchedule(p.id))
        );
        const next = new Map();
        results.forEach((res, idx) => {
          if (res.status === 'fulfilled') {
            const p = projects[idx];
            const s = res.value?.data ?? null;
            if (s?.scheduled_at) {
              next.set(p.id, {
                scheduled_at: s.scheduled_at,
                job_type: s.job_type ?? null,
                notes: s.notes ?? null,
              });
            }
          }
        });
        if (alive) setScheduleMap(next);
      } catch {
        if (alive) setScheduleMap(new Map());
      } finally {
        if (alive) setCalendarLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [projects, view]);

  // Only include projects with a scheduled date in the calendar view
  const calendarProjects = useMemo(() => {
    if (!scheduleMap || scheduleMap.size === 0) return [];
    return projects.filter((p) => !!scheduleMap.get(p.id)?.scheduled_at);
  }, [projects, scheduleMap]);

  return (
    <div className="leads-kanban-page">
      <header className="leads-kanban-header">
        <div className="leads-kanban-header-top">
          <div className="leads-kanban-title">
            <h1>Retailer Projects</h1>
            <p>Track retailer project flow across 14 stages. Switch views to analyze.</p>
          </div>

          {/* View tabs + Add button */}
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
              <button
                type="button"
                className={`leads-view-tab ${view === 'timeline' ? 'active' : ''}`}
                onClick={() => switchView('timeline')}
              >
                Timeline
              </button>
            </div>

            {/* "Add New Project" button that opens the creation modal */}
            <button
              type="button"
              className="leads-add-btn"
              onClick={() => setCreateOpen(true)}
              title="Add New Project"
              aria-label="Add New Project"
              style={{ marginLeft: 12, backgroundColor: '#0d9488', borderColor: '#0d9488' }}
            >
              + Add New Project
            </button>
          </div>
        </div>

        {/* Search/filter bar */}
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
              placeholder={searchStage ? `Search in ${searchStage.replace('_', ' ')}...` : 'Search retailer projects...'}
              aria-label="Search retailer projects"
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
            {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
          </span>

          {view === 'table' && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="leads-add-btn"
                onClick={exportProjectsCsv}
                style={{ backgroundColor: '#3b82f6', borderColor: '#3b82f6' }}
              >
                Export CSV
              </button>
            </div>
          )}
        </div>
      </header>

      {toast && (
        <div className={`leads-toast ${toastType === 'success' ? 'leads-toast-success' : ''}`}>
          {toast}
        </div>
      )}

      <div className="leads-page-content">
        {loading ? (
          <div className="leads-loading">Loading projects…</div>
        ) : view === 'table' ? (
          <ProjectsTable
            projects={filteredProjects}
            onRowClick={(id) => openDetails(id)}
            onStageChange={handleStageChange}
          />
        ) : view === 'calendar' ? (
          <div className="leads-calendar-wrap">
            {calendarLoading ? (
              <div className="leads-loading">Loading calendar…</div>
            ) : (
              <ProjectsCalendar
                projects={calendarProjects}
                getDate={(p) => scheduleMap.get(p.id)?.scheduled_at ?? null}
                // Show code + customer for better identification on calendar tiles
                titleForProject={(p) => `${p.code || `Project #${p.id}`} — ${p.customerName ?? ''}`}
                subtitleForProject={(p) => {
                  const t = formatLocalTimeLabel(scheduleMap.get(p.id)?.scheduled_at);
                  const label = stageLabelByKey.get(p.stage) ?? p.stage;
                  return [t, label].filter(Boolean).join(' • ');
                }}
                onProjectClick={(p) => openDetails(p.id)}
                weekStartsOn={1}
              />
            )}
          </div>
        ) : view === 'timeline' ? (
          <ProjectsTimeline projects={filteredProjects} />
        ) : (
          <ProjectsKanbanBoard
            projects={filteredProjects}
            stages={RETAILER_PROJECT_STAGES}
            legacyStageMap={RETAILER_LEGACY_STAGE_MAP}
            onStageChange={handleStageChange}
            onFocusSearch={focusSearch}
            onSelectProject={(id) => openDetails(id)}
          />
        )}
      </div>

      {/* Creation modal: backend generates project `code` */}
      <RetailerProjectCreatePanel
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (payload) => {
          // Create on the server; it returns the created row including the generated `code`
          const resp = await createRetailerProject(payload);
          const created = resp?.data;
          if (created) {
            setProjects((prev) => [normalizeProject(created), ...prev]);
            setToastType('success');
            setToast(`Created ${created.code} successfully`);
            setTimeout(() => setToast(''), 2500);
          }
        }}
      />
    </div>
  );
}