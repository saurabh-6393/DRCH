import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isDark = theme === 'dark';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, displayName || undefined);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[75vh] px-4 py-8">
      <div
        className={`w-full max-w-md rounded-3xl p-8 sm:p-10 transition-all border ${
          isDark
            ? 'bg-[#0E1626] border-slate-800 text-slate-100 shadow-2xl'
            : 'bg-white border-slate-200 text-slate-900 shadow-xl'
        }`}
      >
        {/* Emblem Badge */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white text-2xl shadow-lg shadow-emerald-500/25 mb-4">
            🇮🇳
          </div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Create Account
          </h1>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
            Citizen &amp; First Responder Unified Registration
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/40 text-red-600 dark:text-red-400 text-sm font-semibold rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                isDark ? 'text-slate-400' : 'text-slate-700'
              }`}
            >
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl transition-all text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                isDark
                  ? 'bg-slate-900/90 border-slate-700 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
              }`}
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <label
              className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                isDark ? 'text-slate-400' : 'text-slate-700'
              }`}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full px-4 py-3 rounded-xl transition-all text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                isDark
                  ? 'bg-slate-900/90 border-slate-700 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
              }`}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                isDark ? 'text-slate-400' : 'text-slate-700'
              }`}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className={`w-full px-4 py-3 rounded-xl transition-all text-sm font-mono border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                isDark
                  ? 'bg-slate-900/90 border-slate-700 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
              }`}
              placeholder="Min 8 characters"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold tracking-wide rounded-xl shadow-lg shadow-emerald-900/20 transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span className="text-white font-bold">Creating Account...</span>
              </>
            ) : (
              <span className="text-white font-bold">Create Account</span>
            )}
          </button>
        </form>

        <p className={`mt-6 text-center text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline ml-1">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
