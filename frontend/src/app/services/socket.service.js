import angular from 'angular';
import { io } from 'socket.io-client';
import '../../app.module.js'; // Ensure the module is loaded

angular.module('vibgyorChat').factory('SocketService', ['$rootScope', 'AuthService', 'ChatService', function($rootScope, AuthService, ChatService) {
  const SOCKET_BASE = window.APP_CONFIG.SOCKET_BASE_URL;

  let socket = null;
  let typingTimeout = null;

  const service = {
    connect: function() {
      const token = AuthService.getToken();

      if (!token) {
        console.error('No access token available for socket connection');
        return;
      }

      // Disconnect existing socket if any
      if (socket) {
        socket.disconnect();
      }

      socket = io(SOCKET_BASE, {
        transports: ['polling'],
        path: '/ws/socket.io',
        auth: {
          access_token: token
        },
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      socket.on('connect', function() {
        console.log('Socket connected:', socket.id);
      });

      socket.on('connect_error', function(err) {
        console.error('Socket connection error:', err.message);
        
        // If authentication fails, try to refresh token
        if (err.message.includes('Authentication') || err.message.includes('Unauthorized')) {
          AuthService.refreshToken().then(function(newToken) {
            console.log('Token refreshed, reconnecting socket...');
            service.connect(); // Reconnect with new token
          }).catch(function(error) {
            console.error('Token refresh failed:', error);
            // Redirect to login if token refresh fails
            AuthService.logout();
          });
        }
      });

      socket.on('disconnect', function(reason) {
        console.log('Socket disconnected:', reason);
        
        // Auto-reconnect on unexpected disconnections
        if (reason === 'io server disconnect' || reason === 'transport close') {
          console.log('Attempting to reconnect...');
          setTimeout(function() {
            if (!socket || !socket.connected) {
              service.connect();
            }
          }, 2000);
        }
      });

      socket.on('new_message', function(data) {
        $rootScope.$apply(function() {
          $rootScope.$broadcast('message:new', data);
        });
      });

      socket.on('message_edited', function(data) {
        $rootScope.$apply(function() {
          $rootScope.$broadcast('message:updated', {
            conversation_id: data.conversation_id,
            message_id: data.message_id,
            updates: {
              content: data.content,
              edited: true
            }
          });
        });
      });

      socket.on('message_deleted', function(data) {
        $rootScope.$apply(function() {
          $rootScope.$broadcast('message:deleted', {
            conversation_id: data.conversation_id,
            message_id: data.message_id
          });
        });
      });

      socket.on('message_pinned', function(data) {
        $rootScope.$apply(function() {
          $rootScope.$broadcast('message:updated', {
            conversation_id: data.conversation_id,
            message_id: data.message_id,
            updates: {
              pinned: data.pinned
            }
          });
        });
      });

      socket.on('presence', function(data) {
        $rootScope.$broadcast('user:presence', data);
      });

      socket.on('typing', function(data) {
        $rootScope.$broadcast('user:typing', data);
      });

      socket.on('stop_typing', function(data) {
        $rootScope.$broadcast('user:stop_typing', data);
      });
    },

    disconnect: function() {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    },

    reconnect: function() {
      // Reconnect with fresh token
      service.connect();
    },

    isConnected: function() {
      return socket && socket.connected;
    },

    sendMessage: function(conversationId, content, type = 'text', fileName = null, fileData = null, replyTo = null) {
      if (socket && socket.connected) {
        const messageData = {
          conversation_id: conversationId,
          content: content,
          type: type,
          file_name: fileName,
          file_data: fileData,
          reply_to: replyTo
        };
        
        console.log('Sending message:', messageData);
        socket.emit('send_message', messageData);
      } else {
        console.error('Socket not connected. Cannot send message.');
      }
    },

    sendTextMessage: function(conversationId, content, replyTo = null) {
      service.sendMessage(conversationId, content, 'text', null, null, replyTo);
    },

    sendImageMessage: function(conversationId, fileName, fileData) {
      // Check connection before sending
      if (!service.isConnected()) {
        console.warn('Socket not connected, attempting to reconnect...');
        service.reconnect();
        // Wait a moment for reconnection
        setTimeout(function() {
          if (service.isConnected()) {
            service.sendMessage(conversationId, null, 'image', fileName, fileData);
          } else {
            console.error('Failed to reconnect socket for image message');
          }
        }, 1000);
      } else {
        service.sendMessage(conversationId, null, 'image', fileName, fileData);
      }
    },

    sendFileMessage: function(conversationId, fileName, fileData) {
      // Check connection before sending
      if (!service.isConnected()) {
        console.warn('Socket not connected, attempting to reconnect...');
        service.reconnect();
        // Wait a moment for reconnection
        setTimeout(function() {
          if (service.isConnected()) {
            service.sendMessage(conversationId, null, 'file', fileName, fileData);
          } else {
            console.error('Failed to reconnect socket for file message');
          }
        }, 1000);
      } else {
        service.sendMessage(conversationId, null, 'file', fileName, fileData);
      }
    },

    joinConversation: function(conversationId) {
      if (socket && socket.connected) {
        socket.emit('join_conversation', {
          conversation_id: conversationId
        });
        console.log('Joined conversation:', conversationId);
      } else {
        console.error('Socket not connected. Cannot join conversation.');
      }
    },

    editMessage: function(messageId, content) {
      if (socket && socket.connected) {
        socket.emit('edit_message', {
          message_id: messageId,
          new_content: content
        });
      } else {
        console.error('Socket not connected. Cannot edit message.');
      }
    },

    deleteMessage: function(messageId) {
      if (socket && socket.connected) {
        socket.emit('delete_message', {
          message_id: messageId
        });
      } else {
        console.error('Socket not connected. Cannot delete message.');
      }
    },

    togglePinMessage: function(messageId) {
      if (socket && socket.connected) {
        socket.emit('toggle_pin_message', {
          message_id: messageId
        });
      } else {
        console.error('Socket not connected. Cannot toggle pin message.');
      }
    },

    startTyping: function(conversationId) {
      if (socket && socket.connected) {
        socket.emit('typing', {
          conversation_id: conversationId
        });

        if (typingTimeout) {
          clearTimeout(typingTimeout);
        }

        typingTimeout = setTimeout(function() {
          service.stopTyping(conversationId);
        }, 3000);
      }
    },

    stopTyping: function(conversationId) {
      if (socket && socket.connected) {
        socket.emit('stop_typing', {
          conversation_id: conversationId
        });

        if (typingTimeout) {
          clearTimeout(typingTimeout);
          typingTimeout = null;
        }
      }
    }
  };

  // Listen for token updates and reconnect socket
  $rootScope.$on('auth:tokenUpdated', function() {
    if (socket) {
      console.log('Token updated, reconnecting socket...');
      service.reconnect();
    }
  });

  // Listen for token cleared and disconnect socket
  $rootScope.$on('auth:tokenCleared', function() {
    console.log('Tokens cleared, disconnecting socket...');
    service.disconnect();
  });

  return service;
}]);
