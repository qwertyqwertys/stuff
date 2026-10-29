// src/hooks/useChatNotifications.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export default function useChatNotifications({ currentUserId, activeChannelId }) {
  const [unreadCounts, setUnreadCounts] = useState(() => {
    try {
      const saved = localStorage.getItem('capy-unread-counts');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const activeChannelRef = useRef(activeChannelId);

  useEffect(() => {
    try {
      localStorage.setItem('capy-unread-counts', JSON.stringify(unreadCounts));
    } catch (e) {}
  }, [unreadCounts]);

  useEffect(() => {
    activeChannelRef.current = activeChannelId;
    
    if (activeChannelId) {
      setUnreadCounts((prev) => ({
        ...prev,
        [activeChannelId]: 0,
      }));
    }
  }, [activeChannelId]);

  const playNotificationSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); 
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); 

      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {
      console.warn('Audio play blocked:', e);
    }
  }, []);

  useEffect(() => {
    console.log("Chat notification hook active. currentUserId:", currentUserId);

    if (!supabase) {
      console.error("Supabase client missing in notification hook!");
      return;
    }

    const channel = supabase
      .channel('realtime_chat_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new;
          console.log("Realtime message detected:", newMsg);

          if (!newMsg) return;

          // Check if message belongs to current user
          const isOwnMessage = 
            (currentUserId && (newMsg.sender_id === currentUserId || newMsg.user_id === currentUserId)) ||
            (newMsg.username && newMsg.username === localStorage.getItem('capy-username'));

          if (isOwnMessage) {
            console.log("Ignored own message.");
            return;
          }

          const msgChannelId = newMsg.channel_id || newMsg.room_id || 'global';
          const isCurrentRoom = msgChannelId === activeChannelRef.current;

          if (!isCurrentRoom) {
            console.log("Incrementing unread badge for channel:", msgChannelId);
            playNotificationSound();

            setUnreadCounts((prev) => ({
              ...prev,
              [msgChannelId]: (prev[msgChannelId] || 0) + 1,
            }));
          }
        }
      )
      .subscribe((status) => {
        console.log("Supabase notification subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, playNotificationSound]);

  const markAsRead = useCallback((channelId) => {
    setUnreadCounts((prev) => ({
      ...prev,
      [channelId]: 0,
    }));
  }, []);

  return { unreadCounts, markAsRead };
}
