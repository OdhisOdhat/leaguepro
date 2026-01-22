
import React, { useState, useEffect, useRef } from 'react';
import { Team, Match, GoalScorer, UserRole, LeagueSettings } from '../types';
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
  leagueSettings: LeagueSettings;
  onUpdateLeagueSettings: (settings: LeagueSettings) => void;
  onUpdateMatch: (id: string, h: number, a: number, scorers?: GoalScorer[], cards?: any[], refereeName?: string) => void;
  onUpdateTeam?: (updatedTeam: Team) => void;
  onRegisterTeam: (team: Omit<Team, 'id' | 'players'>) => void;
  onManageSquad: (teamId: string) => void;
  onReset: () => void;
  onImportState: (data: any) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  teams, 
  matches, 
  leagueSettings, 
  onUpdateLeagueSettings, 
  onUpdateMatch, 
  onUpdateTeam, 
  onRegisterTeam, 
  onManageSquad, 
  onReset, 
  onImportState 
}) => {
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [staff, setStaff] = useState<User[]>([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ username: '', password: '', role: UserRole.TEAM_MANAGER, teamId: '' });
  
  // Collapsible state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    branding: true,
    data: false,
    members: true,
    staff: true,
    history: true
  });

  const [settingsForm, setSettingsForm] = useState<LeagueSettings>(leagueSettings);
  const [logoPreview, setLogoPreview] = useState(leagueSettings.logo);
  
  const importFileRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const localUsers = JSON.parse(localStorage.getItem('lp_local_users_v2') || '[]');
    const allStaff = [
      { id: 'u-admin', username: 'admin', role: UserRole.ADMIN },
      ...localUsers
    ];
    setStaff(allStaff);
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogoPreview(base64);
        setSettingsForm(prev => ({ ...prev, logo: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateLeagueSettings(settingsForm);
    alert('League configuration updated successfully!');
  };

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
      const localUsers = JSON.parse(localStorage.getItem('lp_local_users_v2') || '[]');
      const updated = localUsers.filter((u: any) => u.username !== userId && u.id !== userId);
      localStorage.setItem('lp_local_users_v2', JSON.stringify(updated));
      setStaff(prev => prev.filter(u => u.id !== userId && u.username !== userId));
    }
  };

  const addStaff = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `u-${Date.now()}`;
    const newUser = { ...newStaff, id };
    
    const localUsers = JSON.parse(localStorage.getItem('lp_local_users_v2') || '[]');
    localUsers.push(newUser);
    localStorage.setItem('lp_local_users_v2', JSON.stringify(localUsers));
    
    setStaff(prev => [...prev, newUser]);
    setShowAddStaff(false);
    setNewStaff({ username: '', password: '', role: UserRole.TEAM_MANAGER, teamId: '' });
  };

  const exportLeagueData = () => {
    const backup = {
      timestamp: new Date().toISOString(),
      teams,
      matches,
      settings: leagueSettings,
      users: JSON.parse(localStorage.getItem('lp_local_users_v2') || '[]')
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leaguepro-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (confirm('Importing will overwrite current local league data. Continue?')) {
            onImportState(data);
          }
        } catch (err) {
          alert('Invalid backup file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const SectionHeader: React.FC<{ title: string; icon: string; sectionKey: string }> = ({ title, icon, sectionKey }) => (
    <div 
      className="flex justify-between items-center cursor-pointer group mb-4"
      onClick={() => toggleSection(sectionKey)}
    >
      <h3 className="text-xl font-black text-gray-900 flex items-center tracking-tight">
        <i className={`fas ${icon} mr-3 text-blue-600 transition-transform group-hover:scale-110`}></i>
        {title}
      </h3>
      <div className={`text-gray-300 group-hover:text-blue-500 transition-all ${expandedSections[sectionKey] ? 'rotate-180' : ''}`}>
        <i className="fas fa-chevron-down"></i>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500 max-w-5xl mx-auto px-2">
      
      {/* 1. League Branding & Settings - Reordered: Fields first, Logo last */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden">
        <SectionHeader title="League Identity" icon="fa-id-card" sectionKey="branding" />
        
        {expandedSections.branding && (
          <form onSubmit={handleSaveSettings} className="animate-in slide-in-from-top-2 duration-300 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">League Name</label>
                <input 
                  required
                  className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={settingsForm.name}
                  onChange={e => setSettingsForm({...settingsForm, name: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Season</label>
                <input 
                  required
                  className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={settingsForm.season}
                  onChange={e => setSettingsForm({...settingsForm, season: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Welcome Message</label>
              <textarea 
                rows={3}
                className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                value={settingsForm.description}
                onChange={e => setSettingsForm({...settingsForm, description: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">League Branding (Logo)</label>
              <div className="flex items-center space-x-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div 
                  onClick={() => logoInputRef.current?.click()}
                  className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group overflow-hidden relative shadow-sm"
                >
                  {logoPreview ? (
                    <img src={logoPreview} className="w-full h-full object-contain p-2" alt="League Logo" />
                  ) : (
                    <div className="text-center p-2">
                      <i className="fas fa-camera text-xl text-gray-300 mb-1"></i>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Add Logo</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-white text-[9px] font-black uppercase">Upload</span>
                  </div>
                </div>
                <div className="flex-1 text-xs text-gray-500 font-medium">
                  <p className="font-bold text-gray-700 mb-1">Upload Your Badge</p>
                  <p>Transparent PNG or JPG recommended. Max size 2MB.</p>
                  <button 
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="mt-2 text-blue-600 font-black uppercase text-[9px] tracking-widest hover:text-blue-800"
                  >
                    Select File
                  </button>
                </div>
                <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98]"
            >
              Update League Identity
            </button>
          </form>
        )}
      </div>

      {/* 2. Data & Persistence */}
      <div className="bg-indigo-900 rounded-[2rem] p-6 text-white shadow-2xl relative overflow-hidden transition-all">
        <div className="flex justify-between items-center cursor-pointer mb-2" onClick={() => toggleSection('data')}>
          <div className="flex items-center space-x-3">
             <i className="fas fa-database text-indigo-400"></i>
             <h3 className="text-lg font-black uppercase tracking-tight">Data Integrity</h3>
          </div>
          <div className={`text-indigo-400 transition-all ${expandedSections.data ? 'rotate-180' : ''}`}>
            <i className="fas fa-chevron-down"></i>
          </div>
        </div>
        
        {expandedSections.data && (
          <div className="relative z-10 space-y-4 animate-in slide-in-from-top-2 duration-300">
            <p className="text-indigo-200 text-[11px] font-medium max-w-lg leading-relaxed">
              Managing local persistence. Export your league regularly to ensure data safety across devices.
            </p>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={exportLeagueData}
                className="bg-white text-indigo-900 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center space-x-2"
              >
                <i className="fas fa-download"></i>
                <span>Export JSON</span>
              </button>
              <button 
                onClick={() => importFileRef.current?.click()}
                className="bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center space-x-2 border border-indigo-400"
              >
                <i className="fas fa-upload"></i>
                <span>Import JSON</span>
              </button>
              <input type="file" ref={importFileRef} className="hidden" accept=".json" onChange={handleImport} />
              
              <button 
                onClick={onReset}
                className="ml-auto bg-red-500/20 text-red-100 border border-red-500/30 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 transition-all"
              >
                Factory Reset
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 3. Team Management */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <SectionHeader title={`Active Teams (${teams.length})`} icon="fa-shield-alt" sectionKey="members" />
            <button 
              onClick={() => setShowRegisterModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[9px] font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all uppercase tracking-widest -mt-4"
            >
              Add Team
            </button>
          </div>
          
          {expandedSections.members && (
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-2 custom-scrollbar animate-in slide-in-from-top-2 duration-300">
              {teams.map(team => (
                <div key={team.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-md transition-all group border border-transparent hover:border-blue-50">
                  <div className="flex items-center space-x-3">
                    <img src={team.logo} className="w-10 h-10 rounded-xl object-cover shadow-sm bg-white" alt="" />
                    <div>
                      <p className="font-black text-gray-900 text-xs leading-none mb-1">{team.name}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">{team.manager} • {team.players.length} Squad</p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button onClick={() => setEditingTeam(team)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><i className="fas fa-edit text-xs"></i></button>
                    <button onClick={() => onManageSquad(team.id)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"><i className="fas fa-users text-xs"></i></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Staffing Controls */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <SectionHeader title="Staff Access" icon="fa-user-lock" sectionKey="staff" />
            <button 
              onClick={() => setShowAddStaff(true)}
              className="bg-indigo-50 text-indigo-600 p-2 rounded-lg hover:bg-indigo-600 hover:text-white transition-all -mt-4"
            >
              <i className="fas fa-plus text-xs"></i>
            </button>
          </div>

          {expandedSections.staff && (
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-2 custom-scrollbar animate-in slide-in-from-top-2 duration-300">
              {staff.map(user => {
                const userTeam = teams.find(t => t.id === user.teamId);
                return (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-indigo-50/20 rounded-2xl border border-indigo-50/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-indigo-500 shadow-sm">
                        <i className={`fas ${user.role === UserRole.ADMIN ? 'fa-user-shield text-xs' : 'fa-user-tie text-xs'}`}></i>
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-xs leading-none mb-1">{user.username}</p>
                        <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">
                          {user.role === UserRole.ADMIN ? 'Admin' : userTeam?.name || 'Manager'}
                        </span>
                      </div>
                    </div>
                    {user.id !== 'u-admin' && (
                      <button onClick={() => removeStaff(user.id)} className="text-red-300 hover:text-red-500 p-2 transition-colors"><i className="fas fa-user-minus text-xs"></i></button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. Match History Overrides */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm lg:col-span-2">
          <SectionHeader title="Result Overrides" icon="fa-history" sectionKey="history" />
          
          {expandedSections.history && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[340px] overflow-y-auto pr-2 custom-scrollbar animate-in slide-in-from-top-2 duration-300">
              {matches.filter(m => m.isCompleted).length > 0 ? (
                matches.filter(m => m.isCompleted).map(match => (
                  <div key={match.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase">
                      <span className="text-blue-500">Week {match.matchWeek}</span>
                      <input 
                        type="text"
                        placeholder="Assign Referee..."
                        className="bg-white border border-gray-100 rounded px-2 py-1 outline-none text-[9px] w-24 text-right"
                        defaultValue={match.refereeName}
                        onBlur={(e) => onUpdateMatch(match.id, match.homeScore || 0, match.awayScore || 0, undefined, undefined, e.target.value)}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-gray-900 truncate text-[11px] w-1/3 text-right">{teams.find(t => t.id === match.homeTeamId)?.name}</p>
                      <div className="flex space-x-2 items-center px-4">
                        <input type="number" min="0" className="w-9 text-center bg-white rounded border border-gray-200 font-black py-1 text-xs" defaultValue={match.homeScore} onBlur={(e) => onUpdateMatch(match.id, parseInt(e.target.value) || 0, match.awayScore || 0)} />
                        <span className="text-gray-300">-</span>
                        <input type="number" min="0" className="w-9 text-center bg-white rounded border border-gray-200 font-black py-1 text-xs" defaultValue={match.awayScore} onBlur={(e) => onUpdateMatch(match.id, match.homeScore || 0, parseInt(e.target.value) || 0)} />
                      </div>
                      <p className="font-bold text-gray-900 truncate text-[11px] w-1/3">{teams.find(t => t.id === match.awayTeamId)?.name}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-10 text-gray-300 italic text-xs">No completed matches found.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODALS (Kept as modals for focus) */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
            <TeamRegistration 
              existingNames={teams.map(t => t.name)}
              onRegister={(t) => { onRegisterTeam(t); setShowRegisterModal(false); }}
              onCancel={() => setShowRegisterModal(false)}
            />
          </div>
        </div>
      )}

      {showAddStaff && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 space-y-6">
            <h3 className="text-2xl font-black text-gray-900">Add League Staff</h3>
            <form onSubmit={addStaff} className="space-y-4">
              <input 
                required
                className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Username"
                value={newStaff.username}
                onChange={e => setNewStaff({...newStaff, username: e.target.value})}
              />
              <input 
                required
                type="password"
                className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Password"
                value={newStaff.password}
                onChange={e => setNewStaff({...newStaff, password: e.target.value})}
              />
              <select 
                className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                value={newStaff.teamId}
                onChange={e => setNewStaff({...newStaff, teamId: e.target.value})}
              >
                <option value="">Full Admin (No Team)</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <div className="flex space-x-3 pt-4">
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100">Admit Staff</button>
                <button type="button" onClick={() => setShowAddStaff(false)} className="px-6 bg-gray-100 text-gray-500 py-3 rounded-xl font-bold uppercase text-xs">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingTeam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
            <TeamRegistration 
              initialData={editingTeam}
              existingNames={teams.map(t => t.name)}
              onRegister={handleTeamOverride}
              onCancel={() => setEditingTeam(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
