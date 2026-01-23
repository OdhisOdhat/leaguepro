
import React, { useState, useRef } from 'react';
import { Player, Team } from '../types.ts';
import { MAX_SQUAD_SIZE } from '../constants.tsx';

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
    age: 33,
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
    if (playerAge < 33 || playerAge > 75) {
      setError(`League Eligibility Error: Players must be between 33 and 75 years old.`);
      return;
    }
    if (isJerseyTaken(jerseyNum, editingPlayerId)) {
      setError(`Jersey number #${jerseyNum} is already assigned.`);
      return;
    }
    if (editingPlayerId) {
      onUpdate(team.players.map(p => p.id === editingPlayerId ? { ...p, ...newPlayer as Player } : p));
    } else {
      onUpdate([...team.players, { ...newPlayer as Player, id: `p${Date.now()}`, photoUrl: newPlayer.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newPlayer.name}` }]);
    }
    setShowAdd(false);
    resetForm();
  };

  const resetForm = () => {
    setNewPlayer({ name: '', jerseyNumber: 1, position: 'Goalkeeper', age: 33, photoUrl: '', goals: 0, assists: 0, appearances: 0 });
    setPreviewPhoto('');
    setEditingPlayerId(null);
  };

  const updateSingleStat = (e: React.MouseEvent, playerId: string, field: keyof Player, delta: number) => {
    e.stopPropagation();
    onUpdate(team.players.map(p => p.id === playerId ? { ...p, [field]: Math.max(0, ((p[field] as number) || 0) + delta) } : p));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="bg-white border border-gray-200 p-3 rounded-xl shadow-sm"><i className="fas fa-arrow-left"></i></button>
          <div className="flex items-center space-x-4">
            <img src={team.logo} className="w-16 h-16 rounded-2xl shadow-md object-cover" alt="" />
            <div><h2 className="text-3xl font-black">{team.name}</h2><p className="text-xs font-bold text-gray-500">{team.manager}</p></div>
          </div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black">{showAdd ? 'Cancel' : 'Add Player'}</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {team.players.map(player => (
          <div key={player.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-4">
             <div className="aspect-square rounded-2xl overflow-hidden mb-4"><img src={player.photoUrl} className="w-full h-full object-cover" alt="" /></div>
             <p className="font-black text-lg">{player.name}</p>
             <p className="text-[10px] uppercase font-bold text-blue-600 mb-4">#{player.jerseyNumber} • {player.position}</p>
             <div className="flex justify-between items-center bg-gray-50 rounded-xl p-2">
                <div className="text-center">
                   <p className="text-[8px] font-black text-gray-400 uppercase">Goals</p>
                   <p className="font-black">{player.goals || 0}</p>
                </div>
                <div className="flex space-x-1">
                   <button onClick={(e) => updateSingleStat(e, player.id, 'goals', 1)} className="w-6 h-6 bg-blue-100 text-blue-600 rounded-lg"><i className="fas fa-plus text-[10px]"></i></button>
                   <button onClick={(e) => updateSingleStat(e, player.id, 'goals', -1)} className="w-6 h-6 bg-gray-100 text-gray-400 rounded-lg"><i className="fas fa-minus text-[10px]"></i></button>
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerManager;
