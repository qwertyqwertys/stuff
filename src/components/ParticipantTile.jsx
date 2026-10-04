// src/components/ParticipantTile.jsx
import React, { useEffect, useRef } from 'react';
import { MicOff, User } from 'lucide-react';

export default function ParticipantTile({ participant, stream }) {
  const p = participant || {};
  const name = p.name || p.username || 'User';
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
          muted={p.isSelf}
          className="absolute inset-0 w-full h-full object-cover rounded-2xl"
        />
      ) : (
        <div className="flex flex-col items-center z-10">
          <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-zinc-400 mb-3">
            <User className="w-8 h-8" />
          </div>
          <span className="text-sm font-bold text-zinc-200">{name}</span>
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
