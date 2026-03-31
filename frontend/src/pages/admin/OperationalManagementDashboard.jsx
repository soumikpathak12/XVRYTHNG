import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  UserRound,
  ClipboardCheck,
  CalendarClock,
  ArrowRight,
} from 'lucide-react';
import {
  listEmployees,
  listCompanies,
  getTrialUsers,
  getApprovalsPendingCount,
} from '../../services/api.js';

const C = {
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

function StatCard({ title, value, hint, icon: Icon, tone = 'brand' }) {
  const toneMap = {
    brand: { bg: 'rgba(26,123,123,0.12)', color: C.brand },
    ok: { bg: '#DCFCE7', color: C.ok },
    warn: { bg: '#FEF3C7', color: C.warn },
  };
  const t = toneMap[tone] || toneMap.brand;

  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 16,
        display: 'grid',
        gap: 10,
        boxShadow: '0 6px 16px rgba(15,23,42,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: C.sub, textTransform: 'uppercase', letterSpacing: 0.6 }}>
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
      <div style={{ fontSize: 30, lineHeight: 1, fontWeight: 900, color: C.text }}>{value}</div>
      <div style={{ fontSize: 12, color: C.sub }}>{hint}</div>
    </div>
  );
}

function QuickLink({ title, desc, to, navigate, disabled = false }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && navigate(to)}
      disabled={disabled}
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '14px 14px',
        background: disabled ? '#F8FAFC' : C.white,
        textAlign: 'left',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'grid',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 800, color: C.text }}>{title}</span>
        {!disabled && <ArrowRight size={16} color={C.brandDark} />}
      </div>
      <span style={{ color: C.sub, fontSize: 13 }}>{desc}</span>
    </button>
  );
}

export default function OperationalManagementDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    employees: 0,
    companies: 0,
    guestUsers: 0,
    pendingApprovals: 0,
    attendancePending: 0,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [employeesRes, companiesRes, guestRes, approvalsRes] = await Promise.all([
          listEmployees(),
          listCompanies(),
          getTrialUsers(),
          getApprovalsPendingCount(),
        ]);

        if (!alive) return;

        const employees = Array.isArray(employeesRes?.data) ? employeesRes.data.length : 0;
        const companies = Array.isArray(companiesRes?.data) ? companiesRes.data.length : 0;
        const guestUsers = Array.isArray(guestRes?.data) ? guestRes.data.length : 0;
        const pendingApprovals = Number(approvalsRes?.pending ?? 0);
        const attendancePending = Number(approvalsRes?.by_type?.attendance ?? 0);

        setStats({
          employees,
          companies,
          guestUsers,
          pendingApprovals,
          attendancePending,
        });
      } catch (e) {
        if (!alive) return;
        setError(e.message || 'Failed to load operational dashboard');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const cards = useMemo(
    () => [
      { title: 'Employees', value: stats.employees, hint: 'Active operational workforce', icon: Users, tone: 'brand' },
      { title: 'Partner Companies', value: stats.companies, hint: 'Companies in platform', icon: Building2, tone: 'brand' },
      { title: 'Guest Users', value: stats.guestUsers, hint: 'Trial / guest accounts', icon: UserRound, tone: 'warn' },
      {
        title: 'Pending Approvals',
        value: stats.pendingApprovals,
        hint: `${stats.attendancePending} attendance request(s) pending`,
        icon: ClipboardCheck,
        tone: stats.pendingApprovals > 0 ? 'warn' : 'ok',
      },
    ],
    [stats]
  );

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
            <CalendarClock size={18} color={C.brandDark} />
            <span style={{ fontSize: 12, fontWeight: 800, color: C.sub, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              Operational Management
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: 28, color: C.text }}>Dashboard</h1>
          <p style={{ margin: '6px 0 0', color: C.sub, fontSize: 14 }}>
            Monitor workforce, approvals, and operational entities in one place.
          </p>
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

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 14,
            opacity: loading ? 0.75 : 1,
          }}
        >
          {cards.map((card) => (
            <StatCard key={card.title} {...card} value={loading ? '...' : card.value} />
          ))}
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
            <QuickLink title="Employees" desc="Manage employee directory" to="/admin/employees" navigate={navigate} />
            <QuickLink title="Attendance" desc="Review and process attendance" to="/admin/attendance" navigate={navigate} />
            <QuickLink title="Partner Companies" desc="Manage company records" to="/admin/companies" navigate={navigate} />
            <QuickLink title="Guest Users" desc="Review trial and guest users" to="/admin/trial-users" navigate={navigate} />
            <QuickLink title="Customers" desc="comming soon" to="/admin/customers" navigate={navigate} />
          </div>
        </section>
      </div>
    </div>
  );
}
