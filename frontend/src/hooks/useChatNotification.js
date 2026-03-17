// src/hooks/useChatNotification.js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getChatConversations, markChatRead, getToken } from '../services/api.js';
import { useChatSocket } from './useChatSocket.js';
import { useAuth } from '../context/AuthContext.jsx';


export function useChatNotifications(options = {}) {
  const {
    chatScope = 'company',
    selectedCompanyId = null,
    showEvenIfActive = true,
    aggregateAcrossScopes = true,
    onIncomingFromOthers,
    refreshIntervalMs,
  } = options;

  const { user } = useAuth();
  const isSuperAdmin = String(user?.role ?? '').toLowerCase() === 'super_admin';

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);


  const [bumpVersion, setBumpVersion] = useState(0);

  const bumpMapRef = useRef(new Map());  
  const activeConvIdRef = useRef(null);  


  const handleIncomingMessage = useCallback(
    (conversationId, message) => {
      if (!conversationId) return;

      // Notify UI only for messages from other users
      if (message?.senderId && message.senderId !== user?.id) {
        const conv = conversations.find((c) => c.id === conversationId);
        try {
          onIncomingFromOthers?.({ conversationId, message, conversation: conv });
        } catch {
        
        }
      }

      if (!showEvenIfActive && conversationId === activeConvIdRef.current) {
        return;
      }

      const bm = bumpMapRef.current;
      bm.set(conversationId, (bm.get(conversationId) ?? 0) + 1);

      setBumpVersion((v) => v + 1);
    },
    [showEvenIfActive, onIncomingFromOthers, user?.id, conversations]
  );

  // Connect WebSocket with existing token getter
  const { connected } = useChatSocket(getToken, handleIncomingMessage);

  /**
   * Fetch conversations for a given scope/company.
   */
  const fetchConversationsForScope = useCallback(async (companyId) => {
    try {
      const list = await getChatConversations(companyId);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }, []);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const buckets = [];
      if (isSuperAdmin && aggregateAcrossScopes) {
        // (1) Platform DMs
        buckets.push(fetchConversationsForScope(null));
        // (2) Selected company (if any)
        if (selectedCompanyId != null) {
          buckets.push(fetchConversationsForScope(selectedCompanyId));
        }
      } else {
        // Follow current scope exactly
        if (isSuperAdmin && chatScope === 'all') {
          buckets.push(fetchConversationsForScope(null));
        } else if (isSuperAdmin && chatScope === 'company') {
          if (selectedCompanyId != null) buckets.push(fetchConversationsForScope(selectedCompanyId));
        } else {
          // Regular user: server infers user's company from JWT
          buckets.push(fetchConversationsForScope(undefined));
        }
      }

      const results = (await Promise.all(buckets)).flat();

      // Merge conversations by id
      const merged = new Map();
      for (const c of results) merged.set(c.id, c);
      setConversations([...merged.values()]);

      // Reset temporary bumps after a full server sync
      bumpMapRef.current = new Map();

      // Force recompute after resetting local bumps
      setBumpVersion((v) => v + 1);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, aggregateAcrossScopes, chatScope, selectedCompanyId, fetchConversationsForScope]);

  /**
   * Periodic sync and resync when tab becomes visible.
   */
  useEffect(() => {
    loadConversations();

    const period =
      typeof refreshIntervalMs === 'number' ? refreshIntervalMs : connected ? 60000 : 30000;

    const iv = setInterval(loadConversations, period);

    const onVis = () => {
      if (document.visibilityState === 'visible') loadConversations();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [loadConversations, connected, refreshIntervalMs]);

  /**
   * Combine server unread counts with temporary bumps, then sort by recent activity.
   * DEPENDS ON bumpVersion so Map mutations trigger recompute.
   */
  const unreadConversations = useMemo(() => {
    const bump = bumpMapRef.current;
    return conversations
      .map((c) => ({
        ...c,
        unreadCount: (c.unreadCount ?? 0) + (bump.get(c.id) ?? 0),
      }))
      .filter((c) => (c.unreadCount ?? 0) > 0)
      .sort((a, b) => {
        const ta = new Date(a?.lastMessage?.createdAt ?? a?.updatedAt ?? 0).getTime();
        const tb = new Date(b?.lastMessage?.createdAt ?? b?.updatedAt ?? 0).getTime();
        return tb - ta;
      });
  }, [conversations, bumpVersion]); // <-- include bumpVersion here

  const unreadTotal = useMemo(
    () => unreadConversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0),
    [unreadConversations]
  );

  // Expose helpers
  const setActiveConversationId = useCallback((convId) => {
    activeConvIdRef.current = convId ?? null;
  }, []);

  const markConversationAsRead = useCallback(
    async (convId) => {
      try {
        await markChatRead(convId, selectedCompanyId ?? undefined);

        // Clear temporary bump & set unreadCount=0 locally
        const bm = bumpMapRef.current;
        bm.delete(convId);

        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
        );

        // Ensure recalculation of totals after marking as read
        setBumpVersion((v) => v + 1);
      } catch {
        // ignore transient errors
      }
    },
    [selectedCompanyId]
  );

  return {
    loading,
    unreadTotal,
    unreadConversations,
    refresh: loadConversations,
    setActiveConversationId,
    markConversationAsRead,
    socketConnected: connected,
  };
}