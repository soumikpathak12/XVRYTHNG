import React, { useMemo, useState } from 'react';

function formatCommDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}


function extractHtmlBody(html) {
  if (!html || typeof html !== 'string') return '';
  const lower = html.toLowerCase();
  const bodyStart = lower.indexOf('<body');
  if (bodyStart === -1) return html;
  const startTagEnd = lower.indexOf('>', bodyStart);
  if (startTagEnd === -1) return html;
  const bodyEnd = lower.indexOf('</body>', startTagEnd);
  if (bodyEnd === -1) return html;
  return html.slice(startTagEnd + 1, bodyEnd);
}

function looksLikeHtml(s) {
  if (!s || typeof s !== 'string') return false;
  return /<\/?[a-z][\s\S]*>/i.test(s);
}

function HtmlPreview({ html }) {
  const inner = useMemo(() => extractHtmlBody(html), [html]);
  return (
    <div
      className="comm-html-preview"
    
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}

function Collapsible({ children, collapsedHeight = 220 }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <div
        style={{
          maxHeight: expanded ? 'none' : collapsedHeight,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {children}
        {!expanded && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 60,
              background:
                'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1))',
            }}
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          marginTop: 8,
          background: '#F3F4F6',
          color: '#374151',
          border: '1px solid #E5E7EB',
          padding: '6px 10px',
          borderRadius: 8,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {expanded ? 'Show less' : 'Show more'}
      </button>
    </div>
  );
}

export default function LeadDetailCommunications({ communications = [], leadId }) {
  return (
    <div className="lead-detail-communications" style={{ display: 'grid', gap: 12 }}>
      {communications.length === 0 ? (
        <div className="lead-detail-comm-empty" style={{ color: '#6b7280' }}>
          No emails or SMS yet. Send an email or SMS to start the thread.
        </div>
      ) : (
        communications.map((c) => <CommItem key={c.id} c={c} />)
      )}
    </div>
  );
}

function CommItem({ c }) {
  const [showSource, setShowSource] = useState(false);
  const createdAt = c.created_at || c.sent_at;
  const isHtml = looksLikeHtml(c.body);

  return (
    <div
      className="comm-item"
      style={{
        border: '1px solid #E5E7EB',
        borderRadius: 10,
        padding: 12,
        display: 'grid',
        gap: 8,
      }}
    >
      {/* Header */}
      <div
        className="comm-header"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            className="comm-direction"
            style={{
              fontWeight: 700,
              fontSize: 12,
              color: c.direction === 'outbound' ? '#0F766E' : '#1F2937',
            }}
          >
            {c.direction === 'outbound' ? 'Email sent' : 'Email received'}
          </span>
          <span
            className="comm-channel"
            style={{
              fontSize: 12,
              color: '#6b7280',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              padding: '2px 8px',
            }}
          >
            {c.channel?.toUpperCase?.() || 'EMAIL'}
          </span>
          {c.automated ? (
            <span
              className="comm-badge-auto"
              style={{
                fontSize: 12,
                fontWeight: 700,
                background: '#EEF2FF',
                color: '#4F46E5',
                borderRadius: 999,
                padding: '2px 8px',
              }}
            >
              Automated
            </span>
          ) : null}
        </div>
        <span className="comm-time" style={{ color: '#6b7280', fontSize: 12 }}>
          {formatCommDate(createdAt)}
        </span>
      </div>

      {/* Subject */}
      {c.subject ? (
        <div className="comm-subject" style={{ fontWeight: 700, marginTop: 2 }}>
          {c.subject}
        </div>
      ) : null}

      {/* Body: HTML preview or text */}
      {isHtml ? (
        <Collapsible>
          <HtmlPreview html={c.body} />
        </Collapsible>
      ) : (
        <div className="comm-body" style={{ whiteSpace: 'pre-wrap', color: '#111827' }}>
          {c.body || ''}
        </div>
      )}

      {/* Toggle raw HTML when body is HTML */}
      {isHtml && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setShowSource((v) => !v)}
            style={{
              background: '#F3F4F6',
              color: '#374151',
              border: '1px solid #E5E7EB',
              padding: '6px 10px',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {showSource ? 'Hide source' : 'View source'}
          </button>
        </div>
      )}

      {/* Raw source (collapsible code block) */}
      {isHtml && showSource && (
        <div
          style={{
            background: '#0B1020',
            color: '#C7D2FE',
            borderRadius: 8,
            padding: 10,
            marginTop: 6,
            overflowX: 'auto',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: 12,
          }}
        >
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {c.body}
          </pre>
        </div>
      )}
    </div>
  );
}