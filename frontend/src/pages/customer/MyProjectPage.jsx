/**
 * Customer portal – My Project: Your Project Status (5-stage timeline), status update, system details, message team.
 */
import { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getCustomerProjectSnapshot } from '../../services/api.js';
import { Zap, Battery, MessageCircle, Clock, Check } from 'lucide-react';
import '../../styles/CustomerPortal.css';
import '../../styles/MyProjectPage.css';

/** 5-stage project timeline: Contract Signed → Design Approved → Procurement → Installation → Completion */
const PROJECT_TIMELINE_STAGES = [
  { key: 'contract_signed', label: 'Contract Signed' },
  { key: 'design_approved', label: 'Design Approved' },
  { key: 'procurement', label: 'Procurement' },
  { key: 'installation', label: 'Installation' },
  { key: 'completion', label: 'Completion' },
];

/** Map lead stage to 5-step timeline index (0–4). */
function leadStageToTimelineIndex(stage) {
  const map = {
    new: 0,
    contacted: 0,
    qualified: 0,
    inspection_booked: 1,
    inspection_completed: 1,
    proposal_sent: 1,
    negotiation: 2,
    closed_won: 2,
    closed_lost: -1,
  };
  return map[stage] ?? 2;
}

/** Format date for timeline (e.g. 28 Jan 2026). */
function formatDate(d) {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Derive or placeholder dates for timeline steps based on project. */
function getTimelineDates(project) {
  const base = project?.created_at ? new Date(project.created_at) : new Date();
  const contract = new Date(base);
  const design = new Date(base);
  design.setDate(design.getDate() + 2);
  const install = project?.site_inspection_date ? new Date(project.site_inspection_date) : new Date(base);
  install.setDate(install.getDate() + 7);
  return [
    formatDate(contract),
    formatDate(design),
    null,
    formatDate(install),
    null,
  ];
}

export default function MyProjectPage() {
  const { customerUser } = useAuth();
  const leadId = customerUser?.leadId;
  const project = useMemo(() => (leadId ? getCustomerProjectSnapshot(leadId) : null), [leadId]);

  const currentStageIndex = project ? leadStageToTimelineIndex(project.stage) : 2;
  const firstName = customerUser?.name?.split(/\s+/)[0] || 'there';

  const timelineDates = useMemo(() => getTimelineDates(project), [project]);
  const installationDate = project?.site_inspection_date
    ? new Date(project.site_inspection_date)
    : (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d; })();
  const installationDateFormatted = installationDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  const statusMessage = currentStageIndex >= 4
    ? "Your solar journey is well underway. We're currently securing your system components."
    : currentStageIndex >= 2
      ? "We're preparing your design and next steps."
      : "Your project has been confirmed. We'll be in touch with next steps.";

  const siteAssessmentDate = project?.site_inspection_date
    ? new Date(project.site_inspection_date).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  const projectId = leadId != null ? `PRJ-${leadId}` : 'PRJ-—';
  const systemLabel = project?.system_size_kw != null ? `${project.system_size_kw}kW Solar System` : 'Solar System';

  const statusUpdateHeading = currentStageIndex >= 3
    ? "Your installation is scheduled"
    : currentStageIndex === 2
      ? "Your equipment is on order"
      : currentStageIndex === 1
        ? "Your design has been approved"
        : "Your contract has been received";
  const statusUpdateBody = currentStageIndex >= 3
    ? <>We're ready for installation. Your installation is scheduled for <strong>{installationDateFormatted}</strong>. Our team will contact you 2 days before to confirm the time and provide preparation instructions.</>
    : currentStageIndex === 2
      ? <>We're currently procuring your solar panels and inverter. Your installation is scheduled for <strong>{installationDateFormatted}</strong>. Our team will contact you 2 days before to confirm the time and provide preparation instructions.</>
      : currentStageIndex === 1
        ? "We're preparing your equipment order. You'll receive an update when procurement begins."
        : "We're reviewing your project and will send the design for approval shortly.";

  return (
    <div className="my-project-page">
      <div className="customer-portal-card my-project-welcome">
        <div className="my-project-welcome-content">
          <h1 className="my-project-welcome-title">Hello, {firstName}!</h1>
          <p className="my-project-welcome-status">{statusMessage}</p>
        </div>
        <div className="my-project-welcome-icon" aria-hidden>
          <Zap size={64} strokeWidth={1.5} />
        </div>
      </div>

      <div className="customer-portal-card my-project-status-card">
        <h2 className="my-project-status-title">Your Project Status</h2>
        <p className="my-project-status-subtitle">Project ID: {projectId} • {systemLabel}</p>
        <div className="my-project-timeline">
          {PROJECT_TIMELINE_STAGES.map((stage, index) => {
            const isComplete = index < currentStageIndex;
            const isCurrent = index === currentStageIndex;
            const dateStr = timelineDates[index];
            const showInProgress = isCurrent && index === 2;
            const showPending = index === 4 && !isComplete;
            return (
              <div
                key={stage.key}
                className={`my-project-timeline-step ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}`}
              >
                <div className="my-project-timeline-step-marker">
                  {isComplete ? (
                    <Check size={18} strokeWidth={2.5} className="my-project-timeline-check" />
                  ) : (
                    <span className="my-project-timeline-num">{index + 1}</span>
                  )}
                </div>
                <span className="my-project-timeline-label">{stage.label}</span>
                {dateStr && <span className="my-project-timeline-date">{dateStr}</span>}
                {showInProgress && <span className="my-project-timeline-badge">In Progress</span>}
                {showPending && <span className="my-project-timeline-badge my-project-timeline-badge-pending">Pending</span>}
                {index < PROJECT_TIMELINE_STAGES.length - 1 && (
                  <div className={`my-project-timeline-connector ${isComplete ? 'complete' : ''}`} />
                )}
              </div>
            );
          })}
        </div>
        <div className="my-project-status-update">
          <div className="my-project-status-update-icon" aria-hidden>
            <Clock size={24} />
          </div>
          <div className="my-project-status-update-content">
            <h3 className="my-project-status-update-heading">{statusUpdateHeading}</h3>
            <p className="my-project-status-update-body">{statusUpdateBody}</p>
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
                {project?.system_size_kw != null ? `${project.system_size_kw} kW Solar` : '— kW Solar'}
              </span>
              <span className="my-project-system-desc">Jinko Panels + Fronius Inverter</span>
            </div>
          </div>
          <div className="my-project-system-item">
            <Battery className="my-project-system-icon" size={20} />
            <div>
              <span className="my-project-system-value">10 kWh Battery</span>
              <span className="my-project-system-desc">Tesla Powerwall 2</span>
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
            <span className="my-project-date-value">Pending</span>
          </div>
        </div>

        <div className="customer-portal-card my-project-detail-card my-project-support-card">
          <h3 className="my-project-detail-card-title">Have questions about your installation?</h3>
          <button type="button" className="customer-portal-btn customer-portal-btn-primary my-project-message-btn">
            <MessageCircle size={20} />
            Message Project Team
          </button>
        </div>
      </div>
    </div>
  );
}
