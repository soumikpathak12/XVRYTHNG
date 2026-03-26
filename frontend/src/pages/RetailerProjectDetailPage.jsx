// src/pages/RetailerProjectDetailPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  getRetailerProject,
  updateRetailerProjectStage,
  getRetailerProjectSchedule,
  saveRetailerProjectSchedule,
  getCompanyEmployees,
  getRetailerProjectAssignees,
  saveRetailerProjectAssignees,
  updateRetailerProjectApi,
  announceCustomerPortalUtility
} from '../services/api.js';

import RetailerProjectDetailDetails from '../components/projects/RetailerProjectDetailDetails.jsx';
import ProjectDocuments from '../components/projects/ProjectDocuments.jsx';
import ProjectCommunication from '../components/projects/ProjectCommunication.jsx';
import ProjectMilestoneProgress from '../components/projects/ProjectMilestoneProgress.jsx';

import '../styles/LeadDetailModal.css'; // Re-use the layout styles from Lead Details

const RETAILER_STAGES = [
  { key: 'site_inspection', label: 'Site Inspection' },
  { key: 'stage_one', label: 'Stage One' },
  { key: 'stage_two', label: 'Stage Two' },
  { key: 'full_system', label: 'Full System' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'to_be_rescheduled', label: 'To Be Rescheduled' },
  { key: 'installation_in_progress', label: 'Installation In‑Progress' },
  { key: 'installation_completed', label: 'Installation Completed' },
  { key: 'ces_certificate_applied', label: 'CES Certificate Applied' },
  { key: 'ces_certificate_received', label: 'CES Certificate Received' },
  { key: 'ces_certificate_submitted', label: 'CES Certificate Submitted' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'done', label: 'Done' },
];

const STAGE_LABELS = RETAILER_STAGES.reduce((acc, s) => {
  acc[s.key] = s.label;
  return acc;
}, { new: 'New' });

function getBaseFromPathname(pathname) {
  if (pathname.startsWith('/admin')) return '/admin';
  if (pathname.startsWith('/employee')) return '/employee';
  return '/dashboard';
}

function fmtAUD(v) {
  if (v == null || v === '') return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(Number(v));
  } catch { return String(v); }
}

export default function RetailerProjectDetailPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const base = getBaseFromPathname(location.pathname);

  const [project, setProject] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [assignees, setAssignees] = useState([]);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [expectedCompletionDate, setExpectedCompletionDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // overview, schedule, financials, documents, communication
  const [toast, setToast] = useState('');

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError('');
    try {
      // Parallel fetches for performance
      const [projRes, schRes, asgRes, empRes] = await Promise.allSettled([
        getRetailerProject(projectId),
        getRetailerProjectSchedule(projectId),
        getRetailerProjectAssignees(projectId),
        getCompanyEmployees(),
      ]);

      if (projRes.status === 'fulfilled') {
        const p = projRes.value?.project ?? null;
        setProject(p);
        if (p?.expected_completion_date) {
          const d = p.expected_completion_date;
          setExpectedCompletionDate(d.includes('T') ? d.split('T')[0] : d);
        } else {
          setExpectedCompletionDate('');
        }
      } else {
        throw new Error(projRes.reason?.message || 'Failed to load project details');
      }

      if (schRes.status === 'fulfilled') {
        setSchedule(schRes.value?.data ?? null);
      } else {
        setSchedule(null);
      }

      if (asgRes.status === 'fulfilled') {
        const ids = Array.isArray(asgRes.value?.data?.assignees) ? asgRes.value.data.assignees : [];
        setAssignees(ids.map(Number));
      } else {
        setAssignees([]);
      }

      if (empRes.status === 'fulfilled') {
        const rows = Array.isArray(empRes.value?.data) ? empRes.value.data : [];
        const mapped = rows.map((r) => {
          const name =
            (r.full_name && r.full_name.trim()) ||
            [r.first_name, r.last_name].filter(Boolean).join(' ').trim() ||
            r.email ||
            r.employee_code ||
            'Unknown';
          const initials =
            r.initials ||
            (name
              ? name.split(/\s+/).filter(Boolean).map(s => s[0]).join('').slice(0, 3).toUpperCase()
              : 'NA');
          return { id: r.id, name, initials };
        });
        setCompanyUsers(mapped);
      }
    } catch (err) {
      setError(err.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const handleAnnounceUtilityToCustomer = useCallback(
    async (type) => {
      if (!project?.lead_id) return;
      try {
        await announceCustomerPortalUtility(project.lead_id, type);
        setToast('Customer portal updated.');
        setTimeout(() => setToast(''), 3000);
        loadData();
      } catch (e) {
        setToast(e.message || 'Failed to update customer portal');
        setTimeout(() => setToast(''), 4000);
      }
    },
    [project?.lead_id, loadData],
  );

  const handleSaveExpectedCompletionDate = async (newVal) => {
    try {
      setExpectedCompletionDate(newVal);
      await updateRetailerProjectApi(projectId, { expected_completion_date: newVal || null });
      setToast('Expected completion date updated');
      setTimeout(() => setToast(''), 3000);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to save expected completion date');
    }
  };

  useEffect(() => {
    if (projectId) loadData();
    else setProject(null);
  }, [projectId, loadData]);

  const handleBack = () => navigate(`${base}/projects/retailer`);

  const handleMarkCancelled = async () => {
    try {
      await updateRetailerProjectStage(projectId, 'cancelled');
      navigate(`${base}/projects/retailer`);
    } catch (err) {
      setError(err.message || 'Failed to update stage');
    }
  };

  const handleChangeStage = async (nextStage) => {
    // Optimistic UI update
    const previousStage = project?.stage;
    setProject((prev) => prev ? { ...prev, stage: nextStage } : prev);

    try {
      await updateRetailerProjectStage(projectId, nextStage);
      setToast(`Stage updated to ${nextStage.replace(/_/g, ' ')}`);
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      // Revert on error
      setProject((prev) => prev ? { ...prev, stage: previousStage } : prev);
      setError(err.message || 'Failed to update stage');
    }
  };

  const handleSaveSchedule = async (schedulePayload) => {
    try {
      await saveRetailerProjectSchedule(projectId, schedulePayload);

      // If a stage was also updated along with schedule:
      if (schedulePayload.nextStage && schedulePayload.nextStage !== project?.stage) {
        await updateRetailerProjectStage(projectId, schedulePayload.nextStage);
      }

      showToast('Schedule saved successfully');
      loadData(); // Refreshes everything
    } catch (err) {
      setError(err.message || 'Failed to save schedule');
    }
  };

  const handleSaveAssignees = async (assigneeIds) => {
    try {
      await saveRetailerProjectAssignees(projectId, assigneeIds);
      showToast('Assignees saved successfully');
      setAssignees(assigneeIds);
    } catch (err) {
      setError(err.message || 'Failed to update assignees');
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const stageLabel = project ? (STAGE_LABELS[project.stage] || project.stage) : '';
  const customerName = project?.customer_name || '—';

  if (!projectId) {
    return (
      <div className="lead-detail-page-wrap" style={{ padding: '24px' }}>
        <div className="lead-detail-page" style={{ textAlign: 'center', padding: '3rem', overflow: 'visible' }}>
          <p style={{ color: '#64748B', fontSize: '1.1rem', marginBottom: '1.5rem' }}>No project selected.</p>
          <button type="button" onClick={handleBack} className="lead-detail-btn primary">
            Back to Retailer Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lead-detail-page-wrap" style={{ padding: '24px' }}>
      <div className="lead-detail-page" style={{ overflow: 'visible' }}>

        {/* HEADER SECTION */}
        <header className="lead-detail-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <button
              type="button"
              className="lead-detail-back"
              onClick={handleBack}
              aria-label="Back to Retailer Projects"
            >
              ← Back to Retailer Projects
            </button>
            {toast && <span style={{ color: '#0d9488', fontWeight: 600, fontSize: '0.9rem', backgroundColor: '#F0FDFA', padding: '0.3rem 0.8rem', borderRadius: '20px' }}>{toast}</span>}
          </div>

          {loading ? (
            <div className="lead-detail-loading">Loading Detalles…</div>
          ) : error ? (
            <div className="lead-detail-error">{error}</div>
          ) : project ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h1 className="lead-detail-name">
                  {customerName}
                  {project.code && <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: '500', marginLeft: '12px' }}>[{project.code}]</span>}
                </h1>
                <div className="lead-detail-tags">
                  <span className="lead-detail-tag lead-detail-tag-stage" style={{ backgroundColor: '#0d9488' }}>
                    {stageLabel}
                  </span>
                  {project.job_type && (
                    <span className="lead-detail-tag lead-detail-tag-source">
                      Job: {project.job_type.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>

              <div className="lead-detail-actions">
                <button type="button" onClick={() => setActiveTab('schedule')} className="lead-detail-btn primary">
                  Manage Schedule
                </button>
                {project.stage !== 'cancelled' && (
                  <button type="button" onClick={handleMarkCancelled} className="lead-detail-btn secondary danger">
                    Cancel Project
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </header>

        {project && (
          <>
            {/* TABS */}
            <div className="lead-detail-tabs">
              {['overview', 'schedule', 'financials', 'documents', 'communication'].map((tab) => {
                const isActive = activeTab === tab;
                const labels = {
                  'overview': 'Overview',
                  'schedule': 'Schedule & Assignees',
                  'financials': 'Financials',
                  'documents': 'Documents',
                  'communication': 'Communication'
                };
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`lead-detail-tab ${isActive ? 'active' : ''}`}
                  >
                    {labels[tab]}
                  </button>
                )
              })}
            </div>

            {/* TAB CONTENT PANEL */}
            <div className="lead-detail-panel">
              {activeTab === 'overview' ? (
                <div className="fade-in">
                  <ProjectMilestoneProgress stages={RETAILER_STAGES} currentStage={project.stage} />
                  <div className="lead-detail-cards" style={{ margin: '0 0 32px 0' }}>
                    <div className="lead-detail-card">
                      <span className="lead-detail-card-label">Location</span>
                      <span className="lead-detail-card-value">{project.suburb || '—'}</span>
                    </div>
                    <div className="lead-detail-card">
                      <span className="lead-detail-card-label">Est. Value</span>
                      <span className="lead-detail-card-value">{fmtAUD(project.value_amount)}</span>
                    </div>
                    <div className="lead-detail-card">
                      <span className="lead-detail-card-label">System Size</span>
                      <span className="lead-detail-card-value">{project.system_size_kw != null ? `${project.system_size_kw} kW` : '—'}</span>
                    </div>
                    <div className="lead-detail-card">
                      <span className="lead-detail-card-label">Cost (expenses)</span>
                      <span className="lead-detail-card-value" title="Approved claims matched to code, customer, or installation jobs">
                        {fmtAUD(project.approved_expense_total)}
                      </span>
                    </div>
                  </div>
                  <RetailerProjectDetailDetails
                    project={project}
                    schedule={schedule}
                    assignees={assignees}
                    users={companyUsers}
                    activeTab="details"
                    onSaveSchedule={handleSaveSchedule}
                    onSaveAssignees={handleSaveAssignees}
                    onChangeStage={handleChangeStage}
                    expectedCompletionDate={expectedCompletionDate}
                    onChangeExpectedCompletionDate={handleSaveExpectedCompletionDate}
                    onAnnounceUtilityToCustomer={handleAnnounceUtilityToCustomer}
                  />
                </div>
              ) : activeTab === 'schedule' ? (
                <RetailerProjectDetailDetails
                  project={project}
                  schedule={schedule}
                  assignees={assignees}
                  users={companyUsers}
                  activeTab={activeTab}
                  onSaveSchedule={handleSaveSchedule}
                  onSaveAssignees={handleSaveAssignees}
                  onChangeStage={handleChangeStage}
                  expectedCompletionDate={expectedCompletionDate}
                  onChangeExpectedCompletionDate={handleSaveExpectedCompletionDate}
                  onAnnounceUtilityToCustomer={handleAnnounceUtilityToCustomer}
                />
              ) : activeTab === 'financials' ? (
                <div className="fade-in" style={{ padding: '24px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ marginTop: 0 }}>Financial Overview</h3>
                  <p>
                    <strong>Estimated Value: </strong> 
                    {project?.value_amount ? new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(project.value_amount) : 'Not specified'}
                  </p>
                  <p>
                    <strong>Cost (approved expenses): </strong>
                    {fmtAUD(project?.approved_expense_total)}
                  </p>
                  <p style={{ fontSize: 13, color: '#64748b', marginTop: 12 }}>
                    Cost includes approved claims linked to this project code, customer/client name, or Installation Day jobs tied to this retailer project.
                  </p>
                </div>
              ) : activeTab === 'documents' ? (
                <div className="fade-in" style={{ padding: '24px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Project Documents</h3>
                  <ProjectDocuments projectId={projectId} apiBasePath="/api/retailer-projects" />
                </div>
              ) : activeTab === 'communication' ? (
                <div className="fade-in" style={{ padding: '24px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <ProjectCommunication projectId={projectId} apiBasePath="/api/retailer-projects" />
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
