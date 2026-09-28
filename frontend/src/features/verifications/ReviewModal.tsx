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
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-6 text-[var(--color-text)] shadow-2xl transition-colors">
        <h3 className="text-xl font-bold mb-1 tracking-tight">
          {mode === 'REVIEW' ? 'Submit Review Recommendation (Stage 2)' : 'Authority Verification Sign-Off (Stage 3)'}
        </h3>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Incident: <strong className="text-[var(--color-text)]">{incident.category}</strong> &bull; ID: <span className="font-mono">{incident.id}</span>
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-sm flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'REVIEW' ? (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Recommendation</label>
                <select
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value as 'VERIFY' | 'REJECT')}
                  className="w-full px-4 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="VERIFY" className="bg-[var(--color-surface)] text-[var(--color-text)]">Recommend Verification (VERIFY)</option>
                  <option value="REJECT" className="bg-[var(--color-surface)] text-[var(--color-text)]">Recommend Rejection (REJECT)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Review Notes</label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  placeholder="Detail visual observations, cross-checks, or local knowledge..."
                  className="w-full px-4 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Final Decision</label>
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value as 'VERIFIED' | 'REJECTED')}
                  className="w-full px-4 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="VERIFIED" className="bg-[var(--color-surface)] text-[var(--color-text)]">VERIFIED</option>
                  <option value="REJECTED" className="bg-[var(--color-surface)] text-[var(--color-text)]">REJECTED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Authoritative Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="LOW" className="bg-[var(--color-surface)] text-[var(--color-text)]">LOW</option>
                  <option value="MEDIUM" className="bg-[var(--color-surface)] text-[var(--color-text)]">MEDIUM</option>
                  <option value="HIGH" className="bg-[var(--color-surface)] text-[var(--color-text)]">HIGH</option>
                  <option value="CRITICAL" className="bg-[var(--color-surface)] text-[var(--color-text)]">CRITICAL</option>
                </select>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-bold text-white rounded-xl shadow-lg disabled:opacity-50 transition-all"
            >
              {loading ? 'Submitting...' : mode === 'REVIEW' ? 'Submit Recommendation' : 'Commit Verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
