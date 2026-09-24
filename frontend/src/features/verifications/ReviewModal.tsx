import React, { useState } from 'react';
import { QueueItem, submitReviewRecommendation, submitAuthorityVerification } from '../../api/verifications';
import { useAuth } from '../../context/AuthContext';

interface ReviewModalProps {
  incident: QueueItem;
  mode: 'REVIEW' | 'VERIFY';
  onClose: () => void;
  onSuccess: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ incident, mode, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [recommendation, setRecommendation] = useState<'VERIFY' | 'REJECT'>('VERIFY');
  const [reviewNotes, setReviewNotes] = useState('');

  const [decision, setDecision] = useState<'VERIFIED' | 'REJECTED'>('VERIFIED');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthority = user?.roles.some((r) => ['AUTHORITY', 'ADMIN'].includes(r));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'REVIEW') {
        if (!reviewNotes.trim()) {
          setError('Please provide review notes.');
          setLoading(false);
          return;
        }
        await submitReviewRecommendation(incident.id, recommendation, reviewNotes);
      } else {
        if (!isAuthority) {
          setError('Authority or Admin role is required to verify incidents.');
          setLoading(false);
          return;
        }
        await submitAuthorityVerification(incident.id, decision, severity);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Transaction failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-lg max-w-md w-full p-6 text-gray-100 shadow-xl">
        <h3 className="text-xl font-bold mb-2">
          {mode === 'REVIEW' ? 'Submit Review Recommendation (Stage 2)' : 'Authority Verification Sign-Off (Stage 3)'}
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Incident Category: <strong className="text-gray-200">{incident.category}</strong> (ID: {incident.id})
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 text-red-200 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'REVIEW' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Recommendation</label>
                <select
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value as 'VERIFY' | 'REJECT')}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded text-sm text-gray-200"
                >
                  <option value="VERIFY">Recommend Verification (VERIFY)</option>
                  <option value="REJECT">Recommend Rejection (REJECT)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Review Notes</label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  placeholder="Detail visual observations, cross-checks, or local knowledge..."
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Final Decision</label>
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value as 'VERIFIED' | 'REJECTED')}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded text-sm text-gray-200"
                >
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Authoritative Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded text-sm text-gray-200"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 font-medium text-white rounded shadow disabled:opacity-50"
            >
              {loading ? 'Submitting...' : mode === 'REVIEW' ? 'Submit Recommendation' : 'Commit Verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
