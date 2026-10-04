// src/components/VoiceRoom.jsx
import React, { useState } from 'react';
import ParticipantTile from './ParticipantTile';
import { VoiceCallBar } from './VoiceCallBar';
import './VoiceRoom.css';

export default function VoiceRoom({ currentUser, channelName = 'Voice Room', onLeave, onLeaveRoom }) {
  // Starts with ONLY yourself (no fake users)
  const [participants, setParticipants] = useState([
    currentUser || { id: 'self', name: 'You', isSelf: true }
  ]);

  // Supports both onLeave (from App.jsx) and onLeaveRoom
  const handleLeave = onLeave || onLeaveRoom;

  return (
    <div className="voice-room relative w-full h-full flex flex-col justify-between p-6">
      <div className="participants-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {participants.map((participant) => (
          <ParticipantTile key={participant.id} participant={participant} />
        ))}
      </div>

      {/* Forwards room name and leave callback to call bar */}
      <VoiceCallBar 
        roomId={channelName} 
        myUsername={currentUser?.name || 'You'} 
        onLeave={handleLeave} 
        onEndCall={handleLeave} 
      />
    </div>
  );
}
