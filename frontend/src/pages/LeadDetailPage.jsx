// pages/LeadDetailPage.jsx – full-page lead detail (not a popup)
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLead, updateLead, updateLeadStage } from '../services/api.js';
import { colorForStage } from '../components/leads/theme.js';
import LeadDetailDetails from '../components/leads/LeadDetailDetails.jsx';
import LeadDetailActivity from '../components/leads/LeadDetailActivity.jsx';
import LeadDetailDocuments from '../components/leads/LeadDetailDocuments.jsx';
import LeadDetailCommunications from '../components/leads/LeadDetailCommunications.jsx';
import '../styles/LeadDetailModal.css';

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

export default function LeadDetailPage() {
  const { id: leadId } = useParams();
  const navigate = useNavigate();
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
    loadLead();
  };

  const handleMarkLost = async () => {
    try {
      await updateLeadStage(leadId, 'closed_lost');
      navigate('/admin/leads');
    } catch (err) {
      setError(err.message || 'Failed to update stage');
    }
  };

  const handleBack = () => navigate('/admin/leads');

  const lead = data?.lead;
  const stageLabel = lead ? (STAGE_LABELS[lead.stage] || lead.stage) : '';
  const sourceLabel = lead?.source || '—';

  if (!leadId) {
    return (
      <div className="lead-detail-page-wrap">
        <p>No lead selected.</p>
        <button type="button" onClick={() => navigate('/admin/leads')}>Back to Pipeline</button>
      </div>
    );
  }

  return (
    <div className="lead-detail-page-wrap">
      <div className="lead-detail-page">
        <header className="lead-detail-header">
          <button type="button" className="lead-detail-back" onClick={handleBack} aria-label="Back to pipeline">
            ← Back to Pipeline
          </button>
          {loading ? (
            <div className="lead-detail-loading">Loading…</div>
          ) : error ? (
            <div className="lead-detail-error">{error}</div>
          ) : lead ? (
            <>
              <h1 id="lead-detail-title" className="lead-detail-name">{lead.customer_name}</h1>
              <div className="lead-detail-tags">
                <span className="lead-detail-tag lead-detail-tag-stage" style={{ backgroundColor: colorForStage(lead.stage) }}>
                  {stageLabel}
                </span>
                <span className="lead-detail-tag lead-detail-tag-source">{sourceLabel}</span>
              </div>
              <div className="lead-detail-actions">
                <button type="button" className="lead-detail-btn primary">Schedule Inspection</button>
                <button type="button" className="lead-detail-btn secondary">Create Proposal</button>
                {lead.stage !== 'closed_lost' && (
                  <button type="button" className="lead-detail-btn secondary danger" onClick={handleMarkLost}>
                    Mark Lost
                  </button>
                )}
              </div>
            </>
          ) : null}
        </header>

        {lead && (
          <>
            <div className="lead-detail-cards">
              <div className="lead-detail-card">
                <span className="lead-detail-card-label">Location</span>
                <span className="lead-detail-card-value">{lead.suburb || '—'}</span>
              </div>
              <div className="lead-detail-card">
                <span className="lead-detail-card-label">Est. value</span>
                <span className="lead-detail-card-value">
                  {lead.value_amount != null ? `$${Number(lead.value_amount).toLocaleString()}` : '—'}
                </span>
              </div>
              <div className="lead-detail-card">
                <span className="lead-detail-card-label">System</span>
                <span className="lead-detail-card-value">{lead.system_size_kw != null ? `${lead.system_size_kw}kW` : '—'}</span>
              </div>
            </div>

            <div className="lead-detail-tabs">
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
                  {tab === 'communications' && 'Communications'}
                </button>
              ))}
            </div>

            <div className="lead-detail-panel">
              {activeTab === 'details' && (
                <LeadDetailDetails lead={lead} onSubmit={handleDetailsSubmit} />
              )}
              {activeTab === 'activity' && <LeadDetailActivity activities={data?.activities || []} leadId={leadId} />}
              {activeTab === 'documents' && <LeadDetailDocuments documents={data?.documents || []} leadId={leadId} onUpload={() => loadLead()} />}
              {activeTab === 'communications' && <LeadDetailCommunications communications={data?.communications || []} leadId={leadId} />}
            </div>

            <div className="lead-detail-footer-actions">
              <button type="button" className="lead-detail-footer-btn primary">Schedule Site Inspection</button>
              <button type="button" className="lead-detail-footer-btn secondary">Generate Proposal</button>
              <button type="button" className="lead-detail-footer-btn secondary">Send Email</button>
              <button type="button" className="lead-detail-footer-btn secondary">Log Call</button>
              <button type="button" className="lead-detail-footer-btn secondary">Convert to Project</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
