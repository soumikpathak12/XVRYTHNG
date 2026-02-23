import React, { useMemo, useState } from 'react';

/* =============== Utilities =============== */

function formatCommDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function looksLikeHtml(s) {
  if (!s || typeof s !== 'string') return false;
  // Accept either escaped (&lt;tag&gt;) or real (<tag>) signatures
  return /(&lt;\/?[a-z][\s\S]*&gt;)|(<\/?[a-z][\s\S]*>)/i.test(s);
}

/** Basic HTML entities decoder (&amp;lt; -> <, etc.) */
function decodeHtmlEntities(input) {
  if (!input || typeof input !== 'string') return '';
  const textarea = document.createElement('textarea');
  textarea.innerHTML = input;
  return textarea.value;
}


function extractBodyIfPresent(htmlString) {
  if (!htmlString || typeof htmlString !== 'string') return '';
  const html = htmlString.trim();

  // If it's escaped (contains &lt;html), decode first
  const decoded = /&lt;html/i.test(html) || /&lt;!doctype/i.test(html) ? decodeHtmlEntities(html) : html;

  // If it doesn't contain <body>, return decoded as-is
  const lower = decoded.toLowerCase();
  const bodyStartIdx = lower.indexOf('<body');
  if (bodyStartIdx === -1) return decoded;

  // Find end of <body ...> tag
  const startTagEnd = lower.indexOf('>', bodyStartIdx);
  if (startTagEnd === -1) return decoded;

  // Find </body>
  const bodyEnd = lower.indexOf('</body>', startTagEnd);
  if (bodyEnd === -1) return decoded;

  return decoded.slice(startTagEnd + 1, bodyEnd);
}

/* =============== Renderers =============== */

function HtmlEmailPreview({ html }) {
  // 1) Extract body if a full document is present (doctype/head/title…)
  // 2) Decode entities if needed, so the email styles/markup render as designed
  const safeInnerHtml = useMemo(() => {
    const bodyOrDoc = extractBodyIfPresent(html);

    // Post-fix: in case caller passed only escaped fragment like &lt;table&gt;...&lt;/table&gt;
    const maybeDecoded = /&lt;\/?[a-z]/i.test(bodyOrDoc) ? decodeHtmlEntities(bodyOrDoc) : bodyOrDoc;

    // Small normalization: avoid layout overflow by constraining images/tables
    // (This is applied via wrapper CSS below.)
    return maybeDecoded;
  }, [html]);

  return (
    <div
      className="comm-html-email"
      style={{
        // Neutral wrapper so email styles look natural but don’t break the page
        // You can also put these in a CSS file.
        background: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      <div
        className="comm-html-email__inner"
        style={{
          // Provide a neutral, email-friendly surface
          // The actual email already has inline styles; we mostly ensure sizing.
          width: '100%',
          overflow: 'hidden',
        }}
        dangerouslySetInnerHTML={{ __html: safeInnerHtml }}
      />
      <style>
        {`
          .comm-html-email__inner img, 
          .comm-html-email__inner table {
            max-width: 100%;
            height: auto;
          }
          .comm-html-email__inner table {
            border-collapse: collapse;
          }
        `}
      </style>
    </div>
  );
}

function Collapsible({ children, collapsedHeight = 360 }) {
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
              height: 64,
              background:
                'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1))',
            }}
          />
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
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
          {expanded ? 'Show less' : 'Show more'}
        </button>
      </div>
    </div>
  );
}

/* =============== Pagination =============== */

function Pager({ page, pageSize, total, onChange, compact = false }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const btn = {
    background: '#fff',
    color: '#111827',
    border: '1px solid #E5E7EB',
    padding: '6px 10px',
    borderRadius: 8,
    fontWeight: 600,
    cursor: 'pointer',
  };
  const btnDisabled = { ...btn, opacity: 0.5, cursor: 'not-allowed' };

  return (
    <div
      role="navigation"
      aria-label="Pagination"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        justifyContent: 'space-between',
        flexWrap: 'wrap',
      }}
    >
      <div
        style={{ color: '#6b7280', fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}
        aria-live="polite"
      >
        <span>Total: <b>{total}</b></span>
        <span>•</span>
        <span>Page <b>{page}</b> of <b>{totalPages}</b></span>
        {!compact && (
          <>
            <span>•</span>
            <span>
              Showing <b>{total === 0 ? 0 : (page - 1) * pageSize + 1} – {Math.min(page * pageSize, total)}</b>
            </span>
          </>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" aria-label="First page" disabled={!canPrev} onClick={() => onChange(1)} style={canPrev ? btn : btnDisabled}>« First</button>
        <button type="button" aria-label="Previous page" disabled={!canPrev} onClick={() => onChange(page - 1)} style={canPrev ? btn : btnDisabled}>‹ Prev</button>
        <button type="button" aria-label="Next page" disabled={!canNext} onClick={() => onChange(page + 1)} style={canNext ? btn : btnDisabled}>Next ›</button>
        <button type="button" aria-label="Last page" disabled={!canNext} onClick={() => onChange(totalPages)} style={canNext ? btn : btnDisabled}>Last »</button>
      </div>
    </div>
  );
}

/* =============== Comm item =============== */

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
        gap: 10,
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

      {/* Body – now renders like your screenshot */}
      {isHtml ? (
        <Collapsible>
          <HtmlEmailPreview html={c.body} />
        </Collapsible>
      ) : (
        <div className="comm-body" style={{ whiteSpace: 'pre-wrap', color: '#111827' }}>
          {c.body || ''}
        </div>
      )}

      {/* Raw source toggle */}
      {isHtml && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setShowSource(v => !v)}
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

      {/* Raw source block */}
      {isHtml && showSource && (
        <div
          style={{
            background: '#0B1020',
            color: '#C7D2FE',
            borderRadius: 8,
            padding: 10,
            marginTop: 6,
            overflowX: 'auto',
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
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

/* =============== List with pagination =============== */

export default function LeadDetailCommunications({
  communications = [],
  leadId,
  pageSize = 5,
}) {
  const [page, setPage] = useState(1);

  // Sort newest first (remove if API already sorted)
  const sorted = useMemo(() => {
    const arr = Array.isArray(communications) ? [...communications] : [];
    arr.sort((a, b) => {
      const da = new Date(a.created_at || a.sent_at || 0).getTime();
      const db = new Date(b.created_at || b.sent_at || 0).getTime();
      return db - da;
    });
    return arr;
  }, [communications]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const currentItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage, pageSize]);

  // Optional: reset page when lead changes
  // React.useEffect(() => setPage(1), [leadId]);

  return (
    <div className="lead-detail-communications" style={{ display: 'grid', gap: 12 }}>
      {/* Top pager */}
      <Pager page={safePage} pageSize={pageSize} total={total} onChange={setPage} />

      {total === 0 ? (
        <div className="lead-detail-comm-empty" style={{ color: '#6b7280' }}>
          No emails or SMS yet. Send an email or SMS to start the thread.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {currentItems.map((c) => (
            <CommItem key={c.id} c={c} />
          ))}
        </div>
      )}

      {/* Bottom pager */}
      {totalPages > 1 && (
        <Pager page={safePage} pageSize={pageSize} total={total} onChange={setPage} compact />
      )}
    </div>
  );
}   