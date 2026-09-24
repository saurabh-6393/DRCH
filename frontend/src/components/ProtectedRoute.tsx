import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export default function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-300">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && user) {
    const hasRole = user.roles.some((r) => requiredRoles.includes(r));
    if (!hasRole) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-950 text-red-400">
          <p>Access denied. You do not have the required permissions.</p>
        </div>
      );
    }
  }

  return <>{children}</>;
}
