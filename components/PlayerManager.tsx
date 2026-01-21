
import React, { useState, useRef } from 'react';
import { Player, Team } from '../types';
import { MAX_SQUAD_SIZE } from '../constants';

interface PlayerManagerProps {
  team: Team;
  onUpdate: (players: Player[]) => void;
  onBack: () => void;
  isAdminOverride?: boolean;
}

const PlayerManager: React.FC<PlayerManagerProps> = ({ team, onUpdate, onBack, isAdminOverride }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string>('');
  const [newPlayer, setNewPlayer] = useState<Partial<Player>>({
    name: '',
    jerseyNumber: 1,
    position: 'Goalkeeper',
    age: 33, // Updated default to minimum allowed
    photoUrl: '',
    goals: 0,
    assists: 0,
    appearances: 0
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreviewPhoto(base64String);
        setNewPlayer(prev => ({ ...prev, photoUrl: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const isJerseyTaken = (num: number, excludeId: string | null) => {
    return team.players.some(p => p.jerseyNumber === num && p.id !== excludeId);
  };

  const savePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const jerseyNum = newPlayer.jerseyNumber || 0;
    const playerAge = newPlayer.age || 0;

    // Age Validation: 33 to 75
    if (playerAge < 33 || playerAge > 75) {
      setError(`League Eligibility Error: Players must be between 33 and 75 years old. Current: ${playerAge}`);
      return;
    }

    if (isJerseyTaken(jerseyNum, editingPlayerId)) {
      setError(`Jersey number #${jerseyNum} is already assigned to another player.`);
      return;
    }
    
    if (!editingPlayerId && team.players.length >= MAX_SQUAD_SIZE) {
      setError(`Maximum squad size of ${MAX_SQUAD_SIZE} reached.`);
      return;
    }

    if (editingPlayerId) {
      const updatedPlayers = team.players.map(p => 
        p.id === editingPlayerId 
          ? { ...p, ...newPlayer as Player } 
          : p
      );
      onUpdate(updatedPlayers);
    } else {
      const player: Player = {
        id: `p${Date.now()}`,
        name: newPlayer.name || 'Unknown Player',
        jerseyNumber: jerseyNum,
        position: newPlayer.position || 'Unknown',
        age: playerAge,
        photoUrl: newPlayer.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newPlayer.name}`,
        goals: newPlayer.goals || 0,
        assists: newPlayer.assists || 0,
        appearances: newPlayer.appearances || 0
      };
      onUpdate([...team.players, player]);
    }

    setShowAdd(false);
    setEditingPlayerId(null);
    resetForm();
  };

  const updateSingleStat = (e: React.MouseEvent, playerId: string, field: keyof Player, delta: number) => {
    e.stopPropagation();
    const updatedPlayers = team.players.map(p => {
      if (p.id === playerId) {
        const currentValue = (p[field] as number) || 0;
        return { ...p, [field]: Math.max(0, currentValue + delta) };
      }
      return p;
    });
    onUpdate(updatedPlayers);
  };

  const resetForm = () => {
    setNewPlayer({ name: '', jerseyNumber: 1, position: 'Goalkeeper', age: 33, photoUrl: '', goals: 0, assists: 0, appearances: 0 });
    setPreviewPhoto('');
    setEditingPlayerId(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEditClick = (player: Player) => {
    setNewPlayer(player);
    setPreviewPhoto(player.photoUrl);
    setEditingPlayerId(player.id);
    setError(null);
    setShowAdd(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const removePlayer = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to remove this player from the squad?')) {
      onUpdate(team.players.filter(p => p.id !== id));
      if (editingPlayerId === id) resetForm();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {isAdminOverride && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-center space-x-3">
          <i className="fas fa-user-shield text-amber-600"></i>
          <p className="text-amber-800 text-xs font-black uppercase tracking-widest">Administrative Override Mode: Managing {team.name} Squad</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="bg-white border border-gray-200 p-3 rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-gray-600">
            <i className="fas fa-arrow-left"></i>
          </button>
          <div className="flex items-center space-x-4">
            <img src={team.logo} className="w-16 h-16 rounded-2xl border-4 border-white shadow-md object-cover bg-gray-50" alt="" />
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">{team.name}</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span className="bg-blue-600 text-white px-2 py-0.5 rounded font-black uppercase text-[9px] tracking-widest">Team Manager</span>
                <span className="font-semibold">{team.manager}</span>
              </div>
            </div>
          </div>
        </div>
        <button 
          onClick={() => {
            if (showAdd) resetForm();
            setShowAdd(!showAdd);
          }}
          className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-black transition-all shadow-lg ${
            showAdd ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
          }`}
        >
          <i className={`fas ${showAdd ? 'fa-times' : 'fa-user-plus'}`}></i>
          <span>{showAdd ? 'Cancel' : 'Register New Player'}</span>
        </button>
      </div>

      {/* Squad Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Squad Size</p>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-black text-gray-900">{team.players.length}</span>
            <span className="text-gray-300 font-bold text-sm">/ {MAX_SQUAD_SIZE}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Goals Scored</p>
          <p className="text-2xl font-black text-gray-900">{team.players.reduce((sum, p) => sum + (p.goals || 0), 0)}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Total Assists</p>
          <p className="text-2xl font-black text-gray-900">{team.players.reduce((sum, p) => sum + (p.assists || 0), 0)}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Match Intensity</p>
          <p className="text-2xl font-black text-gray-900">{team.players.reduce((sum, p) => sum + (p.appearances || 0), 0)} <span className="text-[10px] text-gray-300 font-bold uppercase">Apps</span></p>
        </div>
      </div>

      {showAdd && (
        <div ref={formRef} className="bg-white rounded-3xl border border-blue-100 shadow-2xl overflow-hidden animate-in slide-in-from-top-8 duration-300">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white">
            <h3 className="text-2xl font-black tracking-tight">{editingPlayerId ? 'Edit Player Profile' : 'Player Registration'}</h3>
            <p className="text-blue-100 text-sm font-medium opacity-80 mt-1">Official league player licensing and performance tracking.</p>
          </div>
          <form onSubmit={savePlayer} className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center space-x-3 text-red-700 animate-in shake duration-300">
                <i className="fas fa-exclamation-circle text-lg"></i>
                <p className="text-sm font-bold">{error}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="flex flex-col items-center space-y-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-[3/4] bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group relative overflow-hidden"
                >
                  {previewPhoto ? (
                    <img src={previewPhoto} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <div className="text-center p-6">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-300 group-hover:text-blue-500 transition-colors shadow-sm">
                        <i className="fas fa-image text-2xl"></i>
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Player Photo</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-white text-[10px] font-black uppercase tracking-widest">Upload Image</span>
                  </div>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoChange} />
              </div>

              <div className="md:col-span-2 space-y-10">
                <div className="space-y-6">
                  <h4 className="text-[11px] font-black text-gray-400 border-b border-gray-100 pb-2 uppercase tracking-[0.2em]">Identification</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Full Name</label>
                      <input 
                        required
                        className="w-full border border-gray-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-50 outline-none focus:border-blue-400 transition-all font-bold"
                        placeholder="John Doe"
                        value={newPlayer.name}
                        onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Jersey No.</label>
                      <input 
                        type="number"
                        required
                        className="w-full border border-gray-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-50 outline-none focus:border-blue-400 transition-all font-black text-lg"
                        value={newPlayer.jerseyNumber}
                        onChange={e => setNewPlayer({ ...newPlayer, jerseyNumber: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Position</label>
                      <select 
                        className="w-full border border-gray-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-50 outline-none focus:border-blue-400 transition-all font-bold bg-white"
                        value={newPlayer.position}
                        onChange={e => setNewPlayer({ ...newPlayer, position: e.target.value })}
                      >
                        <option>Goalkeeper</option>
                        <option>Defender</option>
                        <option>Midfielder</option>
                        <option>Forward</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Age (33-75)</label>
                      <input 
                        type="number"
                        required
                        min="33"
                        max="75"
                        className="w-full border border-gray-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-50 outline-none focus:border-blue-400 transition-all font-bold"
                        value={newPlayer.age}
                        onChange={e => setNewPlayer({ ...newPlayer, age: parseInt(e.target.value) || 0 })}
                      />
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Players must be age 33-75</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[11px] font-black text-gray-400 border-b border-gray-100 pb-2 uppercase tracking-[0.2em]">Live Season Stats</h4>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100">
                      <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest block mb-2">Goals</label>
                      <input 
                        type="number"
                        min="0"
                        className="w-full bg-transparent font-black text-2xl text-blue-700 outline-none"
                        value={newPlayer.goals}
                        onChange={e => setNewPlayer({ ...newPlayer, goals: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="bg-indigo-50/50 p-4 rounded-3xl border border-indigo-100">
                      <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block mb-2">Assists</label>
                      <input 
                        type="number"
                        min="0"
                        className="w-full bg-transparent font-black text-2xl text-indigo-700 outline-none"
                        value={newPlayer.assists}
                        onChange={e => setNewPlayer({ ...newPlayer, assists: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100">
                      <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-2">Apps</label>
                      <input 
                        type="number"
                        min="0"
                        className="w-full bg-transparent font-black text-2xl text-gray-900 outline-none"
                        value={newPlayer.appearances}
                        onChange={e => setNewPlayer({ ...newPlayer, appearances: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button type="submit" className={`w-full text-white py-5 rounded-3xl font-black text-lg shadow-xl transition-all active:scale-[0.98] ${editingPlayerId ? 'bg-green-600 hover:bg-green-700 shadow-green-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'}`}>
                    {editingPlayerId ? 'Apply Profile Updates' : 'Confirm Registration'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Players Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {team.players.sort((a,b) => (b.goals || 0) - (a.goals || 0)).map(player => (
          <div 
            key={player.id} 
            onClick={() => handleEditClick(player)}
            className={`group bg-white rounded-[2.5rem] shadow-sm border transition-all cursor-pointer relative overflow-hidden flex flex-col ${editingPlayerId === player.id ? 'border-blue-500 ring-8 ring-blue-50 shadow-xl' : 'border-gray-100 hover:shadow-2xl hover:-translate-y-2'}`}
          >
            <div className="aspect-[4/5] bg-gray-50 relative overflow-hidden">
              <img src={player.photoUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={player.name} />
              
              {/* Jersey Badge */}
              <div className="absolute top-6 left-6">
                <div className="bg-white/95 backdrop-blur-md w-12 h-12 rounded-2xl flex items-center justify-center font-black text-gray-900 text-lg border border-white shadow-lg">
                  {player.jerseyNumber}
                </div>
              </div>

              {/* Position Badge */}
              <div className="absolute top-6 right-6">
                <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm border ${
                  player.position === 'Goalkeeper' ? 'bg-amber-400 text-amber-900 border-amber-500' :
                  player.position === 'Defender' ? 'bg-blue-500 text-white border-blue-600' :
                  player.position === 'Midfielder' ? 'bg-green-500 text-white border-green-600' : 
                  'bg-rose-500 text-white border-rose-600'
                }`}>
                  {player.position}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-4">
                <button className="w-12 h-12 bg-white text-blue-600 rounded-2xl flex items-center justify-center shadow-2xl hover:bg-blue-50 transition-colors">
                  <i className="fas fa-pen text-lg"></i>
                </button>
                <button onClick={(e) => removePlayer(e, player.id)} className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-2xl hover:bg-rose-600 transition-colors">
                  <i className="fas fa-trash-alt text-lg"></i>
                </button>
              </div>

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 pt-12">
                <p className="text-white font-black text-xl truncate tracking-tight">{player.name}</p>
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-[0.2em]">{player.age} Years Old</p>
              </div>
            </div>

            {/* Quick-Edit Stats Section */}
            <div className="p-5 bg-white border-t border-gray-100">
              <div className="flex items-center justify-between">
                {/* Goals Quick Edit */}
                <div className="flex-1 flex flex-col items-center">
                  <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter mb-1">Goals</span>
                  <div className="flex items-center space-x-1.5">
                    <button 
                      onClick={(e) => updateSingleStat(e, player.id, 'goals', -1)}
                      className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-blue-500 hover:text-white transition-all text-[8px]"
                    >
                      <i className="fas fa-minus"></i>
                    </button>
                    <span className="text-base font-black text-gray-900 min-w-[12px] text-center">{player.goals || 0}</span>
                    <button 
                      onClick={(e) => updateSingleStat(e, player.id, 'goals', 1)}
                      className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-blue-500 hover:text-white transition-all text-[8px]"
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>
                </div>

                <div className="w-px h-8 bg-gray-100 mx-1"></div>

                {/* Assists Quick Edit */}
                <div className="flex-1 flex flex-col items-center">
                  <span className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter mb-1">Assists</span>
                  <div className="flex items-center space-x-1.5">
                    <button 
                      onClick={(e) => updateSingleStat(e, player.id, 'assists', -1)}
                      className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-indigo-500 hover:text-white transition-all text-[8px]"
                    >
                      <i className="fas fa-minus"></i>
                    </button>
                    <span className="text-base font-black text-gray-900 min-w-[12px] text-center">{player.assists || 0}</span>
                    <button 
                      onClick={(e) => updateSingleStat(e, player.id, 'assists', 1)}
                      className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-indigo-500 hover:text-white transition-all text-[8px]"
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>
                </div>

                <div className="w-px h-8 bg-gray-100 mx-1"></div>

                {/* Apps Quick Edit */}
                <div className="flex-1 flex flex-col items-center">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-1">Apps</span>
                  <div className="flex items-center space-x-1.5">
                    <button 
                      onClick={(e) => updateSingleStat(e, player.id, 'appearances', -1)}
                      className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-800 hover:text-white transition-all text-[8px]"
                    >
                      <i className="fas fa-minus"></i>
                    </button>
                    <span className="text-base font-black text-gray-900 min-w-[12px] text-center">{player.appearances || 0}</span>
                    <button 
                      onClick={(e) => updateSingleStat(e, player.id, 'appearances', 1)}
                      className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-800 hover:text-white transition-all text-[8px]"
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {team.players.length === 0 && !showAdd && (
          <div className="col-span-full py-32 bg-gray-50 border-4 border-dashed border-gray-200 rounded-[3rem] flex flex-col items-center justify-center text-center px-6">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-gray-200 shadow-sm mb-6">
              <i className="fas fa-user-plus text-4xl"></i>
            </div>
            <h4 className="text-2xl font-black text-gray-900 mb-2">Build Your Dynasty</h4>
            <p className="text-gray-400 max-w-sm font-medium">Your squad list is currently empty. Register players to start tracking their season performance and career goals.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerManager;
