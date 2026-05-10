import React, { useState, useEffect } from 'react';
import { Send, UserPlus, RefreshCcw } from 'lucide-react'; 
import { supabase } from '../supabaseClient';

// Generates a secret ID for your browser so the database knows it's you
const getPersistentId = () => {
  let id = localStorage.getItem('capy-uid');
  if (!id) {
    id = 'user_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('capy-uid', id);
  }
  return id;
};

export function ChatCard({ isLightMode }) {
  const [username, setUsername] = useState(localStorage.getItem('capy-username') || '');
  const [isJoined, setIsJoined] = useState(!!username);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const myId = getPersistentId();

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);
      if (data) setMessages(data);
    };

    fetchMessages();

    // Listen for inserts AND updates (so names change live!)
    const channel = supabase
      .channel('realtime-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, 
        () => fetchMessages() 
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const handleJoinOrUpdate = async (e) => {
    e.preventDefault();
    const newName = e.target.username?.value.trim() || username;
    if (!newName) return;

    // This is the magic part: it finds every message with your ID and renames them
    await supabase
      .from('messages')
      .update({ username: newName })
      .eq('user_id', myId);

    localStorage.setItem('capy-username', newName);
    setUsername(newName);
    setIsJoined(true);
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    await supabase
      .from('messages')
      .insert([{ username, content: text, user_id: myId }]);
    setText('');
  };

  return (
    <div className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
      isLightMode ? 'bg-white border-black/5 shadow-sm' : 'bg-[#0f0f11] border-white/5 hover:border-[var(--theme)]/50'
    } p-5 h-full flex flex-col gap-4`}>
      
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--theme)]">
          Chat
        </h3>
        {isJoined && (
          <button 
            onClick={() => setIsJoined(false)} 
            className="text-zinc-500 hover:text-[var(--theme)] p-1 hover:bg-white/5 rounded-md transition-all"
            title="Change Identity"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {!isJoined ? (
        <form onSubmit={handleJoinOrUpdate} className="flex flex-col gap-3 my-auto">
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-zinc-500">Change Name</p>
            <input 
              name="username"
              type="text"
              defaultValue={username}
              placeholder="Enter Custom Handle..."
              className={`w-full text-xs p-3 rounded-xl border outline-none transition-all ${
                isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10 focus:border-[var(--theme)]'
              }`}
            />
          </div>
          <button className="w-full py-3 bg-[var(--theme)] text-black font-bold text-[10px] rounded-xl hover:scale-[1.02] active:scale-95 transition-all">
            {username ? "Update Name" : "AUTHORIZE ACCESS"}
          </button>
        </form>
      ) : (
        <div className="flex flex-col h-full gap-3">
          <div className={`flex-1 overflow-y-auto rounded-xl p-3 text-[10px] font-mono ${isLightMode ? 'bg-black/5' : 'bg-black/40'}`}>
            {messages.length === 0 ? (
              <div className="text-zinc-500 italic opacity-50">Waiting for Messages</div>
            ) : (
              messages.map((m, i) => (
                <div key={m.id || i} className="mb-1 text-left">
                  <span className="text-[var(--theme)] font-bold">{m.username}:</span> 
                  <span className={isLightMode ? 'text-black' : 'text-zinc-300'}> {m.content}</span>
                </div>
              ))
            )}
          </div>
          
          <div className="relative">
            <input 
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Message..."
              className={`w-full text-[10px] p-2 pr-8 rounded-lg border outline-none ${
                isLightMode ? 'bg-black/5' : 'bg-white/5 border-white/10 focus:border-[var(--theme)]'
              }`}
            />
            <Send 
              onClick={handleSend}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--theme)] cursor-pointer" 
            />
          </div>
        </div>
      )}
    </div>
  );
}
