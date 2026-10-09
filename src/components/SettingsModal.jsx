import React, { useState, useEffect, useDeferredValue, useRef, Component } from 'react';
import { 
  X, ShieldAlert, Cpu, Palette, Ghost, Zap, Video, Music, 
  Volume2, Power, Trash2, Link as LinkIcon, Upload, 
  Image as ImageIcon, RotateCcw, Type, Users, UserPlus, Eye, Copy, Check, 
  Sun, Moon, Play, Pause, Search, Loader2, Crop, Sparkles
} from 'lucide-react';

// Optional import fallback to prevent crashes if DB file isn't present
import * as db from '../utils/db';

const safeSaveSong = db?.saveSongToIDB || (async () => {});
const safeLoadSongs = db?.loadSongsFromIDB || (async () => []);
const safeDeleteSong = db?.deleteSongFromIDB || (async () => {});

// --- SHOP INVENTORY (BUILT-IN SVG BORDERS & EFFECTS) ---
const shopItems = [
  // --- FRAMES (SVG DATA URIS) ---
  { 
    id: 1, 
    type: 'frame', 
    name: 'Cyber Neon Ring', 
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="56" fill="none" stroke="%2338b2f6" stroke-width="6" stroke-dasharray="10 4"/></svg>' 
  },
  { 
    id: 2, 
    type: 'frame', 
    name: 'Golden Crown Ring', 
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="56" fill="none" stroke="%23fbbf24" stroke-width="5"/><polygon points="60,4 68,22 88,16 76,34 96,44 76,50 82,70 60,60 38,70 44,50 24,44 44,34 32,16 52,22" fill="%23fbbf24" transform="scale(0.3) translate(140, -40)"/></svg>' 
  },
  { 
    id: 3, 
    type: 'frame', 
    name: 'Pixel Retro Box', 
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect x="4" y="4" width="112" height="112" fill="none" stroke="%2310b981" stroke-width="8" stroke-dasharray="16 8"/></svg>' 
  },

  // --- EFFECTS ---
  { 
    id: 4, 
    type: 'effect', 
    name: 'Matrix Binary Code', 
    url: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDZxMHZ5dzdxbjh3eDUzYnluZ2pwNDdobjNrb2w1Z3cxbDV0OWkzYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/WoD6JZnwap6s8/giphy.gif' 
  },
  { 
    id: 5, 
    type: 'effect', 
    name: 'Sparkle Aura', 
    url: 'https://media.giphy.com/media/xTiTnMhJTwNHCHdAIU/giphy.gif' 
  }
];

// --- REUSABLE PROFILE AVATAR WRAPPER (SHOWS FRAMES & EFFECTS ANYWHERE) ---
export function ProfileAvatar({ pfpUrl, frameUrl, effectUrl, size = "w-20 h-20", className = "" }) {
  const [effectError, setEffectError] = useState(false);
  const [frameError, setFrameError] = useState(false);

  const hasValidFrame = frameUrl && frameUrl !== 'null' && frameUrl !== '' && !frameError;
  const hasValidEffect = effectUrl && effectUrl !== 'null' && effectUrl !== '' && !effectError;

  return (
    <div className={`relative flex items-center justify-center flex-shrink-0 ${size} ${className}`}>
      {/* Underlying Profile Picture */}
      <img 
        src={pfpUrl || 'https://i.imgur.com/7gK1QvK.png'} 
        alt="Profile" 
        className="w-full h-full rounded-full object-cover relative z-10"
      />

      {/* Equipped Effect Layer */}
      {hasValidEffect && (
        <img 
          src={effectUrl} 
          alt="Profile Effect" 
          onError={() => setEffectError(true)}
          className="absolute inset-0 w-full h-full pointer-events-none object-cover rounded-full scale-110 z-20"
        />
      )}

      {/* Equipped Frame Overlay (Centered Perfectly via Inset-0 & Scale) */}
      {hasValidFrame && (
        <img 
          src={frameUrl} 
          alt="Profile Frame" 
          onError={() => setFrameError(true)}
          className="absolute inset-0 w-full h-full pointer-events-none object-contain scale-125 z-30"
        />
      )}
    </div>
  );
}

// --- ERROR BOUNDARY WRAPPER TO PREVENT APP UNMOUNTS ---
class SettingsErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("SettingsModal caught a rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (!this.props.show) return null;
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-900 border border-red-500/40 p-6 rounded-3xl max-w-sm w-full space-y-4 text-center shadow-2xl text-white">
            <ShieldAlert className="w-10 h-10 text-red-500 mx-auto" />
            <h3 className="text-base font-bold">Settings Encountered an Error</h3>
            <p className="text-xs text-zinc-400 font-mono break-words bg-black/40 p-3 rounded-xl border border-white/5">
              {this.state.error?.message || "An unexpected rendering exception occurred."}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (typeof this.props.onClose === 'function') this.props.onClose();
              }}
              className="px-5 py-2.5 bg-red-500 text-black font-bold text-xs uppercase rounded-xl hover:bg-red-400 transition-colors"
            >
              Close & Recover
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- HELPER: ENSURE STRICT 7-CHAR HEX FOR INPUT COLOR ---
const getValidHexColor = () => {
  if (typeof document === 'undefined') return '#38b2f6';
  try {
    const val = getComputedStyle(document.documentElement).getPropertyValue('--theme').trim();
    if (/^#[0-9A-F]{6}$/i.test(val)) return val;
    if (/^#[0-9A-F]{3}$/i.test(val)) {
      return '#' + val[1] + val[1] + val[2] + val[2] + val[3] + val[3];
    }
    return '#38b2f6';
  } catch (e) {
    return '#38b2f6';
  }
};

// --- INTERACTIVE AVATAR CROPPER SUB-COMPONENT ---
function AvatarCropperModal({ show, imageSrc, onClose, onSave, isLightMode }) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (show) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setIsImageLoaded(false);
      
      if (imgRef.current && imgRef.current.complete) {
        setIsImageLoaded(true);
      }
    }
  }, [show, imageSrc]);

  if (!show || !imageSrc) return null;

  const handleMouseDown = (e) => {
    if (!isImageLoaded) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e) => {
    if (!isImageLoaded || e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStart({ x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    setOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleSaveCrop = () => {
    const img = imgRef.current;
    if (!img || !isImageLoaded || !img.naturalWidth || !img.naturalHeight) {
      alert("Image is still loading. Please wait a moment and try again.");
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      const outputSize = 300;
      const previewSize = 208;

      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        alert("Could not initialize 2D canvas context.");
        return;
      }

      ctx.beginPath();
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, outputSize, outputSize);

      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const aspect = nw / nh;

      const baseRenderHeight = previewSize;
      const baseRenderWidth = previewSize * aspect;
      const scaleToOutput = outputSize / previewSize;

      ctx.save();
      ctx.translate(
        outputSize / 2 + offset.x * scaleToOutput,
        outputSize / 2 + offset.y * scaleToOutput
      );
      ctx.scale(zoom * scaleToOutput, zoom * scaleToOutput);
      ctx.drawImage(img, -baseRenderWidth / 2, -baseRenderHeight / 2, baseRenderWidth, baseRenderHeight);
      ctx.restore();

      let croppedUrl = '';
      try {
        croppedUrl = canvas.toDataURL('image/png');
      } catch (e) {
        croppedUrl = canvas.toDataURL('image/jpeg', 0.85);
      }

      if (!croppedUrl || croppedUrl === 'data:,') {
        throw new Error('Canvas exported an empty image string.');
      }

      if (typeof onSave === 'function') onSave(croppedUrl);
    } catch (err) {
      console.error("Avatar Crop Error Details:", err);
      if (err.name === 'SecurityError') {
        alert("Cannot crop this image due to cross-origin security restrictions. Please upload a local image file instead.");
      } else {
        alert(`Failed to save image: ${err.message || 'Unknown error'}`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className={`p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl border ${isLightMode ? 'bg-white text-zinc-900 border-zinc-200' : 'bg-zinc-900 text-white border-white/10'}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Crop className="w-4 h-4 text-[var(--theme)]" /> Adjust Avatar
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div 
          className="relative w-52 h-52 mx-auto rounded-full overflow-hidden border-4 border-[var(--theme)] cursor-grab active:cursor-grabbing bg-zinc-950 flex items-center justify-center shadow-inner touch-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {!isImageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 z-10">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--theme)]" />
            </div>
          )}

          <img 
            ref={imgRef}
            src={imageSrc} 
            alt="Crop preview" 
            crossOrigin={imageSrc?.startsWith('data:') || imageSrc?.startsWith('blob:') ? undefined : "anonymous"}
            draggable={false}
            onLoad={() => setIsImageLoaded(true)}
            onError={() => {
              alert("Failed to load image preview.");
              if (typeof onClose === 'function') onClose();
            }}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              maxWidth: 'none',
              maxHeight: '100%',
              objectFit: 'contain',
              transition: isDragging ? 'none' : 'transform 0.05s ease-out',
              opacity: isImageLoaded ? 1 : 0
            }}
          />
        </div>

        <div className="space-y-1 pt-2">
          <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-400">
            <span>Zoom Scale</span>
            <span>{Math.round(zoom * 100)}%</span>
          </div>
          <input 
            type="range" 
            min="0.5" 
            max="3" 
            step="0.05" 
            value={zoom} 
            disabled={!isImageLoaded}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[var(--theme)] disabled:opacity-50"
          />
        </div>

        <p className="text-[9px] text-center text-zinc-400 font-medium">
          Drag image to reposition • Use slider to zoom
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold uppercase transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleSaveCrop} 
            disabled={!isImageLoaded}
            className="px-5 py-2 rounded-xl bg-[var(--theme)] text-black text-xs font-bold uppercase hover:opacity-90 transition-opacity shadow-md disabled:opacity-50 flex items-center gap-1.5"
          >
            {!isImageLoaded && <Loader2 className="w-3 h-3 animate-spin" />}
            Save Avatar
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsModalContent({
  show, onClose, friendCode = '', displayName = '', setDisplayName,
  friends = [], onAddFriend, onViewFriend, onRemoveFriend,
  handlePfpUpload, handleResetPfp,
  performanceMode = false, setPerformanceMode,
  handleBackgroundUpload, handleAudioUpload, 
  handleResetBackground, handleResetMusic,
  bgEnabled = false, bgOpacity = 100, setBgOpacity,
  bgMusic, volume = 1, setVolume,
  isPlaying = false, onTogglePlay,
  panicKey = '', setPanicKey,
  themes = {}, applyTheme,
  handleClearSettings, confirmClearSettings = false,
  handleReset, confirmReset = false,
  onViewOwnProfile,
  tracklist = [],
  isLightMode = false, setIsLightMode,
  activeCloak = '', setActiveCloak,
  selectedFrame = '', setSelectedFrame,
  selectedEffect = '', setSelectedEffect
}) {
  const [friendInput, setFriendInput] = useState('');
  const [friendInputError, setFriendInputError] = useState('');
  const [copied, setCopied] = useState(false);
  const [hasBackground, setHasBackground] = useState(Boolean(bgEnabled));
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const [isMusicReset, setIsMusicReset] = useState(() => {
    try {
      return localStorage.getItem('capy-music-reset') === 'true';
    } catch (e) {
      return false;
    }
  });

  const modalRef = useRef(null);
  const pfpInputRef = useRef(null);

  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [songTitle, setSongTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [isSavingSong, setIsSavingSong] = useState(false);

  const [previousColor, setPreviousColor] = useState(null);
  const [customSongs, setCustomSongs] = useState([]);
  const customSongsRef = useRef(customSongs);

  useEffect(() => {
    customSongsRef.current = customSongs;
  }, [customSongs]);

  useEffect(() => {
    setHasBackground(Boolean(bgEnabled));
  }, [bgEnabled]);

  useEffect(() => {
    if (show && isMusicReset) {
      if (typeof handleAudioUpload === 'function') handleAudioUpload({ presetUrl: '' });
      if (isPlaying !== false && typeof onTogglePlay === 'function') onTogglePlay();
    }
  }, [show, isMusicReset]);

  useEffect(() => {
    let isMounted = true;
    safeLoadSongs()
      .then(songs => {
        if (!isMounted) return;
        if (Array.isArray(songs)) {
          const processedSongs = songs.map(song => {
            if (!song.url && (song.file || song.blob)) {
              return { ...song, url: URL.createObjectURL(song.file || song.blob) };
            }
            return song;
          });
          setCustomSongs(processedSongs);
        } else {
          setCustomSongs([]);
        }
      })
      .catch(err => {
        console.warn("Failed to load IndexedDB songs:", err);
        if (isMounted) setCustomSongs([]);
      });
    
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!show || cropperOpen || uploadModalOpen) return;
    const modalElement = modalRef.current;
    if (!modalElement) return;

    const focusableElements = modalElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && typeof onClose === 'function') {
        onClose();
      }
      if (e.key === 'Tab' && focusableElements.length > 0) {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            e.preventDefault();
          }
        }
      }
    };

    firstElement?.focus();
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onClose, cropperOpen, uploadModalOpen]);

  if (!show) return null;

  const effectiveBgMusic = isMusicReset ? null : bgMusic;

  const handleCopyCode = () => {
    if (friendCode) {
      navigator.clipboard.writeText(friendCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddFriendClick = () => {
    if (!friendInput.trim()) {
      setFriendInputError('Please enter a valid friend code first.');
      document.getElementById('friend-code-input')?.focus();
      return;
    }
    setFriendInputError('');
    if (typeof onAddFriend === 'function') onAddFriend(friendInput.trim());
    setFriendInput(''); 
  };

  const handlePanicKeyDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key !== 'Escape' && e.key !== 'Tab') {
      if (typeof setPanicKey === 'function') setPanicKey(e.key);
    }
  };

  const handlePfpChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file for your profile picture.');
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Profile picture file is too large. Max size is 10MB.');
      e.target.value = '';
      return;
    }

    if (file.type === 'image/gif') {
      if (typeof handlePfpUpload === 'function') {
        const syntheticTarget = { files: [file], value: file };
        const syntheticEvent = {
          target: syntheticTarget,
          files: [file],
          file: file,
          toString: () => file,
          valueOf: () => file
        };
        try {
          handlePfpUpload(syntheticEvent);
        } catch (err1) {
          try { handlePfpUpload(file); } catch (err2) {}
        }
      }
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setImageToCrop(reader.result);
        setCropperOpen(true);
      }
    };
    reader.onerror = () => {
      alert('Failed to read image file. Please try another picture.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropSave = (croppedDataUrl) => {
    if (typeof handlePfpUpload === 'function') {
      let file = null;
      try {
        const arr = croppedDataUrl.split(',');
        if (arr.length >= 2) {
          const mimeMatch = arr[0].match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : 'image/png';
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          file = new File([u8arr], 'avatar.png', { type: mime });
        }
      } catch (err) {
        console.warn("Failed to convert croppedDataUrl to File:", err);
      }

      const syntheticTarget = {
        files: file ? [file] : [croppedDataUrl],
        value: croppedDataUrl
      };

      const syntheticEvent = {
        target: syntheticTarget,
        files: syntheticTarget.files,
        file: file || croppedDataUrl,
        dataUrl: croppedDataUrl,
        toString: () => croppedDataUrl,
        valueOf: () => croppedDataUrl
      };

      try {
        handlePfpUpload(syntheticEvent);
      } catch (err1) {
        try {
          handlePfpUpload(croppedDataUrl);
        } catch (err2) {
          if (file) handlePfpUpload(file);
        }
      }
    }
    setCropperOpen(false);
    setImageToCrop(null);
  };

  const handleCustomAudioSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/') && file.type !== 'audio/mpeg') {
      alert('Please upload a valid audio file (e.g., MP3).');
      e.target.value = '';
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      alert('Audio file is too large. Max size is 15MB.');
      e.target.value = '';
      return;
    }

    setPendingFile(file);
    setSongTitle(file.name.replace(/\.[^/.]+$/, "").slice(0, 50));
    setArtistName('');
    setUploadModalOpen(true);
    e.target.value = '';
  };

  const handleBackgroundChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Please upload a valid image or video file for the background.');
      e.target.value = '';
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert('Background file is too large. Max size is 20MB.');
      e.target.value = '';
      return;
    }

    setHasBackground(true);
    if (typeof handleBackgroundUpload === 'function') {
      handleBackgroundUpload(e);
    }
  };

  const saveCustomSong = async () => {
    if (!pendingFile || isSavingSong) return;
    setIsSavingSong(true);
    
    try {
      const newSongMeta = {
        id: 'custom-' + Date.now(),
        title: songTitle || 'Untitled Song',
        artist: artistName || 'Unknown Artist',
        isCustom: true
      };

      try {
        await safeSaveSong(newSongMeta, pendingFile);
      } catch (err) {
        alert("Storage failed. Storage quota full or private browsing active.");
        setIsSavingSong(false);
        return;
      }
      
      const objectUrl = URL.createObjectURL(pendingFile);
      const newSongWithUrl = { ...newSongMeta, url: objectUrl, file: pendingFile };

      setCustomSongs(prev => [newSongWithUrl, ...(Array.isArray(prev) ? prev : [])]);

      setIsMusicReset(false);
      try { localStorage.setItem('capy-music-reset', 'false'); } catch (e) {}

      if (typeof handleAudioUpload === 'function') {
        handleAudioUpload({ presetUrl: objectUrl });
      }

      setUploadModalOpen(false);
      setPendingFile(null);
    } finally {
      setIsSavingSong(false);
    }
  };

  const deleteCustomSong = async (id, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const safeList = Array.isArray(customSongs) ? customSongs : [];
    const songToDelete = safeList.find(s => s.id === id);
    if (songToDelete && songToDelete.url && songToDelete.url.startsWith('blob:')) {
      URL.revokeObjectURL(songToDelete.url);
    }

    await safeDeleteSong(id);
    setCustomSongs(prev => (Array.isArray(prev) ? prev.filter(song => song.id !== id) : []));
  };

  const safeCustomSongs = Array.isArray(customSongs) ? customSongs : [];
  const safeTracklist = Array.isArray(tracklist) ? tracklist : [];
  const fullTracklist = [...safeCustomSongs, ...safeTracklist];

  const modalBg = isLightMode ? "bg-white border-zinc-200 text-zinc-900" : "bg-zinc-900 border-white/10 text-white";
  const sectionBg = isLightMode ? "bg-zinc-100 border-zinc-200" : "bg-white/5 border-white/5";
  const inputBg = isLightMode ? "bg-white border-zinc-300 text-black placeholder:text-zinc-400" : "bg-zinc-800 border-white/10 text-white";
  const headerText = isLightMode ? "text-zinc-900" : "text-[var(--theme)]";

  const matchesSearch = (keywords) => {
    if (!deferredSearchQuery.trim()) return true;
    const q = deferredSearchQuery.toLowerCase().trim();
    return keywords.some(kw => kw.toLowerCase().includes(q) || q.includes(kw.toLowerCase()));
  };

  return (
    <>
      <input 
        ref={pfpInputRef}
        type="file" 
        accept="image/png, image/jpeg, image/gif, image/webp" 
        onChange={handlePfpChange} 
        className="hidden" 
      />

      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
        <div 
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
          className={`${modalBg} border rounded-3xl max-w-md w-full relative shadow-2xl max-h-[90vh] flex flex-col overflow-hidden`}
        >
          {/* HEADER */}
          <div className={`flex items-center justify-between border-b ${isLightMode ? 'border-zinc-200' : 'border-white/5'} px-6 pt-6 pb-4 ${modalBg} z-20 flex-shrink-0`}>
            <h2 id="settings-title" className={`text-xl font-bold flex items-center gap-2 ${headerText}`}>
              <ShieldAlert className={`w-5 h-5 ${isLightMode ? 'text-[var(--theme)]' : ''}`} /> System Settings
            </h2>
            <button 
              type="button"
              onClick={onClose} 
              className={`${isLightMode ? 'text-zinc-700 hover:text-black hover:bg-zinc-100' : 'text-zinc-300 hover:text-white hover:bg-white/5'} p-1 rounded-lg transition-colors focus:ring-2 focus:ring-[var(--theme)] outline-none`}
              aria-label="Close settings"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* SCROLLABLE CONTENT BODY */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
            
            <div className="relative">
              <Search className={`absolute left-3 top-3 w-4 h-4 ${isLightMode ? 'text-zinc-400' : 'text-zinc-500'}`} />
              <input
                type="text"
                placeholder="Type to search settings (e.g., theme, audio, danger)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-4 py-2.5 ${inputBg} border rounded-xl text-xs outline-none font-medium transition-all focus:border-[var(--theme)] focus:ring-1 focus:ring-[var(--theme)]`}
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-[10px] font-bold uppercase opacity-60 hover:opacity-100 focus:outline-none"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="space-y-6">
              {/* PROFILE IDENTITY & SHOP */}
              {matchesSearch(['identity', 'profile', 'name', 'avatar', 'shop', 'border', 'effect', 'cropper', 'crop', 'friend', 'code']) && (
                <section className={`space-y-4 ${isLightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-[var(--theme)]/5 border-[var(--theme)]/10'} p-4 rounded-2xl border transition-all`}>
                  <div className="flex items-center justify-between">
                    <label className={`text-[10px] uppercase font-black tracking-widest flex items-center gap-2 ${isLightMode ? 'text-zinc-700' : 'text-[var(--theme)]'}`}>
                      <Type className="w-3 h-3" /> Profile Identity & Shop
                    </label>
                    <button 
                      type="button"
                      onClick={onViewOwnProfile}
                      className="flex items-center gap-1.5 px-3 py-1 bg-[var(--theme)] text-black rounded-full text-[9px] font-black uppercase hover:opacity-80 transition-opacity focus:ring-2 focus:ring-offset-1 focus:ring-[var(--theme)] outline-none"
                    >
                      <Eye className="w-3 h-3" /> View My Profile
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        type="button"
                        onClick={() => pfpInputRef.current?.click()}
                        className={`p-3 ${inputBg} border rounded-xl text-[9px] font-black uppercase text-center cursor-pointer hover:border-[var(--theme)] transition-colors flex flex-col items-center justify-center`}
                      >
                        <Crop className="w-3 h-3 mx-auto mb-1 text-[var(--theme)]" />
                        Upload & Crop PFP
                      </button>
                      <button 
                        type="button"
                        onClick={handleResetPfp}
                        className={`p-3 border rounded-xl text-[9px] font-black uppercase flex flex-col items-center justify-center gap-1 transition-colors focus:ring-2 focus:ring-red-400 outline-none ${isLightMode ? 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100' : 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30'}`}
                      >
                        <RotateCcw className="w-3 h-3" /> Reset Avatar
                      </button>
                    </div>
                    <input 
                      type="text" 
                      placeholder="Custom Display Name..."
                      value={displayName} 
                      onChange={(e) => typeof setDisplayName === 'function' && setDisplayName(e.target.value.slice(0, 25))}
                      className={`w-full ${inputBg} border rounded-xl p-3 text-xs outline-none font-bold transition-all focus:border-[var(--theme)] focus:ring-1 focus:ring-[var(--theme)]`}
                    />

                    {/* FREE AVATAR & PROFILE SHOP SECTION */}
                    <div className={`${isLightMode ? 'bg-white border-zinc-200' : 'bg-black/30 border-white/5'} p-3 rounded-xl border space-y-3`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 ${headerText}`}>
                          <Sparkles className="w-3 h-3 text-[var(--theme)]" /> Free Profile Shop
                        </span>
                        <div className="flex items-center gap-1.5">
                          {selectedFrame && (
                            <button
                              type="button"
                              onClick={() => {
                                if (typeof setSelectedFrame === 'function') {
                                  setSelectedFrame('');
                                  try { localStorage.removeItem('capy-selected-frame'); } catch (e) {}
                                }
                              }}
                              className="text-[8px] font-black bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-2 py-0.5 rounded-full uppercase transition-colors"
                            >
                              Unequip Frame
                            </button>
                          )}
                          {selectedEffect && (
                            <button
                              type="button"
                              onClick={() => {
                                if (typeof setSelectedEffect === 'function') {
                                  setSelectedEffect('');
                                  try { localStorage.removeItem('capy-selected-effect'); } catch (e) {}
                                }
                              }}
                              className="text-[8px] font-black bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-2 py-0.5 rounded-full uppercase transition-colors"
                            >
                              Unequip Effect
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {shopItems.map(item => {
                          const isEquipped = (item.type === 'frame' && selectedFrame === item.url) || (item.type === 'effect' && selectedEffect === item.url);
                          return (
                            <div key={item.id} className={`${isLightMode ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-800/80 border-white/5'} p-2.5 rounded-xl border flex flex-col justify-between`}>
                              <div>
                                <span className={`text-[10px] font-bold block truncate ${isLightMode ? 'text-zinc-900' : 'text-zinc-100'}`}>{item.name}</span>
                                <span className="text-[8px] uppercase tracking-tighter text-zinc-400">{item.type}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (item.type === 'frame' && typeof setSelectedFrame === 'function') {
                                    setSelectedFrame(item.url);
                                    try { localStorage.setItem('capy-selected-frame', item.url); } catch (e) {}
                                  }
                                  if (item.type === 'effect' && typeof setSelectedEffect === 'function') {
                                    setSelectedEffect(item.url);
                                    try { localStorage.setItem('capy-selected-effect', item.url); } catch (e) {}
                                  }
                                }}
                                className={`mt-2 w-full py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                                  isEquipped 
                                    ? 'bg-green-500 text-black shadow-sm' 
                                    : 'bg-[var(--theme)] text-black hover:opacity-80'
                                }`}
                              >
                                {isEquipped ? 'Equipped' : 'Equip'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className={`${isLightMode ? 'bg-zinc-100 border-zinc-200' : 'bg-black/20 border-white/5'} p-3 rounded-xl border space-y-3`}>
                      <div className="flex items-center justify-between">
                        <p className={`text-[8px] font-black uppercase leading-none ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'}`}>Your Friend Code</p>
                        <button 
                          type="button"
                          onClick={handleCopyCode}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all outline-none focus:ring-2 focus:ring-[var(--theme)] ${copied ? 'bg-green-500 text-black' : isLightMode ? 'bg-white text-zinc-700 border border-zinc-200' : 'bg-white/5 text-zinc-300 hover:text-white'}`}
                        >
                          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className={`${isLightMode ? 'bg-white border-zinc-200' : 'bg-white/5 border-white/5'} p-2 rounded-lg border max-h-20 overflow-y-auto`}>
                        <p className="text-[10px] font-mono font-black text-[var(--theme)] break-all leading-relaxed tracking-tight">
                          {friendCode || 'No code generated'}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* FRIENDS LIST */}
              {matchesSearch(['friends', 'list', 'social', 'add friend']) && (
                <section className={`space-y-4 ${sectionBg} p-4 rounded-2xl border transition-all`}>
                  <label className={`text-[10px] uppercase font-black tracking-widest flex items-center gap-2 ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'}`}>
                    <Users className="w-3 h-3 text-[var(--theme)]" /> Friends List
                  </label>
                  
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <input 
                        id="friend-code-input"
                        type="text" 
                        placeholder="Enter friend code..."
                        value={friendInput}
                        onChange={(e) => {
                          setFriendInput(e.target.value.slice(0, 100));
                          if (friendInputError) setFriendInputError('');
                        }}
                        className={`flex-1 ${inputBg} border rounded-xl p-2.5 text-xs outline-none transition-all focus:border-[var(--theme)] focus:ring-1 focus:ring-[var(--theme)]`}
                      />
                      <button 
                        type="button"
                        onClick={handleAddFriendClick}
                        className="p-2.5 bg-[var(--theme)] text-black rounded-xl hover:opacity-80 transition-opacity focus:ring-2 focus:ring-offset-1 focus:ring-[var(--theme)] outline-none"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    </div>
                    {friendInputError && (
                      <p className="text-[9px] text-red-500 font-bold px-1">{friendInputError}</p>
                    )}
                  </div>

                  <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                    {Array.isArray(friends) && friends.length > 0 ? friends.map(friend => (
                      <div key={friend.code} className={`flex items-center justify-between ${isLightMode ? 'bg-white border-zinc-200' : 'bg-white/5 border-white/5'} p-2 rounded-xl border`}>
                        <span title={friend.name} className={`text-[10px] font-bold truncate max-w-[120px] ${isLightMode ? 'text-zinc-900' : 'text-zinc-100'}`}>{friend.name}</span>
                        <div className="flex gap-1 items-center">
                          <button 
                            type="button"
                            onClick={() => typeof onViewFriend === 'function' && onViewFriend(friend)}
                            className={`p-1.5 rounded-lg transition-colors outline-none focus:ring-1 focus:ring-[var(--theme)] ${isLightMode ? 'bg-zinc-100 text-zinc-800 hover:bg-[var(--theme)] hover:text-black' : 'bg-white/5 text-zinc-200 hover:bg-[var(--theme)] hover:text-black'}`}
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => typeof onRemoveFriend === 'function' && onRemoveFriend(friend.code)}
                            className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 transition-colors outline-none focus:ring-1 focus:ring-red-400 ${isLightMode ? 'bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-200' : 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30'}`}
                          >
                            <Trash2 className="w-3 h-3" /> Remove
                          </button>
                        </div>
                      </div>
                    )) : (
                      <p className={`text-[9px] text-center py-2 italic font-medium uppercase tracking-tighter ${isLightMode ? 'text-zinc-600' : 'text-zinc-300'}`}>No friends added yet</p>
                    )}
                  </div>
                </section>
              )}

              {/* PERFORMANCE MODE */}
              {matchesSearch(['performance', 'mode', 'cpu', 'ram', 'speed']) && (
                <section className={`space-y-4 p-4 rounded-2xl border transition-all ${isLightMode ? 'bg-yellow-50 border-yellow-200' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className={`text-[10px] uppercase font-black tracking-widest flex items-center gap-2 ${isLightMode ? 'text-yellow-800' : 'text-yellow-400'}`}>
                        <Cpu className="w-3 h-3" /> Performance Mode
                      </label>
                      <button 
                        type="button"
                        onClick={() => typeof setPerformanceMode === 'function' && setPerformanceMode(!performanceMode)}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all outline-none focus:ring-2 focus:ring-yellow-400 ${performanceMode ? 'bg-yellow-500 text-black shadow-md' : isLightMode ? 'bg-white text-zinc-700 border border-zinc-300' : 'bg-white/10 text-zinc-200 border border-white/20'}`}
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
              )}

              {/* MEDIA UPLOADS */}
              {matchesSearch(['media', 'background', 'audio', 'mp3', 'upload', 'image', 'video', 'music']) && (
                <section className={`space-y-4 ${sectionBg} p-4 rounded-2xl border transition-all`}>
                  <label className={`text-[10px] uppercase font-black tracking-widest flex items-center gap-2 ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'}`}>
                    <ImageIcon className="w-3 h-3 text-[var(--theme)]" /> Custom Media
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`p-3 ${inputBg} border rounded-xl text-[9px] font-black uppercase text-center cursor-pointer hover:border-[var(--theme)] transition-colors`}>
                      <Upload className="w-3 h-3 mx-auto mb-1 text-[var(--theme)]" />
                      Upload BG IMG/GIF
                      <input 
                        type="file" 
                        accept="image/*,video/*" 
                        onChange={handleBackgroundChange} 
                        className="hidden" 
                      />
                    </label>
                    <label className={`p-3 ${inputBg} border rounded-xl text-[9px] font-black uppercase text-center cursor-pointer hover:border-[var(--theme)] transition-colors`}>
                      <Music className="w-3 h-3 mx-auto mb-1 text-[var(--theme)]" />
                      Upload MP3
                      <input type="file" accept="audio/mp3,audio/*" onChange={handleCustomAudioSelect} className="hidden" />
                    </label>
                    
                    <button 
                      type="button"
                      onClick={() => {
                        setHasBackground(false);
                        if (typeof handleResetBackground === 'function') handleResetBackground();
                      }}
                      className={`p-2 border rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 transition-colors outline-none focus:ring-1 focus:ring-red-400 ${isLightMode ? 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100' : 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30'}`}
                    >
                      <RotateCcw className="w-3 h-3" /> Reset BG
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsMusicReset(true);
                        try { localStorage.setItem('capy-music-reset', 'true'); } catch (e) {}
                        if (typeof handleAudioUpload === 'function') {
                          handleAudioUpload({ presetUrl: '' });
                        }
                        if (typeof handleResetMusic === 'function') {
                          handleResetMusic();
                        }
                        if (isPlaying !== false && typeof onTogglePlay === 'function') {
                          onTogglePlay();
                        }
                      }}
                      className={`p-2 border rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 transition-colors outline-none focus:ring-1 focus:ring-red-400 ${isLightMode ? 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100' : 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30'}`}
                    >
                      <RotateCcw className="w-3 h-3" /> Reset Music
                    </button>
                  </div>

                  {/* VOLUME & PLAY/PAUSE */}
                  {effectiveBgMusic && (
                    <div className={`pt-2 border-t ${isLightMode ? 'border-zinc-200' : 'border-white/5'} space-y-3 ${performanceMode ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div className="flex items-center justify-between">
                        <label className={`text-[9px] uppercase font-black flex items-center gap-2 ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'}`}>
                          <Volume2 className="w-3 h-3 text-[var(--theme)]" /> Music Controls
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={performanceMode}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (typeof onTogglePlay === 'function') onTogglePlay();
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer z-10 outline-none focus:ring-1 focus:ring-[var(--theme)] ${
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
                        disabled={performanceMode}
                        onChange={(e) => typeof setVolume === 'function' && setVolume(parseFloat(e.target.value))}
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
                        onChange={(e) => typeof setBgOpacity === 'function' && setBgOpacity(Number(e.target.value))}
                        className={`w-full h-1.5 ${isLightMode ? 'bg-zinc-200' : 'bg-white/20'} rounded-lg appearance-none cursor-pointer accent-[var(--theme)]`}
                      />
                    </div>
                  )}
                </section>
              )}

              {/* MUSIC LIBRARY */}
              {matchesSearch(['library', 'music', 'songs', 'tracks', 'playlist']) && (
                <section className={`space-y-4 p-4 rounded-2xl border transition-all ${isLightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-[var(--theme)]/5 border-[var(--theme)]/10'} ${performanceMode ? 'opacity-50 pointer-events-none' : ''}`}>
                  <label className={`text-[10px] uppercase font-black tracking-widest flex items-center gap-2 ${isLightMode ? 'text-zinc-700' : 'text-[var(--theme)]'}`}>
                    <Music className="w-3 h-3" /> Music Library
                  </label>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {fullTracklist.map((song, index) => (
                      <div
                        key={song.id || index}
                        onClick={(e) => {
                          if (performanceMode) return;
                          e.preventDefault();
                          e.stopPropagation();
                          setIsMusicReset(false);
                          try { localStorage.setItem('capy-music-reset', 'false'); } catch (err) {}
                          if (typeof handleAudioUpload === 'function') {
                            handleAudioUpload({ presetUrl: song.url });
                          }
                        }}
                        className={`p-3 border rounded-xl text-left flex items-center justify-between cursor-pointer transition-all ${isLightMode ? 'bg-white border-zinc-200 hover:border-[var(--theme)]' : 'bg-zinc-800/50 border-white/5 hover:border-[var(--theme)]/50'}`}
                      >
                        <div className="flex items-center gap-3 truncate mr-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--theme)] flex-shrink-0" />
                          <div className="flex flex-col truncate">
                            <div className="flex items-center gap-2">
                              <span className={`text-[11px] font-bold truncate ${isLightMode ? 'text-zinc-900' : 'text-zinc-100'}`}>
                                {song.title || 'Untitled Track'}
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
                              className="px-2 py-1 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg text-[9px] font-black uppercase flex items-center gap-1 transition-colors outline-none focus:ring-1 focus:ring-red-400"
                              title="Delete custom song track"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* TAB DISGUISE */}
              {matchesSearch(['disguise', 'tab', 'cloak', 'google', 'classroom', 'drive']) && (
                <section className={`space-y-4 p-4 rounded-2xl border transition-all ${isLightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-white/5 border-white/5'}`}>
                  <label className={`text-[10px] uppercase font-black tracking-widest flex items-center gap-2 ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'}`}>
                    <Eye className="w-3 h-3 text-[var(--theme)]" /> Tab Disguise
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['google', 'drive', 'classroom', 'powerschool'].map((cloak) => (
                      <button
                        key={cloak}
                        type="button"
                        onClick={() => typeof setActiveCloak === 'function' && setActiveCloak(cloak)}
                        className={`p-3 border rounded-xl text-[10px] font-black uppercase transition-all outline-none focus:ring-2 focus:ring-[var(--theme)] ${
                          activeCloak === cloak 
                          ? 'bg-[var(--theme)] text-black border-[var(--theme)] shadow-md' 
                          : isLightMode ? 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400' : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {cloak}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* PANIC PROTOCOL */}
              {matchesSearch(['panic', 'key', 'shortcut', 'ghost']) && (
                <section className={`space-y-4 p-4 rounded-2xl border transition-all ${isLightMode ? 'bg-red-50 border-red-200' : 'bg-red-500/10 border-red-500/20'}`}>
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
                      <button type="button" onClick={() => typeof setPanicKey === 'function' && setPanicKey('')} className={`p-3 border rounded-xl transition-colors outline-none focus:ring-1 focus:ring-red-400 ${isLightMode ? 'bg-white border-red-200 hover:bg-red-100' : 'bg-red-500/20 border-red-500/30 hover:bg-red-500/30'}`}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>
                </section>
              )}

              {/* ABOUT & ACCESSIBILITY */}
              {matchesSearch(['about', 'accessibility', 'contrast']) && (
                <section className={`space-y-2 p-4 rounded-2xl border transition-all ${isLightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-white/5 border-white/5'}`}>
                  <label className={`text-[10px] uppercase font-black tracking-widest flex items-center gap-2 ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'}`}>
                    <ShieldAlert className="w-3 h-3 text-[var(--theme)]" /> About & Accessibility
                  </label>
                  <p className={`text-[9px] leading-relaxed ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    This website is committed to digital accessibility. If you encounter any contrast issues with custom themes or navigation barriers, feel free to adjust your theme.
                  </p>
                </section>
              )}

              {/* THEMES */}
              {matchesSearch(['themes', 'color', 'palette', 'light mode', 'dark mode']) && (
                <section className="space-y-3">
                  <label className={`text-[10px] uppercase font-black tracking-widest flex items-center gap-2 ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'}`}>
                    <Palette className="w-3 h-3" /> Themes
                  </label>
                  
                  <button 
                    type="button"
                    onClick={() => typeof setIsLightMode === 'function' && setIsLightMode(!isLightMode)}
                    className={`w-full p-3 mb-2 border rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all outline-none focus:ring-2 focus:ring-[var(--theme)] ${isLightMode ? 'bg-white border-zinc-200 text-zinc-900 hover:bg-zinc-50' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
                  >
                    {isLightMode ? <Sun className="w-3.5 h-3.5 text-yellow-500" /> : <Moon className="w-3.5 h-3.5 text-blue-400" />} 
                    {isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(themes || {}).map(([id, t]) => (
                      <button 
                        key={id} 
                        type="button"
                        onClick={() => typeof applyTheme === 'function' && applyTheme(t)} 
                        className={`p-3 border rounded-xl text-[10px] font-bold flex items-center gap-2 transition-all outline-none focus:ring-1 focus:ring-[var(--theme)] ${isLightMode ? 'bg-white border-zinc-200 text-zinc-900 hover:border-[var(--theme)]' : 'bg-white/5 border-white/10 text-zinc-100 hover:border-[var(--theme)]'}`}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t?.color || '#38b2f6' }} /> {t?.name || 'Theme'}
                      </button>
                    ))}
                  </div>

                  {/* CUSTOM COLOR PICKER */}
                  <div 
                    className={`p-3 border rounded-xl flex items-center justify-between ${isLightMode ? 'bg-white border-zinc-200' : 'bg-white/5 border-white/10'}`}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setPreviousColor(null);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative w-6 h-6 rounded-lg overflow-hidden border border-white/20 cursor-pointer flex items-center justify-center flex-shrink-0">
                        <input 
                          type="color" 
                          value={getValidHexColor()}
                          onMouseDown={() => {
                            if (!previousColor) {
                              setPreviousColor(getValidHexColor());
                            }
                          }}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (typeof document !== 'undefined') {
                              document.documentElement.style.setProperty('--theme', val);
                            }
                          }}
                          onBlur={(e) => {
                            if (typeof applyTheme === 'function') {
                              applyTheme({ name: 'Custom', color: e.target.value });
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <div className="w-full h-full bg-[var(--theme)]" />
                      </div>
                      <span className={`text-[10px] font-bold uppercase ${isLightMode ? 'text-zinc-900' : 'text-zinc-100'}`}>Custom Color Picker</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {previousColor && (
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof applyTheme === 'function') applyTheme({ name: 'Custom', color: previousColor });
                            setPreviousColor(null);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-colors outline-none focus:ring-1 focus:ring-zinc-400 ${
                            isLightMode 
                              ? 'bg-zinc-200 text-zinc-800 hover:bg-zinc-300' 
                              : 'bg-white/10 text-zinc-200 hover:bg-white/20'
                          }`}
                        >
                          Cancel
                        </button>
                      )}
                      <span className="text-[10px] font-mono text-[var(--theme)]">Live Pick</span>
                    </div>
                  </div>
                </section>
              )}

              {/* DANGER ZONE */}
              {matchesSearch(['danger', 'reset', 'clear', 'factory', 'settings']) && (
                <section className={`space-y-3 p-4 rounded-2xl border transition-all ${isLightMode ? 'bg-red-50/50 border-red-200' : 'bg-red-500/5 border-red-500/20'}`}>
                  <label className="text-[10px] uppercase font-black text-red-500 tracking-widest flex items-center gap-2">
                    <ShieldAlert className="w-3 h-3" /> Danger Zone
                  </label>
                  <p className={`text-[9px] uppercase font-bold tracking-tighter leading-tight ${isLightMode ? 'text-red-900' : 'text-red-300'}`}>
                    Irreversible actions that clear local settings, cache, or reset app defaults.
                  </p>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button 
                      type="button"
                      onClick={handleClearSettings} 
                      className={`p-3 rounded-xl border text-[9px] font-black uppercase flex items-center justify-center gap-2 transition-all outline-none focus:ring-2 focus:ring-orange-400 ${
                        confirmClearSettings 
                          ? 'bg-orange-500 text-black border-orange-400 animate-pulse' 
                          : isLightMode 
                            ? 'border-orange-300 bg-white text-orange-700 hover:bg-orange-50' 
                            : 'border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
                      }`}
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${confirmClearSettings ? 'animate-spin' : ''}`} /> 
                      {confirmClearSettings ? 'ARE YOU SURE?' : 'Clear Settings'}
                    </button>

                    <button 
                      type="button"
                      onClick={handleReset} 
                      className={`p-3 rounded-xl border text-[9px] font-black uppercase flex items-center justify-center gap-2 transition-all outline-none focus:ring-2 focus:ring-red-400 ${
                        confirmReset 
                          ? 'bg-red-500 text-black border-red-400 animate-pulse' 
                          : isLightMode 
                            ? 'border-red-300 bg-white text-red-600 hover:bg-red-500 hover:text-white' 
                            : 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-white'
                      }`}
                    >
                      <RotateCcw className={`w-4 h-4 ${confirmReset ? 'animate-spin' : ''}`} />
                      {confirmReset ? 'ARE YOU SURE?' : 'Factory Reset'}
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>

        {/* UPLOAD SUB-MODAL */}
        {uploadModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
            <div className={`${modalBg} border p-6 rounded-3xl max-w-sm w-full shadow-2xl space-y-4`}>
              <h3 className="text-lg font-bold">Edit Uploaded Song</h3>
              <p className="text-[10px] text-zinc-400">Customize the details for your uploaded MP3 track before adding it to the library.</p>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] text-zinc-400 uppercase font-black block mb-1">Song Name</label>
                  <input 
                    type="text" 
                    value={songTitle} 
                    onChange={(e) => setSongTitle(e.target.value.slice(0, 50))}
                    className={`w-full ${inputBg} border rounded-xl p-3 text-xs outline-none font-bold`}
                  />
                </div>

                <div>
                  <label className="text-[9px] text-zinc-400 uppercase font-black block mb-1">Artist Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Green Day" 
                    value={artistName} 
                    onChange={(e) => setArtistName(e.target.value.slice(0, 50))}
                    className={`w-full ${inputBg} border rounded-xl p-3 text-xs outline-none font-bold`}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => setUploadModalOpen(false)} 
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase transition-colors outline-none focus:ring-1 focus:ring-zinc-400"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={saveCustomSong} 
                    aria-busy={isSavingSong}
                    className="px-5 py-2.5 rounded-xl bg-[var(--theme)] text-black text-[10px] font-black uppercase hover:opacity-90 shadow-md transition-opacity flex items-center gap-2 outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[var(--theme)]"
                  >
                    {isSavingSong ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                      </>
                    ) : (
                      "Save to Library"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {cropperOpen && imageToCrop && (
        <AvatarCropperModal
          show={cropperOpen}
          imageSrc={imageToCrop}
          onClose={() => {
            setCropperOpen(false);
            setImageToCrop(null);
          }}
          onSave={handleCropSave}
          isLightMode={isLightMode}
        />
      )}
    </>
  );
}

export function SettingsModal(props) {
  return (
    <SettingsErrorBoundary show={props.show} onClose={props.onClose}>
      <SettingsModalContent {...props} />
    </SettingsErrorBoundary>
  );
}
