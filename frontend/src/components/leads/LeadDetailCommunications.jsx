// components/leads/LeadDetailCommunications.jsx – email/SMS thread
import React from 'react';

function formatCommDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function LeadDetailCommunications({ communications = [], leadId }) {
  return (
    <div className="lead-detail-communications">
      <div className="lead-detail-comms-thread">
        {communications.length === 0 ? (
          <p className="lead-detail-empty">No emails or SMS yet. Send an email or SMS to start the thread.</p>
        ) : (
          communications.map((c) => (
            <div key={c.id} className={`lead-detail-comms-item ${c.direction === 'outbound' ? 'outbound' : 'inbound'}`}>
              <div className="lead-detail-comms-meta">
                <span className="lead-detail-comms-type">{c.channel === 'sms' ? 'SMS' : 'Email'}</span>
                <span className="lead-detail-comms-date">{formatCommDate(c.created_at)}</span>
              </div>
              <div className="lead-detail-comms-body">{c.body || c.subject}</div>
            </div>
          ))
        )}
      </div>
      <div className="lead-detail-comms-actions">
        <button type="button" className="lead-detail-comms-btn">Send email</button>
        <button type="button" className="lead-detail-comms-btn">Send SMS</button>
      </div>
    </div>
  );
}
