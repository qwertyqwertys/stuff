// src/components/VoiceRoom.jsx
import React, { useState } from 'react';
import ParticipantTile from './ParticipantTile';
import VoiceCallBar from './VoiceCallBar'; // Standard default import
import './VoiceRoom.css';

export default function VoiceRoom({ 
  currentUser, 
  channelName = 'Voice Room', 
  onLeave, 
  onLeaveRoom 
}) {
  // Safe default user object to prevent rendering crashes in ParticipantTile
  const safeUser = currentUser || { 
    id: 'self', 
    name: 'You', 
    isSelf: true,
    isMuted: false,
    isDeafened: false,
    isSpeaking: false
  };

  const [participants] = useState([safeUser]);
  const handleLeave = onLeave || onLeaveRoom;

  return (
    <div className="voice-room relative w-full h-full min-h-screen flex flex-col justify-between p-6 bg-[#0b0e14] text-white">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-800">
        <h2 className="text-xl font-bold text-white">{channelName}</h2>
        <span className="text-xs bg-green-500/20 text-green-400 px-2.5 py-1 rounded-full font-medium">
          Connected
        </span>
      </div>

      {/* Participants Grid */}
      <div className="participants-grid flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 my-6 items-center justify-center">
        {participants.map((participant) => (
          <ParticipantTile key={participant.id} participant={participant} />
        ))}
      </div>

      {/* Voice Controls Bar */}
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
