import React, { useState, useMemo, useEffect, useRef } from 'react';
import gamesData from './games.json';
import { useAchievements } from './hooks/useAchievements.js';
import { 
  Search, Gamepad2, Play, Settings, X, ShieldAlert, 
  Clock, Dices, RotateCcw, Palette, Type, ImageIcon, 
  Link as LinkIcon, Upload, Battery, Calendar, Heart, Trash2, Ghost, Zap, Video, Music, Volume2, Power,
  Cpu, Users, UserPlus, UserCircle, CheckCircle2, History, ChevronLeft, ChevronRight, VolumeX
} from 'lucide-react';

import gamesDataRaw from './games.json';
import gnMathDataRaw from './gn-math-games.json';
import { GameCard } from './components/GameCard';
import { SettingsModal } from './components/SettingsModal';
import { Header } from './components/Header';
import { FriendViewModal } from './components/FriendViewModal';
import { tracklist } from './components/tracklist'; 
import { ChatCard } from './components/ChatCard';
import { SoundboardCard } from './components/SoundboardCard';
import { applyCloak } from './utils';

// --- CONSTANTS & CONFIGS ---

const GOOGLE_FAVICON = "https://www.gstatic.com/images/branding/searchlogo/ico/favicon.ico";
const DEFAULT_TITLE = "Google"; 
const DEFAULT_ICON = GOOGLE_FAVICON; 
const DEFAULT_COLOR = '#38bdf8';
const DEFAULT_GLOW = 0;

// --- ACHIEVEMENT DEFINITIONS ---
const TROPHIES = [
  { id: 'first_game', name: 'First Blood', desc: 'Play your first game', icon: '🏆' },
  { id: 'marathon', name: 'Marathoner', desc: 'Play for over 1 hour total', icon: '⏱️' },
  { id: 'collector', name: 'The Collector', desc: 'Favorite 10 different games', icon: '⭐' },
  { id: 'loyal', name: 'Capy-Loyalist', desc: 'Play one game for 30 mins', icon: '🦫' },
  { id: 'styler', name: 'Fashionista', desc: 'Change your theme 5 times', icon: '🎨' }
];

const THEMES = {
  cyber: { name: 'Cyberpunk', color: '#f43f5e', glow: 0 },
  midnight: { name: 'Midnight', color: '#8b5cf6', glow: 0 }, 
  forest: { name: 'Forest', color: '#10b981', glow: 0 },
  classic: { name: 'Classic', color: DEFAULT_COLOR, glow: DEFAULT_GLOW }
};

const DISGUISE_CONFIG = {
  none: { title: DEFAULT_TITLE, icon: DEFAULT_ICON },
  google: { title: "Google", icon: GOOGLE_FAVICON },
  drive: { title: "My Drive - Google Drive", icon: "https://ssl.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png" },
  classroom: { title: "Home - Classroom", icon: "https://www.gstatic.com/classroom/favicon.png" },
  powerschool: { title: "Grades and Attendance", icon: "https://ps.bhmsd.org/favicon.ico" }
};

const updateThemeVariables = (color, glow) => {
  const root = document.documentElement;
  root.style.setProperty('--theme', color);
  root.style.setProperty('--glow', `${glow}px`);
};

export default function App() {
  const [showTitle, setShowTitle] = useState(() => localStorage.getItem('skipTitleScreen') !== 'true');
  const [supplier, setSupplier] = useState(() => localStorage.getItem('capy-supplier') || 'Default');
  const [playtimes, setPlaytimes] = useState(() => JSON.parse(localStorage.getItem('capy-playtimes') || '{}'));
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('capy-favs') || '[]'));
  const [themeChangeCount, setThemeChangeCount] = useState(() => parseInt(localStorage.getItem('capy-theme-changes') || '0'));
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSoundboardOpen, setIsSoundboardOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  // Persistent Theme Initialization Fix
  const [theme, setTheme] = useState(() => localStorage.getItem('capy-theme') || DEFAULT_COLOR);
  const [glowIntensity, setGlowIntensity] = useState(() => Number(localStorage.getItem('capy-glow')) || DEFAULT_GLOW);

  const userData = { playtimes: playtimes, favorites: favorites, themeChangeCount: themeChangeCount };

  const [achievements, setAchievements] = useState([]);
  const [activeCloak, setActiveCloak] = useState(() => localStorage.getItem('capy-cloak-type') || 'google');

  useEffect(() => {
    const config = DISGUISE_CONFIG[activeCloak] || DISGUISE_CONFIG.google;
    applyCloak(config);
    localStorage.setItem('capy-cloak-type', activeCloak);
  }, [activeCloak]);

  const gamesData = useMemo(() => {
    const main = Array.isArray(gamesDataRaw) ? gamesDataRaw : [];
    const gn = Array.isArray(gnMathDataRaw) ? gnMathDataRaw.map(game => ({
      ...game,
      urls: { "GN Math": game.url },
      url: ""
    })) : [];
    return [...main, ...gn];
  }, []);

  const audioRef = useRef(null);
  const categoryScrollRef = useRef(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showSettings, setShowSettings] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClearSettings, setConfirmClearSettings] = useState(false);
  const [notification, setNotification] = useState(null);

  const [time, setTime] = useState(new Date());
  const [battery, setBattery] = useState({ level: null, charging: false });

  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.log("Playback prevented:", err));
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if ('getBattery' in navigator) {
      navigator.getBattery().then(bat => {
        const updateBattery = () => {
          setBattery({ level: Math.round(bat.level * 100), charging: bat.charging });
        };
        updateBattery();
        bat.addEventListener('levelchange', updateBattery);
        bat.addEventListener('chargingchange', updateBattery);
      });
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--theme', theme);
    document.documentElement.style.setProperty('--glow', `${glowIntensity}px`);
  }, [theme, glowIntensity]);

  const [disguise, setDisguise] = useState(() => localStorage.getItem('capy-stealth-type') || 'none');
  const [customTitle, setCustomTitle] = useState(() => localStorage.getItem('capy-custom-title') || '');
  const [customIcon, setCustomIcon] = useState(() => localStorage.getItem('capy-custom-icon') || '');

  const [bgEnabled, setBgEnabled] = useState(() => localStorage.getItem('capy-bg-enabled') === 'true');
  const [backgroundImage, setBackgroundImage] = useState(() => localStorage.getItem('capy-bg-image') || '');
  const [backgroundVideo, setBackgroundVideo] = useState(() => localStorage.getItem('capy-bg-video') || '');
  const [bgOpacity, setBgOpacity] = useState(() => Number(localStorage.getItem('capy-bg-opacity')) || 50);
  
  const [bgMusic, setBgMusic] = useState(() => localStorage.getItem('capy-bg-music') || '');
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('capy-volume');
    return saved !== null ? Number(saved) : 0.5;
  });

  const [panicUrl, setPanicUrl] = useState(() => localStorage.getItem('capy-panic-url') || 'https://google.com');
  const [panicKey, setPanicKey] = useState(() => localStorage.getItem('capy-panic-key') || '');

  const [recentlyPlayed, setRecentlyPlayed] = useState(() => {
    try {
      const recentKey = `capy-recent-${supplier}`;
      const saved = localStorage.getItem(recentKey);
      return (saved && saved !== "undefined") ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("History error:", e);
      return [];
    }
  });
  
  const [performanceMode, setPerformanceMode] = useState(() => localStorage.getItem('capy-perf-mode') === 'true');
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('capy-display-name') || 'CapyUser');
  const [profilePic, setProfilePic] = useState(() => localStorage.getItem('capy-pfp') || '');
  const [friends, setFriends] = useState(() => JSON.parse(localStorage.getItem('capy-friends') || '[]'));
  const [selectedFriendId, setSelectedFriendId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLightMode, setIsLightMode] = useState(() => localStorage.getItem('capy-light-mode') === 'true');

  const [uniqueId] = useState(() => {
    let id = localStorage.getItem('capy-unique-id');
    if (!id) {
      id = typeof crypto.randomUUID === 'function' 
        ? crypto.randomUUID().substring(0, 8) 
        : Math.random().toString(36).substring(2, 10);
      localStorage.setItem('capy-unique-id', id);
    }
    return id;
  });

  const getLaunchUrl = (game, currentSupplier) => {
    if (currentSupplier !== 'Default' && game.urls && game.urls[currentSupplier]) {
      return game.urls[currentSupplier];
    }
    return game.url || `/stores/${game.id}.html`;
  };

  const launchContent = (item) => {
    const finalUrl = getLaunchUrl(item, supplier); 
    if (!finalUrl) return;

    const recentKey = `capy-recent-${supplier}`; 
    
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(id => id !== item.id);
      const updated = [item.id, ...filtered].slice(0, 4);
      localStorage.setItem(recentKey, JSON.stringify(updated));
      return updated;
    });

    const startTime = Date.now();
    const gameUrl = finalUrl;
    
    const win = window.open('about:blank', '_blank');

    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>DO NOT REFRESH</title>
          </head>
          <body style="margin:0;padding:0;overflow:hidden;background:#09090b;">
            <iframe 
              src="${gameUrl}" 
              style="width:100vw;height:100vh;border:none;display:block;" 
              allow="fullscreen">
            </iframe>
          </body>
        </html>
      `);
      win.document.close();

      const checkInterval = setInterval(() => {
        if (win.closed) {
          clearInterval(checkInterval);
          const duration = Math.floor((Date.now() - startTime) / 1000 / 60);
          if (duration > 0) {
            setPlaytimes(prev => {
              const id = item.id;
              const updated = { ...prev, [id]: (prev[id] || 0) + duration };
              localStorage.setItem('capy-playtimes', JSON.stringify(updated));
              return updated;
            });
          }
        }
      }, 1000);
    }
  };
 
  useEffect(() => {
    const checkStatus = setInterval(() => {
      if (window.location.href.includes("carti-is-a-goat-rapper")) {
        document.body.innerHTML = `
          <div style="background:black; color:black; height:100vh; width:100vw; position:fixed; top:0; left:0; z-index:999999; cursor:default;">
            Site Closed
          </div>
        `;
        document.body.style.backgroundColor = "black";
        clearInterval(checkStatus);
      }
    }, 1000); 
    return () => clearInterval(checkStatus);
  }, []);
  
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (categoryScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoryScrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  const scrollCategories = (direction) => {
    if (categoryScrollRef.current) {
      const scrollAmount = 250;
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 350);
    }
  };

  const categoriesWithCounts = useMemo(() => {
    const uniqueCats = [...new Set(gamesData.map(g => g?.category).filter(Boolean))];
    const final = [{ name: 'All', count: gamesData.length }];
    
    if (favorites.length > 0) {
      final.push({ name: 'Favorites', count: favorites.length });
    }
    
    uniqueCats.forEach(cat => {
      final.push({ name: cat, count: gamesData.filter(g => g.category === cat).length });
    });
    
    return final;
  }, [gamesData, favorites]);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [categoriesWithCounts]);

  const safeDecode = (str) => {
    try {
      let base64 = str.trim().replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4 !== 0) base64 += '=';
      return JSON.parse(decodeURIComponent(escape(atob(base64))));
    } catch (e) {
      console.error("Decode failed", e);
      return null;
    }
  };

  const friendCode = useMemo(() => {
    const currentFavs = favorites || [];
    const topFavs = currentFavs.slice(0, 5);
    const topTimes = {};
    
    topFavs.forEach(id => {
      if (playtimes[id]) topTimes[id] = playtimes[id];
    });

    const data = {
      n: displayName,
      id: uniqueId,
      f: topFavs,
      t: topTimes,
      p: profilePic,
      a: achievements
    };
    
    return btoa(JSON.stringify(data));
  }, [displayName, uniqueId, favorites, playtimes, profilePic, achievements]);

  const fullSyncCode = useMemo(() => {
    const data = {
      n: displayName,
      id: uniqueId,
      p: profilePic,
      t: theme,
      g: glowIntensity,
      favs: favorites,
      ach: achievements
    };
    return btoa(unescape(encodeURIComponent(JSON.stringify(data)))).replace(/=/g, '');
  }, [displayName, uniqueId, profilePic, theme, glowIntensity, favorites, achievements]);

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
    localStorage.setItem('capy-light-mode', isLightMode);
  }, [isLightMode]);

  useEffect(() => {
    localStorage.setItem('capy-volume', volume.toString());
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      localStorage.setItem('capy-volume', volume.toString());

      if (performanceMode || !isPlaying) {
        audioRef.current.pause();
      } else if (bgMusic) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [volume, performanceMode, isPlaying, bgMusic]);

  useEffect(() => {
    if (audioRef.current && bgMusic) {
      audioRef.current.pause();
      audioRef.current.load();
      
      if (!performanceMode && isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => console.log("Autoplay check:", err));
        }
      }
    }
  }, [bgMusic, performanceMode]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    if (performanceMode) {
      updateThemeVariables(theme, 0); 
    } else {
      updateThemeVariables(theme, glowIntensity);
    }
  }, [performanceMode, theme, glowIntensity]);
  
  useEffect(() => {
    const startMusic = () => {
      if (audioRef.current && bgMusic && !performanceMode && isPlaying) {
        audioRef.current.play().catch(() => {});
      }
    };
    window.addEventListener('click', startMusic, { once: true });
    return () => window.removeEventListener('click', startMusic);
  }, [bgMusic, performanceMode, isPlaying]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (audioRef.current && bgMusic) {
        if (document.hidden || performanceMode || !isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play().catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [bgMusic, performanceMode, isPlaying]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }
      if (panicKey && e.key === panicKey) {
        window.location.href = panicUrl.startsWith('http') ? panicUrl : `https://${panicUrl}`;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [panicUrl, panicKey]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    if ('getBattery' in navigator) {
      navigator.getBattery().then(bat => {
        const updateBat = () => setBattery({ level: Math.round(bat.level * 100), charging: bat.charging });
        bat.addEventListener('levelchange', updateBat);
        bat.addEventListener('chargingchange', updateBat);
        updateBat();
      });
    }
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (confirmReset) {
      const timeout = setTimeout(() => setConfirmReset(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [confirmReset]);

  useEffect(() => {
    if (confirmClearSettings) {
      const timeout = setTimeout(() => setConfirmClearSettings(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [confirmClearSettings]);

  useEffect(() => {
    const ids = ['first_game', 'marathon', 'collector', 'loyal', 'fashionista'];
    const alreadyEarned = ids.filter(id => localStorage.getItem(`achievement_${id}`) === 'true');
    if (alreadyEarned.length > 0 && typeof setAchievements === 'function') {
      setAchievements(alreadyEarned);
    }
  }, []);
  
  useEffect(() => {
    const newAchievements = [...(achievements || [])];
    let earnedNew = false;

    const checkAndAdd = (id) => {
      if (!newAchievements.includes(id)) {
        newAchievements.push(id);
        earnedNew = true;
      }
    };

    if (Object.keys(playtimes || {}).length > 0) {
      if (!localStorage.getItem('achievement_first_game')) {
        localStorage.setItem('achievement_first_game', 'true');
        checkAndAdd('first_game');
        setNotification("Achievement unlocked: First Blood");
      }
    }

    const totalTime = Object.values(playtimes || {}).reduce((a, b) => a + b, 0);
    if (totalTime >= 3600 && !localStorage.getItem('achievement_marathon')) {
      localStorage.setItem('achievement_marathon', 'true');
      checkAndAdd('marathon');
      setNotification("Achievement unlocked: Marathoner");
    }

    if (typeof setAchievements === 'function') {
      if (earnedNew || newAchievements.length !== (achievements?.length || 0)) {
        setAchievements(newAchievements);
      }
    }
  }, [playtimes, favorites, themeChangeCount, achievements]);

  const handleBackgroundUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setBgEnabled(true);
        localStorage.setItem('capy-bg-enabled', 'true');
        if (file.type.startsWith('video/')) {
          setBackgroundVideo(base64String);
          setBackgroundImage('');
          localStorage.setItem('capy-bg-video', base64String);
          localStorage.removeItem('capy-bg-image');
        } else {
          setBackgroundImage(base64String);
          setBackgroundVideo('');
          localStorage.setItem('capy-bg-image', base64String);
          localStorage.removeItem('capy-bg-video');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetBackground = () => {
    setBackgroundImage('');
    setBackgroundVideo('');
    setBgEnabled(false);
    localStorage.removeItem('capy-bg-image');
    localStorage.removeItem('capy-bg-video');
    localStorage.setItem('capy-bg-enabled', 'false');
  };

  const handleAudioUpload = (e) => {
    if (e && e.presetUrl) {
      setBgMusic(e.presetUrl);
      setBgEnabled(true); 
      setIsPlaying(true);
      localStorage.setItem('capy-bg-music', e.presetUrl);
      if (audioRef.current) {
        audioRef.current.load();
        audioRef.current.play().catch(err => console.log("Playback prevented:", err));
      }
      return;
    }

    if (e.target && e.target.files) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const audioData = event.target.result;
          setBgMusic(audioData);
          setBgEnabled(true);
          setIsPlaying(true);
          localStorage.setItem('capy-bg-music', audioData);
          if (audioRef.current) {
            audioRef.current.load();
            audioRef.current.play().catch(err => console.log("Playback prevented:", err));
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleResetMusic = () => {
    setBgMusic('');
    setBgEnabled(false); 
    setIsPlaying(false);
    localStorage.removeItem('capy-bg-music');
    localStorage.setItem('capy-bg-enabled', 'false');
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const handlePfpUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const maxSize = 500 * 1024; 
      if (file.size > maxSize) {
        alert("File too large! Please use an image under 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result);
        localStorage.setItem('capy-pfp', reader.result);
        setNotification("Profile picture updated");
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleFavorite = (id) => {
    const stringId = String(id); 
    const isRemoving = favorites.includes(stringId);
    const newFavs = isRemoving 
      ? favorites.filter(favId => favId !== stringId) 
      : [...favorites, stringId];
    
    setFavorites(newFavs);
    localStorage.setItem('capy-favs', JSON.stringify(newFavs));

    if (isRemoving && newFavs.length === 0 && activeCategory === 'Favorites') {
      setActiveCategory('All');
    }
  };

  const applyTheme = (t) => {
    document.documentElement.style.setProperty('--theme', t.color);
    setTheme(t.color);
    setGlowIntensity(t.glow);
    localStorage.setItem('capy-theme', t.color);
    localStorage.setItem('capy-glow', t.glow);

    setThemeChangeCount(prev => {
      const next = prev + 1;
      localStorage.setItem('capy-theme-changes', next);
      return next;
    });
    
    if (!performanceMode) {
        updateThemeVariables(t.color, t.glow);
    }
  };

  const handleReset = () => {
    if (confirmReset) {
      localStorage.clear();
      window.location.reload();
    } else {
      setConfirmReset(true);
      setNotification("Warning: This will delete all customization, favorites, friends, and stats.");
    }
  };

  const handleClearSettings = () => {
    if (confirmClearSettings) {
      const settingsKeys = [
        'capy-theme', 'capy-glow', 'capy-stealth-type', 
        'capy-custom-title', 'capy-custom-icon', 'capy-bg-image', 
        'capy-bg-video', 'capy-bg-opacity', 'capy-bg-music', 
        'capy-volume', 'capy-panic-url', 'capy-panic-key', 'capy-perf-mode',
        'capy-bg-enabled', 'capy-recent', 'capy-pfp', 'capy-light-mode', 'capy-achievements', 'capy-theme-changes'
      ];
      settingsKeys.forEach(key => localStorage.removeItem(key));
      window.location.reload();
    } else {
      setConfirmClearSettings(true);
      setNotification("Warning: This will reset all settings to default.");
    }
  };

  const currentIdentity = useMemo(() => {
    if (disguise !== 'none') return DISGUISE_CONFIG[disguise] || DISGUISE_CONFIG.none;
    return { title: customTitle || DEFAULT_TITLE, icon: customIcon || DEFAULT_ICON };
  }, [disguise, customTitle, customIcon]);

  useEffect(() => {
    document.title = currentIdentity.title;
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = currentIdentity.icon;
  }, [currentIdentity]);

  const filteredGames = useMemo(() => {
    const q = (searchQuery || "").toLowerCase();
    let sourceData = gamesDataRaw || []; 
    if (supplier === 'GN Math') {
      sourceData = gnMathDataRaw || [];
    } else if (supplier === 'Truffled') {
      sourceData = [];
    }

    return sourceData.filter(g => {
      const matchesSearch = g?.title?.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      if (supplier === 'GN Math') {
        return true; 
      } else if (supplier === 'Truffled') {
        return true;
      } else {
        const isSpecial = g.urls?.['GN Math'] || g.urls?.['GN-MATH'] || g.urls?.['Truffled'];
        if (isSpecial) return false;
      }

      if (activeCategory === 'Favorites') {
        return (favorites || []).includes(String(g?.id));
      }
      return activeCategory === 'All' || g?.category === activeCategory;
    });
  }, [searchQuery, activeCategory, favorites, supplier, gamesDataRaw, gnMathDataRaw]);
  
  const recentGamesData = useMemo(() => {
    if (!recentlyPlayed || !Array.isArray(recentlyPlayed)) return [];
    return recentlyPlayed
      .map(id => {
        const allPossibleGames = [...(gamesDataRaw || []), ...(gnMathDataRaw || [])];
        return allPossibleGames.find(g => String(g.id) === String(id));
      })
      .filter(g => {
        if (!g) return false;
        if (supplier === 'GN Math') return true;
        if (supplier === 'Truffled') return false;
        return !(g.urls?.['GN Math'] || g.urls?.['GN-MATH'] || g.urls?.['Truffled']);
      })
      .slice(0, 4); 
  }, [recentlyPlayed, gamesDataRaw, gnMathDataRaw, supplier]);

  const currentFriend = useMemo(() => {
    if (!selectedFriendId || selectedFriendId === 'me') return null;
    const friend = friends.find(f => f.code === selectedFriendId);
    if (!friend) return null;
    const decoded = safeDecode(selectedFriendId);
    return decoded ? { ...friend, decoded } : friend;
  }, [friends, selectedFriendId]);

  useEffect(() => {
    setRecentlyPlayed([]); 
    const recentKey = `capy-recent-${supplier}`;
    const saved = localStorage.getItem(recentKey);
    try {
      if (saved && saved !== "undefined") {
        setRecentlyPlayed(JSON.parse(saved));
      }
    } catch (e) {
      console.error("History error:", e);
      setRecentlyPlayed([]);
    }
  }, [supplier]);
  
  return (
    <div
      className={`min-h-screen pb-20 antialiased relative bg-[#09090b] ${performanceMode ? '' : 'transition-colors duration-200'} ${isLightMode ? 'light-mode text-zinc-900 bg-zinc-50' : 'text-zinc-100'}`} 
      style={{ 
        '--theme': theme, 
        '--glow': `${performanceMode ? 0 : glowIntensity}px`
      }}
    >
      {showTitle ? (
        <div 
          className="fixed inset-0 z-[99999] bg-[#09090b] flex flex-col items-center justify-center p-6 text-zinc-100 select-none animate-in fade-in duration-300 bg-cover bg-center"
          style={{ cursor: 'default', pointerEvents: 'auto' }}
        >
          {/* Background Funny Capybara Image with Dark Overlay */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <div 
              className="absolute inset-0 bg-cover bg-center filter brightness-90 scale-105"
              style={{ backgroundImage: `url('https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh_CapybaraPlaceholder/s2048/Capybara-with-open-mouth-698301070.jpg')` }}
            />
            <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-[2px]" />
          </div>

          {/* Title Card Container */}
          <div className="relative z-10 max-w-md w-full bg-zinc-900/75 border border-zinc-800/80 rounded-2xl p-8 flex flex-col items-center text-center shadow-2xl backdrop-blur-md" style={{ cursor: 'default' }}>
            
            {/* Logo replacement */}
            <div className="w-20 h-20 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mb-6 overflow-hidden shadow-inner">
              <div className="w-12 h-12 rounded-xl bg-[var(--theme)] flex items-center justify-center text-zinc-950 font-black text-2xl shadow-sm">
                🦫
              </div>
            </div>

            <div className="space-y-1 mb-8">
              <span className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">Welcome to</span>
              <h1 className="text-2xl font-bold tracking-tight text-white">Capybara Science</h1>
            </div>

            <div className="w-full space-y-2 text-left mb-6">
              <label className="text-xs font-medium text-zinc-400">Display Name</label>
              <input 
                type="text" 
                value={displayName} 
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  localStorage.setItem('capy-display-name', e.target.value);
                }}
                placeholder="CapyUser"
                maxLength={20}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--theme)] transition-colors"
                style={{ cursor: 'text' }}
              />
            </div>

            <div className="flex items-center gap-3 w-full text-left mb-8 px-1">
              <input 
                type="checkbox" 
                id="skipTitleCheckbox"
                onChange={(e) => {
                  if (e.target.checked) {
                    localStorage.setItem('skipTitleScreen', 'true');
                  } else {
                    localStorage.removeItem('skipTitleScreen');
                  }
                }}
                className="w-4 h-4 accent-[var(--theme)] rounded cursor-pointer bg-zinc-950 border-zinc-800"
              />
              <label htmlFor="skipTitleCheckbox" className="text-xs text-zinc-400 cursor-pointer select-none hover:text-zinc-300">
                Skip this title screen next time
              </label>
            </div>

            <button 
              onClick={() => setShowTitle(false)}
              className="w-full py-3.5 bg-[var(--theme)] text-zinc-950 font-semibold text-sm rounded-xl transition-all hover:opacity-95 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              style={{ cursor: 'pointer' }}
            >
              <Play className="w-4 h-4 fill-current" />
              Go to Home Page
            </button>
          </div>

          {/* Formal Image Credit in Bottom Right */}
          <div className="absolute bottom-4 right-4 z-20 text-[11px] text-zinc-400/80 bg-zinc-950/70 backdrop-blur-md px-3.5 py-2 rounded-xl border border-zinc-800/60 shadow-lg" style={{ cursor: 'default' }}>
            <span>Background image: <em>Capybara Facts Habitat</em> courtesy of Animals World (</span>
            <a 
              href="https://animals-world5.blogspot.com" 
              target="_blank" 
              rel="noreferrer" 
              className="underline text-zinc-300 hover:text-white transition-colors"
            >
              animals-world5.blogspot.com
            </a>
            <span>)</span>
          </div>
        </div>
      ) : (
        <>
          {notification && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] animate-in fade-in slide-in-from-bottom-3 duration-200">
              <div className="bg-zinc-900 border border-zinc-800 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-zinc-200">
                <CheckCircle2 className="w-4 h-4 text-[var(--theme)] shrink-0" />
                <span className="text-xs font-medium">{notification}</span>
              </div>
            </div>
          )}

          {bgEnabled && !performanceMode && (
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" style={{ opacity: bgOpacity / 100 }}>
              {backgroundVideo ? (
                <video key={backgroundVideo} autoPlay muted loop playsInline className="w-full h-full object-cover">
                  <source src={backgroundVideo} />
                </video>
              ) : backgroundImage ? (
                <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${backgroundImage})` }} />
              ) : null}
            </div>
          )}

          {bgMusic && !performanceMode && (
            <audio 
              key={bgMusic} 
              ref={audioRef}
              src={bgMusic} 
              loop 
              autoPlay={isPlaying}
              onLoadedData={(e) => {
                e.target.volume = volume; 
                if (!isPlaying) {
                  e.target.pause();
                }
              }}
            />
          )}

          {isChatOpen ? (
            <div className="fixed inset-0 z-[9999] bg-[#09090b] flex flex-col p-4 animate-in fade-in duration-200">
              <button 
                onClick={() => setIsChatOpen(false)}
                className="absolute top-6 right-6 p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full z-[10000] transition-colors text-zinc-300"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex-1 w-full max-w-5xl mx-auto flex items-center justify-center">
                <div className="w-full h-[85vh]">
                   <ChatCard isLightMode={isLightMode} setIsChatOpen={setIsChatOpen} />
                </div>
              </div>
            </div>
          ) : (
            <>
              <Header 
                searchQuery={searchQuery} 
                setSearchQuery={setSearchQuery}
                supplier={supplier}       
                setSupplier={setSupplier} 
                time={time}
                battery={battery}
                profilePic={profilePic}
                setShowSettings={setShowSettings}
                DEFAULT_ICON={DEFAULT_ICON}
                theme={theme}   
                onViewProfile={() => setSelectedFriendId('me')} 
                onRandomGame={() => {
                  const playable = (filteredGames || []).filter(g => !['request', 'report'].includes(g?.id));
                  if (playable.length > 0) {
                    launchContent(playable[Math.floor(Math.random() * playable.length)]);
                  }
                }}
                isChatOpen={isChatOpen}
                setIsChatOpen={setIsChatOpen}
                setShowSoundboard={setIsSoundboardOpen}
                isSoundboardOpen={isSoundboardOpen}
              />

              {/* Category Bar Wrapper */}
              <div className="px-4 pt-3 pb-1 overflow-hidden sticky top-16 z-40 bg-transparent transition-colors group">
                <div className="max-w-7xl mx-auto relative flex items-center">
                  {canScrollLeft && (
                    <div className="absolute left-0 z-50 flex items-center pr-12 h-full bg-transparent pointer-events-none">
                      <button
                        onClick={() => scrollCategories('left')}
                        aria-label="Scroll categories left"
                        className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-full shadow-md transition-colors border border-zinc-700 pointer-events-auto"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div
                    ref={categoryScrollRef}
                    onScroll={checkScroll}
                    className="flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth px-2 w-full"
                  >
                    {categoriesWithCounts.map(cat => (
                      <button
                        key={cat.name}
                        onClick={() => setActiveCategory(cat.name)}
                        aria-current={activeCategory === cat.name ? 'page' : undefined}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border shrink-0 transition-colors ${
                          activeCategory === cat.name
                            ? 'bg-[var(--theme)] border-[var(--theme)] text-zinc-950 font-semibold'
                            : isLightMode
                              ? 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200'
                              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
                        }`}
                      >
                        {cat.name} <span className={`ml-1 ${activeCategory === cat.name ? 'opacity-90' : 'opacity-40'}`}>{cat.count}</span>
                      </button>
                    ))}
                  </div>

                  {canScrollRight && (
                    <div className="absolute -right-2 z-50 flex items-center pl-12 h-full bg-transparent pointer-events-none">
                      <button 
                        onClick={() => scrollCategories('right')}
                        aria-label="Scroll categories right"
                        className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-full shadow-md transition-colors border border-zinc-700 pointer-events-auto"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <main className="max-w-7xl mx-auto px-4 mt-6 space-y-10">
                <h1 className="sr-only">Capybara Science</h1>
                
                {recentGamesData.length > 0 && activeCategory === 'All' && !searchQuery && (
                  <section className="space-y-3">
                    <div className={`flex items-center gap-2 text-xs font-semibold tracking-wide uppercase ${isLightMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      <History className="w-3.5 h-3.5 text-[var(--theme)]" />
                      Recently Played
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {recentGamesData.map(game => (
                        <GameCard 
                          key={`recent-${game.id}`} 
                          game={game} 
                          onLaunch={launchContent} 
                          playtime={playtimes[game.id] ? Math.floor(playtimes[game.id]/60) + 'm' : '0m'}
                          isFavorite={favorites.includes(String(game.id))}
                          onToggleFavorite={() => toggleFavorite(game.id)}
                          performanceMode={performanceMode}
                        />
                      ))}
                    </div>
                  </section>
                )}

                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {filteredGames.map(game => (
                    <GameCard 
                      key={game.id} 
                      game={game} 
                      onLaunch={launchContent} 
                      playtime={playtimes[game.id] ? Math.floor(playtimes[game.id]/60) + 'm' : '0m'}
                      isFavorite={favorites.includes(String(game.id))} 
                      onToggleFavorite={() => toggleFavorite(game.id)}
                      performanceMode={performanceMode}
                    />
                  ))}
                </section>
              </main>
            </>
          )}

          {/* Soundboard Modal Overlay */}
          {isSoundboardOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <SoundboardCard 
                isLightMode={isLightMode} 
                onClose={() => setIsSoundboardOpen(false)} 
              />
            </div>
          )}

          <FriendViewModal
            friend={selectedFriendId === 'me' ? {
              name: displayName,
              favs: favorites,
              times: playtimes,
              achievements: ['first_game', 'marathon', 'collector', 'loyal', 'styler'].filter(id => localStorage.getItem(`achievement_${id}`) === 'true')
            } : currentFriend}
            gamesData={gamesData}
            ownPfp={profilePic}
            isOwnProfile={selectedFriendId === 'me'}
            onClose={() => setSelectedFriendId(null)}
            myAchievements={achievements}
          />
          
          <SettingsModal 
            show={showSettings} 
            onClose={() => setShowSettings(false)}
            tracklist={tracklist} 
            performanceMode={performanceMode}
            setPerformanceMode={(val) => { 
              setPerformanceMode(val); 
              localStorage.setItem('capy-perf-mode', val);
            }}
            onViewOwnProfile={() => {
              setShowSettings(false);
              setSelectedFriendId('me');
            }}
            themes={THEMES}
            applyTheme={applyTheme}
            panicKey={panicKey}
            setPanicKey={(val) => { setPanicKey(val); localStorage.setItem('capy-panic-key', val); }}
            panicUrl={panicUrl}
            setPanicUrl={(val) => { setPanicUrl(val); localStorage.setItem('capy-panic-url', val); }}
            handleBackgroundUpload={handleBackgroundUpload}
            handleResetBackground={handleResetBackground}
            handleAudioUpload={handleAudioUpload}
            handleResetMusic={handleResetMusic}
            profilePic={profilePic}
            handlePfpUpload={handlePfpUpload}
            handleResetPfp={() => { setProfilePic(''); localStorage.removeItem('capy-pfp'); }}
            handleClearSettings={handleClearSettings}
            handleReset={handleReset}
            confirmReset={confirmReset}
            confirmClearSettings={confirmClearSettings}
            bgMusic={bgMusic}
            bgEnabled={bgEnabled}
            volume={volume}
            setVolume={setVolume}
            bgOpacity={bgOpacity}
            setBgOpacity={setBgOpacity}
            displayName={displayName}
            setDisplayName={(val) => {
              const nameExists = friends.some(f => f.name.toLowerCase() === val.trim().toLowerCase());
              if (nameExists) {
                alert("Name is already taken by a friend!");
                return;
              }
              setDisplayName(val);
              localStorage.setItem('capy-display-name', val);
            }}
            friendCode={friendCode}
            fullSyncCode={fullSyncCode}
            onImportSync={(code) => {
              const decoded = safeDecode(code);
              if (decoded && decoded.n) {
                setDisplayName(decoded.n);
                localStorage.setItem('capy-display-name', decoded.n);
                if (decoded.p) {
                  setProfilePic(decoded.p);
                  localStorage.setItem('capy-pfp', decoded.p);
                }
                if (decoded.t) {
                  setTheme(decoded.t);
                  localStorage.setItem('capy-theme', decoded.t);
                }
                if (decoded.g) {
                  setGlowIntensity(decoded.g);
                  localStorage.setItem('capy-glow', decoded.g);
                }
                setNotification("Profile synced successfully");
                setTimeout(() => window.location.reload(), 1000);
              } else {
                alert("Invalid Sync Code!");
              }
            }}
            friends={friends}
            isSyncing={isSyncing}
            disguise={disguise}
            setDisguise={(val) => { setDisguise(val); localStorage.setItem('capy-stealth-type', val); }}
            customTitle={customTitle}
            setCustomTitle={(val) => { setCustomTitle(val); localStorage.setItem('capy-custom-title', val); }}
            customIcon={customIcon}
            setCustomIcon={(val) => { setCustomIcon(val); localStorage.setItem('capy-custom-icon', val); }}
            isLightMode={isLightMode}
            setIsLightMode={setIsLightMode}
            onAddFriend={(code) => {
              const decodedData = safeDecode(code);
              if (decodedData && decodedData.id) {
                const { n: name, id: friendId } = decodedData;
                if (name.toLowerCase() === displayName.toLowerCase()) {
                  alert("You cannot add yourself!");
                  return;
                }
                const otherFriends = friends.filter(f => {
                  const existingData = safeDecode(f.code);
                  return existingData?.id !== friendId;
                });
                const updatedFriends = [...otherFriends, { name, code: code.trim() }];
                setFriends(updatedFriends);
                localStorage.setItem('capy-friends', JSON.stringify(updatedFriends));
                setNotification(`Added ${name}`);
              } else {
                alert("Invalid Friend Code!");
              }
            }}
            onRemoveFriend={(code) => {
              const newFriends = friends.filter(f => f.code !== code);
              setFriends(newFriends);
              localStorage.setItem('capy-friends', JSON.stringify(newFriends));
            }}
            onViewFriend={(friend) => {
              setSelectedFriendId(null);
              setTimeout(() => setSelectedFriendId(friend.code), 10);
            }}
            onRefreshFriend={(code) => {
                setIsSyncing(true);
                const freshFriends = [...friends];
                setFriends(freshFriends);
                if (selectedFriendId === code) {
                    setSelectedFriendId(null);
                    setTimeout(() => setSelectedFriendId(code), 50);
                }
                setTimeout(() => {
                  setIsSyncing(false);
                  setNotification("Friend view refreshed");
                }, 500);
            }}
            myAchievements={achievements}
            activeCloak={activeCloak}
            setActiveCloak={setActiveCloak}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
          />

          <footer className="mt-12 py-6 text-center text-xs text-zinc-500 border-t border-zinc-800/40">
            <p>&copy; 2026 Capybara Science. All rights reserved.</p>
          </footer>
        </>
      )}
    </div>
  );
}
