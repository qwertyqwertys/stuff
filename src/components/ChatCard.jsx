import React, { useState, useEffect } from 'react';
import { Send, UserPlus, RefreshCcw } from 'lucide-react'; 
import { supabase } from '../supabaseClient';
import { ChatPrivacyModal } from './ChatPrivacyModal';

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
  const [showPrivacy, setShowPrivacy] = useState(false);
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
            className="text-zinc-300 hover:text-[var(--theme)] p-1 hover:bg-white/5 rounded-md transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            title="Change Identity"
            aria-label="Change chat username"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {!isJoined ? (
        <form onSubmit={handleJoinOrUpdate} className="flex flex-col gap-3 my-auto">
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-zinc-300">Change Name</p>
            <input 
              name="username"
              type="text"
              defaultValue={username}
              placeholder="Enter Custom Handle..."
              className={`w-full text-xs p-3 rounded-xl border outline-none transition-all focus-visible:ring-2 focus-visible:ring-[var(--theme)] ${
                isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10 text-zinc-100 placeholder:text-zinc-400 focus:border-[var(--theme)]'
              }`}
            />
          </div>
          <button className="w-full py-3 bg-[var(--theme)] text-black font-bold text-[10px] rounded-xl hover:scale-[1.02] active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme)]">
            {username ? "Update Name" : "AUTHORIZE ACCESS"}
          </button>
        </form>
      ) : (
        <div className="flex flex-col h-full gap-3">
          <div className={`flex-1 overflow-y-auto rounded-xl p-3 text-[10px] font-mono ${isLightMode ? 'bg-black/5' : 'bg-black/45'}`}>
            {messages.length === 0 ? (
              <div className="text-zinc-300 italic">Waiting for Messages</div>
            ) : (
              messages.map((m, i) => (
                <div key={m.id || i} className="mb-1 text-left">
                  <span className="text-[var(--theme)] font-bold">{m.username}:</span> 
                  <span className={isLightMode ? 'text-black' : 'text-zinc-100'}> {m.content}</span>
                </div>
              ))
            )}
          </div>
          
          <div className="relative flex items-center">
            <input 
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Message..."
              className={`w-full text-[10px] p-2 pr-10 rounded-lg border outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme)] ${
                isLightMode ? 'bg-black/5' : 'bg-white/5 border-white/10 text-zinc-100 placeholder:text-zinc-400 focus:border-[var(--theme)]'
              }`}
            />
            <button
              type="button"
              onClick={handleSend}
              aria-label="Send message"
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/5 rounded-md transition-all cursor-pointer text-[var(--theme)] flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme)]"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      <div className="text-center mt-1">
        <button 
          type="button"
          onClick={() => setShowPrivacy(true)}
          className="text-[9px] text-zinc-300 hover:text-zinc-100 underline tracking-wide transition-colors uppercase font-mono outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme)] rounded px-1"
        >
          Privacy & Data Notice
        </button>
      </div>

      <ChatPrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </div>
  );
}
