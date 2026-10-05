// src/components/ParticipantTile.jsx
import React, { useEffect, useRef, useState } from 'react';
import { MicOff, User, VolumeX } from 'lucide-react';

export default function ParticipantTile({ participant, user, stream, currentUserId }) {
  const p = participant || user || {};
  
  // Checks all common name keys to guarantee display
  const name = p.name || p.username || p.displayName || p.handle || 'User';
  const avatar = p.avatar || p.avatar_url || p.pfp || p.photoURL;
  
  const isSelf = p.isSelf || p.id === currentUserId || p.id === 'self' || p.id === 'self_user';
  
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVideoTrackActive, setIsVideoTrackActive] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [isTrackMuted, setIsTrackMuted] = useState(false);

  const videoTrack = stream?.getVideoTracks()?.[0];
  const audioTrack = stream?.getAudioTracks()?.[0];

  // For remote users, prioritize Supabase presence `p.isMuted`.
  // For local user, check the local audioTrack.enabled status.
  const isMuted = isSelf
    ? (audioTrack ? !audioTrack.enabled : Boolean(p.isMuted))
    : (p.isMuted !== undefined ? Boolean(p.isMuted) : isTrackMuted);

  // Listen to remote WebRTC track mute/unmute events
  useEffect(() => {
    if (!audioTrack) {
      setIsTrackMuted(true);
      return;
    }

    const updateAudioTrackStatus = () => {
      setIsTrackMuted(!audioTrack.enabled || audioTrack.muted);
    };

    updateAudioTrackStatus();

    audioTrack.addEventListener('mute', updateAudioTrackStatus);
    audioTrack.addEventListener('unmute', updateAudioTrackStatus);

    const interval = setInterval(updateAudioTrackStatus, 300);

    return () => {
      audioTrack.removeEventListener('mute', updateAudioTrackStatus);
      audioTrack.removeEventListener('unmute', updateAudioTrackStatus);
      clearInterval(interval);
    };
  }, [audioTrack]);

  // Track live WebRTC video track status
  useEffect(() => {
    if (!videoTrack) {
      setIsVideoTrackActive(false);
      return;
    }

    const updateTrackStatus = () => {
      const active = videoTrack.enabled && !videoTrack.muted && videoTrack.readyState === 'live';
      setIsVideoTrackActive(active);
    };

    updateTrackStatus();

    videoTrack.addEventListener('mute', updateTrackStatus);
    videoTrack.addEventListener('unmute', updateTrackStatus);
    videoTrack.addEventListener('ended', updateTrackStatus);

    const interval = setInterval(updateTrackStatus, 300);

    return () => {
      videoTrack.removeEventListener('mute', updateTrackStatus);
      videoTrack.removeEventListener('unmute', updateTrackStatus);
      videoTrack.removeEventListener('ended', updateTrackStatus);
      clearInterval(interval);
    };
  }, [videoTrack]);

  // Rely strictly on whether the video track is actually enabled and live 
  // instead of presence flags that might collapse the UI layout.
  const showVideo = isVideoTrackActive;
  const hasAudioTrack = stream && stream.getAudioTracks().length > 0;

  // Unmute and play remote audio with browser autoplay error catching
  const playRemoteAudio = () => {
    if (!isSelf && audioRef.current && stream && hasAudioTrack) {
      audioRef.current.srcObject = stream;
      audioRef.current.volume = 1.0;
      audioRef.current.play()
        .then(() => {
          setAudioBlocked(false);
        })
        .catch((err) => {
          console.warn('Remote audio playback prevented by browser autoplay policy:', err);
          setAudioBlocked(true);
        });
    }
  };

  useEffect(() => {
    playRemoteAudio();
  }, [stream, isSelf, hasAudioTrack]);

  // User click handler to unlock audio if blocked by browser policy
  const handleUserUnlockAudio = () => {
    if (audioRef.current) {
      audioRef.current.play()
        .then(() => setAudioBlocked(false))
        .catch(console.error);
    }
  };

  // Audio volume analyzer for speaking indicator border
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

      if (audioContext.state === 'suspended') {
        const resumeAudio = () => {
          audioContext.resume();
          window.removeEventListener('click', resumeAudio);
        };
        window.addEventListener('click', resumeAudio);
      }

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
    if (videoRef.current && stream && showVideo) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, showVideo]);

  return (
    <div 
      onClick={audioBlocked ? handleUserUnlockAudio : undefined}
      className={`relative w-full h-full aspect-video rounded-2xl overflow-hidden flex items-center justify-center bg-[#c84b2c] transition-all duration-150 ${
        audioBlocked ? 'cursor-pointer' : ''
      } ${
        isSpeaking 
          ? 'ring-4 ring-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.7)] scale-[1.01]' 
          : isMuted 
          ? 'ring-2 ring-red-500/50'
          : 'border border-white/10 shadow-lg'
      }`}
    >
      {/* Remote Audio Element */}
      {!isSelf && <audio ref={audioRef} autoPlay playsInline controls={false} />}

      {/* Autoplay Blocked Banner Overlay */}
      {!isSelf && audioBlocked && (
        <button 
          onClick={handleUserUnlockAudio}
          className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-white p-4 text-center cursor-pointer hover:bg-black/85 transition-all"
        >
          <VolumeX className="w-8 h-8 text-amber-400 animate-bounce" />
          <span className="text-sm font-bold">Audio Blocked by Browser</span>
          <span className="text-xs text-zinc-300 bg-white/10 px-3 py-1 rounded-full border border-white/20">
            Click anywhere on this tile to enable sound
          </span>
        </button>
      )}

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
      {showVideo ? (
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
