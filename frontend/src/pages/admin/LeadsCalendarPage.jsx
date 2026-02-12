// pages/LeadsCalendarPage.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';               
import LeadsCalendar from '../../components/leads/LeadsCalendar.jsx';
import { getLeads } from '../../services/api.js';

export default function LeadsCalendarPage() {
  const navigate = useNavigate();                              
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const transformLead = useCallback((row) => {
    const systemSizeKw = row.system_size_kw != null ? Number(row.system_size_kw) : null;
    const valueNum = row.value_amount != null ? Number(row.value_amount) : null;

    return {
      id: row.id,
      customerName: row.customer_name,
      suburb: row.suburb || '',
      systemSize: systemSizeKw != null ? `${systemSizeKw}kW` : '',
      value: valueNum != null ? valueNum : null,
      source: row.source || '',
      lastActivity: row.last_activity_at || '',
      stage: row.stage,
      _raw: row, 
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getLeads();
        const arr = Array.isArray(res?.data) ? res.data : [];

        const mapped = arr
          .filter(r => !!r.site_inspection_date)
          .map(transformLead);

        if (alive) setLeads(mapped);
      } catch (err) {
        if (alive) setError(err.message || 'Failed to load leads');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [transformLead]);

  const getDate = useCallback((l) => l._raw?.site_inspection_date || null, []);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f1a2b' }}>
            Site Visits – Calendar
          </h1>
          <p style={{ marginTop: 6, color: '#6B7280' }}>
            Showing leads that have a scheduled site inspection date.
          </p>
        </div>

        <button
          onClick={() => navigate('/admin/leads')}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: '#F3F4F6',
            color: '#111827',
            border: '1px solid #E5E7EB',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ← Back to Kanban
        </button>
      </div>

      {loading ? (
        <div style={{ marginTop: 20, color: '#6B7280' }}>Loading…</div>
      ) : error ? (
        <div
          style={{
            marginTop: 20,
            background: '#FEF2F2',
            color: '#991B1B',
            border: '1px solid #FECACA',
            padding: '8px 10px',
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      ) : (
        <LeadsCalendar
          leads={leads}
          getDate={getDate}
          titleForLead={(l) => l.customerName}
          subtitleForLead={(l) => `${l.suburb || ''} • ${l.stage || ''}`}
          onLeadClick={(lead) => {
          }}
          weekStartsOn={1}
          locale="vi-VN"
        />
      )}
    </div>
  );
}