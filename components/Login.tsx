
import React, { useState } from 'https://esm.sh/react@19.0.0';
import { UserRole, Team } from '../types.ts';

interface LoginProps {
  teams: Team[];
  onLogin: (role: UserRole, teamId?: string) => void;
  onBack: () => void;
  loginFn: (u: string, p: string) => Promise<{role: UserRole, teamId?: string}>;
}

const API_BASE = '/api';

const Login: React.FC<LoginProps> = ({ teams, onLogin, onBack, loginFn }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState<'manager' | 'admin'>('manager');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);
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
           const localUsers = JSON.parse(localStorage.getItem('lp_local_users_v2') || '[]');
           if (localUsers.some((u: any) => u.username === username)) throw new Error('Username taken');
           
           const newUser = { username, password, role: UserRole.TEAM_MANAGER, teamId: selectedTeamId };
           localUsers.push(newUser);
           localStorage.setItem('lp_local_users_v2', JSON.stringify(localUsers));
           onLogin(UserRole.TEAM_MANAGER, selectedTeamId);
           return;
        }
        const user = await res.json();
        onLogin(user.role, user.teamId);
      } else {
        const user = await loginFn(username, password);
        onLogin(user.role, user.teamId);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: 'google' | 'facebook') => {
    setSocialLoading(provider);
    setError('');
    
    setTimeout(() => {
      setSocialLoading(null);
      onLogin(UserRole.GUEST);
    }, 800);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 animate-in fade-in zoom-in duration-300">
      <div className="max-w-md w-full space-y-8 bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-gray-100">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mb-4 text-white">
            <i className={`fas ${isRegistering ? 'fa-user-plus' : 'fa-shield-halved'} text-2xl`}></i>
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">
            {isRegistering ? 'Join LeaguePro' : 'Secure Access'}
          </h2>
          <p className="mt-2 text-sm text-gray-500 font-medium">
            {isRegistering ? 'Create an account to participate' : 'Sign in to manage operations'}
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            disabled={!!socialLoading || isLoading}
            onClick={() => handleSocialLogin('google')}
            className="w-full flex items-center justify-center space-x-3 py-3.5 border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all font-bold text-gray-700 shadow-sm active:scale-[0.98] disabled:opacity-50"
          >
            {socialLoading === 'google' ? (
              <i className="fas fa-circle-notch fa-spin text-gray-400"></i>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            <span className="text-xs uppercase tracking-widest">Continue with Google</span>
          </button>
          
          <button
            type="button"
            disabled={!!socialLoading || isLoading}
            onClick={() => handleSocialLogin('facebook')}
            className="w-full flex items-center justify-center space-x-3 py-3.5 bg-[#1877F2] hover:bg-[#166fe5] rounded-2xl transition-all font-bold text-white shadow-lg shadow-blue-100 active:scale-[0.98] disabled:opacity-50"
          >
            {socialLoading === 'facebook' ? (
              <i className="fas fa-circle-notch fa-spin"></i>
            ) : (
              <i className="fab fa-facebook text-lg"></i>
            )}
            <span className="text-xs uppercase tracking-widest">Continue with Facebook</span>
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100"></div>
          </div>
          <div className="relative flex justify-center text-[10px] font-black uppercase">
            <span className="px-4 bg-white text-gray-300 tracking-widest">Or Use Email</span>
          </div>
        </div>

        {!isRegistering && (
          <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
            <button
              onClick={() => setActiveTab('manager')}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                activeTab === 'manager' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              Manager
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
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
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Username / Email</label>
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
              <div className="animate-in slide-in-from-top-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Affiliated Team</label>
                <select
                  required
                  className="w-full rounded-2xl px-5 py-4 border border-gray-200 bg-gray-50 focus:ring-4 focus:ring-blue-50 outline-none font-bold bg-white"
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
            disabled={isLoading || !!socialLoading}
            className="w-full flex justify-center py-5 px-4 border border-transparent text-sm font-black rounded-2xl text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50"
          >
            {isLoading ? (
              <i className="fas fa-circle-notch fa-spin text-xl"></i>
            ) : (
              <span className="tracking-widest">{isRegistering ? 'CREATE ACCOUNT' : 'AUTHENTICATE'}</span>
            )}
          </button>

          <div className="flex flex-col space-y-3 pt-2 text-center">
            {!isRegistering && activeTab === 'manager' && (
              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest"
              >
                No account? Register as Manager
              </button>
            )}
            {isRegistering && (
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest"
              >
                Already registered? Login
              </button>
            )}
            <button
              type="button"
              onClick={onBack}
              className="text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest"
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
