import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Clock3,
  Building2,
  Home,
  CalendarClock,
  ShieldAlert,
  Coins,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getPmDashboard } from '../services/api.js';
import {
  DASHBOARD_THEME,
  DashboardShell,
  HeroSection,
  ErrorBanner,
  StatsGrid,
  SectionCard,
  StatCard,
  QuickLink,
} from './admin/dashboardUi.jsx';

const TABLE_CELL = {
  padding: '10px 12px',
  borderBottom: `1px solid ${DASHBOARD_THEME.border}`,
  fontSize: 13,
  color: DASHBOARD_THEME.text,
};

const TABLE_HEADER = {
  ...TABLE_CELL,
  fontSize: 11,
  letterSpacing: 0.6,
  textTransform: 'uppercase',
  color: DASHBOARD_THEME.sub,
  fontWeight: 800,
};

function Currency({ value }) {
  try {
    return <>{new Intl.NumberFormat(undefined, { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(Number(value || 0))}</>;
  } catch {
    return <>{value}</>;
  }
}

const STAGE_LABELS = {
  new: 'New',
  pre_approval: 'Pre-approval',
  state_rebate: 'State rebate',
  design_engineering: 'Design & engineering',
  procurement: 'Procurement',
  scheduled: 'Scheduled',
  installation_in_progress: 'Installation in progress',
  installation_completed: 'Installation completed',
  compliance_check: 'Compliance check',
  inspection_grid_connection: 'Inspection & grid connection',
  rebate_stc_claims: 'Rebate & STC claims',
  site_inspection: 'Site inspection',
  stage_one: 'Stage One',
  stage_two: 'Stage Two',
  full_system: 'Full System',
  cancelled: 'Cancelled',
  project_completed: 'Project Completed',
  done: 'Done',
  to_be_rescheduled: 'To be rescheduled',
  ces_certificate_applied: 'CES certificate applied',
  ces_certificate_received: 'CES certificate received',
  ces_certificate_submitted: 'CES certificate submitted',
  grid_connection_initiated: 'Grid connection initiated',
  grid_connection_completed: 'Grid connection completed',
  system_handover: 'System handover',
};

function formatStage(stage) {
  if (!stage) return '-';
  return STAGE_LABELS[stage] || stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function paginateArray(arr, pageNum, itemsPerPage = 5) {
  const startIdx = (pageNum - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  return arr.slice(startIdx, endIdx);
}

function getTotalPages(arrLength, itemsPerPage = 5) {
  return Math.ceil(arrLength / itemsPerPage) || 1;
}

function Pager({ page, setPage, total }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginTop: 12,
      }}
    >
      <span style={{ fontSize: 12, color: DASHBOARD_THEME.sub }}>Page {page} of {total}</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          style={{
            border: `1px solid ${DASHBOARD_THEME.border}`,
            borderRadius: 8,
            background: '#fff',
            color: DASHBOARD_THEME.text,
            padding: '6px 10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            cursor: page === 1 ? 'not-allowed' : 'pointer',
            opacity: page === 1 ? 0.55 : 1,
          }}
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <button
          type="button"
          onClick={() => setPage(Math.min(total, page + 1))}
          disabled={page >= total}
          style={{
            border: `1px solid ${DASHBOARD_THEME.border}`,
            borderRadius: 8,
            background: '#fff',
            color: DASHBOARD_THEME.text,
            padding: '6px 10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            cursor: page >= total ? 'not-allowed' : 'pointer',
            opacity: page >= total ? 0.55 : 1,
          }}
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function ProjectTable({ rows = [] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...TABLE_HEADER, textAlign: 'left' }}>Project ID</th>
            <th style={{ ...TABLE_HEADER, textAlign: 'left' }}>Stage</th>
            <th style={{ ...TABLE_HEADER, textAlign: 'left' }}>Scheduled</th>
            <th style={{ ...TABLE_HEADER, textAlign: 'right' }}>Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ ...TABLE_CELL, color: DASHBOARD_THEME.sub, textAlign: 'center' }}>
                No projects found.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.__key}>
                <td style={TABLE_CELL}>{r.code}</td>
                <td style={TABLE_CELL}>{formatStage(r.stage)}</td>
                <td style={TABLE_CELL}>{r.scheduled_date ? new Date(r.scheduled_date).toLocaleString() : '-'}</td>
                <td style={{ ...TABLE_CELL, textAlign: 'right', fontWeight: 800 }}><Currency value={r.revenue} /></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function PmDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState(null);
  const [range, setRange] = useState('all');
  const [stage, setStage] = useState('');
  const [pm, setPm] = useState('');
  const [error, setError] = useState('');
  const [pageRetailer, setPageRetailer] = useState(1);
  const [pageClassic, setPageClassic] = useState(1);

  const navigate = useNavigate();

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const resp = await getPmDashboard({ range, stage: stage || undefined, pm: pm || undefined });
      setDash(resp?.data ?? null);
      setPageRetailer(1);
      setPageClassic(1);
    } catch (err) {
      setError(err.message || 'Failed to load project dashboard');
    } finally {
      setLoading(false);
    }
  }, [range, stage, pm]);

  useEffect(() => {
    reload();
  }, [reload]);

  const statusData = useMemo(() => dash?.projectsByStatus ?? [], [dash]);
  const attentionList = useMemo(() => (dash?.attentionList ?? []).slice(0, 6), [dash]);

  const retailerRows = useMemo(
    () => paginateArray(dash?.recentRetailerProjects ?? [], pageRetailer).map((r) => ({
      ...r,
      __key: `retailer-${r.id}`,
      code: r.code || `PRU-${r.id}`,
    })),
    [dash, pageRetailer]
  );

  const classicRows = useMemo(
    () => paginateArray(dash?.recentClassicProjects ?? [], pageClassic).map((r) => ({
      ...r,
      __key: `classic-${r.id}`,
      code: r.code || String(r.id),
    })),
    [dash, pageClassic]
  );

  const retailerTotalPages = getTotalPages((dash?.recentRetailerProjects ?? []).length);
  const classicTotalPages = getTotalPages((dash?.recentClassicProjects ?? []).length);

  return (
    <DashboardShell maxWidth="100%" gap={10} padding={10}>
      <HeroSection
        icon={FolderKanban}
        moduleName="Project Management"
        title="Project Dashboard"
        subtitle="Active projects, compliance, and profitability tracking in one place."
      />

      <ErrorBanner message={error} />

      <SectionCard title="Filters" padding={12} gap={8}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            style={{ border: `1px solid ${DASHBOARD_THEME.border}`, borderRadius: 10, padding: '10px 12px', background: '#fff' }}
          >
            <option value="all">All Time</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="fy">This Financial Year</option>
          </select>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            style={{ border: `1px solid ${DASHBOARD_THEME.border}`, borderRadius: 10, padding: '10px 12px', background: '#fff' }}
          >
            <option value="">All Statuses</option>
            {statusData.map((s) => <option key={s.label} value={s.label}>{s.label}</option>)}
          </select>
          <select
            value={pm}
            onChange={(e) => setPm(e.target.value)}
            style={{ border: `1px solid ${DASHBOARD_THEME.border}`, borderRadius: 10, padding: '10px 12px', background: '#fff' }}
          >
            <option value="">All Project Managers</option>
          </select>
        </div>
      </SectionCard>

      <StatsGrid loading={loading} minCol={190} gap={10}>
        <StatCard
          title="Active Projects (All)"
          value={loading ? '...' : (dash?.summaryCards?.activeProjects?.value ?? 0)}
          hint={dash?.summaryCards?.activeProjects?.extra || 'Current pipeline'}
          icon={Clock3}
          tone="brand"
        />
        <StatCard
          title="Active Retailer"
          value={loading ? '...' : (dash?.summaryCards?.activeRetailerProjects?.value ?? 0)}
          hint="Retailer project count"
          icon={Building2}
          tone="brand"
        />
        <StatCard
          title="Active In-house"
          value={loading ? '...' : (dash?.summaryCards?.activeClassicProjects?.value ?? 0)}
          hint="Classic project count"
          icon={Home}
          tone="brand"
        />
        <StatCard
          title="Upcoming Installations"
          value={loading ? '...' : (dash?.summaryCards?.upcomingInstallations?.value ?? 0)}
          hint="Next 7 days"
          icon={CalendarClock}
          tone="warn"
        />
        <StatCard
          title="Compliance Alerts"
          value={loading ? '...' : (dash?.summaryCards?.complianceAlerts?.value ?? 0)}
          hint="Requires attention"
          icon={ShieldAlert}
          tone="warn"
        />
        <StatCard
          title="Total Project Value"
          value={loading ? '...' : <Currency value={dash?.summaryCards?.totalProjectValue?.value ?? 0} />}
          hint="Active pipeline"
          icon={Coins}
          tone="ok"
        />
      </StatsGrid>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10, alignItems: 'start' }}>
        <SectionCard title="Compliance Alerts" padding={10} gap={8}>
          {attentionList.length === 0 ? (
            <div style={{ fontSize: 13, color: DASHBOARD_THEME.sub }}>No compliance alerts.</div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              {attentionList.map((r) => (
                <div
                  key={`${r.type}-${r.id}`}
                  style={{
                    border: `1px solid ${DASHBOARD_THEME.border}`,
                    borderRadius: 10,
                    padding: '8px 10px',
                    display: 'grid',
                    gap: 4,
                    background: '#fff',
                  }}
                >
                  <div style={{ fontWeight: 800, color: DASHBOARD_THEME.text, fontSize: 13 }}>
                    {r.type === 'retailer' ? `PRU-${r.id}` : r.code || `Project #${r.id}`}
                  </div>
                  <div style={{ fontSize: 12, color: DASHBOARD_THEME.sub }}>
                    {String(r.attention_reason || 'Alert').replace(/_/g, ' ')} • Stage: {formatStage(r.stage)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Projects by Status" padding={10} gap={8}>
          {statusData.length === 0 ? (
            <div style={{ fontSize: 13, color: DASHBOARD_THEME.sub }}>No status data.</div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              {statusData.map((s) => (
                <div
                  key={s.label}
                  style={{
                    border: `1px solid ${DASHBOARD_THEME.border}`,
                    borderRadius: 10,
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: DASHBOARD_THEME.text }}>{s.label}</span>
                  <span
                    style={{
                      background: 'rgba(26,123,123,0.12)',
                      color: DASHBOARD_THEME.brand,
                      borderRadius: 999,
                      padding: '2px 8px',
                      fontWeight: 800,
                    }}
                  >
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Profitability" padding={10} gap={8}>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: DASHBOARD_THEME.sub }}>Total Revenue</span>
              <strong style={{ color: DASHBOARD_THEME.text }}><Currency value={dash?.profitability?.totalRevenue ?? 0} /></strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: DASHBOARD_THEME.sub }}>Total Costs</span>
              <strong style={{ color: DASHBOARD_THEME.text }}><Currency value={dash?.profitability?.totalCosts ?? 0} /></strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: DASHBOARD_THEME.sub }}>Gross Margin</span>
              <strong style={{ color: DASHBOARD_THEME.text }}><Currency value={dash?.profitability?.grossMargin ?? 0} /></strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: DASHBOARD_THEME.sub }}>Avg. Project Value</span>
              <strong style={{ color: DASHBOARD_THEME.text }}><Currency value={dash?.profitability?.avgProjectValue ?? 0} /></strong>
            </div>
            <div style={{ fontSize: 12, color: DASHBOARD_THEME.sub }}>
              Sum of approved expense claims (same date range as above; tenant-scoped).
            </div>
          </div>
        </SectionCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 10 }}>
        <SectionCard title="Recent Retailer Projects" padding={10} gap={8}>
          <ProjectTable rows={retailerRows} />
          <Pager page={pageRetailer} setPage={setPageRetailer} total={retailerTotalPages} />
        </SectionCard>

        <SectionCard title="Recent In-house Projects" padding={10} gap={8}>
          <ProjectTable rows={classicRows} />
          <Pager page={pageClassic} setPage={setPageClassic} total={classicTotalPages} />
        </SectionCard>
      </div>

      <SectionCard title="Quick Access" padding={12} gap={8}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
          <QuickLink title="Projects" desc="Open full projects workspace" to="/admin/projects" navigate={navigate} />
          <QuickLink title="Retailer Projects" desc="Open retailer project management" to="/admin/retailer-projects" navigate={navigate} />
          <QuickLink title="Installations" desc="Open installation job list" to="/admin/installation" navigate={navigate} />
          <QuickLink title="Leads Calendar" desc="View leads and schedules" to="/admin/leads/calendar" navigate={navigate} />
        </div>
      </SectionCard>
    </DashboardShell>
  );
}
