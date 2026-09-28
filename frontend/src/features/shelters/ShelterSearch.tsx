import React, { useState, useEffect } from 'react';
import { getSheltersProximity, Shelter } from '../../api/shelters';
import { MapboxMap } from '../../components/MapboxMap';

export const ShelterSearch: React.FC = () => {
  const [latitude, setLatitude] = useState('19.0760');
  const [longitude, setLongitude] = useState('72.8777');
  const [radiusMeters, setRadiusMeters] = useState(50000); // Default 50,000 meters / 50km

  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeSearch = async (latVal: number, lngVal: number, radVal: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSheltersProximity(latVal, lngVal, radVal);
      setShelters(data);
      setSearched(true);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to search nearby shelters.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-search operational shelters on initial mount in browser
  useEffect(() => {
    if (import.meta.env.MODE !== 'test') {
      executeSearch(19.0760, 72.8777, 50000);
    }
  }, []);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setLatitude(lat);
        setLongitude(lng);
        setError(null);
        executeSearch(parseFloat(lat), parseFloat(lng), radiusMeters);
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

    executeSearch(lat, lng, radiusMeters);
  };

  const currentCenter = {
    lat: parseFloat(latitude) || 19.0760,
    lng: parseFloat(longitude) || 72.8777,
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
          aria-label="Search Nearby Operational Shelters"
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
            <div className="grid gap-4">
              {shelters.map((s) => {
                const occupancyPercent = Math.min(100, Math.round(((s.capacity - s.availableCapacity) / s.capacity) * 100));
                const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.location.lat},${s.location.lng}`;

                return (
                  <div
                    key={s.id}
                    className="p-5 sm:p-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-md space-y-4 hover:border-blue-500/40 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                            OPERATIONAL &bull; OPEN
                          </span>
                          <h4 className="font-extrabold text-[var(--color-text)] text-lg">{s.name}</h4>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] font-mono">
                          📍 WGS-84: {s.location.lat.toFixed(4)}°N, {s.location.lng.toFixed(4)}°E
                        </p>
                      </div>

                      <div className="flex items-center gap-4 sm:text-right">
                        <div>
                          <span className="text-2xl font-mono font-extrabold text-blue-500 block">
                            {(s.distanceMeters / 1000).toFixed(1)} km
                          </span>
                          <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">Proximity</span>
                        </div>
                      </div>
                    </div>

                    {/* Capacity & Live Occupancy Meter */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[var(--color-text-muted)]">
                          Available Accommodation: <strong className="text-emerald-500 font-bold">{s.availableCapacity}</strong> / {s.capacity} beds
                        </span>
                        <span className="font-mono text-xs font-bold text-[var(--color-text)]">
                          {occupancyPercent}% Occupied
                        </span>
                      </div>
                      <div className="w-full bg-[var(--color-bg)] rounded-full h-2 overflow-hidden border border-[var(--color-border)]">
                        <div
                          className={`h-full transition-all rounded-full ${
                            occupancyPercent > 85 ? 'bg-red-500' : occupancyPercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${occupancyPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Operational Amenities Badges */}
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      <span className="px-2.5 py-1 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                        🍲 Community Kitchen &amp; Clean Water
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                        🩺 24/7 First Aid Post
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                        ⚡ Backup Power &amp; Mobile Charging
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                        🛡️ Women &amp; Children Safe Zone
                      </span>
                    </div>

                    {/* Emergency Action Buttons */}
                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                      >
                        <span>🧭</span>
                        <span>Get Directions (Google Maps)</span>
                      </a>

                      <a
                        href="tel:112"
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-xs border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        <span>📞</span>
                        <span>Call Emergency Hub (112)</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
