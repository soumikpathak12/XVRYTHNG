// components/leads/LeadDetailActivity.jsx – Activity log timeline
import React from 'react';

function formatActivityDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function LeadDetailActivity({ activities = [], leadId }) {
  const items = activities.length
    ? activities
    : [
        { id: 'placeholder', type: 'created', title: 'Lead created', created_at: null },
      ];

  return (
    <div className="lead-detail-activity">
      <div className="lead-detail-activity-timeline">
        {items.map((item, i) => (
          <div key={item.id || i} className="lead-detail-activity-item">
            <div className="lead-detail-activity-dot" />
            <div className="lead-detail-activity-content">
              <div className="lead-detail-activity-title">{item.title || item.type || 'Activity'}</div>
              {item.created_at && (
                <div className="lead-detail-activity-date">{formatActivityDate(item.created_at)}</div>
              )}
              {item.body && <div className="lead-detail-activity-body">{item.body}</div>}
            </div>
          </div>
        ))}
      </div>
      {activities.length === 0 && (
        <p className="lead-detail-empty">No activity yet. Stage changes and notes will appear here.</p>
      )}
    </div>
  );
}
