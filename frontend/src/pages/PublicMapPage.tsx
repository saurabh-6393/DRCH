import React, { useEffect, useState } from 'react';
import { getPublicVerifiedIncidents, PublicVerifiedIncident } from '../api/shelters';
import { MapboxMap } from '../components/MapboxMap';

export const PublicMapPage: React.FC = () => {
  const [incidents, setIncidents] = useState<PublicVerifiedIncident[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicIncidents();
  }, []);

  const fetchPublicIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPublicVerifiedIncidents();
      setIncidents(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load public verified incidents.');
    } finally {
      setLoading(false);
    }
  };

  const center = { lat: 12.9716, lng: 77.5946 };

  const filteredIncidents = selectedSeverity === 'ALL'
    ? incidents
    : incidents.filter((inc) => inc.severity === selectedSeverity);

  return (
    <div className="space-y-6">
      {/* Tactical Header */}
      <div className="hud-glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800/80 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/10 dark:bg-cyan-950/60 border border-cyan-500/30 dark:border-cyan-800/50 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping"></span>
              PUBLIC GIS RADAR &middot; PRIVACY-PRESERVING GEOSPATIAL FEED
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Public Verified Incident Map
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Displays officially verified disaster incident reports. Coordinates are rounded to 2 decimal places (~1.1km precision) for privacy. Reporter details and unverified reports are omitted.
            </p>
          </div>

          <button
            onClick={fetchPublicIncidents}
            className="self-start sm:self-center px-4 py-2 text-xs font-mono font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 dark:text-cyan-300 dark:border-slate-700/60 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Telemetry
          </button>
        </div>
      </div>

      {loading && (
        <div className="hud-glass-card rounded-2xl p-12 text-center text-slate-600 dark:text-slate-400 space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mx-auto"></div>
          <div className="font-mono text-xs text-cyan-600 dark:text-cyan-400 font-semibold">Loading public verified incidents...</div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/40 text-red-700 dark:text-red-200 rounded-xl text-xs flex items-center gap-3">
          <span className="text-red-600 dark:text-red-400 font-bold font-mono">ERROR:</span>
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Live Map Component */}
          <MapboxMap center={center} incidents={filteredIncidents} />

          {/* Incidents Telemetry & Filter Bar */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span>Verified Incidents ({incidents.length})</span>
                {selectedSeverity !== 'ALL' && (
                  <span className="text-xs text-cyan-600 dark:text-cyan-400 font-normal">
                    &middot; Filtered: {filteredIncidents.length}
                  </span>
                )}
              </h3>

              {/* Tactical Filter Chips */}
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSelectedSeverity(sev)}
                    className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      selectedSeverity === sev
                        ? 'bg-cyan-600 text-white border-cyan-700 font-bold shadow-xs'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 dark:bg-slate-900/60 dark:text-slate-400 dark:border-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {filteredIncidents.length === 0 ? (
              <div className="hud-glass-card rounded-2xl p-8 text-center border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium">
                No verified incident reports currently active.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="hud-glass-card rounded-xl p-4 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700/80 transition-all space-y-2.5 shadow-sm"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-tight">{inc.category}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider ${
                          inc.severity === 'CRITICAL'
                            ? 'bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/40'
                            : inc.severity === 'HIGH'
                            ? 'bg-orange-500/20 text-orange-600 dark:text-orange-300 border border-orange-500/40'
                            : inc.severity === 'MEDIUM'
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40'
                            : 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/40'
                        }`}
                      >
                        {inc.severity}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                      {inc.description}
                    </p>

                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800/80 flex justify-between items-center">
                      <span>Approx: {inc.location.lat.toFixed(2)}°N, {inc.location.lng.toFixed(2)}°E</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">VERIFIED</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
