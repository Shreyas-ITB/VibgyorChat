import React, { useState } from 'react';
import { X, User, Mail, LogOut, Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const ProfileDialog = ({ user, onClose }) => {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await axios.post(`${API}/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // In a real app, you would update the user profile with the new picture URL
      toast.success('Profile picture uploaded! (Feature pending backend update)');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="profile-dialog">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-heading text-2xl text-foreground">Profile</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-accent/10 transition-colors"
            data-testid="close-profile-button"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="p-6 space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <Avatar className="w-24 h-24">
                <AvatarImage src={user.picture} alt={user.name} />
                <AvatarFallback className="bg-vibgyor-orange text-white text-3xl font-bold">
                  {user.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="profile-picture-upload"
                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </label>
              <input
                id="profile-picture-upload"
                type="file"
                accept="image/*"
                onChange={handleProfilePictureUpload}
                className="hidden"
                disabled={uploading}
              />
            </div>
            <p className="text-xs text-muted-foreground">Click to change profile picture</p>
          </div>

          {/* User Info */}
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-accent/5 rounded-lg">
              <User className="w-5 h-5 text-vibgyor-orange flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Name</p>
                <p className="text-foreground font-medium">{user.name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-accent/5 rounded-lg">
              <Mail className="w-5 h-5 text-vibgyor-orange flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Email</p>
                <p className="text-foreground font-medium break-all">{user.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-accent/5 rounded-lg">
              <User className="w-5 h-5 text-vibgyor-orange flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">User ID</p>
                <p className="text-foreground font-mono text-sm">{user.user_id}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <button
            onClick={handleLogout}
            className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full px-8 py-3 font-medium transition-all duration-300 flex items-center justify-center gap-2"
            data-testid="logout-from-profile-button"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};