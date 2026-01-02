import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children, user }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    console.log('Initializing Socket.IO connection to:', BACKEND_URL);
    
    const newSocket = io(BACKEND_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected successfully!', newSocket.id);
      setConnected(true);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setConnected(false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      console.log('Closing socket connection');
      newSocket.close();
    };
  }, [user]);

  const joinConversation = useCallback((conversationId) => {
    if (socket && user) {
      socket.emit('join_conversation', {
        conversation_id: conversationId,
        user_id: user.user_id,
      });
    }
  }, [socket, user]);

  const leaveConversation = useCallback((conversationId) => {
    if (socket) {
      socket.emit('leave_conversation', {
        conversation_id: conversationId,
      });
    }
  }, [socket]);

  const sendTyping = useCallback((conversationId, isTyping) => {
    if (socket && user) {
      socket.emit('typing', {
        conversation_id: conversationId,
        user_id: user.user_id,
        is_typing: isTyping,
      });
    }
  }, [socket, user]);

  return (
    <SocketContext.Provider value={{ socket, connected, joinConversation, leaveConversation, sendTyping }}>
      {children}
    </SocketContext.Provider>
  );
};