// src/components/employee/EmployeeHeader.jsx
import { useState, useEffect, useRef } from 'react';
import { LogOut, User } from 'lucide-react';
import { createPortal } from 'react-dom';

import ChatNotificationMenu from '../admin/chatNotificationMenu.jsx'; // reuse same menu
import { useChatNotifications } from '../../hooks/useChatNotification.js';
import { useNotificationSound } from '../../hooks/useChatNotificationSound.js';
import { useTitleBadge } from '../../hooks/useTitleBadge.js';

/** Inline popup (same style/behavior as admin) */
function InlineChatPopup({ conversation, message, onClick, onClose, durationMs = 4000, bottom = 20, right = 20 }) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);
  const styleOnce = useRef(false);

  useEffect(() => {
    if (styleOnce.current) return;
    const style = document.createElement('style');
    style.setAttribute('data-inline-chat-popup-style', 'true');
    style.textContent = `
      @keyframes chat-popup-in-right {
        from { transform: translateX(16px); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
      }
      @keyframes chat-popup-out {
        from { opacity: 1; }
        to   { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    styleOnce.current = true;
  }, []);

  useEffect(() => {
    timerRef.current = setTimeout(() => setVisible(false), durationMs);
    return () => clearTimeout(timerRef.current);
  }, [durationMs]);

  useEffect(() => {
    if (!visible) {
      const t = setTimeout(() => onClose?.(), 220);
      return () => clearTimeout(t);
    }
  }, [visible, onClose]);

  const initials = (conversation?.name ?? 'User').slice(0, 2).toUpperCase();

  const node = (
    <div
      role="button"
      onClick={onClick}
      onMouseEnter={() => timerRef.current && clearTimeout(timerRef.current)}
      onMouseLeave={() => (timerRef.current = setTimeout(() => setVisible(false), 1200))}
      style={{
        position: 'fixed',
        bottom,
        right,
        width: 320,
        background: '#FFFFFF',
        color: '#111827',
        borderRadius: 12,
        boxShadow: '0 10px 15px -3px rgba(0,0,0,.15), 0 4px 6px -4px rgba(0,0,0,.1)',
        padding: '10px 12px',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        cursor: 'pointer',
        animation: `${visible ? 'chat-popup-in-right 120ms ease-out' : 'chat-popup-out 180ms ease-in forwards'}`,
        zIndex: 3000,
      }}
    >
      <div
        aria-hidden
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: '#16A34A',
          color: '#FFFFFF',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 auto',
        }}
      >
        {initials}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
          {conversation?.name ?? 'New message'}
        </div>
        <div
          style={{
            fontSize: 12,
            opacity: 0.9,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {message?.body ?? ''}
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

/**
 * EmployeeHeader — same behavior as AdminHeader, keep original styling.
 *
 * Props:
 * - user
 * - onLogout: () => void
 * - onOpenConversation: (convId) => void  // parent should navigate to "/messages"
 */
export default function EmployeeHeader({
  user,
  onLogout,
  onOpenConversation,
}) {
  const { bump, reset } = useTitleBadge({
    baseTitle: 'KTCHS Renewables',
    singular: 'New message',
    plural: 'New messages',
  });

  const { play, enable } = useNotificationSound({ allowWhenHidden: true });

  // For regular users, the hook infers company from JWT; no scope props needed
  const {
    unreadTotal,
    unreadConversations,
    markConversationAsRead,
    setActiveConversationId,
  } = useChatNotifications({
    showEvenIfActive: true,
    aggregateAcrossScopes: true,
    onIncomingFromOthers: ({ conversationId, message, conversation }) => {
      bump(1);
      setPopup({
        conversationId,
        conversation: conversation ?? { id: conversationId, name: 'Chat' },
        message,
      });
      play?.();
    },
  });

  const [popup, setPopup] = useState(null);

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: 60,
        background: '#fff',
        borderBottom: '1px solid #E5E7EB',
        padding: '0 24px',
        gap: 16,
      }}
    >
      {/* Bell + dropdown (new) */}
      <ChatNotificationMenu
        unreadTotal={unreadTotal}
        items={unreadConversations}
        onBellClick={() => enable?.()}
        onItemClick={(convId) => {
          markConversationAsRead(convId);
          setActiveConversationId(convId);
          reset();
          onOpenConversation?.(convId); // parent navigates to "/messages"
        }}
      />

      {/* User block (original style preserved) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#E5F3F1',
            color: '#146b6b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          {user?.name ? user.name.charAt(0).toUpperCase() : <User size={16} />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1F2937' }}>
            {user?.name || 'Employee'}
          </span>
          <span style={{ fontSize: 11, color: '#6B7280' }}>
            {user?.role ? user.role.replace('_', ' ') : 'User'}
          </span>
        </div>
      </div>

      <div style={{ width: 1, height: 24, background: '#E5E7EB' }} />

      {/* Logout (original style preserved) */}
      <button
        onClick={onLogout}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#4B5563',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 500,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#F3F4F6')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        title="Logout"
      >
        <LogOut size={16} />
        <span>Logout</span>
      </button>

      {/* Popup (via portal) */}
      {popup && (
        <InlineChatPopup
          conversation={popup.conversation}
          message={popup.message}
          onClick={() => {
            onOpenConversation?.(popup.conversationId); // to "/messages"
            setActiveConversationId(popup.conversationId);
            reset();
            setPopup(null);
          }}
          onClose={() => setPopup(null)}
          bottom={20}
          right={20}
        />
      )}
    </header>
  );
}
``