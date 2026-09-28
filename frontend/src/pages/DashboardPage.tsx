import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BroadcastAlertModal from '../components/BroadcastAlertModal';

export default function DashboardPage() {
  const { user } = useAuth();
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  const canReview = Boolean(
    user?.roles?.some((r) => ['VOLUNTEER', 'NGO', 'AUTHORITY', 'ADMIN'].includes(r))
  );

  const isAuthority = Boolean(
    user?.roles?.some((r) => ['AUTHORITY', 'ADMIN'].includes(r))
  );

  return (
    <div className="space-y-8">
      {/* Broadcast Alert Modal for Authority */}
      {isAuthority && (
        <BroadcastAlertModal
          isOpen={isAlertModalOpen}
          onClose={() => setIsAlertModalOpen(false)}
        />
      )}

      {/* 1. Command Center Hero & System Status Banner */}
      <div className="hud-glass-card rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800/80 relative overflow-hidden shadow-md">
        {/* Subtle Background Glow Effect */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 dark:bg-cyan-950/60 border border-cyan-500/30 dark:border-cyan-800/50 text-[11px] font-mono text-cyan-700 dark:text-cyan-300 font-semibold">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
              NATIONAL EMERGENCY RESPONSE SYSTEM &middot; LEVEL 1 READY
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Disaster Response &amp; Coordination Hub
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Integrated Multi-Tier Incident Triage &middot; Multimodal AI Evidence Advisory &middot; PostGIS Spatial Shelter Routing &middot; Geofenced Emergency Broadcasts
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            {isAuthority && (
              <button
                type="button"
                onClick={() => setIsAlertModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-950/30 hover:scale-[1.02] active:scale-[0.98] transition-all border border-amber-400/40 cursor-pointer"
              >
                <span>📢</span>
                <span>ISSUE DISASTER ALERT</span>
              </button>
            )}
            <Link
              to="/report-incident"
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-red-950/40 hover:scale-[1.02] active:scale-[0.98] transition-all border border-red-500/30 cursor-pointer"
            >
              <svg className="w-5 h-5 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>REPORT EMERGENCY INCIDENT</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Operator Clearance & Credentials HUD */}
      <div className="hud-glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-500"></div>
            <h2 className="text-xs uppercase tracking-wider font-mono font-bold text-slate-800 dark:text-slate-300">
              Operator Credentials &amp; Session Telemetry
            </h2>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold">
            ENCRYPTED DISPATCH SESSION
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-3">
          <div className="space-y-1">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-mono tracking-wider font-semibold">Officer Name</span>
            <span className="text-slate-900 dark:text-slate-100 font-bold text-sm">{user?.displayName || 'Citizen Responder'}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-mono tracking-wider font-semibold">User Email</span>
            <span className="text-slate-900 dark:text-slate-200 font-mono text-[11px] font-medium">{user?.email}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-mono tracking-wider font-semibold">Clearance Roles</span>
            <span className="text-cyan-700 dark:text-cyan-400 font-mono font-bold">
              [{user?.roles?.join(', ')}]
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-mono tracking-wider font-semibold">Terminal ID</span>
            <span className="font-mono text-slate-700 dark:text-slate-400 text-[11px] truncate block" title={user?.id}>
              {user?.id}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Live Mission Telemetry HUD (4 Tactical Cards) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-800 dark:text-slate-300 flex items-center gap-2">
            <svg className="w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Operational Telemetry Overview
          </h2>
          <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 font-medium">Live PostGIS Feed</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Telemetry 1: Incident Reporting */}
          <div className="hud-glass-card rounded-2xl p-5 border-l-4 border-l-red-500 space-y-2 border border-slate-200 dark:border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-slate-600 dark:text-slate-400 font-semibold">Incident Triage</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-300 border border-red-500/30 font-bold">
                ACTIVE
              </span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">Stage 1-3</div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Photographic evidence + GPS with Gemini 2.5 Flash Advisory.
            </p>
          </div>

          {/* Telemetry 2: Shelter Network */}
          <div className="hud-glass-card rounded-2xl p-5 border-l-4 border-l-emerald-500 space-y-2 border border-slate-200 dark:border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-slate-600 dark:text-slate-400 font-semibold">Relief Shelters</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/30 font-bold">
                OPERATIONAL
              </span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">PostGIS GIS</div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Spherical distance calculation with live capacity monitoring.
            </p>
          </div>

          {/* Telemetry 3: AI Advisory */}
          <div className="hud-glass-card rounded-2xl p-5 border-l-4 border-l-amber-500 space-y-2 border border-slate-200 dark:border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-slate-600 dark:text-slate-400 font-semibold">AI Vision Engine</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 font-bold">
                ADVISORY
              </span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">Gemini 2.5</div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Triage priority tagging with automatic offline safety fallback.
            </p>
          </div>

          {/* Telemetry 4: Alerts Broadcast */}
          <div className="hud-glass-card rounded-2xl p-5 border-l-4 border-l-cyan-500 space-y-2 border border-slate-200 dark:border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-slate-600 dark:text-slate-400 font-semibold">Warning Broadcast</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 border border-cyan-500/30 font-bold">
                WEBPUSH &middot; WSS
              </span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">Geofenced</div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Dual-channel Socket.IO and Web Push hazard alert distribution.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Tactical Operational Services Matrix */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-800 dark:text-slate-300 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Operational Hub Services
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Report Incident */}
          <div className="hud-glass-card rounded-2xl p-6 flex flex-col justify-between hover:border-red-500/50 transition-all border border-slate-200 dark:border-slate-800/80 shadow-md group">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 group-hover:scale-105 transition-transform shadow-xs">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-red-500 transition-colors text-base">
                    Report Incident
                  </h3>
                  <span className="text-[11px] font-mono text-red-600 dark:text-red-400 font-semibold">Citizen SOS &amp; Triage</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Submit emergency disaster reports with photographic evidence (5 MB limit) and GPS coordinates. Triggers automated multimodal AI advisory analysis.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800/80">
              <Link
                to="/report-incident"
                className="inline-flex items-center justify-center w-full px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-md shadow-red-950/40 transition-all cursor-pointer"
              >
                Submit Incident Report &rarr;
              </Link>
            </div>
          </div>

          {/* Card 2: My Reports */}
          <div className="hud-glass-card rounded-2xl p-6 flex flex-col justify-between hover:border-cyan-500/50 transition-all border border-slate-200 dark:border-slate-800/80 shadow-md group">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform shadow-xs">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors text-base">
                    My Reports History
                  </h3>
                  <span className="text-[11px] font-mono text-cyan-700 dark:text-cyan-400 font-semibold">Citizen Dossier &amp; Timeline</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Track status updates, AI triage priority assignments, and dispatcher verification notes for all your submitted incidents in real time.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800/80">
              <Link
                to="/my-reports"
                className="inline-flex items-center justify-center w-full px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 dark:text-slate-200 dark:border-slate-700/60 transition-all cursor-pointer shadow-xs"
              >
                View Submitted Reports &rarr;
              </Link>
            </div>
          </div>

          {/* Card 3: Public Map */}
          <div className="hud-glass-card rounded-2xl p-6 flex flex-col justify-between hover:border-emerald-500/50 transition-all border border-slate-200 dark:border-slate-800/80 shadow-md group">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform shadow-xs">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-base">
                    Public Verified Map
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold">Tactical GIS ~1.1km Anonymized</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Inspect officially validated disaster hazards on the spatial map with privacy-preserving approximate coordinates (~1.1 km precision).
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800/80">
              <Link
                to="/public-map"
                className="inline-flex items-center justify-center w-full px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 dark:text-slate-200 dark:border-slate-700/60 transition-all cursor-pointer shadow-xs"
              >
                Open Spatial Map &rarr;
              </Link>
            </div>
          </div>

          {/* Card 4: Shelters */}
          <div className="hud-glass-card rounded-2xl p-6 flex flex-col justify-between hover:border-amber-500/50 transition-all border border-slate-200 dark:border-slate-800/80 shadow-md group">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform shadow-xs">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors text-base">
                    Shelter Proximity Search
                  </h3>
                  <span className="text-[11px] font-mono text-amber-700 dark:text-amber-400 font-semibold">Spherical Radius Routing</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Query operational emergency shelters by radius with PostGIS spherical calculations and live available capacity indicators.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800/80">
              <Link
                to="/shelters"
                className="inline-flex items-center justify-center w-full px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 dark:text-slate-200 dark:border-slate-700/60 transition-all cursor-pointer shadow-xs"
              >
                Search Nearby Shelters &rarr;
              </Link>
            </div>
          </div>

          {/* Card 5: Review Queue (Role-Restricted Dispatcher Terminal) */}
          {canReview && (
            <div className="hud-glass-card rounded-2xl p-6 flex flex-col justify-between border-amber-500/30 hover:border-amber-500/70 transition-all md:col-span-2 group border shadow-md">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform shadow-xs">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors text-base">
                        Verification Backlog Queue
                      </h3>
                      <span className="text-[11px] font-mono text-amber-700 dark:text-amber-400 font-semibold">Stage 2 &amp; Stage 3 Human Gate</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono uppercase px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold">
                    DISPATCHER CLEARANCE ACTIVE
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Review pending citizen disaster reports, inspect Gemini multimodal vision advisory flags, and commit Stage 2 volunteer recommendations or Stage 3 authority verification sign-offs.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800/80">
                <Link
                  to="/verifications/queue"
                  className="inline-flex items-center justify-center w-full px-5 py-3 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 hover:from-amber-500 hover:to-yellow-500 text-slate-950 shadow-md shadow-amber-950/40 transition-all cursor-pointer"
                >
                  Enter Verification Backlog Queue &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
