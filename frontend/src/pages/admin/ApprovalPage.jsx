// src/pages/approvals/ApprovalsPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import KPIHeader from '../../components/operation/KPIHeader';
import ApprovalsFilters from '../../components/operation/ApprovalFilter';
import ApprovalCard from '../../components/operation/ApprovalCard';
import EmptyState from '../../components/operation/EmptyState';
import { listEmployees } from '../../services/api'; // use existing API client

// ---------- Local mock data for approvals list (no backend required) ----------
const seed = [
  {
    id: 'L-1001',
    type: 'leave',
    status: 'pending',
    requester: { initials: 'MJ', name: 'Mike Johnson' },
    title: 'Annual Leave: 15 Feb - 20 Feb',
    subtitle: '2 hours ago',
    meta: '',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'E-2001',
    type: 'expense',
    status: 'pending',
    requester: { initials: 'SS', name: 'Sarah Smith' },
    title: 'Expense Claim',
    subtitle: 'Hardware: $145.20 (Sydney Site)',
    meta: '',
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  },
  {
    id: 'A-3001',
    type: 'attendance',
    status: 'pending',
    requester: { initials: 'DW', name: 'David Wilson' },
    title: 'Attendance Edit',
    subtitle: '5 hours ago',
    meta: '08:00 - 17:00 (Requested 17:30)',
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
  // Approved / Rejected samples for status filter showcase
  {
    id: 'E-2002',
    type: 'expense',
    status: 'approved',
    requester: { initials: 'AS', name: 'Anita Singh' },
    title: 'Expense Claim',
    subtitle: 'Travel: $320.00',
    meta: '',
    createdAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
  },
  {
    id: 'L-1002',
    type: 'leave',
    status: 'rejected',
    requester: { initials: 'BT', name: 'Ben Tran' },
    title: 'Sick Leave: 03 Mar',
    subtitle: 'Yesterday',
    meta: 'Insufficient balance',
    createdAt: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
  },
];

const UI = {
  h2: { fontSize: 18, fontWeight: 800, color: '#0F172A', margin: '20px 0 12px' }
};

export default function ApprovalsPage() {
  // ------- Filters state -------
  // type: render category tabs (All | Attendance | Leave | Expenses)
  // status: render status chips (Pending | Approved | Rejected)
  const [type, setType] = useState('all');          // all|attendance|leave|expense
  const [status, setStatus] = useState('pending');  // pending|approved|rejected

  // ------- Approvals data state (front-end mock only) -------
  const [rows, setRows] = useState(seed);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // ------- KPI: Active Employees (loaded from database via listEmployees) -------
  const [activeEmployees, setActiveEmployees] = useState(0);
  const [loadingKpi, setLoadingKpi] = useState(false);

  // ------- Derived: filtered approvals list (based on type & status) -------
  const items = useMemo(() => {
    let out = [...rows];
    if (type !== 'all') out = out.filter(r => r.type === type);
    if (status) out = out.filter(r => r.status === status);
    // Sort by recency (descending)
    out.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return out;
  }, [rows, type, status]);

  // ------- Derived: KPI object for header -------
  // - pending: derive from FE list (count of 'pending' approvals)
  // - employees: drive from DB result; show "..." while loading
  // - payroll/compliance: static placeholders for now
  const kpi = useMemo(() => {
    const pending = rows.filter(r => r.status === 'pending').length;
    return {
      pending,
      employees: loadingKpi ? '...' : activeEmployees,
      payroll: '$45,200',
      compliance: 98
    };
  }, [rows, activeEmployees, loadingKpi]);

  // ------- Actions: Approve / Reject (FE state only) -------
  const approve = useCallback(async (item) => {
    // Simulate network latency to show a processing state
    setLoading(true);
    await new Promise(r => setTimeout(r, 250));
    setRows(prev => prev.map(r => (r.id === item.id ? { ...r, status: 'approved' } : r)));
    setLoading(false);
  }, []);

  const reject = useCallback(async (item) => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 250));
    setRows(prev => prev.map(r => (r.id === item.id ? { ...r, status: 'rejected' } : r)));
    setLoading(false);
  }, []);


  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingKpi(true);
    
        const res = await listEmployees({ status: 'active' });
        const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        if (mounted) setActiveEmployees(rows.length);
      } catch (e) {
        console.error('Failed to load Active Employees', e);
      } finally {
        if (mounted) setLoadingKpi(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Clear any message when filters change
  useEffect(() => { setMsg(''); }, [type, status]);

  return (
    <div style={{ padding: 20 }}>
      {/* KPI header (Pending Approvals, Active Employees, Payroll Due, Compliance Rate) */}
      <KPIHeader data={kpi} />

      <h2 style={UI.h2}>Recent Approvals</h2>

      {/* Tabs for Type + chips for Status */}
      <ApprovalsFilters
        type={type} onTypeChange={setType}
        status={status} onStatusChange={setStatus}
      />

      {/* Inline error/info banner (optional) */}
      {msg && (
        <div style={{
          marginBottom: 12, padding: 10,
          border: '1px solid #FECACA', background: '#FEF2F2',
          borderRadius: 8, color: '#991B1B'
        }}>
          {msg}
        </div>
      )}

      {/* Processing indicator for approve/reject */}
      {loading && <div style={{ margin: '6px 0' }}>Processing…</div>}

      {/* Approvals list */}
      {items.length === 0 ? (
        <EmptyState title="No approvals found" subtitle="Try switching the type or status filters." />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((it) => (
            <ApprovalCard key={it.id} item={it} onApprove={approve} onReject={reject} />
          ))}
        </div>
      )}
    </div>
  );
}