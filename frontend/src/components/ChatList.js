import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

export const ChatList = ({ conversations, selectedConversation, onSelectConversation, currentUser }) => {
  const getConversationName = (conversation) => {
    if (conversation.type === 'group' && conversation.name) {
      return conversation.name;
    }
    
    // For direct chats, show the OTHER person's name
    if (conversation.participant_details && conversation.participant_details.length > 0) {
      const otherParticipants = conversation.participant_details.filter(
        p => p.user_id !== currentUser.user_id
      );
      
      if (otherParticipants.length > 0) {
        return otherParticipants[0].name;
      }
    }
    
    return 'Unknown';
  };

  const getConversationAvatar = (conversation) => {
    if (conversation.type === 'group') {
      return conversation.picture ? process.env.REACT_APP_BACKEND_URL + conversation.picture : null;
    }
    
    // For direct chats, show the OTHER person's avatar
    if (conversation.participant_details && conversation.participant_details.length > 0) {
      const otherParticipants = conversation.participant_details.filter(
        p => p.user_id !== currentUser.user_id
      );
      
      if (otherParticipants.length > 0) {
        return otherParticipants[0].picture;
      }
    }
    
    return null;
  };

  const getLastMessagePreview = (conversation) => {
    if (!conversation.last_message) return 'No messages yet';
    const msg = conversation.last_message;
    if (msg.type === 'text') {
      return msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content;
    }
    return `[${msg.type}]`;
  };

  const getFormattedTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      // Parse the timestamp - handle both string and Date object
      const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '';
      }
      
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto" data-testid="chat-list">
      {conversations.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          No conversations yet. Start a new chat!
        </div>
      ) : (
        conversations.map((conv) => {
          const convName = getConversationName(conv);
          const convAvatar = getConversationAvatar(conv);
          
          return (
            <button
              key={conv.conversation_id}
              onClick={() => onSelectConversation(conv)}
              className={`w-full p-4 flex items-start gap-3 hover:bg-accent/5 transition-colors border-b border-border text-left ${
                selectedConversation?.conversation_id === conv.conversation_id ? 'bg-accent/10 border-l-4 border-l-vibgyor-orange' : ''
              }`}
              data-testid={`conversation-item-${conv.conversation_id}`}
            >
              <Avatar className="w-12 h-12 flex-shrink-0">
                <AvatarImage src={convAvatar} alt={convName} />
                <AvatarFallback className="bg-vibgyor-green text-white">
                  {convName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-foreground truncate">{convName}</h3>
                  {conv.last_message_at && (
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                      {getFormattedTime(conv.last_message_at)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {getLastMessagePreview(conv)}
                </p>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
};