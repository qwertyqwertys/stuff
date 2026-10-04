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
      className={`relative w-full h-full aspect-video rounded-2xl overflow-hidden flex items-center justify-center bg-[#c84b2c] transition-all duration-150 ${
        isSpeaking 
          ? 'ring-4 ring-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.7)] scale-[1.01]' 
          : isMuted 
          ? 'ring-2 ring-red-500/50'
          : 'border border-white/10 shadow-lg'
      }`}
    >
      {/* Hidden Remote Audio Element */}
      {!isSelf && <audio ref={audioRef} autoPlay playsInline />}

      {/* Speaking Badge (Top Left) */}
      {isSpeaking && (
        <div className="absolute top-3 left-3 bg-emerald-500 text-black text-[10px] font-black uppercase px-2.5 py-1 rounded-full z-20 animate-pulse shadow-md">
          Speaking
        </div>
      )}

      {/* Muted Badge (Top Right) */}
      {isMuted && (
        <div className="absolute top-3 right-3 bg-red-600/90 text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-full z-20 flex items-center gap-1 shadow-md border border-red-400/30 backdrop-blur-sm">
          <MicOff className="w-3.5 h-3.5" />
          <span>MUTED</span>
        </div>
      )}

      {/* Video Feed OR Centered Avatar Graphic */}
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
        <div className="flex items-center justify-center w-full h-full p-4 z-10">
          <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center overflow-hidden transition-all ${
            isSpeaking 
              ? 'ring-4 ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]' 
              : isMuted
              ? 'ring-2 ring-red-500/50'
              : ''
          }`}>
            {avatar ? (
              <img src={avatar} alt={name} className="w-full h-full object-contain drop-shadow-md" />
            ) : (
              <div className="w-full h-full bg-black/20 rounded-full flex items-center justify-center text-white">
                <User className="w-12 h-12 text-white/80" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom-left Username Pill Badge */}
      <div className="absolute bottom-3 left-3 bg-neutral-900/80 backdrop-blur-md text-white text-sm font-semibold px-3 py-1.5 rounded-xl shadow-md flex items-center gap-2 z-20 pointer-events-none">
        <span>{name}</span>
      </div>
    </div>
  );
}
