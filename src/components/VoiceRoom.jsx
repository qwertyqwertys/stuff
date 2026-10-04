import React, { useState } from 'react';
import ParticipantTile from './ParticipantTile';
import { VoiceCallBar } from './VoiceCallBar';
import './VoiceRoom.css';

// Example state matching the 5 participants from your screenshot
const SAMPLE_PARTICIPANTS = [
  { id: 1, name: 'User 1', isVideo: true, videoUrl: '', isSpeaking: false, isMuted: false },
  { id: 2, name: 'User 2', isVideo: true, videoUrl: '', isSpeaking: false, isMuted: false },
  { id: 3, name: 'User 3', isVideo: true, videoUrl: '', isSpeaking: true, isMuted: false },
  { id: 4, name: 'User 4', isVideo: false, avatarUrl: '', isSpeaking: false, isMuted: true },
  { id: 5, name: 'User 5', isVideo: false, avatarUrl: '', isSpeaking: false, isMuted: false },
];

export default function VoiceRoom({ channelName = 'Squad 1', onLeave }) {
  const [participants, setParticipants] = useState(SAMPLE_PARTICIPANTS);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  // Calculates grid layout dynamically based on active user count
  const getGridStyle = () => {
    const count = participants.length;
    if (count <= 1) return { gridTemplateColumns: '1fr' };
    if (count <= 4) return { gridTemplateColumns: 'repeat(2, 1fr)' };
    if (count <= 9) return { gridTemplateColumns: 'repeat(3, 1fr)' };
    return { gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' };
  };

  return (
    <div className="voice-room">
      {/* Top Header */}
      <header className="voice-header">
        <div className="channel-info">
          <span className="speaker-icon">🔊</span>
          <span className="channel-name">{channelName}</span>
        </div>
        <div className="header-controls">
          <button className="icon-btn" title="Grid View">⊞</button>
          <button className="icon-btn" title="Pop Out">❐</button>
          <button className="icon-btn" title="More Options">•••</button>
        </div>
      </header>

      {/* Grid Area */}
      <main className="participant-grid" style={getGridStyle()}>
        {participants.map((user) => (
          <ParticipantTile key={user.id} user={user} />
        ))}
      </main>

      {/* Your Voice Call Bar Component */}
      <VoiceCallBar
        isMicMuted={isMicMuted}
        onToggleMic={() => setIsMicMuted(!isMicMuted)}
        isCamOff={isCamOff}
        onToggleCam={() => setIsCamOff(!isCamOff)}
        onDisconnect={onLeave}
      />
    </div>
  );
}
