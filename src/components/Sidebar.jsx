// src/components/Sidebar.jsx
import React from 'react';
import { Hash, Volume2, MessageSquare, Bell } from 'lucide-react';
import useChatNotifications from '../hooks/useChatNotifications';

const DEFAULT_CHANNELS = [
  { id: 'general', name: 'general', type: 'text' },
  { id: 'music', name: 'music', type: 'text' },
  { id: 'gaming', name: 'gaming', type: 'text' },
  { id: 'global-voice-room', name: 'Voice Lounge', type: 'voice' },
];

export default function Sidebar({
  currentUserId,
  activeChannelId = 'general',
  onSelectChannel,
  channels = DEFAULT_CHANNELS,
  currentUser,
}) {
  const { unreadCounts, requestNotificationPermission } = useChatNotifications({
    currentUserId,
    activeChannelId,
  });

  return (
    <aside className="w-64 h-full min-h-screen bg-[#0d1117] border-r border-zinc-800/80 flex flex-col justify-between p-4 text-white select-none">
      {/* Top Header & Channel List */}
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between px-2 pt-2 border-b border-zinc-800/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h1 className="font-bold text-base tracking-tight text-white">Chat App</h1>
          </div>

          {/* Enable Desktop Notifications Button */}
          <button
            onClick={requestNotificationPermission}
            className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/80 rounded-xl transition-colors"
            title="Enable Desktop Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>
        </div>

        {/* Channels */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 px-2 mb-1">
            Channels
          </span>

          {channels.map((channel) => {
            const unreadCount = unreadCounts[channel.id] || 0;
            const isActive = activeChannelId === channel.id;
            const isVoice = channel.type === 'voice';

            return (
              <button
                key={channel.id}
                onClick={() => onSelectChannel && onSelectChannel(channel.id)}
                className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  {isVoice ? (
                    <Volume2
                      className={`w-4 h-4 ${
                        isActive ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'
                      }`}
                    />
                  ) : (
                    <Hash
                      className={`w-4 h-4 ${
                        isActive ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'
                      }`}
                    />
                  )}
                  <span className="truncate">{channel.name}</span>
                </div>

                {/* Red Unread Badge */}
                {unreadCount > 0 && !isActive && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Profile Section */}
      {currentUser && (
        <div className="pt-3 border-t border-zinc-800/80 flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-emerald-400 overflow-hidden">
            {currentUser.avatar || currentUser.avatar_url ? (
              <img
                src={currentUser.avatar || currentUser.avatar_url}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              (currentUser.username || currentUser.name || 'U').charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex flex-col truncate">
            <span className="text-xs font-semibold text-white truncate">
              {currentUser.username || currentUser.name || 'User'}
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">● Online</span>
          </div>
        </div>
      )}
    </aside>
  );
}
