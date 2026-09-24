import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-gray-400 mt-1">Welcome to the Disaster Response Coordination Hub</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-3">
        <h2 className="text-lg font-semibold text-gray-200">Your Profile</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <span className="text-gray-500">User ID</span>
          <span className="font-mono text-gray-300 break-all">{user?.id}</span>
          <span className="text-gray-500">Email</span>
          <span className="text-gray-300">{user?.email}</span>
          <span className="text-gray-500">Display Name</span>
          <span className="text-gray-300">{user?.displayName || '—'}</span>
          <span className="text-gray-500">Roles</span>
          <span className="text-emerald-400 font-mono">{user?.roles.join(', ')}</span>
        </div>
      </div>

      <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6 text-center">
        <p className="text-gray-500 text-sm">
          Phase 1 Foundation — Authentication is working. Incident reporting will be available in Phase 2.
        </p>
      </div>
    </div>
  );
}
