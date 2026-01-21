import React, { useState, useEffect } from 'react';
import { useAuth, generateAvatar } from './AuthContext.tsx';

const UserProfile: React.FC = () => {
  const { user, googleUser, logout } = useAuth();
  // Prefer google user if available for display, otherwise license user
  const displayUser = googleUser || user || { name: 'Guest User', picture: '' };
  const [imgSrc, setImgSrc] = useState<string>('');

  useEffect(() => {
    if (displayUser) {
        setImgSrc(displayUser.picture || generateAvatar(displayUser.name));
    }
  }, [displayUser]);

  const handleLogout = () => {
    logout();
    // Refresh to clear any local states if needed
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-5">
      <div className="flex items-center gap-4 group cursor-pointer">
        <div className="relative">
          <img 
              src={imgSrc} 
              alt={displayUser.name} 
              className="w-11 h-11 rounded-full border-2 border-cyan-500/50 object-cover shadow-lg shadow-cyan-500/10 transition-transform group-hover:scale-105"
              onError={(e) => {
                  e.currentTarget.onerror = null; 
                  setImgSrc(generateAvatar(displayUser.name));
              }}
          />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#0b0f1a] rounded-full"></div>
        </div>
        <div className="text-left hidden sm:block">
            <span className="font-extrabold text-slate-100 text-sm tracking-tight">{displayUser.name}</span>
            <p className="text-[10px] text-cyan-400 uppercase font-black tracking-widest leading-none mt-1">Unlimited Access</p>
        </div>
      </div>
      {(googleUser || user) && (
        <button
          onClick={handleLogout}
          className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-red-400 bg-slate-800/40 hover:bg-red-500/10 px-4 py-2 rounded-xl border border-slate-700 hover:border-red-500/50 transition-all duration-300 active:scale-95"
        >
          Logout
        </button>
      )}
    </div>
  );
};

export default UserProfile;