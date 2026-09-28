import React, { useState } from 'react';
import { getSheltersProximity, Shelter } from '../../api/shelters';
import { MapboxMap } from '../../components/MapboxMap';

export const ShelterSearch: React.FC = () => {
  const [latitude, setLatitude] = useState('12.9716');
  const [longitude, setLongitude] = useState('77.5946');
  const [radiusMeters, setRadiusMeters] = useState(50000); // Default 50,000 meters / 50km

  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setError(null);
      },
      () => {
        setError('Unable to retrieve current location.');
      }
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError('Latitude must be a valid number between -90 and 90.');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError('Longitude must be a valid number between -180 and 180.');
      return;
    }

    setLoading(true);
    try {
      const data = await getSheltersProximity(lat, lng, radiusMeters);
      setShelters(data);
      setSearched(true);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to search nearby shelters.');
    } finally {
      setLoading(false);
    }
  };

  const currentCenter = {
    lat: parseFloat(latitude) || 12.9716,
    lng: parseFloat(longitude) || 77.5946,
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--color-border)] pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Shelter Proximity Search
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Real-time geospatial query &bull; PostGIS spatial meter radius &bull; Operational Evacuation Centres
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>POSTGIS ACTIVE</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSearch} className="p-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl space-y-4 transition-colors">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Latitude</label>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                className="text-xs text-blue-500 underline hover:opacity-80"
              >
                📡 My GPS
              </button>
            </div>
            <input
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              className="w-full px-4 py-2.5 font-mono bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Longitude</label>
            <input
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              className="w-full px-4 py-2.5 font-mono bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Radius (Search Distance)</label>
            <select
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(parseInt(e.target.value, 10))}
              className="w-full px-4 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value={10000} className="bg-[var(--color-surface)] text-[var(--color-text)]">10,000m (10 km)</option>
              <option value={25000} className="bg-[var(--color-surface)] text-[var(--color-text)]">25,000m (25 km)</option>
              <option value={50000} className="bg-[var(--color-surface)] text-[var(--color-text)]">50,000m (50 km - Standard)</option>
              <option value={100000} className="bg-[var(--color-surface)] text-[var(--color-text)]">100,000m (100 km - Regional)</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-bold text-white text-sm rounded-xl shadow-lg shadow-blue-900/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>Searching PostGIS Shelters...</span>
            </>
          ) : (
            <>
              <span>🔍</span>
              <span>Search Nearby Operational Shelters</span>
            </>
          )}
        </button>
      </form>

      {/* Map rendering with plain-text fallback */}
      <MapboxMap center={currentCenter} shelters={shelters} />

      {searched && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[var(--color-text)]">
              Operational Shelters Found ({shelters.length})
            </h3>
            <span className="text-xs font-mono text-[var(--color-text-muted)]">
              Radius: {(radiusMeters / 1000).toFixed(0)} km
            </span>
          </div>

          {shelters.length === 0 ? (
            <div className="text-center py-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl text-[var(--color-text-muted)] text-sm">
              No open operational shelters found within specified radius.
            </div>
          ) : (
            <div className="grid gap-3">
              {shelters.map((s) => (
                <div key={s.id} className="p-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow flex justify-between items-center transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                        OPEN
                      </span>
                      <h4 className="font-bold text-[var(--color-text)] text-base">{s.name}</h4>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] font-mono">
                      Coordinates: {s.location.lat.toFixed(4)}°N, {s.location.lng.toFixed(4)}°E
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Available Capacity: <span className="text-emerald-500 font-bold text-sm">{s.availableCapacity}</span> / {s.capacity} seats open
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-mono font-bold text-blue-500 block">
                      {(s.distanceMeters / 1000).toFixed(1)} km
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Distance</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
