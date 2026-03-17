// src/hooks/useTitleBadge.js
import { useCallback, useEffect, useRef, useState } from 'react';


export function useTitleBadge({ baseTitle = 'App', singular = 'New message', plural = 'New messages' } = {}) {
  const [count, setCount] = useState(0);
  const baseRef = useRef(document.title || baseTitle);

  useEffect(() => {
    if (count > 0) {
      const label = count === 1 ? singular : plural;
      document.title = `(${count}) ${label}`;
    } else {
      document.title = baseRef.current || baseTitle;
    }
  }, [count, baseTitle, singular, plural]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        setCount(0);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Public API
  const bump = useCallback((n = 1) => setCount((c) => Math.max(0, c + n)), []);
  const reset = useCallback(() => setCount(0), []);

  return { count, bump, reset, setCount };
}