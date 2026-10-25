import React, { useState } from 'react';
import { Heart, Play } from 'lucide-react'; 

export function GameCard({ game, onLaunch, playtime, isFavorite, onToggleFavorite, performanceMode }) {
  const [showGTA3Modal, setShowGTA3Modal] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const isUtility = ['request', 'report'].includes(game.id);
  
  const handleCardClick = (e) => {
    // Normalizes game ID and Title (converts to lowercase and strips special chars)
    const normalizedId = String(game.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedTitle = String(game.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    // Debugging log: Open your browser console (F12) to see what your game object looks like!
    console.log("Game clicked:", { id: game.id, title: game.title, normalizedId, normalizedTitle });

    // Broad check to catch any GTA 3 variation (gta3, gtaiii, grandtheftauto3, grandtheftautoiii)
    const isGTA3 = 
      normalizedId.includes('gta3') || 
      normalizedId.includes('gtaiii') ||
      normalizedTitle.includes('gta3') || 
      normalizedTitle.includes('gtaiii') ||
      (normalizedTitle.includes('grandtheftauto') && (normalizedTitle.includes('3') || normalizedTitle.includes('iii')));

    if (isGTA3) {
      const hasAccepted = localStorage.getItem('gta3_disclaimer_accepted');
      if (hasAccepted === 'true') {
        onLaunch(game);
      } else {
        setDontShowAgain(false); // Reset checkbox state so it's always UNCHECKED when triggered
        setShowGTA3Modal(true); // Trigger disclaimer modal
      }
    } else {
      // Launch any other game immediately
      onLaunch(game);
    }
  };

  const handleAcceptDisclaimer = (e) => {
    e.stopPropagation();
    if (dontShowAgain) {
      localStorage.setItem('gta3_disclaimer_accepted', 'true');
    }
    setShowGTA3Modal(false);
    setDontShowAgain(false); // Reset checkbox for next time
    onLaunch(game);
  };

  const handleCancelDisclaimer = (e) => {
    e.stopPropagation();
    setShowGTA3Modal(false);
    setDontShowAgain(false); // Reset checkbox state
  };

  return (
    <>
      <div 
        className={`group bg-zinc-900/40 rounded-[2rem] overflow-hidden border border-white/5 hover:border-[var(--theme)]/30 transition-all flex flex-col cursor-pointer ${performanceMode ? '' : 'shadow-lg'}`} 
        onClick={handleCardClick}
      >
        <div className={`relative w-full aspect-[4/3] bg-black/20 overflow-hidden transition-all duration-500 ${performanceMode ? '' : 'group-hover:shadow-[inset_0_0_var(--glow)_var(--theme)]'}`}>
          <img 
            src={game.thumbnail} 
            loading="lazy"
            className={`absolute inset-0 m-auto transition-transform duration-500 group-hover:scale-110 ${isUtility ? 'w-24 h-24 object-contain' : 'w-full h-full object-cover'}`} 
            alt={`${game.title} thumbnail`} 
          />
          {!isUtility && (
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                onToggleFavorite(); 
              }} 
              aria-label={isFavorite ? `Remove ${game.title} from favorites` : `Favorite ${game.title}`}
              className={`absolute top-4 right-4 z-10 p-2 bg-zinc-900/80 rounded-full border border-white/10 transition-transform ${performanceMode ? '' : 'backdrop-blur-sm hover:scale-110 shadow-lg'}`}
            >
              <Heart 
                className="w-4 h-4 transition-colors" 
                stroke={isFavorite ? "var(--theme)" : "#a1a1aa"} 
                strokeWidth={2.5} 
                fill={isFavorite ? 'var(--theme)' : 'none'} 
              />
            </button>
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className={`w-12 h-12 bg-[var(--theme)] rounded-full flex items-center justify-center ${performanceMode ? '' : 'shadow-[0_0_20px_var(--theme)]'}`}>
              <Play className="w-6 h-6 text-black fill-current ml-1" />
            </div>
          </div>
        </div>
        <div className="p-5">
          <div className="flex justify-between items-start gap-2">
            <div className="font-bold text-sm truncate group-hover:text-[var(--theme)] transition-colors">{game.title}</div>
            {!isUtility && (
              <span className="text-[8px] text-zinc-100 font-bold bg-white/15 px-1.5 py-0.5 rounded shrink-0">
                {playtime || '0m'}
              </span>
            )}
          </div>
          <p className="text-[9px] text-zinc-200 uppercase font-black tracking-widest mt-1">
            {game.category}
          </p>
        </div>
      </div>

      {/* GTA III Disclaimer Modal */}
      {showGTA3Modal && (
        <div 
          onClick={handleCancelDisclaimer} 
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 p-4 font-sans"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl text-white"
          >
            <h2 className="text-xl font-bold text-red-500 flex items-center gap-2 m-0">
              ⚠️ Disclaimer & Warning
            </h2>
            
            <p className="text-zinc-300 text-sm leading-relaxed my-4">
              Capybara Science is not responsible for you getting in trouble for playing GTA III in or outside of school.
            </p>
            
            <label className="flex items-center gap-2 my-5 cursor-pointer text-sm text-zinc-400 select-none">
              <input 
                type="checkbox" 
                checked={dontShowAgain} 
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer accent-red-500" 
              />
              Don't show this again
            </label>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={handleCancelDisclaimer} 
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white border-0 rounded-lg cursor-pointer text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAcceptDisclaimer} 
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white border-0 rounded-lg font-bold cursor-pointer text-sm transition-colors"
              >
                I Understand & Launch GTA III
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
