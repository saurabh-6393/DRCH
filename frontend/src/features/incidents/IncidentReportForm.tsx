import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { submitIncident, IncidentReport } from '../../api/incidents';

const CATEGORIES = [
  { value: 'FLOOD', label: '🌊 Flood / Waterlogging' },
  { value: 'FIRE', label: '🔥 Fire / Wildfire' },
  { value: 'EARTHQUAKE', label: '🏚️ Earthquake / Structural Collapse' },
  { value: 'LANDSLIDE', label: '⛰️ Landslide / Rockfall' },
  { value: 'OTHER', label: '🚨 Other Disaster Emergency' },
];

export const IncidentReportForm: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [category, setCategory] = useState('FLOOD');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fromMap, setFromMap] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successReport, setSuccessReport] = useState<IncidentReport | null>(null);

  // Auto-fill coordinates from URL search params (e.g. from Map click)
  useEffect(() => {
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    if (latParam && lngParam) {
      setLatitude(latParam);
      setLongitude(lngParam);
      setFromMap(true);
    }
  }, [searchParams]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // Client-side file size check (5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size exceeds 5MB limit. Please choose a smaller image.');
        setFile(null);
        setImagePreview(null);
        return;
      }

      setError(null);
      setFile(selectedFile);
      setImagePreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setFromMap(false);
        setError(null);
      },
      () => {
        setError('Unable to retrieve current location. Please enter coordinates manually or pin from the Live Map.');
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessReport(null);

    if (!category) {
      setError('Please select an incident category.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a description.');
      return;
    }
    if (!latitude || !longitude) {
      setError('Please provide latitude and longitude coordinates.');
      return;
    }
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setError('Latitude must be a valid number between -90 and 90.');
      return;
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      setError('Longitude must be a valid number between -180 and 180.');
      return;
    }
    if (!file) {
      setError('Please attach photo evidence.');
      return;
    }

    setLoading(true);
    try {
      const report = await submitIncident({
        category,
        description,
        latitude: latNum,
        longitude: lngNum,
        file,
      });

      setSuccessReport(report);
      // Reset form
      setDescription('');
      setFile(null);
      setImagePreview(null);
      setFromMap(false);
    } catch (err: any) {
      const message = err.response?.data?.error?.message || 'Failed to submit incident report.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 sm:p-8 rounded-2xl border shadow-xl bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-[var(--color-border)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
              Report an Incident
            </h2>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Dispatch triage system &bull; Automated AI vision cross-check &bull; Immediate authority feed
          </p>
        </div>
        <Link
          to="/public-map"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors flex items-center gap-1.5"
        >
          <span>🗺️</span> View Live Map
        </Link>
      </div>

      {fromMap && (
        <div className="mb-5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-500 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">📍</span>
            <span>
              Coordinates pre-filled from <strong>Live Tactical Map</strong> pin:
              <span className="font-mono ml-1 font-bold">[{Number(latitude).toFixed(4)}, {Number(longitude).toFixed(4)}]</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFromMap(false)}
            className="text-xs underline hover:opacity-80"
          >
            Clear
          </button>
        </div>
      )}

      {error && (
        <div className="mb-5 p-4 bg-red-500/10 border border-red-500/40 text-red-500 rounded-xl text-sm flex items-start gap-2.5">
          <span className="text-base leading-none">⚠️</span>
          <span className="leading-snug">{error}</span>
        </div>
      )}

      {successReport && (
        <div className="mb-6 p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-[var(--color-text)] space-y-2">
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-base">
            <span>✅</span>
            <h3>Report Submitted Successfully!</h3>
          </div>
          <p className="text-sm">
            <strong>Incident ID:</strong> <span className="font-mono text-xs">{successReport.id}</span>
          </p>
          <p className="text-sm">
            <strong>Status:</strong>{' '}
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {successReport.status}
            </span>
          </p>
          <div className="pt-2 border-t border-emerald-500/20 text-xs space-y-1">
            <div>
              <strong>AI Consistency Priority:</strong>{' '}
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold ${
                  successReport.aiVerification.verificationPriority === 'EXPEDITED'
                    ? 'bg-red-500/20 text-red-400'
                    : successReport.aiVerification.verificationPriority === 'AI_UNAVAILABLE'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {successReport.aiVerification.verificationPriority}
              </span>
            </div>
            <p className="italic text-[var(--color-text-muted)] mt-1">
              "{successReport.aiVerification.explanation}"
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
            Emergency Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value} className="bg-[var(--color-surface)] text-[var(--color-text)]">
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
            Incident Description &amp; Ground Situation
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe the situation, water/fire level, trapped citizens, road blockages, and immediate hazards..."
            className="w-full px-4 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors resize-y"
          />
        </div>

        <div>
          <div className="flex flex-wrap justify-between items-center mb-1.5 gap-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Geo-Coordinates (WGS-84)
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                className="text-xs font-semibold text-blue-500 hover:text-blue-600 underline flex items-center gap-1"
              >
                <span>📡</span> Use Device GPS
              </button>
              <Link
                to="/public-map"
                className="text-xs font-semibold text-amber-500 hover:text-amber-600 underline flex items-center gap-1"
              >
                <span>📍</span> Pick on Map
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <input
                type="number"
                step="any"
                placeholder="Latitude (e.g. 12.9716)"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full px-4 py-2.5 font-mono bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
              />
            </div>
            <div>
              <input
                type="number"
                step="any"
                placeholder="Longitude (e.g. 77.5946)"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full px-4 py-2.5 font-mono bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
            Photographic Evidence (AI Triage &bull; Max 5MB)
          </label>
          <div className="p-4 border-2 border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-bg)] text-center transition-colors">
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              capture="environment"
              onChange={handleFileChange}
              className="w-full text-sm text-[var(--color-text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-red-600 file:text-white hover:file:bg-red-500 cursor-pointer"
            />
            <p className="text-[11px] text-[var(--color-text-muted)] mt-2">
              📸 Supports direct camera capture on mobile or JPG, PNG, WEBP upload.
            </p>
          </div>
          {imagePreview && (
            <div className="mt-3 relative inline-block">
              <img
                src={imagePreview}
                alt="Upload preview"
                className="h-36 w-auto object-cover rounded-xl border border-[var(--color-border)] shadow"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold tracking-wide rounded-xl shadow-lg shadow-red-900/30 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>Submitting Report...</span>
            </>
          ) : (
            <>
              <span>🚨</span>
              <span>Submit Incident Report</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
