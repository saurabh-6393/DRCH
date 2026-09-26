import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { PublicVerifiedIncident, Shelter } from '../api/shelters';

interface MapboxMapProps {
  center: { lat: number; lng: number };
  incidents?: PublicVerifiedIncident[];
  shelters?: Shelter[];
}

export const MapboxMap: React.FC<MapboxMapProps> = ({ center, incidents = [], shelters = [] }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapError, setMapError] = useState<boolean>(false);

  const rawToken = import.meta.env.VITE_MAPBOX_TOKEN;
  const isTokenConfigured = Boolean(
    rawToken &&
    typeof rawToken === 'string' &&
    rawToken.trim() !== '' &&
    !rawToken.includes('placeholder') &&
    rawToken.startsWith('pk.')
  );

  useEffect(() => {
    if (!isTokenConfigured) {
      return;
    }

    if (!mapContainer.current) return;

    try {
      mapboxgl.accessToken = rawToken;
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [center.lng, center.lat],
        zoom: 11,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('error', () => {
        setMapError(true);
      });

      // Add markers for verified incidents
      incidents.forEach((inc) => {
        const el = document.createElement('div');
        el.className = 'w-4 h-4 rounded-full border-2 border-white shadow';
        el.style.backgroundColor =
          inc.severity === 'CRITICAL'
            ? '#ef4444'
            : inc.severity === 'HIGH'
            ? '#f97316'
            : inc.severity === 'MEDIUM'
            ? '#eab308'
            : '#3b82f6';

        new mapboxgl.Marker(el)
          .setLngLat([inc.location.lng, inc.location.lat])
          .setPopup(
            new mapboxgl.Popup().setHTML(
              `<strong>${inc.category}</strong> (${inc.severity})<br/>${inc.description}`
            )
          )
          .addTo(map.current!);
      });

      // Add markers for shelters
      shelters.forEach((shelter) => {
        const el = document.createElement('div');
        el.className = 'w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow flex items-center justify-center text-[10px] font-bold text-white';
        el.innerText = 'S';

        new mapboxgl.Marker(el)
          .setLngLat([shelter.location.lng, shelter.location.lat])
          .setPopup(
            new mapboxgl.Popup().setHTML(
              `<strong>${shelter.name}</strong><br/>Capacity: ${shelter.availableCapacity}/${shelter.capacity}`
            )
          )
          .addTo(map.current!);
      });
    } catch {
      setMapError(true);
    }

    return () => {
      map.current?.remove();
    };
  }, [center, incidents, shelters, isTokenConfigured, rawToken]);

  // When token is absent/invalid or map encounters an error, display the professional GIS fallback
  if (!isTokenConfigured || mapError) {
    return (
      <div className="w-full bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg">
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-gray-950/70 border-b border-gray-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm font-semibold text-gray-200 tracking-wide">
              Spatial Coordinate Grid &middot; Direct Mode
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-gray-800 text-gray-300 border border-gray-700">
              Center: {center.lat.toFixed(4)}°, {center.lng.toFixed(4)}°
            </span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Tiles Offline
            </span>
          </div>
        </div>

        {/* Informational Warning / Guidance */}
        <div className="px-5 py-3 bg-amber-950/20 border-b border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2.5">
          <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-medium text-amber-300">Live map tile provider is not configured</p>
            <p className="text-amber-200/70 mt-0.5">
              Spatial data is operating in high-reliability direct coordinate mode. All distances are computed via straight-line geodesics. Use your device's native navigation application for turn-by-turn road routing.
            </p>
          </div>
        </div>

        {/* Spatial Data Lists */}
        <div className="p-5 space-y-4">
          {/* Verified Incidents Section */}
          {incidents.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Verified Disaster Incidents ({incidents.length})
                </h4>
                <span className="text-[11px] text-gray-500">Approx. 1.1km privacy precision</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 max-h-56 overflow-y-auto pr-1">
                {incidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-3 bg-gray-950/80 rounded-lg border border-gray-800/80 hover:border-gray-700 transition-colors space-y-1.5"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-semibold text-gray-200">{inc.category}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          inc.severity === 'CRITICAL'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                            : inc.severity === 'HIGH'
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                            : inc.severity === 'MEDIUM'
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                        }`}
                      >
                        {inc.severity}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-gray-500 flex justify-between pt-1 border-t border-gray-900">
                      <span>Coordinates:</span>
                      <span className="text-gray-300">
                        {inc.location.lat.toFixed(2)}°, {inc.location.lng.toFixed(2)}°
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shelters Section */}
          {shelters.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Nearby Operational Shelters ({shelters.length})
                </h4>
                <span className="text-[11px] text-gray-500">Sorted by proximity</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 max-h-56 overflow-y-auto pr-1">
                {shelters.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 bg-gray-950/80 rounded-lg border border-gray-800/80 hover:border-gray-700 transition-colors space-y-1.5"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-semibold text-emerald-400">{s.name}</span>
                      <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                        {(s.distanceMeters / 1000).toFixed(1)} km away
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 flex justify-between items-center">
                      <span>Available Capacity:</span>
                      <span className="font-semibold text-gray-200">
                        {s.availableCapacity} / {s.capacity} seats
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-gray-500 flex justify-between pt-1 border-t border-gray-900">
                      <span>Coordinates:</span>
                      <span className="text-gray-300">
                        {s.location.lat.toFixed(4)}°, {s.location.lng.toFixed(4)}°
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty fallback state when neither incidents nor shelters are provided */}
          {incidents.length === 0 && shelters.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-xs">
              No active disaster incidents or operational shelters to display in this sector.
            </div>
          )}
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className="w-full h-96 rounded-xl overflow-hidden border border-gray-800" />;
};
