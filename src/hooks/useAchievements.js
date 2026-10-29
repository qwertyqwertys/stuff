// src/hooks/useChatNotifications.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export default function useChatNotifications({ currentUserId, activeChannelId }) {
  // Load initial unread counts from localStorage so they survive a refresh
  const [unreadCounts, setUnreadCounts] = useState(() => {
    try {
      const saved = localStorage.getItem('capy-unread-counts');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const activeChannelRef = useRef(activeChannelId);

  // Keep localStorage synced whenever unread counts change
  useEffect(() => {
    try {
      localStorage.setItem('capy-unread-counts', JSON.stringify(unreadCounts));
    } catch (e) {}
  }, [unreadCounts]);

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

  // Self-contained sound effect using Web Audio API
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
      console.warn('Audio play blocked by browser policy:', e);
    }
  }, []);

  // Trigger browser popup notification
  const triggerDesktopNotification = useCallback((senderName, text) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification(`New message from ${senderName || 'Someone'}`, {
        body: text || 'Sent a message',
        icon: '/favicon.ico',
        silent: true,
    });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    }
  }, []);

  // Supabase Realtime Listener
  useEffect(() => {
    if (!currentUserId || !supabase) return;

    requestNotificationPermission();

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
          if (!newMsg) return;

          if (newMsg.sender_id === currentUserId || newMsg.user_id === currentUserId) {
            return;
          }

          const msgChannelId = newMsg.channel_id || newMsg.room_id || 'global';
          const isCurrentRoom = msgChannelId === activeChannelRef.current;
          const isTabFocused = document.hasFocus();

          if (!isCurrentRoom || !isTabFocused) {
            playNotificationSound();
            const senderName = newMsg.sender_name || newMsg.username || 'User';
            triggerDesktopNotification(senderName, newMsg.content || newMsg.text);

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

  const markAsRead = useCallback((channelId) => {
    setUnreadCounts((prev) => ({
      ...prev,
      [channelId]: 0,
    }));
  }, []);

  return { unreadCounts, markAsRead, requestNotificationPermission };
}
