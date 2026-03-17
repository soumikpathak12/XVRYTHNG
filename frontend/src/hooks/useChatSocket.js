/**
 * WebSocket hook for instant chat. Connects with JWT; calls onNewMessage(conversationId, message) when server broadcasts.
 */
import { useEffect, useRef, useState } from 'react';

function getWsUrl() {
  if (typeof window === 'undefined') return '';
  const env = import.meta.env?.VITE_WS_URL;
  if (env) return env.replace(/^http/, 'ws');
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/ws`;
}

export function useChatSocket(getToken, onNewMessage) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const onNewMessageRef = useRef(onNewMessage);
  onNewMessageRef.current = onNewMessage;

  useEffect(() => {
    const token = getToken?.();
    if (!token) {
      setConnected(false);
      return;
    }

    const url = `${getWsUrl()}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_message' && data.conversationId != null && data.message) {
          onNewMessageRef.current?.(data.conversationId, data.message);
        }
      } catch (_) {}
    };

    return () => {
      wsRef.current = null;
      ws.close();
      setConnected(false);
    };
  }, [getToken]);

  return { connected };
}
