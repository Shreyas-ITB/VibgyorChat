import React, { useState } from 'react';
import { X, Edit2, Check } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const EditProfileDialog = ({ user, onClose, onUpdate }) => {
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setSaving(true);
    try {
      const response = await axios.put(`${API}/users/profile`, 
        { name },
        { withCredentials: true }
      );
      
      toast.success('Profile updated');
      onUpdate(response.data);
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="edit-profile-dialog">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading text-2xl text-foreground">Edit Profile</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-accent/10 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-vibgyor-orange text-foreground"
              placeholder="Enter your name"
              data-testid="profile-name-input"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="flex-1 bg-vibgyor-orange hover:bg-vibgyor-orange-dark text-white rounded-lg px-4 py-3 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="save-profile-button"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Save
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-3 bg-accent/10 hover:bg-accent/20 text-foreground rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};