import { getToken } from '../services/api.js';
import { resolveUploadUrl, getApiOriginForUploads } from './resolveUploadUrl.js';

/**
 * Decode a data: URL to a Blob (avoids top-frame navigation to data:, which Chromium blocks).
 */
function blobFromDataUrl(dataUrl) {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error('Invalid data URL');
  const meta = dataUrl.slice(0, comma);
  const body = dataUrl.slice(comma + 1);
  const isBase64 = /;base64/i.test(meta);
  const mimeMatch = /^data:([^;,]*)/i.exec(meta);
  const mime = (mimeMatch && mimeMatch[1] && mimeMatch[1].trim()) || 'application/octet-stream';
  if (isBase64) {
    const binary = atob(body);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
  return new Blob([decodeURIComponent(body)], { type: mime });
}

function openBlobUrlInNewTab(blobUrl) {
  const newWin = window.open('about:blank', '_blank');
  if (newWin) {
    try {
      newWin.opener = null;
    } catch {
      /* ignore */
    }
  }
  if (newWin && !newWin.closed) {
    newWin.location.href = blobUrl;
  } else {
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
  }
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
}

/**
 * Open image/PDF in a new tab. Fetches from the real API host (not the Vite dev server)
 * with JWT when needed.
 */
export async function openInspectionMediaInNewTab(rawSrc) {
  const s = String(rawSrc || '').trim();
  if (!s) return;
  if (/^data:/i.test(s)) {
    try {
      const blob = blobFromDataUrl(s);
      openBlobUrlInNewTab(URL.createObjectURL(blob));
    } catch {
      const newWin = window.open('about:blank', '_blank');
      if (newWin) {
        try {
          newWin.opener = null;
        } catch {
          /* ignore */
        }
      }
      if (newWin && !newWin.closed) {
        try {
          const doc = newWin.document;
          doc.open();
          doc.write(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Preview</title></head><body style="margin:0;background:#0f172a"></body></html>'
          );
          doc.close();
          const isPdf = /^data:application\/pdf/i.test(s);
          const el = doc.createElement(isPdf ? 'iframe' : 'img');
          el.src = s;
          if (isPdf) {
            el.style.cssText = 'border:0;width:100%;height:100vh';
          } else {
            el.alt = 'preview';
            el.style.cssText = 'max-width:100%;max-height:100vh;object-fit:contain;display:block;margin:0 auto';
          }
          doc.body.appendChild(el);
        } catch {
          /* ignore */
        }
      }
    }
    return;
  }

  // Open a tab synchronously on click so navigation after await fetch still works.
  // With only `noopener` in features, window.open often returns null while a tab still
  // opens to the URL — our old code then revoked the blob immediately and left a blank tab.
  const newWin = window.open('about:blank', '_blank');
  if (newWin) {
    try {
      newWin.opener = null;
    } catch {
      /* ignore */
    }
  }

  const pathOnly = s.replace(/^https?:\/\/[^/]+/i, '');
  const rel = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
  const origin = getApiOriginForUploads();
  const urlToFetch = origin ? `${origin}${rel}` : rel;

  const navigateToResolvedUrl = () => {
    const url = resolveUploadUrl(s);
    if (newWin && !newWin.closed) {
      newWin.location.href = url;
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  try {
    const token = getToken();
    const res = await fetch(urlToFetch, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const ctype = res.headers.get('content-type') || 'application/octet-stream';
      const buf = await res.arrayBuffer();
      const blob = new Blob([buf], { type: ctype });
      const blobUrl = URL.createObjectURL(blob);
      if (newWin && !newWin.closed) {
        newWin.location.href = blobUrl;
      } else {
        const fallback = window.open(blobUrl, '_blank', 'noopener,noreferrer');
        if (!fallback) {
          URL.revokeObjectURL(blobUrl);
          navigateToResolvedUrl();
          return;
        }
      }
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
      return;
    }
  } catch {
    /* fallback */
  }
  navigateToResolvedUrl();
}
