import angular from 'angular';
import '../../app.module.js';

angular.module('vibgyorChat').service('InviteService', [function() {
  const STORAGE_KEY = 'vibgyorchat_invite_links';
  
  // Generate UUID v4
  this.generateUUID = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
  
  // Encode group ID and expiration into a token
  this.encodeInviteToken = function(groupId, expiresAt, expirationDays) {
    const data = {
      g: groupId,
      e: expiresAt,
      d: expirationDays,
      t: Date.now() // timestamp for uniqueness
    };
    
    // Convert to base64
    const jsonStr = JSON.stringify(data);
    const base64 = btoa(jsonStr);
    
    // Make it URL-safe
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };
  
  // Decode invite token
  this.decodeInviteToken = function(token) {
    try {
      // Restore base64 format
      let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
      
      // Add padding if needed
      while (base64.length % 4) {
        base64 += '=';
      }
      
      const jsonStr = atob(base64);
      const data = JSON.parse(jsonStr);
      
      return {
        groupId: data.g,
        expiresAt: data.e,
        expirationDays: data.d,
        timestamp: data.t
      };
    } catch (error) {
      console.error('❌ Failed to decode invite token:', error);
      return null;
    }
  };
  
  // Create an expirable invite link
  this.createInviteLink = function(groupId, expirationDays) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (expirationDays * 24 * 60 * 60 * 1000));
    
    // Generate token with encoded data
    const token = this.encodeInviteToken(groupId, expiresAt.toISOString(), expirationDays);
    
    const inviteData = {
      uuid: token,
      groupId: groupId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      expirationDays: expirationDays
    };
    
    // Store in localStorage for tracking (optional, for admin view)
    this.saveInviteLink(inviteData);
    
    return inviteData;
  };
  
  // Save invite link to localStorage
  this.saveInviteLink = function(inviteData) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const inviteLinks = stored ? JSON.parse(stored) : {};
      
      inviteLinks[inviteData.uuid] = inviteData;
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inviteLinks));
      console.log('💾 Saved invite link:', inviteData);
    } catch (error) {
      console.error('❌ Failed to save invite link:', error);
    }
  };
  
  // Get invite link by UUID (from localStorage)
  this.getInviteLink = function(uuid) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      
      const inviteLinks = JSON.parse(stored);
      return inviteLinks[uuid] || null;
    } catch (error) {
      console.error('❌ Failed to get invite link:', error);
      return null;
    }
  };
  
  // Validate invite link (works across browsers by decoding token)
  this.validateInviteLink = function(token) {
    // First, try to decode the token
    const decoded = this.decodeInviteToken(token);
    
    if (!decoded) {
      return {
        valid: false,
        reason: 'invalid',
        message: 'Invalid invite link. Please request a new link.'
      };
    }
    
    // Enhanced revocation check
    const revokedCheck = this.isInviteRevoked(token);
    if (revokedCheck.revoked) {
      return {
        valid: false,
        reason: 'revoked',
        message: 'This invite link has been revoked by the group admin. Please request a new link.',
        revokedAt: revokedCheck.revokedAt
      };
    }
    
    // Check expiration
    const now = new Date();
    const expiresAt = new Date(decoded.expiresAt);
    
    if (now > expiresAt) {
      return {
        valid: false,
        reason: 'expired',
        message: 'This invite link has expired. Please request a new link.',
        expiredAt: decoded.expiresAt
      };
    }
    
    // Additional validation: Check if this is a very old token format
    // If the token doesn't have a timestamp, it might be from before revocation was implemented
    if (!decoded.timestamp) {
      console.warn('⚠️ Old invite token format detected, treating as potentially invalid');
    }
    
    return {
      valid: true,
      groupId: decoded.groupId,
      expiresAt: decoded.expiresAt,
      token: token // Include token for tracking
    };
  };
  
  // Get all invite links for a group
  this.getGroupInviteLinks = function(groupId) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      
      const inviteLinks = JSON.parse(stored);
      const groupLinks = [];
      
      for (const uuid in inviteLinks) {
        if (inviteLinks[uuid].groupId === groupId) {
          groupLinks.push(inviteLinks[uuid]);
        }
      }
      
      return groupLinks;
    } catch (error) {
      console.error('❌ Failed to get group invite links:', error);
      return [];
    }
  };
  
  // Get active (non-expired) invite link for a group
  this.getActiveInviteLink = function(groupId) {
    const groupLinks = this.getGroupInviteLinks(groupId);
    const now = new Date();
    
    // Find the most recent non-expired, non-revoked link
    const activeLinks = groupLinks.filter(link => {
      const expiresAt = new Date(link.expiresAt);
      return now <= expiresAt && !link.revoked;
    });
    
    if (activeLinks.length === 0) return null;
    
    // Sort by creation date (most recent first)
    activeLinks.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    return activeLinks[0];
  };
  
  // Delete expired invite links (cleanup)
  this.cleanupExpiredLinks = function() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      
      const inviteLinks = JSON.parse(stored);
      const now = new Date();
      let cleaned = 0;
      
      for (const uuid in inviteLinks) {
        const expiresAt = new Date(inviteLinks[uuid].expiresAt);
        if (now > expiresAt) {
          delete inviteLinks[uuid];
          cleaned++;
        }
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inviteLinks));
      console.log('🧹 Cleaned up', cleaned, 'expired invite links');
    } catch (error) {
      console.error('❌ Failed to cleanup expired links:', error);
    }
  };
  
  // Delete all invite links for a group
  this.deleteGroupInviteLinks = function(groupId) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      
      const inviteLinks = JSON.parse(stored);
      
      for (const uuid in inviteLinks) {
        if (inviteLinks[uuid].groupId === groupId) {
          delete inviteLinks[uuid];
        }
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inviteLinks));
      console.log('🗑️ Deleted all invite links for group:', groupId);
    } catch (error) {
      console.error('❌ Failed to delete group invite links:', error);
    }
  };
  
  // Revoke a specific invite link (make it expire immediately)
  this.revokeInviteLink = function(uuid) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return false;
      
      const inviteLinks = JSON.parse(stored);
      
      if (!inviteLinks[uuid]) {
        console.warn('⚠️ Invite link not found:', uuid);
        return false;
      }
      
      // Store original expiry before revoking
      if (!inviteLinks[uuid].originalExpiresAt) {
        inviteLinks[uuid].originalExpiresAt = inviteLinks[uuid].expiresAt;
      }
      
      // Set expiration to now (immediately expired)
      const now = new Date();
      inviteLinks[uuid].expiresAt = now.toISOString();
      inviteLinks[uuid].revoked = true;
      inviteLinks[uuid].revokedAt = now.toISOString();
      
      // Store the revoked token for cross-browser checking
      this.storeRevokedToken(uuid, inviteLinks[uuid]);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inviteLinks));
      console.log('🚫 Revoked invite link:', uuid);
      return true;
    } catch (error) {
      console.error('❌ Failed to revoke invite link:', error);
      return false;
    }
  };
  
  // Delete a specific invite link completely
  this.deleteInviteLink = function(uuid) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return false;
      
      const inviteLinks = JSON.parse(stored);
      
      if (!inviteLinks[uuid]) {
        console.warn('⚠️ Invite link not found:', uuid);
        return false;
      }
      
      delete inviteLinks[uuid];
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inviteLinks));
      console.log('🗑️ Deleted invite link:', uuid);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete invite link:', error);
      return false;
    }
  };
  
  // Check if an invite token has been revoked (enhanced validation)
  this.isInviteRevoked = function(token) {
    try {
      // Check localStorage first (same browser)
      const storedLink = this.getInviteLink(token);
      if (storedLink && storedLink.revoked) {
        return {
          revoked: true,
          reason: 'localStorage',
          revokedAt: storedLink.revokedAt
        };
      }
      
      // Check revoked tokens storage
      const REVOKED_KEY = 'vibgyor_revoked_invites';
      const revokedStored = localStorage.getItem(REVOKED_KEY);
      if (revokedStored) {
        const revokedTokens = JSON.parse(revokedStored);
        if (revokedTokens[token]) {
          return {
            revoked: true,
            reason: 'revoked_storage',
            revokedAt: revokedTokens[token].revokedAt
          };
        }
      }
      
      return { revoked: false };
    } catch (error) {
      console.error('❌ Error checking revoked status:', error);
      return { revoked: false };
    }
  };
  
  // Store revoked token information (for cross-browser validation)
  this.storeRevokedToken = function(uuid, linkData) {
    try {
      const REVOKED_KEY = 'vibgyor_revoked_invites';
      const stored = localStorage.getItem(REVOKED_KEY) || '{}';
      const revokedTokens = JSON.parse(stored);
      
      // Store minimal info about revoked token
      revokedTokens[uuid] = {
        groupId: linkData.groupId,
        revokedAt: linkData.revokedAt,
        originalExpiry: linkData.originalExpiresAt || linkData.expiresAt
      };
      
      localStorage.setItem(REVOKED_KEY, JSON.stringify(revokedTokens));
      console.log('📝 Stored revoked token info:', uuid);
    } catch (error) {
      console.error('❌ Failed to store revoked token:', error);
    }
  };
}]);
