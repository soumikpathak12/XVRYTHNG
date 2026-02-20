/**
 * Customer portal – My Project: timeline, system details, important dates, message team.
 */
import { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getCustomerProjectSnapshot } from '../../services/api.js';
import { Zap, Battery, MessageCircle } from 'lucide-react';
import '../../styles/CustomerPortal.css';
import '../../styles/MyProjectPage.css';

const PROJECT_TIMELINE_STAGES = [
  { key: 'sale_confirmed', label: 'SALE CONFIRMED' },
  { key: 'pre_approval', label: 'PRE-APPROVAL' },
  { key: 'design', label: 'DESIGN' },
  { key: 'procurement', label: 'PROCUREMENT' },
  { key: 'installation', label: 'INSTALLATION' },
  { key: 'inspection', label: 'INSPECTION' },
  { key: 'grid_connection', label: 'GRID CONNECTION' },
  { key: 'complete', label: 'COMPLETE' },
];

/** Map lead stage to project timeline index (0–7). */
function leadStageToTimelineIndex(stage) {
  const map = {
    new: 0,
    contacted: 0,
    qualified: 1,
    inspection_booked: 2,
    inspection_completed: 2,
    proposal_sent: 3,
    negotiation: 3,
    closed_won: 4,
    closed_lost: -1,
  };
  return map[stage] ?? 3;
}

export default function MyProjectPage() {
  const { customerUser } = useAuth();
  const leadId = customerUser?.leadId;
  const project = useMemo(() => (leadId ? getCustomerProjectSnapshot(leadId) : null), [leadId]);

  const currentStageIndex = project ? leadStageToTimelineIndex(project.stage) : 3;
  const firstName = customerUser?.name?.split(/\s+/)[0] || 'there';

  const statusMessage = currentStageIndex >= 4
    ? "Your solar journey is well underway. We're currently securing your system components."
    : currentStageIndex >= 2
      ? "We're preparing your design and next steps."
      : "Your project has been confirmed. We'll be in touch with next steps.";

  const siteAssessmentDate = project?.site_inspection_date
    ? new Date(project.site_inspection_date).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

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

      <div className="customer-portal-card">
        <h2 className="customer-portal-card-title">Project Timeline</h2>
        <div className="my-project-timeline">
          {PROJECT_TIMELINE_STAGES.map((stage, index) => {
            const isComplete = index < currentStageIndex;
            const isCurrent = index === currentStageIndex;
            return (
              <div
                key={stage.key}
                className={`my-project-timeline-step ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}`}
              >
                <div className="my-project-timeline-step-marker">
                  {isComplete ? (
                    <span className="my-project-timeline-check">✓</span>
                  ) : (
                    <span className="my-project-timeline-num">{index + 1}</span>
                  )}
                </div>
                <span className="my-project-timeline-label">{stage.label}</span>
                {index < PROJECT_TIMELINE_STAGES.length - 1 && (
                  <div className="my-project-timeline-connector" />
                )}
              </div>
            );
          })}
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
