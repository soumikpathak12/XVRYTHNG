import React, { useState, useEffect } from 'react';

function formatActivityDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ProjectCommunication({ projectId, apiBasePath }) {
  const [notes, setNotes] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const getToken = () => localStorage.getItem('xvrythng_token');

  const loadNotes = async () => {
    try {
      setError('');
      const res = await fetch(`${apiBasePath}/${projectId}/notes`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.message);
      setNotes(j.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load notes');
    }
  };

  useEffect(() => {
    if (projectId) loadNotes();
  }, [projectId, apiBasePath]);

  const handleToggle = (e) => {
    const checked = e.target.checked;
    setShowAdd(checked);
    if (!checked) {
      setComment('');
    }
  };

  const handlePost = async () => {
    const body = comment.trim();
    if (!body || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`${apiBasePath}/${projectId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ body }),
      });

      const j = await res.json();
      if (!j.success) throw new Error(j.message);

      setComment('');
      setShowAdd(false);
      await loadNotes(); // Reload notes
    } catch (err) {
      console.error('Failed to post comment', err);
      setError(err.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const items = notes.length
    ? notes
    : [{ id: 'placeholder', type: 'created', title: 'Project created', created_at: null }];

  return (
    <div className="lead-detail-activity" style={{ display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
      <div className="lead-detail-activity-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Communication</h3>
        {!showAdd && notes.length > 0 && (
          <button
            onClick={() => setShowAdd(true)}
            className="lead-detail-btn primary"
            style={{ borderRadius: '20px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Comment
          </button>
        )}
      </div>

      {error && (
        <div style={{ color: '#b91c1c', background: '#fee2e2', padding: 8, borderRadius: 6, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {!showAdd && notes.length === 0 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#0d9488',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
              marginBottom: '16px',
              transition: 'transform 0.2s ease',
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
             <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <p style={{ color: '#64748B', fontSize: '1.1rem', margin: 0 }}>No comments yet. Start the conversation!</p>
        </div>
      )}

      {showAdd && (
        <div id="project-add-comment-panel" style={{ marginBottom: '32px', background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <textarea
            className="lead-detail-note-input"
            rows={4}
            placeholder="Type your comment here..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={submitting}
            style={{
              width: '100%',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #cbd5e1',
              boxSizing: 'border-box',
              fontSize: '15px',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
              backgroundColor: '#ffffff'
            }}
          />
          <div className="lead-detail-note-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '16px' }}>
            <button
              onClick={() => { setShowAdd(false); setComment(''); }}
              style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', fontWeight: 500, padding: '8px 16px' }}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={handlePost}
              className="lead-detail-btn primary"
              disabled={submitting || !comment.trim()}
              style={{
                padding: '8px 24px',
                borderRadius: '24px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: submitting || !comment.trim() ? '#94a3b8' : '#1A7B7B',
                borderColor: submitting || !comment.trim() ? '#94a3b8' : '#1A7B7B',
              }}
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </div>
      )}

      {notes.length > 0 && (
        <div className="lead-detail-timeline" style={{ marginTop: showAdd ? '0' : '16px' }}>
          {items.map((it) => (
            <div key={it.id} className={`lead-detail-timeline-item ${it.type === 'note' ? 'note' : ''}`}>
              <div className={`lead-detail-timeline-icon ${it.type}`}>
                {it.type === 'created' ? (
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                ) : (
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                )}
              </div>
              <div className="lead-detail-timeline-content">
                <div className="lead-detail-timeline-header">
                  <strong>{it.type === 'note' ? 'Comment added' : it.title}</strong>
                  <span className="lead-detail-timeline-time">{formatActivityDate(it.created_at)}</span>
                </div>
                {it.body && <div className="lead-detail-timeline-body" style={{ whiteSpace: 'pre-wrap' }}>{it.body}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
