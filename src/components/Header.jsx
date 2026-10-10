import { Search, Dices, Calendar, Clock, Battery, UserCircle, Settings, X, MessageSquare, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Header({ 
  searchQuery, setSearchQuery, 
  time, battery, 
  profilePic, setShowSettings, 
  onRandomGame, DEFAULT_ICON,
  onViewProfile,
  isLightMode,
  supplier, setSupplier,
  isChatOpen, setIsChatOpen,
  setShowSoundboard,
  isSoundboardOpen,
  isHeaderLight
}) {
  const navigate = useNavigate();

  const textColorClass = isLightMode || isHeaderLight ? 'text-zinc-900' : 'text-zinc-100';
  const containerBgClass = isLightMode || isHeaderLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10';
  const placeholderClass = isLightMode || isHeaderLight ? 'placeholder:text-zinc-500' : 'placeholder:text-zinc-400';

  return (
    <header className={`bg-transparent h-16 flex items-center px-4 sticky top-0 z-50 transition-colors ${textColorClass}`}>
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
        
        {/* LEFT: Branding */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <img src={DEFAULT_ICON} alt="Capybara Science Logo" className="w-7 h-7 object-contain" />
          <span 
            className="text-xl font-semibold hidden md:block tracking-tighter select-none"
            style={{ 
              fontFamily: "'Fredoka', sans-serif",
              fontWeight: 600,
              color: isLightMode || isHeaderLight ? '#000000' : '#ffffff'
            }}
          >
            Capybara Science
          </span>
        </div>

        {/* CENTER: Spacious & Unclipped Search Bar */}
        <div className="flex-1 max-w-sm mx-2 relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isLightMode || isHeaderLight ? 'text-zinc-600' : 'text-zinc-400'}`} />
          <input 
            type="text" 
            placeholder="Search games..." 
            aria-label="Search games" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className={`w-full ${containerBgClass} ${textColorClass} ${placeholderClass} border rounded-full py-2 pl-9 pr-8 text-xs outline-none focus:border-[var(--theme)]/60 transition-colors`} 
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')} 
              aria-label="Clear search text"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-white/10 rounded-full text-[var(--theme)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* RIGHT: Tools, Widgets, Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          
          {/* Provider Selector */}
          <div className="relative flex items-center">
            <select 
              value={supplier} 
              aria-label="Select game source provider"
              onChange={(e) => {
                setSupplier(e.target.value);
                localStorage.setItem('capy-supplier', e.target.value);
              }}
              className={`text-[11px] font-bold uppercase py-2 pl-3 pr-7 rounded-xl border transition-all outline-none cursor-pointer appearance-none ${containerBgClass} ${textColorClass}`}
              style={{ fontFamily: "'Baloo 2', cursive" }}
            >
              <option value="Default" className="bg-[#09090b] text-white">Capybara Science</option>
              <option value="GN Math" className="bg-[#09090b] text-white">gn-math</option>
              <option value="Truffled" className="bg-[#09090b] text-white">Truffled</option>
            </select>
            <div className="absolute right-2 pointer-events-none flex items-center justify-center">
              <span style={{ fontSize: '9px', color: 'var(--theme)', opacity: 0.9 }}>▼</span>
            </div>
          </div>

          {/* Random Game Dice */}
          <button 
            onClick={onRandomGame} 
            aria-label="Play a random game"
            className={`p-2 ${containerBgClass} border rounded-xl text-[var(--theme)] hover:bg-[var(--theme)] hover:text-black transition-all shadow-[0_0_12px_rgba(var(--theme-rgb),0.1)]`}
            title="Random Game"
          >
            <Dices className="w-4 h-4" />
          </button>

          {/* Chat Toggle */}
          <button 
            onClick={() => setIsChatOpen(prev => !prev)} 
            className={`p-2 border rounded-xl transition-all hover:scale-105 active:scale-95 ${
              isChatOpen 
                ? 'bg-[var(--theme)] border-[var(--theme)] text-black shadow-[0_0_10px_var(--theme)]' 
                : `${containerBgClass} text-[var(--theme)]`
            }`}
            title="Toggle Chat"
            aria-label="Toggle chat sidebar"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Soundboard Toggle */}
          <button 
            onClick={() => setShowSoundboard ? setShowSoundboard(prev => !prev) : null} 
            className={`p-2 border rounded-xl transition-all hover:scale-105 active:scale-95 ${
              isSoundboardOpen 
                ? 'bg-[var(--theme)] border-[var(--theme)] text-black shadow-[0_0_10px_var(--theme)]' 
                : `${containerBgClass} text-[var(--theme)]`
            }`}
            title="Toggle Soundboard"
            aria-label="Toggle custom soundboard"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          {/* Date / Time Widget */}
          <div 
            className={`hidden lg:flex items-center gap-3.5 text-xs font-bold uppercase ${textColorClass} ${containerBgClass} px-3.5 py-1.5 rounded-full border`}
            style={{ fontFamily: "'Baloo 2', cursive" }}
          >
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[var(--theme)]" /> 
              <span className="translate-y-[1px] font-medium">{time.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[var(--theme)]" /> 
              <span className="translate-y-[1px] font-medium">{time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
            </span>
            
            {battery.level !== null && (
              <div className="flex items-center gap-1.5">
                <Battery className={`w-3.5 h-3.5 ${battery.charging ? 'text-green-500 animate-pulse' : ''}`} />
                <span className="translate-y-[1px] font-medium">{battery.level}%</span>
              </div>
            )}
          </div>
          
          {/* Profile & Settings Container */}
          <div className={`flex items-center gap-1 ${containerBgClass} rounded-full p-1 border`}>
            <button 
              onClick={() => onViewProfile?.()} 
              aria-label="View user profile"
              className="w-7 h-7 rounded-full border border-transparent hover:border-[var(--theme)] overflow-hidden transition-all active:scale-90"
            >
              {profilePic ? (
                <img src={profilePic} className="w-full h-full object-cover" alt="User avatar" />
              ) : (
                <UserCircle className="w-full h-full p-0.5 text-[var(--theme)]" />
              )}
            </button>

            <button 
              onClick={() => setShowSettings(true)} 
              aria-label="Open global dashboard settings"
              className="p-1 transition-all hover:scale-110 active:rotate-90 group flex items-center justify-center"
            >
              <Settings 
                className="w-4 h-4" 
                style={{ 
                  color: 'var(--theme)',
                  filter: 'drop-shadow(0 0 8px var(--theme))'
                }}
              />
            </button>
          </div>

        </div>

      </div>
    </header>
  );
}
