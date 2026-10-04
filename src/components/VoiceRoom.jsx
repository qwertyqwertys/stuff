// src/components/VoiceRoom.jsx
import React, { useState, useEffect, useRef } from 'react';
import ParticipantTile from './ParticipantTile';
import VoiceCallBar from './VoiceCallBar';
import { supabase } from '../supabaseClient';
import './VoiceRoom.css';

export default function VoiceRoom({ 
  currentUser, 
  user,
  username,
  myUsername,
  channelName = 'Voice Room', 
  onLeave, 
  onLeaveRoom 
}) {
  const handleLeave = onLeave || onLeaveRoom;

  // 1. Stable User ID for the entire session (prevents presence & card key mismatches)
  const [localUserId] = useState(() => {
    const u = currentUser || user;
    if (typeof u === 'object' && u?.id) return u.id;
    const stored = localStorage.getItem('user_id');
    if (stored) return stored;
    const newId = `user_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('user_id', newId);
    return newId;
  });

  // 2. Resolve display name synchronously on mount across all string/object props & localStorage
  const resolveName = () => {
    const u = currentUser || user;
    if (typeof u === 'string' && u.trim()) return u;
    if (typeof u === 'object' && u !== null) {
      const possibleName = u.username || u.name || u.displayName || u.handle;
      if (possibleName) return possibleName;
    }
    if (username) return username;
    if (myUsername) return myUsername;

    const storedName = localStorage.getItem('username') || 
                       localStorage.getItem('chat_username') || 
                       localStorage.getItem('user_handle') || 
                       localStorage.getItem('handle');
    if (storedName) return storedName;

    return 'User';
  };

  const [displayName, setDisplayName] = useState(resolveName);
  const [avatarUrl, setAvatarUrl] = useState(() => {
    const u = currentUser || user;
    if (typeof u === 'object' && u !== null) {
      return u.avatar || u.avatar_url || u.pfp || '';
    }
    return localStorage.getItem('avatar_url') || localStorage.getItem('avatar') || '';
  });

  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [participants, setParticipants] = useState([]);

  const roomChannelRef = useRef(null);

  // 3. Optional: Sync from Supabase DB profiles table if available
  useEffect(() => {
    let isMounted = true;
    const fetchSupabaseProfile = async () => {
      try {
        if (!supabase) return;
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', authUser.id)
            .maybeSingle();

          if (isMounted && profile) {
            if (profile.username) setDisplayName(profile.username);
            if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
          }
        }
      } catch (err) {
        console.warn('Supabase profile sync notice:', err);
      }
    };

    fetchSupabaseProfile();
    return () => { isMounted = false; };
  }, []);

  // Sync if parent component updates props dynamically
  useEffect(() => {
    const freshName = resolveName();
    if (freshName && freshName !== 'User') {
      setDisplayName(freshName);
    }
  }, [currentUser, user, username, myUsername]);

  // 4. Connect to Supabase Realtime Voice Channel
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase.channel(`voiceroom_${channelName}`, {
      config: { presence: { key: localUserId } }
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
            id: localUserId,
            name: displayName,
            avatar: avatarUrl,
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
  }, [channelName, localUserId]);

  // 5. Live update presence when local name or mute states change
  useEffect(() => {
    if (roomChannelRef.current) {
      roomChannelRef.current.track({
        id: localUserId,
        name: displayName,
        avatar: avatarUrl,
        isMuted,
        isCameraOn,
        joinedAt: new Date().toISOString()
      });
    }
  }, [displayName, avatarUrl, isMuted, isCameraOn, localUserId]);

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
            const isSelf = participant.id === localUserId || participant.id === 'self' || participant.id === 'self_user';
            
            // Force local tile to display active name directly
            const participantData = isSelf 
              ? { 
                  ...participant, 
                  id: localUserId,
                  name: displayName,
                  avatar: avatarUrl || participant.avatar,
                  isMuted, 
                  isCameraOn, 
                  isSelf: true 
                } 
              : participant;

            return (
              <ParticipantTile 
                key={participant.id || localUserId} 
                participant={participantData} 
                user={participantData}
                currentUserId={localUserId}
                stream={isSelf ? localStream : remoteStreams[participant.id]}
              />
            );
          })
        ) : (
          <ParticipantTile 
            participant={{
              id: localUserId,
              name: displayName,
              avatar: avatarUrl,
              isMuted,
              isCameraOn,
              isSelf: true
            }}
            currentUserId={localUserId}
            stream={localStream}
          />
        )}
      </div>

      {/* Controls Bar */}
      <div className="w-full flex justify-center pb-4">
        <VoiceCallBar 
          roomId={channelName} 
          myUserId={localUserId}
          myUsername={displayName} 
          userAvatar={avatarUrl}
          onLeave={handleLeave} 
          onEndCall={handleLeave}
          onStreamUpdate={handleStreamUpdate}
          onRemoteStreamsUpdate={(streams) => setRemoteStreams(streams)}
        />
      </div>
    </div>
  );
}
