// src/components/VoiceRoom.jsx
import React, { useState, useEffect, useRef } from 'react';
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
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

  const roomChannelRef = useRef(null);

  // 1. Load Profile from Prop, LocalStorage, Supabase Auth, or Profiles Table
  useEffect(() => {
    let isMounted = true;

    const loadFullProfile = async () => {
      try {
        // Check local storage for handles saved in chat
        const storedName = localStorage.getItem('username') || 
                           localStorage.getItem('chat_username') || 
                           localStorage.getItem('user_handle') || 
                           localStorage.getItem('handle');
        const storedAvatar = localStorage.getItem('avatar_url') || 
                            localStorage.getItem('avatar');

        let authUser = null;
        if (supabase) {
          const { data } = await supabase.auth.getUser();
          authUser = data?.user;
        }

        let dbUsername = null;
        let dbAvatar = null;

        if (authUser) {
          const { data: dbProfile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', authUser.id)
            .maybeSingle();

          if (dbProfile) {
            dbUsername = dbProfile.username;
            dbAvatar = dbProfile.avatar_url;
          }
        }

        const meta = authUser?.user_metadata || {};

        const finalId = authUser?.id || currentUser?.id || localStorage.getItem('user_id') || `user_${Math.random().toString(36).substring(2, 9)}`;
        const finalName = dbUsername || currentUser?.name || currentUser?.username || meta.full_name || meta.name || meta.username || storedName || authUser?.email?.split('@')[0] || 'User';
        const finalAvatar = dbAvatar || currentUser?.avatar || currentUser?.pfp || meta.avatar_url || meta.pfp || meta.avatar || storedAvatar || '';

        if (isMounted) {
          setUserProfile({ id: finalId, name: finalName, avatar: finalAvatar });
          setIsProfileLoaded(true);
        }
      } catch (err) {
        console.warn('Profile resolution error:', err);
        if (isMounted) setIsProfileLoaded(true);
      }
    };

    loadFullProfile();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const userId = userProfile?.id || currentUser?.id || 'guest';
  const userName = userProfile?.name || currentUser?.name || currentUser?.username || 'User';
  const userAvatar = userProfile?.avatar || currentUser?.avatar || currentUser?.pfp || '';

  // 2. Track Presence in Supabase Voice Channel
  useEffect(() => {
    if (!supabase || !isProfileLoaded) return;

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
  }, [channelName, isProfileLoaded, userId, userName, userAvatar]);

  // 3. Re-track mute/camera states
  useEffect(() => {
    if (roomChannelRef.current && isProfileLoaded) {
      roomChannelRef.current.track({
        id: userId,
        name: userName,
        avatar: userAvatar,
        isMuted,
        isCameraOn,
        joinedAt: new Date().toISOString()
      });
    }
  }, [isMuted, isCameraOn, isProfileLoaded, userId, userName, userAvatar]);

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
            // Force self tile to use resolved userName & avatar
            const participantData = isSelf 
              ? { 
                  ...participant, 
                  name: userName !== 'User' ? userName : (participant.name || 'User'),
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
