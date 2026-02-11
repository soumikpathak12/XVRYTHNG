import React, { useState, useCallback, useEffect, useMemo } from 'react';
import KanbanBoard from '../components/leads/KanbanBoard.jsx';
import Modal from '../components/common/Modal.jsx';
import AddLeadForm from '../components/leads/NewLeadForm.jsx';
import { getLeads, updateLeadStage as apiUpdateLeadStage } from '../services/api.js';

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openAdd, setOpenAdd] = useState(false);
  const [toast, setToast] = useState('');

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
        const mapped = arr.map(transformLead);
        if (alive) setLeads(mapped);
      } catch (err) {
        if (alive) setError(err.message || 'Failed to load leads');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [transformLead]);

  const handleStageChange = useCallback(async (leadId, nextStage) => {
    // Optimistic UI
    setLeads((prev) =>
      prev.map((l) => (String(l.id) === String(leadId) ? { ...l, stage: nextStage } : l))
    );

    try {
      const res = await apiUpdateLeadStage(leadId, nextStage);
      const updated = res?.data;
      if (updated) {
        // merge any server-side computed changes back (e.g., timestamps)
        setLeads((prev) =>
          prev.map((l) =>
            String(l.id) === String(leadId)
              ? {
                  ...l,
                  stage: updated.stage,
                  lastActivity: updated.last_activity_at || l.lastActivity,
                  _raw: updated,
                }
              : l
          )
        );
      }
    } catch (err) {
      // Rollback on error
      setLeads((prev) =>
        prev.map((l) =>
          String(l.id) === String(leadId) ? { ...l, stage: l._raw?.stage || l.stage } : l
        )
      );
      setToast(err.message || 'Failed to update stage');
      // Clear the toast after a few seconds (optional)
      setTimeout(() => setToast(''), 3000);
    }
  }, []);

  const handleCreated = useCallback((createdFromForm) => {
    const row = createdFromForm?.data ?? createdFromForm;
    const card = transformLead(row);
    setLeads((prev) => [card, ...prev]);
    setOpenAdd(false);
  }, [transformLead]);

  const boardLeads = useMemo(() => leads, [leads]);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f1a2b' }}>
            Sales Pipeline – Kanban
          </h1>
          <p style={{ marginTop: 6, color: '#6B7280' }}>Drag and drop leads to update status.</p>
        </div>
        <div>
          <button
            onClick={() => setOpenAdd(true)}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: '#10B981',
              color: 'white',
              border: 'none',
              fontWeight: 700,
              boxShadow: '0 2px 10px rgba(16,185,129,0.3)',
              cursor: 'pointer',
            }}
          >
            + Add New Lead
          </button>
        </div>
      </div>

      {toast && (
        <div
          style={{
            marginTop: 12,
            background: '#FEF2F2',
            color: '#991B1B',
            border: '1px solid #FECACA',
            padding: '8px 10px',
            borderRadius: 8,
          }}
        >
          {toast}
        </div>
      )}

      {loading ? (
        <div style={{ marginTop: 20, color: '#6B7280' }}>Loading leads…</div>
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
        <KanbanBoard leads={boardLeads} onStageChange={handleStageChange} />
      )}

      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Add New Lead">
        <AddLeadForm onCancel={() => setOpenAdd(false)} onCreate={handleCreated} />
      </Modal>
    </div>
  );
}