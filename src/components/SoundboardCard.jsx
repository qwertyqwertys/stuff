import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://nilgxfmcwljqhawdrsot.supabase.co';
const supabaseKey = 'sb_publishable_K4ZLk0KkXTe8upyl7KoTcg_wD31DQ4U';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function CustomSoundboard() {
  const [sounds, setSounds] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [soundName, setSoundName] = useState('');
  const [user, setUser] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

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
      setErrorMsg('Please select an MP3 file and enter a sound name.');
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `sounds/${fileName}`;

      // 1. Upload audio file to Supabase Storage bucket
      const { error: uploadError } = await supabase.storage
        .from('soundboard-bucket')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Retrieve public URL
      const { data: publicUrlData } = supabase.storage
        .from('soundboard-bucket')
        .getPublicUrl(filePath);

      const audioUrl = publicUrlData.publicUrl;

      // 3. Insert record into community_sounds table
      const { error: dbError } = await supabase
        .from('community_sounds')
        .insert([
          {
            name: soundName.trim(),
            file_url: audioUrl,
            file_path: filePath,
            user_id: user ? user.id : null,
          },
        ]);

      if (dbError) throw dbError;

      setSuccessMsg('Sound uploaded successfully!');
      setFile(null);
      setSoundName('');
      fetchUserAndSounds();
    } catch (error) {
      console.error('Upload error:', error.message);
      setErrorMsg(`Error uploading sound: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const playSound = (url) => {
    try {
      const audio = new Audio(url);
      audio.play().catch((err) => console.error('Playback error:', err));
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const handleDelete = async (id, filePath) => {
    if (!window.confirm('Are you sure you want to delete this sound?')) return;

    setErrorMsg(null);
    try {
      // 1. Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('soundboard-bucket')
        .remove([filePath]);

      if (storageError) throw storageError;

      // 2. Delete record from database
      const { error: dbError } = await supabase
        .from('community_sounds')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      setSuccessMsg('Sound deleted successfully.');
      fetchUserAndSounds();
    } catch (error) {
      console.error('Delete error:', error.message);
      setErrorMsg(`Error deleting sound: ${error.message}`);
    }
  };

  return (
    <div className="soundboard-container" style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Community Custom Soundboard</h2>

      {errorMsg && <div style={{ color: '#dc3545', marginBottom: '10px' }}>{errorMsg}</div>}
      {successMsg && <div style={{ color: '#28a745', marginBottom: '10px' }}>{successMsg}</div>}

      <form onSubmit={handleUpload} style={{ marginBottom: '20px', background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
        <h3>Upload New Sound</h3>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Sound Name"
            value={soundName}
            onChange={(e) => setSoundName(e.target.value)}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="file"
            accept="audio/mp3,audio/*"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </div>
        <button 
          type="submit" 
          disabled={uploading} 
          style={{ padding: '8px 16px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {uploading ? 'Uploading...' : 'Upload Sound'}
        </button>
      </form>

      <h3>Soundboard Library</h3>
      {sounds.length === 0 ? (
        <p>No sounds available yet. Upload one above!</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
          {sounds.map((sound) => (
            <div key={sound.id} style={{ border: '1px solid #ddd', padding: '12px', borderRadius: '6px', background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ margin: '0 0 10px 0', wordBreak: 'break-word' }}>{sound.name}</h4>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  onClick={() => playSound(sound.file_url)}
                  style={{ flex: 1, padding: '6px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Play
                </button>
                {user && sound.user_id === user.id && (
                  <button
                    onClick={() => handleDelete(sound.id, sound.file_path)}
                    style={{ padding: '6px 10px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    X
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
