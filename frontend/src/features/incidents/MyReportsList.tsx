import React, { useEffect, useState } from 'react';
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
    return <div className="text-center py-12 text-gray-400">Loading your incident reports...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-950/40 border border-red-500/50 text-red-200 rounded-lg mb-4 text-sm">
        {error}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-900 rounded-xl border border-gray-800 text-gray-400 text-sm">
        You have not submitted any incident reports yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-100 mb-4">My Submitted Reports</h2>

      {reports.map((report) => (
        <div key={report.id} className="p-5 bg-gray-900 rounded-xl border border-gray-800 shadow-md space-y-3 hover:border-gray-700/80 transition-colors">
          <div className="flex flex-wrap justify-between items-start gap-2">
            <div>
              <span className="font-bold text-gray-100 text-lg">{report.category}</span>
              <span className="ml-2 text-xs text-gray-400 font-mono">
                {new Date(report.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                  report.status === 'VERIFIED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : report.status === 'REJECTED'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}
              >
                {report.status}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                  report.aiVerification?.verificationPriority === 'EXPEDITED'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : report.aiVerification?.verificationPriority === 'AI_UNAVAILABLE'
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                    : report.aiVerification?.verificationPriority === 'LOW'
                    ? 'bg-gray-800 text-gray-400 border border-gray-700'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                }`}
              >
                AI: {report.aiVerification?.verificationPriority || 'NORMAL'}
              </span>
            </div>
          </div>

          <p className="text-gray-300 text-sm leading-relaxed">{report.description}</p>

          <div className="text-xs text-gray-400 pt-3 border-t border-gray-800/80 flex flex-wrap justify-between gap-2">
            <span>
              <strong className="text-gray-300">Location:</strong>{' '}
              <span className="font-mono text-gray-300">
                {report.location.lat.toFixed(4)}, {report.location.lng.toFixed(4)}
              </span>
            </span>
            <span>
              <strong className="text-gray-300">Media ID:</strong>{' '}
              <span className="font-mono text-gray-300">{report.media.id}</span> ({report.media.mimeType})
            </span>
          </div>

          {report.aiVerification?.explanation && (
            <div className="text-xs text-gray-300 bg-gray-950/80 p-3 rounded-lg border border-gray-800/60 italic">
              <strong className="text-gray-200 not-italic">AI Advisory Notes:</strong> {report.aiVerification.explanation}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
