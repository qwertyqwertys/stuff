import { Search, Dices, Calendar, Clock, Battery, UserCircle, Settings, X, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Header({ 
  searchQuery, setSearchQuery, 
  time, battery, 
  profilePic, setShowSettings, 
  onRandomGame, DEFAULT_ICON,
  onViewProfile,
  isLightMode,
  supplier, setSupplier,
  isChatOpen, setIsChatOpen
}) {
  const navigate = useNavigate();

  return (
    <header className={`${isLightMode ? 'bg-white text-black' : 'bg-[#09090b]/95 text-white'} h-16 flex items-center px-4 backdrop-blur-md sticky top-0 z-50 transition-colors`}>
      <div className="max-w-7xl mx-auto w-full grid grid-cols-3 items-center">
        
        {/* LOGO SECTION - LEFT COLUMN */}
        <div className="flex items-center gap-2 justify-self-start">
          <img src={DEFAULT_ICON} alt="Logo" className="w-7 h-7 object-contain" />
          <span 
            className="text-xl font-semibold hidden lg:block tracking-tighter"
            style={{ 
              fontFamily: "'Fredoka', sans-serif",
              fontWeight: 600 
            }}
          >
            Capybara <span className="text-[var(--theme)]">Science</span>
          </span>
        </div>

        {/* SEARCH & RANDOM SECTION - PERFECTLY CENTERED COLUMN */}
        <div className="flex items-center justify-center gap-3 w-full justify-self-center">
          <div className="relative w-full max-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input 
              type="text" 
              placeholder="Search games..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className={`w-full ${isLightMode ? 'bg-black/5 border-black/10 text-black' : 'bg-white/5 border-white/10 text-white'} border rounded-full py-2 pl-10 pr-10 text-xs outline-none focus:border-[var(--theme)]/50 transition-colors`} 
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-white/10 rounded-full text-[var(--theme)]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button onClick={onRandomGame} className={`p-2 ${isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'} border rounded-full text-[var(--theme)] hover:bg-[var(--theme)] hover:text-black transition-all shadow-[0_0_15px_rgba(var(--theme-rgb),0.1)]`}>
            <Dices className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <select 
                value={supplier} 
                onChange={(e) => {
                  setSupplier(e.target.value);
                  localStorage.setItem('capy-supplier', e.target.value);
                }}
                className={`text-xs font-bold uppercase py-2.5 pl-4 pr-10 rounded-xl border transition-all outline-none cursor-pointer appearance-none ${
                  isLightMode 
                    ? 'bg-black/5 border-black/10 text-black' 
                    : 'bg-white/5 border-white/10 text-white'
                } focus:border-[var(--theme)]`}
                style={{ fontFamily: "'Baloo 2', cursive" }}
              >
                <option value="Default" className="bg-[#09090b] text-white">Capybara Science</option>
                <option value="GN Math" className="bg-[#09090b] text-white">gn-math</option>
                <option value="Truffled" className="bg-[#09090b] text-white">Truffled</option>
              </select>
              <div className="absolute right-3 pointer-events-none flex items-center justify-center">
                <span style={{ fontSize: '10px', color: 'var(--theme)', opacity: 0.9 }}>▼</span>
              </div>
            </div>

            <button 
              onClick={() => setIsChatOpen(true)} 
              className={`p-2 border rounded-lg transition-all hover:scale-105 active:scale-95 ${
                isChatOpen 
                  ? 'bg-[var(--theme)] border-[var(--theme)] text-black shadow-[0_0_10px_var(--theme)]' 
                  : (isLightMode ? 'bg-black/5 border-black/10 text-black' : 'bg-white/5 border-white/10 text-[var(--theme)]')
              }`}
              title="Toggle Chat"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* STATS & PROFILE SECTION - RIGHT COLUMN */}
        <div className="flex items-center justify-end gap-4 justify-self-end">
          <div 
            className={`hidden sm:flex items-center gap-5 text-sm font-bold uppercase text-[var(--theme)] ${isLightMode ? 'bg-black/5 border-black/5' : 'bg-white/5 border-white/5'} px-5 py-2 rounded-full border`}
            style={{ fontFamily: "'Baloo 2', cursive" }}
          >
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" /> 
              <span className="translate-y-[1px]">{time.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" /> 
              <span className="translate-y-[1px]">{time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
            </span>
            
            <div className="flex items-center gap-2">
              <Battery className={`w-5 h-5 ${battery.charging ? 'text-green-500 animate-pulse' : ''}`} />
              <span className="translate-y-[1px]">{battery.level}%</span>
            </div>
          </div>
          
          <div className={`flex items-center gap-1.5 ${isLightMode ? 'bg-black/5 border-black/5' : 'bg-white/5 border-white/5'} rounded-full p-1 border`}>
              <button 
                onClick={() => onViewProfile?.()} 
                className="w-8 h-8 rounded-full border border-transparent hover:border-[var(--theme)] overflow-hidden bg-zinc-800 transition-all active:scale-90"
              >
                {profilePic ? (
                  <img src={profilePic} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  <UserCircle className="w-full h-full p-1 text-[var(--theme)]" />
                )}
              </button>

              <button 
                onClick={() => setShowSettings(true)} 
                className="p-1.5 transition-all hover:scale-110 active:rotate-90 group flex items-center justify-center"
              >
                <Settings 
                  className="w-5 h-5" 
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
