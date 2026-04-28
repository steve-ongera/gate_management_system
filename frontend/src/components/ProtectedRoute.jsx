// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Wrap any route that requires authentication.
 * Unauthenticated users are redirected to /login, with the
 * originally requested path stored in location.state so
 * Login.jsx can send them there after a successful sign-in.
 *
 * Usage in your router:
 *   <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>} >
 *     <Route index element={<Dashboard />} />
 *     ...
 *   </Route>
 */
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // While we're still verifying the stored token, show nothing (avoids flash)
  if (loading) {
    return (
      <div className="loading-center">
        <span className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Optional role-gating: pass roles={['admin']} to restrict a route
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}