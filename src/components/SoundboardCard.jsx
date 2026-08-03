import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Adjust your supabase import path if needed

export function Soundboard({ onClose, isLightMode }) {
  const [sounds, setSounds] = useState([]);
  const [soundName, setSoundName] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchUserAndSounds();
  }, []);

  const fetchUserAndSounds = async () => {
    // 1. Get current logged-in user
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    // 2. Fetch sounds from Supabase
    const { data, error } = await supabase
      .from('community_sounds')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sounds:', error);
    } else {
      setSounds(data || []);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!audioFile || !soundName.trim()) {
      alert("Please provide a name and select an audio file.");
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Upload file to Supabase Storage bucket ('sounds')
      const fileExt = audioFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('sounds')
        .upload(filePath, audioFile);

      if (uploadError) throw uploadError;

      // Get public URL of the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from('sounds')
        .getPublicUrl(filePath);

      // Insert record into database with user_id
      const { error: dbError } = await supabase
        .from('community_sounds')
        .insert([
          { 
            name: soundName.trim(), 
            file_url: publicUrlData.publicUrl,
            user_id: user ? user.id : null 
          }
        ]);

      if (dbError) throw dbError;

      setSoundName('');
      setAudioFile(null);
      fetchUserAndSounds();
      alert("Sound uploaded successfully!");
    } catch (error) {
      alert("Error uploading sound: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRename = async (soundId, currentName) => {
    const newName = prompt("Enter a new name for your sound:", currentName);
    if (!newName || newName.trim() === "") return;

    const { error } = await supabase
      .from('community_sounds')
      .update({ name: newName.trim() })
      .eq('id', soundId);

    if (error) {
      alert("Error renaming sound: " + error.message);
    } else {
      fetchUserAndSounds();
    }
  };

  const handleDelete = async (soundId, fileUrl) => {
    if (!confirm("Are you sure you want to delete this sound?")) return;

    // Extract file path from URL to delete from storage bucket
    const path = fileUrl.split('/storage/v1/object/public/sounds/')[1];

    if (path) {
      await supabase.storage.from('sounds').remove([path]);
    }

    const { error } = await supabase
      .from('community_sounds')
      .delete()
      .eq('id', soundId);

    if (error) {
      alert("Error deleting sound: " + error.message);
    } else {
      fetchUserAndSounds();
    }
  };

  return (
    <div className={`p-6 max-w-4xl mx-auto ${isLightMode ? 'text-black' : 'text-white'}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Community Soundboard</h2>
        {onClose && (
          <button onClick={onClose} className="px-3 py-1 bg-zinc-700 text-white rounded-lg">Close</button>
        )}
      </div>

      {/* Upload Form */}
      <form onSubmit={handleUpload} className={`p-4 mb-8 rounded-xl border ${isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
        <h3 className="text-lg font-semibold mb-3">Upload a Sound</h3>
        <div className="flex flex-col gap-3">
          <input 
            type="text" 
            placeholder="Sound Name" 
            value={soundName} 
            onChange={(e) => setSoundName(e.target.value)}
            className={`p-2 rounded-lg border outline-none ${isLightMode ? 'bg-white border-black/20 text-black' : 'bg-black border-white/20 text-white'}`}
          />
          <input 
            type="file" 
            accept="audio/*" 
            onChange={(e) => setAudioFile(e.target.files[0])}
            className="text-sm"
          />
          <button 
            type="submit" 
            disabled={uploading}
            className="py-2 bg-[var(--theme)] text-black font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            {uploading ? "Uploading..." : "Upload Sound"}
          </button>
        </div>
      </form>

      {/* Sounds Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sounds.map((sound) => {
          const isOwner = currentUser && sound.user_id === currentUser.id;

          return (
            <div key={sound.id} className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
              <div>
                <h4 className="font-semibold text-lg">{sound.name}</h4>
              </div>

              <audio controls src={sound.file_url} className="w-full h-10"></audio>

              {/* Show edit/delete options ONLY if the current user owns the sound */}
              {isOwner && (
                <div className="flex gap-2 mt-2">
                  <button 
                    onClick={() => handleRename(sound.id, sound.name)}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Rename
                  </button>
                  <button 
                    onClick={() => handleDelete(sound.id, sound.file_url)}
                    className="px-3 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
