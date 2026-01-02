import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MessageSquare, Users, Sun, Moon, LogOut, Search, Plus, X } from 'lucide-react';
import { SocketProvider } from '../contexts/SocketContext';
import { useTheme } from '../contexts/ThemeContext';
import { ChatList } from '../components/ChatList';
import { ChatView } from '../components/ChatView';
import { NewChatDialog } from '../components/NewChatDialog';
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    if (conv.name) return conv.name.toLowerCase().includes(query);
    if (conv.participant_details) {
      return conv.participant_details.some(p => p.name.toLowerCase().includes(query));
    }
    return false;
  });

  return (
    <SocketProvider user={user}>
      <div className="grid grid-cols-[80px_350px_1fr] h-screen overflow-hidden bg-background" data-testid="dashboard">
        {/* Navigation sidebar */}
        <div className="bg-vibgyor-green dark:bg-vibgyor-green/90 text-white flex flex-col items-center py-6 gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-vibgyor-orange flex items-center justify-center font-heading text-xl font-bold">
              V
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-4">
            <button 
              className="p-3 rounded-lg hover:bg-white/10 transition-colors"
              data-testid="chats-nav-button"
            >
              <MessageSquare className="w-6 h-6" />
            </button>
            <button 
              className="p-3 rounded-lg hover:bg-white/10 transition-colors"
              data-testid="groups-nav-button"
            >
              <Users className="w-6 h-6" />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <button 
              onClick={toggleTheme}
              className="p-3 rounded-lg hover:bg-white/10 transition-colors"
              data-testid="theme-toggle-button"
            >
              {theme === 'light' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
            </button>
            <button 
              onClick={handleLogout}
              className="p-3 rounded-lg hover:bg-white/10 transition-colors"
              data-testid="logout-button"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Chat list sidebar */}
        <div className="bg-card border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-2xl text-foreground">Chats</h2>
              <button
                onClick={() => setShowNewChat(true)}
                className="p-2 rounded-full bg-vibgyor-orange text-white hover:bg-vibgyor-orange-dark transition-colors"
                data-testid="new-chat-button"
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
                  <p className="text-muted-foreground">Select a conversation to start messaging</p>
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
    </SocketProvider>
  );
};