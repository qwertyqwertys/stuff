import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, RefreshCcw, Pencil, Check, X, Headphones } from 'lucide-react'; 
import { supabase } from '../supabaseClient';
import { ChatPrivacyModal } from './ChatPrivacyModal';
import { FriendViewModal } from './FriendViewModal';
import { ProfileAvatar } from './SettingsModal';

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
  userTimes = {},
  isInVoice = false,
  onToggleVoice
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

  const syncUserStatsToDatabase = useCallback(async () => {
    const currentName = username || localStorage.getItem('capy-username') || localStorage.getItem('capy-display-name');
    if (!currentName) return;

    const currentAvatar = ownPfp || getStoredAvatar();
    const savedFavs = JSON.parse(
      localStorage.getItem('capy-favs') || 
      localStorage.getItem('favorites') || 
      '[]'
    );
    let currentFavs = (userFavs && userFavs.length > 0) ? userFavs : savedFavs;

    const savedTimes = JSON.parse(localStorage.getItem('capy-playtimes') || '{}');
    let currentTimes = (userTimes && Object.keys(userTimes).length > 0) ? userTimes : savedTimes;

    const trophyIds = ['first_game', 'marathon', 'collector', 'loyal', 'styler'];
    const savedAchievements = trophyIds.filter(id => localStorage.getItem(`achievement_${id}`) === 'true');
    let currentAchievements = (myAchievements && myAchievements.length > 0) ? myAchievements : savedAchievements;

    if (currentFavs.length === 0 && currentAchievements.length === 0 && Object.keys(currentTimes).length === 0) {
      const { data: remoteData } = await supabase
        .from('messages')
        .select('favs, achievements, times, avatar_url')
        .ilike('username', currentName)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (remoteData) {
        if (remoteData.favs && remoteData.favs.length > 0) {
          currentFavs = remoteData.favs;
          localStorage.setItem('capy-favs', JSON.stringify(currentFavs));
        }
        if (remoteData.achievements && remoteData.achievements.length > 0) {
          currentAchievements = remoteData.achievements;
          remoteData.achievements.forEach(id => localStorage.getItem(`achievement_${id}`, 'true'));
        }
        if (remoteData.times && Object.keys(remoteData.times).length > 0) {
          currentTimes = remoteData.times;
          localStorage.setItem('capy-playtimes', JSON.stringify(currentTimes));
        }
      }
    }

    if (currentFavs.length > 0 || currentAchievements.length > 0 || Object.keys(currentTimes).length > 0) {
      await supabase
        .from('messages')
        .update({ 
          favs: currentFavs, 
          achievements: currentAchievements, 
          times: currentTimes,
          avatar_url: currentAvatar || null,
          user_id: myId
        })
        .ilike('username', currentName);
    }
  }, [myId, username, ownPfp, userFavs, userTimes, myAchievements]);

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
    
    setTimeout(() => {
      syncUserStatsToDatabase();
    }, 100);

    const channel = supabase
      .channel('realtime-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, 
        () => fetchMessages() 
      )
      .subscribe();

    const handlePfpUpdated = () => {
      fetchMessages();
      syncUserStatsToDatabase();
    };

    window.addEventListener('capy-pfp-updated', handlePfpUpdated);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('capy-pfp-updated', handlePfpUpdated);
    };
  }, [syncUserStatsToDatabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoinOrUpdate = async (e) => {
    e.preventDefault();
    const newName = e.target.username?.value.trim() || username;
    if (!newName) return;

    localStorage.setItem('capy-username', newName);
    localStorage.setItem('capy-display-name', newName);
    setUsername(newName);
    setIsJoined(true);

    syncUserStatsToDatabase();
    fetchMessages();
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    const currentAvatar = ownPfp || getStoredAvatar();

    const currentFavs = userFavs.length > 0 ? userFavs : JSON.parse(localStorage.getItem('capy-favs') || '[]');
    const currentTimes = Object.keys(userTimes).length > 0 ? userTimes : JSON.parse(localStorage.getItem('capy-playtimes') || '{}');
    const trophyIds = ['first_game', 'marathon', 'collector', 'loyal', 'styler'];
    const currentAchievements = myAchievements.length > 0 ? myAchievements : trophyIds.filter(id => localStorage.getItem(`achievement_${id}`) === 'true');

    const messageText = text.trim();
    setText(''); 

    await supabase
      .from('messages')
      .insert([{ 
        username, 
        content: messageText, 
        user_id: myId,
        avatar_url: currentAvatar || null,
        favs: currentFavs,
        achievements: currentAchievements,
        times: currentTimes
      }]);

    syncUserStatsToDatabase();
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
    const isSelf = (m.user_id === myId) || (username && m.username?.toLowerCase() === username.toLowerCase());

    let liveFavs = m.favs || [];
    let liveAchievements = m.achievements || [];
    let liveTimes = m.times || {};

    const isValidImg = (url) => url && typeof url === 'string' && !url.includes('i.imgur.com/7gK1QvK.png') && url.trim() !== '';

    let livePfp = isValidImg(m.avatar_url) 
      ? m.avatar_url 
      : (isSelf ? (ownPfp || getStoredAvatar()) : '');

    if (isSelf) {
      const savedFavs = JSON.parse(localStorage.getItem('capy-favs') || '[]');
      if (savedFavs.length > 0) liveFavs = savedFavs;

      const savedTimes = JSON.parse(localStorage.getItem('capy-playtimes') || '{}');
      if (Object.keys(savedTimes).length > 0) liveTimes = savedTimes;

      const trophyIds = ['first_game', 'marathon', 'collector', 'loyal', 'styler'];
      const savedAchievements = trophyIds.filter(id => localStorage.getItem(`achievement_${id}`) === 'true');
      if (savedAchievements.length > 0) liveAchievements = savedAchievements;
    }

    const initialProfile = {
      isOwnProfile: isSelf,
      friend: {
        name: m.username,
        displayName: m.username,
        favs: liveFavs,
        f: liveFavs,
        times: liveTimes,
        t: liveTimes,
        achievements: liveAchievements,
        a: liveAchievements,
        pfp: livePfp,
        frameUrl: isSelf ? (localStorage.getItem('capy-selected-frame') || '') : '',
        effectUrl: isSelf ? (localStorage.getItem('capy-selected-effect') || '') : '',
        code: generateFriendCode(m.username, livePfp, liveFavs, liveTimes, liveAchievements),
        decoded: {
          n: m.username,
          p: livePfp,
          f: liveFavs,
          a: liveAchievements,
          t: liveTimes
        }
      }
    };

    setSelectedUserProfile(initialProfile);

    if (!isSelf && m.username) {
      const { data: latestMsg } = await supabase
        .from('messages')
        .select('favs, achievements, times, avatar_url')
        .ilike('username', m.username)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestMsg) {
        const fetchedFavs = latestMsg.favs || liveFavs;
        const fetchedAchievements = latestMsg.achievements || liveAchievements;
        const fetchedTimes = latestMsg.times || liveTimes;
        const fetchedPfp = isValidImg(latestMsg.avatar_url) ? latestMsg.avatar_url : '';

        setSelectedUserProfile({
          isOwnProfile: false,
          friend: {
            name: m.username,
            displayName: m.username,
            favs: fetchedFavs,
            f: fetchedFavs,
            times: fetchedTimes,
            t: fetchedTimes,
            achievements: fetchedAchievements,
            a: fetchedAchievements,
            pfp: fetchedPfp,
            frameUrl: '',
            effectUrl: '',
            code: generateFriendCode(m.username, fetchedPfp, fetchedFavs, fetchedTimes, fetchedAchievements),
            decoded: {
              n: m.username,
              p: fetchedPfp,
              f: fetchedFavs,
              a: fetchedAchievements,
              t: fetchedTimes
            }
          }
        });
      }
    }
  };
  
  return (
    <div className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
      isLightMode ? 'bg-white border-black/5 shadow-sm' : 'bg-[#0f0f11] border-white/5 hover:border-[var(--theme)]/50'
    } p-5 h-full flex flex-col gap-4`}>
      
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-1 border-b border-white/5">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--theme)]">
          Chat
        </h3>
        
        <div className="flex items-center gap-2">
          {isJoined && onToggleVoice && (
            <button
              type="button"
              onClick={onToggleVoice}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border transition-all ${
                isInVoice
                  ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300'
              }`}
              title={isInVoice ? "Leave Voice Channel" : "Join Voice Channel"}
            >
              <Headphones className="w-3 h-3" />
              {isInVoice ? 'In Voice' : 'Join Voice'}
            </button>
          )}

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
                const isOwner = (m.user_id === myId) || (username && m.username?.toLowerCase() === username.toLowerCase());
                const isEditingThis = editingId === m.id;

                return (
                  <div key={m.id || i} className="group/msg flex items-start gap-3 text-left relative py-1">
                    <button 
                      onClick={() => handleOpenProfile(m)}
                      className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none flex-shrink-0 pt-0.5"
                      title={`View ${m.username}'s profile`}
                    >
                      <div className="w-10 h-10 flex items-center justify-center">
                        {isOwner ? (
                          <ProfileAvatar 
                            pfpUrl={m.avatar_url || ownPfp || getStoredAvatar()} 
                            frameUrl={localStorage.getItem('capy-selected-frame')} 
                            effectUrl={localStorage.getItem('capy-selected-effect')} 
                            size="w-8 h-8" 
                          />
                        ) : (
                          <UserAvatar src={m.avatar_url} alt={m.username} />
                        )}
                      </div>
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

export default ChatCard;
