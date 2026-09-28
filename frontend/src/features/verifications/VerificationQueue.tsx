import React, { useEffect, useState } from 'react';
import { getVerificationQueue, QueueItem } from '../../api/verifications';
import { ReviewModal } from './ReviewModal';
import { useAuth } from '../../context/AuthContext';

export const VerificationQueue: React.FC = () => {
  const { user } = useAuth();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeModalItem, setActiveModalItem] = useState<{ item: QueueItem; mode: 'REVIEW' | 'VERIFY' } | null>(null);

  const isAuthority = user?.roles.some((r) => ['AUTHORITY', 'ADMIN'].includes(r));

  useEffect(() => {
    fetchQueue();
  }, [priorityFilter]);

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getVerificationQueue(priorityFilter);
      setQueue(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch verification queue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--color-border)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
              Verification Backlog Queue
            </h2>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Role-authorized shared backlog sorted by AI priority (EXPEDITED &gt; NORMAL &gt; AI_UNAVAILABLE &gt; LOW)
          </p>
        </div>

        {/* Priority filter buttons */}
        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          {['', 'EXPEDITED', 'NORMAL', 'AI_UNAVAILABLE', 'LOW'].map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                priorityFilter === p
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)]'
              }`}
            >
              {p || 'ALL'}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-center py-16 text-[var(--color-text-muted)] flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-sm font-mono">Loading backlog queue...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && queue.length === 0 && (
        <div className="text-center py-16 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl text-[var(--color-text-muted)] space-y-2">
          <span className="text-3xl block">🛡️</span>
          <div className="text-base font-semibold text-[var(--color-text)]">
            No reports currently pending review.
          </div>
          <p className="text-xs max-w-sm mx-auto">
            All incident triage feeds are currently clear or processed by Field Operators and Verification Authorities.
          </p>
        </div>
      )}

      <div className="grid gap-4">
        {queue.map((item) => (
          <div
            key={item.id}
            className="p-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-md space-y-3 hover:border-blue-500/30 transition-all"
          >
            <div className="flex flex-wrap justify-between items-start gap-2">
              <div>
                <span className="text-lg font-bold text-[var(--color-text)] tracking-wide">{item.category}</span>
                <span className="ml-3 text-xs text-[var(--color-text-muted)] font-mono">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                    item.aiVerification.verificationPriority === 'EXPEDITED'
                      ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                      : item.aiVerification.verificationPriority === 'AI_UNAVAILABLE'
                      ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                      : 'bg-blue-500/20 text-blue-500 border border-blue-500/30'
                  }`}
                >
                  AI: {item.aiVerification.verificationPriority}
                </span>
                <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                  Reviews: {item.reviewCount}
                </span>
              </div>
            </div>

            <p className="text-sm text-[var(--color-text)] leading-relaxed">{item.description}</p>

            <div className="text-xs text-[var(--color-text-muted)] pt-3 border-t border-[var(--color-border)] flex flex-wrap justify-between items-center gap-3">
              <div className="font-mono">
                <strong className="text-[var(--color-text)] font-sans">Location:</strong> {item.location.lat.toFixed(4)}°N, {item.location.lng.toFixed(4)}°E
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveModalItem({ item, mode: 'REVIEW' })}
                  className="px-3.5 py-1.5 bg-[var(--color-bg)] hover:bg-slate-200 dark:hover:bg-slate-800 border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text)] rounded-xl transition-colors"
                >
                  Stage 2 Review
                </button>

                {isAuthority && (
                  <button
                    onClick={() => setActiveModalItem({ item, mode: 'VERIFY' })}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white rounded-xl shadow transition-colors flex items-center gap-1.5"
                  >
                    <span>🛡️</span>
                    <span>Stage 3 Verify Gate</span>
                  </button>
                )}
              </div>
            </div>

            {item.aiVerification.explanation && (
              <div className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg)] p-3 rounded-xl border border-[var(--color-border)] italic">
                <strong className="text-[var(--color-text)] not-italic mr-1">AI Note:</strong> {item.aiVerification.explanation}
              </div>
            )}
          </div>
        ))}
      </div>

      {activeModalItem && (
        <ReviewModal
          incident={activeModalItem.item}
          mode={activeModalItem.mode}
          onClose={() => setActiveModalItem(null)}
          onSuccess={fetchQueue}
        />
      )}
    </div>
  );
};
