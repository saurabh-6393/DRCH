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

  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  useEffect(() => {
    if (!token || token.trim() === '') {
      setMapError(true);
      return;
    }

    if (!mapContainer.current) return;

    try {
      mapboxgl.accessToken = token;
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
    } catch (err) {
      setMapError(true);
    }

    return () => {
      map.current?.remove();
    };
  }, [center, incidents, shelters, token]);

  if (mapError || !token) {
    return (
      <div className="w-full p-4 bg-gray-900 border border-yellow-500/50 rounded-lg text-gray-200">
        <div className="flex items-center gap-2 text-yellow-400 font-semibold mb-3">
          <span>⚠️ Map Display Warning</span>
        </div>
        <p className="text-sm text-gray-300 mb-4">
          Map tiles and turn-by-turn road routing are currently unavailable. Proximity distances shown are straight-line calculations. Please use native device navigation for turn-by-turn routing.
        </p>

        {/* Fallback plain-text coordinate layout */}
        <div className="space-y-3 pt-3 border-t border-gray-800">
          <div className="text-xs text-gray-400">
            <strong>Current Position:</strong> Latitude {center.lat.toFixed(4)}, Longitude {center.lng.toFixed(4)}
          </div>

          {incidents.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-300 uppercase mb-1">Verified Incidents List:</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {incidents.map((inc) => (
                  <div key={inc.id} className="text-xs p-1.5 bg-gray-950 rounded flex justify-between">
                    <span>
                      <strong>{inc.category}</strong> ({inc.severity})
                    </span>
                    <span className="font-mono text-gray-400">
                      {inc.location.lat.toFixed(2)}, {inc.location.lng.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {shelters.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-300 uppercase mb-1">Nearby Shelters (Straight-line Distance):</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {shelters.map((s) => (
                  <div key={s.id} className="text-xs p-1.5 bg-gray-950 rounded flex justify-between">
                    <span>
                      <strong>{s.name}</strong> ({s.availableCapacity} open seats)
                    </span>
                    <span className="font-mono text-emerald-400">
                      {(s.distanceMeters / 1000).toFixed(1)} km
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className="w-full h-96 rounded-lg overflow-hidden border border-gray-800" />;
};
