// src/components/ParticipantTile.jsx
import React, { useEffect, useRef, useState } from 'react';
import { MicOff, User } from 'lucide-react';

export default function ParticipantTile({ participant, user, stream, currentUserId }) {
  const p = participant || user || {};
  
  // Checks all common name keys to guarantee display
  const name = p.name || p.username || p.displayName || p.handle || 'User';
  const avatar = p.avatar || p.avatar_url || p.pfp || p.photoURL;
  
  const isSelf = p.isSelf || p.id === currentUserId || p.id === 'self' || p.id === 'self_user';
  
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const audioTrack = stream?.getAudioTracks()?.[0];
  const isMuted = audioTrack !== undefined 
    ? !audioTrack.enabled 
    : Boolean(p.isMuted);

  const hasVideoTrack = stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled;
  const hasAudioTrack = stream && stream.getAudioTracks().length > 0;

  useEffect(() => {
    if (!isSelf && audioRef.current && stream && hasAudioTrack) {
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch((err) => console.warn('Remote audio autoplay error:', err));
    }
  }, [stream, isSelf, hasAudioTrack]);

  useEffect(() => {
    if (!stream || isMuted) {
      setIsSpeaking(false);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0 || !audioTracks[0].enabled) {
      setIsSpeaking(false);
      return;
    }

    let audioContext;
    let animationFrameId;

    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        setIsSpeaking(average > 12 && !isMuted);
        animationFrameId = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn('Audio analyser error:', e);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [stream, isMuted]);

  useEffect(() => {
    if (videoRef.current && stream && hasVideoTrack) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, hasVideoTrack]);

  return (
    <div 
      className={`relative flex flex-col items-center justify-center bg-zinc-900 rounded-2xl p-4 min-h-[220px] w-full overflow-hidden transition-all duration-150 ${
        isSpeaking 
          ? 'border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.6)] scale-[1.02]' 
          : isMuted 
          ? 'border border-red-500/40 bg-red-950/10'
          : 'border border-zinc-800 shadow-lg'
      }`}
    >
      {!isSelf && <audio ref={audioRef} autoPlay playsInline />}

      {isSpeaking && (
        <div className="absolute top-3 left-3 bg-emerald-500 text-black text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full z-20 animate-pulse">
          Speaking
        </div>
      )}

      {isMuted && (
        <div className="absolute top-3 right-3 bg-red-500/90 text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-full z-20 flex items-center gap-1 shadow-md border border-red-400/30 backdrop-blur-sm">
          <MicOff className="w-3.5 h-3.5" />
          <span>MUTED</span>
        </div>
      )}

      {hasVideoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf}
          style={{ transform: isSelf ? 'scaleX(-1)' : 'scaleX(1)' }}
          className="absolute inset-0 w-full h-full object-cover rounded-2xl"
        />
      ) : (
        <div className="flex flex-col items-center z-10">
          <div className={`w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3 overflow-hidden transition-all ${
            isSpeaking 
              ? 'border-2 border-emerald-400 ring-4 ring-emerald-500/30' 
              : isMuted
              ? 'border-2 border-red-500/50'
              : 'border-2 border-zinc-700'
          }`}>
            {avatar ? (
              <img src={avatar} alt={name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-zinc-400" />
            )}
          </div>
          <span className="text-sm font-bold text-zinc-100">{name}</span>
        </div>
      )}
    </div>
  );
}
