// pages/LeadDetailPage.jsx – full-page lead detail (not a popup)
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  getLead,
  updateLead,
  updateLeadStage,
  sendCustomerCredentials as sendCustomerCredentialsApi,
  getCustomerPortalTestLink,
  saveCustomerProjectSnapshot,
  createLeadProposal, // NEW
} from '../services/api.js';
import { colorForStage } from '../components/leads/theme.js';
import LeadDetailDetails from '../components/leads/LeadDetailDetails.jsx';
import LeadDetailActivity from '../components/leads/LeadDetailActivity.jsx';
import LeadDetailDocuments from '../components/leads/LeadDetailDocuments.jsx';
import LeadDetailCommunications from '../components/leads/LeadDetailCommunications.jsx';
import LeadDetailSolarQuotes from '../components/leads/LeadDetailSolarQuotes.jsx';
import CredentialsSentModal from '../components/leads/CredentialsSentModal.jsx';
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

// Helper: detect base path from current URL
function getBaseFromPathname(pathname) {
  if (pathname.startsWith('/admin')) return '/admin';
  if (pathname.startsWith('/employee')) return '/employee';
  return '/dashboard';
}

export default function LeadDetailPage() {
  const { id: leadId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const base = getBaseFromPathname(location.pathname);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [credentialsSent, setCredentialsSent] = useState(null); // { email, loginUrl?, isTestLink? }
  const [sendingCredentials, setSendingCredentials] = useState(false);
  const [loadingTestLink, setLoadingTestLink] = useState(false);
  const [creatingProposal, setCreatingProposal] = useState(false); // NEW

  const loadLead = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    setError('');
    try {
      const res = await getLead(leadId);
      setData({
        lead: res.lead,
        referredBy: res.referredBy || null,
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
      navigate(`${base}/leads`); 
    } catch (err) {
      setError(err.message || 'Failed to update stage');
    }
  };

  const handleBack = () => navigate(`${base}/leads`); 

  const handleSendCredentials = useCallback(async () => {
    const leadObj = data?.lead;
    if (!leadObj?.email || !leadObj.customer_name) return;
    setSendingCredentials(true);
    setError('');
    try {
      const res = await sendCustomerCredentialsApi(leadId);
      saveCustomerProjectSnapshot(leadObj.id, leadObj);
      setCredentialsSent({ email: res.email || leadObj.email, loginUrl: res.loginUrl });
    } catch (err) {
      setError(err.message || 'Failed to send credentials');
    } finally {
      setSendingCredentials(false);
    }
  }, [data, leadId]);

  const handleGetTestLink = useCallback(async () => {
    const leadObj = data?.lead;
    if (!leadObj?.email) {
      setError('Lead must have an email address.');
      return;
    }
    setLoadingTestLink(true);
    setError('');
    try {
      const res = await getCustomerPortalTestLink(leadId);
      setCredentialsSent({ email: res.email || leadObj.email, loginUrl: res.loginUrl, isTestLink: true });
    } catch (err) {
      setError(err.message || 'Failed to get test link');
    } finally {
      setLoadingTestLink(false);
    }
  }, [data, leadId]);

  // NEW: Create Proposal
  const handleCreateProposal = useCallback(async () => {
    if (!leadId) return;
    setCreatingProposal(true);
    setError('');
    try {
      await createLeadProposal(leadId);
      await loadLead(); // refresh UI (stage, proposal_sent)
    } catch (err) {
      setError(err?.message || 'Failed to create proposal');
    } finally {
      setCreatingProposal(false);
    }
  }, [leadId, loadLead]);

  const lead = data?.lead;
  const referredBy = data?.referredBy;
  const stageLabel = lead ? (STAGE_LABELS[lead.stage] || lead.stage) : '';
  const sourceLabel = lead?.source || '—';

  if (!leadId) {
    return (
      <div className="lead-detail-page-wrap">
        <p>No lead selected.</p>
        <button type="button" onClick={() => navigate(`${base}/leads`)}>Back to Pipeline</button>
      </div>
    );
  }

  return (
    <div className="lead-detail-page-wrap">
      <div className="lead-detail-page">
        <header className="lead-detail-header">
          <button
            type="button"
            className="lead-detail-back"
            onClick={handleBack}
            aria-label="Back to pipeline"
          >
            ← Back to Pipeline
          </button>

          {loading ? (
            <div className="lead-detail-loading">Loading…</div>
          ) : error ? (
            <div className="lead-detail-error">{error}</div>
          ) : lead ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h1 id="lead-detail-title" className="lead-detail-name" style={{ marginBottom: '8px' }}>
                  {lead.customer_name}
                </h1>
                <div className="lead-detail-tags" style={{ marginBottom: 0 }}>
                  <span className="lead-detail-tag lead-detail-tag-stage" style={{ backgroundColor: '#0d9488' }}>
                    {stageLabel}
                  </span>
                  <span className="lead-detail-tag lead-detail-tag-source">{sourceLabel}</span>
                  {lead.proposal_fu_flagged_for_review_at && (
                    <span className="lead-detail-tag" style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #F59E0B' }}>
                      Action needed
                    </span>
                  )}
                </div>
              </div>

              <div className="lead-detail-actions">
                {lead.email && (
                  <button
                    type="button"
                    className="lead-detail-btn secondary"
                    onClick={handleGetTestLink}
                    disabled={loadingTestLink}
                  >
                    {loadingTestLink ? '…' : 'Get test link'}
                  </button>
                )}
                {lead.stage === 'closed_won' && (
                  <button
                    type="button"
                    className="lead-detail-btn primary"
                    onClick={handleSendCredentials}
                    disabled={sendingCredentials || !lead.email}
                  >
                    {sendingCredentials ? 'Sending…' : 'Send Credentials'}
                  </button>
                )}
                <button type="button" className="lead-detail-btn primary">Schedule Inspection</button>

                {/* UPDATED: Create Proposal */}
                <button
                  type="button"
                  className="lead-detail-btn secondary"
                  onClick={handleCreateProposal}
                  disabled={creatingProposal || lead?.proposal_sent === 1}
                  title={lead?.proposal_sent ? 'Proposal has been marked as sent' : 'Mark proposal as sent and start automated follow-ups'}
                >
                  {creatingProposal ? 'Creating…' : (lead?.proposal_sent ? 'Proposal Sent' : 'Create Proposal')}
                </button>

                {lead.stage !== 'closed_lost' && (
                  <button type="button" className="lead-detail-btn secondary danger" onClick={handleMarkLost}>
                    Mark Lost
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </header>

        {credentialsSent && (
          <CredentialsSentModal
            open={!!credentialsSent}
            onClose={() => setCredentialsSent(null)}
            email={credentialsSent.email}
            loginUrl={credentialsSent.loginUrl}
            isTestLink={credentialsSent.isTestLink}
          />
        )}

        {lead && (
          <>
            {referredBy && (
              <div className="lead-detail-referred-by">
                <span className="lead-detail-referred-by-label">Referred by</span>
                <span className="lead-detail-referred-by-value">
                  {referredBy.customer_name}
                  {referredBy.email ? ` (${referredBy.email})` : ''}
                </span>
                <Link to={`${base}/leads/${referredBy.id}`} className="lead-detail-referred-by-link">
                  View referrer
                </Link>
              </div>
            )}

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
              {['details', 'notes', 'activity', 'documents', 'communications'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`lead-detail-tab ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'details' && 'Details'}
                  {tab === 'notes' && 'SolarQuotes Notes'}
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
              {activeTab === 'notes' && (
                <LeadDetailSolarQuotes lead={lead} />
              )}
              {activeTab === 'activity' && <LeadDetailActivity activities={data?.activities || []} leadId={leadId} />}
              {activeTab === 'documents' && <LeadDetailDocuments documents={data?.documents || []} leadId={leadId} onUpload={() => loadLead()} />}
              {activeTab === 'communications' && <LeadDetailCommunications communications={data?.communications || []} leadId={leadId} />}
            </div>

            <div className="lead-detail-footer-actions">
              <button type="button" className="lead-detail-footer-btn primary">Schedule Site Inspection</button>

              {/* UPDATED footer button */}
              <button
                type="button"
                className="lead-detail-footer-btn secondary"
                onClick={handleCreateProposal}
                disabled={creatingProposal || lead?.proposal_sent === 1}
              >
                {creatingProposal ? 'Creating…' : (lead?.proposal_sent ? 'Proposal Sent' : 'Create Proposal')}
              </button>

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