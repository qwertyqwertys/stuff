import React, { useEffect } from 'react';
import { Search, Dices, Calendar, Clock, Battery, UserCircle, Settings, X, MessageSquare, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useChatNotifications from '../hooks/useChatNotifications';

export function Header({ 
  searchQuery, setSearchQuery, 
  time, battery, 
  profilePic, setShowSettings, 
  onRandomGame, DEFAULT_ICON,
  onViewProfile,
  isLightMode,
  isChatOpen, setIsChatOpen,
  setShowSoundboard,
  isSoundboardOpen,
  isHeaderLight,
  currentUserId,
  activeChannel = 'global'
}) {
  const navigate = useNavigate();

  const { unreadCounts, markAsRead } = useChatNotifications({ 
    currentUserId, 
    activeChannelId: isChatOpen ? activeChannel : null 
  });

  useEffect(() => {
    if (isChatOpen) {
      markAsRead(activeChannel);
    }
  }, [isChatOpen, activeChannel, markAsRead]);

  const totalUnreads = Object.values(unreadCounts).reduce((acc, count) => acc + count, 0);

  const handleToggleChat = () => {
    setIsChatOpen(prev => {
      const nextState = !prev;
      if (nextState) {
        markAsRead(activeChannel);
      }
      return nextState;
    });
  };

  const containerBgClass = isLightMode || isHeaderLight 
    ? 'bg-black/5 border-black/10' 
    : 'bg-[#161b22] border-[#30363d]';

  return (
    <header className="w-full bg-[#0d1117] h-16 flex items-center px-6 sticky top-0 z-50 border-b border-[#21262d]">
      <div className="w-full grid grid-cols-3 items-center">
        
        {/* LEFT: BRANDING */}
<div className="flex items-center gap-2.5 justify-self-start cursor-pointer" onClick={() => navigate('/')}>
  <img src={DEFAULT_ICON} alt="Capybara Science Logo" className="w-7 h-7 object-contain" />
  <span 
    className="text-xl font-semibold tracking-tighter text-white hidden lg:block"
    style={{ fontFamily: "'Fredoka', sans-serif" }}
  >
    Capybara Science
  </span>
</div>

        {/* CENTER: SEARCH & INTERACTIVE CONTROLS */}
        <div className="flex items-center justify-center gap-2.5 w-full justify-self-center">
          <div className="relative w-full max-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              aria-label="Search" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-[#161b22] text-zinc-100 placeholder:text-zinc-500 border border-[#30363d] rounded-full py-1.5 pl-9 pr-8 text-xs outline-none focus:border-[#58a6ff] transition-all" 
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')} 
                aria-label="Clear search text"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-white/10 rounded-full text-zinc-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button 
            onClick={onRandomGame} 
            aria-label="Play a random game"
            className="p-1.5 bg-[#161b22] border border-[#30363d] rounded-full text-zinc-300 hover:text-white hover:border-[#58a6ff] transition-all"
            title="Random Game"
          >
            <Dices className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={handleToggleChat} 
              className={`relative p-1.5 border rounded-lg transition-all ${
                isChatOpen 
                  ? 'bg-[#58a6ff] border-[#58a6ff] text-[#0d1117]' 
                  : 'bg-[#161b22] border-[#30363d] text-zinc-300 hover:text-white'
              }`}
              title="Toggle Chat"
              aria-label="Toggle chat sidebar"
            >
              <MessageSquare className="w-4 h-4" />
              {!isChatOpen && totalUnreads > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {totalUnreads > 9 ? '9+' : totalUnreads}
                </span>
              )}
            </button>

            <button 
              onClick={() => setShowSoundboard ? setShowSoundboard(prev => !prev) : null} 
              className={`p-1.5 border rounded-lg transition-all ${
                isSoundboardOpen 
                  ? 'bg-[#58a6ff] border-[#58a6ff] text-[#0d1117]' 
                  : 'bg-[#161b22] border-[#30363d] text-zinc-300 hover:text-white'
              }`}
              title="Toggle Soundboard"
              aria-label="Toggle custom soundboard"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* RIGHT: SYSTEM STATUS & PROFILE */}
        <div className="flex items-center justify-end gap-3 justify-self-end">
          <div 
            className="hidden lg:flex items-center gap-4 text-xs font-medium text-zinc-300 bg-[#161b22] px-4 py-1.5 rounded-full border border-[#30363d]"
            style={{ fontFamily: "'Fredoka', sans-serif" }}
          >
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#58a6ff]" /> 
              <span>{time.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#58a6ff]" /> 
              <span>{time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
            </span>
            {battery.level !== null && (
              <div className="flex items-center gap-1.5">
                <Battery className={`w-4 h-4 ${battery.charging ? 'text-green-400 animate-pulse' : 'text-zinc-400'}`} />
                <span>{battery.level}%</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 bg-[#161b22] rounded-full p-1 border border-[#30363d]">
            <button 
              onClick={() => onViewProfile?.()} 
              aria-label="View user profile"
              className="w-7 h-7 rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95"
            >
              {profilePic ? (
                <img src={profilePic} className="w-full h-full object-cover" alt="User avatar" />
              ) : (
                <UserCircle className="w-full h-full p-0.5 text-[#58a6ff]" />
              )}
            </button>

            <button 
              onClick={() => setShowSettings(true)} 
              aria-label="Open global dashboard settings"
              className="p-1 text-zinc-400 hover:text-white transition-all hover:rotate-45"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </header>
  );
}
