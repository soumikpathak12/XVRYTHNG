import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  Calculator,
  FileSpreadsheet,
  Receipt,
  TrendingUp,
  ArrowRight,
  BadgeDollarSign,
} from 'lucide-react';

const C = {
  brand: '#1A7B7B',
  brandDark: '#156161',
  bg: '#F6F8FB',
  white: '#FFFFFF',
  text: '#0F172A',
  sub: '#64748B',
  border: '#E2E8F0',
};

function MetricCard({ title, value, hint, icon: Icon }) {
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 16,
        display: 'grid',
        gap: 10,
        boxShadow: '0 8px 18px rgba(15,23,42,0.05)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: C.sub, letterSpacing: 0.6, textTransform: 'uppercase' }}>
          {title}
        </span>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: 'rgba(26,123,123,0.12)',
            color: C.brand,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={18} />
        </span>
      </div>
      <div style={{ fontSize: 30, lineHeight: 1, fontWeight: 900, color: C.text }}>{value}</div>
      <div style={{ fontSize: 12, color: C.sub }}>{hint}</div>
    </div>
  );
}

function ActionCard({ title, desc, to, navigate }) {
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '14px 14px',
        background: C.white,
        textAlign: 'left',
        cursor: 'pointer',
        display: 'grid',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 800, color: C.text }}>{title}</span>
        <ArrowRight size={16} color={C.brandDark} />
      </div>
      <span style={{ color: C.sub, fontSize: 13 }}>{desc}</span>
    </button>
  );
}

export default function FinancialManagementDashboard() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 18, background: C.bg, minHeight: 'calc(100vh - 56px)' }}>
      <div style={{ maxWidth: 1220, margin: '0 auto', display: 'grid', gap: 16 }}>
        <section
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: '18px 20px',
            boxShadow: '0 10px 24px rgba(15,23,42,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <BadgeDollarSign size={18} color={C.brandDark} />
            <span style={{ fontSize: 12, fontWeight: 800, color: C.sub, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              Financial Management
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: 28, color: C.text }}>Dashboard</h1>
          <p style={{ margin: '6px 0 0', color: C.sub, fontSize: 14 }}>
            Track payroll and upcoming finance modules in one place.
          </p>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
          <MetricCard title="Payroll Module" value="Active" hint="Payroll page is available" icon={Wallet} />
          <MetricCard title="Quotations" value="comming soon" hint="Module planned next phase" icon={FileSpreadsheet} />
          <MetricCard title="Invoicing" value="comming soon" hint="Module planned next phase" icon={Receipt} />
          <MetricCard title="Profit/Loss" value="comming soon" hint="Module planned next phase" icon={TrendingUp} />
        </section>

        <section
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 16,
            display: 'grid',
            gap: 12,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, color: C.text }}>Quick Access</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <ActionCard title="Payroll" desc="Open payroll management" to="/admin/payroll" navigate={navigate} />
            <ActionCard title="Quotations" desc="comming soon" to="/admin/quotations" navigate={navigate} />
            <ActionCard title="Invoicing" desc="comming soon" to="/admin/invoicing" navigate={navigate} />
            <ActionCard title="Profit/Loss Analysis" desc="comming soon" to="/admin/profit-loss-analysis" navigate={navigate} />
          </div>
          <div
            style={{
              border: `1px dashed ${C.border}`,
              borderRadius: 10,
              padding: '10px 12px',
              color: C.sub,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Calculator size={16} color={C.brandDark} />
            Financial analytics widgets will be expanded here once quotations, invoicing, and P&L modules are released.
          </div>
        </section>
      </div>
    </div>
  );
}
