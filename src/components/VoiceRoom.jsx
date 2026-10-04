// src/components/VoiceRoom.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ParticipantTile from './ParticipantTile';
import VoiceCallBar from './VoiceCallBar';
import { supabase } from '../supabaseClient';
import './VoiceRoom.css';

export default function VoiceRoom({ 
  currentUser, 
  channelName = 'Voice Room', 
  onLeave, 
  onLeaveRoom 
}) {
  const handleLeave = onLeave || onLeaveRoom;

  // Stream & Presence States
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [participants, setParticipants] = useState([]);

  // Active channel ref to track presence updates without re-subscribing
  const roomChannelRef = useRef(null);

  // Persistent user metadata
  const userId = useMemo(() => currentUser?.id || `user_${Math.random().toString(36).substring(2, 9)}`, [currentUser]);
  const userName = useMemo(() => currentUser?.name || currentUser?.username || 'User', [currentUser]);

  // 1. Manage Supabase Realtime Presence without disconnect loops
  useEffect(() => {
    if (!supabase) return;

    const roomChannel = supabase.channel(`voiceroom_${channelName}`, {
      config: { presence: { key: userId } }
    });

    roomChannelRef.current = roomChannel;

    roomChannel
      .on('presence', { event: 'sync' }, () => {
        const state = roomChannel.presenceState();
        const activeUsers = [];

        Object.keys(state).forEach((key) => {
          const userPresence = state[key][0];
          if (userPresence) {
            activeUsers.push({
              ...userPresence,
              // Fallback structures for ParticipantTile safety
              media: { isVideo: userPresence.isCameraOn, isMuted: userPresence.isMuted },
              video: { isVideo: userPresence.isCameraOn }
            });
          }
        });

        setParticipants(activeUsers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await roomChannel.track({
            id: userId,
            name: userName,
            isMuted: false,
            isCameraOn: false,
            joinedAt: new Date().toISOString()
          });
        }
      });

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [channelName, userId, userName]); // Note: isMuted and isCameraOn excluded to prevent loop

  // 2. Track presence state updates when controls are toggled
  useEffect(() => {
    if (roomChannelRef.current) {
      roomChannelRef.current.track({
        id: userId,
        name: userName,
        isMuted,
        isCameraOn,
        joinedAt: new Date().toISOString()
      });
    }
  }, [isMuted, isCameraOn, userId, userName]);

  // Handle stream updates passed from VoiceCallBar
  const handleStreamUpdate = (stream) => {
    setLocalStream(stream);
    if (stream) {
      const hasVideo = stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled;
      const hasAudio = stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].enabled;
      setIsCameraOn(hasVideo);
      setIsMuted(!hasAudio);
    }
  };

  return (
    <div className="voice-room relative w-full h-full min-h-screen flex flex-col justify-between p-6 bg-[#0b0e14] text-white">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-white">{channelName}</h2>
          <p className="text-xs text-zinc-400">
            {participants.length > 0 ? `${participants.length} connected in call` : 'Connected'}
          </p>
        </div>
        <span className="text-xs bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-3 py-1 rounded-full font-semibold animate-pulse">
          Voice Active
        </span>
      </div>

      {/* Grid of Users */}
      <div className="participants-grid flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 my-6 items-center justify-center">
        {participants.length > 0 ? (
          participants.map((participant) => (
            <ParticipantTile 
              key={participant.id} 
              participant={participant} 
              user={participant}
              stream={participant.id === userId ? localStream : null}
            />
          ))
        ) : (
          <ParticipantTile 
            participant={{
              id: userId,
              name: userName,
              isMuted,
              isCameraOn,
              media: { isVideo: isCameraOn },
              video: { isVideo: isCameraOn }
            }}
            stream={localStream}
          />
        )}
      </div>

      {/* Control Bar */}
      <div className="w-full flex justify-center pb-4">
        <VoiceCallBar 
          roomId={channelName} 
          myUsername={userName} 
          onLeave={handleLeave} 
          onEndCall={handleLeave}
          onStreamUpdate={handleStreamUpdate}
        />
      </div>
    </div>
  );
}
