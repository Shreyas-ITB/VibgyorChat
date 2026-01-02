import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Paperclip, Smile, Search, MoreVertical, Image as ImageIcon, Video, File } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { MessageBubble } from './MessageBubble';
import { toast } from 'sonner';
import EmojiPicker from 'emoji-picker-react';
import { useDropzone } from 'react-dropzone';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const ChatView = ({ conversation, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { socket, joinConversation, leaveConversation, sendTyping } = useSocket();

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API}/messages/${conversation.conversation_id}`, {
          withCredentials: true
        });
        setMessages(response.data);
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    if (conversation) {
      fetchMessages();
      joinConversation(conversation.conversation_id);
    }

    return () => {
      if (conversation) {
        leaveConversation(conversation.conversation_id);
      }
    };
  }, [conversation, joinConversation, leaveConversation]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    socket.on('new_message', (message) => {
      if (message.conversation_id === conversation.conversation_id) {
        setMessages(prev => [...prev, message]);
      }
    });

    socket.on('message_edited', (message) => {
      setMessages(prev => prev.map(m => m.message_id === message.message_id ? message : m));
    });

    socket.on('message_deleted', (data) => {
      setMessages(prev => prev.filter(m => m.message_id !== data.message_id));
    });

    socket.on('message_reaction', (message) => {
      setMessages(prev => prev.map(m => m.message_id === message.message_id ? message : m));
    });

    socket.on('user_typing', (data) => {
      if (data.user_id !== currentUser.user_id) {
        if (data.is_typing) {
          setTypingUsers(prev => [...new Set([...prev, data.user_id])]);
        } else {
          setTypingUsers(prev => prev.filter(id => id !== data.user_id));
        }
      }
    });

    return () => {
      socket.off('new_message');
      socket.off('message_edited');
      socket.off('message_deleted');
      socket.off('message_reaction');
      socket.off('user_typing');
    };
  }, [socket, conversation, currentUser]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await axios.post(`${API}/messages/send`, {
        conversation_id: conversation.conversation_id,
        content: newMessage,
        type: 'text'
      }, { withCredentials: true });

      setNewMessage('');
      sendTyping(conversation.conversation_id, false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    sendTyping(conversation.conversation_id, true);

    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(conversation.conversation_id, false);
    }, 1000);
  };

  const handleFileUpload = async (files) => {
    if (files.length === 0) return;
    
    setUploading(true);
    try {
      const file = files[0];
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await axios.post(`${API}/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const fileUrl = uploadResponse.data.file_url;
      let fileType = 'file';
      if (file.type.startsWith('image/')) fileType = 'image';
      else if (file.type.startsWith('video/')) fileType = 'video';

      await axios.post(`${API}/messages/send`, {
        conversation_id: conversation.conversation_id,
        content: file.name,
        type: fileType,
        file_url: fileUrl
      }, { withCredentials: true });

      toast.success('File uploaded');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop: handleFileUpload,
    noClick: true,
    noKeyboard: true
  });

  const handleEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleEditMessage = async (messageId, newContent) => {
    try {
      await axios.put(`${API}/messages/${messageId}`, {
        content: newContent
      }, { withCredentials: true });
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Failed to edit message');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await axios.delete(`${API}/messages/${messageId}`, {
        withCredentials: true
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleReactToMessage = async (messageId, emoji) => {
    try {
      await axios.post(`${API}/messages/${messageId}/react`, {
        emoji
      }, { withCredentials: true });
    } catch (error) {
      console.error('Error reacting to message:', error);
      toast.error('Failed to add reaction');
    }
  };

  const getConversationName = () => {
    if (conversation.name) return conversation.name;
    if (conversation.participant_details && conversation.participant_details.length > 0) {
      return conversation.participant_details[0].name;
    }
    return 'Unknown';
  };

  const filteredMessages = searchQuery
    ? messages.filter(msg => msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <div className="h-full flex flex-col" data-testid="chat-view" {...getRootProps()}>
      <input {...getInputProps()} />
      
      {/* Header */}
      <div className="bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-vibgyor-green text-white flex items-center justify-center font-medium">
            {getConversationName().charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-medium text-foreground" data-testid="chat-header-name">{getConversationName()}</h3>
            {conversation.type === 'group' && (
              <p className="text-sm text-muted-foreground">{conversation.participants.length} members</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 rounded-lg hover:bg-accent/10 transition-colors"
            data-testid="search-messages-button"
          >
            <Search className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="p-2 rounded-lg hover:bg-accent/10 transition-colors">
            <MoreVertical className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="bg-card border-b border-border p-4">
          <input
            type="text"
            placeholder="Search in conversation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-vibgyor-orange text-foreground placeholder:text-muted-foreground"
            data-testid="search-messages-input"
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vibgyor-orange"></div>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {searchQuery ? 'No messages found' : 'No messages yet. Start the conversation!'}
          </div>
        ) : (
          filteredMessages.map((message) => (
            <MessageBubble
              key={message.message_id}
              message={message}
              currentUser={currentUser}
              onEdit={handleEditMessage}
              onDelete={handleDeleteMessage}
              onReact={handleReactToMessage}
            />
          ))
        )}
        {typingUsers.length > 0 && (
          <div className="text-sm text-muted-foreground italic">Someone is typing...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-card border-t border-border p-4">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={handleTyping}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-3 pr-24 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-vibgyor-orange resize-none text-foreground placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              data-testid="message-input"
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 rounded-lg hover:bg-accent/10 transition-colors"
                data-testid="emoji-picker-button"
              >
                <Smile className="w-5 h-5 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={open}
                disabled={uploading}
                className="p-2 rounded-lg hover:bg-accent/10 transition-colors"
                data-testid="file-upload-button"
              >
                {uploading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-vibgyor-orange"></div>
                ) : (
                  <Paperclip className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-3 rounded-full bg-vibgyor-orange text-white hover:bg-vibgyor-orange-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="send-message-button"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>

        {showEmojiPicker && (
          <div className="absolute bottom-20 right-8 z-50">
            <EmojiPicker onEmojiClick={handleEmojiClick} theme="auto" />
          </div>
        )}
      </div>
    </div>
  );
};