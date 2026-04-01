import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { getLeads, listApprovals, getProfitLossAdjustments } from '../../services/api.js';

const C = {
  brand: '#1A7B7B',
  brandDark: '#156161',
  bg: '#F6F8FB',
  white: '#FFFFFF',
  text: '#0F172A',
  sub: '#64748B',
  border: '#E2E8F0',
  pos: '#16A34A',
  neg: '#DC2626',
};

function money(v) {
  return `$${Number(v || 0).toLocaleString()}`;
}

function asNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function startOfRange(period) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'monthly') return new Date(d.getFullYear(), d.getMonth(), 1);
  if (period === 'quarterly') {
    const qStartMonth = Math.floor(d.getMonth() / 3) * 3;
    return new Date(d.getFullYear(), qStartMonth, 1);
  }
  return new Date(d.getFullYear(), 0, 1); // yearly
}

function parseDateSafe(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function inRange(dateLike, fromDate) {
  const d = parseDateSafe(dateLike);
  return d ? d >= fromDate : false;
}

function pickLeadDate(lead) {
  return (
    lead?.won_lost_at ||
    lead?.closed_at ||
    lead?.updated_at ||
    lead?.last_activity_at ||
    lead?.created_at ||
    null
  );
}

function pickLeadValue(lead) {
  return asNumber(lead?.value_amount ?? lead?.value ?? lead?.quote_amount ?? 0);
}

function isWonClosedLead(lead) {
  const stage = String(lead?.stage || '').toLowerCase();
  const isWonFlag = Number(lead?.is_won) === 1 || lead?.is_won === true;
  return isWonFlag || stage === 'closed_won' || stage === 'won';
}

function asDateInputValue(dateLike) {
  const d = parseDateSafe(dateLike);
  return d ? d.toISOString().slice(0, 10) : null;
}

function KpiCard({ label, value, hint, icon: Icon, positive = true }) {
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 16,
        display: 'grid',
        gap: 10,
        boxShadow: '0 8px 16px rgba(15,23,42,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: C.sub, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {label}
        </span>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: positive ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
            color: positive ? C.pos : C.neg,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={18} />
        </span>
      </div>
      <div style={{ fontSize: 30, lineHeight: 1, color: C.text, fontWeight: 900 }}>{value}</div>
      <div style={{ fontSize: 12, color: C.sub }}>{hint}</div>
    </div>
  );
}

function RatioBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.max(2, Math.round((value / total) * 100)) : 0;
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
        <span style={{ color: C.text, fontWeight: 700 }}>{label}</span>
        <span style={{ color: C.sub, fontWeight: 700 }}>{money(value)} ({pct}%)</span>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: '#EAF0F5', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

export default function ProfitLossAnalysisPage() {
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    revenue: 0,
    cogs: 0,
    opex: 0,
    otherIncome: 0,
    tax: 0,
    leadCount: 0,
    expenseCount: 0,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const fromDate = startOfRange(period);
        const fromDateQuery = asDateInputValue(fromDate);
        const [leadsRes, approvedExpenseRes, adjustmentsRes] = await Promise.all([
          getLeads(),
          listApprovals({ type: 'expense', status: 'approved' }),
          getProfitLossAdjustments({ fromDate: fromDateQuery }),
        ]);

        if (!alive) return;

        const leads = Array.isArray(leadsRes?.data) ? leadsRes.data : [];
        const expenses = Array.isArray(approvedExpenseRes?.data) ? approvedExpenseRes.data : [];
        const adjustments = adjustmentsRes?.data || {};

        const periodLeads = leads.filter((l) => {
          const value = pickLeadValue(l);
          if (value <= 0) return false;
          if (!isWonClosedLead(l)) return false;
          return inRange(pickLeadDate(l), fromDate);
        });

        const revenue = periodLeads.reduce((sum, l) => sum + pickLeadValue(l), 0);

        const periodExpenses = expenses.filter((e) => inRange(e?.expense_date || e?.created_at, fromDate));

        const cogs = periodExpenses
          .filter((e) => ['materials', 'equipment'].includes(String(e?.category || '').toLowerCase()))
          .reduce((sum, e) => sum + asNumber(e?.amount), 0);

        const opex = periodExpenses
          .filter((e) => !['materials', 'equipment'].includes(String(e?.category || '').toLowerCase()))
          .reduce((sum, e) => sum + asNumber(e?.amount), 0);

        setData({
          revenue,
          cogs,
          opex,
          otherIncome: asNumber(adjustments.other_income),
          tax: asNumber(adjustments.tax),
          leadCount: periodLeads.length,
          expenseCount: periodExpenses.length,
        });
      } catch (e) {
        if (!alive) return;
        setError(e.message || 'Failed to load profit / loss data');
        setData({ revenue: 0, cogs: 0, opex: 0, otherIncome: 0, tax: 0, leadCount: 0, expenseCount: 0 });
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [period]);

  const calc = useMemo(() => {
    const grossProfit = data.revenue - data.cogs;
    const operatingProfit = grossProfit - data.opex;
    const netProfit = operatingProfit + data.otherIncome - data.tax;
    const grossMargin = data.revenue > 0 ? (grossProfit / data.revenue) * 100 : 0;
    const netMargin = data.revenue > 0 ? (netProfit / data.revenue) * 100 : 0;

    return {
      grossProfit,
      operatingProfit,
      netProfit,
      grossMargin,
      netMargin,
    };
  }, [data]);

  return (
    <div style={{ padding: '18px 0', background: C.bg, minHeight: 'calc(100vh - 56px)' }}>
      <div style={{ width: '100%', display: 'grid', gap: 16 }}>
        <section
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: '18px 20px',
            boxShadow: '0 10px 24px rgba(15,23,42,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Calculator size={18} color={C.brandDark} />
                <span style={{ fontSize: 12, color: C.sub, letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 800 }}>
                  Financial Management
                </span>
              </div>
              <h1 style={{ margin: 0, color: C.text, fontSize: 28 }}>Profit / Loss Analysis</h1>
              <p style={{ margin: '6px 0 0', color: C.sub, fontSize: 14 }}>
                Revenue is aggregated from won/closed leads; costs are aggregated from approved expense claims.
              </p>
            </div>

            <div style={{ display: 'inline-flex', padding: 4, borderRadius: 999, border: `1px solid ${C.border}`, background: '#F8FAFC' }}>
              {[
                { key: 'monthly', label: 'Monthly' },
                { key: 'quarterly', label: 'Quarterly' },
                { key: 'yearly', label: 'Yearly' },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPeriod(p.key)}
                  style={{
                    border: 'none',
                    borderRadius: 999,
                    background: period === p.key ? C.brand : 'transparent',
                    color: period === p.key ? '#fff' : C.text,
                    padding: '8px 12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {error && (
          <section
            style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#991B1B',
              borderRadius: 12,
              padding: '10px 12px',
              fontWeight: 700,
            }}
          >
            {error}
          </section>
        )}

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
          <KpiCard label="Revenue" value={loading ? '...' : money(data.revenue)} hint={`${data.leadCount} lead(s) with value`} icon={DollarSign} positive />
          <KpiCard label="Gross Profit" value={loading ? '...' : money(calc.grossProfit)} hint={`Gross margin ${calc.grossMargin.toFixed(1)}%`} icon={TrendingUp} positive={calc.grossProfit >= 0} />
          <KpiCard label="Operating Profit" value={loading ? '...' : money(calc.operatingProfit)} hint={`${data.expenseCount} approved expense claim(s)`} icon={TrendingUp} positive={calc.operatingProfit >= 0} />
          <KpiCard label="Net Profit" value={loading ? '...' : money(calc.netProfit)} hint={`Net margin ${calc.netMargin.toFixed(1)}%`} icon={calc.netProfit >= 0 ? TrendingUp : TrendingDown} positive={calc.netProfit >= 0} />
        </section>

        <section
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 16,
            display: 'grid',
            gap: 14,
          }}
        >
          <h2 style={{ margin: 0, color: C.text, fontSize: 18, display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <Percent size={18} color={C.brandDark} /> Cost & Revenue Structure
          </h2>
          <RatioBar label="Cost of Goods Sold" value={data.cogs} total={data.revenue} color="#F59E0B" />
          <RatioBar label="Operating Expenses" value={data.opex} total={data.revenue} color="#DC2626" />
          <RatioBar label="Other Income" value={data.otherIncome} total={data.revenue} color="#16A34A" />
          <RatioBar label="Tax" value={data.tax} total={data.revenue} color="#7C3AED" />
        </section>

        <section
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 16,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, color: C.text }}>P/L Breakdown</h3>
          <div style={{ marginTop: 10, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
              <thead>
                <tr>
                  {['Line Item', 'Amount', '% of Revenue', 'Type'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        fontSize: 12,
                        color: C.sub,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        borderBottom: `1px solid ${C.border}`,
                        padding: '10px 8px',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Revenue', data.revenue, 'Income'],
                  ['Cost of Goods Sold', -data.cogs, 'Expense'],
                  ['Gross Profit', calc.grossProfit, 'Result'],
                  ['Operating Expenses', -data.opex, 'Expense'],
                  ['Operating Profit', calc.operatingProfit, 'Result'],
                  ['Other Income', data.otherIncome, 'Income'],
                  ['Tax', -data.tax, 'Expense'],
                  ['Net Profit', calc.netProfit, 'Result'],
                ].map(([name, amount, type]) => {
                  const pct = data.revenue > 0 ? (Number(amount) / data.revenue) * 100 : 0;
                  return (
                    <tr key={name}>
                      <td style={{ padding: '10px 8px', borderBottom: `1px solid ${C.border}`, color: C.text, fontWeight: 700 }}>{name}</td>
                      <td style={{ padding: '10px 8px', borderBottom: `1px solid ${C.border}`, color: Number(amount) >= 0 ? C.pos : C.neg, fontWeight: 800 }}>
                        {money(amount)}
                      </td>
                      <td style={{ padding: '10px 8px', borderBottom: `1px solid ${C.border}`, color: C.sub }}>{pct.toFixed(1)}%</td>
                      <td style={{ padding: '10px 8px', borderBottom: `1px solid ${C.border}`, color: C.sub }}>{type}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
