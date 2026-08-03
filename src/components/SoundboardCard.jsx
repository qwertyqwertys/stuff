import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Upload, Music, X } from 'lucide-react';
import { supabase } from '../supabase'; 

export function SoundboardCard({ isLightMode, onClose }) {
  const [sounds, setSounds] = useState([
    { id: 'airhorn', name: 'Airhorn 🚨', data: 'https://www.myinstants.com/media/sounds/mlg-airhorn.mp3' },
    { id: 'boom', name: 'Vine Boom 💥', data: 'https://www.myinstants.com/media/sounds/vine-boom.mp3' }
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const audioRefs = useRef({});

  useEffect(() => {
    fetchGlobalSounds();
  }, []);

  const fetchGlobalSounds = async () => {
    const { data, error } = await supabase.from('community_sounds').select('*');
    if (data && !error) {
      setSounds(prev => {
        const defaults = prev.slice(0, 2);
        const cloudSounds = data.map(item => ({
          id: item.id,
          name: item.name,
          data: item.file_url
        }));
        return [...defaults, ...cloudSounds];
      });
    }
  };

  const handleUploadSound = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024 * 2) {
      alert("File too large! Please use an MP3 under 2MB.");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('sounds')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('sounds')
        .getPublicUrl(fileName);

      const fileUrl = publicUrlData.publicUrl;
      const soundName = file.name.replace(/\.[^/.]+$/, "");

      const { error: dbError } = await supabase
        .from('community_sounds')
        .insert([{ name: soundName, file_url: fileUrl }]);

      if (dbError) throw dbError;

      fetchGlobalSounds();
    } catch (err) {
      console.error("Error uploading sound:", err);
      alert("Failed to upload sound to Supabase.");
    } finally {
      setIsUploading(false);
    }
  };

  const playSound = (id) => {
    if (audioRefs.current[id]) {
      audioRefs.current[id].currentTime = 0;
      audioRefs.current[id].play().catch(err => console.log("Playback error:", err));
    }
  };

  return (
    <div className={`w-full max-w-2xl p-6 rounded-3xl border shadow-2xl flex flex-col gap-6 ${isLightMode ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-zinc-900 border-white/10 text-zinc-100'}`}>
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[var(--theme)]/10 rounded-2xl text-[var(--theme)]">
            <Volume2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight">Global Soundboard</h2>
            <p className="text-xs text-zinc-500">Community shared MP3 sound effects</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed border-[var(--theme)]/30 hover:border-[var(--theme)] rounded-2xl bg-[var(--theme)]/5 cursor-pointer transition-all group ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
        <Upload className="w-8 h-8 text-[var(--theme)] mb-2 group-hover:scale-110 transition-transform" />
        <span className="text-xs font-black uppercase tracking-wider">{isUploading ? 'Uploading to Cloud...' : 'Upload Public MP3'}</span>
        <span className="text-[10px] text-zinc-500 mt-1">Everyone on the site can use it</span>
        <input type="file" accept="audio/mp3, audio/*" onChange={handleUploadSound} className="hidden" disabled={isUploading} />
      </label>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto pr-1">
        {sounds.map(sound => (
          <div key={sound.id} className="relative group">
            <audio ref={el => audioRefs.current[sound.id] = el} src={sound.data} preload="auto" />
            <button
              onClick={() => playSound(sound.id)}
              className={`w-full p-4 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all hover:scale-[1.02] active:scale-95 ${
                isLightMode 
                  ? 'bg-zinc-50 border-zinc-200 hover:border-[var(--theme)]' 
                  : 'bg-white/5 border-white/10 hover:border-[var(--theme)]'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <Music className="w-4 h-4 text-[var(--theme)]" />
              </div>
              <span className="text-xs font-bold truncate w-full" title={sound.name}>{sound.name}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
