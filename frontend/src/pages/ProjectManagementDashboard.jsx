import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { getPmDashboard, getPmDashboardDrilldown } from '../services/api.js';
import { useNavigate } from 'react-router-dom';
import '../styles/PmDashboard.css';

function Currency({ value }) {
  try { return <>{new Intl.NumberFormat(undefined, { style:'currency', currency:'AUD', maximumFractionDigits:0 }).format(Number(value||0))}</>; }
  catch { return <>{value}</>; }
}

export default function PmDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState(null);
  const [range, setRange] = useState('all');
  const [stage, setStage] = useState('');
  const [pm, setPm] = useState('');
  const [toast, setToast] = useState('');

  const navigate = useNavigate();

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await getPmDashboard({ range, stage: stage || undefined, pm: pm || undefined });
      setDash(resp?.data ?? null);
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
          title="ACTIVE PROJECTS"
          value={dash?.summaryCards?.activeProjects?.value ?? 0}
          subtitle={dash?.summaryCards?.activeProjects?.extra ?? ''}
          onClick={()=>handleDrill('active')}
        />
        <MetricCard
          title="UPCOMING INSTALLATIONS"
          value={dash?.summaryCards?.upcomingInstallations?.value ?? 0}
          subtitle="Next 7 days"
          onClick={()=>handleDrill('upcoming')}
        />
        <MetricCard
          title="COMPLIANCE ALERTS"
          value={dash?.summaryCards?.complianceAlerts?.value ?? 0}
          subtitle="Requires attention"
          onClick={()=>handleDrill('compliance')}
        />
        <MetricCard
          title="TOTAL PROJECT VALUE"
          value={<Currency value={dash?.summaryCards?.totalProjectValue?.value ?? 0} />}
          subtitle="Active pipeline"
          onClick={()=>handleDrill('revenue')}
        />
      </section>

      <section className="pmdb-grid">
        {/* Compliance Alerts / Attention */}
        <div className="pmdb-card">
          <div className="pmdb-card-title">Compliance Alerts</div>
          <div className="pmdb-list">
            {(dash?.attentionList ?? []).slice(0,6).map(r => (
              <button key={`${r.type}-${r.id}`} className={`pmdb-attention pmdb-attention--${r.attention_reason}`} onClick={()=>handleDrill('attention', r.attention_reason)}>
                <div className="pmdb-attn-reason">{r.attention_reason?.toUpperCase()}</div>
                <div className="pmdb-attn-text">
                  <div className="pmdb-code">{r.type === 'retailer' ? `PRU-${r.id}` : r.code}</div>
                  <div className="pmdb-sub">Stage: {r.stage}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Projects by Status */}
        <div className="pmdb-card">
          <div className="pmdb-card-title">Projects by Status</div>
          <div className="pmdb-status-list">
            {statusData.map(s => (
              <button key={s.label} className="pmdb-status-row" onClick={()=>handleDrill('status', s.label)}>
                <span>{s.label}</span>
                <span className="pmdb-count">{s.count}</span>
              </button>
            ))}
          </div>
          <div className="pmdb-actions">
            <button className="pmdb-btn" onClick={()=>navigate('/retailer-projects')}>View Kanban Board</button>
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
      <section className="pmdb-card">
        <div className="pmdb-card-title">Recent Projects</div>
        <table className="pmdb-table">
          <thead>
            <tr><th>PROJECT ID</th><th>STAGE</th><th>SCHEDULED</th><th>VALUE</th></tr>
          </thead>
          <tbody>
            {(dash?.recentProjects ?? []).map(r => (
              <tr key={`${r.type}-${r.id}`}>
                <td>{r.code || (r.type === 'retailer' ? `PRU-${r.id}` : r.id)}</td>
                <td>{r.stage}</td>
                <td>{r.scheduled_at ? new Date(r.scheduled_at).toLocaleString() : '—'}</td>
                <td><Currency value={r.revenue} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function MetricCard({ title, value, subtitle, onClick }) {
  return (
    <button className="pmdb-metric" onClick={onClick} title={`Drill down: ${title}`}>
      <div className="pmdb-metric-title">{title}</div>
      <div className="pmdb-metric-value">{value}</div>
      {subtitle && <div className="pmdb-metric-sub">{subtitle}</div>}
    </button>
  );
}