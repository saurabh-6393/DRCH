import React, { useState, useEffect } from 'react';
import { getActiveAlerts, cancelAlert, AlertItem } from '../api/alerts';
import { useAuth } from '../context/AuthContext';

export default function DisasterAlertBanner() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Record<string, boolean>>({});
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const isAuthority = Boolean(
    user?.roles?.some((r) => ['AUTHORITY', 'ADMIN'].includes(r))
  );

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const data = await getActiveAlerts();
      setAlerts(data || []);
    } catch (err) {
      console.warn('Could not fetch active disaster alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Poll every 30 seconds for live updates
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCancel = async (alertId: string) => {
    if (!window.confirm('Are you sure you want to cancel and mark this emergency alert as resolved?')) {
      return;
    }
    setActionLoadingId(alertId);
    try {
      await cancelAlert(alertId);
      await fetchAlerts();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to cancel alert.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDismiss = (alertId: string) => {
    setDismissedAlertIds((prev) => ({ ...prev, [alertId]: true }));
  };

  const visibleAlerts = alerts.filter((a) => !dismissedAlertIds[a.id]);

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 space-y-3" role="region" aria-label="Active Disaster Warning Alerts">
      {visibleAlerts.map((alert) => {
        const isCritical = alert.severity === 'CRITICAL';
        const isHigh = alert.severity === 'HIGH';

        const borderStyle = isCritical
          ? 'border-red-500/80 bg-gradient-to-r from-red-950/40 via-red-900/20 to-red-950/40 shadow-red-900/20'
          : isHigh
          ? 'border-amber-500/80 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-amber-950/40 shadow-amber-900/20'
          : 'border-blue-500/80 bg-gradient-to-r from-blue-950/40 via-blue-900/20 to-blue-950/40 shadow-blue-900/20';

        const badgeColor = isCritical
          ? 'bg-red-500 text-white animate-pulse'
          : isHigh
          ? 'bg-amber-500 text-slate-950 font-extrabold'
          : 'bg-blue-500 text-white';

        return (
          <div
            key={alert.id}
            className={`p-4 sm:p-5 rounded-2xl border-2 shadow-lg backdrop-blur-md transition-all ${borderStyle} text-slate-100`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5 flex-1">
                <div className="text-2xl mt-0.5 select-none">
                  {isCritical ? '🚨' : isHigh ? '⚠️' : '📢'}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase ${badgeColor}`}>
                      {alert.severity} WARNING
                    </span>
                    <h3 className="font-extrabold text-white text-base tracking-tight">
                      {alert.title}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed font-medium">
                    {alert.message}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-300 font-mono pt-1">
                    <span>
                      📅 Issued: {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </span>
                    {alert.expiresAt && (
                      <span>
                        ⏳ Valid until: {new Date(alert.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    <span className="text-cyan-300">
                      📍 Geofenced Evacuation Zone Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {isAuthority && (
                  <button
                    type="button"
                    onClick={() => handleCancel(alert.id)}
                    disabled={actionLoadingId === alert.id}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors border border-red-400 disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {actionLoadingId === alert.id ? 'Resolving...' : 'Resolve Alert'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDismiss(alert.id)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 cursor-pointer"
                  title="Dismiss from current view"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
