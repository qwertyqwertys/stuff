// src/components/VoiceRoom.jsx
import React, { useState } from 'react';
import ParticipantTile from './ParticipantTile';
import { VoiceCallBar } from './VoiceCallBar';
import './VoiceRoom.css';

export default function VoiceRoom({ currentUser, onLeaveRoom }) {
  // Fix 1: Initialize state with ONLY the current user (no mock/fake users)
  const [participants, setParticipants] = useState([
    currentUser || { id: 'self', name: 'You', isSelf: true }
  ]);

  return (
    <div className="voice-room">
      <div className="participants-grid">
        {participants.map((participant) => (
          <ParticipantTile key={participant.id} participant={participant} />
        ))}
      </div>

      {/* Fix 2: Pass onLeaveRoom callback to the call bar */}
      <VoiceCallBar onEndCall={onLeaveRoom} />
    </div>
  );
}
