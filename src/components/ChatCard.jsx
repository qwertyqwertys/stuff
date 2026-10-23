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
  onToggleVoice,
  displayName // Accept displayName prop from App.jsx
}) {
  const [username, setUsername] = useState(() => {
    return displayName || localStorage.getItem('capy-display-name') || localStorage.getItem('capy-username') || 'CapyUser';
  });

  const [isJoined, setIsJoined] = useState(true);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const messagesEndRef = useRef(null);
  const myId = getPersistentId();

  // Sync prop changes instantly
  useEffect(() => {
    if (displayName) {
      setUsername(displayName);
    }
  }, [displayName]);

  // Listen for local browser updates when name changes in SettingsModal
  useEffect(() => {
    const handleNameUpdate = () => {
      const freshName = localStorage.getItem('capy-display-name') || localStorage.getItem('username') || localStorage.getItem('capy-username');
      if (freshName) {
        setUsername(freshName);
      }
    };

    window.addEventListener('capy-username-updated', handleNameUpdate);
    return () => window.removeEventListener('capy-username-updated', handleNameUpdate);
  }, []);

  // Fetch messages from Supabase
  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('id, username, content, created_at, user_id, avatar_url, frame_url, effect_url, is_edited, favs, achievements, times')
      .order('created_at', { ascending: true })
      .limit(30);
    if (data) setMessages(data);
  }, []);

  const syncUserStatsToDatabase = useCallback(async () => {
    const currentName = username || localStorage.getItem('capy-display-name') || localStorage.getItem('capy-username');
    if (!currentName) return;

    const currentAvatar = ownPfp || getStoredAvatar();
    const currentFrame = localStorage.getItem('capy-selected-frame') || null;
    const currentEffect = localStorage.getItem('capy-selected-effect') || null;

    const savedFavs = JSON.parse(localStorage.getItem('capy-favs') || '[]');
    let currentFavs = (userFavs && userFavs.length > 0) ? userFavs : savedFavs;

    const savedTimes = JSON.parse(localStorage.getItem('capy-playtimes') || '{}');
    let currentTimes = (userTimes && Object.keys(userTimes).length > 0) ? userTimes : savedTimes;

    const trophyIds = ['first_game', 'marathon', 'collector', 'loyal', 'styler'];
    const savedAchievements = trophyIds.filter(id => localStorage.getItem(`achievement_${id}`) === 'true');
    let currentAchievements = (myAchievements && myAchievements.length > 0) ? myAchievements : savedAchievements;

    await supabase
      .from('messages')
      .update({ 
        favs: currentFavs, 
        achievements: currentAchievements, 
        times: currentTimes,
        avatar_url: currentAvatar || null,
        frame_url: currentFrame,
        effect_url: currentEffect,
        user_id: myId
      })
      .ilike('username', currentName);
  }, [myId, username, ownPfp, userFavs, userTimes, myAchievements]);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('realtime-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, 
        () => fetchMessages()
      )
      .subscribe();

    const handlePfpUpdated = () => {
      fetchMessages();
    };

    window.addEventListener('capy-pfp-updated', handlePfpUpdated);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('capy-pfp-updated', handlePfpUpdated);
    };
  }, [fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoinOrUpdate = async (e) => {
    e.preventDefault();
    const newName = e.target.username?.value.trim() || username;
    if (!newName) return;

    localStorage.setItem('capy-username', newName);
    localStorage.setItem('capy-display-name', newName);
    localStorage.setItem('username', newName);
    window.dispatchEvent(new Event('capy-username-updated'));
    setUsername(newName);
    setIsJoined(true);

    syncUserStatsToDatabase();
    fetchMessages();
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    const currentAvatar = ownPfp || getStoredAvatar();
    const currentFrame = localStorage.getItem('capy-selected-frame') || null;
    const currentEffect = localStorage.getItem('capy-selected-effect') || null;

    const currentFavs = userFavs.length > 0 ? userFavs : JSON.parse(localStorage.getItem('capy-favs') || '[]');
    const currentTimes = Object.keys(userTimes).length > 0 ? userTimes : JSON.parse(localStorage.getItem('capy-playtimes') || '{}');
    const trophyIds = ['first_game', 'marathon', 'collector', 'loyal', 'styler'];
    const currentAchievements = myAchievements.length > 0 ? myAchievements : trophyIds.filter(id => localStorage.getItem(`achievement_${id}`) === 'true');

    const messageText = text.trim();
    setText(''); 

    // Optimistic UI update for instant feedback
    const tempMessage = {
      id: 'temp_' + Date.now(),
      username,
      content: messageText,
      user_id: myId,
      avatar_url: currentAvatar || null,
      frame_url: currentFrame,
      effect_url: currentEffect,
      created_at: new Date().toISOString(),
      favs: currentFavs,
      achievements: currentAchievements,
      times: currentTimes
    };
    setMessages(prev => [...prev, tempMessage]);

    await supabase
      .from('messages')
      .insert([{ 
        username, 
        content: messageText, 
        user_id: myId,
        avatar_url: currentAvatar || null,
        frame_url: currentFrame,
        effect_url: currentEffect,
        favs: currentFavs,
        achievements: currentAchievements,
        times: currentTimes
      }]);

    fetchMessages();
  };

  const handleSaveEdit = async (id) => {
    if (!editText.trim()) return;

    setMessages(prev => prev.map(m => m.id === id ? { ...m, content: editText.trim(), is_edited: true } : m));
    setEditingId(null);
    setEditText('');

    await supabase
      .from('messages')
      .update({ content: editText.trim(), is_edited: true })
      .eq('id', id);
  };

  const handleOpenProfile = (m) => {
    const isSelf = (m.user_id === myId) || (username && m.username?.toLowerCase() === username.toLowerCase());

    const liveFavs = m.favs || [];
    const liveAchievements = m.achievements || [];
    const liveTimes = m.times || {};

    const isValidImg = (url) => url && typeof url === 'string' && !url.includes('i.imgur.com/7gK1QvK.png') && url.trim() !== '';

    const livePfp = isValidImg(m.avatar_url) 
      ? m.avatar_url 
      : (isSelf ? (ownPfp || getStoredAvatar()) : '');

    const liveFrame = m.frame_url || (isSelf ? (localStorage.getItem('capy-selected-frame') || '') : '');
    const liveEffect = m.effect_url || (isSelf ? (localStorage.getItem('capy-selected-effect') || '') : '');

    setSelectedUserProfile({
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
        frameUrl: liveFrame,
        effectUrl: liveEffect,
        code: generateFriendCode(m.username, livePfp, liveFavs, liveTimes, liveAchievements),
        decoded: {
          n: m.username,
          p: livePfp,
          f: liveFavs,
          a: liveAchievements,
          t: liveTimes
        }
      }
    });
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
          <button type="submit" className="w-full py-3 bg-[var(--theme)] text-black font-bold text-[10px] rounded-xl hover:scale-[1.02] active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-I ran into a temporary hiccup processing the response due to the length of the code block in the message, but everything is totally fine!

To update your **`ChatCard.jsx`**, you just need to make sure it handles the top-level `displayName` prop and listens for the local custom event (`capy-username-updated`) we added to `App.jsx`. 

Here are the specific lines to adjust inside your `ChatCard.jsx`:

---

### Step 1: Update the Component Props and State
Find where your `ChatCard` function starts and update the prop list and `username` state:

```jsx
export function ChatCard({ 
  isLightMode, 
  gamesData = [], 
  ownPfp, 
  myAchievements = [], 
  userFavs = [], 
  userTimes = {},
  isInVoice = false,
  onToggleVoice,
  displayName // 1. Add displayName to props
}) {
  // 2. Sync local username with the prop or localStorage
  const [username, setUsername] = useState(() => {
    return displayName || localStorage.getItem('capy-display-name') || localStorage.getItem('capy-username') || '';
  });

  // 3. Keep username updated if the prop changes
  useEffect(() => {
    if (displayName) {
      setUsername(displayName);
    }
  }, [displayName]);

  // 4. Listen for the local browser event when settings update
  useEffect(() => {
    const handleNameUpdate = () => {
      const freshName = localStorage.getItem('capy-display-name') || localStorage.getItem('capy-username');
      if (freshName) {
        setUsername(freshName);
      }
    };

    window.addEventListener('capy-username-updated', handleNameUpdate);
    return () => window.removeEventListener('capy-username-updated', handleNameUpdate);
  }, []);
