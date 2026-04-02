// src/components/admin/AdminHeader.jsx
import { useState, useEffect, useRef } from 'react';
import { LogOut, User } from 'lucide-react';
import { createPortal } from 'react-dom';
import * as api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

import ChatNotificationMenu from './chatNotificationMenu.jsx';
import { useChatNotifications } from '../../hooks/useChatNotification.js';
import { useNotificationSound } from '../../hooks/useChatNotificationSound.js';
import { useTitleBadge } from '../../hooks/useTitleBadge.js';

const BASE = import.meta.env.VITE_API_URL || '';
const ALLOWED_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function resolveProfileImageUrl(imageUrl) {
  if (!imageUrl) return null;
  if (String(imageUrl).startsWith('http')) return imageUrl;
  if (!BASE) return imageUrl;
  const cleanBase = BASE.endsWith('/api') ? BASE.slice(0, -4) : BASE;
  return `${cleanBase}${imageUrl}`;
}

/** Inline popup (bottom-right), white background, green initials */
function InlineChatPopup({
  conversation,
  message,
  onClick,
  onClose,
  durationMs = 4000,
  bottom = 20,
  right = 20,
}) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);
  const styleOnce = useRef(false);

  // Inject keyframes once
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

  // Auto-hide timer
  useEffect(() => {
    timerRef.current = setTimeout(() => setVisible(false), durationMs);
    return () => clearTimeout(timerRef.current);
  }, [durationMs]);

  // Unmount after fade
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
      {/* Green initials */}
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
 * AdminHeader — keep original layout & styles, add: bell, popup, title badge.
 *
 * Props:
 * - user
 * - onLogout: () => void
 * - onOpenConversation: (convId, { scope, companyId }) => void
 * - chatScope?: 'company' | 'all' (default 'company')
 * - selectedCompanyId?: number|null (default null)
 */
export default function AdminHeader({
  user,
  onLogout,
  onOpenConversation,
  chatScope = 'company',
  selectedCompanyId = null,
}) {
  const { updateCurrentUser } = useAuth();
  const fileInputRef = useRef(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');

  // Document title badge (e.g. "(2) New messages")
  const { bump, reset } = useTitleBadge({
    baseTitle: 'KTCHS Renewables',
    singular: 'New message',
    plural: 'New messages',
  });

  // Optional sound
  const { play, enable } = useNotificationSound({ allowWhenHidden: true });

  // Notifications (unread + helpers)
  const {
    unreadTotal,
    unreadConversations,
    markConversationAsRead,
    setActiveConversationId,
  } = useChatNotifications({
    chatScope,
    selectedCompanyId,
    showEvenIfActive: true,
    aggregateAcrossScopes: true,
    onIncomingFromOthers: ({ conversationId, message, conversation }) => {
      // Bump title and show popup + sound
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

  const avatarSrc = resolveProfileImageUrl(user?.image_url);

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPhotoError('');
      setPhotoUploading(true);
      if (!ALLOWED_MIMES.has(file.type)) {
        setPhotoError('Only PNG, JPG or WebP files are supported.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setPhotoError('Photo must be under 5MB.');
        return;
      }
      const res = await api.updateProfileMe({ photoFile: file });
      const profile = res?.data ?? {};
      updateCurrentUser({
        name: profile.name ?? user?.name,
        email: profile.email ?? user?.email,
        image_url: profile.image_url ?? user?.image_url,
      });
    } catch (err) {
      setPhotoError(err?.message || 'Failed to update profile image.');
    } finally {
      setPhotoUploading(false);
      e.target.value = '';
    }
  }

  // === UI (kept same styles) =================================================
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
          // Mark read + set active + navigate via parent
          markConversationAsRead(convId);
          setActiveConversationId(convId);
          reset(); // user is engaging messages now

          const scopeToSend =
            chatScope === 'company' && (selectedCompanyId == null || selectedCompanyId === '')
              ? 'all'
              : chatScope;

          onOpenConversation?.(convId, { scope: scopeToSend, companyId: selectedCompanyId ?? null });
        }}
      />

      {/* User block (original style preserved) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handlePhotoChange}
        style={{ display: 'none' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          role="button"
          title={photoUploading ? 'Uploading...' : 'Change profile image'}
          onClick={() => !photoUploading && fileInputRef.current?.click()}
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
            overflow: 'hidden',
            cursor: photoUploading ? 'default' : 'pointer',
          }}
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={user?.name || 'User'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : user?.name ? user.name.charAt(0).toUpperCase() : <User size={16} />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1F2937' }}>
            {user?.name || 'Admin'}
          </span>
          <span style={{ fontSize: 11, color: '#6B7280' }}>
            {user?.role ? user.role.replace('_', ' ') : 'Super Admin'}
          </span>
          {photoError && <span style={{ fontSize: 11, color: '#B91C1C' }}>{photoError}</span>}
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
            const scopeToSend =
              chatScope === 'company' && (selectedCompanyId == null || selectedCompanyId === '')
                ? 'all'
                : chatScope;
            onOpenConversation?.(popup.conversationId, {
              scope: scopeToSend,
              companyId: selectedCompanyId ?? null,
            });
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