// src/pages/ProjectsPage.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import ProjectsKanbanBoard from '../components/projects/ProjectsKanbanBoard.jsx';
import ProjectDetailsPanel from '../components/projects/ProjectDetailsPanel.jsx';
import ProjectsTable from '../components/projects/ProjectsTable.jsx';
import ProjectsCalendar from '../components/projects/ProjectCalendar.jsx';

import {
  getProjects,
  updateProjectStage,
  getProjectInspection,
  getCompanyEmployees,
  saveProjectScheduleAssign,
  getProjectScheduleAssign, //
} from '../services/api.js';

import '../styles/LeadsKanban.css';

function normalizeProject(row) {
  const sizeKw = row.lead_system_size_kw ?? row.system_size_kw;
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
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchStage, setSearchStage] = useState(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [inspection, setInspection] = useState(null);
  const [companyUsers, setCompanyUsers] = useState([]);

  // NEW: Calendar state for schedules
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [scheduleMap, setScheduleMap] = useState(new Map()); // Map<projectId, { scheduled_at, status?, notes? }>

  const searchInputRef = useRef(null);

  // View state (kanban/table/calendar)
  const [view, setView] = useState('kanban');

  /** Debounce search */
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(id);
  }, [search]);

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
        setToast(err.message || 'Failed to load projects');
        setTimeout(() => setToast(''), 3000);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [debouncedSearch, searchStage]);

  const filteredProjects = useMemo(() => projects, [projects]);

  const handleStageChange = useCallback(async (projectId, nextStage) => {
    setProjects(prev =>
      prev.map(p => (String(p.id) === String(projectId) ? { ...p, stage: nextStage, _reverting: p.stage } : p))
    );
    try {
      await updateProjectStage(projectId, nextStage);
    } catch (err) {
      setProjects(prev =>
        prev.map(p =>
          String(p.id) === String(projectId) ? { ...p, stage: p._reverting ?? p.stage, _reverting: undefined } : p
        )
      );
      setToast(err.message || 'Failed to update stage');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setProjects(prev => prev.map(p => ({ ...p, _reverting: undefined })));
    }
  }, []);

  const focusSearch = useCallback((stageKey = null) => {
    setSearchStage(stageKey);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  const openDetails = useCallback(async (id) => {
    const p = projects.find(x => String(x.id) === String(id));
    if (!p) return;

    setSelectedProject(p);
    setDetailsOpen(true);
    setInspection(null);
    setCompanyUsers([]);

    try {
      const [inspResp, empResp] = await Promise.allSettled([
        getProjectInspection(p.id),
        getCompanyEmployees(),
      ]);

      // Inspection
      if (inspResp.status === 'fulfilled') {
        const resp = inspResp.value;
        if (resp?.data) {
          setInspection(resp.data);
        } else {
          const tried = resp?.meta?.leadIdTried;
          const count = resp?.meta?.rowCount;
          const fallbackLeadId = p?._raw?.lead_id;
          if ((!resp?.data || count === 0) && fallbackLeadId && Number(fallbackLeadId) !== Number(tried)) {
            const resp2 = await getProjectInspection(`${p.id}?leadId=${encodeURIComponent(fallbackLeadId)}`);
            setInspection(resp2?.data ?? null);
          } else {
            setInspection(resp?.data ?? null);
          }
        }
      } else {
        setInspection(null);
      }

      // Employees
      if (empResp.status === 'fulfilled') {
        const { value } = empResp;
        const rows = Array.isArray(value?.data) ? value.data : [];
        const mapped = rows.map(r => {
          const builtName = [r.first_name, r.last_name].filter(Boolean).join(' ').trim();
          const name = (r.full_name && r.full_name.trim()) || builtName || r.email || r.employee_code || 'Unknown';
          const safeInitials =
            r.initials ||
            (name
              ? name.split(/\s+/).filter(Boolean).map(s => s[0]).join('').slice(0, 3).toUpperCase()
              : 'NA');
          return { id: r.id, name, initials: safeInitials };
        });
        setCompanyUsers(mapped);
      } else {
        setCompanyUsers([]);
      }
    } catch (err) {
      setInspection(null);
      setCompanyUsers([]);
    }
  }, [projects]);

  /** Save schedule + assignees, then update stage if changed */
  const handleSaveSchedule = useCallback(async ({ id, status, date, time, assignees, notes }) => {
    try {
      await saveProjectScheduleAssign(id, { status, date, time, assignees, notes });
      const current = projects.find(p => String(p.id) === String(id))?.stage;
      if (status && current && status !== current) {
        // Optimistic UI + keep _raw.stage in sync
        setProjects(prev =>
          prev.map(p =>
            String(p.id) === String(id)
              ? { ...p, stage: status, _raw: { ...(p._raw ?? {}), stage: status } }
              : p
          )
        );
        try {
          await updateProjectStage(id, status);
        } catch (err) {
          setProjects(prev =>
            prev.map(p =>
              String(p.id) === String(id)
                ? { ...p, stage: current, _raw: { ...(p._raw ?? {}), stage: current } }
                : p
            )
          );
          throw err;
        }
      }

      if (view === 'calendar') {
        try {
          const resp = await getProjectScheduleAssign(id);
          const payload = resp?.data ?? resp ?? {};
          const schedule = payload.schedule ?? null;
          setScheduleMap(prev => {
            const next = new Map(prev);
            if (schedule?.scheduled_at) {
              next.set(id, {
                scheduled_at: schedule.scheduled_at,
                status: schedule.status ?? null,
                notes: schedule.notes ?? null,
              });
            } else {
              next.delete(id);
            }
            return next;
          });
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error('[DEBUG] Save schedule/assignees or stage update error:', err);
      setToast(err.message || 'Failed to save schedule');
      setTimeout(() => setToast(''), 3000);
    }
  }, [projects, view]);

  const handleAssign = useCallback(({ id, assignees }) => {
    console.log('[DEBUG] Assign (live state):', { projectId: id, assignees });
  }, []);

  const switchView = useCallback((next) => {
    setView(next);
  }, []);

  /** Export projects to CSV (basic) – visible in table view */
  const exportProjectsCsv = useCallback(() => {
    const headers = ['Customer', 'Stage', 'Address', 'System', 'Value'];
    const rows = filteredProjects.map(p => [
      p.customerName || '',
      p.stage || '',
      p.address || '',
      p.systemSummary || '',
      p.value != null ? String(p.value) : '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(s => {
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

  /** CALENDAR: load schedules when switching to calendar (and when projects change) */
  useEffect(() => {
    if (view !== 'calendar') return;
    let alive = true;

    (async () => {
      try {
        setCalendarLoading(true);
        const results = await Promise.allSettled(
          projects.map(p => getProjectScheduleAssign(p.id))
        );
        const next = new Map();
        results.forEach((res, idx) => {
          if (res.status === 'fulfilled') {
            const p = projects[idx];
            const payload = res.value?.data ?? res.value ?? {};
            const schedule = payload.schedule ?? null;
            if (schedule?.scheduled_at) {
              next.set(p.id, {
                scheduled_at: schedule.scheduled_at,
                status: schedule.status ?? null,
                notes: schedule.notes ?? null,
              });
            }
          }
        });
        if (alive) setScheduleMap(next);
      } catch (err) {
        if (alive) setScheduleMap(new Map());
      } finally {
        if (alive) setCalendarLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [projects, view]);

  const calendarProjects = useMemo(() => {
    if (!scheduleMap || scheduleMap.size === 0) return [];
    return projects.filter(p => !!scheduleMap.get(p.id)?.scheduled_at);
  }, [projects, scheduleMap]);

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

      {toast && <div className="leads-toast">{toast}</div>}

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
                // Only show those with assigned date & time:
                getDate={(p) => scheduleMap.get(p.id)?.scheduled_at ?? null}
                titleForProject={(p) => p.customerName ?? `Project #${p.id}`}
                subtitleForProject={(p) => {
                  const t = formatLocalTimeLabel(scheduleMap.get(p.id)?.scheduled_at);
                  return [t, p.stage].filter(Boolean).join(' • ');
                }}
                onProjectClick={(p) => openDetails(p.id)}
                weekStartsOn={1} // Monday
              />
            )}
          </div>
        ) : (
          <ProjectsKanbanBoard
            projects={filteredProjects}
            onStageChange={handleStageChange}
            onFocusSearch={focusSearch}
            onSelectProject={(id) => openDetails(id)}
          />
        )}
      </div>

      <ProjectDetailsPanel
        visible={detailsOpen}
        project={selectedProject}
        inspection={inspection}
        onClose={() => setDetailsOpen(false)}
        onSaveSchedule={handleSaveSchedule}
        onAssign={handleAssign}
        users={companyUsers}
      />
    </div>
  );
}