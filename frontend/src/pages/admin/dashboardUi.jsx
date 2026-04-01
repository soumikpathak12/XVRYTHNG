import React from 'react';
import { ArrowRight } from 'lucide-react';

export const DASHBOARD_THEME = {
  brand: '#1A7B7B',
  brandDark: '#156161',
  bg: '#F6F8FB',
  white: '#FFFFFF',
  text: '#0F172A',
  sub: '#64748B',
  border: '#E2E8F0',
  ok: '#16A34A',
  warn: '#D97706',
};

export function DashboardShell({ children, maxWidth = '100%', gap = 12, padding = 10 }) {
  return (
    <div style={{ padding, background: DASHBOARD_THEME.bg, minHeight: 'calc(100vh - 56px)' }}>
      <div style={{ maxWidth, margin: '0 auto', display: 'grid', gap }}>{children}</div>
    </div>
  );
}

export function HeroSection({ icon: Icon, moduleName, title = 'Dashboard', subtitle }) {
  return (
    <section
      style={{
        background: DASHBOARD_THEME.white,
        border: `1px solid ${DASHBOARD_THEME.border}`,
        borderRadius: 16,
        padding: '18px 20px',
        boxShadow: '0 10px 24px rgba(15,23,42,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Icon size={18} color={DASHBOARD_THEME.brandDark} />
        <span style={{ fontSize: 12, fontWeight: 800, color: DASHBOARD_THEME.sub, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          {moduleName}
        </span>
      </div>
      <h1 style={{ margin: 0, fontSize: 28, color: DASHBOARD_THEME.text }}>{title}</h1>
      {subtitle && <p style={{ margin: '6px 0 0', color: DASHBOARD_THEME.sub, fontSize: 14 }}>{subtitle}</p>}
    </section>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
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
      {message}
    </section>
  );
}

export function StatsGrid({ children, loading = false, minCol = 210, gap = 14 }) {
  return (
    <section
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${minCol}px, 1fr))`,
        gap,
        opacity: loading ? 0.75 : 1,
      }}
    >
      {children}
    </section>
  );
}

export function SectionCard({ title, children, padding = 16, gap = 12 }) {
  return (
    <section
      style={{
        background: DASHBOARD_THEME.white,
        border: `1px solid ${DASHBOARD_THEME.border}`,
        borderRadius: 16,
        padding,
        display: 'grid',
        gap,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 18, color: DASHBOARD_THEME.text }}>{title}</h2>
      {children}
    </section>
  );
}

export function StatCard({ title, value, hint, icon: Icon, tone = 'brand' }) {
  const toneMap = {
    brand: { bg: 'rgba(26,123,123,0.12)', color: DASHBOARD_THEME.brand },
    ok: { bg: '#DCFCE7', color: DASHBOARD_THEME.ok },
    warn: { bg: '#FEF3C7', color: DASHBOARD_THEME.warn },
  };
  const t = toneMap[tone] || toneMap.brand;

  return (
    <div
      style={{
        background: DASHBOARD_THEME.white,
        border: `1px solid ${DASHBOARD_THEME.border}`,
        borderRadius: 14,
        padding: 16,
        display: 'grid',
        gap: 10,
        boxShadow: '0 6px 16px rgba(15,23,42,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: DASHBOARD_THEME.sub, textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {title}
        </span>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: t.bg,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: t.color,
          }}
        >
          <Icon size={18} />
        </span>
      </div>
      <div style={{ fontSize: 30, lineHeight: 1, fontWeight: 900, color: DASHBOARD_THEME.text }}>{value}</div>
      <div style={{ fontSize: 12, color: DASHBOARD_THEME.sub }}>{hint}</div>
    </div>
  );
}

export function QuickLink({ title, desc, to, navigate, disabled = false }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && navigate(to)}
      disabled={disabled}
      style={{
        border: `1px solid ${DASHBOARD_THEME.border}`,
        borderRadius: 12,
        padding: '14px 14px',
        background: disabled ? '#F8FAFC' : DASHBOARD_THEME.white,
        textAlign: 'left',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'grid',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 800, color: DASHBOARD_THEME.text }}>{title}</span>
        {!disabled && <ArrowRight size={16} color={DASHBOARD_THEME.brandDark} />}
      </div>
      <span style={{ color: DASHBOARD_THEME.sub, fontSize: 13 }}>{desc}</span>
    </button>
  );
}
