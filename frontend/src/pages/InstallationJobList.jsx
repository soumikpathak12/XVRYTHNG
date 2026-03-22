/**
 * Installation Day — Job List Page
 *
 * Accessible from sidebar nav for all 3 portals:
 *   /admin/installation          (super_admin / company admin)
 *   /dashboard/installation      (company manager)
 *   /employee/installation       (field agent)
 *
 * Features:
 *   • Calendar view  — month grid, click a chip to open the job card
 *   • List view      — searchable, filterable card list
 *   • Status filter badges
 *   • Empty / loading / error states
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Wrench, CalendarDays, List, Search, X, Loader2,
  MapPin, Clock, Users, ChevronRight, Plus,
} from 'lucide-react';
import { listInstallationJobs } from '../services/api.js';
import ProjectsCalendar from '../components/projects/ProjectCalendar.jsx';
import CreateInstallationJobModal from '../components/installation/CreateInstallationJobModal.jsx';

// ─── brand tokens ─────────────────────────────────────────────────────────────
const BRAND    = '#146b6b';
const BRAND_BG = '#E6F4F1';

// ─── status config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  scheduled:   { label: 'Scheduled',   bg: '#EFF6FF', color: '#1D4ED8', dot: '#2563EB' },
  in_progress: { label: 'In Progress', bg: '#FFF7ED', color: '#C2410C', dot: '#EA580C' },
  paused:      { label: 'Paused',      bg: '#FEF9C3', color: '#92400E', dot: '#D97706' },
  completed:   { label: 'Completed',   bg: '#F0FDF4', color: '#15803D', dot: '#16A34A' },
};

const ALL_STATUSES = ['scheduled', 'in_progress', 'paused', 'completed'];

function StatusBadge({ status, small }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.scheduled;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: small ? '3px 8px' : '4px 10px',
      borderRadius: 20,
      fontSize: small ? 11 : 12, fontWeight: 700,
      background: cfg.bg, color: cfg.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

// Determine the base path for job card links based on current location
function useJobCardBase() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/employee')) return '/employee/installation';
  if (pathname.startsWith('/dashboard')) return '/dashboard/installation';
  return '/admin/installation';
}

// ─────────────────────────────────────────────────────────────────────────────
// Job card summary (list view)
// ─────────────────────────────────────────────────────────────────────────────
function JobCard({ job, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16,
        padding: '16px 18px', cursor: 'pointer',
        display: 'flex', alignItems: 'flex-start', gap: 16,
        height: '100%',
        boxSizing: 'border-box',
        minWidth: 0,
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = BRAND; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = '#E5E7EB'; }}
    >
      {/* Status dot column */}
      <div style={{
        width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 6,
        background: STATUS_CFG[job.status]?.dot ?? '#9CA3AF',
      }} />

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#111827', lineHeight: 1.3 }}>
            {job.customer_name || '—'}
          </div>
          <StatusBadge status={job.status} small />
        </div>

        {(job.address || job.suburb) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, color: '#6B7280', fontSize: 13 }}>
            <MapPin size={12} color={BRAND} />
            {[job.address, job.suburb].filter(Boolean).join(', ')}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
          {job.scheduled_date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#374151', fontWeight: 600 }}>
              <CalendarDays size={12} color={BRAND} />
              {new Date(job.scheduled_date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
              {job.scheduled_time && ` · ${job.scheduled_time.slice(0, 5)}`}
            </div>
          )}
          {job.system_size_kw && (
            <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
              {job.system_size_kw} kW {job.system_type ?? ''}
            </div>
          )}
          {job.team_count > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
              <Users size={12} color={BRAND} />
              {job.team_names ?? `${job.team_count} member${job.team_count > 1 ? 's' : ''}`}
            </div>
          )}
        </div>
      </div>

      <ChevronRight size={18} color="#D1D5DB" style={{ flexShrink: 0, marginTop: 4 }} />
    </div>
  );
}

// ─── Group jobs: Today / This Week / Upcoming / Past / Unscheduled (shared) ───
function toLocalDateKey(d) {
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

function endOfWeekKeyFor(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return '';
  const [yy, mm, dd] = key.split('-').map((v) => Number(v));
  const d = new Date(yy, mm - 1, dd);
  d.setDate(d.getDate() + (7 - d.getDay()));
  return toLocalDateKey(d);
}

/** @returns {{ label: string, jobs: object[], accent: string }[]} */
function buildInstallationJobGroups(jobs) {
  const todayKey = toLocalDateKey(new Date());
  const todayJobs = [];
  const weekJobs = [];
  const upcomingJobs = [];
  const pastJobs = [];
  const noDateJobs = [];

  const keyedJobs = jobs.map((j) => {
    const raw = j?.scheduled_date;
    const k =
      typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)
        ? raw
        : (raw ? toLocalDateKey(new Date(raw)) : '');
    return { j, k };
  });

  const hasActualTodayJob = keyedJobs.some(({ k }) => k && k === todayKey);
  const upcomingKeys = keyedJobs.map(({ k }) => k).filter((k) => k && k > todayKey);
  const minUpcoming = upcomingKeys.length ? upcomingKeys.reduce((a, b) => (a < b ? a : b)) : '';
  const effectiveTodayKey = hasActualTodayJob ? todayKey : (minUpcoming || todayKey);
  const endOfWeekKey = endOfWeekKeyFor(effectiveTodayKey);

  for (const { j, k: jobDateKey } of keyedJobs) {
    if (!jobDateKey) {
      noDateJobs.push(j);
      continue;
    }
    if (jobDateKey === effectiveTodayKey) todayJobs.push(j);
    else if (jobDateKey > effectiveTodayKey && jobDateKey <= endOfWeekKey) weekJobs.push(j);
    else if (jobDateKey > endOfWeekKey) upcomingJobs.push(j);
    else pastJobs.push(j);
  }

  const result = [];
  if (todayJobs.length) result.push({ label: 'Today', jobs: todayJobs, accent: BRAND });
  if (weekJobs.length) result.push({ label: 'This Week', jobs: weekJobs, accent: '#1D4ED8' });
  if (upcomingJobs.length) result.push({ label: 'Upcoming', jobs: upcomingJobs, accent: '#6B7280' });
  if (pastJobs.length) result.push({ label: 'Past', jobs: pastJobs, accent: '#9CA3AF' });
  if (noDateJobs.length) result.push({ label: 'Unscheduled', jobs: noDateJobs, accent: '#9CA3AF' });
  return result;
}

function flatOrderedWithMeta(groups) {
  const flatOrdered = groups.flatMap((g) => g.jobs);
  const jobMeta = new Map();
  groups.forEach((g) => {
    g.jobs.forEach((j) => {
      jobMeta.set(j.id, { label: g.label, accent: g.accent, groupCount: g.jobs.length });
    });
  });
  return { flatOrdered, jobMeta };
}

/** Section headers span full row; job cards fill a responsive grid */
function PaginatedInstallationGrid({
  pageSlice,
  jobMeta,
  onJobClick,
}) {
  const items = [];
  let lastLabel = null;
  for (const j of pageSlice) {
    const meta = jobMeta.get(j.id);
    const label = meta?.label ?? 'Jobs';
    const accent = meta?.accent ?? BRAND;
    const groupCount = meta?.groupCount;
    if (label !== lastLabel) {
      items.push({
        kind: 'header',
        key: `hdr-${j.id}-${label}`,
        label,
        accent,
        groupCount,
      });
      lastLabel = label;
    }
    items.push({ kind: 'job', key: j.id, job: j });
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
        gap: 16,
        alignItems: 'stretch',
      }}
    >
      {items.map((item) => {
        if (item.kind === 'header') {
          return (
            <div
              key={item.key}
              style={{
                gridColumn: '1 / -1',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginTop: items[0] === item ? 0 : 8,
                marginBottom: 4,
              }}
            >
              <div style={{ width: 3, height: 18, borderRadius: 2, background: item.accent }} />
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 13,
                  color: item.accent,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {item.label}
              </div>
              {item.groupCount != null && (
                <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>{item.groupCount}</div>
              )}
            </div>
          );
        }
        return (
          <JobCard key={item.key} job={item.job} onClick={() => onJobClick(item.job)} />
        );
      })}
    </div>
  );
}

function PaginationBar({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  const btn = (disabled) => ({
    padding: '8px 14px',
    borderRadius: 10,
    border: '1px solid #E5E7EB',
    background: disabled ? '#F3F4F6' : '#fff',
    color: disabled ? '#9CA3AF' : '#111827',
    fontWeight: 700,
    fontSize: 13,
    cursor: disabled ? 'not-allowed' : 'pointer',
  });

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginTop: 28,
        paddingTop: 20,
        borderTop: '1px solid #E5E7EB',
      }}
    >
      <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>
        {total === 0 ? 'No jobs on this page' : `Showing ${from}–${to} of ${total}`}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>Per page</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          style={{
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid #E5E7EB',
            fontSize: 13,
            fontWeight: 600,
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          {[6, 9, 12, 18, 24].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" style={btn(safePage <= 1)} disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)}>
          Previous
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#374151', minWidth: 100, textAlign: 'center' }}>
          Page {safePage} of {totalPages}
        </span>
        <button
          type="button"
          style={btn(safePage >= totalPages)}
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function InstallationJobList() {
  const navigate    = useNavigate();
  const jobCardBase = useJobCardBase();

  const [jobs,       setJobs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [view,       setView]       = useState('list');   // 'list' | 'calendar'
  const [search,     setSearch]     = useState('');
  const [status,     setStatus]     = useState('');       // '' = all
  const [showCreate, setShowCreate] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const searchRef = useRef(null);

  // Load all jobs once
  useEffect(() => {
    let alive = true;
    setLoading(true);
    listInstallationJobs({ limit: 200 })
      .then(res => alive && setJobs(Array.isArray(res?.data) ? res.data : []))
      .catch(e  => alive && setError(e?.message ?? 'Failed to load jobs'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const openJob = useCallback((job) => {
    navigate(`${jobCardBase}/${job.id}`);
  }, [navigate, jobCardBase]);

  const handleJobCreated = useCallback((newJob) => {
    setJobs(prev => [newJob, ...prev]);
    // Navigate straight to the new job card
    navigate(`${jobCardBase}/${newJob.id}`);
  }, [navigate, jobCardBase]);

  // Filter for list view
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter(j => {
      if (status && j.status !== status) return false;
      if (!q) return true;
      return (
        (j.customer_name ?? '').toLowerCase().includes(q) ||
        (j.address       ?? '').toLowerCase().includes(q) ||
        (j.suburb        ?? '').toLowerCase().includes(q) ||
        (j.system_type   ?? '').toLowerCase().includes(q)
      );
    });
  }, [jobs, search, status]);

  const { flatOrdered, jobMeta } = useMemo(() => {
    const groups = buildInstallationJobGroups(filtered);
    return flatOrderedWithMeta(groups);
  }, [filtered]);

  const totalListPages = Math.max(1, Math.ceil(flatOrdered.length / pageSize) || 1);
  const safeListPage = Math.min(Math.max(1, listPage), totalListPages);
  const pageSlice = flatOrdered.slice((safeListPage - 1) * pageSize, safeListPage * pageSize);

  useEffect(() => {
    setListPage(1);
  }, [search, status]);

  useEffect(() => {
    if (listPage > totalListPages) setListPage(totalListPages);
  }, [listPage, totalListPages]);

  // Counts per status for filter badges
  const counts = useMemo(() => {
    const c = {};
    jobs.forEach(j => { c[j.status] = (c[j.status] ?? 0) + 1; });
    return c;
  }, [jobs]);

  // ─── States ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Loader2 size={32} color={BRAND} style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: 28, textAlign: 'center', color: '#EF4444', fontWeight: 600 }}>{error}</div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      padding: '24px',
      margin: 0,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Wrench size={24} color={BRAND} />
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#111827' }}>Installation Day</h1>
          </div>
          <div style={{ marginTop: 4, fontSize: 14, color: '#6B7280' }}>
            {jobs.length} job{jobs.length !== 1 ? 's' : ''}
            {counts.in_progress ? <span style={{ marginLeft: 8, color: '#C2410C', fontWeight: 700 }}>· {counts.in_progress} in progress</span> : null}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* New Job button */}
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: BRAND, color: '#fff', fontWeight: 800, fontSize: 14,
              boxShadow: `0 2px 8px ${BRAND}44`,
            }}
          >
            <Plus size={16} strokeWidth={2.5} /> New Job
          </button>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: 4, background: '#F3F4F6', borderRadius: 12, padding: 4 }}>
            {[{ v: 'list', Icon: List }, { v: 'calendar', Icon: CalendarDays }].map(({ v, Icon }) => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '8px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                background: view === v ? '#fff' : 'transparent',
                color: view === v ? BRAND : '#6B7280',
                fontWeight: view === v ? 800 : 600,
                fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: view === v ? '0 1px 4px rgba(0,0,0,0.09)' : 'none',
              }}>
                <Icon size={15} /> {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Create Job modal */}
      <CreateInstallationJobModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleJobCreated}
      />

      {/* ── Calendar view ── */}
      {view === 'calendar' && (
        <ProjectsCalendar
          projects={jobs}
          getDate={(j) => j.scheduled_date ?? null}
          titleForProject={(j) => j.customer_name || `Job #${j.id}`}
          subtitleForProject={(j) => {
            const parts = [];
            if (j.suburb)  parts.push(j.suburb);
            if (j.status)  parts.push(STATUS_CFG[j.status]?.label ?? j.status);
            return parts.join(' · ');
          }}
          onProjectClick={openJob}
        />
      )}

      {/* ── List view ── */}
      {view === 'list' && (
        <>
          {/* Search + status filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <Search size={15} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by customer, address…"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '10px 36px 10px 36px',
                  border: '1px solid #E5E7EB', borderRadius: 12,
                  fontSize: 14, outline: 'none',
                  background: '#fff',
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                  <X size={14} color="#9CA3AF" />
                </button>
              )}
            </div>

            {/* Status filter buttons */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                onClick={() => setStatus('')}
                style={{
                  padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  background: !status ? BRAND : '#F3F4F6',
                  color: !status ? '#fff' : '#374151',
                  fontWeight: 700, fontSize: 12,
                }}
              >
                All ({jobs.length})
              </button>
              {ALL_STATUSES.filter(s => counts[s]).map(s => {
                const cfg = STATUS_CFG[s];
                const active = status === s;
                return (
                  <button key={s} onClick={() => setStatus(active ? '' : s)} style={{
                    padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    background: active ? cfg.dot : cfg.bg,
                    color: active ? '#fff' : cfg.color,
                    fontWeight: 700, fontSize: 12,
                  }}>
                    {cfg.label} ({counts[s]})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '60px 24px',
              background: '#F9FAFB', borderRadius: 16, border: '1px dashed #E5E7EB',
            }}>
              <Wrench size={40} color="#D1D5DB" style={{ marginBottom: 12 }} />
              <div style={{ fontWeight: 700, fontSize: 16, color: '#374151', marginBottom: 6 }}>
                {search || status ? 'No jobs match your filters' : 'No installation jobs yet'}
              </div>
              <div style={{ fontSize: 14, color: '#9CA3AF' }}>
                {search || status
                  ? 'Try adjusting your search or filters'
                  : 'Jobs will appear here once they are created and linked from a project'
                }
              </div>
              {(search || status) && (
                <button onClick={() => { setSearch(''); setStatus(''); }} style={{
                  marginTop: 16, padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: BRAND, color: '#fff', fontWeight: 700, fontSize: 13,
                }}>
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Job cards — responsive grid + pagination */}
          {filtered.length > 0 && (
            <>
              <PaginatedInstallationGrid
                pageSlice={pageSlice}
                jobMeta={jobMeta}
                onJobClick={openJob}
              />
              <PaginationBar
                total={flatOrdered.length}
                page={safeListPage}
                pageSize={pageSize}
                onPageChange={setListPage}
                onPageSizeChange={(n) => {
                  setPageSize(n);
                  setListPage(1);
                }}
              />
            </>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
