// src/components/VoiceRoom.jsx
import React, { useState } from 'react';
import ParticipantTile from './ParticipantTile';
import VoiceCallBar from './VoiceCallBar';
import './VoiceRoom.css';

export default function VoiceRoom({ 
  currentUser, 
  channelName = 'Voice Room', 
  onLeave, 
  onLeaveRoom 
}) {
  const handleLeave = onLeave || onLeaveRoom;

  // Fully guarded user object with all nested media/video fallbacks
  const safeUser = {
    id: currentUser?.id || 'self',
    name: currentUser?.name || currentUser?.username || 'You',
    username: currentUser?.username || currentUser?.name || 'You',
    avatar: currentUser?.avatar || currentUser?.avatar_url || '',
    isSelf: true,
    isMuted: false,
    isDeafened: false,
    isSpeaking: false,
    isVideo: false,
    isCameraOn: false,
    // Nested objects prevent "Cannot read properties of undefined (reading 'isVideo')"
    media: { isVideo: false, isAudio: true, isMuted: false },
    video: { isVideo: false, enabled: false },
    user: { id: 'self', name: 'You', isVideo: false },
    stream: { isVideo: false, active: false }
  };

  const [participants] = useState([safeUser]);

  return (
    <div className="voice-room relative w-full h-full min-h-screen flex flex-col justify-between p-6 bg-[#0b0e14] text-white">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-white">{channelName}</h2>
          <p className="text-xs text-zinc-400">1 participant connected</p>
        </div>
        <span className="text-xs bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-3 py-1 rounded-full font-semibold animate-pulse">
          Voice Active
        </span>
      </div>

      {/* Participant Grid */}
      <div className="participants-grid flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 my-6 items-center justify-center">
        {participants.map((participant) => (
          <ParticipantTile 
            key={participant.id} 
            participant={participant} 
            user={participant} 
          />
        ))}
      </div>

      {/* Control Bar */}
      <div className="w-full flex justify-center pb-4">
        <VoiceCallBar 
          roomId={channelName} 
          myUsername={safeUser.name} 
          onLeave={handleLeave} 
          onEndCall={handleLeave} 
        />
      </div>
    </div>
  );
}
