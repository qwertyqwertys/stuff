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
  onRemoteCameraStatusUpdate // <--- Add this prop
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState([]);

  const channelRef = useRef(null);
  const localStreamRef = useRef(null);
  
  const peerConnectionsRef = useRef({});
  const remoteStreamsRef = useRef({});
  const remoteCameraStatusesRef = useRef({});
  const iceCandidatesQueueRef = useRef({});

  const handleDisconnect = onLeave || onEndCall;

  const initLocalStream = async () => {
    try {
      if (localStreamRef.current) return localStreamRef.current;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: true,
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = false;

      localStreamRef.current = stream;

      Object.values(peerConnectionsRef.current).forEach((pc) => {
        stream.getTracks().forEach((track) => {
          const senders = pc.getSenders();
          if (!senders.some((s) => s.track && s.track.kind === track.kind)) {
            pc.addTrack(track, stream);
          }
        });
      });

      if (onStreamUpdate) onStreamUpdate(stream);
      return stream;
    } catch (err) {
      console.warn('Camera/Mic fallback to audio-only:', err);
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = audioStream;
      if (onStreamUpdate) onStreamUpdate(audioStream);
      return audioStream;
    }
  };

  const getOrCreatePeerConnection = (targetUserId) => {
    if (peerConnectionsRef.current[targetUserId]) return peerConnectionsRef.current[targetUserId];

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current[targetUserId] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.ontrack = (event) => {
      const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
      remoteStreamsRef.current[targetUserId] = stream;
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
    let mounted = true;

    const setupVoice = async () => {
      await initLocalStream();
      if (!mounted) return;

      const channel = supabase.channel(`voice_instant_${roomId}`);
      channelRef.current = channel;

      channel
        .on('broadcast', { event: 'signal' }, async ({ payload }) => {
          if (!payload || payload.senderId === myUserId) return;
          const { senderId, targetId, type, offer, answer, candidate, isVideoOn: remoteVideoState } = payload;
          if (targetId && targetId !== myUserId) return;

          try {
            if (type === 'join-voice') {
              setConnectedUsers((prev) => Array.from(new Set([...prev, senderId])));
              await createAndSendOffer(senderId);
              // Send current camera state back to new joiner
              channel.send({
                type: 'broadcast',
                event: 'signal',
                payload: { senderId: myUserId, targetId: senderId, type: 'camera-status', isVideoOn },
              });
            } else if (type === 'camera-status') {
              remoteCameraStatusesRef.current[senderId] = remoteVideoState;
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

              if (iceCandidatesQueueRef.current[senderId]) {
                for (const cand of iceCandidatesQueueRef.current[senderId]) {
                  await pc.addIceCandidate(new RTCIceCandidate(cand));
                }
                delete iceCandidatesQueueRef.current[senderId];
              }

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
                if (iceCandidatesQueueRef.current[senderId]) {
                  for (const cand of iceCandidatesQueueRef.current[senderId]) {
                    await pc.addIceCandidate(new RTCIceCandidate(cand));
                  }
                  delete iceCandidatesQueueRef.current[senderId];
                }
              }
            } else if (type === 'ice-candidate' && candidate) {
              const pc = peerConnectionsRef.current[senderId];
              if (pc && pc.remoteDescription && pc.remoteDescription.type) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } else {
                if (!iceCandidatesQueueRef.current[senderId]) iceCandidatesQueueRef.current[senderId] = [];
                iceCandidatesQueueRef.current[senderId].push(candidate);
              }
            } else if (type === 'leave-voice') {
              setConnectedUsers((prev) => prev.filter((u) => u !== senderId));
              peerConnectionsRef.current[senderId]?.close();
              delete peerConnectionsRef.current[senderId];
              delete remoteStreamsRef.current[senderId];
              delete remoteCameraStatusesRef.current[senderId];
              if (onRemoteStreamsUpdate) onRemoteStreamsUpdate({ ...remoteStreamsRef.current });
              if (onRemoteCameraStatusUpdate) onRemoteCameraStatusUpdate({ ...remoteCameraStatusesRef.current });
            }
          } catch (err) {
            console.error('Signaling error:', err);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'signal',
              payload: { senderId: myUserId, type: 'join-voice' },
            });
          }
        });
    };

    setupVoice();

    return () => {
      mounted = false;
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: { senderId: myUserId, type: 'leave-voice' },
        });
        supabase.removeChannel(channelRef.current);
      }
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      peerConnectionsRef.current = {};
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [roomId, myUserId]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextMuteState = !isMuted;
        audioTracks[0].enabled = !nextMuteState;
        setIsMuted(nextMuteState);
        if (onStreamUpdate) onStreamUpdate(localStreamRef.current);
      }
    }
  };

  const toggleVideo = async () => {
    if (!localStreamRef.current) await initLocalStream();

    const videoTracks = localStreamRef.current ? localStreamRef.current.getVideoTracks() : [];
    if (videoTracks.length > 0) {
      const nextVideoState = !isVideoOn;
      videoTracks[0].enabled = nextVideoState;
      setIsVideoOn(nextVideoState);

      // Broadcast camera state explicitly so remote clients know whether to show video or avatar
      channelRef.current?.send({
        type: 'broadcast',
        event: 'signal',
        payload: { senderId: myUserId, type: 'camera-status', isVideoOn: nextVideoState },
      });
    }

    if (onStreamUpdate && localStreamRef.current) {
      onStreamUpdate(localStreamRef.current);
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
          onClick={toggleMute}
          className={`p-2 rounded-xl transition-all ${isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/5 hover:bg-white/10 text-zinc-300'}`}
          title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-2 rounded-xl transition-all ${!isVideoOn ? 'bg-white/5 hover:bg-white/10 text-zinc-300' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}
          title={isVideoOn ? 'Turn Off Camera' : 'Turn On Camera'}
        >
          {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
        </button>

        <button
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
