// src/hooks/useChatNotifications.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export default function useChatNotifications({ currentUserId, activeChannelId }) {
  const [unreadCounts, setUnreadCounts] = useState({});
  const activeChannelRef = useRef(activeChannelId);

  // Keep ref synced with active channel state
  useEffect(() => {
    activeChannelRef.current = activeChannelId;
    
    // Clear unread count for current channel when opened
    if (activeChannelId) {
      setUnreadCounts((prev) => ({
        ...prev,
        [activeChannelId]: 0,
      }));
    }
  }, [activeChannelId]);

  // Request native browser desktop notification permissions
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  // Self-contained sound effect using Web Audio API (no external mp3 files needed)
  const playNotificationSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5 note

      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {
      console.warn('Audio play blocked by browser policy:', e);
    }
  }, []);

  // Trigger browser popup notification
  const triggerDesktopNotification = useCallback((senderName, text) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification(`New message from ${senderName || 'Someone'}`, {
        body: text || 'Sent a message',
        icon: '/favicon.ico', // path to your app icon
        silent: true, // We handle our own audio chime above
      });

      // Focus tab if user clicks popup
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    }
  }, []);

  // Supabase Realtime Listener
  useEffect(() => {
    if (!currentUserId || !supabase) return;

    // Prompt for browser notification permissions
    requestNotificationPermission();

    const channel = supabase
      .channel('realtime_chat_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages', // your Supabase messages table name
        },
        (payload) => {
          const newMsg = payload.new;
          if (!newMsg) return;

          // Don't notify for your own messages
          if (newMsg.sender_id === currentUserId || newMsg.user_id === currentUserId) {
            return;
          }

          const msgChannelId = newMsg.channel_id || newMsg.room_id || 'global';
          const isCurrentRoom = msgChannelId === activeChannelRef.current;
          const isTabFocused = document.hasFocus();

          // If user is in a different channel OR tabbed out of the browser
          if (!isCurrentRoom || !isTabFocused) {
            // 1. Play sound
            playNotificationSound();

            // 2. Trigger desktop notification
            const senderName = newMsg.sender_name || newMsg.username || 'User';
            triggerDesktopNotification(senderName, newMsg.content || newMsg.text);

            // 3. Increment unread count badge
            setUnreadCounts((prev) => ({
              ...prev,
              [msgChannelId]: (prev[msgChannelId] || 0) + 1,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, requestNotificationPermission, playNotificationSound, triggerDesktopNotification]);

  // Function to manually mark a channel as read
  const markAsRead = useCallback((channelId) => {
    setUnreadCounts((prev) => ({
      ...prev,
      [channelId]: 0,
    }));
  }, []);

  return { unreadCounts, markAsRead, requestNotificationPermission };
}
