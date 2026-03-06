import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';

export default function ChatNotificationMenu({
  unreadTotal,
  items = [],
  onItemClick,

}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onClickOutside);
    return () => document.removeEventListener('click', onClickOutside);
  }, []);

  const renderRelativeTime = (it) => {
    const ts = it?.lastMessage?.createdAt ?? it?.updatedAt;
    if (!ts) return '';
    return formatDistanceToNowStrict(new Date(ts), { addSuffix: true });
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Bell button */}
      <button
        onClick={(e) => { // prevent bubbling to document
          onBellClick?.();          
          setOpen((o) => !o);       
        }}
        style={{
          position: 'relative',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#4B5563',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 8,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#F3F4F6')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        aria-label="Message notifications"
        title="Message notifications"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {unreadTotal > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              background: '#EF4444',
              color: '#fff',
              fontSize: 11,
              lineHeight: '16px',
              height: 16,
              minWidth: 16,
              padding: '0 4px',
              borderRadius: 8,
              textAlign: 'center',
            }}
          >
            {unreadTotal > 99 ? '99+' : unreadTotal}
          </span>
        )}
        <Bell size={18} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            right: 0,
            marginTop: 8,
            width: 320,
            maxHeight: 440,
            overflowY: 'auto',
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: 10,
            boxShadow:
              '0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1)',
            padding: 8,
            zIndex: 1000,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 14, padding: '4px 8px', color: '#111827' }}>
            Unread messages
          </div>

          {items.length === 0 ? (
            <div style={{ padding: '12px 8px', color: '#6B7280' }}>No new messages.</div>
          ) : (
            items.map((it) => (
              <button
                key={it.id}
                onClick={() => {
                  onItemClick?.(String(it.id));
                  setOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onItemClick?.(String(it.id));
                    setOpen(false);
                  }
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 8px',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                role="menuitem"
              >
                <div style={{ display: 'flex', gap: 8 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: '#E5E7EB',
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 12,
                      flex: '0 0 auto',
                    }}
                  >
                    {(it.name ?? 'Chat').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>
                        {it.name ?? 'Chat'}
                      </span>
                      {!!it.unreadCount && (
                        <span style={{ fontSize: 12, color: '#EF4444' }}>• {it.unreadCount}</span>
                      )}
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6B7280' }}>
                        {renderRelativeTime(it)}
                      </span>
                    </div>
                    {it.lastMessage && (
                      <div
                        style={{
                          fontSize: 12,
                          color: '#6B7280',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginTop: 2,
                        }}
                      >
                        <strong>{it.lastMessage.senderName}:</strong> {it.lastMessage.body}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
