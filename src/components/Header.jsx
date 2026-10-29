import React from 'react';
import { Search, Dices, Calendar, Clock, Battery, UserCircle, Settings, X, MessageSquare, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useChatNotifications from '../hooks/useChatNotifications'; // Adjust import path if needed

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

  // Initialize chat notifications hook
  const { unreadCounts, markAsRead } = useChatNotifications({ 
    currentUserId, 
    activeChannelId: isChatOpen ? activeChannel : null 
  });

  // Sum up total unread messages
  const totalUnreads = Object.values(unreadCounts).reduce((acc, count) => acc + count, 0);

  const handleToggleChat = () => {
    setIsChatOpen(prev => {
      const nextState = !prev;
      if (nextState) {
        markAsRead(activeChannel); // Clear badge when chat is opened
      }
      return nextState;
    });
  };

  const textColorClass = isLightMode || isHeaderLight ? 'text-zinc-900' : 'text-zinc-100';
  const containerBgClass = isLightMode || isHeaderLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10';
  const placeholderClass = isLightMode || isHeaderLight ? 'placeholder:text-zinc-500' : 'placeholder:text-zinc-400';

  return (
    <header className={`bg-transparent h-16 flex items-center px-4 sticky top-0 z-50 transition-colors ${textColorClass}`}>
      <div className="max-w-7xl mx-auto w-full grid grid-cols-3 items-center">
        
        <div className="flex items-center gap-2 justify-self-start">
          <img src={DEFAULT_ICON} alt="Capybara Science Logo" className="w-7 h-7 object-contain" />
          <span 
            className="text-xl font-semibold hidden lg:block tracking-tighter"
            style={{ 
              fontFamily: "'Fredoka', sans-serif",
              fontWeight: 600,
              color: isLightMode || isHeaderLight ? '#000000' : '#ffffff'
            }}
          >
            Capybara Science
          </span>
        </div>

        <div className="flex items-center justify-center gap-3 w-full justify-self-center">
          <div className="relative w-full max-w-[280px]">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLightMode || isHeaderLight ? 'text-zinc-600' : 'text-zinc-400'}`} />
            <input 
              type="text" 
              placeholder="Search..." 
              aria-label="Search" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className={`w-full ${containerBgClass} ${textColorClass} ${placeholderClass} border rounded-full py-2 pl-10 pr-10 text-xs outline-none focus:border-[var(--theme)]/50 transition-colors`} 
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')} 
                aria-label="Clear search text"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-white/10 rounded-full text-[var(--theme)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button 
            onClick={onRandomGame} 
            aria-label="Play a random game"
            className={`p-2 ${containerBgClass} border rounded-full text-[var(--theme)] hover:bg-[var(--theme)] hover:text-black transition-all shadow-[0_0_15px_rgba(var(--theme-rgb),0.1)]`}
          >
            <Dices className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            {/* CHAT BUTTON WITH UNREAD NOTIFICATION BADGE */}
            <button 
              onClick={handleToggleChat} 
              className={`relative p-2 border rounded-lg transition-all hover:scale-105 active:scale-95 ${
                isChatOpen 
                  ? 'bg-[var(--theme)] border-[var(--theme)] text-black shadow-[0_0_10px_var(--theme)]' 
                  : `${containerBgClass} text-[var(--theme)]`
              }`}
              title="Toggle Chat"
              aria-label="Toggle chat sidebar"
            >
              <MessageSquare className="w-4 h-4" />

              {/* Notification Badge */}
              {!isChatOpen && totalUnreads > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce shadow-md">
                  {totalUnreads > 9 ? '9+' : totalUnreads}
                </span>
              )}
            </button>

            <button 
              onClick={() => setShowSoundboard ? setShowSoundboard(prev => !prev) : null} 
              className={`p-2 border rounded-lg transition-all hover:scale-105 active:scale-95 ${
                isSoundboardOpen 
                  ? 'bg-[var(--theme)] border-[var(--theme)] text-black shadow-[0_0_10px_var(--theme)]' 
                  : `${containerBgClass} text-[var(--theme)]`
              }`}
              title="Toggle Soundboard"
              aria-label="Toggle custom soundboard"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 justify-self-end">
          <div 
            className={`hidden sm:flex items-center gap-5 text-sm font-bold uppercase ${textColorClass} ${containerBgClass} px-5 py-2 rounded-full border`}
            style={{ fontFamily: "'Baloo 2', cursive" }}
          >
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--theme)]" /> 
              <span className="translate-y-[1px] font-medium">{time.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--theme)]" /> 
              <span className="translate-y-[1px] font-medium">{time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
            </span>
            
            {battery.level !== null && (
              <div className="flex items-center gap-2">
                <Battery className={`w-5 h-5 ${battery.charging ? 'text-green-500 animate-pulse' : ''}`} />
                <span className="translate-y-[1px] font-medium">{battery.level}%</span>
              </div>
            )}
          </div>
          
          <div className={`flex items-center gap-1.5 ${containerBgClass} rounded-full p-1 border`}>
            <button 
              onClick={() => onViewProfile?.()} 
              aria-label="View user profile"
              className="w-8 h-8 rounded-full border border-transparent hover:border-[var(--theme)] overflow-hidden transition-all active:scale-90"
            >
              {profilePic ? (
                <img src={profilePic} className="w-full h-full object-cover" alt="User avatar" />
              ) : (
                <UserCircle className="w-full h-full p-1 text-[var(--theme)]" />
              )}
            </button>

            <button 
              onClick={() => setShowSettings(true)} 
              aria-label="Open global dashboard settings"
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
