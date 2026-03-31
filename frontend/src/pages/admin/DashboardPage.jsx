import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  UsersRound, MailOpen, TrendingUp, DollarSign,
  FileText, CheckCircle2, TrendingDown, ArrowUpRight,
  ArrowDownRight, Minus, RefreshCw, Calendar,
  BarChart3, PieChart, Activity,
} from 'lucide-react';
import { getSalesDashboard, getSalesActivity } from '../../services/api.js';

// ── Brand palette (canonical from theme.js + components) ─────────────────────
const B = {
  primary:     '#1A7B7B',
  primaryDark: '#156161',
  primaryHover:'#4DB8A8',
  primaryLight:'#E8F5F5',
  primaryMid:  '#A8D4D4',
  textPrimary: '#1A1A2E',
  textSub:     '#555555',
  textMuted:   '#9CA3AF',
  border:      '#E5E7EB',
  surface:     '#F5F5F5',
  white:       '#FFFFFF',
  success:     '#16A34A',
  successBg:   '#DCFCE7',
  danger:      '#DC2626',
  dangerBg:    '#FEE2E2',
  warning:     '#D97706',
  warningBg:   '#FEF3C7',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtCurrency = v => {
  const n = Number(v ?? 0);
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
};
const fmtNum   = v => Number(v ?? 0).toLocaleString();
const fmtPct   = v => `${Number(v ?? 0).toFixed(1)}%`;
const today    = () => new Date().toISOString().slice(0, 10);
const weeksAgo = n => { const d = new Date(); d.setDate(d.getDate() - n * 7); return d.toISOString().slice(0,10); };

// ── Date range presets ────────────────────────────────────────────────────────
const RANGES = [
  { key: 'week',    label: 'This Week'    },
  { key: 'month',   label: 'This Month'   },
  { key: 'quarter', label: 'This Quarter' },
  { key: 'custom',  label: 'Custom'       },
];

// Stage display order and label map
const STAGE_ORDER = [
  'new','contacted','qualified',
  'inspection_booked','inspection_completed',
  'proposal_sent','negotiation',
];
const STAGE_LABELS = {
  new: 'New', contacted: 'Contacted', qualified: 'Qualified',
  inspection_booked: 'Inspection Booked', inspection_completed: 'Inspection Done',
  proposal_sent: 'Proposal Sent', negotiation: 'Negotiation',
};
const STAGE_COLORS = [
  '#156161','#1A7B7B','#27948A','#3EAD9B','#4DB8A8','#28A745','#0D9488',
];

// ── Skeleton loader ───────────────────────────────────────────────────────────
function Skeleton({ w = '100%', h = 18, r = 6 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg, #e8f0f0 25%, #d0e4e4 50%, #e8f0f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  );
}

// ── Trend badge ───────────────────────────────────────────────────────────────
function TrendBadge({ delta }) {
  if (delta == null) return null;
  const up   = delta > 0;
  const zero = delta === 0;
  const Icon = zero ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 7px', borderRadius: 999, fontSize: 11, fontWeight: 800,
      background: zero ? B.surface : up ? B.successBg : B.dangerBg,
      color:      zero ? B.textSub : up ? B.success    : B.danger,
    }}>
      <Icon size={11} strokeWidth={2.5} />
      {zero ? '0%' : `${up ? '+' : ''}${delta}%`}
    </span>
  );
}

// ── KPI Card (T-036/T-038) ────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, delta, note, loading, accent = B.primary }) {
  return (
    <div style={{
      background: B.white, border: `1px solid ${B.border}`, borderRadius: 16,
      padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14,
      boxShadow: '0 2px 8px rgba(26,123,123,0.06)',
      transition: 'box-shadow .15s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(26,123,123,0.12)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(26,123,123,0.06)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: B.textSub, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </div>
        <div style={{
          width: 34, height: 34, borderRadius: 10, background: `${accent}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={17} color={accent} strokeWidth={2} />
        </div>
      </div>
      <div>
        {loading
          ? <><Skeleton h={32} w="60%" r={8} /><div style={{ marginTop: 8 }}><Skeleton h={18} w="40%" /></div></>
          : <>
              <div style={{ fontSize: 28, fontWeight: 900, color: B.textPrimary, lineHeight: 1, marginBottom: 6 }}>
                {value}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendBadge delta={delta} />
                {note && <span style={{ fontSize: 11, color: B.textMuted }}>{note}</span>}
              </div>
            </>
        }
      </div>
    </div>
  );
}

// ── Horizontal Bar chart ──────────────────────────────────────────────────────
function PipelineChart({ data = [], loading, onStageClick }) {
  const [hover, setHover] = useState(null); // { stage, label, value, count, x, y }
  const maxVal = Math.max(1, ...data.map(d => d.value));

  const handleEnter = (e, d, color) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHover({
      stage: d.stage,
      label: d.label,
      value: d.value,
      count: d.count,
      color,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  };

  const handleLeave = () => setHover(null);

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {loading
        ? [0,1,2,3,4].map(i => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 70px', gap: 10, alignItems: 'center' }}>
              <Skeleton h={14} /> <Skeleton h={18} r={999} /> <Skeleton h={14} w={60} />
            </div>
          ))
        : data.length === 0
          ? <div style={{ textAlign: 'center', padding: 40, color: B.textMuted, fontSize: 13 }}>No open pipeline data.</div>
          : data.map((d, i) => {
              const pct = Math.max(4, Math.round((d.value / maxVal) * 100));
              const color = STAGE_COLORS[i % STAGE_COLORS.length];
              return (
                <div
                  key={d.stage}
                  style={{ display: 'grid', gridTemplateColumns: '150px 1fr 80px', gap: 10, alignItems: 'center', cursor: onStageClick ? 'pointer' : 'default' }}
                  onClick={() => onStageClick?.(d)}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: B.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {d.label}
                    <span style={{ fontSize: 11, color: B.textMuted, marginLeft: 4 }}>({d.count})</span>
                  </div>
                  <div
                    style={{ background: '#EEF6F6', borderRadius: 999, height: 20, overflow: 'hidden', position: 'relative' }}
                    onMouseEnter={e => handleEnter(e, d, color)}
                    onMouseLeave={handleLeave}
                  >
                    <div
                      style={{
                        position: 'absolute', inset: 0, width: `${pct}%`,
                        background: color,
                        borderRadius: 999, transition: 'width .4s ease',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: B.textPrimary, textAlign: 'right' }}>
                    {fmtCurrency(d.value)}
                  </div>
                </div>
              );
            })
      }

      {/* Hover tooltip (exact value + count) */}
      {hover && (
        <div
          style={{
            position: 'fixed',
            left: hover.x,
            top: hover.y,
            transform: 'translate(-50%, -100%)',
            background: '#0f172a',
            color: '#fff',
            padding: '6px 10px',
            borderRadius: 8,
            fontSize: 11,
            boxShadow: '0 6px 18px rgba(15,23,42,0.4)',
            pointerEvents: 'none',
            zIndex: 1200,
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 2 }}>{hover.label}</div>
          <div>{fmtCurrency(hover.value)} · {hover.count} lead{hover.count === 1 ? '' : 's'}</div>
        </div>
      )}
    </div>
  );
}

// ── Source donut-style bar chart ──────────────────────────────────────────────
function SourceChart({ data = [], loading }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  const COLORS = [B.primary, '#4DB8A8', '#28A745', '#0D9488', '#2563EB', '#7C3AED', '#DB2777', '#EA580C'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {loading
        ? [0,1,2,3].map(i => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 50px 50px', gap: 8, alignItems: 'center' }}>
              <Skeleton h={14} /> <Skeleton h={14} w={40} /> <Skeleton h={14} w={40} />
            </div>
          ))
        : data.length === 0
          ? <div style={{ textAlign: 'center', padding: 40, color: B.textMuted, fontSize: 13 }}>No leads yet in this period.</div>
          : data.map((d, i) => {
              const pct = Math.round((d.count / total) * 100);
              return (
                <div key={d.source}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 999, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: B.textPrimary }}>{d.source}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: B.textSub }}>{d.count} <span style={{ color: B.textMuted }}>({pct}%)</span></span>
                  </div>
                  <div style={{ background: '#EEF6F6', borderRadius: 999, height: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: COLORS[i % COLORS.length], borderRadius: 999, transition: 'width .4s ease' }} />
                  </div>
                </div>
              );
            })
      }
    </div>
  );
}

// ── Won Trend sparkline ───────────────────────────────────────────────────────
function WonSparkline({ data = [] }) {
  if (!data.length) return null;
  const vals = data.map(d => d.count);
  const max  = Math.max(1, ...vals);
  const W = 200, H = 44;
  const step = vals.length > 1 ? W / (vals.length - 1) : W;
  const pts = vals.map((v, i) => `${i * step},${H - Math.round((v / max) * (H - 4))}`).join(' ');

  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }} aria-hidden="true">
      <polyline
        points={pts}
        fill="none"
        stroke={B.primary}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      {vals.map((v, i) => (
        <circle key={i} cx={i * step} cy={H - Math.round((v / max) * (H - 4))} r="3" fill={B.primary} />
      ))}
    </svg>
  );
}

// ── Date range filter (T-039) ─────────────────────────────────────────────────
function RangeFilter({ range, customFrom, customTo, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {/* Preset pills */}
      <div style={{ display: 'flex', background: B.surface, borderRadius: 10, padding: '3px 4px', gap: 2 }}>
        {RANGES.filter(r => r.key !== 'custom').map(r => (
          <button
            key={r.key}
            onClick={() => onChange({ range: r.key, customFrom: '', customTo: '' })}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: range === r.key ? 800 : 500, fontSize: 13,
              background: range === r.key ? B.white : 'transparent',
              color:      range === r.key ? B.textPrimary : B.textSub,
              boxShadow:  range === r.key ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
              transition: 'all .15s',
            }}
          >
            {r.label}
          </button>
        ))}
        <button
          onClick={() => onChange({ range: 'custom', customFrom: customFrom || weeksAgo(4), customTo: customTo || today() })}
          style={{
            padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: range === 'custom' ? 800 : 500, fontSize: 13,
            background: range === 'custom' ? B.white : 'transparent',
            color:      range === 'custom' ? B.textPrimary : B.textSub,
            boxShadow:  range === 'custom' ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
            transition: 'all .15s',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <Calendar size={13} /> Custom
        </button>
      </div>

      {/* Custom date pickers */}
      {range === 'custom' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="date"
            value={customFrom}
            max={customTo || today()}
            onChange={e => onChange({ range: 'custom', customFrom: e.target.value, customTo })}
            style={{
              padding: '6px 10px', borderRadius: 8, border: `1.5px solid ${B.border}`,
              fontSize: 13, color: B.textPrimary, fontFamily: 'inherit', outline: 'none',
            }}
          />
          <span style={{ color: B.textMuted, fontSize: 13 }}>→</span>
          <input
            type="date"
            value={customTo}
            min={customFrom}
            max={today()}
            onChange={e => onChange({ range: 'custom', customFrom, customTo: e.target.value })}
            style={{
              padding: '6px 10px', borderRadius: 8, border: `1.5px solid ${B.border}`,
              fontSize: 13, color: B.textPrimary, fontFamily: 'inherit', outline: 'none',
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────
function Panel({ title, icon: Icon, right, children }) {
  return (
    <div style={{
      background: B.white, border: `1px solid ${B.border}`, borderRadius: 16,
      overflow: 'hidden', boxShadow: '0 2px 8px rgba(26,123,123,0.05)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: `1px solid ${B.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {Icon && <Icon size={16} color={B.primary} strokeWidth={2.5} />}
          <span style={{ fontWeight: 800, fontSize: 14, color: B.textPrimary }}>{title}</span>
        </div>
        {right}
      </div>
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const leadBase = pathname.startsWith('/employee')
    ? '/employee'
    : pathname.startsWith('/admin')
      ? '/admin'
      : '/dashboard';
  const [range, setRange]           = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const abortRef = useRef(null);
  const [activity, setActivity]     = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const load = useCallback(async (r = range, cf = customFrom, ct = customTo) => {
    if (r === 'custom' && (!cf || !ct)) return; // wait for both dates
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError('');
    try {
      const [metrics, feed] = await Promise.all([
        getSalesDashboard({ range: r, from: cf, to: ct }),
        getSalesActivity({ limit: 50, offset: 0 }),
      ]);
      setData(metrics);
      setActivity(feed);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e.message || 'Failed to load metrics.');
    } finally {
      setLoading(false);
      setActivityLoading(false);
    }
  }, [range, customFrom, customTo]);

  useEffect(() => { load(); }, [load]);

  const handleRangeChange = ({ range: r, customFrom: cf, customTo: ct }) => {
    setRange(r); setCustomFrom(cf); setCustomTo(ct);
    if (r !== 'custom') load(r, '', '');
    else if (cf && ct)  load(r, cf, ct);
  };

  const m = data?.metrics ?? {};
  const pipelineData = (data?.pipeline_by_stage ?? [])
    .sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage));

  const fmtLastRefresh = () => {
    if (!lastRefresh) return '';
    return `Updated ${lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <>
      {/* Shimmer keyframe */}
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", boxSizing: 'border-box' }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
          background: B.white, border: `1px solid ${B.border}`, borderRadius: 16,
          padding: '18px 22px', boxShadow: '0 2px 8px rgba(26,123,123,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: B.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={22} color={B.primary} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: B.textPrimary }}>Sales Dashboard</div>
              <div style={{ fontSize: 13, color: B.textSub, marginTop: 2 }}>Pipeline health and performance analytics</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastRefresh && (
              <span style={{ fontSize: 11, color: B.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Activity size={11} /> {fmtLastRefresh()}
              </span>
            )}
            <button
              onClick={() => load()}
              title="Refresh metrics"
              style={{
                padding: '7px 14px', borderRadius: 10, border: `1.5px solid ${B.border}`,
                background: B.white, color: B.textPrimary, fontWeight: 700, fontSize: 13,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Date Range Filter (T-039) ── */}
        <div style={{
          background: B.white, border: `1px solid ${B.border}`, borderRadius: 14,
          padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          boxShadow: '0 1px 4px rgba(0,0,0,.04)',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: B.textSub, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>Period</span>
          <RangeFilter range={range} customFrom={customFrom} customTo={customTo} onChange={handleRangeChange} />
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: B.dangerBg, color: B.danger, fontSize: 13, fontWeight: 600, border: '1px solid #FCA5A5' }}>
            {error}
          </div>
        )}

        {/* ── KPI Cards — 3×2 grid (T-036/T-038) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <KpiCard
            icon={UsersRound}
            label="Total Leads"
            value={loading ? '' : fmtNum(m.total_leads?.value)}
            delta={m.total_leads?.delta}
            note="vs prior period"
            loading={loading}
            accent={B.primary}
          />
          <KpiCard
            icon={MailOpen}
            label="Leads Contacted"
            value={loading ? '' : fmtNum(m.leads_contacted?.value)}
            delta={m.leads_contacted?.delta}
            note="beyond 'New' stage"
            loading={loading}
            accent="#2563EB"
          />
          <KpiCard
            icon={TrendingUp}
            label="Conversion Rate"
            value={loading ? '' : fmtPct(m.conversion_rate?.value)}
            delta={m.conversion_rate?.delta}
            note="closed won / total"
            loading={loading}
            accent="#7C3AED"
          />
          <KpiCard
            icon={DollarSign}
            label="Pipeline Value"
            value={loading ? '' : fmtCurrency(m.pipeline_value?.value)}
            delta={m.pipeline_value?.delta}
            note="open leads"
            loading={loading}
            accent={B.primary}
          />
          <KpiCard
            icon={FileText}
            label="Proposals Sent"
            value={loading ? '' : fmtNum(m.proposals_sent?.value)}
            delta={m.proposals_sent?.delta}
            note="proposal stage +"
            loading={loading}
            accent={B.warning}
          />
          <KpiCard
            icon={CheckCircle2}
            label="Closed Won"
            value={loading ? '' : fmtNum(m.closed_won?.value)}
            delta={m.closed_won?.delta}
            note="in period"
            loading={loading}
            accent={B.success}
          />
        </div>

        {/* ── Charts row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 16 }}>
          <Panel title="Pipeline by Stage (open leads)" icon={BarChart3}
            right={loading
              ? <Skeleton h={14} w={80} />
              : <span style={{ fontSize: 12, color: B.textMuted }}>
                  {pipelineData.reduce((s, d) => s + d.count, 0)} open leads
                </span>
            }
          >
            <PipelineChart
              data={pipelineData}
              loading={loading}
              onStageClick={(d) => navigate(`${leadBase}/leads?stage=${encodeURIComponent(d.stage)}`)}
            />
          </Panel>

          <Panel title="Leads by Source" icon={PieChart}
            right={loading
              ? <Skeleton h={14} w={60} />
              : <span style={{ fontSize: 12, color: B.textMuted }}>
                  {data?.leads_by_source?.reduce((s, d) => s + d.count, 0) ?? 0} leads
                </span>
            }
          >
            <SourceChart data={data?.leads_by_source ?? []} loading={loading} />
          </Panel>
        </div>

        {/* ── Closed Won sparkline + summary strip ── */}
        {!loading && data?.won_trend?.length > 0 && (
          <div style={{
            background: `linear-gradient(135deg, ${B.primary} 0%, ${B.primaryHover} 100%)`,
            borderRadius: 16, padding: '20px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.75)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                Closed Won Trend
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: B.white, lineHeight: 1 }}>
                {fmtNum(m.closed_won?.value)}
                <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,.75)', marginLeft: 10 }}>deals</span>
              </div>
              {m.closed_won?.delta != null && (
                <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(255,255,255,.85)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {m.closed_won.delta > 0
                    ? <ArrowUpRight size={14} />
                    : m.closed_won.delta < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                  {m.closed_won.delta > 0 ? '+' : ''}{m.closed_won.delta}% vs previous period
                </div>
              )}
            </div>
            <WonSparkline data={data.won_trend} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
              {[
                ['Pipeline Value', fmtCurrency(m.pipeline_value?.value)],
                ['Conversion Rate', fmtPct(m.conversion_rate?.value)],
                ['Proposals Sent', fmtNum(m.proposals_sent?.value)],
                ['Leads Contacted', fmtNum(m.leads_contacted?.value)],
              ].map(([lbl, val]) => (
                <div key={lbl}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.65)', marginBottom: 2 }}>{lbl}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: B.white }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
