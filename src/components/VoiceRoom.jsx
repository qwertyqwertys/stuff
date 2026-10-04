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

  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [userProfile, setUserProfile] = useState(null);

  const roomChannelRef = useRef(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (currentUser && (currentUser.name || currentUser.username || currentUser.avatar || currentUser.pfp)) {
        setUserProfile(currentUser);
        return;
      }

      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const meta = user.user_metadata || {};
          setUserProfile({
            id: user.id,
            name: meta.full_name || meta.name || meta.username || user.email?.split('@')[0] || 'User',
            avatar: meta.avatar_url || meta.pfp || meta.avatar || '',
          });
        }
      }
    };

    loadProfile();
  }, [currentUser]);

  const userId = useMemo(() => userProfile?.id || currentUser?.id || `user_${Math.random().toString(36).substring(2, 9)}`, [userProfile, currentUser]);
  const userName = useMemo(() => userProfile?.name || currentUser?.name || currentUser?.username || 'User', [userProfile, currentUser]);
  const userAvatar = useMemo(() => userProfile?.avatar || currentUser?.avatar || currentUser?.pfp || '', [userProfile, currentUser]);

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
              avatar: userPresence.avatar || userAvatar,
              name: userPresence.name || userName,
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
            avatar: userAvatar,
            isMuted,
            isCameraOn,
            joinedAt: new Date().toISOString()
          });
        }
      });

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [channelName, userId, userName, userAvatar]);

  useEffect(() => {
    if (roomChannelRef.current) {
      roomChannelRef.current.track({
        id: userId,
        name: userName,
        avatar: userAvatar,
        isMuted,
        isCameraOn,
        joinedAt: new Date().toISOString()
      });
    }
  }, [isMuted, isCameraOn, userId, userName, userAvatar]);

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

      {/* Grid of User Tiles */}
      <div className="participants-grid flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 my-6 items-center justify-center">
        {participants.length > 0 ? (
          participants.map((participant) => {
            const isSelf = participant.id === userId;
            const participantData = isSelf 
              ? { ...participant, isMuted, isCameraOn, isSelf: true } 
              : participant;

            return (
              <ParticipantTile 
                key={participant.id} 
                participant={participantData} 
                user={participantData}
                currentUserId={userId}
                stream={isSelf ? localStream : remoteStreams[participant.id]}
              />
            );
          })
        ) : (
          <ParticipantTile 
            participant={{
              id: userId,
              name: userName,
              avatar: userAvatar,
              isMuted,
              isCameraOn,
              isSelf: true
            }}
            currentUserId={userId}
            stream={localStream}
          />
        )}
      </div>

      {/* Controls Bar */}
      <div className="w-full flex justify-center pb-4">
        <VoiceCallBar 
          roomId={channelName} 
          myUserId={userId}
          myUsername={userName} 
          userAvatar={userAvatar}
          onLeave={handleLeave} 
          onEndCall={handleLeave}
          onStreamUpdate={handleStreamUpdate}
          onRemoteStreamsUpdate={(streams) => setRemoteStreams(streams)}
        />
      </div>
    </div>
  );
}
