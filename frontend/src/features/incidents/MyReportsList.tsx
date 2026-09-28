import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyReports, IncidentReport } from '../../api/incidents';

export const MyReportsList: React.FC = () => {
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyReports();
      setReports(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch your reports.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16 text-[var(--color-text-muted)] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-sm font-mono">Retrieving your submitted incident telemetry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl mb-4 text-sm flex items-center gap-2">
        <span>⚠️</span>
        <span>{error}</span>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-16 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-xl text-[var(--color-text-muted)] space-y-4">
        <span className="text-4xl block">📋</span>
        <div className="text-base font-semibold text-[var(--color-text)]">
          You have not submitted any incident reports yet.
        </div>
        <p className="text-xs max-w-md mx-auto">
          In case of emergency, disaster, or hazard sightings, report immediately to initiate the Stage 1 AI vision verification triage.
        </p>
        <Link
          to="/report-incident"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-xs shadow-lg shadow-red-900/30 hover:opacity-95"
        >
          <span>🚨</span> Report Emergency Incident
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--color-border)]">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            My Submitted Reports
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Track real-time multi-stage verification status &amp; AI consistency scores
          </p>
        </div>
        <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 font-bold">
          TOTAL: {reports.length}
        </span>
      </div>

      {reports.map((report) => (
        <div
          key={report.id}
          className="p-5 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-md space-y-3 hover:border-blue-500/40 transition-all"
        >
          <div className="flex flex-wrap justify-between items-start gap-2">
            <div>
              <span className="font-bold text-[var(--color-text)] text-lg tracking-wide">{report.category}</span>
              <span className="ml-2.5 text-xs text-[var(--color-text-muted)] font-mono">
                {new Date(report.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                  report.status === 'VERIFIED'
                    ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                    : report.status === 'REJECTED'
                    ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                    : 'bg-blue-500/20 text-blue-500 border border-blue-500/30'
                }`}
              >
                {report.status}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                  report.aiVerification?.verificationPriority === 'EXPEDITED'
                    ? 'bg-red-500/20 text-red-500 border border-red-500/40'
                    : report.aiVerification?.verificationPriority === 'AI_UNAVAILABLE'
                    ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                    : report.aiVerification?.verificationPriority === 'LOW'
                    ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                    : 'bg-blue-500/20 text-blue-500 border border-blue-500/40'
                }`}
              >
                AI: {report.aiVerification?.verificationPriority || 'NORMAL'}
              </span>
            </div>
          </div>

          <p className="text-[var(--color-text)] text-sm leading-relaxed">{report.description}</p>

          <div className="text-xs text-[var(--color-text-muted)] pt-3 border-t border-[var(--color-border)] flex flex-wrap justify-between gap-2 font-mono">
            <span>
              <strong className="text-[var(--color-text)] font-sans">Location:</strong>{' '}
              {report.location.lat.toFixed(4)}°N, {report.location.lng.toFixed(4)}°E
            </span>
            <span>
              <strong className="text-[var(--color-text)] font-sans">Media ID:</strong>{' '}
              {report.media.id.substring(0, 8)}... ({report.media.mimeType})
            </span>
          </div>

          {report.aiVerification?.explanation && (
            <div className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg)] p-3 rounded-xl border border-[var(--color-border)] italic">
              <strong className="text-[var(--color-text)] not-italic mr-1">🤖 Gemini Vision Analysis:</strong>
              {report.aiVerification.explanation}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
