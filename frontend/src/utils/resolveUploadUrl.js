/**
 * API origin for uploads and authenticated asset fetch (dev: Vite :5173 → API :3000).
 */
export function getApiOriginForUploads() {
  const API_BASE = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
  if (API_BASE) return API_BASE;
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    // Vite dev/preview: API on same host, port 3000
    if (port === '5173' || port === '4173') {
      return `${protocol}//${hostname}:3000`;
    }
  }
  return '';
}

/**
 * Turn relative upload paths from the API (/uploads/...) into an absolute URL for <img src> and <a href>.
 */
export function resolveUploadUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^data:/i.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  const s = raw.replace(/\\/g, '/').replace(/^\.?\//, '/');
  const origin = getApiOriginForUploads();
  if (origin) return `${origin}${s.startsWith('/') ? s : `/${s}`}`;
  return s;
}
