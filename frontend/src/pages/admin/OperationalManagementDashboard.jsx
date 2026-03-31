import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  UserRound,
  ClipboardCheck,
  CalendarClock,
} from 'lucide-react';
import {
  listEmployees,
  listCompanies,
  getTrialUsers,
  getApprovalsPendingCount,
} from '../../services/api.js';
import {
  DashboardShell,
  HeroSection,
  ErrorBanner,
  StatsGrid,
  SectionCard,
  StatCard,
  QuickLink,
} from './dashboardUi.jsx';

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
    <DashboardShell>
        <HeroSection
          icon={CalendarClock}
          moduleName="Operational Management"
          subtitle="Monitor workforce, approvals, and operational entities in one place."
        />

        <ErrorBanner message={error} />

        <StatsGrid loading={loading}>
          {cards.map((card) => (
            <StatCard key={card.title} {...card} value={loading ? '...' : card.value} />
          ))}
        </StatsGrid>

        <SectionCard title="Quick Access">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <QuickLink title="Employees" desc="Manage employee directory" to="/admin/employees" navigate={navigate} />
            <QuickLink title="Attendance" desc="Review and process attendance" to="/admin/attendance" navigate={navigate} />
            <QuickLink title="Partner Companies" desc="Manage company records" to="/admin/companies" navigate={navigate} />
            <QuickLink title="Guest Users" desc="Review trial and guest users" to="/admin/trial-users" navigate={navigate} />
            <QuickLink title="Customers" desc="Open customer records" to="/admin/customers" navigate={navigate} />
          </div>
        </SectionCard>
    </DashboardShell>
  );
}
