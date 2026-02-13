import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Protects children by permission (resource, action).
 * If user lacks permission, redirects to /access-denied.
 */
export default function RequirePermission({ resource, action, children }) {
  const { can, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!can(resource, action)) return <Navigate to="/access-denied" replace />;
  return children;
}
