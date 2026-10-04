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

  const [sessionKey] = useState(() => `${localUserId}_${Math.random().toString(36).substring(2, 7)}`);

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
  const [isConnected, setIsConnected] = useState(false);

  const roomChannelRef = useRef(null);
  const trackPayloadRef = useRef({});

  // Keep latest presence state in a Ref so background intervals don't use stale state
  useEffect(() => {
    trackPayloadRef.current = {
      id: localUserId,
      sessionKey,
      name: displayName,
      avatar: avatarUrl,
      isMuted,
      isCameraOn,
      joinedAt: new Date().toISOString()
    };
  }, [localUserId, sessionKey, displayName, avatarUrl, isMuted, isCameraOn]);

  useEffect(() => {
    if (!supabase) return;

    let heartbeatTimer = null;

    const syncPresence = () => {
      if (!roomChannelRef.current) return;
      const state = roomChannelRef.current.presenceState();
      const activeUsers = [];

      Object.keys(state).forEach((key) => {
        const presences = state[key];
        if (Array.isArray(presences)) {
          presences.forEach((p) => {
            if (p) activeUsers.push(p);
          });
        }
      });

      setParticipants(activeUsers);
    };

    const trackPresence = async () => {
      if (roomChannelRef.current) {
        try {
          await roomChannelRef.current.track(trackPayloadRef.current);
        } catch (err) {
          console.warn('Presence track error:', err);
        }
      }
    };

    const channel = supabase.channel(`voiceroom_${GLOBAL_ROOM_ID}`, {
      config: { presence: { key: sessionKey } }
    });

    roomChannelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, syncPresence)
      .on('presence', { event: 'join' }, syncPresence)
      .on('presence', { event: 'leave' }, syncPresence)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          await trackPresence();

          // Heartbeat interval to keep presence alive every 10 seconds
          if (heartbeatTimer) clearInterval(heartbeatTimer);
          heartbeatTimer = setInterval(() => {
            if (roomChannelRef.current && isConnected) {
              trackPresence();
            }
          }, 10000);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
        }
      });

    // Auto re-track when coming back from background tab / device sleep
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && roomChannelRef.current) {
        trackPresence();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
      roomChannelRef.current = null;
    };
  }, [sessionKey]);

  // Update presence payload on state changes without re-connecting channel
  useEffect(() => {
    if (roomChannelRef.current && isConnected) {
      roomChannelRef.current.track(trackPayloadRef.current);
    }
  }, [displayName, avatarUrl, isMuted, isCameraOn, isConnected]);

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
      const aIsSelf = a.sessionKey === sessionKey || a.id === localUserId;
      const bIsSelf = b.sessionKey === sessionKey || b.id === localUserId;
      if (aIsSelf) return -1;
      if (bIsSelf) return 1;
      return 0;
    });
  }, [participants, sessionKey, localUserId]);

  return (
    <div className="voice-room relative w-full h-full min-h-screen flex flex-col justify-between p-6 bg-[#0b0e14] text-white">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-white">{channelName}</h2>
          <p className="text-xs text-zinc-400">
            {sortedParticipants.length > 0 ? `${sortedParticipants.length} connected in call` : 'Connecting...'}
          </p>
        </div>
        <span className={`text-xs border px-3 py-1 rounded-full font-semibold ${
          isConnected 
            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 animate-pulse' 
            : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
        }`}>
          {isConnected ? 'Voice Active' : 'Connecting...'}
        </span>
      </div>

      {/* Grid container enforcing identical fixed 16:9 proportions */}
      <div className="participants-grid flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 my-6 items-center justify-center max-w-6xl mx-auto w-full">
        {sortedParticipants.length > 0 ? (
          sortedParticipants.map((participant) => {
            const isSelf = participant.sessionKey === sessionKey || participant.id === localUserId;
            
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
              <div key={participant.sessionKey || participant.id} className="w-full max-w-lg mx-auto aspect-video">
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
