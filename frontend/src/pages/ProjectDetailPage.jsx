// src/pages/ProjectDetailPage.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  getProject,
  getCompanyEmployees,
  saveProjectScheduleAssign,
  getProjectScheduleAssign,
  getLead,
  updateProjectApi,
  listInstallationJobs,
  updateLead,
} from '../services/api.js';
import '../styles/LeadDetailModal.css'; // Reuse lead detail styles
import RetailerProjectDetailDetails from '../components/projects/RetailerProjectDetailDetails.jsx';
import LeadDetailActivity from '../components/leads/LeadDetailActivity.jsx';
import ProjectDocuments from '../components/projects/ProjectDocuments.jsx';
import ProjectCommunication from '../components/projects/ProjectCommunication.jsx';
import ProjectMilestoneProgress from '../components/projects/ProjectMilestoneProgress.jsx';

// ─── brand tokens (local, no import needed) ──────────────────────────────────
const INST_BRAND = '#146b6b';
const INST_BRAND_BG = '#E6F4F1';

function fmtAud0(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(v));
}

const INST_STATUS_CFG = {
  scheduled: { label: 'Scheduled', bg: '#EFF6FF', color: '#1D4ED8', dot: '#2563EB' },
  in_progress: { label: 'In Progress', bg: '#FFF7ED', color: '#C2410C', dot: '#EA580C' },
  paused: { label: 'Paused', bg: '#FEF9C3', color: '#92400E', dot: '#D97706' },
  completed: { label: 'Completed', bg: '#F0FDF4', color: '#15803D', dot: '#16A34A' },
};

function InstallationJobsPanel({ jobs, navigate }) {
  if (!jobs.length) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', background: '#F9FAFB', borderRadius: 12, border: '1px dashed #E5E7EB' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔧</div>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#374151', marginBottom: 6 }}>No installation jobs yet</div>
        <div style={{ fontSize: 13, color: '#9CA3AF' }}>Installation jobs linked to this project will appear here.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {jobs.map(job => {
        const cfg = INST_STATUS_CFG[job.status] ?? INST_STATUS_CFG.scheduled;
        return (
          <div
            key={job.id}
            onClick={() => navigate(`/admin/installation/${job.id}`)}
            style={{
              background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14,
              padding: '16px 18px', cursor: 'pointer',
              display: 'flex', alignItems: 'flex-start', gap: 14,
              transition: 'box-shadow 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = INST_BRAND; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = '#E5E7EB'; }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: INST_BRAND_BG,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ fontSize: 18 }}>🔧</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>
                  {job.customer_name || `Job #${job.id}`}
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
                  borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: cfg.bg, color: cfg.color, flexShrink: 0,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
                  {cfg.label}
                </span>
              </div>

              {(job.address || job.suburb) && (
                <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                  📍 {[job.address, job.suburb].filter(Boolean).join(', ')}
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 8 }}>
                {job.scheduled_date && (
                  <div style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>
                    📅 {new Date(job.scheduled_date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    {job.scheduled_time ? ` · ${job.scheduled_time.slice(0, 5)}` : ''}
                  </div>
                )}
                {job.system_size_kw && (
                  <div style={{ fontSize: 12, color: '#6B7280' }}>⚡ {job.system_size_kw} kW {job.system_type ?? ''}</div>
                )}
                {job.team_count > 0 && (
                  <div style={{ fontSize: 12, color: '#6B7280' }}>
                    👥 {job.team_names ?? `${job.team_count} team member${job.team_count > 1 ? 's' : ''}`}
                  </div>
                )}
              </div>
            </div>
            <div style={{ color: '#D1D5DB', fontSize: 18, flexShrink: 0, marginTop: 2 }}>›</div>
          </div>
        );
      })}
    </div>
  );
}

const PROJECT_STAGE_LABELS = {
  new: 'New',
  pre_approval: 'Pre-approval',
  state_rebate: 'State rebate',
  design_engineering: 'Design & engineering',
  procurement: 'Procurement',
  scheduled: 'Scheduled',
  installation_in_progress: 'Installation in progress',
  installation_completed: 'Installation completed',
  compliance_check: 'Compliance check',
  inspection_grid_connection: 'Inspection & grid connection',
  rebate_stc_claims: 'Rebate & STC claims',
  project_completed: 'Project completed',
};

const DIRECT_PROJECT_STAGES = Object.entries(PROJECT_STAGE_LABELS).map(([key, label]) => ({ key, label }));

export default function ProjectDetailPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [project, setProject] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [assignees, setAssignees] = useState([]);
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [expectedCompletionDate, setExpectedCompletionDate] = useState('');
  const [installationJobs, setInstallationJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, schedule, financials, documents, activity, communication
  const [toast, setToast] = useState('');

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [pResp, sResp, uResp] = await Promise.allSettled([
        getProject(projectId),
        getProjectScheduleAssign(projectId),
        getCompanyEmployees()
      ]);

      if (pResp.status === 'fulfilled' && pResp.value.success) {
        // Map direct project fields to retailer field names for shared component compatibility
        const raw = pResp.value.data;
        const mapped = {
          ...raw,
          code: raw.project_code,
          customer_name: raw.customer_name ?? raw.customerName,
          customer_email: raw.lead_email,
          customer_contact: raw.lead_phone,
          address: raw.address ?? raw.lead_suburb,
          system_size_kw: raw.lead_system_size_kw ?? raw.system_size_kw,
          lead_value_amount: raw.lead_value_amount ?? raw.value_amount,
          value_amount: raw.lead_value_amount ?? raw.value_amount,
          system_type: raw.lead_system_type ?? raw.system_type,
          house_storey: raw.lead_house_storey ?? raw.house_storey,
          roof_type: raw.lead_roof_type ?? raw.roof_type,
          meter_phase: raw.lead_meter_phase ?? raw.meter_phase,
          location_url: raw.map_location,
          client_name: raw.customer_name,
          client_type: raw.client_type || 'Residential',
          access_to_two_storey: raw.lead_access_to_second_storey ? 'Yes' : 'No',
          access_to_inverter: raw.lead_access_to_inverter ? 'Yes' : 'No',
          pv_system_size_kw: raw.lead_pv_system_size_kw ?? raw.pv_system_size_kw,
          pv_inverter_size_kw: raw.lead_pv_inverter_size_kw ?? raw.pv_inverter_size_kw,
          pv_inverter_brand: raw.lead_pv_inverter_brand ?? raw.pv_inverter_brand,
          pv_panel_brand: raw.lead_pv_panel_brand ?? raw.pv_panel_brand,
          pv_panel_module_watts: raw.lead_pv_panel_module_watts ?? raw.pv_panel_module_watts,
          ev_charger_brand: raw.lead_ev_charger_brand ?? raw.ev_charger_brand,
          ev_charger_model: raw.lead_ev_charger_model ?? raw.ev_charger_model,
          battery_size_kwh: raw.lead_battery_size_kwh ?? raw.battery_size_kwh,
          battery_brand: raw.lead_battery_brand ?? raw.battery_brand,
          battery_model: raw.lead_battery_model ?? raw.battery_model,
          // Utility information (from joined lead)
          pre_approval_reference_no:
            raw.lead_pre_approval_reference_no ?? raw.pre_approval_reference_no,
          energy_retailer:
            raw.lead_energy_retailer ?? raw.energy_retailer,
          energy_distributor:
            raw.lead_energy_distributor ?? raw.energy_distributor,
          solar_vic_eligibility:
            raw.lead_solar_vic_eligibility ?? raw.solar_vic_eligibility,
          nmi_number:
            raw.lead_nmi_number ?? raw.nmi_number,
          meter_number:
            raw.lead_meter_number ?? raw.meter_number,
          post_install_reference_no: raw.post_install_reference_no ?? null,
          lead_id: raw.lead_id,
        };
        setProject(mapped);
        if (raw.expected_completion_date) {
          // ensure yyyy-mm-dd format
          setExpectedCompletionDate(raw.expected_completion_date.split('T')[0]);
        }
      } else if (pResp.status === 'rejected') {
        throw new Error(pResp.reason?.message || 'Failed to load project');
      }

      if (sResp.status === 'fulfilled' && sResp.value.success) {
        const payload = sResp.value.data ?? {};
        setSchedule(payload.schedule ?? null);
        setAssignees(Array.isArray(payload.assignees) ? payload.assignees.map(Number) : []);
      }

      if (uResp.status === 'fulfilled' && uResp.value.success) {
        const rows = Array.isArray(uResp.value.data) ? uResp.value.data : [];
        const mappedUsers = rows.map((r) => {
          const name = [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || r.email || 'Unknown';
          return { id: r.id, name, initials: r.initials || name.slice(0, 2).toUpperCase() };
        });
        setUsers(mappedUsers);
      }

      // Fetch installation jobs linked to this project
      try {
        const ijResp = await listInstallationJobs({ project_id: projectId, limit: 50 });
        if (ijResp?.success && Array.isArray(ijResp.data)) setInstallationJobs(ijResp.data);
      } catch (_) { }

      // Fetch lead activities/documents if lead_id exists
      const currentProject = pResp.status === 'fulfilled' ? pResp.value.data : null;
      if (currentProject?.lead_id) {
        try {
          const lResp = await getLead(currentProject.lead_id);
          if (lResp.success) {
            setActivities(lResp.activities || []);
            setDocuments(lResp.documents || []);
          }
        } catch (lErr) {
          console.warn('[ProjectDetailPage] Failed to fetch lead data:', lErr);
        }
      }

    } catch (err) {
      console.error('[ProjectDetailPage] Load error:', err);
      setError(err.message || 'Failed to load project details.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBack = () => {
    const inEmployeeArea = location.pathname.startsWith('/employee');
    navigate(inEmployeeArea ? '/employee/projects' : '/admin/projects');
  };

  const handleSaveSchedule = async (payload) => {
    try {
      // Direct projects backend expect 'status' instead of 'nextStage'
      // And we must send everything to avoid nulling out fields in the DB (full upsert)
      const { date: schDate, time: schTime } = schedule?.scheduled_at
        ? (function () {
          const s = schedule.scheduled_at.replace('T', ' ');
          const [d, tFull] = s.split(' ');
          return { date: d, time: (tFull || '').slice(0, 5) };
        })()
        : { date: '', time: '' };

      const finalPayload = {
        status: payload.nextStage || project?.stage,
        date: payload.date || schDate,
        time: payload.time || schTime,
        notes: payload.notes ?? schedule?.notes ?? '',
        assignees: assignees, // Keep existing assignees
      };

      await saveProjectScheduleAssign(projectId, finalPayload);
      setToast('Schedule updated successfully!');
      setTimeout(() => setToast(''), 3000);
      loadData();
    } catch (err) {
      setToast(err.message || 'Failed to save schedule');
      setTimeout(() => setToast(''), 3000);
    }
  };

  const handleSaveExpectedCompletionDate = async (newDate) => {
    setExpectedCompletionDate(newDate);
    try {
      await updateProjectApi(projectId, { expected_completion_date: newDate || null });
      setToast('Expected completion date updated!');
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      console.error(err);
      setToast(err.message || 'Failed to update expected completion date');
    }
  };

  const handleSaveInHouseDetails = async (form) => {
    if (!project?.lead_id) return;
    const numOrNull = (v) => {
      if (v === '' || v == null) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const leadPayload = {
      customer_name: String(form.customer_name || '').trim(),
      email: String(form.email || '').trim() || null,
      phone: String(form.phone || '').trim() || null,
      suburb: String(form.suburb || '').trim() || null,
      system_size_kw: numOrNull(form.system_size_kw),
      value_amount: numOrNull(form.value_amount),
      system_type: form.system_type || null,
      house_storey: form.house_storey || null,
      roof_type: form.roof_type || null,
      meter_phase: form.meter_phase || null,
      access_to_second_storey: !!form.access_to_second_storey,
      access_to_inverter: !!form.access_to_inverter,
      pv_system_size_kw: numOrNull(form.pv_system_size_kw),
      pv_inverter_size_kw: numOrNull(form.pv_inverter_size_kw),
      pv_inverter_brand: form.pv_inverter_brand || null,
      pv_panel_brand: form.pv_panel_brand || null,
      pv_panel_module_watts: numOrNull(form.pv_panel_module_watts),
      ev_charger_brand: form.ev_charger_brand || null,
      ev_charger_model: form.ev_charger_model || null,
      battery_size_kwh: numOrNull(form.battery_size_kwh),
      battery_brand: form.battery_brand || null,
      battery_model: form.battery_model || null,
      pre_approval_reference_no: String(form.preApprovalRef ?? '').trim() || null,
      energy_retailer: String(form.energyRetailer ?? '').trim() || null,
      energy_distributor: String(form.energyDistributor ?? '').trim() || null,
      solar_vic_eligibility: form.solarVic === '' ? null : form.solarVic === '1',
      nmi_number: String(form.nmiNumber ?? '').trim() || null,
      meter_number: String(form.meterNumber ?? '').trim() || null,
    };
    if (!leadPayload.customer_name) {
      setToast('Customer name is required.');
      setTimeout(() => setToast(''), 3000);
      throw new Error('Customer name is required.');
    }
    try {
      await updateLead(project.lead_id, leadPayload);
      await updateProjectApi(projectId, {
        customer_name: leadPayload.customer_name,
        email: leadPayload.email,
        phone: leadPayload.phone,
        suburb: leadPayload.suburb,
        system_size_kw: leadPayload.system_size_kw,
        value_amount: leadPayload.value_amount,
        post_install_reference_no: String(form.postInstallRef ?? '').trim() || null,
      });
      setToast('Project details updated.');
      setTimeout(() => setToast(''), 3000);
      loadData();
    } catch (e) {
      setToast(e.message || 'Failed to save project details');
      setTimeout(() => setToast(''), 3000);
      throw e;
    }
  };

  const handleSaveAssignees = async (newAssigneeIds) => {
    try {
      const { date: schDate, time: schTime } = schedule?.scheduled_at
        ? (function () {
          const s = schedule.scheduled_at.replace('T', ' ');
          const [d, tFull] = s.split(' ');
          return { date: d, time: (tFull || '').slice(0, 5) };
        })()
        : { date: '', time: '' };

      const finalPayload = {
        status: project?.stage,
        date: schDate,
        time: schTime,
        notes: schedule?.notes ?? '',
        assignees: newAssigneeIds,
      };

      await saveProjectScheduleAssign(projectId, finalPayload);
      setToast('Assignees updated successfully!');
      setTimeout(() => setToast(''), 3000);
      loadData();
    } catch (err) {
      setToast(err.message || 'Failed to save assignees');
      setTimeout(() => setToast(''), 3000);
    }
  };

  if (loading && !project) {
    return (
      <div className="lead-detail-page-wrap" style={{ padding: '24px' }}>
        <div className="lead-detail-page" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="lead-detail-loading">Loading project details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lead-detail-page-wrap" style={{ padding: '24px' }}>
        <div className="lead-detail-page" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="lead-detail-error">{error}</div>
          <button type="button" onClick={handleBack} className="lead-detail-btn primary" style={{ marginTop: '1rem' }}>
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="lead-detail-page-wrap" style={{ padding: '24px' }}>
        <div className="lead-detail-page" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Project not found.</p>
          <button type="button" onClick={handleBack} className="lead-detail-btn primary">
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  const customerName = project.customer_name || project.customerName || '—';
  const displayStage = PROJECT_STAGE_LABELS[project.stage] || project.stage || 'New';

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
              aria-label="Back to Projects"
            >
              ← Back to Projects
            </button>
            {toast && <span style={{ color: '#0d9488', fontWeight: 600, fontSize: '0.9rem', backgroundColor: '#F0FDFA', padding: '0.3rem 0.8rem', borderRadius: '20px' }}>{toast}</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h1 className="lead-detail-name">
                {customerName}
                {project.project_code && <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: '500', marginLeft: '12px' }}>[{project.project_code}]</span>}
              </h1>
              <div className="lead-detail-tags">
                <span className="lead-tag stage">{displayStage}</span>
                {project.category && <span className="lead-tag source">{project.category}</span>}
              </div>
            </div>
          </div>
        </header>

        {/* TABS */}
        <div className="lead-detail-tabs">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'schedule', label: 'Schedule & Assign' },
            { key: 'financials', label: 'Financials' },
            { key: 'documents', label: 'Documents' },
            { key: 'communication', label: 'Communication' },
            { key: 'activity', label: 'Activity Log' },
            { key: 'installation', label: `Installation${installationJobs.length ? ` (${installationJobs.length})` : ''}` },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`lead-detail-tab ${isActive ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* TAB CONTENT */}
        <div className="lead-detail-panel">
          {activeTab === 'overview' ? (
            <div className="fade-in">
              <ProjectMilestoneProgress stages={DIRECT_PROJECT_STAGES} currentStage={project.stage} />
              <div className="lead-detail-cards" style={{ margin: '0 0 32px 0' }}>
                <div className="lead-detail-card">
                  <span className="lead-detail-card-label">Location</span>
                  <span className="lead-detail-card-value">{project.lead_suburb || project.suburb || '—'}</span>
                </div>
                <div className="lead-detail-card">
                  <span className="lead-detail-card-label">Est. Value</span>
                  <span className="lead-detail-card-value">
                    {project.lead_value_amount != null
                      ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(Number(project.lead_value_amount))
                      : '—'}
                  </span>
                </div>
                <div className="lead-detail-card">
                  <span className="lead-detail-card-label">System Size</span>
                  <span className="lead-detail-card-value">{project.system_size_kw != null ? `${project.system_size_kw} kW` : '—'}</span>
                </div>
                <div className="lead-detail-card">
                  <span className="lead-detail-card-label">Cost (expenses)</span>
                  <span className="lead-detail-card-value" title="Approved claims matched to this project (code, name, customer, installation jobs)">
                    {fmtAud0(project.approved_expense_total)}
                  </span>
                </div>
              </div>
              <RetailerProjectDetailDetails
                project={project}
                schedule={schedule}
                assignees={assignees}
                users={users}
                activeTab="details"
                onSaveSchedule={handleSaveSchedule}
                onSaveAssignees={handleSaveAssignees}
                expectedCompletionDate={expectedCompletionDate}
                onChangeExpectedCompletionDate={handleSaveExpectedCompletionDate}
                hideJobType={true}
                projectStages={DIRECT_PROJECT_STAGES}
                inHouseEditable={!!project.lead_id}
                onSaveInHouseDetails={handleSaveInHouseDetails}
              />
            </div>
          ) : activeTab === 'schedule' ? (
            <RetailerProjectDetailDetails
              project={project}
              schedule={schedule}
              assignees={assignees}
              users={users}
              activeTab={activeTab}
              onSaveSchedule={handleSaveSchedule}
              onSaveAssignees={handleSaveAssignees}
              expectedCompletionDate={expectedCompletionDate}
              onChangeExpectedCompletionDate={handleSaveExpectedCompletionDate}
              hideJobType={true}
              projectStages={DIRECT_PROJECT_STAGES}
              inHouseEditable={!!project.lead_id}
              onSaveInHouseDetails={handleSaveInHouseDetails}
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
                {fmtAud0(project?.approved_expense_total)}
              </p>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 12 }}>
                Cost includes approved expense claims linked by project code/name, customer, lead name, or Installation Day job for this project.
              </p>
            </div>
          ) : activeTab === 'activity' ? (
            <div className="fade-in">
              <LeadDetailActivity
                activities={activities}
                leadId={project?.lead_id}
                onAddNote={async ({ leadId, body, followUpAt }) => {
                  // Re-use logic or call API directly
                  const { addLeadNote } = await import('../services/api.js');
                  const res = await addLeadNote(leadId, { body, followUpAt });
                  // Refresh activities after add
                  const lResp = await getLead(leadId);
                  if (lResp.success) setActivities(lResp.activities || []);
                  return res.data;
                }}
              />
            </div>
          ) : activeTab === 'documents' ? (
            <div className="fade-in" style={{ padding: '24px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Project Documents</h3>
              <ProjectDocuments projectId={projectId} apiBasePath="/api/projects" />
            </div>
          ) : activeTab === 'communication' ? (
            <div className="fade-in" style={{ padding: '24px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <ProjectCommunication projectId={projectId} apiBasePath="/api/projects" />
            </div>
          ) : activeTab === 'installation' ? (
            <div className="fade-in">
              <InstallationJobsPanel jobs={installationJobs} navigate={navigate} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
