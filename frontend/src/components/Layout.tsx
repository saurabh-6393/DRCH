import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationPrompt from './NotificationPrompt';
import DisasterAlertBanner from './DisasterAlertBanner';

export default function Layout() {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const canReview = Boolean(
    user?.roles?.some((r) => ['VOLUNTEER', 'NGO', 'AUTHORITY', 'ADMIN'].includes(r))
  );

  const closeMenu = () => setIsMobileMenuOpen(false);

  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDark ? 'bg-[#070B12] text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* 1. National Emergency & Helpline Ticker Ribbon */}
      <div
        className={`border-b text-xs px-4 py-2 flex flex-wrap items-center justify-between gap-3 transition-colors ${
          isDark
            ? 'bg-[#0B132B] border-cyan-900/40 text-slate-300'
            : 'bg-white border-slate-200 text-slate-800 shadow-xs'
        }`}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded font-bold tracking-wider uppercase text-[10px] border ${
              isDark
                ? 'bg-red-500/20 text-red-300 border-red-500/30'
                : 'bg-red-600 text-white border-red-700 shadow-xs'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
            24x7 Helplines
          </span>
          <span className={`font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Emergency Line:{' '}
            <strong className={isDark ? 'text-white hover:text-cyan-300' : 'text-slate-900 font-extrabold'}>
              112
            </strong>
          </span>
          <span className={`${isDark ? 'text-slate-600' : 'text-slate-300'} hidden sm:inline`}>&middot;</span>
          <span className={`font-mono hidden sm:inline ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Incident Desk:{' '}
            <strong className={isDark ? 'text-white hover:text-cyan-300' : 'text-slate-900 font-extrabold'}>
              1800-DRCH-OPS
            </strong>
          </span>
          <span className={`${isDark ? 'text-slate-600' : 'text-slate-300'} hidden md:inline`}>&middot;</span>
          <span className={`font-mono hidden md:inline ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            EOC Control:{' '}
            <strong className={isDark ? 'text-white hover:text-cyan-300' : 'text-slate-900 font-extrabold'}>
              011-2000-EOC
            </strong>
          </span>
        </div>

        {/* Real-Time Dispatch Telemetry Status */}
        <div className="flex items-center gap-2 text-[11px] font-mono ml-auto">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span
            className={`tracking-wide font-bold ${
              isDark ? 'text-emerald-400' : 'text-emerald-700'
            }`}
          >
            DISPATCH FEED ACTIVE
          </span>
        </div>
      </div>

      {/* 2. Main Institutional Command Header */}
      <header
        className={`border-b sticky top-0 z-50 backdrop-blur-md transition-colors ${
          isDark
            ? 'border-slate-800/80 bg-[#0D1424]/90'
            : 'border-slate-200 bg-white/95 shadow-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Logo & Platform Emblem */}
          <Link
            to="/"
            onClick={closeMenu}
            className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded-lg p-1"
          >
            {/* Tactical Shield Emblem */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
              <div
                className={`w-full h-full rounded-[10px] flex items-center justify-center ${
                  isDark ? 'bg-[#090E1A]' : 'bg-white'
                }`}
              >
                <svg
                  className="w-5 h-5 text-cyan-500 group-hover:scale-110 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
            </div>

            <div>
              <div
                className={`text-xl font-extrabold tracking-tight ${
                  isDark
                    ? 'bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent'
                    : 'text-slate-900'
                }`}
              >
                DRCH
              </div>
              <div
                className={`text-[10px] uppercase tracking-widest font-mono -mt-1 hidden sm:block ${
                  isDark ? 'text-slate-400' : 'text-slate-600 font-semibold'
                }`}
              >
                Disaster Relief &amp; Coordination Hub
              </div>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-3">
            <Link
              to="/public-map"
              className={`text-xs font-semibold px-3 py-2 rounded-lg transition-all border ${
                isDark
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/60 border-transparent hover:border-slate-700/50'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 border-transparent hover:border-slate-300'
              }`}
            >
              Public Map
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to="/report-incident"
                  className="text-xs font-semibold px-3 py-2 rounded-lg text-red-100 bg-red-600 hover:bg-red-700 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                  Report Incident
                </Link>

                <Link
                  to="/my-reports"
                  className={`text-xs font-semibold px-3 py-2 rounded-lg transition-all border ${
                    isDark
                      ? 'text-slate-300 hover:text-white hover:bg-slate-800/60 border-transparent hover:border-slate-700/50'
                      : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 border-transparent hover:border-slate-300'
                  }`}
                >
                  My Reports
                </Link>

                {canReview && (
                  <Link
                    to="/verifications/queue"
                    className={`text-xs font-semibold px-3 py-2 rounded-lg transition-all ${
                      isDark
                        ? 'text-amber-300 hover:text-amber-200 bg-amber-950/30 hover:bg-amber-900/40 border border-amber-800/40'
                        : 'text-amber-800 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300'
                    }`}
                  >
                    Review Queue
                  </Link>
                )}

                <Link
                  to="/shelters"
                  className={`text-xs font-semibold px-3 py-2 rounded-lg transition-all border ${
                    isDark
                      ? 'text-slate-300 hover:text-white hover:bg-slate-800/60 border-transparent hover:border-slate-700/50'
                      : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 border-transparent hover:border-slate-300'
                  }`}
                >
                  Shelters
                </Link>

                {/* Operator Profile Tag */}
                <div
                  className={`flex items-center gap-2 pl-3 border-l ${
                    isDark ? 'border-slate-800' : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col text-right">
                    <span
                      className={`text-xs font-medium truncate max-w-[140px] ${
                        isDark ? 'text-slate-200' : 'text-slate-900 font-bold'
                      }`}
                    >
                      {user?.displayName || user?.email}
                    </span>
                    <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono tracking-tight font-semibold">
                      [{user?.roles?.join(', ')}]
                    </span>
                  </div>

                  <button
                    onClick={logout}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      isDark
                        ? 'bg-slate-800/80 hover:bg-red-900/40 hover:text-red-200 hover:border-red-700/50 border-slate-700/60 text-slate-300'
                        : 'bg-slate-100 hover:bg-red-50 hover:text-red-700 hover:border-red-300 border-slate-300 text-slate-700'
                    }`}
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div
                className={`flex items-center gap-2 pl-3 border-l ${
                  isDark ? 'border-slate-800' : 'border-slate-200'
                }`}
              >
                <Link
                  to="/login"
                  className={`text-xs font-semibold px-3 py-2 rounded-lg transition-all ${
                    isDark
                      ? 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                  }`}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-bold px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Light / Dark Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono ml-1 ${
                isDark
                  ? 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800 shadow-xs'
              }`}
              title={
                isDark
                  ? 'Switch to Daylight Field Mode (Light Theme)'
                  : 'Switch to Tactical Night Mode (Dark Theme)'
              }
              aria-label="Toggle theme mode"
            >
              {isDark ? (
                <>
                  <span className="text-amber-400 text-sm">☀️</span>
                  <span className="hidden xl:inline text-[10px] font-bold text-amber-300">DAY</span>
                </>
              ) : (
                <>
                  <span className="text-slate-700 text-sm">🌙</span>
                  <span className="hidden xl:inline text-[10px] font-bold text-slate-700">NIGHT</span>
                </>
              )}
            </button>
          </nav>

          {/* Mobile Right Controls */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg border transition-colors ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-300'
                  : 'bg-slate-100 border-slate-300 text-slate-800'
              }`}
              aria-label="Toggle theme mode mobile"
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              type="button"
              className={`p-2 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                  : 'bg-slate-100 border-slate-300 text-slate-800 hover:text-slate-950'
              }`}
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

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className={`md:hidden border-b px-4 py-3 space-y-3 transition-colors ${
              isDark ? 'bg-[#0B132B] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-900 shadow-lg'
            }`}
          >
            {isAuthenticated && user && (
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold">{user.displayName || user.email}</div>
                  <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">
                    [{user.roles.join(', ')}]
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col space-y-1">
              <Link
                to="/public-map"
                onClick={closeMenu}
                className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                  isDark ? 'text-slate-200 hover:bg-slate-800/60' : 'text-slate-800 hover:bg-slate-100'
                }`}
              >
                Public Map
              </Link>

              {isAuthenticated ? (
                <>
                  <Link
                    to="/report-incident"
                    onClick={closeMenu}
                    className="text-sm font-semibold px-3 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    Report Incident
                  </Link>

                  <Link
                    to="/my-reports"
                    onClick={closeMenu}
                    className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                      isDark ? 'text-slate-200 hover:bg-slate-800/60' : 'text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    My Reports
                  </Link>

                  {canReview && (
                    <Link
                      to="/verifications/queue"
                      onClick={closeMenu}
                      className={`text-sm font-semibold px-3 py-2 rounded-lg transition-colors ${
                        isDark ? 'text-amber-300 hover:bg-amber-950/40' : 'text-amber-800 hover:bg-amber-100'
                      }`}
                    >
                      Review Queue
                    </Link>
                  )}

                  <Link
                    to="/shelters"
                    onClick={closeMenu}
                    className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                      isDark ? 'text-slate-200 hover:bg-slate-800/60' : 'text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    Shelters
                  </Link>

                  <div className={`pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <button
                      onClick={() => {
                        closeMenu();
                        logout();
                      }}
                      className="w-full text-left text-sm font-semibold px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={closeMenu}
                    className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                      isDark ? 'text-slate-300 hover:bg-slate-800/60' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={closeMenu}
                    className="text-sm font-semibold px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      {/* 3. Main Operational Content Surface */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <DisasterAlertBanner />
        <NotificationPrompt />
        <Outlet />
      </main>

      {/* 4. Persistent SOS Emergency Quick Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Link
          to="/report-incident"
          className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-red-600 hover:bg-red-700 !text-white font-bold text-xs sm:text-sm shadow-2xl shadow-red-950/60 border border-red-400 hover:scale-105 active:scale-95 transition-all group"
          title="Instantly Report an Emergency Incident"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <span className="tracking-wider uppercase font-mono !text-white">🚨 SOS Report</span>
        </Link>
      </div>

      {/* 5. Institutional GovTech Footer */}
      <footer
        className={`border-t text-xs py-6 mt-auto transition-colors ${
          isDark
            ? 'border-slate-800/60 bg-[#060910] text-slate-400'
            : 'border-slate-200 bg-white text-slate-600 shadow-xs'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className={isDark ? 'text-slate-300' : 'text-slate-800 font-medium'}>
              Disaster Response &amp; Coordination Hub (DRCH) &middot; National GIS Emergency Operations
            </span>
          </div>
          <div className={`font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Emergency Dispatch System &middot; Encrypted Session Active
          </div>
        </div>
      </footer>
    </div>
  );
}
