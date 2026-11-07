import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, RefreshCcw, Pencil, Trash2, Check, X, Headphones, CornerDownRight, Image as ImageIcon, Loader2 } from 'lucide-react'; 
import { ChatPrivacyModal } from './ChatPrivacyModal';
import { FriendViewModal } from './FriendViewModal';
import { ProfileAvatar } from './SettingsModal';

const API_BASE_URL = 'http://localhost:5000/api/messages';

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

function isImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return (
    url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) !== null ||
    url.includes('supabase.co/storage/v1/object/public/') ||
    url.includes('i.imgur.com/') ||
    url.includes('media.discordapp.net/') ||
    url.includes('cdn.discordapp.com/')
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
  displayName
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

  // States for Typing Indicator, Quote Replies, and Image Attachments
  const [replyingTo, setReplyingTo] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState('');
  const [lightboxImage, setLightboxImage] = useState(null);

  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const myId = getPersistentId();

  useEffect(() => {
    if (displayName) {
      setUsername(displayName);
    }
  }, [displayName]);

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

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(API_BASE_URL);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, []);

  const syncUserStatsToDatabase = useCallback(async (newName) => {
    const currentName = newName || username || localStorage.getItem('capy-display-name') || localStorage.getItem('capy-username');
    if (!currentName) return;
  }, [username]);

  useEffect(() => {
    fetchMessages();

    const interval = setInterval(fetchMessages, 1000);

    const handlePfpUpdated = () => {
      fetchMessages();
    };

    window.addEventListener('capy-pfp-updated', handlePfpUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener('capy-pfp-updated', handlePfpUpdated);
    };
  }, [fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers, pendingImageUrl]);

  const handleTypingInput = (e) => {
    const currentVal = e.target.value;
    setText(currentVal);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }

    setUploadingImage(true);

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPendingImageUrl(reader.result);
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Image upload failed:', err);
      setUploadingImage(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

    await syncUserStatsToDatabase(newName);
    fetchMessages();
  };

  const handleSend = async () => {
    if (!text.trim() && !pendingImageUrl) return;

    const currentAvatar = ownPfp || getStoredAvatar();
    const currentFrame = localStorage.getItem('capy-selected-frame') || null;
    const currentEffect = localStorage.getItem('capy-selected-effect') || null;

    const messageText = text.trim();
    const attachedImage = pendingImageUrl || (isImageUrl(messageText) ? messageText : null);

    const currentReply = replyingTo ? {
      username: replyingTo.username,
      content: replyingTo.content
    } : null;

    setText(''); 
    setPendingImageUrl('');
    setReplyingTo(null);

    const tempId = 'temp_' + Date.now();
    const tempMessage = {
      id: tempId,
      username,
      content: messageText,
      image_url: attachedImage,
      user_id: myId,
      avatar_url: currentAvatar || null,
      frame_url: currentFrame,
      effect_url: currentEffect,
      created_at: new Date().toISOString(),
      reply_to: currentReply
    };
    
    // Optimistic UI update
    setMessages(prev => [...prev, tempMessage]);

    try {
      const res = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          content: messageText,
          image_url: attachedImage,
          user_id: myId,
          avatar_url: currentAvatar || null,
          frame_url: currentFrame,
          effect_url: currentEffect,
          reply_to: currentReply
        })
      });

      if (res.ok) {
        const savedMessage = await res.json();
        setMessages(prev => prev.map(m => m.id === tempId ? savedMessage : m));
      } else {
        console.error('Server returned error status:', res.status);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }

    fetchMessages();
  };

  const handleSaveEdit = async (id) => {
    if (!editText.trim()) return;

    setMessages(prev => prev.map(m => m.id === id ? { ...m, content: editText.trim(), is_edited: true } : m));
    setEditingId(null);
    setEditText('');

    try {
      await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editText.trim() })
      });
    } catch (err) {
      console.error('Failed to update message:', err);
    }

    fetchMessages();
  };

  const handleDeleteMessage = async (id) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    if (editingId === id) setEditingId(null);

    try {
      await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error('Failed to delete message:', err);
    }

    fetchMessages();
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
              <Headphones className="w-3 h-3"/>
              {isInVoice ? 'In Voice' : 'Join Voice'}
            </button>
          )}

          {isJoined && (
            <button 
              onClick={() => setIsJoined(false)} 
              className="text-zinc-200 hover:text-[var(--theme)] p-1 hover:bg-white/5 rounded-md transition-all outline-none"
              title="Change Identity"
            >
              <RefreshCcw className="w-3.5 h-3.5"/>
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
              className={`w-full text-xs p-3 rounded-xl border outline-none ${
                isLightMode ? 'bg-black/5 border-black/10 text-black' : 'bg-white/5 border-white/10 text-zinc-100'
              }`}
            />
          </div>
          <button type="submit" className="w-full py-3 bg-[var(--theme)] text-black font-bold text-[10px] rounded-xl hover:scale-[1.02] active:scale-95 transition-all">
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

                const avatarUrlToUse = m.avatar_url || (isOwner ? (ownPfp || getStoredAvatar()) : '');
                const frameUrlToUse = m.frame_url || (isOwner ? (localStorage.getItem('capy-selected-frame') || '') : '');
                const effectUrlToUse = m.effect_url || (isOwner ? (localStorage.getItem('capy-selected-effect') || '') : '');

                const hasInlineImage = m.image_url || (isImageUrl(m.content) ? m.content : null);

                return (
                  <div key={m.id || i} className="group/msg flex items-start gap-2 text-left relative py-1">
                    <button 
                      onClick={() => handleOpenProfile(m)}
                      className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none flex-shrink-0"
                    >
                      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                        <ProfileAvatar effectUrl={effectUrlToUse} frameUrl={frameUrlToUse} pfpUrl={avatarUrlToUse} size="w-8 h-8"/>
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

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setReplyingTo(m)}
                            className="opacity-0 group-hover/msg:opacity-100 p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-[var(--theme)] transition-all"
                            title="Reply to message"
                          >
                            <CornerDownRight className="w-3 h-3"/>
                          </button>

                          {isOwner && !isEditingThis && (
                            <div className="flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingId(m.id);
                                  setEditText(m.content);
                                }}
                                className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-all"
                                title="Edit message"
                              >
                                <Pencil className="w-3 h-3"/>
                              </button>
                              <button
                                onClick={() => handleDeleteMessage(m.id)}
                                className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-red-400 transition-all"
                                title="Delete message"
                              >
                                <Trash2 className="w-3 h-3"/>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Display Quoted Reply if present */}
                      {m.reply_to && (
                        <div className="bg-black/30 border-l-2 border-[var(--theme)] px-2 py-1 rounded-r-md my-1 text-[10px] text-zinc-400">
                          <span className="font-bold text-white">{m.reply_to.username}</span>
                          <p className="truncate opacity-80">{m.reply_to.content}</p>
                        </div>
                      )}

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
                            className={isLightMode ? 'bg-white border-black/20 text-black px-2 py-1 rounded text-xs outline-none' : 'bg-white/10 border-white/20 text-white px-2 py-1 rounded text-xs outline-none'}
                            autoFocus
                          />
                          <button onClick={() => handleSaveEdit(m.id)} className="p-1 hover:bg-white/10 rounded text-emerald-400">
                            <Check className="w-3.5 h-3.5"/>
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1 hover:bg-white/10 rounded text-zinc-400">
                            <X className="w-3.5 h-3.5"/>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {m.content && !isImageUrl(m.content) && (
                            <p className={`mt-0.5 text-xs break-words leading-relaxed ${isLightMode ? 'text-black' : 'text-zinc-100'}`}>
                              {m.content}
                              {m.is_edited && (
                                <span className="text-[10px] text-zinc-500 font-normal ml-1 select-none">
                                  (edited)
                                </span>
                              )}
                            </p>
                          )}

                          {hasInlineImage && (
                            <div className="mt-1.5 max-w-[220px] rounded-xl overflow-hidden border border-white/10 bg-black/40 group/img relative">
                              <img 
                                src={hasInlineImage} 
                                alt="Chat attachment" 
                                className="w-full h-auto object-cover max-h-48 rounded-xl hover:scale-105 transition-transform cursor-pointer"
                                onClick={() => setLightboxImage(hasInlineImage)}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Indicator Banner */}
          {Object.keys(typingUsers).length > 0 && (
            <div className="text-[10px] text-[var(--theme)] italic px-1 animate-pulse">
              {Object.values(typingUsers).join(', ')} {Object.values(typingUsers).length === 1 ? 'is' : 'are'} typing...
            </div>
          )}

          {/* Pending Image Attachment Banner */}
          {pendingImageUrl && (
            <div className="flex items-center justify-between bg-white/5 border border-white/10 p-2 rounded-xl text-xs">
              <div className="flex items-center gap-2 truncate text-zinc-300">
                <img src={pendingImageUrl} alt="Attachment Preview" className="w-8 h-8 object-cover rounded-lg border border-white/10" />
                <span className="text-[10px] font-bold text-[var(--theme)]">Image/GIF Attached</span>
              </div>
              <button 
                onClick={() => setPendingImageUrl('')}
                className="text-zinc-500 hover:text-red-400 font-bold p-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Replying-To Banner Preview */}
          {replyingTo && (
            <div className="flex items-center justify-between bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs">
              <div className="flex items-center gap-2 truncate text-zinc-300">
                <CornerDownRight className="w-3 h-3 text-[var(--theme)] shrink-0" />
                <span className="font-bold text-[var(--theme)]">Replying to {replyingTo.username}:</span>
                <span className="truncate opacity-75">{replyingTo.content}</span>
              </div>
              <button 
                onClick={() => setReplyingTo(null)}
                className="text-zinc-500 hover:text-white ml-2 font-bold"
              >
                ✕
              </button>
            </div>
          )}
          
          <div className="relative flex items-center gap-1.5">
            {/* Hidden File Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept="image/*" 
              className="hidden" 
            />

            {/* Image Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="p-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-[var(--theme)] transition-all flex items-center justify-center shrink-0"
              title="Attach Image"
            >
              {uploadingImage ? (
                <Loader2 className="w-4 h-4 animate-spin text-[var(--theme)]" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
            </button>

            <div className="relative flex-1 flex items-center">
              <input 
                value={text}
                onChange={handleTypingInput}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Message..."
                className={`w-full text-xs p-2.5 pr-10 rounded-lg border outline-none ${
                  isLightMode ? 'bg-black/5 border-black/10 text-black' : 'bg-white/5 border-white/10 text-zinc-100'
                }`}
              />
              <button
                type="button"
                onClick={handleSend}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-md transition-all text-[var(--theme)]"
              >
                <Send className="w-4 h-4"/>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Image Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[700] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={lightboxImage} 
              alt="Full Preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}

      <div className="text-center mt-1">
        <button 
          type="button"
          onClick={() => setShowPrivacy(true)}
          className="text-[9px] text-zinc-400 hover:text-zinc-200 underline tracking-wide transition-colors uppercase font-mono rounded px-1"
        >
          Privacy & Data Notice
        </button>
      </div>

      <ChatPrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />

      {selectedUserProfile && (
        <FriendViewModal 
          friend={selectedUserProfile.friend} 
          gamesData={gamesData} 
          isOwnProfile={selectedUserProfile.isOwnProfile} 
          myAchievements={myAchievements} 
          ownPfp={selectedUserProfile.isOwnProfile ? (ownPfp || getStoredAvatar()) : selectedUserProfile.friend?.decoded?.p}
          onClose={() => setSelectedUserProfile(null)}
        />
      )}
    </div>
  );
}

export default ChatCard;
