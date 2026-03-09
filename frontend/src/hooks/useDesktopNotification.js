import { useCallback, useEffect, useRef } from 'react';

export function useDesktopNotifications() {
  const lastShownRef = useRef(new Map()); // tag -> timestamp

  // Ask for permission if not granted/denied yet
  const ensurePermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    try {
      const perm = await Notification.requestPermission();
      return perm; // 'granted' | 'denied'
    } catch {
      return Notification.permission;
    }
  }, []);


  const notify = useCallback(async ({
    title,
    body,
    icon,
    tag,
    data,
    onClick,
    silent = false,      
    requireInteraction = false, 
    dedupeMs = 1500,    
  }) => {
    if (!('Notification' in window)) return null;
    if (Notification.permission !== 'granted') {
      const perm = await ensurePermission();
      if (perm !== 'granted') return null;
    }

    // Basic dedupe by tag (optional)
    if (tag) {
      const now = Date.now();
      const last = lastShownRef.current.get(tag) || 0;
      if (now - last < dedupeMs) return null;
      lastShownRef.current.set(tag, now);
    }

    try {
      const n = new Notification(title || 'New message', {
        body: body || '',
        icon: icon || '/favicon-192.png', 
        tag,
        silent,
        requireInteraction,
        data, 
      });

      n.onclick = () => {
        try {
          window.focus(); 
        } catch {}
        try {
          if (typeof onClick === 'function') onClick(n.data);
        } catch {}
        n.close();
      };

      if (!requireInteraction) {
        setTimeout(() => n.close(), 5000);
      }

      return n;
    } catch {
      return null;
    }
  }, [ensurePermission]);

  // Optional: ask for permission when the page becomes visible (first time)
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        // Don’t force prompt silently; you can also call ensurePermission() on a user gesture.
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return { ensurePermission, notify };
}