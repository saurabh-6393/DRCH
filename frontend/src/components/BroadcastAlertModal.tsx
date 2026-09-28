import React, { useState, useEffect } from 'react';
import { createAlert, CreateAlertPayload } from '../api/alerts';
import { getPublicVerifiedIncidents, PublicVerifiedIncident } from '../api/shelters';

interface BroadcastAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAlertCreated?: () => void;
  initialIncidentId?: string;
}

export default function BroadcastAlertModal({
  isOpen,
  onClose,
  onAlertCreated,
  initialIncidentId,
}: BroadcastAlertModalProps) {
  const [incidents, setIncidents] = useState<PublicVerifiedIncident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(initialIncidentId || '');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [durationHours, setDurationHours] = useState('24');
  const [zoneRadiusKm, setZoneRadiusKm] = useState('5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(false);
      getPublicVerifiedIncidents()
        .then((data) => {
          setIncidents(data);
          if (!selectedIncidentId && data.length > 0) {
            setSelectedIncidentId(data[0].id);
          }
        })
        .catch((err) => {
          console.warn('Could not fetch verified incidents for alert modal:', err);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedIncidentId) {
      setError('Please select a target verified incident.');
      return;
    }
    if (!title.trim() || title.length < 3) {
      setError('Title must be at least 3 characters.');
      return;
    }
    if (!message.trim() || message.length < 5) {
      setError('Message must be at least 5 characters.');
      return;
    }

    // Find incident coords to build geofenced bounding polygon
    const targetIncident = incidents.find((i) => i.id === selectedIncidentId);
    const centerLat = targetIncident ? targetIncident.location.lat : 12.9716;
    const centerLng = targetIncident ? targetIncident.location.lng : 77.5946;

    // Delta roughly 1 deg ~ 111km -> 5km ~ 0.045 deg
    const radius = parseFloat(zoneRadiusKm) || 5;
    const delta = (radius / 111.0);

    // Build valid closed Polygon coordinates: [ [ [lng, lat], ... , [lng, lat] ] ]
    const p1 = [centerLng - delta, centerLat - delta];
    const p2 = [centerLng + delta, centerLat - delta];
    const p3 = [centerLng + delta, centerLat + delta];
    const p4 = [centerLng - delta, centerLat + delta];
    const pClose = [centerLng - delta, centerLat - delta];

    const affectedZone = {
      type: 'Polygon' as const,
      coordinates: [[p1, p2, p3, p4, pClose]],
    };

    const expiresAt = new Date(Date.now() + parseInt(durationHours, 10) * 3600 * 1000).toISOString();

    const payload: CreateAlertPayload = {
      incidentId: selectedIncidentId,
      title: title.trim(),
      message: message.trim(),
      affectedZone,
      expiresAt,
    };

    setLoading(true);
    try {
      await createAlert(payload);
      setSuccess(true);
      if (onAlertCreated) onAlertCreated();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Failed to publish emergency warning alert.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-red-500/40 rounded-2xl p-6 sm:p-7 max-w-lg w-full text-slate-100 shadow-2xl shadow-red-950/50 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-lg">
              📢
            </span>
            <div>
              <h2 className="font-extrabold text-lg text-white">Broadcast Emergency Alert</h2>
              <p className="text-xs text-slate-400">Issue official Geofenced warning notification to citizens</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-red-500/15 border border-red-500/40 text-red-400 rounded-xl text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 rounded-xl text-xs flex items-center gap-2 font-bold">
            <span>✅</span>
            <span>Emergency Alert broadcasted successfully to all live channels!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
              Select Verified Incident Trigger
            </label>
            <select
              value={selectedIncidentId}
              onChange={(e) => setSelectedIncidentId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-red-500 outline-none"
            >
              {incidents.length === 0 ? (
                <option value="">No verified incidents available</option>
              ) : (
                incidents.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    [{inc.category}] {inc.description.slice(0, 45)}... ({inc.location.lat.toFixed(2)}, {inc.location.lng.toFixed(2)})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
              Alert Title (Short &amp; Urgent)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. FLASH FLOOD RED ALERT — IMMEDIATE EVACUATION"
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-red-500 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
              Emergency Warning Message / Instructions
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide clear public instructions, safe zones, and designated evacuation shelters..."
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-red-500 outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                Geofence Radius
              </label>
              <select
                value={zoneRadiusKm}
                onChange={(e) => setZoneRadiusKm(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-red-500 outline-none"
              >
                <option value="2">2 km (Local Hazard)</option>
                <option value="5">5 km (Standard Evacuation)</option>
                <option value="10">10 km (Regional Warning)</option>
                <option value="25">25 km (Major Inundation)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                Active Duration
              </label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-red-500 outline-none"
              >
                <option value="6">6 Hours</option>
                <option value="12">12 Hours</option>
                <option value="24">24 Hours (1 Day)</option>
                <option value="48">48 Hours (2 Days)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-950/50 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Broadcasting...</span>
                </>
              ) : (
                <>
                  <span>🚨</span>
                  <span>Broadcast Warning Alert</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
