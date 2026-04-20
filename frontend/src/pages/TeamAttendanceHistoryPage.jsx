// Team attendance roster for one calendar day (company scope).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getCompanyAttendanceByDate, listCompanies } from '../services/api.js';

function localDateInputValue(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtTime(v) {
  if (v == null || v === '') return '—';
  const t = new Date(v);
  if (Number.isNaN(t.getTime())) return String(v);
  return t.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

export default function TeamAttendanceHistoryPage() {
  const { user } = useAuth();
  const isSuperAdmin = (user?.role || '').toLowerCase() === 'super_admin';

  const BRAND = useMemo(
    () => ({
      primary: '#1A7B7B',
      text: '#1A1A2E',
      sub: '#6B7280',
      border: '#E5E7EB',
      bg: '#FFFFFF',
      rowAlt: '#F9FAFB',
    }),
    [],
  );

  const [date, setDate] = useState(() => localDateInputValue());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    () => (user?.companyId != null ? Number(user.companyId) : null),
  );

  useEffect(() => {
    if (!isSuperAdmin) return;
    let alive = true;
    (async () => {
      try {
        const res = await listCompanies();
        const list = Array.isArray(res?.data) ? res.data : [];
        if (!alive) return;
        setCompanies(list);
        setSelectedCompanyId((prev) => {
          if (prev != null && Number.isFinite(prev)) return prev;
          const first = list[0];
          return first?.id != null ? Number(first.id) : null;
        });
      } catch {
        if (alive) setCompanies([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isSuperAdmin]);

  const effectiveCompanyId = isSuperAdmin ? selectedCompanyId : user?.companyId != null ? Number(user.companyId) : null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSuperAdmin && (effectiveCompanyId == null || !Number.isFinite(effectiveCompanyId))) {
        setError('Choose a company to load attendance.');
        setRows([]);
        return;
      }
      const res = await getCompanyAttendanceByDate(date, effectiveCompanyId ?? undefined);
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setError(e?.message || 'Failed to load attendance');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [date, effectiveCompanyId, isSuperAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, color: BRAND.text, fontWeight: 800 }}>Team attendance</h1>
        <p style={{ margin: '8px 0 0', color: BRAND.sub, fontSize: 14 }}>
          Check-in and check-out for every employee on the selected date.
        </p>
      </header>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
          padding: 14,
          background: BRAND.bg,
          border: `1px solid ${BRAND.border}`,
          borderRadius: 12,
        }}
      >
        {isSuperAdmin ? (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 700, color: BRAND.sub }}>
            Company
            <select
              value={selectedCompanyId ?? ''}
              onChange={(e) => setSelectedCompanyId(e.target.value ? Number(e.target.value) : null)}
              style={{
                minWidth: 220,
                padding: '8px 10px',
                borderRadius: 8,
                border: `1px solid ${BRAND.border}`,
                fontSize: 14,
                color: BRAND.text,
              }}
            >
              <option value="">Select company…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ?? `Company #${c.id}`}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 700, color: BRAND.sub }}>
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              border: `1px solid ${BRAND.border}`,
              fontSize: 14,
              color: BRAND.text,
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          style={{
            marginTop: 18,
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: BRAND.primary,
            color: '#fff',
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error ? (
        <div style={{ padding: 12, background: '#FEF2F2', color: '#B91C1C', borderRadius: 8, marginBottom: 12 }}>{error}</div>
      ) : null}

      <div style={{ overflowX: 'auto', border: `1px solid ${BRAND.border}`, borderRadius: 12, background: BRAND.bg }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: BRAND.rowAlt, textAlign: 'left', color: BRAND.sub }}>
              <th style={{ padding: '10px 12px' }}>Employee</th>
              <th style={{ padding: '10px 12px' }}>Code</th>
              <th style={{ padding: '10px 12px' }}>Status</th>
              <th style={{ padding: '10px 12px' }}>Check in</th>
              <th style={{ padding: '10px 12px' }}>Check out</th>
              <th style={{ padding: '10px 12px' }}>Hours</th>
              <th style={{ padding: '10px 12px' }}>Lunch (min)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: BRAND.sub }}>
                  No employees or no data for this date.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr
                  key={r.employee_id}
                  style={{
                    background: i % 2 ? BRAND.rowAlt : BRAND.bg,
                    borderTop: `1px solid ${BRAND.border}`,
                  }}
                >
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: BRAND.text }}>
                    {r.first_name} {r.last_name}
                  </td>
                  <td style={{ padding: '10px 12px', color: BRAND.sub }}>{r.employee_code || '—'}</td>
                  <td style={{ padding: '10px 12px', color: BRAND.sub }}>{r.employee_status || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>{r.check_in_time ? fmtTime(r.check_in_time) : '—'}</td>
                  <td style={{ padding: '10px 12px' }}>{r.check_out_time ? fmtTime(r.check_out_time) : '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {r.hours_worked != null && r.hours_worked !== '' ? Number(r.hours_worked).toFixed(2) : '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {r.attendance_id != null && r.lunch_break_minutes != null ? r.lunch_break_minutes : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
