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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Verification Backlog Queue</h2>
          <p className="text-xs text-gray-400">
            Role-authorized shared backlog sorted by AI priority (EXPEDITED &gt; NORMAL &gt; AI_UNAVAILABLE &gt; LOW)
          </p>
        </div>

        {/* Priority filter buttons */}
        <div className="flex gap-2">
          {['', 'EXPEDITED', 'NORMAL', 'AI_UNAVAILABLE', 'LOW'].map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                priorityFilter === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {p || 'ALL'}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-center py-8 text-gray-400">Loading backlog queue...</div>}

      {error && (
        <div className="p-4 bg-red-900/50 border border-red-500 text-red-200 rounded">
          {error}
        </div>
      )}

      {!loading && !error && queue.length === 0 && (
        <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded text-gray-400">
          No reports currently pending review.
        </div>
      )}

      <div className="grid gap-4">
        {queue.map((item) => (
          <div key={item.id} className="p-5 bg-gray-900 border border-gray-800 rounded-lg space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-lg font-bold text-gray-100">{item.category}</span>
                <span className="ml-3 text-xs text-gray-500">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                    item.aiVerification.verificationPriority === 'EXPEDITED'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                      : item.aiVerification.verificationPriority === 'AI_UNAVAILABLE'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  }`}
                >
                  AI: {item.aiVerification.verificationPriority}
                </span>
                <span className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-300">
                  Reviews: {item.reviewCount}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-300">{item.description}</p>

            <div className="text-xs text-gray-400 pt-2 border-t border-gray-800 flex justify-between items-center">
              <div>
                <strong>Location:</strong> {item.location.lat.toFixed(4)}, {item.location.lng.toFixed(4)}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveModalItem({ item, mode: 'REVIEW' })}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-200 rounded transition-colors"
                >
                  Stage 2 Review
                </button>

                {isAuthority && (
                  <button
                    onClick={() => setActiveModalItem({ item, mode: 'VERIFY' })}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white rounded transition-colors"
                  >
                    Stage 3 Verify Gate
                  </button>
                )}
              </div>
            </div>

            {item.aiVerification.explanation && (
              <div className="text-xs text-gray-400 bg-gray-950 p-2 rounded italic">
                <strong>AI Note:</strong> {item.aiVerification.explanation}
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
