import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useEffect, useRef, useState } from 'react';

/**
 * Protects children by permission (resource, action).
 * If user lacks permission, redirects to /access-denied.
 */
export default function RequirePermission({ resource, action, children }) {
  const { can, isAuthenticated, refreshPermissions } = useAuth();
  const [checking, setChecking] = useState(false);
  const attemptedRef = useRef(false);

  const allowed = isAuthenticated && can(resource, action);

  useEffect(() => {
    // If user is logged in but permission check fails, attempt one refresh
    // to avoid stale cached permissions after role updates.
    if (!isAuthenticated) return;
    if (allowed) return;
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    setChecking(true);
    Promise.resolve(refreshPermissions?.())
      .finally(() => setChecking(false));
  }, [isAuthenticated, allowed, refreshPermissions]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (checking) return null; // brief silent refresh to avoid flicker/redirect loops
  if (!can(resource, action)) return <Navigate to="/access-denied" replace />;
  return children;
}
