import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Volume2, X, Upload, Trash2, Play, Loader2, Pencil, Check } from 'lucide-react';

// Initialize Supabase client
const supabaseUrl = 'https://nilgxfmcwljqhawdrsot.supabase.co';
const supabaseKey = 'sb_publishable_K4ZLk0KkXTe8upyl7KoTcg_wD31DQ4U';
const supabase = createClient(supabaseUrl, supabaseKey);

export function SoundboardCard({ isLightMode, onClose }) {
  const [sounds, setSounds] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [soundName, setSoundName] = useState('');
  const [user, setUser] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [activeSound, setActiveSound] = useState(null);
  const [activeTab, setActiveTab] = useState('library'); // 'library' or 'upload'

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editedName, setEditedName] = useState('');

  useEffect(() => {
    fetchUserAndSounds();
  }, []);

  const fetchUserAndSounds = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const { data, error } = await supabase
        .from('community_sounds')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSounds(data || []);
    } catch (error) {
      console.error('Error fetching sounds:', error.message);
      setErrorMsg('Failed to load soundboard sounds.');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !soundName.trim()) {
      setErrorMsg('Please select an audio file and enter a sound name.');
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

      // 1. Upload audio file to Supabase Storage bucket 'sounds'
      const { error: uploadError } = await supabase.storage
        .from('sounds')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. Retrieve public URL from 'sounds' bucket
      const { data: publicUrlData } = supabase.storage
        .from('sounds')
        .getPublicUrl(fileName);

      const audioUrl = publicUrlData.publicUrl;

      // 3. Insert record into community_sounds table with strict user_id linkage
      const { error: dbError } = await supabase
        .from('community_sounds')
        .insert([
          {
            name: soundName.trim(),
            file_url: audioUrl,
            user_id: user ? user.id : null,
          },
        ]);

      if (dbError) throw dbError;

      setSuccessMsg('Sound uploaded successfully!');
      setFile(null);
      setSoundName('');
      setActiveTab('library');
      fetchUserAndSounds();
    } catch (error) {
      console.error('Upload error:', error.message);
      setErrorMsg(`Error uploading sound: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateName = async (sound) => {
    if (!editedName.trim()) {
      setErrorMsg('Sound name cannot be empty.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase
        .from('community_sounds')
        .update({ name: editedName.trim() })
        .eq('id', sound.id);

      if (error) throw error;

      setSuccessMsg('Sound name updated successfully!');
      setEditingId(null);
      setEditedName('');
      fetchUserAndSounds();
    } catch (error) {
      console.error('Update error:', error.message);
      setErrorMsg(`Error updating sound name: ${error.message}`);
    }
  };

  const playSound = (id, url) => {
    setActiveSound(id);
    try {
      const audio = new Audio(url);
      audio.play().catch((err) => console.error('Playback error:', err));
    } catch (error) {
      console.error('Error playing audio:', error);
    }
    setTimeout(() => setActiveSound(null), 300);
  };

  const handleDelete = async (sound) => {
    if (!window.confirm('Are you sure you want to delete this sound for everyone?')) return;

    setErrorMsg(null);
    try {
      const fileName = sound.file_url.split('/').pop();

      // 1. Delete file from 'sounds' storage bucket
      const { error: storageError } = await supabase.storage
        .from('sounds')
        .remove([fileName]);

      if (storageError) throw storageError;

      // 2. Delete record from database table
      const { error: dbError } = await supabase
        .from('community_sounds')
        .delete()
        .eq('id', sound.id);

      if (dbError) throw dbError;

      setSuccessMsg('Sound deleted successfully.');
      fetchUserAndSounds();
    } catch (error) {
      console.error('Delete error:', error.message);
      setErrorMsg(`Error deleting sound: ${error.message}`);
    }
  };

  return (
    <div className={`w-full max-w-xl p-6 rounded-3xl border shadow-2xl backdrop-blur-xl flex flex-col max-h-[85vh] ${isLightMode ? 'bg-white/95 border-zinc-200 text-zinc-900' : 'bg-zinc-900/95 border-white/10 text-zinc-100'}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-[var(--theme)]" />
          <h2 className="text-lg font-black tracking-tight">Community Soundboard</h2>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('library')}
          className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
            activeTab === 'library'
              ? 'bg-[var(--theme)] text-black border-[var(--theme)]'
              : isLightMode ? 'bg-zinc-100 border-zinc-200 text-zinc-600' : 'bg-white/5 border-white/10 text-zinc-400'
          }`}
        >
          Library ({sounds.length})
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
            activeTab === 'upload'
              ? 'bg-[var(--theme)] text-black border-[var(--theme)]'
              : isLightMode ? 'bg-zinc-100 border-zinc-200 text-zinc-600' : 'bg-white/5 border-white/10 text-zinc-400'
          }`}
        >
          Upload Sound
        </button>
      </div>

      {/* Feedback Notifications */}
      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
          {successMsg}
        </div>
      )}

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto pr-1">
        {activeTab === 'upload' ? (
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-2 opacity-70">Sound Name</label>
              <input
                type="text"
                placeholder="e.g. Epic Win, Airhorn..."
                value={soundName}
                onChange={(e) => setSoundName(e.target.value)}
                className={`w-full p-3 rounded-xl border text-xs font-bold outline-none transition-all ${
                  isLightMode 
                    ? 'bg-zinc-100 border-zinc-200 focus:border-[var(--theme)] text-zinc-900' 
                    : 'bg-white/5 border-white/10 focus:border-[var(--theme)] text-white'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-2 opacity-70">Audio File (MP3)</label>
              <input
                type="file"
                accept="audio/mp3,audio/*"
                onChange={(e) => setFile(e.target.files[0])}
                className={`w-full p-3 rounded-xl border text-xs file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-[var(--theme)] file:text-black cursor-pointer ${
                  isLightMode ? 'bg-zinc-100 border-zinc-200 text-zinc-700' : 'bg-white/5 border-white/10 text-zinc-300'
                }`}
              />
            </div>
            <button
              type="submit"
              disabled={uploading}
              className="w-full py-3 rounded-xl bg-[var(--theme)] text-black font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Uploading...' : 'Upload to Community'}
            </button>
          </form>
        ) : (
          <div>
            {sounds.length === 0 ? (
              <div className="text-center py-16 text-xs uppercase tracking-widest opacity-40">
                No sounds available yet. Upload one using the upload tab!
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {sounds.map((sound) => {
                  // Strict ownership check: Only true if the logged-in user matches the sound's user_id
                  const isOwner = user && sound.user_id === user.id;

                  return (
                    <div
                      key={sound.id}
                      className={`p-3 rounded-2xl border flex flex-col justify-between gap-3 transition-all ${
                        activeSound === sound.id 
                          ? 'border-[var(--theme)] bg-[var(--theme)]/10 scale-95 shadow-[0_0_15px_var(--theme)]' 
                          : isLightMode 
                            ? 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100' 
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {editingId === sound.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className={`w-full p-2 rounded-xl border text-xs font-bold outline-none ${
                              isLightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-black/40 border-white/20 text-white'
                            }`}
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleUpdateName(sound)}
                              className="flex-1 py-1 px-2 rounded-lg bg-emerald-500 text-black font-black text-[10px] uppercase flex items-center justify-center gap-1"
                            >
                              <Check className="w-3 h-3" /> Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className={`flex-1 py-1 px-2 rounded-lg font-black text-[10px] uppercase ${
                                isLightMode ? 'bg-zinc-200 text-zinc-700' : 'bg-white/10 text-zinc-300'
                              }`}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-black text-xs uppercase tracking-tight truncate flex-1" title={sound.name}>
                            {sound.name}
                          </span>
                          {isOwner && (
                            <button
                              onClick={() => {
                                setEditingId(sound.id);
                                setEditedName(sound.name);
                              }}
                              className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
                              title="Edit Name"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => playSound(sound.id, sound.file_url)}
                          className={`flex-1 py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1 transition-transform active:scale-95 ${
                            isLightMode ? 'bg-zinc-900 text-white' : 'bg-white text-black'
                          }`}
                        >
                          <Play className="w-3 h-3 fill-current" />
                          Play
                        </button>
                        {isOwner && (
                          <button
                            onClick={() => handleDelete(sound)}
                            className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                            title="Delete Sound for Everyone"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SoundboardCard;
