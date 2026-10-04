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

  // 1. Fetch user profile from Supabase DB or auth
  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        if (!supabase) return;
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: dbProfile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', user.id)
            .maybeSingle();

          if (isMounted && dbProfile) {
            setUserProfile({
              id: user.id,
              name: dbProfile.username,
              avatar: dbProfile.avatar_url,
            });
          }
        }
      } catch (err) {
        console.warn('Error fetching profile:', err);
      }
    };

    fetchProfile();
    return () => { isMounted = false; };
  }, []);

  // 2. Resolve final active name across all common object keys & storage
  const userName = useMemo(() => {
    return (
      userProfile?.name ||
      currentUser?.username ||
      currentUser?.name ||
      currentUser?.displayName ||
      currentUser?.handle ||
      localStorage.getItem('username') ||
      localStorage.getItem('chat_username') ||
      localStorage.getItem('user_handle') ||
      localStorage.getItem('handle') ||
      'User'
    );
  }, [userProfile, currentUser]);

  const userAvatar = useMemo(() => {
    return (
      userProfile?.avatar ||
      currentUser?.avatar ||
      currentUser?.avatar_url ||
      currentUser?.pfp ||
      localStorage.getItem('avatar_url') ||
      localStorage.getItem('avatar') ||
      ''
    );
  }, [userProfile, currentUser]);

  const userId = useMemo(() => {
    return (
      userProfile?.id ||
      currentUser?.id ||
      localStorage.getItem('user_id') ||
      'self_user'
    );
  }, [userProfile, currentUser]);

  // 3. Connect to room channel ONCE (does not disconnect on name update)
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase.channel(`voiceroom_${channelName}`, {
      config: { presence: { key: userId } }
    });

    roomChannelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activeUsers = [];

        Object.keys(state).forEach((key) => {
          if (state[key] && state[key][0]) {
            activeUsers.push(state[key][0]);
          }
        });

        setParticipants(activeUsers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
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
      supabase.removeChannel(channel);
      roomChannelRef.current = null;
    };
  }, [channelName, userId]);

  // 4. Update presence live on channel when name, avatar, or mute states change
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
  }, [userName, userAvatar, isMuted, isCameraOn, userId]);

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
            
            // Force local self tile to render the live userName directly
            const participantData = isSelf 
              ? { 
                  ...participant, 
                  name: userName,
                  avatar: userAvatar || participant.avatar,
                  isMuted, 
                  isCameraOn, 
                  isSelf: true 
                } 
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
