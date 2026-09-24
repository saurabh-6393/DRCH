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
      <div className="border-b border-gray-800 pb-4">
        <h2 className="text-2xl font-bold text-gray-100">Shelter Proximity Search</h2>
        <p className="text-xs text-gray-400">
          Find operational shelters sorted by PostGIS meter distance (Default radius: 50,000m / 50km)
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-900/50 border border-red-500 text-red-200 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSearch} className="p-4 bg-gray-900 border border-gray-800 rounded-lg space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-gray-300">Latitude</label>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                className="text-[10px] text-blue-400 underline hover:text-blue-300"
              >
                My Location
              </button>
            </div>
            <input
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded text-sm text-gray-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Longitude</label>
            <input
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded text-sm text-gray-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Radius (Meters)</label>
            <select
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded text-sm text-gray-200"
            >
              <option value={10000}>10,000m (10km)</option>
              <option value={25000}>25,000m (25km)</option>
              <option value={50000}>50,000m (50km - Default)</option>
              <option value={100000}>100,000m (100km)</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 font-medium text-white text-sm rounded shadow disabled:opacity-50"
        >
          {loading ? 'Searching PostGIS Shelters...' : 'Search Nearby Operational Shelters'}
        </button>
      </form>

      {/* Map rendering with plain-text fallback */}
      <MapboxMap center={currentCenter} shelters={shelters} />

      {searched && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-gray-200">
            Operational Shelters Found ({shelters.length})
          </h3>

          {shelters.length === 0 ? (
            <div className="text-center py-6 bg-gray-900 border border-gray-800 rounded text-gray-400 text-sm">
              No open operational shelters found within specified radius.
            </div>
          ) : (
            <div className="grid gap-3">
              {shelters.map((s) => (
                <div key={s.id} className="p-4 bg-gray-900 border border-gray-800 rounded-lg flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-gray-100">{s.name}</h4>
                    <p className="text-xs text-gray-400">
                      Coordinates: {s.location.lat.toFixed(4)}, {s.location.lng.toFixed(4)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Capacity: <span className="text-emerald-400 font-semibold">{s.availableCapacity}</span> / {s.capacity} seats open
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono font-bold text-blue-400">
                      {(s.distanceMeters / 1000).toFixed(1)} km
                    </span>
                    <span className="block text-[10px] text-gray-500">Straight-line distance</span>
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
