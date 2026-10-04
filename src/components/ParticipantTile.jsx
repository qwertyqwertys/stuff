// src/components/ParticipantTile.jsx
import React from 'react';
import { MicOff, User } from 'lucide-react';

export default function ParticipantTile({ participant, user }) {
  // Safe extraction regardless of prop name used
  const p = participant || user || {};
  const name = p.name || p.username || 'User';
  const isMuted = p.isMuted || p.media?.isMuted || false;
  const isSpeaking = p.isSpeaking || false;
  const avatar = p.avatar || p.avatar_url || p.user?.avatar_url;

  return (
    <div className={`relative flex flex-col items-center justify-center bg-zinc-900/90 border ${isSpeaking ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'border-zinc-800'} rounded-2xl p-6 min-h-[180px] transition-all`}>
      <div className="relative mb-3">
        {avatar ? (
          <img src={avatar} alt={name} className="w-16 h-16 rounded-full object-cover border-2 border-zinc-700" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-zinc-400">
            <User className="w-8 h-8" />
          </div>
        )}
        {isMuted && (
          <div className="absolute -bottom-1 -right-1 bg-red-500 text-white p-1 rounded-full text-xs shadow-md">
            <MicOff className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      <span className="text-sm font-bold text-zinc-200">{name}</span>
    </div>
  );
}
