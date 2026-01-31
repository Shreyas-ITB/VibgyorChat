import angular from 'angular';
import '../../app.module.js';

angular.module('vibgyorChat').service('InviteService', ['$http', '$q', 'AuthService', function($http, $q, AuthService) {
  const API_BASE = window.APP_CONFIG.API_BASE_URL;
  const LOCAL_STORAGE_KEY = 'vibgyorchat_invite_cache'; // For local caching only
  
  // Get authentication headers
  const getHeaders = function() {
    return {
      'Authorization': `Bearer ${AuthService.getToken()}`,
      'Content-Type': 'application/json'
    };
  };

  // Generate secure UUID v4
  this.generateUUID = function() {
    if (crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Generate simple checksum for token validation
  this.generateChecksum = function(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 6);
  };

  // Enhanced token encoding with expiration and metadata
  this.encodeInviteToken = function(groupId, expiresAt, expirationDays) {
    const data = {
      g: groupId,           // group ID
      e: expiresAt,         // expiration timestamp
      d: expirationDays,    // expiration days
      t: Date.now(),        // creation timestamp
      r: Math.random().toString(36).substring(2, 15), // random salt
      v: 2                  // version (v2 for backend-integrated)
    };
    
    // Convert to base64 with encoding
    const jsonStr = JSON.stringify(data);
    const base64 = btoa(jsonStr);
    
    // Make it URL-safe and add checksum
    const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const checksum = this.generateChecksum(urlSafe);
    
    return urlSafe + '.' + checksum;
  };
  
  // Enhanced token decoding with validation
  this.decodeInviteToken = function(token) {
    try {
      // Split token and checksum
      const parts = token.split('.');
      if (parts.length !== 2) {
        console.error('❌ Invalid token format - missing checksum');
        return null;
      }
      
      const [tokenPart, checksum] = parts;
      
      // Validate checksum
      const expectedChecksum = this.generateChecksum(tokenPart);
      if (checksum !== expectedChecksum) {
        console.error('❌ Invalid token - checksum mismatch');
        return null;
      }
      
      // Restore base64 format
      let base64 = tokenPart.replace(/-/g, '+').replace(/_/g, '/');
      
      // Add padding if needed
      while (base64.length % 4) {
        base64 += '=';
      }
      
      const jsonStr = atob(base64);
      const data = JSON.parse(jsonStr);
      
      // Validate required fields
      if (!data.g || !data.e || !data.d || !data.t) {
        console.error('❌ Invalid token - missing required fields');
        return null;
      }
      
      return {
        groupId: data.g,
        expiresAt: data.e,
        expirationDays: data.d,
        timestamp: data.t,
        salt: data.r,
        version: data.v || 1
      };
    } catch (error) {
      console.error('❌ Failed to decode invite token:', error);
      return null;
    }
  };

  // Create an invite link and store it in the backend
  this.createInviteLink = function(groupId, expirationDays) {
    const deferred = $q.defer();
    
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (expirationDays * 24 * 60 * 60 * 1000));
      
      // Generate secure token with encoded data
      const token = this.encodeInviteToken(groupId, expiresAt.toISOString(), expirationDays);
      
      const inviteData = {
        uuid: token,
        groupId: groupId,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        expirationDays: expirationDays,
        active: true
      };
      
      // Store the invite link in the backend
      $http.post(`${API_BASE}/conversations/invites/${groupId}/invite`, {
        invite_links: token
      }, {
        headers: getHeaders()
      }).then(function(response) {
        console.log('✅ Invite link stored in backend:', {
          token: token.substring(0, 20) + '...',
          groupId: groupId,
          expiresAt: expiresAt.toISOString(),
          expirationDays: expirationDays
        });
        
        // Cache locally for quick access
        self.cacheInviteLink(inviteData);
        
        // Schedule automatic cleanup when it expires
        self.scheduleExpiredLinkCleanup(groupId, token, expiresAt);
        
        deferred.resolve(inviteData);
      }).catch(function(error) {
        console.error('❌ Failed to store invite link in backend:', error);
        deferred.reject(error);
      });
      
    } catch (error) {
      console.error('❌ Failed to create invite link:', error);
      deferred.reject(error);
    }
    
    return deferred.promise;
  };

  // Get all active invite links for a group from backend
  this.getGroupInviteLinks = function(groupId) {
    const deferred = $q.defer();
    
    $http.get(`${API_BASE}/conversations/invites/${groupId}/invite`, {
      headers: getHeaders()
    }).then(function(response) {
      const backendLinks = response.data.invite_links || [];
      const processedLinks = [];
      
      // Process each link from backend
      backendLinks.forEach(function(token) {
        const decoded = self.decodeInviteToken(token);
        if (decoded) {
          processedLinks.push({
            uuid: token,
            groupId: decoded.groupId,
            createdAt: new Date(decoded.timestamp).toISOString(),
            expiresAt: decoded.expiresAt,
            expirationDays: decoded.expirationDays,
            active: true
          });
        }
      });
      
      console.log('📋 Retrieved', processedLinks.length, 'active invite links from backend for group:', groupId);
      deferred.resolve(processedLinks);
    }).catch(function(error) {
      console.error('❌ Failed to get invite links from backend:', error);
      deferred.reject(error);
    });
    
    return deferred.promise;
  };

  // Get the most recent active invite link for a group
  this.getActiveInviteLink = function(groupId) {
    const deferred = $q.defer();
    
    this.getGroupInviteLinks(groupId).then(function(links) {
      if (links.length === 0) {
        deferred.resolve(null);
        return;
      }
      
      // Filter out expired links and sort by creation date
      const now = new Date();
      const activeLinks = links.filter(function(link) {
        return new Date(link.expiresAt) > now;
      });
      
      if (activeLinks.length === 0) {
        deferred.resolve(null);
        return;
      }
      
      // Sort by creation date (most recent first)
      activeLinks.sort(function(a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      
      deferred.resolve(activeLinks[0]);
    }).catch(function(error) {
      deferred.reject(error);
    });
    
    return deferred.promise;
  };

  // Validate an invite link by checking if it exists in backend and is not expired
  this.validateInviteLink = function(token) {
    const deferred = $q.defer();
    
    // First, decode the token to get basic info
    const decoded = this.decodeInviteToken(token);
    
    if (!decoded) {
      deferred.resolve({
        valid: false,
        reason: 'invalid',
        message: 'Invalid invite link format. Please request a new link.'
      });
      return deferred.promise;
    }
    
    // Check if token is expired by time
    const now = new Date();
    const expiresAt = new Date(decoded.expiresAt);
    
    if (now > expiresAt) {
      // Token is expired, should be cleaned up
      this.cleanupExpiredLink(decoded.groupId, token);
      
      deferred.resolve({
        valid: false,
        reason: 'expired',
        message: 'This invite link has expired. Please request a new link.',
        expiredAt: decoded.expiresAt
      });
      return deferred.promise;
    }
    
    // Check if token exists in backend (this is the authoritative check)
    $http.get(`${API_BASE}/conversations/invites/${decoded.groupId}/invite`, {
      headers: getHeaders()
    }).then(function(response) {
      const backendLinks = response.data.invite_links || [];
      const tokenExists = backendLinks.includes(token);
      
      if (tokenExists) {
        // Token exists in backend and is not expired
        deferred.resolve({
          valid: true,
          groupId: decoded.groupId,
          expiresAt: decoded.expiresAt,
          token: token,
          createdAt: new Date(decoded.timestamp).toISOString()
        });
      } else {
        // Token doesn't exist in backend (revoked or never existed)
        deferred.resolve({
          valid: false,
          reason: 'revoked',
          message: 'This invite link has been revoked by the group admin. Please request a new link.'
        });
      }
    }).catch(function(error) {
      console.error('❌ Failed to validate invite link with backend:', error);
      
      // If backend is unreachable, fall back to local validation
      if (now <= expiresAt) {
        deferred.resolve({
          valid: true,
          groupId: decoded.groupId,
          expiresAt: decoded.expiresAt,
          token: token,
          createdAt: new Date(decoded.timestamp).toISOString(),
          fallback: true
        });
      } else {
        deferred.resolve({
          valid: false,
          reason: 'expired',
          message: 'This invite link has expired. Please request a new link.',
          expiredAt: decoded.expiresAt
        });
      }
    });
    
    return deferred.promise;
  };

  // Revoke an invite link by removing it from the backend
  this.revokeInviteLink = function(token) {
    const deferred = $q.defer();
    
    const decoded = this.decodeInviteToken(token);
    if (!decoded) {
      deferred.reject('Invalid token format');
      return deferred.promise;
    }
    
    // Remove the invite link from backend
    $http.delete(`${API_BASE}/conversations/invites/${decoded.groupId}/invite`, {
      headers: getHeaders(),
      data: {
        invite_links: token
      }
    }).then(function(response) {
      console.log('🚫 Invite link revoked from backend:', token.substring(0, 20) + '...');
      
      // Remove from local cache
      self.removeCachedInviteLink(token);
      
      deferred.resolve(true);
    }).catch(function(error) {
      console.error('❌ Failed to revoke invite link from backend:', error);
      deferred.reject(error);
    });
    
    return deferred.promise;
  };

  // Revoke all invite links for a group
  this.revokeAllGroupInvites = function(groupId) {
    const deferred = $q.defer();
    
    // First get all current links
    this.getGroupInviteLinks(groupId).then(function(links) {
      if (links.length === 0) {
        deferred.resolve(0);
        return;
      }
      
      // Revoke each link
      const revokePromises = links.map(function(link) {
        return self.revokeInviteLink(link.uuid);
      });
      
      $q.all(revokePromises).then(function() {
        console.log('🚫 Revoked', links.length, 'invite links for group:', groupId);
        deferred.resolve(links.length);
      }).catch(function(error) {
        console.error('❌ Failed to revoke all group invites:', error);
        deferred.reject(error);
      });
    }).catch(function(error) {
      deferred.reject(error);
    });
    
    return deferred.promise;
  };

  // Clean up expired link from backend
  this.cleanupExpiredLink = function(groupId, token) {
    console.log('🧹 Cleaning up expired link:', token.substring(0, 20) + '...');
    
    $http.delete(`${API_BASE}/conversations/invites/${groupId}/invite`, {
      headers: getHeaders(),
      data: {
        invite_links: token
      }
    }).then(function(response) {
      console.log('✅ Expired link cleaned up from backend');
      self.removeCachedInviteLink(token);
    }).catch(function(error) {
      console.error('❌ Failed to cleanup expired link from backend:', error);
    });
  };

  // Schedule automatic cleanup of expired links
  this.scheduleExpiredLinkCleanup = function(groupId, token, expiresAt) {
    const now = new Date();
    const expireTime = new Date(expiresAt);
    const timeUntilExpiry = expireTime.getTime() - now.getTime();
    
    if (timeUntilExpiry > 0) {
      setTimeout(function() {
        console.log('⏰ Scheduled cleanup triggered for expired link');
        self.cleanupExpiredLink(groupId, token);
      }, timeUntilExpiry + 1000); // Add 1 second buffer
      
      console.log('⏰ Scheduled cleanup for link in', Math.round(timeUntilExpiry / 1000), 'seconds');
    }
  };

  // Clean up all expired links for a group
  this.cleanupExpiredLinks = function(groupId) {
    const deferred = $q.defer();
    
    this.getGroupInviteLinks(groupId).then(function(links) {
      const now = new Date();
      const expiredLinks = links.filter(function(link) {
        return new Date(link.expiresAt) <= now;
      });
      
      if (expiredLinks.length === 0) {
        deferred.resolve(0);
        return;
      }
      
      // Remove expired links from backend
      const cleanupPromises = expiredLinks.map(function(link) {
        return self.cleanupExpiredLink(link.groupId, link.uuid);
      });
      
      $q.all(cleanupPromises).then(function() {
        console.log('🧹 Cleaned up', expiredLinks.length, 'expired links for group:', groupId);
        deferred.resolve(expiredLinks.length);
      }).catch(function(error) {
        console.error('❌ Failed to cleanup expired links:', error);
        deferred.reject(error);
      });
    }).catch(function(error) {
      deferred.reject(error);
    });
    
    return deferred.promise;
  };

  // Local caching functions for better performance
  this.cacheInviteLink = function(inviteData) {
    try {
      const cached = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
      cached[inviteData.uuid] = {
        ...inviteData,
        cachedAt: new Date().toISOString()
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cached));
    } catch (error) {
      console.error('❌ Failed to cache invite link:', error);
    }
  };

  this.removeCachedInviteLink = function(token) {
    try {
      const cached = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
      delete cached[token];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cached));
    } catch (error) {
      console.error('❌ Failed to remove cached invite link:', error);
    }
  };

  this.getCachedInviteLink = function(token) {
    try {
      const cached = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
      return cached[token] || null;
    } catch (error) {
      console.error('❌ Failed to get cached invite link:', error);
      return null;
    }
  };

  // Clean up old cached data
  this.cleanupCache = function() {
    try {
      const cached = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
      const now = new Date();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      let cleaned = 0;
      
      Object.keys(cached).forEach(function(token) {
        const cachedAt = new Date(cached[token].cachedAt);
        if (now - cachedAt > maxAge) {
          delete cached[token];
          cleaned++;
        }
      });
      
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cached));
      
      if (cleaned > 0) {
        console.log('🧹 Cleaned up', cleaned, 'old cached invite links');
      }
    } catch (error) {
      console.error('❌ Failed to cleanup cache:', error);
    }
  };

  // Initialize service
  this.init = function() {
    // Clean up old cached data on service initialization
    this.cleanupCache();
    
    console.log('✅ Backend-integrated InviteService initialized');
  };

  // Store reference to this for use in callbacks
  const self = this;
  
  // Auto-initialize when service is loaded
  setTimeout(function() {
    self.init();
  }, 100);
}]);