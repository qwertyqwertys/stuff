// src/components/ParticipantTile.jsx
import React, { useEffect, useRef } from 'react';
import { MicOff, User } from 'lucide-react';

export default function ParticipantTile({ participant, user, stream }) {
  const p = participant || user || {};
  const name = p.name || p.username || 'User';
  const avatar = p.avatar || p.avatar_url || p.pfp || p.photoURL;
  const isSelf = p.isSelf || p.id === 'self';
  const videoRef = useRef(null);

  const hasVideoTrack = stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled;

  useEffect(() => {
    if (videoRef.current && stream && hasVideoTrack) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, hasVideoTrack]);

  return (
    <div className="relative flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-2xl p-4 min-h-[200px] w-full overflow-hidden shadow-lg">
      {hasVideoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf}
          // Mirrors local self-camera preview while leaving remote users unmirrored
          style={{ transform: isSelf ? 'scaleX(-1)' : 'scaleX(1)' }}
          className="absolute inset-0 w-full h-full object-cover rounded-2xl"
        />
      ) : (
        <div className="flex flex-col items-center z-10">
          <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-emerald-500/50 flex items-center justify-center text-zinc-400 mb-3 overflow-hidden shadow-md">
            {avatar ? (
              <img src={avatar} alt={name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-zinc-400" />
            )}
          </div>
          <span className="text-sm font-bold text-zinc-100">{name}</span>
        </div>
      )}

      {p.isMuted && (
        <div className="absolute bottom-3 right-3 bg-red-500 text-white p-1.5 rounded-full text-xs shadow-md z-20">
          <MicOff className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}
