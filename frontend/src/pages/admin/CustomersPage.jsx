import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeads } from '../../services/api.js';
import { Users, DollarSign, CheckCircle2, CalendarClock, Search } from 'lucide-react';

const CARD = {
  bg: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  sub: '#64748B',
  brand: '#1A7B7B',
};

const STAGE_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  inspection_booked: 'Site Inspection Booked',
  inspection_completed: 'Site Inspection Completed',
  proposal_sent: 'Proposal Sent',
  negotiation: 'Negotiation',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
};

const STAGE_COLORS = {
  new: { bg: '#EEF2FF', text: '#3730A3' },
  contacted: { bg: '#E0F2FE', text: '#075985' },
  qualified: { bg: '#E0F2FE', text: '#0C4A6E' },
  inspection_booked: { bg: '#FEF3C7', text: '#92400E' },
  inspection_completed: { bg: '#DBEAFE', text: '#1E3A8A' },
  proposal_sent: { bg: '#FCE7F3', text: '#9D174D' },
  negotiation: { bg: '#F3E8FF', text: '#6B21A8' },
  closed_won: { bg: '#DCFCE7', text: '#166534' },
  closed_lost: { bg: '#FEE2E2', text: '#991B1B' },
};

function fmtDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-AU');
}

function fmtMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(n);
}

function normalizeLead(row) {
  return {
    id: row.id,
    customer_name: row.customer_name || '-',
    email: row.email || '-',
    phone: row.phone || '-',
    suburb: row.suburb || '-',
    stage: row.stage || '-',
    source: row.source || '-',
    value_amount: row.value_amount,
    system_size_kw: row.system_size_kw,
    system_type: row.system_type || '-',
    site_inspection_date: row.site_inspection_date,
    last_activity_at: row.last_activity_at || row.updated_at || row.created_at,
    _raw: row,
  };
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getLeads();
        const leads = Array.isArray(res?.data) ? res.data : [];
        if (!alive) return;
        setRows(leads.map(normalizeLead));
      } catch (e) {
        if (!alive) return;
        setError(e.message || 'Failed to load customers from leads');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.customer_name,
        r.email,
        r.phone,
        r.suburb,
        r.source,
        r.stage,
        String(r.id),
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / pageSize)), [filtered.length, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const stats = useMemo(() => {
    const totalValue = filtered.reduce((sum, row) => sum + (Number(row.value_amount) || 0), 0);
    const won = filtered.filter((row) => row.stage === 'closed_won').length;
    const inspectionOpen = filtered.filter((row) => row.stage === 'inspection_booked').length;
    return {
      total: filtered.length,
      totalValue,
      won,
      inspectionOpen,
    };
  }, [filtered]);

  const kpis = [
    { label: 'Total Customers', value: stats.total.toLocaleString(), icon: Users, tone: '#1A7B7B', bg: 'rgba(26,123,123,0.12)' },
    { label: 'Pipeline Value', value: fmtMoney(stats.totalValue), icon: DollarSign, tone: '#0F766E', bg: 'rgba(15,118,110,0.12)' },
    { label: 'Closed Won', value: stats.won.toLocaleString(), icon: CheckCircle2, tone: '#166534', bg: 'rgba(22,163,74,0.12)' },
    { label: 'Inspection Booked', value: stats.inspectionOpen.toLocaleString(), icon: CalendarClock, tone: '#92400E', bg: 'rgba(217,119,6,0.12)' },
  ];

  const priorityColumns = useMemo(
    () => [
      
      'customer_name',
      'email',
      'phone',
      'suburb',
      'stage',
      'source',
      'value_amount',
      'system_size_kw',
      'system_type',
      'site_inspection_date',
      'created_at',
      'updated_at',
      'last_activity_at',
    ],
    []
  );

  const hiddenColumns = useMemo(
    () =>
      new Set([
        'created_at',
        'updated_at',
        'last_activity_at',
        'createdAt',
        'updatedAt',
        'lastActivityAt',
        'value_amount',
        'system_size_kw',
        'system_type',
        'site_inspection_date',
        'access_to_inverter',
        'access_to_second_storey',
        'assigned_user_id',
        'auto_close_nonresponsive',
        'battery_brand',
        'battery_model',
        'battery_size_kwh',
        'company_id',
        'contacted_at',
        'customer_portal_pre_approval_announced',
        'customer_portal_solar_vic_announced',
        'energy_distributor',
        'energy_retailer',
        'ev_charger_brand',
        'ev_charger_model',
        'external_id',
        'flagged_for_review_at',
        'followup_first_sent_at',
        'followup_second_sent_at',
        'house_storey',
        'is_closed',
        'is_won',
        'last_inbound_email_at',
        'last_outbound_email_at',
        'lost_reason',
        'marketing_payload_json',
        'meter_number',
        'meter_phase',
        'nmi_number',
        'owner_doc_last_sent_at',
        'owner_doc_reminders_count',
        'pre_approval_reference_no',
        'pv_inverter_brand',
        'pv_inverter_model',
        'pv_inverter_power_kw',
        'pv_inverter_quantity',
        'pv_inverter_series',
        'pv_inverter_size_kw',
        'pv_panel_brand',
        'pv_panel_model',
        'pv_panel_module_watts',
        'pv_panel_quantity',
        'pv_system_size_kw',
        'referred_by_lead_id',
        'roof_type',
        'sales_segment',
        'solar_vic_eligibility',
        'won_lost_at',
      ]),
    []
  );

  const tableColumns = useMemo(() => {
    const all = new Set();
    rows.forEach((row) => {
      Object.keys(row._raw || {}).forEach((k) => all.add(k));
    });

    const ordered = [];
    priorityColumns.forEach((k) => {
      if (all.has(k)) {
        ordered.push(k);
        all.delete(k);
      }
    });

    const rest = Array.from(all).sort((a, b) => a.localeCompare(b));
    return [...ordered, ...rest].filter((k) => !hiddenColumns.has(k));
  }, [rows, priorityColumns, hiddenColumns]);

  function prettyLabel(key) {
    return String(key)
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function fmtAny(value) {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') {
      if (Number.isInteger(value)) return value.toLocaleString();
      return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
    }
    if (typeof value === 'string') {
      if (/(_at|_date|date)$/i.test(value)) return value;
      return value;
    }
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  function renderCell(key, value) {
    if (key === 'stage') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: 999,
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 800,
            background: (STAGE_COLORS[value] || { bg: '#E2E8F0' }).bg,
            color: (STAGE_COLORS[value] || { text: '#334155' }).text,
            whiteSpace: 'nowrap',
          }}
        >
          {STAGE_LABELS[value] || value || '-'}
        </span>
      );
    }

    if (key === 'source') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: 999,
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 700,
            background: '#ECFEFF',
            color: '#0E7490',
            border: '1px solid #CFFAFE',
            whiteSpace: 'nowrap',
          }}
        >
          {value || '-'}
        </span>
      );
    }

    if (key === 'value_amount') {
      return fmtMoney(value);
    }

    if (/(^|_)date$|(_at)$/i.test(key)) {
      return fmtDate(value);
    }

    return fmtAny(value);
  }

  return (
    <div
      style={{
        padding: '16px 0',
        background:
          'radial-gradient(1200px 360px at 12% -10%, rgba(26,123,123,0.10), transparent 58%), radial-gradient(900px 280px at 90% -20%, rgba(2,132,199,0.08), transparent 58%), #F6F8FB',
        minHeight: 'calc(100vh - 56px)',
      }}
    >
      <div style={{ width: '100%', display: 'grid', gap: 14 }}>
        <section
          style={{
            background: CARD.bg,
            border: `1px solid ${CARD.border}`,
            borderRadius: 14,
            padding: '14px 16px',
            display: 'grid',
            gap: 8,
            boxShadow: '0 12px 24px rgba(15,23,42,0.06)',
          }}
        >
          <h1 style={{ margin: 0, color: CARD.text, fontSize: 26, letterSpacing: 0.2 }}>Customers</h1>
          <p style={{ margin: 0, color: CARD.sub, fontSize: 14 }}>
            This page uses Leads data and shows customer-related lead information in one place.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            <div
              style={{
                minWidth: 300,
                flex: 1,
                border: `1px solid ${CARD.border}`,
                borderRadius: 10,
                padding: '0 10px',
                display: 'flex',
                alignItems: 'center',
                background: '#fff',
              }}
            >
              <Search size={16} color={CARD.sub} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by customer, email, phone, suburb, source..."
                style={{
                  flex: 1,
                  border: 'none',
                  padding: '10px 10px',
                  fontSize: 14,
                  outline: 'none',
                  background: 'transparent',
                }}
              />
            </div>
            <div style={{ color: CARD.sub, fontSize: 13, fontWeight: 700 }}>
              {filtered.length} customer lead(s)
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {kpis.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                style={{
                  background: CARD.bg,
                  border: `1px solid ${CARD.border}`,
                  borderRadius: 14,
                  padding: '14px 14px',
                  display: 'grid',
                  gap: 8,
                  boxShadow: '0 10px 18px rgba(15,23,42,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: CARD.sub, textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</div>
                  <span
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: item.bg,
                      color: item.tone,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={18} />
                  </span>
                </div>
                <div style={{ fontSize: 26, lineHeight: 1, color: CARD.text, fontWeight: 900 }}>{item.value}</div>
              </div>
            );
          })}
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
            background: CARD.bg,
            border: `1px solid ${CARD.border}`,
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 14px 28px rgba(15,23,42,0.06)',
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              borderBottom: `1px solid ${CARD.border}`,
              color: CARD.sub,
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span>Full lead information table (scroll horizontally to view all fields)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: CARD.sub }}>Per page</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                style={{
                  border: `1px solid ${CARD.border}`,
                  borderRadius: 8,
                  padding: '4px 8px',
                  background: '#fff',
                  color: CARD.text,
                  fontWeight: 700,
                }}
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: '70vh' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: Math.max(1400, tableColumns.length * 150) }}>
              <thead>
                <tr>
                  {tableColumns.map((key, idx) => (
                    <th
                      key={key}
                      style={{
                        textAlign: 'left',
                        padding: '11px 10px',
                        borderBottom: `1px solid ${CARD.border}`,
                        borderRight: `1px solid ${CARD.border}`,
                        color: CARD.sub,
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        background: '#F8FAFC',
                        whiteSpace: 'nowrap',
                        position: 'sticky',
                        top: 0,
                        zIndex: idx < 2 ? 3 : 2,
                        left: idx === 0 ? 0 : idx === 1 ? 110 : undefined,
                        minWidth: idx < 2 ? (idx === 0 ? 110 : 220) : 140,
                      }}
                    >
                      {prettyLabel(key)}
                    </th>
                  ))}
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '11px 10px',
                      borderBottom: `1px solid ${CARD.border}`,
                      color: CARD.sub,
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      background: '#F8FAFC',
                      whiteSpace: 'nowrap',
                      position: 'sticky',
                      top: 0,
                      right: 0,
                      zIndex: 4,
                      minWidth: 120,
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={tableColumns.length + 1} style={{ padding: 16, color: CARD.sub, fontWeight: 600 }}>
                      Loading customer data...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={tableColumns.length + 1} style={{ padding: 16, color: CARD.sub, fontWeight: 600 }}>
                      No customer data found.
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row, rowIndex) => (
                    <tr key={row.id} style={{ background: rowIndex % 2 === 0 ? '#FFFFFF' : '#FAFCFE' }}>
                      {tableColumns.map((key, idx) => {
                        const val = row._raw?.[key];
                        return (
                          <td
                            key={`${row.id}-${key}`}
                            style={{
                              padding: '10px 10px',
                              borderBottom: `1px solid ${CARD.border}`,
                              borderRight: `1px solid ${CARD.border}`,
                              color: CARD.text,
                              fontSize: 13,
                              verticalAlign: 'top',
                              minWidth: idx < 2 ? (idx === 0 ? 110 : 220) : 140,
                              maxWidth: key === 'email' || key === 'customer_name' ? 260 : 220,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              background: idx < 2 ? '#FFFFFF' : undefined,
                              position: idx < 2 ? 'sticky' : 'static',
                              left: idx === 0 ? 0 : idx === 1 ? 110 : undefined,
                              zIndex: idx < 2 ? 1 : 0,
                            }}
                            title={val == null ? '-' : String(val)}
                          >
                            {renderCell(key, val)}
                          </td>
                        );
                      })}
                      <td
                        style={{
                          padding: '10px 10px',
                          borderBottom: `1px solid ${CARD.border}`,
                          background: '#FFFFFF',
                          position: 'sticky',
                          right: 0,
                          zIndex: 2,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/leads/${row.id}`)}
                          style={{
                            border: `1px solid ${CARD.brand}`,
                            color: '#fff',
                            background: `linear-gradient(135deg, ${CARD.brand}, #0E8A8A)`,
                            borderRadius: 8,
                            padding: '7px 11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Open Lead
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div
            style={{
              borderTop: `1px solid ${CARD.border}`,
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ fontSize: 12, color: CARD.sub, fontWeight: 700 }}>
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              -{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                style={{
                  border: `1px solid ${CARD.border}`,
                  background: '#fff',
                  color: CARD.text,
                  borderRadius: 8,
                  padding: '5px 10px',
                  fontWeight: 700,
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage <= 1 ? 0.5 : 1,
                }}
              >
                Prev
              </button>

              <span style={{ fontSize: 12, color: CARD.sub, fontWeight: 800 }}>
                Page {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                style={{
                  border: `1px solid ${CARD.border}`,
                  background: '#fff',
                  color: CARD.text,
                  borderRadius: 8,
                  padding: '5px 10px',
                  fontWeight: 700,
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage >= totalPages ? 0.5 : 1,
                }}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
