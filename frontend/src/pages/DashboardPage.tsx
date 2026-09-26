import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const canReview = Boolean(
    user?.roles?.some((r) => ['VOLUNTEER', 'NGO', 'AUTHORITY', 'ADMIN'].includes(r))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Disaster Response Coordination Hub
        </h1>
        <p className="text-gray-400 mt-1">
          Active Operations &middot; Incident Reporting, Spatial Mapping & Emergency Shelter Triage
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-3 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800/80 pb-3">
          <h2 className="text-lg font-semibold text-gray-200">Operator Profile</h2>
          <span className="text-xs px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 font-medium">
            Session Active
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-1">
          <div>
            <span className="text-gray-500 block text-xs uppercase tracking-wider">Display Name</span>
            <span className="text-gray-200 font-medium">{user?.displayName || '—'}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs uppercase tracking-wider">Email Address</span>
            <span className="text-gray-200 font-medium">{user?.email}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs uppercase tracking-wider">Assigned Roles</span>
            <span className="text-emerald-400 font-mono font-medium">
              {user?.roles?.join(', ')}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs uppercase tracking-wider">User ID</span>
            <span className="font-mono text-gray-400 text-xs break-all">{user?.id}</span>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200 mb-4">Operational Hub Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Report Incident */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col justify-between hover:border-gray-700/80 transition-all shadow-md group">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-lg">
                  🚨
                </span>
                <h3 className="font-semibold text-gray-100 group-hover:text-red-400 transition-colors">
                  Report Incident
                </h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Submit emergency reports with photographic evidence and GPS coordinates. Trigger automated multimodal AI advisory analysis.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800/80">
              <Link
                to="/report-incident"
                className="inline-flex items-center justify-center w-full px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors"
              >
                Submit Incident Report &rarr;
              </Link>
            </div>
          </div>

          {/* Card 2: My Reports */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col justify-between hover:border-gray-700/80 transition-all shadow-md group">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-lg">
                  📋
                </span>
                <h3 className="font-semibold text-gray-100 group-hover:text-blue-400 transition-colors">
                  My Reports History
                </h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Track status updates, AI triage priority assignments, and dispatcher verification notes for all your submitted incidents.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800/80">
              <Link
                to="/my-reports"
                className="inline-flex items-center justify-center w-full px-4 py-2 text-xs font-semibold rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition-colors"
              >
                View Submitted Reports &rarr;
              </Link>
            </div>
          </div>

          {/* Card 3: Public Map */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col justify-between hover:border-gray-700/80 transition-all shadow-md group">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-lg">
                  🗺️
                </span>
                <h3 className="font-semibold text-gray-100 group-hover:text-emerald-400 transition-colors">
                  Public Verified Map
                </h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Inspect officially validated disaster hazards on the spatial map with privacy-preserving approximate coordinates (~1.1 km).
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800/80">
              <Link
                to="/public-map"
                className="inline-flex items-center justify-center w-full px-4 py-2 text-xs font-semibold rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition-colors"
              >
                Open Spatial Map &rarr;
              </Link>
            </div>
          </div>

          {/* Card 4: Shelters */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col justify-between hover:border-gray-700/80 transition-all shadow-md group">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-lg">
                  🏠
                </span>
                <h3 className="font-semibold text-gray-100 group-hover:text-amber-400 transition-colors">
                  Shelter Proximity Search
                </h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Query operational emergency shelters by radius with PostGIS spherical calculations and live available capacity indicators.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800/80">
              <Link
                to="/shelters"
                className="inline-flex items-center justify-center w-full px-4 py-2 text-xs font-semibold rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition-colors"
              >
                Search Nearby Shelters &rarr;
              </Link>
            </div>
          </div>

          {/* Card 5: Review Queue (Role-Restricted) */}
          {canReview && (
            <div className="bg-gray-900 border border-indigo-500/30 rounded-2xl p-6 flex flex-col justify-between hover:border-indigo-500/60 transition-all shadow-md md:col-span-2 group">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-lg">
                      🛡️
                    </span>
                    <h3 className="font-semibold text-gray-100 group-hover:text-indigo-400 transition-colors">
                      Verification Backlog Queue
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Dispatcher Authorization Active
                  </span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Review pending citizen disaster reports, evaluate AI multimodal vision advisory flags, and submit Stage 2 volunteer recommendations or Stage 3 authority verification decisions.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-800/80">
                <Link
                  to="/verifications/queue"
                  className="inline-flex items-center justify-center w-full px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
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
