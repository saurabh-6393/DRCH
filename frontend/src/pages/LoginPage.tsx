import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function LoginPage() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isDark = theme === 'dark';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed.');
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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-2xl shadow-lg shadow-blue-500/25 mb-4">
            🛡️
          </div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Sign In
          </h1>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
            National Disaster Response &amp; Coordination Portal
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
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full px-4 py-3 rounded-xl transition-all text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark
                  ? 'bg-slate-900/90 border-slate-700 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
              }`}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                className={`block text-xs font-bold uppercase tracking-wider ${
                  isDark ? 'text-slate-400' : 'text-slate-700'
                }`}
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                aria-label="Toggle password visibility"
              >
                <span>{showPassword ? '👁️‍🗨️ Hide' : '👁️ Show'}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`w-full px-4 py-3 rounded-xl transition-all text-sm font-mono border focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 ${
                  isDark
                    ? 'bg-slate-900/90 border-slate-700 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
                }`}
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Quick Demo Credentials */}
          <div className="pt-1 pb-1">
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  isDark ? 'text-slate-400' : 'text-slate-700'
                }`}
              >
                ⚡ Quick Demo Fill
              </span>
              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>1-Click Test</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('citizen@example.com');
                  setPassword('Password123!');
                }}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all text-left flex items-center gap-2 cursor-pointer ${
                  isDark
                    ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200'
                }`}
              >
                <span className="text-base">👤</span>
                <div>
                  <div className="font-bold leading-tight">Citizen</div>
                  <div
                    className={`text-[10px] font-mono leading-none mt-0.5 ${
                      isDark ? 'text-slate-400' : 'text-blue-600'
                    }`}
                  >
                    citizen@...
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('authority@example.com');
                  setPassword('Password123!');
                }}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all text-left flex items-center gap-2 cursor-pointer ${
                  isDark
                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}
              >
                <span className="text-base">🛡️</span>
                <div>
                  <div className="font-bold leading-tight">Authority</div>
                  <div
                    className={`text-[10px] font-mono leading-none mt-0.5 ${
                      isDark ? 'text-slate-400' : 'text-emerald-600'
                    }`}
                  >
                    authority@...
                  </div>
                </div>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold tracking-wide rounded-xl shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span className="text-white font-bold">Signing in...</span>
              </>
            ) : (
              <span className="text-white font-bold">Sign In</span>
            )}
          </button>
        </form>

        <p className={`mt-5 text-center text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 dark:text-blue-400 font-bold hover:underline ml-1">
            Register
          </Link>
        </p>

        {/* Security & Clearance Footer Badge */}
        <div className={`mt-6 pt-4 border-t flex flex-col items-center gap-1.5 text-center ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-mono font-semibold ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300'
                : 'bg-slate-100 border-slate-300 text-slate-700'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>256-BIT TLS ENCRYPTED NODE</span>
          </div>
          <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>
            Authorized clearance for Citizens, Field Teams &amp; Verification Authorities
          </p>
        </div>
      </div>
    </div>
  );
}
