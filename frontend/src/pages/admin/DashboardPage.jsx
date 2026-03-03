import React, { useEffect, useState } from 'react';

import { getLeadsCount } from '../../services/api.js';

import {
  UsersRound,
  MailOpen,
  TrendingUp,
  DollarSign,
  BarChart2,
  CheckCircle2,
  ChevronDown,
  Download,
} from 'lucide-react';
import KpiCard from '../../components/dashboard/KPICards.jsx';
import Card from '../../components/dashboard/Card.jsx';
import PipelineBarChart from '../../components/dashboard/PipelineBarChart.jsx';
import ActivityList from '../../components/dashboard/ActivityList.jsx';
import TeamTable from '../../components/dashboard/TeamTable.jsx';

export default function AdminDashboard() {
  const [range, setRange] = useState('month');

  // KPIs (Total Leads is dynamic; others are mocked until you wire your endpoints)
  const [kpis, setKpis] = useState({
    totalLeads: { value: '—', delta: null, up: true },
    contacted:  { value: '452',   delta: 4,  up: true },
    conversion: { value: '18.4%', delta: -2, up: false },
    pipeline:   { value: '$2.4M', delta: 10, up: true },
    proposals:  { value: '156',   delta: 6,  up: true },
    closedWon:  { value: '42',    delta: 8,  up: true },
  });

  // Pipeline (mock); TODO: fetch /api/admin/analytics/pipeline?group=stage&range=...
  const [pipeline, setPipeline] = useState([
    { stage: 'New',         value: 900000 },
    { stage: 'Contacted',   value: 540000 },
    { stage: 'Qualified',   value: 360000 },
    { stage: 'Inspection',  value: 210000 },
    { stage: 'Negotiation', value: 120000 },
    { stage: 'Closed',      value: 50000 },
  ]);

  // Activity (mock); TODO: fetch /api/admin/activity/recent?limit=10
  const [activity, setActivity] = useState([
    { who:'Alex Stone',  what:'moved Lead #1421 to Proposal Sent', when:'2m ago' },
    { who:'Sarah Smith', what:'closed won Lead #1346',             when:'18m ago' },
    { who:'Maha Johnson',what:'added a note to Lead #1337',        when:'36m ago' },
    { who:'Emily Davis', what:'scheduled a site inspection',       when:'1h ago' },
  ]);

  // Team (mock); TODO: fetch /api/admin/analytics/team-performance?range=...
  const [team, setTeam] = useState([
    { id:1, name:'Sarah Smith',  leads:124, proposals:42, closeRate:32, pipeline:506000 },
    { id:2, name:'Maha Johnson', leads:110, proposals:39, closeRate:29, pipeline:489000 },
    { id:3, name:'Emily Davis',  leads: 92, proposals:33, closeRate:26, pipeline:255000 },
    { id:4, name:'Drew Winters', leads: 65, proposals:20, closeRate:19, pipeline:159000 },
  ]);

  // --- Load Total Leads from backend ---
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // If you later support range in the count endpoint, pass it: getLeadsCount({ range })
        const total = await getLeadsCount();
        if (!alive) return;
        setKpis(prev => ({
          ...prev,
          totalLeads: {
            value: Number(total ?? 0).toLocaleString(),
            // Keep mock delta for now; wire a real delta when your endpoint provides it
            delta: prev.totalLeads.delta,
            up: prev.totalLeads.up,
          },
        }));
      } catch (err) {
        if (!alive) return;
        // Leave a placeholder on error
        setKpis(prev => ({
          ...prev,
          totalLeads: { value: '—', delta: null, up: true },
        }));
        // Optional: console.error('Failed to load total leads', err);
      }
    })();
    return () => { alive = false; };
  }, []); // run once; add [range] when your endpoint supports timeframe

  function toggleRange() {
    const next = range === 'month' ? 'quarter' : range === 'quarter' ? 'year' : 'month';
    setRange(next);
    // TODO: refetch KPIs + pipeline with the new range when your endpoints support it
  }

  function downloadTeamCsv() {
    const headers = ['Name','Leads Contacted','Proposals Sent','Close Rate','Pipeline Value'];
    const rows = team.map(r => [r.name, r.leads, r.proposals, `${r.closeRate}%`, r.pipeline]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `team-performance-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: 16, display:'grid', gap:12 }}>
      {/* KPI Strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6, minmax(0,1fr))', gap:12 }}>
        <KpiCard icon={<UsersRound size={18}/>}   label="Total Leads"
                 value={kpis.totalLeads.value} delta={kpis.totalLeads.delta} up={kpis.totalLeads.up}/>
        <KpiCard icon={<MailOpen size={18}/>}     label="Leads Contacted"
                 value={kpis.contacted.value}  delta={kpis.contacted.delta}  up={kpis.contacted.up}/>
        <KpiCard icon={<TrendingUp size={18}/>}   label="Conversion"
                 value={kpis.conversion.value} delta={kpis.conversion.delta} up={kpis.conversion.up}/>
        <KpiCard icon={<DollarSign size={18}/>}   label="Pipeline Value"
                 value={kpis.pipeline.value}   delta={kpis.pipeline.delta}   up={kpis.pipeline.up}/>
        <KpiCard icon={<BarChart2 size={18}/>}    label="Proposals Sent"
                 value={kpis.proposals.value}  delta={kpis.proposals.delta}  up={kpis.proposals.up}/>
        <KpiCard icon={<CheckCircle2 size={18}/>} label="Closed Won"
                 value={kpis.closedWon.value}  delta={kpis.closedWon.delta}  up={kpis.closedWon.up}/>
      </div>

      {/* Row: Pipeline + Recent Activity */}
      <div style={{ display:'grid', gap:12, gridTemplateColumns:'minmax(0,1fr) 360px' }}>
        <Card
          title="Pipeline Value by Stage"
          right={
            <button
              type="button"
              onClick={toggleRange}
              style={{
                display:'inline-flex', alignItems:'center', gap:6,
                border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 10px',
                background:'#fff', color:'#0f172a', fontWeight:700
              }}
            >
              {range === 'month' ? 'This Month' : range === 'quarter' ? 'This Quarter' : 'This Year'} <ChevronDown size={16}/>
            </button>
          }
        >
          <PipelineBarChart data={pipeline}/>
        </Card>

        <Card
          title="Recent Activity"
          right={<a href="/admin/activity" style={{ fontWeight:800, color:'#146b6b', textDecoration:'none' }}>View All Activity</a>}
        >
          <ActivityList items={activity}/>
        </Card>
      </div>

      {/* Team Performance */}
      <Card
        title="Team Performance"
        right={
          <button
            type="button"
            onClick={downloadTeamCsv}
            style={{
              display:'inline-flex', alignItems:'center', gap:8,
              border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 10px',
              background:'#fff', color:'#0f172a', fontWeight:800
            }}
          >
            <Download size={16}/> Download Report
          </button>
        }
      >
        <TeamTable rows={team}/>
      </Card>
    </div>
  );
}