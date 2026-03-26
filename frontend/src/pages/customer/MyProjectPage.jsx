/**
 * Customer portal – My Project: project stage progress + status update.
 */
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  getCustomerProjectSnapshot,
  getLeadCustomer,
  getProjectByLeadIdCustomer,
} from '../../services/api.js';
import { Link } from 'react-router-dom';
import { Zap, Battery, Clock, MessageCircle } from 'lucide-react';
import '../../styles/CustomerPortal.css';
import '../../styles/MyProjectPage.css';

import { DEFAULT_PROJECT_STAGES } from '../../components/projects/ProjectsKanbanBoard.jsx';
import ProjectMilestoneProgress from '../../components/projects/ProjectMilestoneProgress.jsx';

function addDays(date, days) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function deriveCustomerStatus(projectStage, installationDateFormatted) {
  const stage = projectStage || 'new';

  if (stage === 'system_handover' || stage === 'project_completed' || stage === 'done') {
    return {
      heading: 'Project completed',
      body: 'Thanks for choosing us. Your journey is complete and your team will be available if you need anything else.',
    };
  }

  if (['grid_connection_completed', 'rebate_stc_claims'].includes(stage)) {
    return {
      heading: 'Grid connection',
      body: 'We’re finalising grid connection with your distributor. We’ll update you when energisation or handover is confirmed.',
    };
  }

  if (['grid_connection_initiated', 'inspection_grid_connection', 'compliance_check'].includes(stage)) {
    return {
      heading: 'Grid paperwork',
      body: 'We’re coordinating grid connection paperwork and compliance. Your team will reach out when the next milestone is ready.',
    };
  }

  if (['ces_certificate_applied', 'ces_certificate_received', 'ces_certificate_submitted'].includes(stage)) {
    return {
      heading: 'Certificate & compliance',
      body: 'We’re working with the inspector on your certificate. We’ll keep you posted as soon as it’s received.',
    };
  }

  if (['scheduled', 'to_be_rescheduled', 'installation_in_progress', 'installation_completed'].includes(stage)) {
    return {
      heading: stage === 'installation_in_progress' ? 'Installation in progress' : 'Your installation is scheduled',
      body: (
        <>
          We're ready for installation. Your installation is scheduled for{' '}
          <strong>{installationDateFormatted}</strong>. Our team will contact you 2 days before to confirm the time and provide preparation instructions.
        </>
      ),
    };
  }

  if (['procurement'].includes(stage)) {
    return {
      heading: 'Equipment on order',
      body: (
        <>
          We’re preparing your equipment orders. We'll update you when procurement begins and installation can be scheduled.
        </>
      ),
    };
  }

  if (['design_engineering'].includes(stage)) {
    return {
      heading: 'Design and engineering approved',
      body: 'We’re moving your project from design into the next steps. We’ll keep you updated as we confirm procurement and scheduling.',
    };
  }

  if (['pre_approval', 'state_rebate'].includes(stage)) {
    return {
      heading: 'Your contract has been received',
      body: 'We’re preparing your pre-approval and rebate steps. This usually progresses quickly once approvals are confirmed.',
    };
  }

  return {
    heading: 'Your project has been confirmed',
    body: 'We’re reviewing your project and will send the next steps shortly.',
  };
}

export default function MyProjectPage() {
  const { customerUser } = useAuth();
  const leadId = customerUser?.leadId;
  const projectSnapshot = useMemo(
    () => (leadId ? getCustomerProjectSnapshot(leadId) : null),
    [leadId],
  );

  const firstName = customerUser?.name?.split(/\s+/)[0] || 'there';

  const [lead, setLead] = useState(projectSnapshot);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(Boolean(leadId));

  useEffect(() => {
    if (!leadId) {
      setLead(null);
      setProject(null);
      setLoading(false);
      return undefined;
    }

    let alive = true;
    let refreshInFlight = false;

    const refresh = async (isInitial) => {
      if (!alive || refreshInFlight) return;
      refreshInFlight = true;
      if (isInitial) setLoading(true);

      const [leadRes, projRes] = await Promise.allSettled([
        getLeadCustomer(leadId),
        getProjectByLeadIdCustomer(leadId),
      ]);

      if (!alive) return;

      if (leadRes.status === 'fulfilled' && leadRes.value?.success) {
        setLead(leadRes.value.lead ?? null);
      } else if (projectSnapshot && isInitial) {
        // Fallback to old local snapshot only on first load.
        setLead(projectSnapshot);
      }

      if (projRes.status === 'fulfilled' && projRes.value?.success) {
        setProject(projRes.value.data ?? null);
      } else if (isInitial) {
        setProject(null);
      }

      if (isInitial) setLoading(false);
      refreshInFlight = false;
    };

    // Initial fetch + periodic refresh so the customer sees stage changes.
    refresh(true);
    const intervalMs = 8000;
    const t = setInterval(() => refresh(false), intervalMs);

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [leadId, projectSnapshot]);

  const installationDate = useMemo(() => {
    const base = lead?.site_inspection_date ? new Date(lead.site_inspection_date) : new Date();
    const d = addDays(base, 14);
    return d;
  }, [lead?.site_inspection_date]);

  const installationDateFormatted = installationDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  const siteAssessmentDate = lead?.site_inspection_date
    ? new Date(lead.site_inspection_date).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  const projectId = leadId != null ? `PRJ-${leadId}` : 'PRJ-—';
  const systemKw = project?.system_size_kw ?? project?.lead_system_size_kw ?? lead?.system_size_kw ?? null;
  const systemType = project?.lead_system_type ?? lead?.system_type ?? null;

  const pvPanelBrand = project?.lead_pv_panel_brand ?? null;
  const pvInverterBrand = project?.lead_pv_inverter_brand ?? null;
  const batterySizeKwh = project?.lead_battery_size_kwh ?? lead?.battery_size_kwh ?? null;
  const batteryBrand = project?.lead_battery_brand ?? lead?.battery_brand ?? null;
  const batteryModel = project?.lead_battery_model ?? lead?.battery_model ?? null;

  const solarSpecDesc =
    [pvPanelBrand ? `${pvPanelBrand} panels` : null, pvInverterBrand ? `${pvInverterBrand} inverter` : null]
      .filter(Boolean)
      .join(' + ') || null;

  const batterySpecDesc = [batteryBrand, batteryModel].filter(Boolean).join(' ') || null;

  const systemLabel = systemKw != null ? `${systemKw}kW Solar System${systemType ? ` • ${systemType}` : ''}` : 'Solar System';

  const currentStageKey = project?.stage ?? 'new';
  const status = deriveCustomerStatus(currentStageKey, installationDateFormatted);
  const stageIndex = DEFAULT_PROJECT_STAGES.findIndex((s) => s.key === currentStageKey);
  const scheduledIdx = DEFAULT_PROJECT_STAGES.findIndex((s) => s.key === 'scheduled');
  const showInstallationDate = stageIndex >= scheduledIdx && scheduledIdx >= 0;

  const installationDisplayValue = showInstallationDate ? installationDateFormatted : 'Pending';

  const portalPreAnnounced = Number(lead?.customer_portal_pre_approval_announced) === 1;
  const portalSolarAnnounced = Number(lead?.customer_portal_solar_vic_announced) === 1;
  const showPortalUtilityUpdates = portalPreAnnounced || portalSolarAnnounced;

  return (
    <div className="my-project-page">
      <div className="customer-portal-card my-project-status-card">
        <div className="my-project-status-header">
          <div>
            <h1 className="my-project-welcome-title">Hello, {firstName}!</h1>
            <h2 className="my-project-status-title">Your Project Status</h2>
            <p className="my-project-status-subtitle">Project ID: {projectId} • {systemLabel}</p>
          </div>
          <div className="my-project-welcome-icon" aria-hidden>
            <Zap size={48} strokeWidth={1.5} />
          </div>
        </div>
        {loading && (
          <div style={{ padding: '18px 12px', color: '#64748B', fontWeight: 600 }}>
            Loading your project status…
          </div>
        )}
        {!loading && (
          <ProjectMilestoneProgress stages={DEFAULT_PROJECT_STAGES} currentStage={currentStageKey} />
        )}
        {!loading && showPortalUtilityUpdates && (
          <div className="my-project-portal-updates" role="status">
            <h3 className="my-project-portal-updates-title">Updates for you</h3>
            <ul className="my-project-portal-updates-list">
              {portalPreAnnounced && <li>Pre-approval taken</li>}
              {portalSolarAnnounced && (
                <li>
                  Solar Victoria eligibility recorded
                  {lead?.solar_vic_eligibility != null && lead?.solar_vic_eligibility !== ''
                    ? Number(lead.solar_vic_eligibility) === 1
                      ? ' — Eligible'
                      : ' — Not eligible'
                    : ''}
                </li>
              )}
            </ul>
          </div>
        )}
        <div className="my-project-status-update">
          <div className="my-project-status-update-icon" aria-hidden>
            <Clock size={24} />
          </div>
          <div className="my-project-status-update-content">
            <h3 className="my-project-status-update-heading">{status.heading}</h3>
            <p className="my-project-status-update-body">{status.body}</p>
          </div>
        </div>
      </div>

      <div className="my-project-details-row">
        <div className="customer-portal-card my-project-detail-card">
          <h3 className="my-project-detail-card-title">System Details</h3>
          <div className="my-project-system-item">
            <Zap className="my-project-system-icon" size={20} />
            <div>
              <span className="my-project-system-value">
                {systemKw != null ? `${systemKw} kW Solar` : '— kW Solar'}
              </span>
              <span className="my-project-system-desc">
                {solarSpecDesc ?? (systemType ? systemType : 'Solar specifications pending')}
              </span>
            </div>
          </div>
          <div className="my-project-system-item">
            <Battery className="my-project-system-icon" size={20} />
            <div>
              <span className="my-project-system-value">
                {batterySizeKwh != null ? `${batterySizeKwh} kWh Battery` : '— kWh Battery'}
              </span>
              <span className="my-project-system-desc">
                {batterySpecDesc ?? 'Battery specifications pending'}
              </span>
            </div>
          </div>
        </div>

        <div className="customer-portal-card my-project-detail-card">
          <h3 className="my-project-detail-card-title">Important Dates</h3>
          <div className="my-project-date-row">
            <span className="my-project-date-label">Site Assessment</span>
            <span className="my-project-date-value">{siteAssessmentDate || 'Pending'}</span>
          </div>
          <div className="my-project-date-row">
            <span className="my-project-date-label">Installation</span>
            <span className="my-project-date-value">{installationDisplayValue}</span>
          </div>
        </div>

        <div className="customer-portal-card my-project-detail-card my-project-support-card">
          <h3 className="my-project-detail-card-title">Have questions about your installation?</h3>
          <p className="my-project-support-desc">
            Submit a support ticket and our team will respond shortly. No need to call different numbers.
          </p>
          <Link to="/portal/support" className="customer-portal-btn customer-portal-btn-primary my-project-support-btn">
            <MessageCircle size={18} />
            Submit a support ticket
          </Link>
          <div className="my-project-contact-details">
            <div className="my-project-contact-item">
              <span className="my-project-contact-label">Phone:</span>
              <a href="tel:1300983247" className="my-project-contact-value">1300 983 247</a>
            </div>
            <div className="my-project-contact-item">
              <span className="my-project-contact-label">Email:</span>
              <a href="mailto:inquiries@xtechsrenewables.com.au" className="my-project-contact-value">inquiries@xtechsrenewables.com.au</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
