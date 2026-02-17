// LeadDetailOverview.jsx – two-column Details view (Customer Contact + Project Overview) for popup
import React, { useState } from 'react';
import LeadDetailDetails from './LeadDetailDetails.jsx';

function IconPhone(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...props} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
function IconEmail(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...props} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}
function IconLocation(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...props} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconLightning(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...props} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function IconDollar(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...props} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function toTelHref(phone) {
  if (!phone) return null;
  const compact = String(phone).replace(/[^\d+]/g, ''); // keep digits and +
  return compact ? `tel:${compact}` : null;
}
function toMailHref(email) {
  if (!email) return null;
  return `mailto:${encodeURIComponent(String(email))}`;
}

export default function LeadDetailOverview({ lead, onEdit }) {
  const [showForm, setShowForm] = useState(false);

  // Be flexible with object shape: snake_case or camelCase
  const phone = lead?.phone ?? lead?._raw?.phone ?? lead?.phoneNumber ?? '';
  const email = lead?.email ?? lead?._raw?.email ?? '';
  const suburb = lead?.suburb ?? lead?._raw?.suburb ?? '';

  // For the right column they’re already using snake_case fields
  const systemSizeKw =
    lead?.system_size_kw != null
      ? Number(lead.system_size_kw)
      : lead?._raw?.system_size_kw != null
      ? Number(lead._raw.system_size_kw)
      : null;

  const valueAmount =
    lead?.value_amount != null
      ? Number(lead.value_amount)
      : lead?._raw?.value_amount != null
      ? Number(lead._raw.value_amount)
      : null;

  if (showForm) {
    return (
      <div className="lead-detail-overview">
        <LeadDetailDetails
          lead={lead}
          onSubmit={async (payload) => { await onEdit(payload); setShowForm(false); }}
        />
        <button type="button" className="lead-detail-overview-back" onClick={() => setShowForm(false)}>
          ← Back to overview
        </button>
      </div>
    );
  }

  const telHref = toTelHref(phone);
  const mailHref = toMailHref(email);

  return (
    <div className="lead-detail-overview">
      <div className="lead-detail-overview-grid">
        <section className="lead-detail-overview-section">
          <h3 className="lead-detail-section-title">Customer contact</h3>
          <div className="lead-detail-contact-cards">
            <div className="lead-detail-contact-card">
              <div className="lead-detail-contact-icon"><IconPhone /></div>
              <div>
                <span className="lead-detail-contact-label">Phone</span>
                <span className="lead-detail-contact-value">
                  {phone
                    ? (telHref
                        ? <a href={telHref}>{phone}</a>
                        : phone)
                    : '—'}
                </span>
              </div>
            </div>
            <div className="lead-detail-contact-card">
              <div className="lead-detail-contact-icon"><IconEmail /></div>
              <div>
                <span className="lead-detail-contact-label">Email</span>
                <span className="lead-detail-contact-value">
                  {email
                    ? (mailHref
                        ? <a href={mailHref}>{email}</a>
                        : email)
                    : '—'}
                </span>
              </div>
            </div>
            <div className="lead-detail-contact-card">
              <div className="lead-detail-contact-icon"><IconLocation /></div>
              <div>
                <span className="lead-detail-contact-label">Address</span>
                <span className="lead-detail-contact-value">{suburb || '—'}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="lead-detail-overview-section">
          <h3 className="lead-detail-section-title">Project overview</h3>
          <div className="lead-detail-project-cards">
            <div className="lead-detail-project-card">
              <IconLightning className="lead-detail-project-icon" />
              <span className="lead-detail-project-label">System size</span>
              <span className="lead-detail-project-value">
                {systemSizeKw != null ? `${systemSizeKw} kW` : '—'}
              </span>
            </div>
            <div className="lead-detail-project-card">
              <IconDollar className="lead-detail-project-icon" />
              <span className="lead-detail-project-label">Est. value</span>
              <span className="lead-detail-project-value">
                {valueAmount != null ? `$${Number(valueAmount).toLocaleString()}` : '—'}
              </span>
            </div>
          </div>

          <h3 className="lead-detail-section-title" style={{ marginTop: '20px' }}>
            Pre-approval status
          </h3>
          <div className="lead-detail-status-card">
            <span className="lead-detail-status-badge">In review</span>
            <span className="lead-detail-status-text">Submitted: —</span>
          </div>
        </section>
      </div>

      <button type="button" className="lead-detail-edit-btn" onClick={() => setShowForm(true)}>
        Edit details
      </button>
    </div>
  );
}