import React from 'react';
import { Play, Heart, Clock } from 'lucide-react';

export const GameCard = React.memo(({ 
  game, 
  onLaunch, 
  playtime, 
  isFavorite, 
  onToggleFavorite, 
  performanceMode 
}) => {
  return (
    <div className={`group relative bg-zinc-900/80 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col justify-between transition-all duration-300 ${
      performanceMode 
        ? 'shadow-none' 
        : 'hover:border-[var(--theme)] hover:shadow-[0_0_var(--glow)_var(--theme)] hover:-translate-y-1'
    }`}>
      {/* Thumbnail & Favorite Button */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-800 mb-4">
        <img 
          src={game.image || game.thumbnail || '/placeholder.png'} 
          alt={game.title}
          loading="lazy"
          className={`w-full h-full object-cover ${performanceMode ? '' : 'transition-transform duration-500 group-hover:scale-105'}`}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(game.id);
          }}
          aria-label="Toggle Favorite"
          className="absolute top-3 right-3 p-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white transition-transform active:scale-90 hover:bg-black/80"
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-[var(--theme)] text-[var(--theme)]' : 'text-white'}`} />
        </button>
      </div>

      {/* Game Details */}
      <div className="space-y-2 mb-4">
        <h3 className="text-sm font-black uppercase tracking-tight text-white truncate">{game.title}</h3>
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="bg-white/5 px-2 py-0.5 rounded-md border border-white/5 uppercase tracking-wider text-[10px] font-bold">
            {game.category || 'Arcade'}
          </span>
          {/* Only show playtime badge if playtime exists and is greater than 0m */}
          {playtime && playtime !== '0m' && (
            <div className="flex items-center gap-1 font-mono text-[11px]">
              <Clock className="w-3 h-3 text-[var(--theme)]" />
              <span>{playtime}</span>
            </div>
          )}
        </div>
      </div>

      {/* Launch Action */}
      <button
        onClick={() => onLaunch(game)}
        className="w-full py-2.5 px-4 bg-[var(--theme)] text-black font-black uppercase text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 hover:opacity-90"
      >
        <Play className="w-3.5 h-3.5 fill-current" />
        Play Game
      </button>
    </div>
  );
});

GameCard.displayName = 'GameCard';
