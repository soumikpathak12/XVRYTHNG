// components/leads/LeadDetailActivity.jsx – Activity log timeline
import React, { useState } from 'react';
import { addLeadNote as apiAddLeadNote } from '../../services/api';
function formatActivityDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}


export default function LeadDetailActivity({ activities = [], leadId, onAddNote }) {
  const [showAdd, setShowAdd] = useState(false);
  const [comment, setComment] = useState('');
  const [followUp, setFollowUp] = useState(''); // yyyy-mm-dd from <input type="date">
  const [submitting, setSubmitting] = useState(false);
  const [localItems, setLocalItems] = useState([]);

  const items = (activities.length
    ? activities
    : [{ id: 'placeholder', type: 'created', title: 'Lead created', created_at: null }]
  ).concat(localItems);

  const handleToggle = (e) => {
    const checked = e.target.checked;
    setShowAdd(checked);
    if (!checked) {
      setComment('');
      setFollowUp('');
    }
  };

  const toISOStringFromDateInput = (value) => {
    // Convert yyyy-mm-dd (local) to ISO at 00:00 local time
    if (!value) return null;
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return null;
    const dt = new Date(y, m - 1, d, 0, 0, 0);
    return dt.toISOString();
  };

  const postNote = onAddNote
    ? onAddNote
    : async ({ leadId, body, followUpAt }) => {
        return apiAddLeadNote(leadId, { body, followUpAt });
      };

  const handlePost = async () => {
    const body = comment.trim();
    if (!body || submitting) return;

    setSubmitting(true);
    const followUpAtISO = toISOStringFromDateInput(followUp);
    const optimisticId = `local-${Date.now()}`;

    const optimisticItem = {
      id: optimisticId,
      type: 'note',
      title: 'Comment added',
      created_at: new Date().toISOString(),
      body: body + (followUp ? `\n\nNext follow-up: ${followUp}` : ''),
    };
    setLocalItems((prev) => [optimisticItem, ...prev]);

    try {
      const result = await postNote({ leadId, body, followUpAt: followUpAtISO });
      // If backend returns a canonical activity item, swap the optimistic one
      if (result && result.id) {
        setLocalItems((prev) => {
          const next = [...prev];
          const idx = next.findIndex((x) => x.id === optimisticId);
          if (idx >= 0) next[idx] = result;
          return next;
        });
      }
      setComment('');
      setFollowUp('');
      setShowAdd(false);
    } catch (err) {
      setLocalItems((prev) => prev.filter((x) => x.id !== optimisticId));
      console.error('Failed to post comment', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="lead-detail-activity">
      <div className="lead-detail-activity-header" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Comments</h3>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={showAdd}
            onChange={handleToggle}
            aria-controls="lead-add-comment-panel"
            aria-expanded={showAdd}
          />
          <span>Add Comment</span>
        </label>
      </div>

      {showAdd && (
        <div
          id="lead-add-comment-panel"
          className="lead-detail-comment-panel"
          style={{
            border: '2px solid #2aa198',
            borderRadius: 10,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <label htmlFor="lead-comment-textarea" style={{ display: 'block', marginBottom: 8, color: '#6b7280' }}>
          </label>
          <textarea
            id="lead-comment-textarea"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Type your comment here..."
            rows={4}
            style={{
              width: '100%',
              resize: 'vertical',
              border: '1px solid #2aa198',
              borderRadius: 10,
              padding: 10,
              outline: 'none',
              marginBottom: 12,
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label htmlFor="lead-followup-date" style={{ fontSize: 12, fontWeight: 700, color: '#4b5563' }}>
                NEXT FOLLOW-UP:
              </label>
              <input
                id="lead-followup-date"
                type="date"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                style={{
                  border: '1px solid #a7b7b7',
                  borderRadius: 6,
                  padding: '6px 8px',
                }}
              />
            </div>

            <button
              type="button"
              onClick={handlePost}
              disabled={submitting || comment.trim() === ''}
              className="lead-comment-post-btn"
              style={{
                backgroundColor: submitting || comment.trim() === '' ? '#94a3b8' : '#1A7B7B',
                color: '#fff',
                border: 'none',
                borderRadius: 18,
                padding: '8px 14px',
                cursor: submitting || comment.trim() === '' ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Posting…' : 'Post Comment'}
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="lead-detail-activity-timeline">
        {items.map((item, i) => (
          <div key={item.id || i} className="lead-detail-activity-item">
            <div className="lead-detail-activity-dot" />
            <div className="lead-detail-activity-content">
              <div className="lead-detail-activity-title">
                {item.title || item.type || 'Activity'}
              </div>
              {item.created_at && (
                <div className="lead-detail-activity-date">
                  {formatActivityDate(item.created_at)}
                </div>
              )}
              {item.body && <div className="lead-detail-activity-body">{item.body}</div>}
            </div>
          </div>
        ))}
      </div>

      {activities.length === 0 && localItems.length === 0 && (
        <p className="lead-detail-empty">No activity yet. Stage changes and notes will appear here.</p>
      )}
    </div>
  );
}