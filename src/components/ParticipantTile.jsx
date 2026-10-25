// src/components/ParticipantTile.jsx
import React, { useEffect, useRef, useState } from 'react';
import { MicOff, User, VolumeX } from 'lucide-react';

export default function ParticipantTile({ participant, user, stream, currentUserId }) {
  const p = participant || user || {};
  
  const name = p.name || p.username || p.displayName || p.handle || 'User';
  const avatar = p.avatar || p.avatar_url || p.pfp || p.photoURL;
  const isSelf = p.isSelf || p.id === currentUserId || p.id === 'self' || p.id === 'self_user';
  
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const audioTrack = stream?.getAudioTracks()?.[0];
  const videoTrack = stream?.getVideoTracks()?.[0];

  const isMuted = isSelf
    ? (audioTrack ? !audioTrack.enabled : Boolean(p.isMuted))
    : Boolean(p.isMuted);

  // Require both the tracking state (p.isCameraOn) and an active live video track to display video
  const cameraActiveState = p.isCameraOn !== undefined ? p.isCameraOn : true;
  const showVideo = Boolean(cameraActiveState && videoTrack && videoTrack.enabled && !videoTrack.muted && videoTrack.readyState === 'live');

  // Keep video stream attached permanently without resetting
  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
    }
  }, [stream]);

  // Audio playback for remote users
  useEffect(() => {
    if (!isSelf && audioRef.current && stream && stream.getAudioTracks().length > 0) {
      if (audioRef.current.srcObject !== stream) {
        audioRef.current.srcObject = stream;
      }
      audioRef.current.play().catch(() => setAudioBlocked(true));
    }
  }, [stream, isSelf]);

  // Audio volume analyzer for speaking indicator
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
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const average = sum / dataArray.length;
        
        // Instant & sensitive volume detection (average > 8)
        setIsSpeaking(prev => {
          if (average > 8 && !prev) return true;
          if (average < 4 && prev) return false;
          return prev;
        });

        animationFrameId = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn('Audio analyser error:', e);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (audioContext && audioContext.state !== 'closed') audioContext.close();
    };
  }, [stream, isMuted]);

  return (
    <div 
      className={`relative w-full h-full aspect-video rounded-2xl overflow-hidden flex items-center justify-center bg-zinc-900 transition-all duration-150 ${
        isSpeaking 
          ? 'border-4 border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.6)] scale-[1.01]' 
          : isMuted 
          ? 'border-2 border-red-500/60'
          : 'border border-white/10'
      }`}
    >
      {!isSelf && <audio ref={audioRef} autoPlay playsInline controls={false} />}

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

      {/* Persistent Video Element - Hidden via CSS display property when off to prevent DOM unmounting flicker */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSelf}
        style={{
          display: showVideo ? 'block' : 'none',
          transform: isSelf ? 'scaleX(-1) translateZ(0)' : 'translateZ(0)',
          willChange: 'transform'
        }}
        className="absolute inset-0 w-full h-full object-cover rounded-2xl z-0"
      />

      {/* Avatar Graphic fallback shown when video is inactive */}
      {!showVideo && (
        <div className="flex items-center justify-center w-full h-full p-4 z-10">
          <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center overflow-hidden transition-all ${
            isSpeaking 
              ? 'ring-4 ring-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.6)]' 
              : isMuted
              ? 'ring-2 ring-red-500/50'
              : 'bg-black/40 border border-white/10'
          }`}>
            {avatar ? (
              <img src={avatar} alt={name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-white/80" />
            )}
          </div>
        </div>
      )}

      {/* Username Tag */}
      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-lg z-20 pointer-events-none">
        {name}
      </div>
    </div>
  );
}
