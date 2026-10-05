// src/components/VoiceRoom.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ParticipantTile from './ParticipantTile';
import VoiceCallBar from './VoiceCallBar';
import { supabase } from '../supabaseClient';
import './VoiceRoom.css';

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

  // Standardize the room ID slug from the channelName prop to ensure consistency across devices
  const ROOM_SLUG = useMemo(() => {
    return (channelName || 'global-voice-room')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');
  }, [channelName]);

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

  const [displayName] = useState(resolveName);
  const [avatarUrl] = useState(() => {
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

  // Sync state whenever local stream changes
  const handleStreamUpdate = (stream) => {
    setLocalStream(stream);
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      setIsCameraOn(Boolean(videoTrack && videoTrack.enabled && videoTrack.readyState === 'live'));
      setIsMuted(Boolean(audioTrack && !audioTrack.enabled));
    } else {
      setIsCameraOn(false);
    }
  };

  // Toggle camera using track.enabled
  const toggleCamera = async () => {
    if (localStream && localStream.getVideoTracks().length > 0) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (isCameraOn) {
        videoTrack.enabled = false;
        setIsCameraOn(false);
      } else {
        videoTrack.enabled = true;
        setIsCameraOn(true);
      }
    } else {
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = cameraStream.getVideoTracks()[0];
        
        if (localStream) {
          localStream.addTrack(videoTrack);
          setLocalStream(new MediaStream(localStream.getTracks()));
        } else {
          setLocalStream(cameraStream);
        }
        setIsCameraOn(true);
      } catch (err) {
        console.error('Failed to enable camera:', err);
      }
    }
  };

  // Clean up all hardware media tracks when leaving the voice room completely
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [localStream]);

  // Keep latest presence state in Ref
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

    const channel = supabase.channel(`voiceroom_${ROOM_SLUG}`, {
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

    return () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      supabase.removeChannel(channel);
      roomChannelRef.current = null;
    };
  }, [ROOM_SLUG, sessionKey]);

  // Broadcast presence updates when camera/mute toggles
  useEffect(() => {
    if (roomChannelRef.current && isConnected) {
      roomChannelRef.current.track(trackPayloadRef.current);
    }
  }, [displayName, avatarUrl, isMuted, isCameraOn, isConnected]);

  // De-duplicate participants based on localUserId or remote user id so self only appears once
  const sortedParticipants = useMemo(() => {
    const map = new Map();
    
    // 1. Inject the local user entry explicitly using localUserId as the unique primary key
    const selfParticipant = {
      id: localUserId,
      sessionKey,
      name: displayName,
      avatar: avatarUrl,
      isMuted,
      isCameraOn,
      isSelf: true
    };
    map.set(localUserId, selfParticipant);

    // 2. Iterate through incoming presence participants from Supabase
    participants.forEach((p) => {
      const pId = p.id || p.sessionKey;
      if (!pId) return;

      // If this presence record matches our own localUserId, skip adding it as a duplicate 
      // (unless it's a completely different tab/session, but on the same device localUserId matches)
      if (pId === localUserId || p.sessionKey === sessionKey) {
        return; 
      }

      // For remote participants, map them uniquely by their user id
      if (!map.has(pId)) {
        map.set(pId, p);
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const aIsSelf = a.id === localUserId || a.sessionKey === sessionKey;
      const bIsSelf = b.id === localUserId || b.sessionKey === sessionKey;
      if (aIsSelf) return -1;
      if (bIsSelf) return 1;
      return 0;
    });
  }, [participants, sessionKey, localUserId, displayName, avatarUrl, isMuted, isCameraOn]);

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

      {/* Grid container */}
      <div className="participants-grid flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 my-6 items-center justify-center max-w-6xl mx-auto w-full">
        {sortedParticipants.map((participant) => {
          const isSelf = participant.id === localUserId || participant.sessionKey === sessionKey;
          
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
            <div key={participant.id || participant.sessionKey} className="w-full max-w-lg mx-auto aspect-video">
              <ParticipantTile 
                participant={participantData} 
                user={participantData}
                currentUserId={localUserId}
                stream={isSelf ? localStream : remoteStreams[participant.id]}
              />
            </div>
          );
        })}
      </div>

      {/* Controls Bar */}
      <div className="w-full flex justify-center pb-4">
        <VoiceCallBar 
          roomId={ROOM_SLUG} 
          myUserId={localUserId}
          myUsername={displayName} 
          userAvatar={avatarUrl}
          rtcConfig={RTC_CONFIG}
          isCameraOn={isCameraOn}
          isMuted={isMuted}
          onToggleCamera={toggleCamera}
          onLeave={handleLeave} 
          onEndCall={handleLeave}
          onStreamUpdate={handleStreamUpdate}
          onRemoteStreamsUpdate={(streams) => setRemoteStreams(streams)}
        />
      </div>
    </div>
  );
}
