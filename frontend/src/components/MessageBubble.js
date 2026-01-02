import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Edit2, Trash2, MoreVertical } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const MessageBubble = ({ message, currentUser, onEdit, onDelete, onReact, conversationId }) => {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showReactions, setShowReactions] = useState(false);
  const [roles, setRoles] = useState([]);

  const isSent = message.sender_id === currentUser.user_id;

  // Fetch roles for mention highlighting
  useEffect(() => {
    if (conversationId && message.content.includes('@')) {
      fetchRoles();
    }
  }, [conversationId, message.content]);

  const fetchRoles = async () => {
    try {
      const response = await axios.get(`${API}/groups/${conversationId}/roles`, {
        withCredentials: true
      });
      setRoles(response.data);
    } catch (error) {
      // Not a group or no roles
      setRoles([]);
    }
  };

  const handleEdit = async () => {
    if (editContent.trim() && editContent !== message.content) {
      await onEdit(message.message_id, editContent);
    }
    setIsEditing(false);
  };

  const handleReact = (emoji) => {
    onReact(message.message_id, emoji);
    setShowReactions(false);
  };

  const renderContent = () => {
    if (message.type === 'image') {
      return (
        <div className="max-w-sm">
          <img 
            src={`${BACKEND_URL}${message.file_url}`} 
            alt={message.content} 
            className="rounded-lg w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(`${BACKEND_URL}${message.file_url}`, '_blank')}
            onError={(e) => {
              console.error('Image load error:', e);
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <div style={{ display: 'none' }} className="text-red-500 text-sm">Failed to load image</div>
          {message.content && <p className="mt-2 text-sm">{message.content}</p>}
        </div>
      );
    }

    if (message.type === 'video') {
      return (
        <div className="max-w-sm">
          <video src={`${BACKEND_URL}${message.file_url}`} controls className="rounded-lg w-full" />
          {message.content && <p className="mt-2 text-sm">{message.content}</p>}
        </div>
      );
    }

    if (message.type === 'file') {
      return (
        <a
          href={`${BACKEND_URL}${message.file_url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:underline"
        >
          <span>📎</span>
          <span>{message.content}</span>
        </a>
      );
    }

    // Parse @mentions with role colors
    const content = message.content;
    const mentionRegex = /@(\w+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      
      const mentionName = match[1].toLowerCase();
      
      // Check if it's a role mention
      const role = roles.find(r => r.role_name.toLowerCase() === mentionName);
      
      if (role) {
        // Highlight with role color
        parts.push(
          <span 
            key={match.index} 
            className="px-2 py-0.5 rounded font-medium"
            style={{ 
              backgroundColor: role.color + '30', // 30 is for transparency
              color: role.color,
              border: `1px solid ${role.color}`
            }}
          >
            @{match[1]}
          </span>
        );
      } else {
        // Regular mention (user or @everyone)
        parts.push(
          <span 
            key={match.index} 
            className="bg-vibgyor-orange/20 text-vibgyor-orange px-2 py-0.5 rounded font-medium border border-vibgyor-orange/40"
          >
            @{match[1]}
          </span>
        );
      }
      
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return <div className="whitespace-pre-wrap break-words">{parts.length > 0 ? parts : content}</div>;
  };

  return (
    <div
      className={`flex items-start gap-3 ${isSent ? 'flex-row-reverse' : 'flex-row'}`}
      data-testid={`message-${message.message_id}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!isSent && message.sender && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={message.sender.picture} alt={message.sender.name} />
          <AvatarFallback className="bg-vibgyor-green text-white text-sm">
            {message.sender.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`flex flex-col ${isSent ? 'items-end' : 'items-start'} max-w-[70%]`}>
        {!isSent && message.sender && (
          <span className="text-xs text-muted-foreground mb-1">{message.sender.name}</span>
        )}

        <div className="relative group">
          {isEditing ? (
            <div className={`${isSent ? 'bg-vibgyor-orange' : 'bg-white dark:bg-card'} rounded-2xl ${isSent ? 'rounded-tr-sm' : 'rounded-tl-sm'} px-4 py-2 shadow-sm border border-border`}>
              <input
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEdit();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                onBlur={handleEdit}
                autoFocus
                className="bg-transparent border-none outline-none text-foreground w-full"
                data-testid="edit-message-input"
              />
            </div>
          ) : (
            <div
              className={`${
                isSent
                  ? 'bg-vibgyor-orange text-white'
                  : 'bg-white dark:bg-card border border-border text-foreground'
              } rounded-2xl ${isSent ? 'rounded-tr-sm' : 'rounded-tl-sm'} px-4 py-2 shadow-sm`}
            >
              {renderContent()}
            </div>
          )}

          {showActions && !isEditing && (
            <div className={`absolute top-0 ${isSent ? 'right-full mr-2' : 'left-full ml-2'} flex items-center gap-1`}>
              <button
                onClick={() => setShowReactions(!showReactions)}
                className="p-1 rounded hover:bg-accent/10 transition-colors"
                data-testid="react-button"
              >
                😊
              </button>
              {isSent && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 rounded hover:bg-accent/10 transition-colors"
                    data-testid="edit-message-button"
                  >
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => onDelete(message.message_id)}
                    className="p-1 rounded hover:bg-accent/10 transition-colors"
                    data-testid="delete-message-button"
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                </>
              )}
            </div>
          )}

          {showReactions && (
            <div className="absolute top-full mt-2 bg-card border border-border rounded-lg shadow-lg p-2 flex gap-2 z-10">
              {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className="text-2xl hover:scale-125 transition-transform"
                  data-testid={`reaction-${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reactions */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="flex gap-1 mt-1">
            {Object.entries(message.reactions).map(([emoji, userIds]) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="px-2 py-1 bg-accent/10 rounded-full text-xs flex items-center gap-1 hover:bg-accent/20 transition-colors"
                data-testid={`reaction-count-${emoji}`}
              >
                <span>{emoji}</span>
                <span className="text-muted-foreground">{userIds.length}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.created_at), 'HH:mm')}
          </span>
          {message.edited_at && (
            <span className="text-xs text-muted-foreground italic">(edited)</span>
          )}
        </div>
      </div>
    </div>
  );
};