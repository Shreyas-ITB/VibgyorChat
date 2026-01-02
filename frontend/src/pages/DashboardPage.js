import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MessageSquare, Users, Sun, Moon, LogOut, Search, Plus, X, ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { SocketProvider } from '../contexts/SocketContext';
import { useTheme } from '../contexts/ThemeContext';
import { ChatList } from '../components/ChatList';
import { ChatView } from '../components/ChatView';
import { NewChatDialog } from '../components/NewChatDialog';
import { ProfileDialog } from '../components/ProfileDialog';
import { EditProfileDialog } from '../components/EditProfileDialog';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const DashboardPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState(location.state?.user || null);
  const [isAuthenticated, setIsAuthenticated] = useState(location.state?.user ? true : null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('all'); // 'all', 'direct', 'groups'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (location.state?.user) return;

    const checkAuth = async () => {
      try {
        const response = await axios.get(`${API}/auth/me`, {
          withCredentials: true
        });
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
        navigate('/login');
      }
    };

    checkAuth();
  }, [location.state, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      try {
        const response = await axios.get(`${API}/conversations`, {
          withCredentials: true
        });
        setConversations(response.data);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        toast.error('Failed to load conversations');
      }
    };

    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNewConversation = async (data) => {
    try {
      const response = await axios.post(`${API}/conversations`, data, {
        withCredentials: true
      });
      setConversations([response.data, ...conversations]);
      setSelectedConversation(response.data);
      setShowNewChat(false);
      toast.success('Conversation created');
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
    }
  };

  const handleProfileUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vibgyor-orange mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  // Filter conversations based on view mode
  const getFilteredConversations = () => {
    let filtered = conversations;

    // Apply view mode filter
    if (viewMode === 'direct') {
      filtered = filtered.filter(conv => conv.type === 'direct');
    } else if (viewMode === 'groups') {
      filtered = filtered.filter(conv => conv.type === 'group');
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv => {
        if (conv.name) return conv.name.toLowerCase().includes(query);
        if (conv.participant_details) {
          return conv.participant_details.some(p => p.name.toLowerCase().includes(query));
        }
        return false;
      });
    }

    return filtered;
  };

  const filteredConversations = getFilteredConversations();

  return (
    <SocketProvider user={user}>
      <div className={`grid h-screen overflow-hidden bg-background transition-all duration-300 ${
        sidebarCollapsed ? 'grid-cols-[80px_0px_1fr]' : 'grid-cols-[80px_350px_1fr]'
      }`} data-testid="dashboard">
        {/* Navigation sidebar */}
        <div className="bg-vibgyor-green dark:bg-vibgyor-green/90 text-white flex flex-col items-center py-6 gap-6">
          <button
            onClick={() => setShowProfile(true)}
            className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity group relative"
            data-testid="profile-button"
          >
            <Avatar className="w-12 h-12 shadow-lg ring-2 ring-white/20">
              <AvatarImage src={user.picture} alt={user.name} />
              <AvatarFallback className="bg-vibgyor-orange text-white font-heading text-xl font-bold">
                {user.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowEditProfile(true);
              }}
              className="absolute -bottom-1 -right-1 p-1 bg-vibgyor-orange rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              title="Edit profile"
            >
              <Edit className="w-3 h-3" />
            </button>
          </button>

          <div className="flex-1 flex flex-col gap-4">
            <button 
              onClick={() => setViewMode('all')}
              className={`p-3 rounded-lg transition-colors ${
                viewMode === 'all' ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
              data-testid="all-chats-button"
              title="All Chats"
            >
              <MessageSquare className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setViewMode('groups')}
              className={`p-3 rounded-lg transition-colors ${
                viewMode === 'groups' ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
              data-testid="groups-only-button"
              title="Groups Only"
            >
              <Users className="w-6 h-6" />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <button 
              onClick={toggleTheme}
              className="p-3 rounded-lg hover:bg-white/10 transition-colors"
              data-testid="theme-toggle-button"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
            </button>
            <button 
              onClick={handleLogout}
              className="p-3 rounded-lg hover:bg-white/10 transition-colors"
              data-testid="logout-button"
              title="Logout"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Chat list sidebar */}
        <div className="bg-card border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-2xl text-foreground">
                {viewMode === 'groups' ? 'Groups' : 'Chats'}
              </h2>
              <button
                onClick={() => setShowNewChat(true)}
                className="p-2 rounded-full bg-vibgyor-orange text-white hover:bg-vibgyor-orange-dark transition-colors shadow-lg hover:shadow-xl"
                data-testid="new-chat-button"
                title="New Chat"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-vibgyor-orange text-foreground placeholder:text-muted-foreground"
                data-testid="search-conversations-input"
              />
            </div>
            {viewMode !== 'all' && (
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {viewMode === 'groups' ? 'Showing groups only' : 'Showing direct chats only'}
                </span>
                <button
                  onClick={() => setViewMode('all')}
                  className="text-vibgyor-orange hover:underline"
                >
                  Show all
                </button>
              </div>
            )}
          </div>

          <ChatList
            conversations={filteredConversations}
            selectedConversation={selectedConversation}
            onSelectConversation={setSelectedConversation}
            currentUser={user}
          />
        </div>

        {/* Chat view */}
        <div className="bg-background/50 backdrop-blur-sm">
          {selectedConversation ? (
            <ChatView
              conversation={selectedConversation}
              currentUser={user}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="font-heading text-2xl text-foreground mb-2">Welcome to Vibgyor Chats</h3>
                  <p className="text-muted-foreground">
                    {viewMode === 'groups' 
                      ? 'Select a group to start messaging'
                      : 'Select a conversation to start messaging'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showNewChat && (
        <NewChatDialog
          onClose={() => setShowNewChat(false)}
          onCreateConversation={handleNewConversation}
        />
      )}

      {showProfile && (
        <ProfileDialog
          user={user}
          onClose={() => setShowProfile(false)}
        />
      )}
    </SocketProvider>
  );
};