import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  Calculator,
  FileSpreadsheet,
  Receipt,
  TrendingUp,
  BadgeDollarSign,
} from 'lucide-react';
import {
  DASHBOARD_THEME,
  DashboardShell,
  HeroSection,
  StatsGrid,
  SectionCard,
  StatCard,
  QuickLink,
} from './dashboardUi.jsx';

export default function FinancialManagementDashboard() {
  const navigate = useNavigate();

  return (
    <DashboardShell>
        <HeroSection
          icon={BadgeDollarSign}
          moduleName="Financial Management"
          subtitle="Track payroll and upcoming finance modules in one place."
        />

        <StatsGrid>
          <StatCard title="Payroll Module" value="Active" hint="Payroll page is available" icon={Wallet} tone="ok" />
          <StatCard title="Quotations" value="Coming soon" hint="Module planned next phase" icon={FileSpreadsheet} tone="warn" />
          <StatCard title="Invoicing" value="Coming soon" hint="Module planned next phase" icon={Receipt} tone="warn" />
          <StatCard title="Profit/Loss" value="Coming soon" hint="Module planned next phase" icon={TrendingUp} tone="warn" />
        </StatsGrid>

        <SectionCard title="Quick Access">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <QuickLink title="Payroll" desc="Open payroll management" to="/admin/payroll" navigate={navigate} />
            <QuickLink title="Quotations" desc="Coming soon" to="/admin/quotations" navigate={navigate} />
            <QuickLink title="Invoicing" desc="Coming soon" to="/admin/invoicing" navigate={navigate} />
            <QuickLink title="Profit/Loss Analysis" desc="Coming soon" to="/admin/profit-loss-analysis" navigate={navigate} />
          </div>
          <div
            style={{
              border: `1px dashed ${DASHBOARD_THEME.border}`,
              borderRadius: 10,
              padding: '10px 12px',
              color: DASHBOARD_THEME.sub,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Calculator size={16} color={DASHBOARD_THEME.brandDark} />
            Financial analytics widgets will be expanded here once quotations, invoicing, and P&L modules are released.
          </div>
        </SectionCard>
    </DashboardShell>
  );
}
