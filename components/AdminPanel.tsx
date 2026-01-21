
import React, { useState, useEffect } from 'react';
import { Team, Match, GoalScorer, UserRole } from '../types';
import TeamRegistration from './TeamRegistration';

interface User {
  id: string;
  username: string;
  role: UserRole;
  teamId?: string;
}

interface AdminPanelProps {
  teams: Team[];
  matches: Match[];
  onUpdateMatch: (id: string, h: number, a: number, scorers?: GoalScorer[]) => void;
  onUpdateTeam?: (updatedTeam: Team) => void;
  onRegisterTeam: (team: Omit<Team, 'id' | 'players'>) => void;
  onManageSquad: (teamId: string) => void;
  onReset: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ teams, matches, onUpdateMatch, onUpdateTeam, onRegisterTeam, onManageSquad, onReset }) => {
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [staff, setStaff] = useState<User[]>([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ username: '', password: '', role: UserRole.TEAM_MANAGER, teamId: '' });

  // Fetch staff from local storage as a fallback for the demo/offline mode
  useEffect(() => {
    const localUsers = JSON.parse(localStorage.getItem('lp_local_users') || '[]');
    // Adding the default admin if not present
    const allStaff = [
      { id: 'u-admin', username: 'admin', role: UserRole.ADMIN },
      ...localUsers
    ];
    setStaff(allStaff);
  }, []);

  const handleTeamOverride = (updatedData: Omit<Team, 'id' | 'players'>) => {
    if (editingTeam && onUpdateTeam) {
      const fullUpdatedTeam: Team = {
        ...editingTeam,
        ...updatedData
      };
      onUpdateTeam(fullUpdatedTeam);
      setEditingTeam(null);
    }
  };

  const removeStaff = (userId: string) => {
    if (userId === 'u-admin') return alert("Cannot remove the primary system administrator.");
    if (confirm('Are you sure you want to revoke access for this user?')) {
      const localUsers = JSON.parse(localStorage.getItem('lp_local_users') || '[]');
      const updated = localUsers.filter((u: any) => u.username !== userId && u.id !== userId);
      localStorage.setItem('lp_local_users', JSON.stringify(updated));
      setStaff(prev => prev.filter(u => u.id !== userId && u.username !== userId));
    }
  };

  const addStaff = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `u-${Date.now()}`;
    const newUser = { ...newStaff, id };
    
    const localUsers = JSON.parse(localStorage.getItem('lp_local_users') || '[]');
    localUsers.push(newUser);
    localStorage.setItem('lp_local_users', JSON.stringify(localUsers));
    
    setStaff(prev => [...prev, newUser]);
    setShowAddStaff(false);
    setNewStaff({ username: '', password: '', role: UserRole.TEAM_MANAGER, teamId: '' });
  };

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-500">
      {/* Critical System Controls */}
      <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="bg-red-100 p-3 rounded-full">
            <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
          </div>
          <div>
            <h3 className="text-lg font-black text-red-900 uppercase tracking-tight">System Reset</h3>
            <p className="text-red-700 text-sm">Clear all data and return to initial competition state.</p>
          </div>
        </div>
        <button 
          onClick={() => { if(confirm('CAUTION: This will erase all results and custom teams. Proceed?')) onReset(); }}
          className="bg-white text-red-600 border border-red-200 px-8 py-3 rounded-xl font-black hover:bg-red-600 hover:text-white transition-all shadow-sm text-xs uppercase tracking-widest"
        >
          Reset Season Data
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Team Oversight List */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-gray-900 flex items-center">
              <i className="fas fa-shield-alt mr-3 text-blue-600"></i>
              Active Members ({teams.length})
            </h3>
            <button 
              onClick={() => setShowRegisterModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all uppercase tracking-widest"
            >
              Add New Team
            </button>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {teams.map(team => (
              <div key={team.id} className="flex flex-col p-4 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-md hover:ring-1 hover:ring-blue-100 transition-all group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <img src={team.logo} className="w-12 h-12 rounded-xl border-2 border-white shadow-sm object-cover" alt="" />
                    </div>
                    <div>
                      <p className="font-black text-gray-900 leading-tight">{team.name}</p>
                      <div className="flex items-center space-x-2 text-[10px] font-bold text-gray-400 uppercase tracking-tight mt-1">
                        <span>{team.manager}</span>
                        <span className="text-gray-200">•</span>
                        <span>{team.players.length} Squad</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setEditingTeam(team)}
                      className="bg-white text-blue-600 px-3 py-1.5 rounded-lg text-[9px] font-black shadow-sm border border-gray-100 hover:bg-blue-50 transition-all uppercase tracking-widest"
                    >
                      Profile
                    </button>
                    <button 
                      onClick={() => onManageSquad(team.id)}
                      className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black shadow-sm hover:bg-blue-700 transition-all uppercase tracking-widest"
                    >
                      Squad
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Staff Management */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-gray-900 flex items-center">
              <i className="fas fa-user-lock mr-3 text-indigo-600"></i>
              Staff & Access
            </h3>
            <button 
              onClick={() => setShowAddStaff(true)}
              className="bg-indigo-50 text-indigo-600 p-2 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
            >
              <i className="fas fa-plus"></i>
            </button>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar flex-1">
            {staff.map(user => {
              const userTeam = teams.find(t => t.id === user.teamId);
              return (
                <div key={user.id} className="flex items-center justify-between p-4 bg-indigo-50/30 rounded-2xl border border-indigo-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-500 shadow-sm">
                      <i className={`fas ${user.role === UserRole.ADMIN ? 'fa-user-shield' : 'fa-user-tie'}`}></i>
                    </div>
                    <div>
                      <p className="font-black text-gray-900 text-sm leading-none">{user.username}</p>
                      <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">
                        {user.role === UserRole.ADMIN ? 'System Administrator' : userTeam?.name || 'Unassigned Manager'}
                      </span>
                    </div>
                  </div>
                  {user.id !== 'u-admin' && (
                    <button 
                      onClick={() => removeStaff(user.id)}
                      className="text-red-400 hover:text-red-600 p-2 transition-colors"
                    >
                      <i className="fas fa-user-minus"></i>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Result Management */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm lg:col-span-2">
          <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center">
            <i className="fas fa-history mr-3 text-blue-600"></i>
            Match History Overrides
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {matches.filter(m => m.isCompleted).length > 0 ? (
              matches.filter(m => m.isCompleted).map(match => (
                <div key={match.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md uppercase">Match Week {match.matchWeek}</span>
                    <span className="text-[10px] font-bold text-gray-400">ID: {match.id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="w-1/3 text-right">
                      <p className="font-bold text-gray-900 truncate text-xs">{teams.find(t => t.id === match.homeTeamId)?.name}</p>
                    </div>
                    <div className="flex space-x-2 items-center px-4">
                      <input 
                        type="number" 
                        min="0"
                        className="w-10 text-center border-2 border-white bg-white rounded-lg font-black py-1 shadow-sm focus:ring-2 focus:ring-blue-400 outline-none text-xs" 
                        defaultValue={match.homeScore} 
                        onBlur={(e) => onUpdateMatch(match.id, parseInt(e.target.value) || 0, match.awayScore || 0)}
                      />
                      <span className="font-black text-gray-300">-</span>
                      <input 
                        type="number" 
                        min="0"
                        className="w-10 text-center border-2 border-white bg-white rounded-lg font-black py-1 shadow-sm focus:ring-2 focus:ring-blue-400 outline-none text-xs" 
                        defaultValue={match.awayScore} 
                        onBlur={(e) => onUpdateMatch(match.id, match.homeScore || 0, parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="w-1/3 text-left">
                      <p className="font-bold text-gray-900 truncate text-xs">{teams.find(t => t.id === match.awayTeamId)?.name}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-20 text-gray-400 border-2 border-dashed border-gray-100 rounded-[2.5rem]">
                <i className="fas fa-file-invoice text-4xl mb-3 opacity-20"></i>
                <p className="text-sm font-medium">No results recorded to override yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Register Team Modal (For Admin Use) */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300 my-8">
            <div className="relative">
              <TeamRegistration 
                existingNames={teams.map(t => t.name)}
                onRegister={(t) => { onRegisterTeam(t); setShowRegisterModal(false); }}
                onCancel={() => setShowRegisterModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaff && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 space-y-6">
            <h3 className="text-2xl font-black text-gray-900">Admit New Staff</h3>
            <form onSubmit={addStaff} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Username</label>
                <input 
                  required
                  className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newStaff.username}
                  onChange={e => setNewStaff({...newStaff, username: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Initial Password</label>
                <input 
                  required
                  type="password"
                  className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newStaff.password}
                  onChange={e => setNewStaff({...newStaff, password: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Associated Team</label>
                <select 
                  className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newStaff.teamId}
                  onChange={e => setNewStaff({...newStaff, teamId: e.target.value})}
                >
                  <option value="">No Team (Admin Only)</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100">Confirm Admission</button>
                <button type="button" onClick={() => setShowAddStaff(false)} className="px-6 bg-gray-100 text-gray-500 py-3 rounded-xl font-bold uppercase text-xs">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Team Profile Override Modal */}
      {editingTeam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300 my-8">
            <div className="relative">
              <TeamRegistration 
                initialData={editingTeam}
                existingNames={teams.map(t => t.name)}
                onRegister={handleTeamOverride}
                onCancel={() => setEditingTeam(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
