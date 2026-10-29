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
      setUnreadCounts((prev) => {
        const updated = { ...prev, [activeChannelId]: 0 };
        try {
          localStorage.setItem('capy-unread-counts', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
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

  useEffect(() => {
    if (!supabase) return;

    const myUsername = localStorage.getItem('capy-display-name') || localStorage.getItem('username');

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

          console.log("Realtime message received:", newMsg);

          const isOwnMessage = 
            (newMsg.username && newMsg.username === myUsername) ||
            (currentUserId && (newMsg.sender_id === currentUserId || newMsg.user_id === currentUserId));

          if (isOwnMessage) {
            console.log("Ignored message sent by self.");
            return;
          }

          const msgChannelId = newMsg.channel_id || newMsg.room_id || 'global';
          const isCurrentRoom = msgChannelId === activeChannelRef.current;

          if (!isCurrentRoom) {
            console.log("Incrementing unread count!");
            playNotificationSound();
            triggerDesktopNotification(newMsg.username || 'User', newMsg.content || newMsg.text);

            setUnreadCounts((prev) => {
              const updated = {
                ...prev,
                [msgChannelId]: (prev[msgChannelId] || 0) + 1,
              };
              try {
                localStorage.setItem('capy-unread-counts', JSON.stringify(updated));
              } catch (e) {}
              return updated;
            });
          }
        }
      )
      .subscribe((status) => {
        console.log("Notification Listener Status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, playNotificationSound, triggerDesktopNotification]);

  const markAsRead = useCallback((channelId) => {
    setUnreadCounts((prev) => {
      const updated = {
        ...prev,
        [channelId]: 0,
      };
      try {
        localStorage.setItem('capy-unread-counts', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  return { unreadCounts, markAsRead };
}
