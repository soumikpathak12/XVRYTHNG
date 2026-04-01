import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetchJSON, listInstallationJobs } from '../../services/api.js';
import {
  HardHat,
  CalendarClock,
  ClipboardCheck,
  CircleDashed,
  CheckCircle2,
  ArrowRight,
  Clock3,
  Hammer,
} from 'lucide-react';
import {
  DASHBOARD_THEME,
  DashboardShell,
  HeroSection,
  ErrorBanner,
  StatsGrid,
  SectionCard,
  StatCard,
  QuickLink,
} from './dashboardUi.jsx';

function isToday(dateLike) {
  if (!dateLike) return false;
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function fmtDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OnsiteFieldManagementDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inspections, setInspections] = useState([]);
  const [installations, setInstallations] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [insResult, jobsResult] = await Promise.all([
          authFetchJSON('/api/admin/site-inspections', { method: 'GET' }),
          listInstallationJobs(),
        ]);
        const insData = Array.isArray(insResult?.data) ? insResult.data : [];
        const jobsData = Array.isArray(jobsResult?.data) ? jobsResult.data : [];
        if (!alive) return;
        setInspections(insData);
        setInstallations(jobsData);
      } catch (e) {
        if (!alive) return;
        setError(e.message || 'Failed to load onsite field dashboard');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const total = inspections.length;
    const draft = inspections.filter((i) => i.status === 'draft').length;
    const completed = inspections.filter((i) => i.status === 'submitted').length;
    const today = inspections.filter((i) => isToday(i.site_inspection_date)).length;

    const instTotal = installations.length;
    const instScheduled = installations.filter((i) => i.status === 'scheduled').length;
    const instInProgress = installations.filter((i) => i.status === 'in_progress').length;
    const instCompleted = installations.filter((i) => i.status === 'completed').length;

    return { 
      total, draft, completed, today, 
      instTotal, instScheduled, instInProgress, instCompleted 
    };
  }, [inspections, installations]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    return inspections
      .filter((i) => {
        if (!i.site_inspection_date) return false;
        const t = new Date(i.site_inspection_date).getTime();
        if (Number.isNaN(t)) return false;
        return t >= now && t <= now + sevenDaysMs;
      })
      .sort((a, b) => new Date(a.site_inspection_date) - new Date(b.site_inspection_date))
      .slice(0, 8);
  }, [inspections]);

  const upcomingInstallations = useMemo(() => {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    return installations
      .filter((j) => {
        if (!j.created_at && !j.installation_date) return false;
        const dateField = j.installation_date || j.created_at;
        const t = new Date(dateField).getTime();
        if (Number.isNaN(t)) return false;
        return t >= now && t <= now + sevenDaysMs && j.status !== 'completed';
      })
      .sort((a, b) => new Date(a.installation_date || a.created_at) - new Date(b.installation_date || b.created_at))
      .slice(0, 8);
  }, [installations]);

  return (
    <DashboardShell>
        <HeroSection
          icon={HardHat}
          moduleName="Onsite Field Management"
          subtitle="Track scheduled, draft, and completed site inspections across field operations."
        />

        <ErrorBanner message={error} />

        {/* Site Inspections Stats */}
        <StatsGrid loading={loading}>
          <StatCard title="Total Inspections" value={loading ? '...' : stats.total} hint="All on-field records" icon={ClipboardCheck} tone="brand" />
          <StatCard title="Scheduled Today" value={loading ? '...' : stats.today} hint="Inspections planned for today" icon={CalendarClock} tone={stats.today > 0 ? 'warn' : 'brand'} />
          <StatCard title="Draft" value={loading ? '...' : stats.draft} hint="In-progress field forms" icon={CircleDashed} tone={stats.draft > 0 ? 'warn' : 'brand'} />
          <StatCard title="Completed" value={loading ? '...' : stats.completed} hint="Submitted inspections" icon={CheckCircle2} tone="ok" />
        </StatsGrid>

        {/* Installation Jobs Stats */}
        <StatsGrid loading={loading}>
          <StatCard title="Total Installations" value={loading ? '...' : stats.instTotal} hint="All installation jobs" icon={Hammer} tone="brand" />
          <StatCard title="Scheduled" value={loading ? '...' : stats.instScheduled} hint="Awaiting completion" icon={CalendarClock} tone={stats.instScheduled > 0 ? 'warn' : 'brand'} />
          <StatCard title="In Progress" value={loading ? '...' : stats.instInProgress} hint="Actively being worked on" icon={Clock3} tone={stats.instInProgress > 0 ? 'warn' : 'brand'} />
          <StatCard title="Completed" value={loading ? '...' : stats.instCompleted} hint="Finished installations" icon={CheckCircle2} tone="ok" />
        </StatsGrid>

        {/* Upcoming Site Inspections */}
        <SectionCard title="Upcoming Inspections (Next 7 Days)">
          {upcoming.length === 0 ? (
            <div style={{ color: DASHBOARD_THEME.sub, fontSize: 13 }}>No upcoming inspections in the next 7 days.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {upcoming.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => navigate(`/admin/leads/${i.lead_id}/site-inspection`)}
                  style={{
                    border: `1px solid ${DASHBOARD_THEME.border}`,
                    borderRadius: 10,
                    background: '#fff',
                    padding: '10px 12px',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'grid', gap: 2 }}>
                    <div style={{ fontWeight: 800, color: DASHBOARD_THEME.text }}>{i.customer_name || `Lead #${i.lead_id}`}</div>
                    <div style={{ fontSize: 12, color: DASHBOARD_THEME.sub }}>{i.suburb || '-'} • {fmtDate(i.site_inspection_date)}</div>
                  </div>
                  <ArrowRight size={15} color={DASHBOARD_THEME.brandDark} />
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Upcoming Installation Jobs */}
        <SectionCard title="Upcoming Installations (Next 7 Days)">
          {upcomingInstallations.length === 0 ? (
            <div style={{ color: DASHBOARD_THEME.sub, fontSize: 13 }}>No upcoming installation jobs in the next 7 days.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {upcomingInstallations.map((j) => (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => navigate(`/admin/installation/${j.id}`)}
                  style={{
                    border: `1px solid ${DASHBOARD_THEME.border}`,
                    borderRadius: 10,
                    background: '#fff',
                    padding: '10px 12px',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'grid', gap: 2 }}>
                    <div style={{ fontWeight: 800, color: DASHBOARD_THEME.text }}>{j.customer_name || `Job #${j.id}`}</div>
                    <div style={{ fontSize: 12, color: DASHBOARD_THEME.sub }}>{j.address || j.suburb || '-'} • Status: {j.status}</div>
                  </div>
                  <ArrowRight size={15} color={DASHBOARD_THEME.brandDark} />
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Quick Access">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <QuickLink title="Job Scheduling" desc="Open On-Field schedules and inspections" to="/admin/on-field" navigate={navigate} />
            <QuickLink title="Job Management" desc="Open installation job list" to="/admin/installation" navigate={navigate} />
            <QuickLink title="Leads Calendar" desc="View lead inspection calendar" to="/admin/leads/calendar" navigate={navigate} />
          </div>
        </SectionCard>
    </DashboardShell>
  );
}
