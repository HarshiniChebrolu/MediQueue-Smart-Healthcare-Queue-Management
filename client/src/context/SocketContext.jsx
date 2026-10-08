import React, { createContext, useContext, useEffect, useState } from 'react';
import { socket, updateSocketAuth } from '../services/socket';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    if (user && user.token) {
      updateSocketAuth(user.token);
    }

    function emitRoomJoin() {
      if (!user) return;
      if (user.role === 'patient' && user._id) {
        socket.emit('join_patient_room', user._id);
      } else if (user.role === 'doctor') {
        const doctorId = user.doctor?._id || user._id;
        socket.emit('join_doctor_room', doctorId);
      }
    }

    function onConnect() {
      setIsConnected(true);
      emitRoomJoin();
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) {
      setIsConnected(true);
      emitRoomJoin();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [user]);

  return <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
