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

    const newSocket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
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