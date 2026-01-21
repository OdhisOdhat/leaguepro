
import React, { useState } from 'react';
import { UserRole, Team } from '../types';

interface LoginProps {
  teams: Team[];
  onLogin: (role: UserRole, teamId?: string) => void;
  onBack: () => void;
  loginFn: (u: string, p: string) => Promise<{role: UserRole, teamId?: string}>;
}

const API_BASE = 'http://localhost:3001/api';

const Login: React.FC<LoginProps> = ({ teams, onLogin, onBack, loginFn }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState<'manager' | 'admin'>('manager');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isRegistering) {
        if (activeTab === 'admin') throw new Error('Admin registration disabled');
        if (!selectedTeamId) throw new Error('Please select a team');

        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            password,
            role: UserRole.TEAM_MANAGER,
            teamId: selectedTeamId
          })
        });
        
        if (!res.ok) {
           // If registration fails via backend, we simulate local registration for demo purposes
           const localUsers = JSON.parse(localStorage.getItem('lp_local_users') || '[]');
           if (localUsers.some((u: any) => u.username === username)) throw new Error('Username taken');
           
           localUsers.push({ username, password, role: UserRole.TEAM_MANAGER, teamId: selectedTeamId });
           localStorage.setItem('lp_local_users', JSON.stringify(localUsers));
           onLogin(UserRole.TEAM_MANAGER, selectedTeamId);
           return;
        }
        const user = await res.json();
        onLogin(user.role, user.teamId);
      } else {
        // Use the login function from props which handles the fallback
        const user = await loginFn(username, password);
        onLogin(user.role, user.teamId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 animate-in fade-in zoom-in duration-300">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-[2.5rem] shadow-2xl border border-gray-100">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mb-4 text-white">
            <i className={`fas ${isRegistering ? 'fa-user-plus' : 'fa-shield-halved'} text-2xl`}></i>
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">
            {isRegistering ? 'Join LeaguePro' : 'Secure Access'}
          </h2>
          <p className="mt-2 text-sm text-gray-500 font-medium">
            {isRegistering ? 'Create a manager account' : 'Sign in to manage operations'}
          </p>
        </div>

        {!isRegistering && (
          <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
            <button
              onClick={() => setActiveTab('manager')}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${
                activeTab === 'manager' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              Manager
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${
                activeTab === 'admin' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              Admin
            </button>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleAuth}>
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex items-center space-x-2 animate-in shake duration-300">
              <i className="fas fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Username</label>
              <input
                type="text"
                required
                className="w-full rounded-2xl px-5 py-4 border border-gray-200 bg-gray-50 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-bold"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Password</label>
              <input
                type="password"
                required
                className="w-full rounded-2xl px-5 py-4 border border-gray-200 bg-gray-50 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-bold"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {isRegistering && (
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Affiliated Team</label>
                <select
                  required
                  className="w-full rounded-2xl px-5 py-4 border border-gray-200 bg-gray-50 focus:ring-4 focus:ring-blue-50 outline-none font-bold"
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                >
                  <option value="">Select Team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-5 px-4 border border-transparent text-sm font-black rounded-2xl text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50"
          >
            {isLoading ? (
              <i className="fas fa-circle-notch fa-spin"></i>
            ) : (
              <span>{isRegistering ? 'CREATE ACCOUNT' : 'AUTHENTICATE'}</span>
            )}
          </button>

          <div className="flex flex-col space-y-3 pt-2">
            {!isRegistering && activeTab === 'manager' && (
              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                No account? Register as a Manager
              </button>
            )}
            {isRegistering && (
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                Already have an account? Login
              </button>
            )}
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-bold text-gray-400 hover:text-gray-600"
            >
              Back to Dashboard
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
