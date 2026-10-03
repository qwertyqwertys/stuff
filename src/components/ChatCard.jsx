import React, { useState, useEffect, useRef } from 'react';
import { Send, RefreshCcw, Pencil, Check, X } from 'lucide-react'; 
import { supabase } from '../supabaseClient';
import { ChatPrivacyModal } from './ChatPrivacyModal';
import { FriendViewModal } from './FriendViewModal';

function formatTimestamp(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function DefaultAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-[#111923] border border-[#1e3a5f] flex items-center justify-center flex-shrink-0 overflow-hidden">
      <svg className="w-5 h-5 text-[#22d3ee]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="9" r="3" />
        <path d="M6.5 17.5c1.2-2 3.3-3 5.5-3s4.3 1 5.5 3" />
      </svg>
    </div>
  );
}

function UserAvatar({ src, alt }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return <DefaultAvatar />;
  }

  return (
    <img 
      src={src} 
      alt={alt || 'User avatar'} 
      onError={() => setHasError(true)}
      className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-white/10"
    />
  );
}

const getPersistentId = () => {
  let id = localStorage.getItem('capy-uid');
  if (!id) {
    id = 'user_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('capy-uid', id);
  }
  return id;
};

const getStoredAvatar = () => {
  return localStorage.getItem('capy-pfp') || 
         localStorage.getItem('capy-avatar') || 
         localStorage.getItem('user-avatar') || 
         '';
};

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

export function ChatCard({ 
  isLightMode, 
  gamesData = [], 
  ownPfp, 
  myAchievements = [], 
  userFavs = [], 
  userTimes = {} 
}) {
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('capy-username') || localStorage.getItem('capy-display-name') || '';
  });
  const [isJoined, setIsJoined] = useState(!!username);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const messagesEndRef = useRef(null);
  const myId = getPersistentId();

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(50);
    if (data) setMessages(data);
  };

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('realtime-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, 
        () => fetchMessages() 
      )
      .subscribe();

    const handlePfpUpdated = () => fetchMessages();
    window.addEventListener('capy-pfp-updated', handlePfpUpdated);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('capy-pfp-updated', handlePfpUpdated);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoinOrUpdate = async (e) => {
    e.preventDefault();
    const newName = e.target.username?.value.trim() || username;
    if (!newName) return;

    const currentAvatar = getStoredAvatar();

    await supabase
      .from('messages')
      .update({ username: newName, avatar_url: currentAvatar || null })
      .eq('user_id', myId);

    localStorage.setItem('capy-username', newName);
    localStorage.setItem('capy-display-name', newName);
    setUsername(newName);
    setIsJoined(true);

    await fetchMessages();
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    const currentAvatar = getStoredAvatar();

    const currentFavs = userFavs.length > 0 ? userFavs : JSON.parse(localStorage.getItem('capy-favs') || '[]');
    const currentTimes = Object.keys(userTimes).length > 0 ? userTimes : JSON.parse(localStorage.getItem('capy-playtimes') || '{}');
    const trophyIds = ['first_game', 'marathon', 'collector', 'loyal', 'styler'];
    const currentAchievements = myAchievements.length > 0 ? myAchievements : trophyIds.filter(id => localStorage.getItem(`achievement_${id}`) === 'true');

    await supabase
      .from('messages')
      .insert([{ 
        username, 
        content: text.trim(), 
        user_id: myId,
        avatar_url: currentAvatar || null,
        favs: currentFavs,
        achievements: currentAchievements,
        times: currentTimes
      }]);
    setText('');
  };

  const handleSaveEdit = async (id) => {
    if (!editText.trim()) return;

    await supabase
      .from('messages')
      .update({ content: editText.trim(), is_edited: true })
      .eq('id', id);

    setEditingId(null);
    setEditText('');
    fetchMessages();
  };

  const handleOpenProfile = async (m) => {
    const isSelf = m.user_id === myId;
    if (isSelf) {
      let savedFavs = JSON.parse(
        localStorage.getItem('capy-favs') || 
        localStorage.getItem('favorites') || 
        localStorage.getItem('capy_favorites') || 
        '[]'
      );
      let liveFavs = (userFavs && userFavs.length > 0) ? userFavs : savedFavs;

      let savedTimes = JSON.parse(localStorage.getItem('capy-playtimes') || '{}');
      let liveTimes = (userTimes && Object.keys(userTimes).length > 0) ? userTimes : savedTimes;

      const trophyIds = ['first_game', 'marathon', 'collector', 'loyal', 'styler'];
      let savedAchievements = trophyIds.filter(id => localStorage.getItem(`achievement_${id}`) === 'true');
      let liveAchievements = (myAchievements && myAchievements.length > 0) ? myAchievements : savedAchievements;

      let livePfp = ownPfp || getStoredAvatar();

      // Cross-Device Fallback: Fetch latest profile stats from Supabase if localStorage on this device is empty
      if (liveFavs.length === 0 && liveAchievements.length === 0) {
        const { data: remoteMsg } = await supabase
          .from('messages')
          .select('*')
          .eq('user_id', myId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (remoteMsg) {
          if (remoteMsg.favs) liveFavs = remoteMsg.favs;
          if (remoteMsg.achievements) liveAchievements = remoteMsg.achievements;
          if (remoteMsg.times) liveTimes = remoteMsg.times;
          if (remoteMsg.avatar_url && !livePfp) livePfp = remoteMsg.avatar_url;
        }
      }

      const generatedCode = generateFriendCode(username, livePfp, liveFavs, liveTimes, liveAchievements);

      setSelectedUserProfile({
        isOwnProfile: true,
        friend: {
          name: username,
          displayName: username,
          favs: liveFavs,
          f: liveFavs,
          times: liveTimes,
          t: liveTimes,
          achievements: liveAchievements,
          a: liveAchievements,
          pfp: livePfp,
          code: generatedCode
        }
      });
    } else {
      setSelectedUserProfile({
        isOwnProfile: false,
        friend: {
          decoded: {
            n: m.username,
            p: m.avatar_url,
            f: m.favs || [],
            a: m.achievements || [],
            t: m.times || {}
          }
        }
      });
    }
  };

  return (
    <div className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
      isLightMode ? 'bg-white border-black/5 shadow-sm' : 'bg-[#0f0f11] border-white/5 hover:border-[var(--theme)]/50'
    } p-5 h-full flex flex-col gap-4`}>
      
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--theme)]">
          Chat
        </h3>
        {isJoined && (
          <button 
            onClick={() => setIsJoined(false)} 
            className="text-zinc-200 hover:text-[var(--theme)] p-1 hover:bg-white/5 rounded-md transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            title="Change Identity"
            aria-label="Change chat username"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {!isJoined ? (
        <form onSubmit={handleJoinOrUpdate} className="flex flex-col gap-3 my-auto">
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-zinc-200">Change Name</p>
            <input 
              name="username"
              type="text"
              defaultValue={username}
              placeholder="Enter Custom Handle..."
              className={`w-full text-xs p-3 rounded-xl border outline-none transition-all focus-visible:ring-2 focus-visible:ring-[var(--theme)] ${
                isLightMode ? 'bg-black/5 border-black/10 text-black placeholder:text-zinc-500' : 'bg-white/5 border-white/10 text-zinc-100 placeholder:text-zinc-400 focus:border-[var(--theme)]'
              }`}
            />
          </div>
          <button type="submit" className="w-full py-3 bg-[var(--theme)] text-black font-bold text-[10px] rounded-xl hover:scale-[1.02] active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme)]">
            {username ? "Update Name" : "AUTHORIZE ACCESS"}
          </button>
        </form>
      ) : (
        <div className="flex flex-col h-full gap-3 overflow-hidden">
          <div className={`flex-1 overflow-y-auto rounded-xl p-3 text-[11px] font-sans space-y-3 ${isLightMode ? 'bg-black/5' : 'bg-black/45'}`}>
            {messages.length === 0 ? (
              <div className="text-zinc-400 italic text-[10px] font-mono text-center py-4">Waiting for Messages...</div>
            ) : (
              messages.map((m, i) => {
                const isOwner = m.user_id === myId;
                const isEditingThis = editingId === m.id;

                return (
                  <div key={m.id || i} className="group/msg flex items-start gap-2.5 text-left relative">
                    <button 
                      onClick={() => handleOpenProfile(m)}
                      className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none"
                      title={`View ${m.username}'s profile`}
                    >
                      <UserAvatar src={m.avatar_url} alt={m.username} />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleOpenProfile(m)}
                            className="text-[var(--theme)] font-bold text-xs hover:underline cursor-pointer focus:outline-none"
                          >
                            {m.username}
                          </button>
                          <span className="text-[9px] text-zinc-400 font-sans">
                            {formatTimestamp(m.created_at)}
                          </span>
                        </div>

                        {isOwner && !isEditingThis && (
                          <button
                            onClick={() => {
                              setEditingId(m.id);
                              setEditText(m.content);
                            }}
                            className="opacity-0 group-hover/msg:opacity-100 p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-all"
                            title="Edit message"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {isEditingThis ? (
                        <div className="mt-1 flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(m.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className={`flex-1 text-xs p-1.5 rounded-lg border outline-none ${
                              isLightMode 
                                ? 'bg-white border-black/20 text-black' 
                                : 'bg-white/10 border-white/20 text-white focus:border-[var(--theme)]'
                            }`}
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(m.id)}
                            className="p-1.5 rounded-lg bg-[var(--theme)] text-black font-bold hover:opacity-90"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 rounded-lg bg-white/10 text-zinc-300 hover:bg-white/20"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <p className={`mt-0.5 text-xs break-words leading-relaxed ${isLightMode ? 'text-black' : 'text-zinc-100'}`}>
                          {m.content}
                          {m.is_edited && (
                            <span className="text-[10px] text-zinc-500 font-normal ml-1 select-none">
                              (edited)
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="relative flex items-center">
            <input 
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Message..."
              className={`w-full text-xs p-2.5 pr-10 rounded-lg border outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme)] ${
                isLightMode ? 'bg-black/5 border-black/10 text-black placeholder:text-zinc-500' : 'bg-white/5 border-white/10 text-zinc-100 placeholder:text-zinc-400 focus:border-[var(--theme)]'
              }`}
            />
            <button
              type="button"
              onClick={handleSend}
              aria-label="Send message"
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-md transition-all cursor-pointer text-[var(--theme)] flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme)]"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="text-center mt-1">
        <button 
          type="button"
          onClick={() => setShowPrivacy(true)}
          className="text-[9px] text-zinc-400 hover:text-zinc-200 underline tracking-wide transition-colors uppercase font-mono outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme)] rounded px-1"
        >
          Privacy & Data Notice
        </button>
      </div>

      <ChatPrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />

      {selectedUserProfile && (
        <FriendViewModal
          friend={selectedUserProfile.friend}
          isOwnProfile={selectedUserProfile.isOwnProfile}
          gamesData={gamesData}
          ownPfp={selectedUserProfile.isOwnProfile ? (ownPfp || getStoredAvatar()) : selectedUserProfile.friend?.decoded?.p}
          myAchievements={myAchievements}
          onClose={() => setSelectedUserProfile(null)}
        />
      )}
    </div>
  );
}
