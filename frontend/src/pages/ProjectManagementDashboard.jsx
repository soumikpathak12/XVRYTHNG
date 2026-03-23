import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { getPmDashboard, getPmDashboardDrilldown } from '../services/api.js';
import { useNavigate } from 'react-router-dom';
import '../styles/PmDashboard.css';

function Currency({ value }) {
  try { return <>{new Intl.NumberFormat(undefined, { style:'currency', currency:'AUD', maximumFractionDigits:0 }).format(Number(value||0))}</>; }
  catch { return <>{value}</>; }
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
};

function formatStage(stage) {
  if (!stage) return '—';
  return STAGE_LABELS[stage] || stage.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function paginateArray(arr, pageNum, itemsPerPage = 5) {
  const startIdx = (pageNum - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  return arr.slice(startIdx, endIdx);
}

function getTotalPages(arrLength, itemsPerPage = 5) {
  return Math.ceil(arrLength / itemsPerPage) || 1;
}

export default function PmDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState(null);
  const [range, setRange] = useState('all');
  const [stage, setStage] = useState('');
  const [pm, setPm] = useState('');
  const [toast, setToast] = useState('');
  const [pageRetailer, setPageRetailer] = useState(1);
  const [pageClassic, setPageClassic] = useState(1);

  const navigate = useNavigate();

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await getPmDashboard({ range, stage: stage || undefined, pm: pm || undefined });
      setDash(resp?.data ?? null);
      setPageRetailer(1);
      setPageClassic(1);
    } catch (err) {
      setToast(err.message || 'Failed to load dashboard');
      setTimeout(() => setToast(''), 2500);
    } finally {
      setLoading(false);
    }
  }, [range, stage, pm]);

  useEffect(() => { reload(); }, [reload]);

  const statusData = useMemo(() => dash?.projectsByStatus ?? [], [dash]);

  // Drilldown handler: open list with filter or navigate to Kanban
  async function handleDrill(kind, key) {
    // Option A: Navigate to existing page with filters
    //   e.g., navigate('/retailer-projects?filter=...')
    // Option B: Open modal table: example below fetches rows then navigates
    navigate(`/projects?kind=${kind}${key ? `&key=${encodeURIComponent(key)}` : ''}`);
  }

  if (loading) return <div className="pmdb-loading">Loading dashboard…</div>;

  return (
    <div className="pmdb-page">
      {toast && <div className="pmdb-alert pmdb-alert--error">{toast}</div>}

      <header className="pmdb-header">
        <div>
          <h1>Project Dashboard</h1>
          <p>Active projects and compliance tracking</p>
        </div>

        {/* Simple filters */}
        <div className="pmdb-filters">
          <select value={range} onChange={(e)=>setRange(e.target.value)}>
            <option value="all">All Time</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="fy">This Financial Year</option>
          </select>
          <select value={stage} onChange={(e)=>setStage(e.target.value)}>
            <option value="">All Statuses</option>
            {/* optional: list from dash.projectsByStatus */}
            {statusData.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
          </select>
          {/* PM list: hook in later */}
          <select value={pm} onChange={(e)=>setPm(e.target.value)}>
            <option value="">All Project Managers</option>
          </select>
        </div>
      </header>

      {/* Metric Cards */}
      <section className="pmdb-cards">
        <MetricCard
          title="ACTIVE PROJECTS (ALL)"
          value={dash?.summaryCards?.activeProjects?.value ?? 0}
          subtitle={dash?.summaryCards?.activeProjects?.extra ?? ''}
        />
        <MetricCard
          title="ACTIVE RETAILER PROJECTS"
          value={dash?.summaryCards?.activeRetailerProjects?.value ?? 0}
          subtitle=""
        />
        <MetricCard
          title="ACTIVE CLASSIC PROJECTS"
          value={dash?.summaryCards?.activeClassicProjects?.value ?? 0}
          subtitle=""
        />
        <MetricCard
          title="UPCOMING INSTALLATIONS"
          value={dash?.summaryCards?.upcomingInstallations?.value ?? 0}
          subtitle="Next 7 days"
        />
        <MetricCard
          title="COMPLIANCE ALERTS"
          value={dash?.summaryCards?.complianceAlerts?.value ?? 0}
          subtitle="Requires attention"
        />
        <MetricCard
          title="TOTAL PROJECT VALUE"
          value={<Currency value={dash?.summaryCards?.totalProjectValue?.value ?? 0} />}
          subtitle="Active pipeline"
        />
      </section>

      <section className="pmdb-grid">
        {/* Compliance Alerts / Attention */}
        <div className="pmdb-card">
          <div className="pmdb-card-title">Compliance Alerts</div>
          <div className="pmdb-list">
            {(dash?.attentionList ?? []).slice(0,6).map(r => (
              <div key={`${r.type}-${r.id}`} className={`pmdb-attention pmdb-attention--${r.attention_reason}`}>
                <div className="pmdb-attn-reason">{r.attention_reason?.toUpperCase()}</div>
                <div className="pmdb-attn-text">
                  <div className="pmdb-code">{r.type === 'retailer' ? `PRU-${r.id}` : r.code}</div>
                  <div className="pmdb-sub">Stage: {formatStage(r.stage)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Projects by Status */}
        <div className="pmdb-card">
          <div className="pmdb-card-title">Projects by Status</div>
          <div className="pmdb-status-list">
            {statusData.map(s => (
              <div key={s.label} className="pmdb-status-row">
                <span>{s.label}</span>
                <span className="pmdb-count">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Profitability */}
        <div className="pmdb-card">
          <div className="pmdb-card-title">Profitability</div>
          <div className="pmdb-profit">
            <div className="pmdb-row">
              <span>Total Revenue</span>
              <strong><Currency value={dash?.profitability?.totalRevenue ?? 0} /></strong>
            </div>
            <div className="pmdb-row">
              <span>Total Costs</span>
              <strong><Currency value={dash?.profitability?.totalCosts ?? 0} /></strong>
            </div>
            <div className="pmdb-profit-hint" style={{ fontSize: 12, color: '#64748b', margin: '-6px 0 8px' }}>
              Sum of approved expense claims (same date range as above; tenant-scoped).
            </div>
            <div className="pmdb-row">
              <span>Gross Margin</span>
              <strong><Currency value={dash?.profitability?.grossMargin ?? 0} /></strong>
            </div>
            <div className="pmdb-row">
              <span>Avg. Project Value</span>
              <strong><Currency value={dash?.profitability?.avgProjectValue ?? 0} /></strong>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Projects */}
      <section className="pmdb-recent-grid">
        <div className="pmdb-card">
          <div className="pmdb-card-title">Recent Retailer Projects</div>
          <table className="pmdb-table">
            <thead>
              <tr><th>PROJECT ID</th><th>STAGE</th><th>SCHEDULED</th><th>VALUE</th></tr>
            </thead>
            <tbody>
              {paginateArray(dash?.recentRetailerProjects ?? [], pageRetailer).map(r => (
                <tr key={`retailer-${r.id}`}>
                  <td>{r.code || `PRU-${r.id}`}</td>
                  <td>{formatStage(r.stage)}</td>
                  <td>{r.scheduled_date ? new Date(r.scheduled_date).toLocaleString() : '—'}</td>
                  <td><Currency value={r.revenue} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {(dash?.recentRetailerProjects ?? []).length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '14px', color: '#64748b' }}>
                Showing {Math.min(5, (dash?.recentRetailerProjects ?? []).length)} of {(dash?.recentRetailerProjects ?? []).length} projects
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setPageRetailer(Math.max(1, pageRetailer - 1))}
                  disabled={pageRetailer === 1}
                  style={{ 
                    padding: '6px 12px', 
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    backgroundColor: pageRetailer === 1 ? '#f1f5f9' : '#fff',
                    cursor: pageRetailer === 1 ? 'not-allowed' : 'pointer',
                    color: pageRetailer === 1 ? '#94a3b8' : '#000',
                    fontSize: '14px'
                  }}
                >
                  Previous
                </button>
                <span style={{ padding: '6px 12px', fontSize: '14px' }}>
                  Page {pageRetailer} of {getTotalPages((dash?.recentRetailerProjects ?? []).length)}
                </span>
                <button 
                  onClick={() => setPageRetailer(pageRetailer + 1)}
                  disabled={pageRetailer >= getTotalPages((dash?.recentRetailerProjects ?? []).length)}
                  style={{ 
                    padding: '6px 12px', 
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    backgroundColor: pageRetailer >= getTotalPages((dash?.recentRetailerProjects ?? []).length) ? '#f1f5f9' : '#fff',
                    cursor: pageRetailer >= getTotalPages((dash?.recentRetailerProjects ?? []).length) ? 'not-allowed' : 'pointer',
                    color: pageRetailer >= getTotalPages((dash?.recentRetailerProjects ?? []).length) ? '#94a3b8' : '#000',
                    fontSize: '14px'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="pmdb-card">
          <div className="pmdb-card-title">Recent In-house Projects</div>
          <table className="pmdb-table">
            <thead>
              <tr><th>PROJECT ID</th><th>STAGE</th><th>SCHEDULED</th><th>VALUE</th></tr>
            </thead>
            <tbody>
              {paginateArray(dash?.recentClassicProjects ?? [], pageClassic).map(r => (
                <tr key={`project-${r.id}`}>
                  <td>{r.code || r.id}</td>
                  <td>{formatStage(r.stage)}</td>
                  <td>{r.scheduled_date ? new Date(r.scheduled_date).toLocaleString() : '—'}</td>
                  <td><Currency value={r.revenue} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {(dash?.recentClassicProjects ?? []).length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '14px', color: '#64748b' }}>
                Showing {Math.min(5, (dash?.recentClassicProjects ?? []).length)} of {(dash?.recentClassicProjects ?? []).length} projects
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setPageClassic(Math.max(1, pageClassic - 1))}
                  disabled={pageClassic === 1}
                  style={{ 
                    padding: '6px 12px', 
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    backgroundColor: pageClassic === 1 ? '#f1f5f9' : '#fff',
                    cursor: pageClassic === 1 ? 'not-allowed' : 'pointer',
                    color: pageClassic === 1 ? '#94a3b8' : '#000',
                    fontSize: '14px'
                  }}
                >
                  Previous
                </button>
                <span style={{ padding: '6px 12px', fontSize: '14px' }}>
                  Page {pageClassic} of {getTotalPages((dash?.recentClassicProjects ?? []).length)}
                </span>
                <button 
                  onClick={() => setPageClassic(pageClassic + 1)}
                  disabled={pageClassic >= getTotalPages((dash?.recentClassicProjects ?? []).length)}
                  style={{ 
                    padding: '6px 12px', 
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    backgroundColor: pageClassic >= getTotalPages((dash?.recentClassicProjects ?? []).length) ? '#f1f5f9' : '#fff',
                    cursor: pageClassic >= getTotalPages((dash?.recentClassicProjects ?? []).length) ? 'not-allowed' : 'pointer',
                    color: pageClassic >= getTotalPages((dash?.recentClassicProjects ?? []).length) ? '#94a3b8' : '#000',
                    fontSize: '14px'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ title, value, subtitle }) {
  return (
    <div className="pmdb-metric">
      <div className="pmdb-metric-title">{title}</div>
      <div className="pmdb-metric-value">{value}</div>
      {subtitle && <div className="pmdb-metric-sub">{subtitle}</div>}
    </div>
  );
}