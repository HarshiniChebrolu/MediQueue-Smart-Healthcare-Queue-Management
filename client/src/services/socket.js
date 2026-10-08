import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SOCKET_URL || (
  import.meta.env.DEV
    ? `http://${window.location.hostname}:5000`
    : window.location.origin
);

// Get stored token if any for handshake authentication
const getAuthToken = () => {
  try {
    const user = JSON.parse(localStorage.getItem('mediqueue_user'));
    return user?.token || '';
  } catch (e) {
    return '';
  }
};

export const socket = io(URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  auth: {
    token: getAuthToken(),
  },
});

export const updateSocketAuth = (token) => {
  socket.auth = { token };
  if (socket.connected) {
    socket.disconnect().connect();
  }
};
