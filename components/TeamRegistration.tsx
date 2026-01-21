
import React, { useState, useRef, useEffect } from 'react';
import { Team } from '../types';

interface TeamRegistrationProps {
  onRegister: (team: Omit<Team, 'id' | 'players'>) => void;
  existingNames: string[];
  initialData?: Team; // Optional prop to enable "Edit Mode"
  onCancel?: () => void;
}

const TeamRegistration: React.FC<TeamRegistrationProps> = ({ onRegister, existingNames, initialData, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    manager: '',
    contact: '',
    homeGround: '',
    logo: ''
  });
  const [error, setError] = useState('');
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!initialData;

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        manager: initialData.manager,
        contact: initialData.contact,
        homeGround: initialData.homeGround,
        logo: initialData.logo
      });
      setPreviewLogo(initialData.logo);
    }
  }, [initialData]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Logo file size must be under 2MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreviewLogo(base64String);
        setFormData(prev => ({ ...prev, logo: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for duplicate names, but ignore if it's the current team's name in edit mode
    const isDuplicate = existingNames.some(name => 
      name.toLowerCase() === formData.name.toLowerCase() && 
      (!isEditMode || name.toLowerCase() !== initialData?.name.toLowerCase())
    );

    if (isDuplicate) {
      setError('Team name already exists!');
      return;
    }
    setError('');
    
    const finalLogo = formData.logo || `https://picsum.photos/seed/${formData.name.replace(/\s+/g, '')}/200/200`;
    
    onRegister({
      ...formData,
      logo: finalLogo
    });
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
        <div className="text-center mb-10">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${isEditMode ? 'bg-indigo-600 shadow-indigo-200' : 'bg-blue-600 shadow-blue-200'}`}>
            <i className={`fas ${isEditMode ? 'fa-user-edit' : 'fa-users-cog'} text-white text-3xl`}></i>
          </div>
          <h2 className="text-3xl font-black text-gray-900">
            {isEditMode ? 'Update Team Profile' : 'Register Your Team'}
          </h2>
          <p className="text-gray-500 mt-2">
            {isEditMode ? 'Maintain your organization and leadership details.' : 'Join the elite competition today.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Logo Upload Section */}
          <div className="flex flex-col items-center">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Team Identity (Logo)</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group relative w-32 h-32 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all overflow-hidden shadow-inner"
            >
              {previewLogo ? (
                <img src={previewLogo} className="w-full h-full object-cover" alt="Preview" />
              ) : (
                <div className="text-center p-2">
                  <i className="fas fa-cloud-upload-alt text-2xl text-gray-300 group-hover:text-blue-500 transition-colors mb-1"></i>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Upload Logo</p>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-white text-[10px] font-black uppercase">Change Image</span>
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleLogoChange} 
            />
            {!isEditMode && <p className="text-[10px] text-gray-400 mt-3 italic">Leave empty for an auto-generated placeholder</p>}
          </div>

          <div className="space-y-6">
            <h4 className="text-[11px] font-black text-gray-400 border-b border-gray-100 pb-2 uppercase tracking-[0.2em]">General Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-gray-700 block">Team Name</label>
                <input 
                  required
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all font-semibold"
                  placeholder="e.g. Manchester Blues"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
                {error && <p className="text-red-500 text-xs font-semibold mt-1 flex items-center"><i className="fas fa-exclamation-circle mr-1"></i> {error}</p>}
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-gray-700 block">Home Ground</label>
                <input 
                  required
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all font-semibold"
                  placeholder="Stadium Name"
                  value={formData.homeGround}
                  onChange={e => setFormData({ ...formData, homeGround: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Dedicated Manager Section - Enhanced visibility for editing manager details */}
          <div className="space-y-6 bg-blue-50/30 p-6 rounded-3xl border border-blue-50">
            <div className="flex items-center space-x-2 border-b border-blue-100 pb-2">
              <i className="fas fa-user-tie text-blue-500 text-xs"></i>
              <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em]">Leadership & Contact</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 block">Manager Name</label>
                <input 
                  required
                  className="w-full border border-blue-100 bg-white rounded-xl px-4 py-3 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all font-semibold"
                  placeholder="Full Name"
                  value={formData.manager}
                  onChange={e => setFormData({ ...formData, manager: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 block">Contact Information</label>
                <input 
                  required
                  className="w-full border border-blue-100 bg-white rounded-xl px-4 py-3 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all font-semibold"
                  placeholder="Email or Phone Number"
                  value={formData.contact}
                  onChange={e => setFormData({ ...formData, contact: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-col space-y-3">
            <button 
              type="submit" 
              className={`w-full text-white py-4 rounded-xl font-black text-lg shadow-lg active:scale-[0.98] transition-all flex items-center justify-center space-x-2 ${isEditMode ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'}`}
            >
              <span>{isEditMode ? 'Update Team Profile' : 'Initialize Registration'}</span>
              <i className={`fas ${isEditMode ? 'fa-check' : 'fa-chevron-right'} text-sm`}></i>
            </button>
            
            {onCancel && (
              <button 
                type="button"
                onClick={onCancel}
                className="w-full bg-gray-100 text-gray-500 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
              >
                Discard Changes
              </button>
            )}
          </div>
        </form>
      </div>

      {!isEditMode && (
        <div className="mt-8 bg-blue-50 p-6 rounded-2xl flex items-start space-x-4 border border-blue-100">
          <i className="fas fa-info-circle text-blue-500 mt-1"></i>
          <div className="text-sm text-blue-700 leading-relaxed">
            <p className="font-bold mb-1 text-xs uppercase tracking-wider">Registration Policy</p>
            By registering, you agree to comply with all league regulations. Team names must be unique and squads are limited to {30} players.
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamRegistration;
