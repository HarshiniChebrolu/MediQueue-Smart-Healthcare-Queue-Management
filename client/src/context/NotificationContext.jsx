import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import API from '../services/api';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTurnAlert, setActiveTurnAlert] = useState(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data } = await API.get('/notifications');
      const notifs = data.notifications || [];
      setNotifications(notifs);
      setUnreadCount(data.unreadCount || 0);

      // Check if there is an unacknowledged turn alert call from recent notifications
      const recentTurnAlert = notifs.find(
        (n) => (n.type === 'turn_alert' || n.title === 'YOUR TURN CALL') && !n.isRead
      );
      if (recentTurnAlert && !activeTurnAlert) {
        const notifTime = new Date(recentTurnAlert.createdAt).getTime();
        const ageMs = Date.now() - (isNaN(notifTime) ? Date.now() : notifTime);
        // Only display turn alert modal if notification is less than 2 minutes (120,000ms) old
        if (ageMs < 120000) {
          setActiveTurnAlert({
            tokenNumber: recentTurnAlert.message.match(/token (T\d+)/i)?.[1] || 'Your Token',
            roomNumber: recentTurnAlert.message.match(/Room \d+/i)?.[0] || 'Room 101',
            doctorName: 'Dr. Arthur Pendelton, MD',
            notification: recentTurnAlert,
            calledTime: recentTurnAlert.createdAt,
          });
          playUrgentBellSound();
        } else {
          // Auto mark stale turn alert as read so it doesn't pop up continuously
          markAsRead(recentTurnAlert._id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    if (user && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [user]);

  const sendBrowserDesktopNotification = (title, body) => {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (!socket || !user) return;

    const handleNotification = (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);
      playNotificationSound();
      sendBrowserDesktopNotification(newNotif.title || 'MediQueue Alert', newNotif.message || '');
    };

    const handleTurnAlert = (turnData) => {
      setActiveTurnAlert(turnData);
      playUrgentBellSound();
      sendBrowserDesktopNotification('IT\'S YOUR TURN!', `Please proceed to ${turnData.roomNumber || 'Room 101'} for token ${turnData.tokenNumber}.`);
      fetchNotifications();
    };

    const handleConsultationCompleted = () => {
      setActiveTurnAlert(null);
      fetchNotifications();
    };

    socket.on('notification', handleNotification);
    socket.on('your_turn_alert', handleTurnAlert);
    socket.on('consultation_completed', handleConsultationCompleted);

    return () => {
      socket.off('notification', handleNotification);
      socket.off('your_turn_alert', handleTurnAlert);
      socket.off('consultation_completed', handleConsultationCompleted);
    };
  }, [socket, user]);

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  const playUrgentBellSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);
        gain.gain.setValueAtTime(0.2, now + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.4);
      });
    } catch (e) { }
  };

  const markAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) { }
  };

  const markAllAsRead = async () => {
    try {
      await API.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) { }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        activeTurnAlert,
        setActiveTurnAlert,
        markAsRead,
        markAllAsRead,
        fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
