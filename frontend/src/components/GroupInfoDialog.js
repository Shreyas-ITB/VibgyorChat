import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Plus, Trash2, Search, Shield, ShieldOff, Crown, Camera, Edit2, Trash, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PRESET_COLORS = [
  '#FF6B35', '#1B4D3E', '#5865F2', '#57F287', '#FEE75C', '#EB459E', 
  '#ED4245', '#F26522', '#3BA55D', '#FAA81A', '#9B59B6', '#E91E63',
  '#00BCD4', '#8BC34A', '#FF9800', '#795548', '#607D8B', '#E74C3C'
];

export const GroupInfoDialog = ({ conversation, currentUser, onClose, onUpdate }) => {
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#5865F2');
  const [editingMember, setEditingMember] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [groupName, setGroupName] = useState(conversation.name || '');
  const [uploadingPicture, setUploadingPicture] = useState(false);

  const isOwner = conversation.owner === currentUser.user_id;
  const isAdmin = conversation.admins?.includes(currentUser.user_id) || isOwner;

  useEffect(() => {
    fetchGroupData();
  }, [conversation]);

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      
      const rolesResponse = await axios.get(`${API}/groups/${conversation.conversation_id}/roles`, {
        withCredentials: true
      });
      setRoles(rolesResponse.data);

      const membersResponse = await axios.get(`${API}/users/search?q=`, {
        withCredentials: true
      });
      
      const conversationMembers = membersResponse.data.filter(user => 
        conversation.participants.includes(user.user_id)
      );
      setMembers(conversationMembers);
    } catch (error) {
      console.error('Error fetching group data:', error);
      toast.error('Failed to load group data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast.error('Role name is required');
      return;
    }

    try {
      const response = await axios.post(`${API}/groups/${conversation.conversation_id}/roles`, {
        role_name: newRoleName,
        color: newRoleColor,
        member_ids: []
      }, { withCredentials: true });

      setRoles([...roles, response.data]);
      setNewRoleName('');
      setNewRoleColor('#5865F2');
      setShowAddRole(false);
      toast.success('Role created');
    } catch (error) {
      console.error('Error creating role:', error);
      toast.error('Failed to create role');
    }
  };

  const handleDeleteRole = async (roleId) => {
    try {
      await axios.delete(`${API}/groups/${conversation.conversation_id}/roles/${roleId}`, {
        withCredentials: true
      });
      setRoles(roles.filter(r => r.role_id !== roleId));
      toast.success('Role deleted');
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role');
    }
  };

  const handleAssignRole = async (memberId, roleId) => {
    try {
      await axios.post(`${API}/groups/${conversation.conversation_id}/roles/${roleId}/assign`, {
        user_id: memberId
      }, { withCredentials: true });
      
      await fetchGroupData();
      toast.success('Role assigned');
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error('Failed to assign role');
    }
  };

  const handleRemoveRole = async (memberId, roleId) => {
    try {
      await axios.post(`${API}/groups/${conversation.conversation_id}/roles/${roleId}/remove`, {
        user_id: memberId
      }, { withCredentials: true });
      
      await fetchGroupData();
      toast.success('Role removed');
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Failed to remove role');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (memberId === conversation.owner) {
      toast.error('Cannot remove group owner');
      return;
    }

    if (!window.confirm('Are you sure you want to remove this member?')) {
      return;
    }

    try {
      await axios.post(`${API}/groups/${conversation.conversation_id}/members/remove`, {
        user_id: memberId
      }, { withCredentials: true });
      
      await fetchGroupData();
      onUpdate();
      toast.success('Member removed from group');
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error(error.response?.data?.detail || 'Failed to remove member');
    }
  };

  const handlePromoteToAdmin = async (memberId) => {
    try {
      await axios.post(`${API}/groups/${conversation.conversation_id}/admins/promote`, {
        user_id: memberId
      }, { withCredentials: true });
      
      await fetchGroupData();
      onUpdate();
      toast.success('Member promoted to admin');
    } catch (error) {
      console.error('Error promoting member:', error);
      toast.error(error.response?.data?.detail || 'Failed to promote member');
    }
  };

  const handleDemoteAdmin = async (memberId) => {
    try {
      await axios.post(`${API}/groups/${conversation.conversation_id}/admins/demote`, {
        user_id: memberId
      }, { withCredentials: true });
      
      await fetchGroupData();
      onUpdate();
      toast.success('Admin demoted');
    } catch (error) {
      console.error('Error demoting admin:', error);
      toast.error(error.response?.data?.detail || 'Failed to demote admin');
    }
  };

  const handleUpdateGroupName = async () => {
    if (!groupName.trim()) {
      toast.error('Group name cannot be empty');
      return;
    }

    try {
      await axios.put(`${API}/groups/${conversation.conversation_id}`, {
        name: groupName
      }, { withCredentials: true });
      
      setEditingGroupName(false);
      onUpdate();
      toast.success('Group name updated');
    } catch (error) {
      console.error('Error updating group name:', error);
      toast.error('Failed to update group name');
    }
  };

  const handleUploadGroupPicture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPicture(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await axios.post(`${API}/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      await axios.put(`${API}/groups/${conversation.conversation_id}`, {
        picture: uploadResponse.data.file_url
      }, { withCredentials: true });

      onUpdate();
      toast.success('Group picture updated');
    } catch (error) {
      console.error('Error uploading group picture:', error);
      toast.error('Failed to upload group picture');
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${API}/groups/${conversation.conversation_id}`, {
        withCredentials: true
      });
      
      toast.success('Group deleted');
      onClose();
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete group');
    }
  };

  const getMemberRoles = (memberId) => {
    return roles.filter(role => role.member_ids && role.member_ids.includes(memberId));
  };

  const isMemberAdmin = (memberId) => {
    return conversation.admins?.includes(memberId);
  };

  const filteredMembers = members.filter(member => 
    member.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    member.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="group-info-dialog">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Avatar className="w-16 h-16">
                <AvatarImage src={conversation.picture ? BACKEND_URL + conversation.picture : null} alt={conversation.name} />
                <AvatarFallback className="bg-vibgyor-orange text-white text-2xl font-bold">
                  {conversation.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isAdmin && (
                <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  {uploadingPicture ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadGroupPicture}
                    className="hidden"
                    disabled={uploadingPicture}
                  />
                </label>
              )}
            </div>
            <div>
              {editingGroupName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="px-3 py-1 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-vibgyor-orange text-foreground font-heading text-xl"
                    autoFocus
                    data-testid="edit-group-name-input"
                  />
                  <button
                    onClick={handleUpdateGroupName}
                    className="p-1 hover:bg-accent/10 rounded"
                    data-testid="save-group-name-button"
                  >
                    <Check className="w-5 h-5 text-vibgyor-orange" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingGroupName(false);
                      setGroupName(conversation.name || '');
                    }}
                    className="p-1 hover:bg-accent/10 rounded"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-2xl text-foreground">{conversation.name || 'Group Chat'}</h2>
                  {isAdmin && (
                    <button
                      onClick={() => setEditingGroupName(true)}
                      className="p-1 hover:bg-accent/10 rounded"
                      data-testid="edit-group-name-button"
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              )}
              <p className="text-sm text-muted-foreground">{members.length} members</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-accent/10 transition-colors"
            data-testid="close-group-info-button"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vibgyor-orange"></div>
            </div>
          ) : (
            <>
              {/* Roles Section - ALWAYS VISIBLE */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-foreground text-lg">Roles</h3>
                  {isAdmin && (
                    <button
                      onClick={() => setShowAddRole(!showAddRole)}
                      className="flex items-center gap-2 px-3 py-2 bg-vibgyor-orange hover:bg-vibgyor-orange-dark text-white rounded-lg transition-colors text-sm"
                      data-testid="add-role-button"
                    >
                      <Plus className="w-4 h-4" />
                      Add Role
                    </button>
                  )}
                </div>

                {showAddRole && isAdmin && (
                  <div className="mb-4 p-4 bg-accent/5 rounded-lg space-y-3">
                    <input
                      type="text"
                      placeholder="Role name (e.g., Designer, Manager)"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-vibgyor-orange text-foreground placeholder:text-muted-foreground"
                      data-testid="role-name-input"
                    />
                    
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">Role Color</label>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map(color => (
                          <button
                            key={color}
                            onClick={() => setNewRoleColor(color)}
                            className={`w-10 h-10 rounded-lg transition-all ${
                              newRoleColor === color ? 'ring-2 ring-vibgyor-orange ring-offset-2 ring-offset-background scale-110' : 'hover:scale-105'
                            }`}
                            style={{ backgroundColor: color }}
                            data-testid={`color-${color}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateRole}
                        className="px-4 py-2 bg-vibgyor-orange hover:bg-vibgyor-orange-dark text-white rounded-lg transition-colors"
                        data-testid="create-role-button"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => setShowAddRole(false)}
                        className="px-4 py-2 bg-accent/10 hover:bg-accent/20 text-foreground rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {roles.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4 text-center">
                      {isAdmin ? 'No roles yet. Create one to organize your team!' : 'No roles created yet'}
                    </p>
                  ) : (
                    roles.map(role => (
                      <div
                        key={role.role_id}
                        className="flex items-center justify-between p-3 bg-accent/5 rounded-lg group"
                        data-testid={`role-${role.role_id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: role.color || '#5865F2' }}
                          />
                          <span className="font-medium text-foreground capitalize">{role.role_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {role.member_ids?.length || 0} members
                          </span>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteRole(role.role_id)}
                            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-destructive/10 rounded-lg transition-all"
                            data-testid={`delete-role-${role.role_id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Members Section */}
              <div>
                <h3 className="font-medium text-foreground text-lg mb-4">Members</h3>

                {/* Member Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-vibgyor-orange text-foreground placeholder:text-muted-foreground"
                    data-testid="search-members-input"
                  />
                </div>

                <div className="space-y-2">
                  {filteredMembers.map(member => {
                    const memberRoles = getMemberRoles(member.user_id);
                    const isEditing = editingMember === member.user_id;
                    const memberIsAdmin = isMemberAdmin(member.user_id);
                    const memberIsOwner = member.user_id === conversation.owner;

                    return (
                      <div
                        key={member.user_id}
                        className="p-3 bg-accent/5 rounded-lg"
                        data-testid={`member-${member.user_id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={member.picture} alt={member.name} />
                              <AvatarFallback className="bg-vibgyor-green text-white">
                                {member.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground">{member.name}</p>
                                {memberIsOwner && (
                                  <Crown className="w-4 h-4 text-yellow-500" title="Owner" />
                                )}
                                {memberIsAdmin && !memberIsOwner && (
                                  <Shield className="w-4 h-4 text-vibgyor-orange" title="Admin" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isAdmin && member.user_id !== currentUser.user_id && (
                              <>
                                {isOwner && !memberIsOwner && (
                                  <button
                                    onClick={() => memberIsAdmin ? handleDemoteAdmin(member.user_id) : handlePromoteToAdmin(member.user_id)}
                                    className="px-3 py-1 text-sm bg-vibgyor-orange/10 hover:bg-vibgyor-orange/20 text-vibgyor-orange rounded-lg transition-colors flex items-center gap-1"
                                    title={memberIsAdmin ? "Demote from admin" : "Promote to admin"}
                                    data-testid={`promote-demote-${member.user_id}`}
                                  >
                                    {memberIsAdmin ? <ShieldOff className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                                    {memberIsAdmin ? 'Demote' : 'Promote'}
                                  </button>
                                )}
                                <button
                                  onClick={() => setEditingMember(isEditing ? null : member.user_id)}
                                  className="px-3 py-1 text-sm bg-accent/10 hover:bg-accent/20 text-foreground rounded-lg transition-colors"
                                  data-testid={`edit-roles-${member.user_id}`}
                                >
                                  {isEditing ? 'Done' : 'Edit Roles'}
                                </button>
                                {!memberIsOwner && (
                                  <button
                                    onClick={() => handleRemoveMember(member.user_id)}
                                    className="p-1 hover:bg-destructive/10 rounded-lg transition-colors"
                                    title="Remove from group"
                                    data-testid={`remove-member-${member.user_id}`}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Current Roles */}
                        {memberRoles.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {memberRoles.map(role => (
                              <div
                                key={role.role_id}
                                className="flex items-center gap-2 px-3 py-1 rounded-full text-sm text-white"
                                style={{ backgroundColor: role.color || '#5865F2' }}
                              >
                                <span className="capitalize">{role.role_name}</span>
                                {isEditing && isAdmin && (
                                  <button
                                    onClick={() => handleRemoveRole(member.user_id, role.role_id)}
                                    className="hover:bg-white/20 rounded-full p-0.5"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Role Assignment */}
                        {isEditing && isAdmin && roles.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                            {roles.filter(role => !memberRoles.find(mr => mr.role_id === role.role_id)).map(role => (
                              <button
                                key={role.role_id}
                                onClick={() => handleAssignRole(member.user_id, role.role_id)}
                                className="flex items-center gap-2 px-3 py-1 border border-border rounded-full text-sm hover:bg-accent/10 transition-colors"
                                data-testid={`assign-${role.role_id}-to-${member.user_id}`}
                              >
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: role.color || '#5865F2' }}
                                />
                                <span className="capitalize text-foreground">{role.role_name}</span>
                                <Plus className="w-3 h-3" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Danger Zone */}
              {isOwner && (
                <div className="border-t border-destructive/20 pt-6">
                  <h3 className="font-medium text-destructive text-lg mb-4">Danger Zone</h3>
                  <button
                    onClick={handleDeleteGroup}
                    className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg px-4 py-3 font-medium transition-colors flex items-center justify-center gap-2"
                    data-testid="delete-group-button"
                  >
                    <Trash className="w-5 h-5" />
                    Delete Group Permanently
                  </button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    This action cannot be undone. All messages will be deleted.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};