// src/components/auth/RequirePasswordUpdate.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RequirePasswordUpdate({ children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const mustChange = !!user?.needsPasswordChange;

  // Allow the change password page to render
  if (location.pathname.startsWith('/employee/change-password')) return children;

  // If must change, redirect there
  if (isAuthenticated && mustChange) {
    return <Navigate to="/employee/change-password" replace />;
  }
  return children;
}