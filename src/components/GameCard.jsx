import React from 'react';
import { Heart, Play } from 'lucide-react'; 

export function GameCard({ game, onLaunch, playtime, isFavorite, onToggleFavorite, performanceMode }) {
  const isUtility = ['request', 'report'].includes(game.id);
  
  const handleCardClick = () => {
    onLaunch(game);
  };
  
  return (
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
          {!isUtility && <span className="text-[8px] text-zinc-100 font-bold bg-white/15 px-1.5 py-0.5 rounded shrink-0">{playtime}</span>}
        </div>
        <p className="text-[9px] text-zinc-200 uppercase font-black tracking-widest mt-1">
          {game.category}
        </p>
      </div>
    </div>
  );
}
