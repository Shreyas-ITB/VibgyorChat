import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

export const ChatList = ({ conversations, selectedConversation, onSelectConversation, currentUser }) => {
  const getConversationName = (conversation) => {
    if (conversation.name) return conversation.name;
    if (conversation.participant_details && conversation.participant_details.length > 0) {
      return conversation.participant_details[0].name;
    }
    return 'Unknown';
  };

  const getConversationAvatar = (conversation) => {
    if (conversation.participant_details && conversation.participant_details.length > 0) {
      return conversation.participant_details[0].picture;
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

  return (
    <div className="flex-1 overflow-y-auto" data-testid="chat-list">
      {conversations.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          No conversations yet. Start a new chat!
        </div>
      ) : (
        conversations.map((conv) => (
          <button
            key={conv.conversation_id}
            onClick={() => onSelectConversation(conv)}
            className={`w-full p-4 flex items-start gap-3 hover:bg-accent/5 transition-colors border-b border-border text-left ${
              selectedConversation?.conversation_id === conv.conversation_id ? 'bg-accent/10 border-l-4 border-l-vibgyor-orange' : ''
            }`}
            data-testid={`conversation-item-${conv.conversation_id}`}
          >
            <Avatar className="w-12 h-12 flex-shrink-0">
              <AvatarImage src={getConversationAvatar(conv)} alt={getConversationName(conv)} />
              <AvatarFallback className="bg-vibgyor-green text-white">
                {getConversationName(conv).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium text-foreground truncate">{getConversationName(conv)}</h3>
                {conv.last_message_at && (
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                    {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {getLastMessagePreview(conv)}
              </p>
            </div>
          </button>
        ))
      )}
    </div>
  );
};