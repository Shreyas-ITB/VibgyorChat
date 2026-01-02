import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Search, Users, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const NewChatDialog = ({ onClose, onCreateConversation }) => {
  const [type, setType] = useState('direct'); // 'direct' or 'group'
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchUsers = async () => {
      try {
        const response = await axios.get(`${API}/users/search?q=${searchQuery}`, {
          withCredentials: true
        });
        setUsers(response.data);
      } catch (error) {
        console.error('Error searching users:', error);
      }
    };

    const debounce = setTimeout(() => {
      if (searchQuery) {
        searchUsers();
      } else {
        setUsers([]);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const exists = prev.find(u => u.user_id === user.user_id);
      if (exists) {
        return prev.filter(u => u.user_id !== user.user_id);
      }
      return [...prev, user];
    });
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0) return;

    setLoading(true);
    try {
      const data = {
        type,
        participants: selectedUsers.map(u => u.user_id),
        name: type === 'group' ? groupName : null
      };

      await onCreateConversation(data);
      onClose();
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="new-chat-dialog">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-heading text-2xl text-foreground">New Chat</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-accent/10 transition-colors"
            data-testid="close-dialog-button"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Type selection */}
        <div className="p-6 border-b border-border">
          <div className="flex gap-2">
            <button
              onClick={() => setType('direct')}
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                type === 'direct'
                  ? 'bg-vibgyor-orange text-white'
                  : 'bg-accent/10 text-foreground hover:bg-accent/20'
              }`}
              data-testid="direct-chat-button"
            >
              <MessageSquare className="w-5 h-5" />
              Direct
            </button>
            <button
              onClick={() => setType('group')}
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                type === 'group'
                  ? 'bg-vibgyor-orange text-white'
                  : 'bg-accent/10 text-foreground hover:bg-accent/20'
              }`}
              data-testid="group-chat-button"
            >
              <Users className="w-5 h-5" />
              Group
            </button>
          </div>
        </div>

        {/* Group name */}
        {type === 'group' && (
          <div className="p-6 border-b border-border">
            <input
              type="text"
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-vibgyor-orange text-foreground placeholder:text-muted-foreground"
              data-testid="group-name-input"
            />
          </div>
        )}

        {/* Search */}
        <div className="p-6 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-vibgyor-orange text-foreground placeholder:text-muted-foreground"
              data-testid="search-users-input"
            />
          </div>
        </div>

        {/* Selected users */}
        {selectedUsers.length > 0 && (
          <div className="p-6 border-b border-border">
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map(user => (
                <div
                  key={user.user_id}
                  className="flex items-center gap-2 bg-accent/10 rounded-full px-3 py-1"
                  data-testid={`selected-user-${user.user_id}`}
                >
                  <span className="text-sm text-foreground">{user.name}</span>
                  <button
                    onClick={() => toggleUserSelection(user)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User list */}
        <div className="flex-1 overflow-y-auto p-6">
          {users.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {searchQuery ? 'No users found' : 'Search for users to start a chat'}
            </div>
          ) : (
            <div className="space-y-2">
              {users.map(user => (
                <button
                  key={user.user_id}
                  onClick={() => toggleUserSelection(user)}
                  className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors ${
                    selectedUsers.find(u => u.user_id === user.user_id)
                      ? 'bg-vibgyor-orange/10 border-2 border-vibgyor-orange'
                      : 'hover:bg-accent/5 border-2 border-transparent'
                  }`}
                  data-testid={`user-item-${user.user_id}`}
                >
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src={user.picture} alt={user.name} />
                    <AvatarFallback className="bg-vibgyor-green text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          <button
            onClick={handleCreate}
            disabled={selectedUsers.length === 0 || (type === 'group' && !groupName.trim()) || loading}
            className="w-full bg-vibgyor-orange hover:bg-vibgyor-orange-dark text-white rounded-full px-8 py-3 font-medium transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="create-conversation-button"
          >
            {loading ? 'Creating...' : `Create ${type === 'direct' ? 'Chat' : 'Group'}`}
          </button>
        </div>
      </div>
    </div>
  );
};