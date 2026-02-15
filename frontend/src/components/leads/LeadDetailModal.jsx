// components/leads/LeadDetailModal.jsx – popup design (rounded modal, blurred backdrop, header/tabs/footer)
import React, { useState, useEffect, useCallback } from 'react';
import { getLead, updateLead, updateLeadStage } from '../../services/api.js';
import { colorForStage } from './theme.js';
import LeadDetailOverview from './LeadDetailOverview.jsx';
import LeadDetailActivity from './LeadDetailActivity.jsx';
import LeadDetailDocuments from './LeadDetailDocuments.jsx';
import LeadDetailCommunications from './LeadDetailCommunications.jsx';
import '../../styles/LeadDetailModal.css';

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

export default function LeadDetailModal({ leadId, onClose, onLeadUpdated }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details');

  const loadLead = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    setError('');
    try {
      const res = await getLead(leadId);
      setData({
        lead: res.lead,
        activities: res.activities || [],
        documents: res.documents || [],
        communications: res.communications || [],
      });
    } catch (err) {
      setError(err.message || 'Failed to load lead');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (leadId) loadLead();
    else setData(null);
  }, [leadId, loadLead]);

  const handleDetailsSubmit = async (payload) => {
    const dbPayload = {
      stage: payload.stage,
      customer_name: payload.customer_name,
      suburb: payload.suburb || null,
      system_size_kw: payload.system_size_kw != null ? Number(payload.system_size_kw) : null,
      value_amount: payload.value_amount != null ? Number(payload.value_amount) : null,
      source: payload.source || null,
      site_inspection_date: payload.site_inspection_date || null,
    };
    await updateLead(leadId, dbPayload);
    onLeadUpdated?.(leadId);
    loadLead();
  };

  const handleMarkLost = async () => {
    try {
      await updateLeadStage(leadId, 'closed_lost');
      onLeadUpdated?.(leadId, 'closed_lost');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update stage');
    }
  };

  const lead = data?.lead;
  const stageLabel = lead ? (STAGE_LABELS[lead.stage] || lead.stage) : '';
  const sourceLabel = lead?.source || '—';

  if (!leadId) return null;

  return (
    <div className="lead-detail-overlay lead-detail-popup" role="dialog" aria-modal="true" aria-labelledby="lead-detail-title">
      <div className="lead-detail-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="lead-detail-modal lead-detail-popup-modal">
        <header className="lead-detail-header lead-detail-popup-header">
          {loading ? (
            <div className="lead-detail-loading">Loading…</div>
          ) : error ? (
            <div className="lead-detail-error">{error}</div>
          ) : lead ? (
            <>
              <div className="lead-detail-popup-title-row">
                <h1 id="lead-detail-title" className="lead-detail-name">{lead.customer_name}</h1>
                <span className="lead-detail-tag lead-detail-tag-pill" style={{ backgroundColor: colorForStage(lead.stage), color: '#fff' }}>{stageLabel}</span>
              </div>
              <div className="lead-detail-popup-header-actions">
                <button type="button" className="lead-detail-icon-btn" aria-label="More options">⋮</button>
                <button type="button" className="lead-detail-close-btn" onClick={onClose} aria-label="Close">×</button>
              </div>
            </>
          ) : null}
        </header>

        {lead && (
          <>
            <div className="lead-detail-tabs lead-detail-popup-tabs">
              {['details', 'activity', 'documents', 'communications'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`lead-detail-tab ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'details' && 'Details'}
                  {tab === 'activity' && 'Activity Log'}
                  {tab === 'documents' && 'Documents'}
                  {tab === 'communications' && 'Communication'}
                </button>
              ))}
            </div>

            <div className="lead-detail-panel lead-detail-popup-panel">
              {activeTab === 'details' && (
                <LeadDetailOverview lead={lead} onEdit={handleDetailsSubmit} />
              )}
              {activeTab === 'activity' && <LeadDetailActivity activities={data?.activities || []} leadId={leadId} />}
              {activeTab === 'documents' && <LeadDetailDocuments documents={data?.documents || []} leadId={leadId} onUpload={() => loadLead()} />}
              {activeTab === 'communications' && <LeadDetailCommunications communications={data?.communications || []} leadId={leadId} />}
            </div>

            <footer className="lead-detail-popup-footer">
              <button type="button" className="lead-detail-popup-footer-btn danger" onClick={handleMarkLost}>
                Mark as Lost
              </button>
              <button type="button" className="lead-detail-popup-footer-btn secondary">Schedule Visit</button>
              <button type="button" className="lead-detail-popup-footer-btn primary">Create Proposal</button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
