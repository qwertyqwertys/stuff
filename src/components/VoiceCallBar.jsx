// src/components/VoiceCallBar.jsx
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Mic, MicOff, PhoneOff, Radio, Video, VideoOff } from 'lucide-react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function VoiceCallBar({ 
  roomId = 'General', 
  myUsername = 'You', 
  userAvatar = '',
  onLeave, 
  onEndCall,
  onStreamUpdate 
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState([]);

  const remoteAudioRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const channelRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceCandidatesQueue = useRef([]);

  const handleDisconnect = onLeave || onEndCall;

  // 1. Initialize Microphone Audio independently (Stays running regardless of camera state)
  const initAudioStream = async () => {
    try {
      if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
        return localStreamRef.current;
      }

      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      if (!localStreamRef.current) {
        localStreamRef.current = new MediaStream();
      }

      audioStream.getAudioTracks().forEach((track) => {
        localStreamRef.current.addTrack(track);
      });

      if (onStreamUpdate) {
        onStreamUpdate(localStreamRef.current);
      }

      return localStreamRef.current;
    } catch (err) {
      console.error('Microphone access denied or error:', err);
      return null;
    }
  };

  // 2. Initialize Peer Connection
  const initPeerConnection = async () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;
    iceCandidatesQueue.current = [];

    const stream = localStreamRef.current || (await initAudioStream());

    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    pc.ontrack = (event) => {
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
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
        console.error('ICE Error:', e);
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
    initAudioStream();

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
            payload: { sender: myUsername, avatar: userAvatar, type: 'join-voice' },
          });
        }
      });

    return () => {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: { sender: myUsername, type: 'leave-voice' },
        });
        supabase.removeChannel(channelRef.current);
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [roomId, myUsername]);

  // 3. Toggle Mute without modifying video stream
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextMuteState = !isMuted;
        audioTracks[0].enabled = !nextMuteState;
        setIsMuted(nextMuteState);
      }
    }
  };

  // 4. Toggle Camera independently without stopping microphone audio
  const toggleVideo = async () => {
    const nextVideoState = !isVideoOn;
    setIsVideoOn(nextVideoState);

    if (!localStreamRef.current) {
      await initAudioStream();
    }

    if (nextVideoState) {
      // Add Camera Track
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = videoStream.getVideoTracks()[0];

        if (videoTrack && localStreamRef.current) {
          localStreamRef.current.addTrack(videoTrack);
        }
      } catch (err) {
        console.warn('Camera not available or permission denied:', err);
        setIsVideoOn(false);
      }
    } else {
      // Stop & Remove Camera Track only (Microphone audio remains intact)
      if (localStreamRef.current) {
        const videoTracks = localStreamRef.current.getVideoTracks();
        videoTracks.forEach((track) => {
          track.stop();
          localStreamRef.current.removeTrack(track);
        });
      }
    }

    if (onStreamUpdate && localStreamRef.current) {
      onStreamUpdate(new MediaStream(localStreamRef.current.getTracks()));
    }

    if (peerConnectionRef.current) {
      startCall();
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-zinc-900/95 border border-emerald-500/30 backdrop-blur-xl p-3 rounded-2xl shadow-2xl flex items-center gap-4 text-white">
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
            {connectedUsers.length > 0 ? `${connectedUsers.length + 1} in voice` : '1 in voice'}
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

export default VoiceCallBar;
