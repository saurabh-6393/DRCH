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
    return <div className="text-center py-8 text-gray-500">Loading your reports...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded mb-4">
        {error}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded border text-gray-500">
        You have not submitted any incident reports yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">My Submitted Reports</h2>

      {reports.map((report) => (
        <div key={report.id} className="p-4 bg-white rounded-lg border shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-bold text-gray-900 text-lg">{report.category}</span>
              <span className="ml-2 text-xs text-gray-500">
                {new Date(report.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                  report.status === 'VERIFIED'
                    ? 'bg-green-100 text-green-800'
                    : report.status === 'REJECTED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {report.status}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                  report.aiVerification?.verificationPriority === 'EXPEDITED'
                    ? 'bg-red-100 text-red-800'
                    : report.aiVerification?.verificationPriority === 'AI_UNAVAILABLE'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                AI: {report.aiVerification?.verificationPriority || 'NORMAL'}
              </span>
            </div>
          </div>

          <p className="text-gray-700 text-sm">{report.description}</p>

          <div className="text-xs text-gray-500 pt-2 border-t flex justify-between">
            <span>
              <strong>Location:</strong> {report.location.lat.toFixed(4)}, {report.location.lng.toFixed(4)}
            </span>
            <span>
              <strong>Media ID:</strong> {report.media.id} ({report.media.mimeType})
            </span>
          </div>

          {report.aiVerification?.explanation && (
            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded italic">
              <strong>AI Notes:</strong> {report.aiVerification.explanation}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
