import React from 'react';

export default function ParticipantTile({ user }) {
  // user object shape: { id, name, isVideo, videoUrl, avatarUrl, isSpeaking, isMuted }
  return (
    <div
      className={`tile ${user.isVideo ? 'video-tile' : 'avatar-tile'} ${
        user.isSpeaking ? 'speaking' : ''
      }`}
    >
      {user.isVideo ? (
        <video autoPlay playsInline src={user.videoUrl} muted />
      ) : (
        <div className="avatar-wrapper">
          <img src={user.avatarUrl || '/default-avatar.png'} alt={user.name} className="avatar-img" />
          {user.isMuted && <span className="mute-badge">🔇</span>}
        </div>
      )}
      <span className="user-label">{user.name}</span>
    </div>
  );
}
