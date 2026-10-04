// src/components/VoiceRoom.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ParticipantTile from './ParticipantTile';
import VoiceCallBar from './VoiceCallBar';
import { supabase } from '../supabaseClient';
import './VoiceRoom.css';

const GLOBAL_ROOM_ID = 'global-voice-room';

export const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ]
};

export default function VoiceRoom({ 
  currentUser, 
  user,
  username,
  myUsername,
  channelName = 'Global Voice Room', 
  onLeave, 
  onLeaveRoom 
}) {
  const handleLeave = onLeave || onLeaveRoom;

  const [localUserId] = useState(() => {
    const u = currentUser || user;
    if (typeof u === 'object' && u?.id) return u.id;
    const stored = localStorage.getItem('user_id');
    if (stored) return stored;
    const newId = `user_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('user_id', newId);
    return newId;
  });

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

  useEffect(() => {
    const freshName = resolveName();
    if (freshName && freshName !== 'User') {
      setDisplayName(freshName);
    }
  }, [currentUser, user, username, myUsername]);

  useEffect(() => {
    if (!supabase) return;

    const channel = supabase.channel(`voiceroom_${GLOBAL_ROOM_ID}`, {
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
  }, [localUserId]);

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

  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      const aIsSelf = a.id === localUserId || a.id === 'self' || a.id === 'self_user';
      const bIsSelf = b.id === localUserId || b.id === 'self' || b.id === 'self_user';
      if (aIsSelf) return -1;
      if (bIsSelf) return 1;
      return 0;
    });
  }, [participants, localUserId]);

  return (
    <div className="voice-room relative w-full h-full min-h-screen flex flex-col justify-between p-6 bg-[#0b0e14] text-white">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-white">{channelName}</h2>
          <p className="text-xs text-zinc-400">
            {sortedParticipants.length > 0 ? `${sortedParticipants.length} connected in call` : 'Connected'}
          </p>
        </div>
        <span className="text-xs bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-3 py-1 rounded-full font-semibold animate-pulse">
          Voice Active
        </span>
      </div>

      {/* Grid container enforcing identical fixed 16:9 proportions */}
      <div className="participants-grid flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 my-6 items-center justify-center max-w-6xl mx-auto w-full">
        {sortedParticipants.length > 0 ? (
          sortedParticipants.map((participant) => {
            const isSelf = participant.id === localUserId || participant.id === 'self' || participant.id === 'self_user';
            
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
              <div key={participant.id || localUserId} className="w-full max-w-lg mx-auto aspect-video">
                <ParticipantTile 
                  participant={participantData} 
                  user={participantData}
                  currentUserId={localUserId}
                  stream={isSelf ? localStream : remoteStreams[participant.id]}
                />
              </div>
            );
          })
        ) : (
          <div className="w-full max-w-lg mx-auto aspect-video">
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
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="w-full flex justify-center pb-4">
        <VoiceCallBar 
          roomId={GLOBAL_ROOM_ID} 
          myUserId={localUserId}
          myUsername={displayName} 
          userAvatar={avatarUrl}
          rtcConfig={RTC_CONFIG}
          iceServers={RTC_CONFIG.iceServers}
          onLeave={handleLeave} 
          onEndCall={handleLeave}
          onStreamUpdate={handleStreamUpdate}
          onRemoteStreamsUpdate={(streams) => setRemoteStreams(streams)}
        />
      </div>
    </div>
  );
}
