import React from 'react';
import { X, UserCircle, Heart, Trophy } from 'lucide-react';
import { ProfileAvatar } from './SettingsModal';

const TROPHIES = [
  { id: 'first_game', name: 'First Blood', desc: 'Play your first game', icon: '🎯' },
  { id: 'marathon', name: 'Marathoner', desc: 'Play for over 1 hour total', icon: '🏃' },
  { id: 'collector', name: 'The Collector', desc: 'Favorite 10 different games', icon: '⭐' },
  { id: 'loyal', name: 'Capy-Loyalist', desc: 'Play one game for 30 mins', icon: '👑' },
  { id: 'styler', name: 'Fashionista', desc: 'Change your theme 5 times', icon: '🎨' }
];

// Preserves original titles like "Snowball.io (fake)" while cleanly formatting slugs
function formatGameTitle(gameId, gamesData = []) {
  if (!gameId) return '';

  const game = gamesData.find(g => 
    String(g.id).toLowerCase() === String(gameId).toLowerCase() || 
    String(g.title || g.name).toLowerCase() === String(gameId).toLowerCase()
  );
  
  if (game?.title) return game.title;
  if (game?.name) return game.name;

  if (typeof gameId === 'string') {
    if (gameId.includes(' ') || /[A-Z]/.test(gameId)) {
      return gameId;
    }
    return gameId
      .replace(/[-_]/g, ' ')
      .trim()
      .replace(/\b\w/g, c => c.toUpperCase());
  }
  return String(gameId);
}

// UTF-8 safe Base64 Friend Code generator
function generateFriendCode(name, pfp, favs, times, achievements) {
  try {
    const payload = {
      n: name || 'User',
      p: pfp || '',
      f: Array.isArray(favs) ? favs : [],
      t: times || {},
      a: Array.isArray(achievements) ? achievements : []
    };
    const jsonStr = JSON.stringify(payload);
    return btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) =>
      String.fromCharCode('0x' + p1)
    ));
  } catch (e) {
    return '';
  }
}

export function FriendViewModal({ friend, gamesData = [], onClose, ownPfp, isOwnProfile, myAchievements = [] }) {
  if (!isOwnProfile && (!friend || (!friend.decoded && !friend.f && !friend.favs))) return null;

  const displayPfp = isOwnProfile ? (ownPfp || friend?.pfp || friend?.p) : (friend?.decoded?.p || friend?.pfp || friend?.p);
  const displayName = isOwnProfile ? "You" : (friend?.decoded?.n || friend?.displayName || friend?.name || "User");
  
  const rawFavs = isOwnProfile 
    ? (friend?.favs || friend?.f || []) 
    : (friend?.decoded?.f || friend?.favs || friend?.f || []);
  const displayFavs = Array.isArray(rawFavs) ? rawFavs : [];

  const displayTimes = isOwnProfile 
    ? (friend?.times || friend?.t || {}) 
    : (friend?.decoded?.t || friend?.times || friend?.t || {});
  
  const displayAchievements = isOwnProfile 
    ? (friend?.achievements || friend?.a || myAchievements || []) 
    : (friend?.decoded?.a || friend?.achievements || friend?.a || []);

  const friendCodeDisplay = isOwnProfile 
    ? (localStorage.getItem('capy-friend-code') || 
       localStorage.getItem('capy-code') || 
       generateFriendCode(displayName, displayPfp, displayFavs, displayTimes, displayAchievements))
    : '';

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="bg-zinc-900 border border-[var(--theme)]/30 p-8 rounded-3xl max-w-sm w-full relative shadow-[0_0_50px_rgba(0,0,0,0.5)] space-y-6 flex flex-col max-h-[90vh] overflow-hidden">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
          <X />
        </button>
        
        <div className="overflow-y-auto overflow-x-hidden space-y-6 pr-1 custom-scrollbar">
          {/* Profile Header */}
          <div className="text-center space-y-2">
            <div className="w-24 h-24 mx-auto flex items-center justify-center">
              <ProfileAvatar 
                pfpUrl={displayPfp} 
                frameUrl={localStorage.getItem('capy-selected-frame')} 
                effectUrl={localStorage.getItem('capy-selected-effect')} 
                size="w-24 h-24" 
              />
            </div>
            
            <h3 className="text-2xl font-black tracking-tighter text-white">{displayName}</h3>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              {isOwnProfile ? "Your Profile" : "Friend Profile"}
            </p>
          </div>

          {/* Achievement Section */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-yellow-500 uppercase tracking-widest flex items-center gap-2">
              <Trophy className="w-3 h-3" /> Trophies ({displayAchievements.length} / {TROPHIES.length})
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TROPHIES.map(trophy => {
                const isEarned = displayAchievements.includes(trophy.id);
                return (
                  <div 
                    key={trophy.id} 
                    className={`p-2 rounded-xl border transition-all duration-300 ${
                      isEarned 
                        ? 'border-yellow-500/30 bg-yellow-500/5 opacity-100 grayscale-0' 
                        : 'border-white/5 opacity-20 grayscale'
                    }`}
                  >
                    <div className="text-xl">{trophy.icon}</div>
                    <div className="text-[9px] font-black uppercase mt-1 leading-tight text-white">{trophy.name}</div>
                    <div className="text-[7px] text-zinc-400 opacity-60 leading-tight">{trophy.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Favorites Section */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-[var(--theme)] uppercase tracking-widest flex items-center gap-2">
              <Heart className="w-3 h-3" /> Favorite Games ({displayFavs.length})
            </label>
            <div className="grid gap-2 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
              {displayFavs.length > 0 ? (
                displayFavs.map((gameId) => {
                  const title = formatGameTitle(gameId, gamesData);
                  const playSeconds = displayTimes[gameId] || 0;
                  const playMins = Math.floor(playSeconds / 60);

                  return (
                    <div key={gameId} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-xs font-bold text-white">{title}</span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {playMins}m played
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-zinc-600 text-center py-4 italic">No favorites yet...</p>
              )}
            </div>
          </div>

          {/* Friend Code Section */}
          {isOwnProfile && friendCodeDisplay && (
            <div className="space-y-2 pt-4 border-t border-white/5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                Your Friend Code
              </label>
              <div className="bg-black/40 border border-white/10 rounded-xl p-3 max-h-28 overflow-y-auto">
                <p className="text-[9px] font-mono text-blue-400 break-all whitespace-pre-wrap leading-tight select-all cursor-pointer">
                  {friendCodeDisplay}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
