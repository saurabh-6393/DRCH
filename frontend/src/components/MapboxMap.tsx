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
  const mapboxInstance = useRef<mapboxgl.Map | null>(null);
  const leafletInstance = useRef<any>(null);
  const [mapError, setMapError] = useState<boolean>(false);
  const [activeEngine, setActiveEngine] = useState<'mapbox' | 'leaflet' | 'fallback'>('fallback');

  const rawToken = import.meta.env.VITE_MAPBOX_TOKEN;
  const isTokenConfigured = Boolean(
    rawToken &&
    typeof rawToken === 'string' &&
    rawToken.trim() !== '' &&
    !rawToken.includes('placeholder') &&
    rawToken.startsWith('pk.')
  );

  useEffect(() => {
    if (!mapContainer.current) return;

    // 1. PRIMARY: If Mapbox token is configured, use official Mapbox GL
    if (isTokenConfigured) {
      try {
        mapboxgl.accessToken = rawToken;
        const map = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [center.lng, center.lat],
          zoom: 11,
        });

        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        map.on('error', () => {
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
            .addTo(map);
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
            .addTo(map);
        });

        mapboxInstance.current = map;
        setActiveEngine('mapbox');
        return () => {
          map.remove();
        };
      } catch {
        setMapError(true);
      }
    }

    // 2. FALLBACK OPTION 1: Free Live OpenStreetMap / CartoDB Dark Matter Engine via Leaflet
    const L = (window as any).L;
    if (L && mapContainer.current) {
      try {
        // Clean up previous Leaflet instance if present
        if (leafletInstance.current) {
          leafletInstance.current.remove();
          leafletInstance.current = null;
        }

        const lMap = L.map(mapContainer.current, {
          center: [center.lat, center.lng],
          zoom: 12,
          zoomControl: true,
        });

        // 100% Free Public GIS Tiles (NO API KEY / ZERO WATERMARK)
        const osmStandard = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
          maxZoom: 19,
        });

        const esriDark = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
          maxZoom: 16,
        });

        const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, USDA, USGS, GeoEye',
          maxZoom: 18,
        });

        // Set standard OpenStreetMap as active by default (clean, detailed, zero watermark)
        osmStandard.addTo(lMap);

        // Add tactical layer switcher control on top-right
        L.control.layers({
          '🗺️ Street (OSM)': osmStandard,
          '🌑 Dark Tactical': esriDark,
          '🛰️ Satellite': esriSatellite,
        }, undefined, { position: 'topright' }).addTo(lMap);

        // Add incident markers with glowing pulses
        incidents.forEach((inc) => {
          const color =
            inc.severity === 'CRITICAL'
              ? '#ef4444'
              : inc.severity === 'HIGH'
              ? '#f97316'
              : inc.severity === 'MEDIUM'
              ? '#eab308'
              : '#3b82f6';

          const iconHtml = `
            <div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color};"></div>
          `;

          const customIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-incident-pin',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });

          L.marker([inc.location.lat, inc.location.lng], { icon: customIcon })
            .addTo(lMap)
            .bindPopup(`
              <div style="color: #0f172a; font-family: sans-serif; font-size: 12px; line-height: 1.4;">
                <strong style="color: ${color}; text-transform: uppercase;">[${inc.severity}] ${inc.category}</strong><br/>
                <span>${inc.description || 'Verified incident report'}</span><br/>
                <small style="color: #64748b;">Coords: ${inc.location.lat.toFixed(4)}, ${inc.location.lng.toFixed(4)}</small>
              </div>
            `);
        });

        // Add shelter markers
        shelters.forEach((shelter) => {
          const iconHtml = `
            <div style="background-color: #10b981; width: 22px; height: 22px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: white; box-shadow: 0 0 10px rgba(16, 185, 129, 0.6);">
              S
            </div>
          `;

          const shelterIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-shelter-pin',
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          });

          L.marker([shelter.location.lat, shelter.location.lng], { icon: shelterIcon })
            .addTo(lMap)
            .bindPopup(`
              <div style="color: #0f172a; font-family: sans-serif; font-size: 12px; line-height: 1.4;">
                <strong style="color: #059669;">${shelter.name}</strong><br/>
                <span>Available Capacity: <strong>${shelter.availableCapacity} / ${shelter.capacity}</strong></span><br/>
                <span style="color: #64748b;">${(shelter.distanceMeters / 1000).toFixed(1)} km away</span>
              </div>
            `);
        });

        // Add interactive Click-on-Map pin to report emergency
        let tempClickMarker: any = null;
        lMap.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          if (tempClickMarker) {
            lMap.removeLayer(tempClickMarker);
          }

          const pulsePinHtml = `
            <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
              <span style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: #ef4444; opacity: 0.75; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
              <span style="position: relative; width: 16px; height: 16px; border-radius: 50%; background: #dc2626; border: 2.5px solid #ffffff; box-shadow: 0 0 12px rgba(220, 38, 38, 0.9);"></span>
            </div>
          `;
          const pinIcon = L.divIcon({
            html: pulsePinHtml,
            className: 'click-report-pin',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          const popupHtml = `
            <div style="color: #0f172a; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; line-height: 1.4; min-width: 210px; padding: 2px;">
              <div style="font-weight: 700; color: #dc2626; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 15px;">🚨</span> Selected Emergency Point
              </div>
              <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #334155; background: #f1f5f9; padding: 5px 8px; border-radius: 6px; margin-bottom: 8px;">
                <div>Lat: <strong>${lat.toFixed(5)}°</strong></div>
                <div>Lng: <strong>${lng.toFixed(5)}°</strong></div>
              </div>
              <a href="/report-incident?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}" 
                 style="display: block; text-align: center; background: #dc2626; color: white; text-decoration: none; font-weight: 600; padding: 7px 12px; border-radius: 6px; font-size: 12px; box-shadow: 0 2px 8px rgba(220, 38, 38, 0.4);">
                🚨 Report Disaster Here &rarr;
              </a>
            </div>
          `;

          tempClickMarker = L.marker([lat, lng], { icon: pinIcon })
            .addTo(lMap)
            .bindPopup(popupHtml, { closeButton: true, offset: [0, -10] })
            .openPopup();
        });

        leafletInstance.current = lMap;
        setActiveEngine('leaflet');

        return () => {
          lMap.remove();
          leafletInstance.current = null;
        };
      } catch (err) {
        console.warn('Leaflet OpenStreetMap visual initialization failed, falling back to coordinate grid:', err);
        setMapError(true);
        setActiveEngine('fallback');
      }
    } else {
      // In headless testing or no leaflet
      setActiveEngine('fallback');
    }
  }, [center, incidents, shelters, isTokenConfigured, rawToken]);

  // If user is offline or map encounters critical error
  if (activeEngine === 'fallback' && mapError) {
    return (
      <div className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-5 py-3.5 bg-slate-950/70 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm font-semibold text-slate-200 tracking-wide font-mono">
              Spatial Coordinate Grid &middot; Direct Mode
            </span>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
            Center: {center.lat.toFixed(4)}°, {center.lng.toFixed(4)}°
          </span>
        </div>
        <div className="p-6 text-center text-xs text-slate-400">
          Spatial telemetry operating in direct coordinate fallback mode.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {/* Tactical Map Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-emerald-400 font-semibold tracking-wider">
            {isTokenConfigured ? 'MAPBOX VECTOR RADAR' : 'OPENSTREETMAP TACTICAL GIS (LIVE)'}
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/20">
            💡 Click on map to pinpoint &amp; report incident
          </span>
        </div>
        <span className="text-slate-400">
          Center: {center.lat.toFixed(4)}°N, {center.lng.toFixed(4)}°E
        </span>
      </div>

      {/* Visual Live Map Canvas */}
      <div
        ref={mapContainer}
        className="w-full h-[450px] sm:h-[500px] rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-2xl relative z-10 bg-[#070B12]"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
};
