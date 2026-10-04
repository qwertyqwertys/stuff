// src/components/VoiceRoom.jsx
import React, { useState, useEffect } from 'react';
import ParticipantTile from './ParticipantTile';
import VoiceCallBar from './VoiceCallBar';
import { supabase } from '../supabaseClient'; // Make sure this path matches your supabase client file
import './VoiceRoom.css';

export default function VoiceRoom({ 
  currentUser, 
  channelName = 'Voice Room', 
  onLeave, 
  onLeaveRoom 
}) {
  const handleLeave = onLeave || onLeaveRoom;

  // Stream & Hardware States
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [participants, setParticipants] = useState([]);

  // Generate a persistent ID for this session
  const userId = currentUser?.id || `user_${Math.random().toString(36).substring(2, 9)}`;
  const userName = currentUser?.name || currentUser?.username || 'User';

  // 1. Request Microphone and Camera permissions from the browser
  useEffect(() => {
    let streamRef = null;

    async function initMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        streamRef = stream;
        setLocalStream(stream);
        setIsCameraOn(true);
      } catch (err) {
        console.warn('Camera blocked or missing, falling back to audio only...', err);
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          streamRef = audioStream;
          setLocalStream(audioStream);
        } catch (audioErr) {
          console.error('Microphone permission denied:', audioErr);
        }
      }
    }

    initMedia();

    // Clean up camera/mic when leaving room
    return () => {
      if (streamRef) {
        streamRef.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 2. Toggle Microphone Mute
  const handleToggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted; // Toggle enabled state
        setIsMuted(!isMuted);
      }
    }
  };

  // 3. Toggle Camera On/Off
  const handleToggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isCameraOn;
        setIsCameraOn(!isCameraOn);
      }
    }
  };

  // 4. Sync room users across devices (PC + Chromebook) using Supabase Presence
  useEffect(() => {
    if (!supabase) return;

    const roomChannel = supabase.channel(`voiceroom_${channelName}`, {
      config: { presence: { key: userId } }
    });

    roomChannel
      .on('presence', { event: 'sync' }, () => {
        const state = roomChannel.presenceState();
        const activeUsers = [];

        Object.keys(state).forEach((key) => {
          const userPresence = state[key][0];
          if (userPresence) {
            activeUsers.push(userPresence);
          }
        });

        setParticipants(activeUsers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await roomChannel.track({
            id: userId,
            name: userName,
            isMuted,
            isCameraOn,
            joinedAt: new Date().toISOString()
          });
        }
      });

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [channelName, userId, userName, isMuted, isCameraOn]);

  return (
    <div className="voice-room relative w-full h-full min-h-screen flex flex-col justify-between p-6 bg-[#0b0e14] text-white">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-white">{channelName}</h2>
          <p className="text-xs text-zinc-400">{participants.length} connected in call</p>
        </div>
        <span className="text-xs bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-3 py-1 rounded-full font-semibold animate-pulse">
          Connected
        </span>
      </div>

      {/* Participants Grid */}
      <div className="participants-grid flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 my-6 items-center justify-center">
        {participants.map((participant) => (
          <ParticipantTile 
            key={participant.id} 
            participant={participant} 
            user={participant} 
          />
        ))}
      </div>

      {/* Voice Controls Bar */}
      <div className="w-full flex justify-center pb-4">
        <VoiceCallBar 
          roomId={channelName} 
          myUsername={userName} 
          isMuted={isMuted}
          isCameraOn={isCameraOn}
          onToggleMute={handleToggleMute}
          onToggleCamera={handleToggleCamera}
          onLeave={handleLeave} 
          onEndCall={handleLeave} 
        />
      </div>
    </div>
  );
}
