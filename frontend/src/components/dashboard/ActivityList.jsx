import { Clock, UserCircle2 } from 'lucide-react';

const BRAND = {
  primary: '#1A7B7B',
  chipBg:  '#E8F5F5',
  text:    '#1A1A2E',
  sub:     '#6B7280',
};

function initials(name, email) {
  if (name) {
    const parts = String(name).trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last  = parts[1]?.[0] ?? '';
    return (first + last || first).toUpperCase();
  }
  if (email) return String(email).charAt(0).toUpperCase();
  return 'U';
}

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function ActivityList({ items = [], onSelect }) {
  return (
    <div style={{ display: 'grid', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
      {items.map((a) => {
        const badge = (a.action_type || '').replace(/_/g, ' ');
        const ts = formatWhen(a.created_at);
        const label = a.description || '';
        const name = a.user_name || 'Unknown user';
        const customer = a.customer_name ? ` · ${a.customer_name}` : '';

        return (
          <button
            key={a.id}
            onClick={() => onSelect?.(a)}
            style={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr',
              gap: 10,
              alignItems: 'center',
              width: '100%',
              textAlign: 'left',
              border: 'none',
              background: 'transparent',
              padding: '6px 4px',
              cursor: 'pointer',
              borderRadius: 10,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div
              aria-hidden
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                background: BRAND.chipBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: BRAND.primary,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <UserCircle2 size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, color: BRAND.text, marginBottom: 2 }}>
                <strong>{name}</strong>
                <span style={{ color: BRAND.sub }}>{customer}</span>
              </div>
              <div style={{ fontSize: 12, color: BRAND.sub, marginBottom: 2 }}>{label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: BRAND.sub }}>
                <span
                  style={{
                    padding: '1px 6px',
                    borderRadius: 999,
                    background: '#F1F5F9',
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                    fontWeight: 700,
                  }}
                >
                  {badge}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} /> {ts}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}