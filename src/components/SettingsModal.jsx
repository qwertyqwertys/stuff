import React, { useState, useEffect } from 'react';
import { 
  X, ShieldAlert, Cpu, Palette, Ghost, Zap, Video, Music, 
  Volume2, Power, Trash2, Link as LinkIcon, Upload, 
  ImageIcon, RotateCcw, Type, Users, UserPlus, Eye, Copy, Check,
  Sun, Moon, Play, Pause
} from 'lucide-react';

// --- INDEXEDDB HELPERS FOR HEAVY AUDIO FILES ---
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CapyMusicDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('songs')) {
        db.createObjectStore('songs', { keyPath: 'id' });
      }
    };
  });
};

const saveSongToIDB = async (songObj, blob) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('songs', 'readwrite');
    const store = transaction.objectStore('songs');
    store.put({ ...songObj, blob });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

const loadSongsFromIDB = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('songs', 'readonly');
      const store = transaction.objectStore('songs');
      const request = store.getAll();
      request.onsuccess = () => {
        const songs = request.result.map(song => ({
          ...song,
          url: URL.createObjectURL(song.blob)
        }));
        resolve(songs);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    return [];
  }
};

const deleteSongFromIDB = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('songs', 'readwrite');
    const store = transaction.objectStore('songs');
    store.delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export function SettingsModal({
  show, onClose, friendCode, displayName, setDisplayName,
  friends, onAddFriend, onViewFriend, onRemoveFriend,
  handlePfpUpload, handleResetPfp,
  performanceMode, setPerformanceMode,
  handleBackgroundUpload, handleAudioUpload, 
  handleResetBackground, handleResetMusic,
  bgEnabled, bgOpacity, setBgOpacity,
  bgMusic, volume, setVolume,
  isPlaying, onTogglePlay,
  panicKey, setPanicKey,
  themes, applyTheme,
  handleClearSettings, confirmClearSettings,
  handleReset, confirmReset,
  onViewOwnProfile,
  tracklist,
  isLightMode, setIsLightMode,
  activeCloak, setActiveCloak
}) {
  const [friendInput, setFriendInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [hasBackground, setHasBackground] = useState(Boolean(bgEnabled));
  
  // Persist music reset state across page reloads
  const [isMusicReset, setIsMusicReset] = useState(() => localStorage.getItem('capy-music-reset') === 'true');

  // --- CUSTOM SONG STATE VIA INDEXEDDB ---
  const [customSongs, setCustomSongs] = useState([]);

  useEffect(() => {
    loadSongsFromIDB().then(songs => setCustomSongs(songs));
  }, []);

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [songTitle, setSongTitle] = useState('');
  const [artistName, setArtistName] = useState('');

  if (!show) return null;

  const effectiveBgMusic = isMusicReset ? null : bgMusic;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(friendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddFriend = () => {
    if (friendInput.trim()) {
      onAddFriend(friendInput.trim());
      setFriendInput(''); 
    }
  };

  const handlePanicKeyDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key !== 'Escape' && e.key !== 'Tab') {
      setPanicKey(e.key);
    }
  };

  const handleCustomAudioSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingFile(file);
    setSongTitle(file.name.replace(/\.[^/.]+$/, ""));
    setArtistName('');
    setUploadModalOpen(true);
    e.target.value = '';
  };

  const saveCustomSong = async () => {
    if (!pendingFile) return;
    
    const newSongMeta = {
      id: 'custom-' + Date.now(),
      title: songTitle || 'Untitled Song',
      artist: artistName || 'Unknown Artist',
      isCustom: true
    };

    await saveSongToIDB(newSongMeta, pendingFile);
    
    const objectUrl = URL.createObjectURL(pendingFile);
    const newSongWithUrl = { ...newSongMeta, url: objectUrl };

    setCustomSongs(prev => [newSongWithUrl, ...prev]);

    // Clear reset state since a new song is chosen
    setIsMusicReset(false);
    localStorage.setItem('capy-music-reset', 'false');

    if (handleAudioUpload) {
      handleAudioUpload({ presetUrl: objectUrl });
    }

    setUploadModalOpen(false);
    setPendingFile(null);
  };

  const deleteCustomSong = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteSongFromIDB(id);
    setCustomSongs(prev => prev.filter(song => song.id !== id));
  };

  const fullTracklist = [...customSongs, ...(tracklist || [])];

  const modalBg = isLightMode ? "bg-white border-zinc-200 text-zinc-900" : "bg-zinc-900 border-white/10 text-white";
  const sectionBg = isLightMode ? "bg-zinc-100 border-zinc-200" : "bg-white/5 border-white/5";
  const inputBg = isLightMode ? "bg-white border-zinc-300 text-black placeholder:text-zinc-400" : "bg-zinc-800 border-white/10 text-white";
  const headerText = isLightMode ? "text-zinc-900" : "text-[var(--theme)]";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
      <div className={`${modalBg} border p-6 rounded-3xl max-w-md w-full relative shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar`}>
        
        {/* HEADER */}
        <div className={`flex items-center justify-between border-b ${isLightMode ? 'border-zinc-200' : 'border-white/5'} pb-4`}>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${headerText}`}>
            <ShieldAlert className={`w-5 h-5 ${isLightMode ? 'text-[var(--theme)]' : ''}`} /> System Settings
          </h2>
          <button 
            type="button"
            onClick={onClose} 
            className={`${isLightMode ? 'text-zinc-700 hover:text-black hover:bg-zinc-100' : 'text-zinc-300 hover:text-white hover:bg-white/5'} p-1 rounded-lg`}
            aria-label="Close settings"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* IDENTITY & SOCIAL */}
          <section className={`space-y-4 ${isLightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-[var(--theme)]/5 border-[var(--theme)]/10'} p-4 rounded-2xl border`}>
            <div className="flex items-center justify-between">
              <label className={`text-[10px] uppercase font-black tracking-widest flex items-center gap-2 ${isLightMode ? 'text-zinc-700' : 'text-[var(--theme)]'}`}>
                <Type className="w-3 h-3" /> Profile Identity
              </label>
              <button 
                type="button"
                onClick={onViewOwnProfile}
                className="flex items-center gap-1.5 px-3 py-1 bg-[var(--theme)] text-black rounded-full text-[9px] font-black uppercase hover:opacity-80"
              >
                <Eye className="w-3 h-3" /> View My Profile
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <label className={`p-3 ${inputBg} border rounded-xl text-[9px] font-black uppercase text-center cursor-pointer hover:border-[var(--theme)]`}>
                  <Upload className="w-3 h-3 mx-auto mb-1 text-[var(--theme)]" />
                  Upload IMG/GIF for PFP
                  <input type="file" accept="image/*" onChange={handlePfpUpload} className="hidden" />
                </label>
                <button 
                  type="button"
                  onClick={handleResetPfp}
                  className={`p-3 border rounded-xl text-[9px] font-black uppercase flex flex-col items-center justify-center gap-1 ${isLightMode ? 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100' : 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30'}`}
                >
                  <RotateCcw className="w-3 h-3" /> Reset Avatar
                </button>
              </div>
              <input 
                type="text" 
                placeholder="Custom Display Name..." 
                value={displayName} 
                onChange={(e) => setDisplayName(e.target.value.slice(0, 25))}
                className={`w-full ${inputBg} border rounded-xl p-3 text-xs outline-none font-bold`}
              />
              <div className={`${isLightMode ? 'bg-zinc-100 border-zinc-200' : 'bg-black/20 border-white/5'} p-3 rounded-xl border space-y-3`}>
                <div className="flex items-center justify-between">
                  <p className={`text-[8px] font-black uppercase leading-none ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'}`}>Your Friend Code</p>
                  <button 
                    type="button"
                    onClick={handleCopyCode}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase ${copied ? 'bg-green-500 text-black' : isLightMode ? 'bg-white text-zinc-700 border border-zinc-200' : 'bg-white/5 text-zinc-300 hover:text-white'}`}
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className={`${isLightMode ? 'bg-white border-zinc-200' : 'bg-white/5 border-white/5'} p-2 rounded-lg border max-h-20 overflow-y-auto`}>
                  <p className="text-[10px] font-mono font-black text-[var(--theme)] break-all leading-relaxed tracking-tight">
                    {friendCode}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* FRIENDS LIST */}
          <section className={`space-y-4 ${sectionBg} p-4 rounded-2xl border`}>
            <label className={`text-[10px] uppercase font-black tracking-widest flex items-center gap-2 ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'}`}>
              <Users className="w-3 h-3 text-[var(--theme)]" /> Friends List
            </label>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Enter friend code..." 
                value={friendInput}
                onChange={(e) => setFriendInput(e.target.value)}
                className={`flex-1 ${inputBg} border rounded-xl p-2.5 text-xs outline-none`}
              />
              <button 
                type="button"
                onClick={handleAddFriend}
                className="p-2.5 bg-[var(--theme)] text-black rounded-xl hover:opacity-80"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
              {friends?.length > 0 ? friends.map(friend => (
                <div key={friend.code} className={`flex items-center justify-between ${isLightMode ? 'bg-white border-zinc-200' : 'bg-white/5 border-white/5'} p-2 rounded-xl border`}>
                  <span title={friend.name} className={`text-[10px] font-bold truncate max-w-[120px] ${isLightMode ? 'text-zinc-900' : 'text-zinc-100'}`}>{friend.name}</span>
                  <div className="flex gap-1">
                    <button 
                      type="button"
                      onClick={() => onViewFriend(friend)}
                      className={`p-1.5 rounded-lg ${isLightMode ? 'bg-zinc-100 text-zinc-800 hover:bg-[var(--theme)] hover:text-black' : 'bg-white/5 text-zinc-200 hover:bg-[var(--theme)] hover:text-black'}`}
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                    <button 
                      type="button"
                      onClick={() => onRemoveFriend(friend.code)}
                      className={`p-1.5 rounded-lg ${isLightMode ? 'bg-red-50 text-red-600 hover:bg-red-500 hover:text-white' : 'bg-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-white'}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )) : (
                <p className={`text-[9px] text-center py-2 italic font-medium uppercase tracking-tighter ${isLightMode ? 'text-zinc-600' : 'text-zinc-300'}`}>No friends added yet</p>
              )}
            </div>
          </section>

          {/* PERFORMANCE MODE */}
          <section className={`space-y-4 p-4 rounded-2xl border ${isLightMode ? 'bg-yellow-50 border-yellow-200' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className={`text-[10px] uppercase font-black tracking-widest flex items-center gap-2 ${isLightMode ? 'text-yellow-800' : 'text-yellow-400'}`}>
                  <Cpu className="w-3 h-3" /> Performance Mode
                </label>
                <button 
                  type="button"
                  onClick={() => setPerformanceMode(!performanceMode)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase ${performanceMode ? 'bg-yellow-500 text-black' : isLightMode ? 'bg-white text-zinc-700 border border-zinc-300' : 'bg-white/10 text-zinc-200 border border-white/20'}`}
                >
                  <Zap className="w-3 h-3" />
                  {performanceMode ? 'ON' : 'OFF'}
                </button>
              </div>
              <p className={`text-[8px] uppercase font-bold leading-tight tracking-tighter ${isLightMode ? 'text-yellow-900' : 'text-yellow-300'}`}>
                {performanceMode 
                  ? "Music and heavy effects disabled to maximize CPU/RAM speed." 
                  : "Standard mode active. Music and visuals are enabled."}
              </p>
            </div>
          </section>

          {/* MEDIA UPLOADS */}
          <section className={`space-y-4 ${sectionBg} p-4 rounded-2xl border`}>
            <label className={`text-[10px] uppercase font-black tracking-widest flex items-center gap-2 ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'}`}>
              <ImageIcon className="w-3 h-3 text-[var(--theme)]" /> Custom Media
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className={`p-3 ${inputBg} border rounded-xl text-[9px] font-black uppercase text-center cursor-pointer hover:border-[var(--theme)]`}>
                <Upload className="w-3 h-3 mx-auto mb-1 text-[var(--theme)]" />
                Upload BG IMG/GIF
                <input 
                  type="file" 
                  accept="image/*,video/*" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setHasBackground(true);
                    }
                    if (handleBackgroundUpload) handleBackgroundUpload(e);
                  }} 
                  className="hidden" 
                />
              </label>
              <label className={`p-3 ${inputBg} border rounded-xl text-[9px] font-black uppercase text-center cursor-pointer hover:border-[var(--theme)]`}>
                <Music className="w-3 h-3 mx-auto mb-1 text-[var(--theme)]" />
                Upload MP3
                <input type="file" accept="audio/mp3,audio/*" onChange={handleCustomAudioSelect} className="hidden" />
              </label>
              
              <button 
                type="button"
                onClick={() => {
                  setHasBackground(false);
                  if (handleResetBackground) handleResetBackground();
                }}
                className={`p-2 border rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 ${isLightMode ? 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100' : 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30'}`}
              >
                <RotateCcw className="w-3 h-3" /> Reset BG
              </button>
              <button 
                type="button"
                onClick={() => {
                  setIsMusicReset(true);
                  localStorage.setItem('capy-music-reset', 'true');
                  if (handleAudioUpload) {
                    handleAudioUpload({ presetUrl: '' });
                  }
                  if (isPlaying !== false && onTogglePlay) {
                    onTogglePlay();
                  }
                }}
                className={`p-2 border rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 ${isLightMode ? 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100' : 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30'}`}
              >
                <RotateCcw className="w-3 h-3" /> Reset Music
              </button>
            </div>

            {/* VOLUME & PLAY/PAUSE CONTROLS */}
            {effectiveBgMusic && (
              <div className={`pt-2 border-t ${isLightMode ? 'border-zinc-200' : 'border-white/5'} space-y-3`}>
                <div className="flex items-center justify-between">
                  <label className={`text-[9px] uppercase font-black flex items-center gap-2 ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'}`}>
                    <Volume2 className="w-3 h-3 text-[var(--theme)]" /> Music Controls
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onTogglePlay) onTogglePlay();
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer z-10 ${
                        isLightMode 
                          ? 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300' 
                          : 'bg-white/10 text-zinc-200 hover:bg-white/20'
                      }`}
                    >
                      {isPlaying !== false ? <Pause className="w-3 h-3 text-[var(--theme)]" /> : <Play className="w-3 h-3 text-[var(--theme)]" />}
                      {isPlaying !== false ? 'Pause' : 'Play'}
                    </button>
                    <span className="text-[10px] font-mono text-[var(--theme)]">{Math.round((volume ?? 1) * 100)}%</span>
                  </div>
                </div>
                <input 
                  type="range" 
                  min="0" max="1" step="0.01"
                  value={volume ?? 1} 
                  onChange={(e) => setVolume && setVolume(parseFloat(e.target.value))}
                  className={`w-full h-1.5 ${isLightMode ? 'bg-zinc-200' : 'bg-white/20'} rounded-lg appearance-none cursor-pointer accent-[var(--theme)]`}
                />
              </div>
            )}

            {/* BG OPACITY SLIDER */}
            {hasBackground && !performanceMode && (
              <div className={`pt-2 border-t ${isLightMode ? 'border-zinc-200' : 'border-white/5'} space-y-3`}>
                <div className="flex items-center justify-between">
                  <label className={`text-[9px] uppercase font-black flex items-center gap-2 ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'}`}>
                    <ImageIcon className="w-3 h-3 text-[var(--theme)]" /> BG Opacity
                  </label>
                  <span className="text-[10px] font-mono text-[var(--theme)]">{bgOpacity}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={bgOpacity} 
                  onChange={(e) => setBgOpacity(Number(e.target.value))}
                  className={`w-full h-1.5 ${isLightMode ? 'bg-zinc-200' : 'bg-white/20'} rounded-lg appearance-none cursor-pointer accent-[var(--theme)]`}
                />
              </div>
            )}
          </section>

          {/* MUSIC LIBRARY PRESETS */}
          <section className={`space-y-4 p-4 rounded-2xl border ${isLightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-[var(--theme)]/5 border-[var(--theme)]/10'}`}>
            <label className={`text-[10px] uppercase font-black tracking-widest flex items-center gap-2 ${isLightMode ? 'text-zinc-700' : 'text-[var(--theme)]'}`}>
              <Music className="w-3 h-3" /> Music Library
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1 will-change-scroll">
              {fullTracklist?.map((song, index) => (
                <div
                  key={song.id || index}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsMusicReset(false);
                    localStorage.setItem('capy-music-reset', 'false');
                    handleAudioUpload({ presetUrl: song.url });
                  }}
                  className={`p-3 border rounded-xl text-left flex items-center justify-between cursor-pointer ${isLightMode ? 'bg-white border-zinc-200 hover:border-[var(--theme)]' : 'bg-zinc-800/50 border-white/5 hover:border-[var(--theme)]/50'}`}
                >
                  <div className="flex items-center gap-3 truncate mr-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--theme)] flex-shrink-0" />
                    <div className="flex flex-col truncate">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold truncate ${isLightMode ? 'text-zinc-900' : 'text-zinc-100'}`}>
                          {song.title}
                        </span>
                        {song.isCustom && (
                          <span className="text-[8px] font-black bg-[var(--theme)]/20 text-[var(--theme)] px-1.5 py-0.5 rounded uppercase flex-shrink-0">
                            Uploaded
                          </span>
                        )}
                      </div>
                      <span className={`text-[9px] font-medium uppercase tracking-tight truncate ${isLightMode ? 'text-zinc-600' : 'text-zinc-300'}`}>
                        {song.artist || "Unknown Artist"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {song.isClean && !song.isCustom && (
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${isLightMode ? 'bg-zinc-100 text-zinc-700' : 'bg-zinc-700 text-zinc-200'}`}>
                        Clean
                      </span>
                    )}
                    {song.isCustom && (
                      <button 
                        type="button"
                        onClick={(e) => deleteCustomSong(song.id, e)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
                        title="Delete custom song"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* TAB DISGUISE SECTION */}
          <section className={`space-y-4 p-4 rounded-2xl border ${isLightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-white/5 border-white/5'}`}>
            <label className={`text-[10px] uppercase font-black tracking-widest flex items-center gap-2 ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'}`}>
              <Eye className="w-3 h-3 text-[var(--theme)]" /> Tab Disguise
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['google', 'drive', 'classroom', 'powerschool'].map((cloak) => (
                <button
                  key={cloak}
                  type="button"
                  onClick={() => setActiveCloak(cloak)}
                  className={`p-3 border rounded-xl text-[10px] font-black uppercase ${
                    activeCloak === cloak 
                    ? 'bg-[var(--theme)] text-black border-[var(--theme)]' 
                    : isLightMode ? 'bg-white border-zinc-200 text-zinc-700' : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white'
                  }`}
                >
                  {cloak}
                </button>
              ))}
            </div>
          </section>

          {/* PANIC PROTOCOL */}
          <section className={`space-y-4 p-4 rounded-2xl border ${isLightMode ? 'bg-red-50 border-red-200' : 'bg-red-500/10 border-red-500/20'}`}>
            <label className="text-[10px] uppercase font-black text-red-500 tracking-widest flex items-center gap-2">
              <Ghost className="w-3 h-3" /> Panic Key
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Press key..." 
                value={panicKey} 
                onKeyDown={handlePanicKeyDown}
                className={`flex-1 border rounded-xl p-3 text-xs outline-none text-center font-mono font-bold ${isLightMode ? 'bg-white border-red-200 text-zinc-900' : 'bg-zinc-800 border-white/10 text-white'}`} 
                readOnly 
              />
              {panicKey && (
                <button type="button" onClick={() => setPanicKey('')} className={`p-3 border rounded-xl ${isLightMode ? 'bg-white border-red-200' : 'bg-red-500/20 border-red-500/30'}`}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              )}
            </div>
          </section>

          {/* ABOUT & ACCESSIBILITY SECTION */}
          <section className={`space-y-2 p-4 rounded-2xl border ${isLightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-white/5 border-white/5'}`}>
            <label className={`text-[10px] uppercase font-black tracking-widest flex items-center gap-2 ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'}`}>
              <ShieldAlert className="w-3 h-3 text-[var(--theme)]" /> About & Accessibility
            </label>
            <p className={`text-[9px] leading-relaxed ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
              This website is committed to digital accessibility. If you encounter any contrast issues with custom themes or navigation barriers, feel free to adjust your theme or reach out via repository issues.
            </p>
          </section>

          {/* THEMES */}
          <section className="space-y-3">
            <label className={`text-[10px] uppercase font-black tracking-widest flex items-center gap-2 ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'}`}>
              <Palette className="w-3 h-3" /> Themes
            </label>
            
            <button 
              type="button"
              onClick={() => setIsLightMode(!isLightMode)}
              className={`w-full p-3 mb-2 border rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 ${isLightMode ? 'bg-white border-zinc-200 text-zinc-900 hover:bg-zinc-50' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
            >
              {isLightMode ? <Sun className="w-3.5 h-3.5 text-yellow-500" /> : <Moon className="w-3.5 h-3.5 text-blue-400" />} 
              {isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            </button>

            <div className="grid grid-cols-2 gap-2">
              {Object.entries(themes || {}).map(([id, t]) => (
                <button 
                  key={id} 
                  type="button"
                  onClick={() => applyTheme(t)} 
                  className={`p-3 border rounded-xl text-[10px] font-bold flex items-center gap-2 ${isLightMode ? 'bg-white border-zinc-200 text-zinc-900 hover:border-[var(--theme)]' : 'bg-white/5 border-white/10 text-zinc-100 hover:border-[var(--theme)]'}`}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} /> {t.name}
                </button>
              ))}
            </div>
          </section>

          {/* RESET BUTTONS */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <button 
              type="button"
              onClick={handleClearSettings} 
              className={`p-4 rounded-2xl border text-[9px] font-black uppercase flex items-center justify-center gap-2 ${
                confirmClearSettings 
                  ? 'bg-orange-500 text-black border-orange-400 animate-pulse' 
                  : 'border-orange-500/20 bg-orange-500/5 text-orange-600 hover:bg-orange-500/10'
              }`}
            >
              <RotateCcw className={`w-3.5 h-3.5 ${confirmClearSettings ? 'animate-spin' : ''}`} /> 
              {confirmClearSettings ? 'ARE YOU SURE?' : 'Clear Settings'}
            </button>

            <button 
              type="button"
              onClick={handleReset} 
              className={`p-4 rounded-2xl border text-[9px] font-black uppercase flex items-center justify-center gap-2 ${
                confirmReset 
                  ? 'bg-red-500 text-black border-red-400 animate-pulse' 
                  : 'border-red-500/20 bg-red-500/5 text-red-600 hover:bg-red-500/10'
              }`}
            >
              <RotateCcw className={`w-4 h-4 ${confirmReset ? 'animate-spin' : ''}`} />
              {confirmReset ? 'ARE YOU SURE?' : 'Factory Reset'}
            </button>
          </div>
        </div>
      </div>

      {/* --- SUB-MODAL FOR EDITING SONG NAME & ARTIST AFTER UPLOAD --- */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4">
          <div className={`${modalBg} border p-6 rounded-3xl max-w-sm w-full shadow-2xl space-y-4`}>
            <h3 className="text-lg font-bold" style={{ fontFamily: "'Baloo 2', cursive" }}>Edit Uploaded Song</h3>
            <p className="text-[10px] text-zinc-400">Customize the details for your uploaded MP3 track before adding it to the library.</p>
            
            <div className="space-y-3">
              <div>
                <label className="text-[9px] text-zinc-400 uppercase font-black block mb-1">Song Name</label>
                <input 
                  type="text" 
                  value={songTitle} 
                  onChange={(e) => setSongTitle(e.target.value)}
                  className={`w-full ${inputBg} border rounded-xl p-3 text-xs outline-none font-bold`}
                />
              </div>

              <div>
                <label className="text-[9px] text-zinc-400 uppercase font-black block mb-1">Artist Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Green Day" 
                  value={artistName} 
                  onChange={(e) => setArtistName(e.target.value)}
                  className={`w-full ${inputBg} border rounded-xl p-3 text-xs outline-none font-bold`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setUploadModalOpen(false)} 
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={saveCustomSong} 
                  className="px-5 py-2.5 rounded-xl bg-[var(--theme)] text-black text-[10px] font-black uppercase hover:opacity-90 shadow-md"
                >
                  Save to Library
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
