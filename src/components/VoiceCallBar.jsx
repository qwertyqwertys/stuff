// src/components/VoiceCallBar.jsx
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Mic, MicOff, PhoneOff, Radio, Video, VideoOff } from 'lucide-react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export default function VoiceCallBar({ 
  roomId = 'General', 
  myUserId,
  myUsername = 'You', 
  userAvatar = '',
  onLeave, 
  onEndCall,
  onStreamUpdate,
  onRemoteStreamsUpdate,
  onRemoteCameraStatusUpdate
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState([]);

  const channelRef = useRef(null);
  const localStreamRef = useRef(null);
  
  const peerConnectionsRef = useRef({});
  const pendingCandidatesRef = useRef({});
  const remoteStreamsRef = useRef({});
  const remoteCameraStatusesRef = useRef({});
  const isSetupDoneRef = useRef(false);

  const isVideoOnRef = useRef(isVideoOn);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    isVideoOnRef.current = isVideoOn;
  }, [isVideoOn]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const handleDisconnect = onLeave || onEndCall;

  const flushPendingCandidates = async (peerId, pc) => {
    const queue = pendingCandidatesRef.current[peerId];
    if (!queue || !queue.length || !pc.remoteDescription?.type) return;
    pendingCandidatesRef.current[peerId] = [];
    for (const cand of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.warn('Queued ICE candidate error:', err);
      }
    }
  };

  const initLocalStream = async () => {
    if (localStreamRef.current) return localStreamRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });

      localStreamRef.current = stream;
      if (onStreamUpdate) onStreamUpdate(new MediaStream(stream.getTracks()));
      return stream;
    } catch (err) {
      console.warn('Microphone permission error:', err);
      return null;
    }
  };

  const getOrCreatePeerConnection = (targetUserId) => {
    if (peerConnectionsRef.current[targetUserId]) {
      return peerConnectionsRef.current[targetUserId];
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current[targetUserId] = pc;
    pendingCandidatesRef.current[targetUserId] = pendingCandidatesRef.current[targetUserId] || [];

    if (localStreamRef.current) {
      const existingSenders = pc.getSenders().map((s) => s.track?.id).filter(Boolean);
      localStreamRef.current.getTracks().forEach((track) => {
        if (!existingSenders.includes(track.id)) {
          pc.addTrack(track, localStreamRef.current);
        }
      });
    }

    pc.ontrack = (event) => {
      const currentStream = remoteStreamsRef.current[targetUserId];
      const tracks = currentStream ? [...currentStream.getTracks()] : [];

      const filtered = tracks.filter((t) => t.kind !== event.track.kind);
      filtered.push(event.track);

      const freshStream = new MediaStream(filtered);
      remoteStreamsRef.current[targetUserId] = freshStream;

      event.track.onunmute = () => {
        remoteStreamsRef.current[targetUserId] = new MediaStream(
          remoteStreamsRef.current[targetUserId].getTracks()
        );
        if (onRemoteStreamsUpdate) onRemoteStreamsUpdate({ ...remoteStreamsRef.current });
      };

      if (onRemoteStreamsUpdate) onRemoteStreamsUpdate({ ...remoteStreamsRef.current });
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: { senderId: myUserId, targetId: targetUserId, type: 'ice-candidate', candidate: event.candidate },
        });
      }
    };

    return pc;
  };

  const createAndSendOffer = async (targetUserId) => {
    try {
      const pc = getOrCreatePeerConnection(targetUserId);
      if (pc.signalingState !== 'stable') return;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      channelRef.current?.send({
        type: 'broadcast',
        event: 'signal',
        payload: { senderId: myUserId, targetId: targetUserId, type: 'offer', offer },
      });
    } catch (err) {
      console.error('Offer error:', err);
    }
  };

  useEffect(() => {
    if (isSetupDoneRef.current) return;
    isSetupDoneRef.current = true;

    let isMounted = true;

    const startSession = async () => {
      await initLocalStream();
      if (!isMounted) return;

      const channel = supabase.channel(`voice_instant_${roomId}`);
      channelRef.current = channel;

      channel
        .on('broadcast', { event: 'signal' }, async ({ payload }) => {
          if (!payload || payload.senderId === myUserId) return;
          const { senderId, targetId, type, offer, answer, candidate, isVideoOn: remoteVideoState, name: remoteName, avatar: remoteAvatar, isMuted: remoteMuteState } = payload;
          if (targetId && targetId !== myUserId) return;

          try {
            if (type === 'join-voice') {
              setConnectedUsers((prev) => Array.from(new Set([...prev, senderId])));
              
              if (remoteName) remoteCameraStatusesRef.current[`name_${senderId}`] = remoteName;
              if (remoteAvatar) remoteCameraStatusesRef.current[`avatar_${senderId}`] = remoteAvatar;
              if (onRemoteCameraStatusUpdate) {
                onRemoteCameraStatusUpdate({ ...remoteCameraStatusesRef.current });
              }

              await createAndSendOffer(senderId);
              
              channel.send({
                type: 'broadcast',
                event: 'signal',
                payload: {
                  senderId: myUserId,
                  type: 'camera-status',
                  isVideoOn: isVideoOnRef.current,
                  isMuted: isMutedRef.current,
                  name: myUsername,
                  avatar: userAvatar
                },
              });
            } else if (type === 'camera-status') {
              remoteCameraStatusesRef.current[senderId] = Boolean(remoteVideoState);
              if (remoteName) remoteCameraStatusesRef.current[`name_${senderId}`] = remoteName;
              if (remoteAvatar) remoteCameraStatusesRef.current[`avatar_${senderId}`] = remoteAvatar;

              if (onRemoteCameraStatusUpdate) {
                onRemoteCameraStatusUpdate({ ...remoteCameraStatusesRef.current });
              }
            } else if (type === 'mute-status') {
              remoteCameraStatusesRef.current[`mute_${senderId}`] = Boolean(remoteMuteState);
              if (onRemoteCameraStatusUpdate) {
                onRemoteCameraStatusUpdate({ ...remoteCameraStatusesRef.current });
              }
            } else if (type === 'offer') {
              const pc = getOrCreatePeerConnection(senderId);
              if (pc.signalingState !== 'stable') {
                if (senderId < myUserId) await pc.setLocalDescription({ type: 'rollback' });
                else return;
              }
              await pc.setRemoteDescription(new RTCSessionDescription(offer));
              await flushPendingCandidates(senderId, pc);

              const createdAnswer = await pc.createAnswer();
              await pc.setLocalDescription(createdAnswer);

              channel.send({
                type: 'broadcast',
                event: 'signal',
                payload: { senderId: myUserId, targetId: senderId, type: 'answer', answer: createdAnswer },
              });
            } else if (type === 'answer') {
              const pc = peerConnectionsRef.current[senderId];
              if (pc && pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
                await flushPendingCandidates(senderId, pc);
              }
            } else if (type === 'ice-candidate' && candidate) {
              const pc = peerConnectionsRef.current[senderId];
              if (pc && pc.remoteDescription && pc.remoteDescription.type) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } else {
                pendingCandidatesRef.current[senderId] = pendingCandidatesRef.current[senderId] || [];
                pendingCandidatesRef.current[senderId].push(candidate);
              }
            } else if (type === 'leave-voice') {
              setConnectedUsers((prev) => prev.filter((u) => u !== senderId));
              peerConnectionsRef.current[senderId]?.close();
              delete peerConnectionsRef.current[senderId];
              delete pendingCandidatesRef.current[senderId];
              delete remoteStreamsRef.current[senderId];
              delete remoteCameraStatusesRef.current[senderId];
              delete remoteCameraStatusesRef.current[`name_${senderId}`];
              delete remoteCameraStatusesRef.current[`avatar_${senderId}`];
              delete remoteCameraStatusesRef.current[`mute_${senderId}`];
              if (onRemoteStreamsUpdate) onRemoteStreamsUpdate({ ...remoteStreamsRef.current });
              if (onRemoteCameraStatusUpdate) onRemoteCameraStatusUpdate({ ...remoteCameraStatusesRef.current });
            }
          } catch (err) {
            console.error('Signaling processing error:', err);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'signal',
              payload: { senderId: myUserId, type: 'join-voice', name: myUsername, avatar: userAvatar },
            });
          }
        });
    };

    startSession();

    return () => {
      isMounted = false;
      isSetupDoneRef.current = false;

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: { senderId: myUserId, type: 'leave-voice' },
        });
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      peerConnectionsRef.current = {};
      pendingCandidatesRef.current = {};
      remoteStreamsRef.current = {};
      remoteCameraStatusesRef.current = {};
    };
  }, [roomId, myUserId, myUsername, userAvatar]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextMuteState = !isMuted;
        audioTracks[0].enabled = !nextMuteState;
        setIsMuted(nextMuteState);

        channelRef.current?.send({
          type: 'broadcast',
          event: 'signal',
          payload: { 
            senderId: myUserId, 
            type: 'mute-status', 
            isMuted: nextMuteState 
          },
        });

        if (onStreamUpdate) onStreamUpdate(new MediaStream(localStreamRef.current.getTracks()));
      }
    }
  };

  const toggleVideo = async () => {
    try {
      let videoTrack = localStreamRef.current?.getVideoTracks()[0];

      if (!videoTrack) {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoTrack = videoStream.getVideoTracks()[0];

        if (localStreamRef.current) {
          localStreamRef.current.addTrack(videoTrack);
        } else {
          localStreamRef.current = videoStream;
        }

        for (const [targetUserId, pc] of Object.entries(peerConnectionsRef.current)) {
          const alreadySending = pc.getSenders().some((s) => s.track?.id === videoTrack.id);
          if (!alreadySending) {
            pc.addTrack(videoTrack, localStreamRef.current);
          }
          await createAndSendOffer(targetUserId);
        }
        
        videoTrack.enabled = true;
        setIsVideoOn(true);
      } else {
        const nextState = !videoTrack.enabled;
        videoTrack.enabled = nextState;
        setIsVideoOn(nextState);
      }

      const activeVideoState = videoTrack.enabled;

      channelRef.current?.send({
        type: 'broadcast',
        event: 'signal',
        payload: { senderId: myUserId, type: 'camera-status', isVideoOn: activeVideoState, name: myUsername, avatar: userAvatar },
      });

      if (onStreamUpdate && localStreamRef.current) {
        onStreamUpdate(new MediaStream(localStreamRef.current.getTracks()));
      }
    } catch (err) {
      console.error('Toggle video error:', err);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-zinc-900/95 border border-emerald-500/30 backdrop-blur-xl p-3 rounded-2xl shadow-2xl flex items-center gap-4 text-white">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-pulse">
          <Radio className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-tight text-emerald-400">Instant Connected</span>
            <span className="text-[10px] text-zinc-400 font-mono">/ {roomId}</span>
          </div>
          <p className="text-[11px] text-zinc-300 font-bold truncate max-w-[140px]">
            {connectedUsers.length > 0 ? `${connectedUsers.length + 1} in voice` : '1 in voice'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
        <button
          type="button"
          onClick={toggleMute}
          className={`p-2 rounded-xl transition-all ${isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/5 hover:bg-white/10 text-zinc-300'}`}
          title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={toggleVideo}
          className={`p-2 rounded-xl transition-all ${!isVideoOn ? 'bg-white/5 hover:bg-white/10 text-zinc-300' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}
          title={isVideoOn ? 'Turn Off Camera' : 'Turn On Camera'}
        >
          {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={handleDisconnect}
          className="p-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-transform active:scale-95 shadow-md"
          title="Disconnect Voice"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
