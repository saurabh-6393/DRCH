import React, { useEffect, useState } from 'react';
import { getPublicVerifiedIncidents, PublicVerifiedIncident } from '../api/shelters';
import { MapboxMap } from '../components/MapboxMap';

export const PublicMapPage: React.FC = () => {
  const [incidents, setIncidents] = useState<PublicVerifiedIncident[]>([]);
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
      <div className="border-b border-gray-800 pb-4">
        <h2 className="text-2xl font-bold text-gray-100">Public Verified Incident Map</h2>
        <p className="text-xs text-gray-400">
          Displays officially verified disaster incident reports. Coordinates are rounded to 2 decimal places (~1.1km precision) for privacy. Reporter details and unverified reports are omitted.
        </p>
      </div>

      {loading && <div className="text-center py-8 text-gray-400">Loading public verified incidents...</div>}

      {error && (
        <div className="p-4 bg-red-900/50 border border-red-500 text-red-200 rounded">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <MapboxMap center={center} incidents={incidents} />

          <div className="space-y-3">
            <h3 className="text-lg font-bold text-gray-200">
              Verified Incidents ({incidents.length})
            </h3>

            {incidents.length === 0 ? (
              <div className="text-center py-6 bg-gray-900 border border-gray-800 rounded text-gray-400 text-sm">
                No verified incident reports currently active.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {incidents.map((inc) => (
                  <div key={inc.id} className="p-4 bg-gray-900 border border-gray-800 rounded-lg space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-gray-100">{inc.category}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          inc.severity === 'CRITICAL'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                            : inc.severity === 'HIGH'
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                        }`}
                      >
                        {inc.severity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300">{inc.description}</p>
                    <div className="text-[10px] text-gray-500 pt-2 border-t border-gray-800 flex justify-between">
                      <span>Approx. Location: {inc.location.lat.toFixed(2)}, {inc.location.lng.toFixed(2)}</span>
                      <span>Verified</span>
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
