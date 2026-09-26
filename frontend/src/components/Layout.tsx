import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationPrompt from './NotificationPrompt';

export default function Layout() {
  const { isAuthenticated, user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const canReview = Boolean(
    user?.roles?.some((r) => ['VOLUNTEER', 'NGO', 'AUTHORITY', 'ADMIN'].includes(r))
  );

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            to="/"
            onClick={closeMenu}
            className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent"
          >
            DRCH
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
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
                {canReview && (
                  <Link to="/verifications/queue" className="text-sm text-gray-300 hover:text-white transition-colors">
                    Review Queue
                  </Link>
                )}
                <Link to="/shelters" className="text-sm text-gray-300 hover:text-white transition-colors">
                  Shelters
                </Link>
                <span className="text-sm text-gray-400">
                  {user?.email}
                  <span className="ml-2 text-xs text-emerald-400/80 font-mono">
                    [{user?.roles?.join(', ')}]
                  </span>
                </span>
                <button
                  onClick={logout}
                  className="text-sm px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-300 cursor-pointer"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">Login</Link>
                <Link to="/register" className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors text-white font-medium">Register</Link>
              </>
            )}
          </nav>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              type="button"
              className="p-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-300 hover:text-white hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="md:hidden border-t border-gray-800/80 bg-gray-950/95 px-4 py-4 space-y-3 shadow-xl"
          >
            {isAuthenticated && (
              <div className="pb-3 border-b border-gray-800/60 text-xs text-gray-400 flex flex-col gap-1">
                <span className="text-gray-200 font-medium truncate">{user?.email}</span>
                <span className="text-emerald-400/90 font-mono">[{user?.roles?.join(', ')}]</span>
              </div>
            )}

            <div className="flex flex-col space-y-2">
              <Link
                to="/public-map"
                onClick={closeMenu}
                className="text-sm px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-900 transition-colors"
              >
                Public Map
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/report-incident"
                    onClick={closeMenu}
                    className="text-sm px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-900 transition-colors"
                  >
                    Report Incident
                  </Link>
                  <Link
                    to="/my-reports"
                    onClick={closeMenu}
                    className="text-sm px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-900 transition-colors"
                  >
                    My Reports
                  </Link>
                  {canReview && (
                    <Link
                      to="/verifications/queue"
                      onClick={closeMenu}
                      className="text-sm px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-900 transition-colors"
                    >
                      Review Queue
                    </Link>
                  )}
                  <Link
                    to="/shelters"
                    onClick={closeMenu}
                    className="text-sm px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-900 transition-colors"
                  >
                    Shelters
                  </Link>
                  <button
                    onClick={() => {
                      closeMenu();
                      logout();
                    }}
                    className="text-left text-sm px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-gray-900 transition-colors cursor-pointer"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={closeMenu}
                    className="text-sm px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-900 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={closeMenu}
                    className="text-sm px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors text-center"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full">
        <NotificationPrompt />
        <Outlet />
      </main>
    </div>
  );
}
