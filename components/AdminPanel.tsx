
import React, { useState, useRef } from 'react';
import { Team, Match, GoalScorer, LeagueSettings } from '../types.ts';

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
  dbLogs?: string[];
  onForceSync?: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  teams, leagueSettings, onUpdateLeagueSettings, onUpdateTeam, onManageSquad, onReset, dbLogs, onForceSync 
}) => {
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [settingsForm, setSettingsForm] = useState<LeagueSettings>(leagueSettings);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    branding: true,
    cloud: true,
    members: true
  });
  
  const toggleSection = (section: string) => setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));

  const SectionHeader: React.FC<{ title: string; icon: string; sectionKey: string }> = ({ title, icon, sectionKey }) => (
    <div className="flex justify-between items-center cursor-pointer group mb-4" onClick={() => toggleSection(sectionKey)}>
      <h3 className="text-xl font-black text-gray-900 flex items-center tracking-tight">
        <i className={`fas ${icon} mr-3 text-blue-600`}></i>
        {title}
      </h3>
      <div className={`text-gray-300 transition-all ${expandedSections[sectionKey] ? 'rotate-180' : ''}`}>
        <i className="fas fa-chevron-down"></i>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500 max-w-5xl mx-auto">
      {/* Cloud Management Section */}
      <div className="bg-indigo-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
        <SectionHeader title="Turso Cloud Management" icon="fa-cloud" sectionKey="cloud" />
        {expandedSections.cloud && (
          <div className="space-y-6 animate-in slide-in-from-top-2">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <button 
                onClick={onForceSync}
                className="bg-white text-indigo-900 px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-indigo-50 transition-all flex items-center space-x-2 shadow-lg"
              >
                <i className="fas fa-sync-alt"></i>
                <span>Force Push to Cloud</span>
              </button>
              <p className="text-indigo-200 text-xs font-medium max-w-md">
                Manually push all local data to Turso. Use this to seed your cloud database or fix synchronization gaps.
              </p>
            </div>
            
            <div className="bg-black/20 rounded-2xl p-4 border border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-3">Cloud Transaction Log</p>
              <div className="space-y-1.5 h-40 overflow-y-auto custom-scrollbar font-mono text-[11px]">
                {dbLogs?.map((log, i) => (
                  <div key={i} className="text-indigo-100 border-l border-indigo-500/30 pl-3 py-0.5">
                    {log}
                  </div>
                ))}
                {(!dbLogs || dbLogs.length === 0) && <p className="text-indigo-400 italic">Listening for database transactions...</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* League Identity Section */}
      <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl">
        <SectionHeader title="League Identity" icon="fa-id-card" sectionKey="branding" />
        {expandedSections.branding && (
          <form onSubmit={(e) => { e.preventDefault(); onUpdateLeagueSettings(settingsForm); alert('Settings Saved'); }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">League Name</label>
                <input required className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-2.5 font-bold outline-none focus:ring-2 focus:ring-blue-500" value={settingsForm.name} onChange={e => setSettingsForm({...settingsForm, name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Season</label>
                <input required className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-2.5 font-bold outline-none focus:ring-2 focus:ring-blue-500" value={settingsForm.season} onChange={e => setSettingsForm({...settingsForm, season: e.target.value})} />
              </div>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">Update Identity</button>
          </form>
        )}
      </div>

      {/* Teams Management */}
      <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl">
        <SectionHeader title={`Manage Teams (${teams.length})`} icon="fa-shield-alt" sectionKey="members" />
        {expandedSections.members && (
          <div className="space-y-3">
            {teams.map(team => (
              <div key={team.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-md transition-all group border border-transparent hover:border-blue-50">
                <div className="flex items-center space-x-4">
                  <img src={team.logo} className="w-12 h-12 rounded-xl object-cover shadow-sm bg-white" alt="" />
                  <div>
                    <p className="font-black text-gray-900 leading-none mb-1">{team.name}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">{team.manager} • {team.players.length} Players</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => setEditingTeam(team)} className="p-3 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"><i className="fas fa-edit"></i></button>
                  <button onClick={() => onManageSquad(team.id)} className="p-3 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-colors"><i className="fas fa-users"></i></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-center pt-10">
        <button onClick={onReset} className="text-red-400 hover:text-red-600 text-xs font-black uppercase tracking-widest">
          <i className="fas fa-trash-alt mr-2"></i> Reset Local Data
        </button>
      </div>

      {editingTeam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden p-8">
            <h3 className="text-2xl font-black mb-6">Edit Team: {editingTeam.name}</h3>
            <div className="space-y-4">
              <input className="w-full p-4 border rounded-2xl font-bold" value={editingTeam.name} onChange={e => setEditingTeam({...editingTeam, name: e.target.value})} placeholder="Team Name" />
              <input className="w-full p-4 border rounded-2xl font-bold" value={editingTeam.manager} onChange={e => setEditingTeam({...editingTeam, manager: e.target.value})} placeholder="Manager" />
              <button onClick={() => { onUpdateTeam?.(editingTeam); setEditingTeam(null); }} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase tracking-widest shadow-lg">Save Changes</button>
              <button onClick={() => setEditingTeam(null)} className="w-full text-gray-400 font-bold py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
