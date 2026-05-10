import React, { useState, useMemo, useEffect, useRef } from 'react';
import gamesData from './games.json';
import { useAchievements } from './hooks/useAchievements.js';
import { 
  Search, Gamepad2, Play, Settings, X, ShieldAlert, 
  Clock, Dices, RotateCcw, Palette, Type, ImageIcon, 
  Link as LinkIcon, Upload, Battery, Calendar, Heart, Trash2, Ghost, Zap, Video, Music, Volume2, Power,
  Cpu, Users, UserPlus, UserCircle, CheckCircle2, History, ChevronLeft, ChevronRight
} from 'lucide-react';

import gamesDataRaw from './games.json';
import gnMathDataRaw from './gn-math-games.json';
import { GameCard } from './components/GameCard';
import { SettingsModal } from './components/SettingsModal';
import { Header } from './components/Header';
import { FriendViewModal } from './components/FriendViewModal';
import { tracklist } from './components/tracklist'; 
import { ChatCard } from './components/ChatCard';
import { applyCloak } from './utils';

// --- CONSTANTS & CONFIGS ---

// 1. Define the Google Icon URL once
const GOOGLE_FAVICON = "https://www.gstatic.com/images/branding/searchlogo/ico/favicon.ico";

// 2. Set the Defaults using that URL
const DEFAULT_TITLE = "Google"; 
const DEFAULT_ICON = GOOGLE_FAVICON; // This makes the site load as Google immediately
const DEFAULT_COLOR = '#10A5F5';
const DEFAULT_GLOW = 50;

// 3. Keep your Capy Logo for the UI/Achievements
const CAPY_LOGO = "https://img.icons8.com/color/32/capybara.png";

// --- ACHIEVEMENT DEFINITIONS ---
const TROPHIES = [
  { id: 'first_game', name: 'First Blood', desc: 'Play your first game', icon: '🎯' },
  { id: 'marathon', name: 'Marathoner', desc: 'Play for over 1 hour total', icon: '🏃' },
  { id: 'collector', name: 'The Collector', desc: 'Favorite 10 different games', icon: '⭐' },
  { id: 'loyal', name: 'Capy-Loyalist', desc: 'Play one game for 30 mins', icon: '👑' },
  { id: 'styler', name: 'Fashionista', desc: 'Change your theme 5 times', icon: '🎨' }
];

const THEMES = {
  cyber: { name: 'Cyberpunk', color: '#ff0055', glow: 60 },
  midnight: { name: 'Midnight', color: '#7c3aed', glow: 40 },
  forest: { name: 'Forest', color: '#10b981', glow: 30 },
  classic: { name: 'Classic', color: DEFAULT_COLOR, glow: DEFAULT_GLOW }
};

// --- DISGUISE CONFIG ---
const DISGUISE_CONFIG = {
  none: { 
    title: DEFAULT_TITLE, 
    icon: DEFAULT_ICON 
  },
  google: { 
    title: "Google", 
    icon: GOOGLE_FAVICON 
  },
  drive: { 
    title: "My Drive - Google Drive", 
    icon: "https://ssl.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png" 
  },
  classroom: { 
    title: "Home - Classroom", 
    icon: "https://ssl.gstatic.com/classroom/favicon.png" 
  },
  powerschool: { 
    title: "Grades and Attendance", 
    icon: "https://ps.bhmsd.org/favicon.ico" 
  }
};

const updateThemeVariables = (color, glow) => {
  const root = document.documentElement;
  root.style.setProperty('--theme', color);
  root.style.setProperty('--glow', `${glow}px`);
};

export default function App() {
  const [supplier, setSupplier] = useState(() => localStorage.getItem('capy-supplier') || 'Default');
  const [playtimes, setPlaytimes] = useState(() => JSON.parse(localStorage.getItem('capy-playtimes') || '{}'));
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('capy-favs') || '[]'));
  const [themeChangeCount] = useState(() => parseInt(localStorage.getItem('capy-theme-changes') || '0'));
  const [isChatOpen, setIsChatOpen] = useState(false);

 
  
  const userData = { playtimes: playtimes, favorites: favorites, themeChangeCount: themeChangeCount };

  const [achievements, setAchievements] = useState([]);

  // 1. The "Brain" - remembers which specific disguise you picked
const [activeCloak, setActiveCloak] = useState(() => localStorage.getItem('capy-cloak-type') || 'google');

// 2. The "Action" - updates the tab whenever activeCloak changes
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
  const [battery, setBattery] = useState({ level: 100, charging: false });

  const [theme, setTheme] = useState(() => localStorage.getItem('capy-theme') || DEFAULT_COLOR);
  const [glowIntensity, setGlowIntensity] = useState(() => Number(localStorage.getItem('capy-glow')) || DEFAULT_GLOW);
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
      const recentKey = `capy-recent-${supplier || 'Default'}`;
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
  // 1. Check for supplier-specific link (e.g., /stores/gn-math/date.html)
  if (currentSupplier !== 'Default' && game.urls && game.urls[currentSupplier]) {
    return game.urls[currentSupplier];
  }
  
  // 2. Fallback to the main URL or a default file path
  // If it's a standard link, it uses game.url. 
  // If nothing is found, it looks for the ID.html in /stores/
  return game.url || `/stores/${game.id}.html`;
};

 const launchContent = (item) => {
    const finalUrl = getLaunchUrl(item, supplier); 
    if (!finalUrl) return;

    // --- UPDATE THIS SECTION ---
    // This creates a unique history key like "capy-recent-GN Math"
    const recentKey = `capy-recent-${supplier}`; 
    
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(id => id !== item.id);
      const updated = [item.id, ...filtered].slice(0, 4);
      
      // Save it to the specific supplier bucket
      localStorage.setItem(recentKey, JSON.stringify(updated));
      return updated;
    });

  const startTime = Date.now();
  const win = window.open('about:blank', '_blank');

  if (win) {
    win.document.title = "DO NOT REFRESH";
    win.document.body.style = 'margin:0;padding:0;overflow:hidden;background:#000;';
    
    const iframe = win.document.createElement('iframe');
    iframe.src = finalUrl; 
    iframe.style = 'width:100vw;height:100vh;border:none;display:block;';
    iframe.allow = "fullscreen";
   // ... inside launchContent ...
    win.document.body.appendChild(iframe);
    
    const checkInterval = setInterval(() => {
      if (win.closed) {
        clearInterval(checkInterval);
        const duration = Math.floor((Date.now() - startTime) / 1000 / 60);
        if (duration > 0) {
          setPlaytimes(prev => {
            const updated = { ...prev, [item.id]: (prev[item.id] || 0) + duration };
            localStorage.setItem('capy-playtimes', JSON.stringify(updated));
            return updated;
          });
        }
      }
    }, 1000);
  } 
};
  // --- EMERGENCY BLACKOUT KILL SWITCH ---
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

  const validFavoritesCount = useMemo(() => gamesData.filter(g => favorites.includes(g.id)).length, [gamesData, favorites]);

 const categoriesWithCounts = useMemo(() => {
  const uniqueCats = [...new Set(gamesData.map(g => g?.category).filter(Boolean))];
  const final = [{ name: 'All', count: gamesData.length }];
  
  // FIX 1: Change 'validFavoritesCount' to 'favorites.length'
  if (favorites.length > 0) {
    // FIX 2: Change the count here too
    final.push({ name: 'Favorites', count: favorites.length });
  }
  
  uniqueCats.forEach(cat => {
    final.push({ name: cat, count: gamesData.filter(g => g.category === cat).length });
  });
  
  return final;
// FIX 3: Make sure 'favorites' is in this array so it updates live
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
      a: achievements // Sync achievements to friends
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
    const savedTheme = localStorage.getItem('capy-theme') || DEFAULT_COLOR;
    document.documentElement.style.setProperty('--theme', savedTheme);
  }, []);

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

      if (performanceMode) {
        audioRef.current.pause();
      } else if (bgMusic) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [volume, performanceMode, bgMusic]);

  useEffect(() => {
    if (audioRef.current && bgMusic) {
      audioRef.current.pause();
      audioRef.current.load();
      
      if (!performanceMode) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => console.log("Song loaded and playing!"))
            .catch((err) => console.log("Autoplay check:", err));
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
      if (audioRef.current && bgMusic && !performanceMode) {
        audioRef.current.play().catch(() => {});
      }
    };

    window.addEventListener('click', startMusic, { once: true });
    return () => window.removeEventListener('click', startMusic);
  }, [bgMusic, performanceMode]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (audioRef.current && bgMusic) {
        if (document.hidden || performanceMode) {
          audioRef.current.pause();
        } else {
          audioRef.current.play().catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [bgMusic, performanceMode]);

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

  // --- NEW: STARTUP SYNC ---
// This ensures your 0/5 becomes 1/5 as soon as the site loads
useEffect(() => {
  const ids = ['first_game', 'marathon', 'collector', 'capy_loyalist', 'fashionista'];
  const alreadyEarned = ids.filter(id => localStorage.getItem(`achievement_${id}`) === 'true');
  
  if (alreadyEarned.length > 0 && typeof setAchievements === 'function') {
    setAchievements(alreadyEarned);
  }
}, []); // Runs once on refresh
  
 // --- 1. FIXED ACHIEVEMENT TRACKING ---
  // Added a check to make sure setAchievements exists before calling it
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
        setNotification("🎯 Achievement Unlocked: First Blood!");
      }
    }

    const totalTime = Object.values(playtimes || {}).reduce((a, b) => a + b, 0);
    if (totalTime >= 3600 && !localStorage.getItem('achievement_marathon')) {
      localStorage.setItem('achievement_marathon', 'true');
      checkAndAdd('marathon');
      setNotification("🏃 Achievement Unlocked: Marathoner!");
    }

    // --- FIXED SYNC LOGIC ---
    // 1. Update if we JUST earned a new trophy (triggers the popup)
    // 2. Update if the list we found doesn't match the current state (fixes 0/5 on refresh)
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
      localStorage.setItem('capy-bg-music', e.presetUrl);
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
          localStorage.setItem('capy-bg-music', audioData);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleResetMusic = () => {
    setBgMusic('');
    setBgEnabled(false); 
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
        alert("File too large! Please use a GIF under 500KB so the site doesn't lag.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result);
        localStorage.setItem('capy-pfp', reader.result);
        setNotification("Profile Picture Updated!");
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

    // Track for Achievement
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
      setNotification("Warning: This will delete ALL customization, favorites, friends, and stats!");
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
      setNotification("Warning: This will reset all your settings to default!");
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
    
    // 1. Pick the correct data source
    let sourceData = gamesDataRaw || []; 
    if (supplier === 'GN Math') {
      sourceData = gnMathDataRaw || [];
    } else if (supplier === 'Truffled') {
      sourceData = []; // <--- THIS MAKES THE GRID EMPTY FOR TRUFFLED
    }

    return sourceData.filter(g => {
      // 2. Search Match
      const matchesSearch = g?.title?.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      // 3. Supplier Logic
      if (supplier === 'GN Math') {
        return true; 
      } else if (supplier === 'Truffled') {
        return true; // (Will return nothing anyway since sourceData is empty)
      } else {
        // In Default mode, hide games that are explicitly marked for other suppliers
        const isSpecial = g.urls?.['GN Math'] || g.urls?.['GN-MATH'] || g.urls?.['Truffled'];
        if (isSpecial) return false;
      }

      // 4. Category / Favorites Match
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

  // 🔄 The "History Switcher" Fix
  useEffect(() => {
    // 1. Wipe the screen immediately so old games from other suppliers don't "ghost"
    setRecentlyPlayed([]); 

    // 2. Load the specific folder for the current dropdown selection
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
  }, [supplier]); // This runs every time you change the dropdown
  
  return (
    <div
      className={`min-h-screen pb-20 antialiased relative ${performanceMode ? '' : 'transition-all'} ${isLightMode ? 'light-mode bg-white text-zinc-900' : 'bg-[#0a0a0a] text-zinc-100'}`} 
      style={{ 
        '--theme': theme, 
        '--glow': `${performanceMode ? 0 : glowIntensity}px`,
        backgroundColor: isLightMode ? '#ffffff' : '#0a0a0a' 
      }}
    >
      
      {notification && (
        <div className="fixed bottom-40 left-1/2 -translate-x-1/2 z-[300] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-zinc-900 border border-[var(--theme)]/50 px-6 py-3 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-[var(--theme)]" />
            <span className="text-xs font-black uppercase tracking-tight">{notification}</span>
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
          autoPlay 
          onLoadedData={(e) => {
            e.target.volume = volume; 
          }}
        />
      )}

      {/* --- CHAT FULL SCREEN LOGIC START --- */}
      {isChatOpen ? (
        <div className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex flex-col p-4 animate-in fade-in duration-300">
          {/* THE X BUTTON AT TOP RIGHT */}
          <button 
            onClick={() => setIsChatOpen(false)}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full z-[10000] transition-transform active:scale-95 text-white"
          >
            <X className="w-8 h-8" />
          </button>

          {/* CHAT CONTENT */}
          <div className="flex-1 w-full max-w-5xl mx-auto flex items-center justify-center">
            <div className="w-full h-[85vh]">
               <ChatCard isLightMode={isLightMode} setIsChatOpen={setIsChatOpen} />
            </div>
          </div>
        </div>
      ) : (
        /* --- EVERYTHING INSIDE HERE IS THE NORMAL SITE --- */
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
  DEFAULT_ICON={CAPY_LOGO}
  theme={theme}   
  onViewProfile={() => setSelectedFriendId('me')} 
  onRandomGame={() => {
    // Now it pulls from filteredGames so it respects your GN-MATH selection!
    const playable = (filteredGames || []).filter(g => !['request', 'report'].includes(g?.id));
    if (playable.length > 0) {
      launchContent(playable[Math.floor(Math.random() * playable.length)]);
    }
  }}
  isChatOpen={isChatOpen}
  setIsChatOpen={setIsChatOpen}
/>
          <div className={`${isLightMode ? 'bg-white' : 'bg-[#09090b]/90'} backdrop-blur-md px-4 pt-1.5 overflow-hidden sticky top-16 z-40 transition-colors group`}>
            <div className="max-w-7xl mx-auto relative flex items-center">
              {canScrollLeft && (
                <div className={`absolute left-0 z-50 flex items-center pr-12 h-full bg-gradient-to-r ${isLightMode ? 'from-white via-white/80' : 'from-[#09090b] via-[#09090b]/80'} to-transparent pointer-events-none`}>
                  <button 
                    onClick={() => scrollCategories('left')}
                    className="p-1.5 bg-[var(--theme)] rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 border border-white/20 pointer-events-auto"
                  >
                    <ChevronLeft className="w-4 h-4 text-black" />
                  </button>
                </div>
              )}

              <div 
                ref={categoryScrollRef}
                onScroll={checkScroll}
                className="flex gap-2 overflow-x-auto pb-4 no-scrollbar scroll-smooth px-2 w-full"
              >
                {categoriesWithCounts.map(cat => (
                  <button 
                    key={cat.name} 
                    onClick={() => setActiveCategory(cat.name)} 
                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase border shrink-0 transition-all ${
                      activeCategory === cat.name 
                        ? 'bg-[var(--theme)] border-[var(--theme)] text-black' 
                        : isLightMode 
                          ? 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200' 
                          : 'bg-white/5 border-white/10 text-zinc-500 hover:bg-white/10'
                    }`}
                  >
                    {cat.name} <span className="opacity-40 ml-1">{cat.count}</span>
                  </button>
                ))}
              </div>

              {canScrollRight && (
                <div className={`absolute -right-9 z-50 flex items-center pl-12 h-full bg-gradient-to-l ${isLightMode ? 'from-white via-white/80' : 'from-[#09090b] via-[#09090b]/80'} to-transparent pointer-events-none`}>
                  <button 
                    onClick={() => scrollCategories('right')}
                    className="p-1.5 bg-[var(--theme)] rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 border border-white/20 pointer-events-auto"
                  >
                    <ChevronRight className="w-4 h-4 text-black" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <main className="max-w-7xl mx-auto px-4 mt-8 space-y-12">
            {recentGamesData.length > 0 && activeCategory === 'All' && !searchQuery && (
              <section className="space-y-4">
                <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  <History className="w-3 h-3 text-[var(--theme)]" />
                  Recently On
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
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

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
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
      {/* --- CHAT LOGIC END --- */}

      <FriendViewModal 
        friend={selectedFriendId === 'me' 
          ? { 
              name: displayName, 
              favs: favorites, 
              times: playtimes,
              // IDs matched to FriendViewModal.jsx (loyal and styler)
              achievements: ['first_game', 'marathon', 'collector', 'loyal', 'styler'].filter(id => localStorage.getItem(`achievement_${id}`) === 'true')
            } 
          : currentFriend
        } 
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
      alert("Name is already taken by a friend! Please choose a unique name.");
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
      setNotification("Profile Synced Successfully!");
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
      setNotification(`Added ${name}!`);
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
        setNotification("Friend view refreshed!");
      }, 500);
  }}
  myAchievements={achievements}
  activeCloak={activeCloak}
  setActiveCloak={setActiveCloak}
/>

<footer style={{ 
  padding: '20px', 
  textAlign: 'center', 
  color: '#666', 
  fontSize: '14px',
  borderTop: 'none',
  marginTop: '40px'
}}>
  <p>&copy; 2026 Capybara Science. All rights reserved.</p>
</footer>
</div>
);
}
