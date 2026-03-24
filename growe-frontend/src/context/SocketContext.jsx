import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  return ctx;
};

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');

  useEffect(() => {
    if (!user?.id) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setConnectionState('disconnected');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const s = io(window.location.origin, {
      auth: { token },
      path: '/socket.io',
    });

    s.on('connect', () => {
      setConnectionState('connected');
    });

    s.on('disconnect', (reason) => {
      setConnectionState(reason === 'io server disconnect' ? 'disconnected' : 'reconnecting');
    });

    s.on('connect_error', () => {
      setConnectionState('reconnecting');
    });

    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
      setConnectionState('disconnected');
    };
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{ socket, connectionState }}>
      {children}
    </SocketContext.Provider>
  );
};
