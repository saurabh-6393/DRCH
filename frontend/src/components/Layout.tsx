import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            DRCH
          </Link>

          <nav className="flex items-center gap-4">
            <Link to="/public-map" className="text-sm text-gray-300 hover:text-white transition-colors">
              Public Map
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/report-incident" className="text-sm text-gray-300 hover:text-white transition-colors">
                  Report Incident
                </Link>
                <Link to="/my-reports" className="text-sm text-gray-300 hover:text-white transition-colors">
                  My Reports
                </Link>
                <Link to="/verifications/queue" className="text-sm text-gray-300 hover:text-white transition-colors">
                  Review Queue
                </Link>
                <Link to="/shelters" className="text-sm text-gray-300 hover:text-white transition-colors">
                  Shelters
                </Link>
                <span className="text-sm text-gray-400">
                  {user?.email}
                  <span className="ml-2 text-xs text-emerald-400/80 font-mono">
                    [{user?.roles.join(', ')}]
                  </span>
                </span>
                <button
                  onClick={logout}
                  className="text-sm px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-300"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">Login</Link>
                <Link to="/register" className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors">Register</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
