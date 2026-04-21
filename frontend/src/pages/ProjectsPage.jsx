// src/pages/ProjectsPage.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProjectsKanbanBoard, { DEFAULT_PROJECT_STAGES } from '../components/projects/ProjectsKanbanBoard.jsx';
import ProjectsTable from '../components/projects/ProjectsTable.jsx';
import ProjectsCalendar from '../components/projects/ProjectCalendar.jsx';
import ProjectsTimeline from '../components/projects/ProjectsTimeline.jsx';
import {
  getProjects,
  updateProjectStage,
  getProjectInspection,
  getCompanyEmployees,
  saveProjectScheduleAssign,
  getProjectScheduleAssign,
  getCompanyWorkflow,
  getProjectDocuments,
  listInstallationJobs,
} from '../services/api.js';
import '../styles/LeadsKanban.css';

function isForwardProjectStageMove(currentStage, nextStage, orderKeys) {
  const keys = orderKeys && orderKeys.length ? orderKeys : DEFAULT_PROJECT_STAGES.map((s) => s.key);
  const a = keys.indexOf(currentStage);
  const b = keys.indexOf(nextStage);
  return a !== -1 && b !== -1 && b > a;
}

/** Map DB / legacy stage keys onto the current default pipeline for kanban grouping */
const LEGACY_PROJECT_STAGE_MAP = {
  pre_approval: 'new',
  state_rebate: 'new',
  design_engineering: 'new',
  procurement: 'new',
  compliance_check: 'ces_certificate_applied',
  inspection_grid_connection: 'grid_connection_initiated',
  rebate_stc_claims: 'grid_connection_completed',
  project_completed: 'system_handover',
};

function normalizeProject(row) {
  const sizeKw = row.lead_pv_system_size_kw ?? row.lead_system_size_kw ?? row.system_size_kw;
  const sysType = row.lead_system_type ?? row.system_type;
  const value = row.lead_value_amount ?? row.value_amount ?? row.value;
  let systemSummary;
  if (sizeKw != null && !Number.isNaN(Number(sizeKw))) {
    const kw = Number(sizeKw);
    systemSummary = `${kw} kW${sysType ? ' • ' + String(sysType) : ''}`;
  } else if (row.systemSummary) {
    systemSummary = row.systemSummary;
  }
  const suburb = row.lead_suburb ?? row.suburb ?? '';
  const source = row.lead_source ?? row.source ?? '';
  const lastActivity = row.lead_last_activity_at ?? row.last_activity_at ?? row.updated_at ?? null;
  const address = row.address ?? row.lead_suburb ?? row.suburb ?? undefined;
  return {
    id: row.id,
    // Project code must match Lead code: PRJ-<lead_id>
    projectCode:
      row.project_code ||
      row.projectCode ||
      (row.lead_id != null ? `PRJ-${row.lead_id}` : ''),
    stage: row.stage,
    customerName: row.customerName ?? row.customer_name ?? '—',
    address,
    suburb,
    source,
    lastActivity,
    systemSummary,
    value,
    marginPct: row.marginPct,
    assignees: row.assignees ?? [],
    _raw: row,
  };
}

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

export default function ProjectsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null); // { msg: string, kind?: 'error'|'success'|'info', sticky?: boolean } | null
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchStage, setSearchStage] = useState(null);
  const [daysFilter, setDaysFilter] = useState('');

  // NEW: Calendar state for schedules
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [scheduleMap, setScheduleMap] = useState(new Map()); // Map<projectId, { scheduled_at, status?, notes? }>
  const [calendarJobs, setCalendarJobs] = useState([]);
  const searchInputRef = useRef(null);
  const toastTimerRef = useRef(null);
  const [wfProjectStages, setWfProjectStages] = useState(null);

  // View state (kanban/table/calendar)
  const [view, setView] = useState('kanban');

  const projectKanbanStages = useMemo(
    () => (wfProjectStages && wfProjectStages.length ? wfProjectStages : DEFAULT_PROJECT_STAGES),
    [wfProjectStages]
  );
  const projectOrderKeys = useMemo(() => projectKanbanStages.map((s) => s.key), [projectKanbanStages]);

  /** Debounce search */
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(id);
  }, [search]);

  const showToast = useCallback((msg, { kind = 'error', sticky = false, timeoutMs } = {}) => {
    if (!msg) return;
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast({ msg: String(msg), kind, sticky: !!sticky });
    if (!sticky) {
      const ms = timeoutMs != null ? Number(timeoutMs) : (kind === 'error' ? 5000 : 3000);
      toastTimerRef.current = window.setTimeout(() => {
        setToast(null);
        toastTimerRef.current = null;
      }, Number.isFinite(ms) ? ms : 3000);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const body = await getCompanyWorkflow();
        const d = body?.data ?? body;
        const st = d?.project_management?.stages;
        if (alive && Array.isArray(st) && st.length) setWfProjectStages(st);
      } catch (_) {
        if (alive) setWfProjectStages(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** Load projects */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const resp = await getProjects({ search: debouncedSearch, stage: searchStage || undefined });
        if (alive) {
          const rows = Array.isArray(resp?.data) ? resp.data : [];
          setProjects(rows.map(normalizeProject));
        }
      } catch (err) {
        showToast(err.message || 'Failed to load projects', { kind: 'error' });
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

  const handleStageChange = useCallback(async (projectId, nextStage) => {
    const current = projects.find((p) => String(p.id) === String(projectId));
    const keys = projectOrderKeys;

    if (current && isForwardProjectStageMove(current.stage, nextStage, keys)) {
      const raw = current._raw || {};
      const preRef = String(
        raw.lead_pre_approval_reference_no ?? raw.pre_approval_reference_no ?? '',
      ).trim();
      const solarVic = raw.lead_solar_vic_eligibility ?? raw.solar_vic_eligibility;

      if (!preRef || solarVic == null || solarVic === '') {
        showToast(
          'Pre-approval reference number and Solar Victoria eligibility are required before moving to a later stage. Open the project and complete Utility information.',
          { kind: 'error', sticky: true }
        );
        return;
      }
    }

    const idxGrid = keys.indexOf('grid_connection_initiated');
    const idxNext = keys.indexOf(nextStage);
    if (current && idxGrid !== -1 && idxNext !== -1 && idxNext > idxGrid) {
      const raw = current._raw || {};
      const postRef = String(raw.post_install_reference_no ?? '').trim();
      if (!postRef) {
        showToast(
          'Post-install reference number is required before moving past GRID Connection Initiated. Open the project and add it, then try again.',
          { kind: 'error', sticky: true }
        );
        return;
      }
      try {
        const docBody = await getProjectDocuments(projectId);
        const list = Array.isArray(docBody?.data) ? docBody.data : [];
        if (list.length === 0) {
          showToast(
            'Upload at least one file in the project Documents tab before moving past GRID Connection Initiated.',
            { kind: 'error', sticky: true }
          );
          return;
        }
      } catch (err) {
        showToast(err.message || 'Could not verify documents', { kind: 'error' });
        return;
      }
    }

    setProjects((prev) =>
      prev.map((p) =>
        String(p.id) === String(projectId) ? { ...p, stage: nextStage, _reverting: p.stage } : p
      )
    );
    try {
      await updateProjectStage(projectId, nextStage);
    } catch (err) {
      setProjects((prev) =>
        prev.map((p) =>
          String(p.id) === String(projectId)
            ? { ...p, stage: p._reverting ?? p.stage, _reverting: undefined }
            : p
        )
      );
      showToast(err.message || 'Failed to update stage', { kind: 'error' });
    } finally {
      setProjects((prev) => prev.map((p) => ({ ...p, _reverting: undefined })));
    }
  }, [projects, projectOrderKeys]);

  const focusSearch = useCallback((stageKey = null) => {
    setSearchStage(stageKey);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  const openDetails = useCallback((id) => {
    const inEmployeeArea = location.pathname.startsWith('/employee');
    navigate(inEmployeeArea ? `/employee/projects/${id}` : `/admin/projects/${id}`);
  }, [navigate, location.pathname]);

  const switchView = useCallback((next) => {
    setView(next);
  }, []);

  /** Export projects to CSV (basic) – visible in table view */
  const exportProjectsCsv = useCallback(() => {
    const headers = ['Customer', 'Stage', 'Address', 'System', 'Value'];
    const rows = filteredProjects.map((p) => [
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
    a.download = `projects-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredProjects]);

  /** CALENDAR: load installation jobs so multi-day bookings render on each day */
  useEffect(() => {
    if (view !== 'calendar') return;
    let alive = true;
    (async () => {
      try {
        setCalendarLoading(true);
        const projectIds = new Set(projects.map((p) => Number(p.id)).filter(Number.isFinite));
        const resp = await listInstallationJobs({ limit: 2000, offset: 0 });
        const rows = Array.isArray(resp?.data) ? resp.data : [];
        const nextJobs = rows.filter((j) => projectIds.has(Number(j?.project_id)));
        if (!alive) return;
        setCalendarJobs(nextJobs);
      } catch (err) {
        if (alive) setCalendarJobs([]);
      } finally {
        if (alive) setCalendarLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [projects, view]);

  const calendarProjects = useMemo(() => {
    if (!Array.isArray(calendarJobs) || calendarJobs.length === 0) return [];
    return calendarJobs
      .filter((j) => !!j?.scheduled_date)
      .map((j) => ({
        id: `job-${j.id}`,
        projectId: Number(j.project_id),
        scheduled_at: `${j.scheduled_date} ${String(j.scheduled_time || '00:00').slice(0, 5)}:00`,
        customerName: j.customer_name || `Project #${j.project_id}`,
        stage: j.status || 'scheduled',
        teamNames: j.team_names || '',
      }));
  }, [calendarJobs]);

  return (
    <div className="leads-kanban-page">
      <header className="leads-kanban-header">
        <div className="leads-kanban-header-top">
          <div className="leads-kanban-title">
            <h1>Projects</h1>
            <p>Track installation progress across stages. Switch views to analyze.</p>
          </div>

          {/* View tabs (kanban / table / calendar) */}
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
          </div>
        </div>

        {/* Filter/search bar (reuse styling) */}
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
              placeholder={searchStage ? `Search in ${searchStage.replace('_', ' ')}...` : 'Search by PRJ-ID, project id, email, phone, name, suburb...'}
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

      {toast?.msg ? (
        <div className={`leads-toast ${toast.kind === 'success' ? 'leads-toast-success' : ''}`}>
          <div style={{ flex: 1, minWidth: 0 }}>{toast.msg}</div>
          <button
            type="button"
            className="leads-toast-dismiss"
            aria-label="Dismiss message"
            onClick={() => setToast(null)}
          >
            ×
          </button>
        </div>
      ) : null}

      <div className="leads-page-content">
        {loading ? (
          <div className="leads-loading">Loading projects…</div>
        ) : view === 'table' ? (
          <ProjectsTable
            projects={filteredProjects}
            stages={projectKanbanStages}
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
                getDate={(p) => p.scheduled_at ?? null}
                titleForProject={(p) => p.customerName ?? `Project #${p.projectId ?? p.id}`}
                subtitleForProject={(p) => {
                  const t = formatLocalTimeLabel(p.scheduled_at);
                  return [t, p.teamNames || p.stage].filter(Boolean).join(' • ');
                }}
                onProjectClick={(p) => openDetails(p.projectId ?? p.id)}
                weekStartsOn={1} // Monday
              />
            )}
          </div>
        ) : view === 'timeline' ? (
          <ProjectsTimeline projects={filteredProjects} />
        ) : (
          <ProjectsKanbanBoard
            projects={filteredProjects}
            stages={projectKanbanStages}
            legacyStageMap={LEGACY_PROJECT_STAGE_MAP}
            onStageChange={handleStageChange}
            onFocusSearch={focusSearch}
            onSelectProject={(id) => openDetails(id)}
          />
        )}
      </div>
    </div>
  );
}
