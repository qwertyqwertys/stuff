// src/components/VoiceCallBar.jsx
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Mic, MicOff, PhoneOff, Radio, Video, VideoOff } from 'lucide-react';

// STUN server configuration with standard port 19302
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export function VoiceCallBar({ roomId = 'General', myUsername = 'You', onLeave, onEndCall }) {
  const [status, setStatus] = useState('Connecting...');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState([]);

  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const channelRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceCandidatesQueue = useRef([]);

  // Supports both onLeave and onEndCall prop names
  const handleDisconnect = onLeave || onEndCall;

  // Request media stream from browser
  const getMediaStream = async (includeVideo = false) => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: includeVideo,
      });
      localStreamRef.current = stream;

      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.warn('Microphone/Camera access error:', err);
      if (includeVideo) {
        return getMediaStream(false);
      }
      return null;
    }
  };

  const initPeerConnection = async () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;
    iceCandidatesQueue.current = [];

    const stream = localStreamRef.current || (await getMediaStream(isVideoOn));

    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    pc.ontrack = (event) => {
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch((e) => console.log('Audio playback delay:', e));
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: { sender: myUsername, type: 'ice-candidate', candidate: event.candidate },
        });
      }
    };

    return pc;
  };

  const processIceQueue = async (pc) => {
    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding queued ICE candidate:', e);
      }
    }
  };

  const startCall = async () => {
    const pc = await initPeerConnection();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: { sender: myUsername, type: 'offer', offer },
      });
    }
  };

  const handleReceiveOffer = async (offer) => {
    const pc = await initPeerConnection();
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    await processIceQueue(pc);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: { sender: myUsername, type: 'answer', answer },
      });
    }
  };

  const handleReceiveAnswer = async (answer) => {
    const pc = peerConnectionRef.current;
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      await processIceQueue(pc);
    }
  };

  useEffect(() => {
    // Request microphone permission on mount
    getMediaStream(false);

    const channel = supabase.channel(`voice_${roomId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'signal' }, async ({ payload }) => {
        if (!payload || payload.sender === myUsername) return;

        if (payload.type === 'join-voice') {
          setConnectedUsers((prev) => Array.from(new Set([...prev, payload.sender])));
          startCall();
        } else if (payload.type === 'offer') {
          await handleReceiveOffer(payload.offer);
        } else if (payload.type === 'answer') {
          await handleReceiveAnswer(payload.answer);
        } else if (payload.type === 'ice-candidate' && payload.candidate) {
          const pc = peerConnectionRef.current;
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } else {
            iceCandidatesQueue.current.push(payload.candidate);
          }
        } else if (payload.type === 'leave-voice') {
          setConnectedUsers((prev) => prev.filter((u) => u !== payload.sender));
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'signal',
            payload: { sender: myUsername, type: 'join-voice' },
          });
          setStatus('Connected');
        }
      });

    return () => {
      leaveVoice();
      supabase.removeChannel(channel);
    };
  }, [roomId, myUsername]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = async () => {
    const nextVideoState = !isVideoOn;
    setIsVideoOn(nextVideoState);

    const stream = await getMediaStream(nextVideoState);
    if (stream && peerConnectionRef.current) {
      const pc = peerConnectionRef.current;
      const senders = pc.getSenders();
      const videoTrack = stream.getVideoTracks()[0];

      const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
      if (videoSender && videoTrack) {
        videoSender.replaceTrack(videoTrack);
      } else if (videoTrack) {
        pc.addTrack(videoTrack, stream);
      }
    }
  };

  const leaveVoice = () => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: { sender: myUsername, type: 'leave-voice' },
      });
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (handleDisconnect) {
      handleDisconnect();
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-zinc-900/95 border border-emerald-500/30 backdrop-blur-xl p-3 rounded-2xl shadow-2xl flex items-center gap-4 text-white">
      <audio ref={localAudioRef} autoPlay muted playsInline />
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-pulse">
          <Radio className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-tight text-emerald-400">Voice Connected</span>
            <span className="text-[10px] text-zinc-400 font-mono">/ {roomId}</span>
          </div>
          <p className="text-[11px] text-zinc-300 font-bold truncate max-w-[140px]">
            {connectedUsers.length > 0 ? `${connectedUsers.length + 1} in voice` : 'Waiting for others...'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
        <button
          onClick={toggleMute}
          className={`p-2 rounded-xl transition-all ${
            isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/5 hover:bg-white/10 text-zinc-300'
          }`}
          title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-2 rounded-xl transition-all ${
            !isVideoOn ? 'bg-white/5 hover:bg-white/10 text-zinc-300' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          }`}
          title={isVideoOn ? 'Turn Off Camera' : 'Turn On Camera'}
        >
          {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
        </button>

        <button
          onClick={leaveVoice}
          className="p-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-transform active:scale-95 shadow-md"
          title="Disconnect Voice"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default VoiceCallBar;
