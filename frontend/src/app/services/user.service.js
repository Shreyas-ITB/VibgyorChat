import angular from 'angular';
import '../../app.module.js'; // Ensure the module is loaded

angular.module('vibgyorChat').factory('UserService', ['$http', '$q', 'AuthService', 'ToastService', function($http, $q, AuthService, ToastService) {
  const API_BASE = window.APP_CONFIG.API_BASE_URL;

  const service = {
    currentUser: null,
    _userDataCached: false,

    getHeaders: function() {
      return {
        'Authorization': `Bearer ${AuthService.getToken()}`
      };
    },

    getMe: function(forceRefresh = false) {
      const deferred = $q.defer();

      // Return cached data if available and not forcing refresh
      if (service.currentUser && service._userDataCached && !forceRefresh) {
        deferred.resolve(service.currentUser);
        return deferred.promise;
      }

      $http.get(`${API_BASE}/users/me`, { headers: service.getHeaders() })
        .then(function(response) {
          // Extract user data from the nested response structure
          if (response.data.success && response.data.user) {
            service.currentUser = response.data.user;
            service._userDataCached = true;
            
            // Set the profile picture URL properly
            service.currentUser.profile_picture_url = service.getProfilePicture(service.currentUser.profile_picture);
            
            deferred.resolve(service.currentUser);
          } else {
            deferred.reject('Invalid response format');
          }
        })
        .catch(function(error) {
          if (error.status === 401) {
            AuthService.refreshToken().then(function() {
              service.getMe(forceRefresh).then(deferred.resolve, deferred.reject);
            });
          } else {
            console.error('Failed to fetch user data:', error);
            deferred.reject(error);
          }
        });

      return deferred.promise;
    },

    clearCache: function() {
      service.currentUser = null;
      service._userDataCached = false;
    },

    getContacts: function() {
      const deferred = $q.defer();

      $http.get(`${API_BASE}/users/contacts`, { headers: service.getHeaders() })
        .then(function(response) {
          if (response.data.success && response.data.contacts) {
            // Get detailed user info for each contact
            const contactPromises = response.data.contacts.map(function(contact) {
              return service.getUserInfo(contact.email).then(function(userInfo) {
                // Merge contact metadata with user info and map API flags to display properties
                return {
                  ...userInfo,
                  muted: contact.muted,
                  blocked: contact.blocked,
                  archived: contact.archived,
                  added_at: contact.added_at,
                  // Map API flags to display properties
                  pinned: contact.is_pinned || false,
                  favorited: contact.is_favorited || false,
                  is_favorited: contact.is_favorited || false,
                  is_pinned: contact.is_pinned || false,
                  online: false // Default to offline, will be updated by socket events
                };
              }).catch(function(error) {
                console.error('Failed to get user info for contact:', contact.email, error);
                // Return basic contact info if user info fetch fails
                return {
                  email: contact.email,
                  name: contact.email.split('@')[0], // Fallback name
                  username: contact.email.split('@')[0], // Fallback username
                  profile_picture: null,
                  muted: contact.muted,
                  blocked: contact.blocked,
                  archived: contact.archived,
                  added_at: contact.added_at,
                  pinned: contact.is_pinned || false,
                  favorited: contact.is_favorited || false,
                  is_favorited: contact.is_favorited || false,
                  is_pinned: contact.is_pinned || false,
                  online: false
                };
              });
            });

            $q.all(contactPromises).then(function(detailedContacts) {
              deferred.resolve(detailedContacts);
            }).catch(function(error) {
              console.error('Failed to fetch contact details:', error);
              deferred.resolve([]); // Return empty array on error
            });
          } else {
            deferred.resolve([]);
          }
        })
        .catch(function(error) {
          console.error('Failed to load contacts:', error);
          ToastService.error('Failed to load contacts');
          deferred.resolve([]);
        });

      return deferred.promise;
    },

    searchUsers: function(query) {
      const deferred = $q.defer();

      if (!query || query.trim().length === 0) {
        deferred.resolve({ contacts: [], global: [] });
        return deferred.promise;
      }

      $http.get(`${API_BASE}/users/search?q=${encodeURIComponent(query.trim())}`, {
        headers: service.getHeaders()
      })
        .then(function(response) {
          if (response.data.success) {
            deferred.resolve(response.data.results);
          } else {
            deferred.resolve({ contacts: [], global: [] });
          }
        })
        .catch(function(error) {
          console.error('Search failed:', error);
          deferred.resolve({ contacts: [], global: [] });
        });

      return deferred.promise;
    },

    getUserInfo: function(email) {
      const deferred = $q.defer();

      $http.post(`${API_BASE}/users/info`, { email: email }, {
        headers: service.getHeaders()
      })
        .then(function(response) {
          if (response.data.success && response.data.user) {
            deferred.resolve(response.data.user);
          } else {
            deferred.reject('Invalid response format');
          }
        })
        .catch(function(error) {
          console.error('Failed to get user info:', error);
          deferred.reject(error);
        });

      return deferred.promise;
    },

    addContact: function(email) {
      const deferred = $q.defer();

      $http.post(`${API_BASE}/users/add`, { email: email }, {
        headers: service.getHeaders()
      })
        .then(function(response) {
          if (response.data.success) {
            ToastService.success(response.data.message || 'Contact added successfully');
            deferred.resolve(response.data);
          } else {
            ToastService.error('Failed to add contact');
            deferred.reject('Failed to add contact');
          }
        })
        .catch(function(error) {
          ToastService.error(error.data?.message || 'Failed to add contact');
          deferred.reject(error);
        });

      return deferred.promise;
    },

    removeContact: function(email) {
      const deferred = $q.defer();

      $http.post(`${API_BASE}/users/remove`, { email: email }, {
        headers: service.getHeaders()
      })
        .then(function(response) {
          ToastService.success('Contact removed');
          deferred.resolve(response.data);
        })
        .catch(function(error) {
          ToastService.error('Failed to remove contact');
          deferred.reject(error);
        });

      return deferred.promise;
    },

    muteContact: function(email) {
      const deferred = $q.defer();

      $http.post(`${API_BASE}/users/mute`, { email: email }, {
        headers: service.getHeaders()
      })
        .then(function(response) {
          if (response.data.success) {
            // Get contact name for toast message
            service.getUserInfo(email).then(function(userInfo) {
              const contactName = userInfo.name || userInfo.username || email;
              const action = response.data.muted ? 'muted' : 'unmuted';
              ToastService.success(`${contactName} ${action}`);
            }).catch(function() {
              const action = response.data.muted ? 'muted' : 'unmuted';
              ToastService.success(`Contact ${action}`);
            });
            deferred.resolve(response.data);
          } else {
            ToastService.error('Failed to update mute status');
            deferred.reject('Failed to update mute status');
          }
        })
        .catch(function(error) {
          ToastService.error('Failed to update mute status');
          deferred.reject(error);
        });

      return deferred.promise;
    },

    blockContact: function(email) {
      const deferred = $q.defer();

      $http.post(`${API_BASE}/users/block`, { email: email }, {
        headers: service.getHeaders()
      })
        .then(function(response) {
          ToastService.success('Contact blocked');
          deferred.resolve(response.data);
        })
        .catch(function(error) {
          ToastService.error('Failed to block contact');
          deferred.reject(error);
        });

      return deferred.promise;
    },

    archiveContact: function(email) {
      const deferred = $q.defer();

      $http.post(`${API_BASE}/users/archive`, { email: email }, {
        headers: service.getHeaders()
      })
        .then(function(response) {
          if (response.data.success) {
            // Get contact name for toast message
            service.getUserInfo(email).then(function(userInfo) {
              const contactName = userInfo.name || userInfo.username || email;
              const action = response.data.archived ? 'archived' : 'unarchived';
              ToastService.success(`${contactName} ${action}`);
            }).catch(function() {
              const action = response.data.archived ? 'archived' : 'unarchived';
              ToastService.success(`Contact ${action}`);
            });
            deferred.resolve(response.data);
          } else {
            ToastService.error('Failed to update archive status');
            deferred.reject('Failed to update archive status');
          }
        })
        .catch(function(error) {
          ToastService.error('Failed to update archive status');
          deferred.reject(error);
        });

      return deferred.promise;
    },

    pinContact: function(email) {
      const deferred = $q.defer();

      $http.post(`${API_BASE}/users/pinned`, { email: email }, {
        headers: service.getHeaders()
      })
        .then(function(response) {
          if (response.data.success) {
            // Get contact name for toast message
            service.getUserInfo(email).then(function(userInfo) {
              const contactName = userInfo.name || userInfo.username || email;
              const action = response.data.pinned ? 'pinned' : 'unpinned';
              ToastService.success(`${contactName} ${action}`);
            }).catch(function() {
              const action = response.data.pinned ? 'pinned' : 'unpinned';
              ToastService.success(`Contact ${action}`);
            });
            deferred.resolve(response.data);
          } else {
            ToastService.error('Failed to update pin status');
            deferred.reject('Failed to update pin status');
          }
        })
        .catch(function(error) {
          ToastService.error('Failed to update pin status');
          deferred.reject(error);
        });

      return deferred.promise;
    },

    favoriteContact: function(email) {
      const deferred = $q.defer();

      $http.post(`${API_BASE}/users/favorite`, { email: email }, {
        headers: service.getHeaders()
      })
        .then(function(response) {
          if (response.data.success) {
            // Get contact name for toast message
            service.getUserInfo(email).then(function(userInfo) {
              const contactName = userInfo.name || userInfo.username || email;
              const action = response.data.favorited ? 'added to favorites' : 'removed from favorites';
              ToastService.success(`${contactName} ${action}`);
            }).catch(function() {
              const action = response.data.favorited ? 'added to favorites' : 'removed from favorites';
              ToastService.success(`Contact ${action}`);
            });
            deferred.resolve(response.data);
          } else {
            ToastService.error('Failed to update favorite status');
            deferred.reject('Failed to update favorite status');
          }
        })
        .catch(function(error) {
          ToastService.error('Failed to update favorite status');
          deferred.reject(error);
        });

      return deferred.promise;
    },

    getProfilePicture: function(filename) {
      if (!filename) {
        return 'https://ui-avatars.com/api/?name=User&background=9333ea&color=fff&size=128';
      }
      
      // If it's already a full URL (starts with http), return as is
      if (filename.startsWith('http')) {
        return filename;
      }
      
      // If it starts with /uploads/, it's an uploaded file that needs authentication
      if (filename.startsWith('/uploads/')) {
        // Extract just the filename from the path
        const parts = filename.split('/');
        const actualFilename = parts[parts.length - 1];
        return service.getAuthenticatedImageUrl(actualFilename);
      }
      
      // Otherwise, assume it's a filename and construct the authenticated URL
      return service.getAuthenticatedImageUrl(filename);
    },

    getAuthenticatedImageUrl: function(filename) {
      // Create a blob URL for authenticated images
      const token = AuthService.getToken();
      if (!token) {
        return 'https://ui-avatars.com/api/?name=User&background=9333ea&color=fff&size=128';
      }

      // Return a special URL that will be handled by our image loading service
      return `auth-image://${filename}`;
    },

    loadAuthenticatedImage: function(filename) {
      const deferred = $q.defer();
      const token = AuthService.getToken();

      if (!token) {
        deferred.reject('No authentication token');
        return deferred.promise;
      }

      $http.get(`${API_BASE}/media/profile/${filename}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'arraybuffer'
      })
        .then(function(response) {
          // Create blob URL for the image
          const contentType = response.headers('content-type') || 'image/jpeg';
          const blob = new Blob([response.data], { type: contentType });
          const imageUrl = URL.createObjectURL(blob);
          deferred.resolve(imageUrl);
        })
        .catch(function(error) {
          console.error('Failed to load authenticated image:', error);
          // Fallback to default avatar
          deferred.resolve('https://ui-avatars.com/api/?name=User&background=9333ea&color=fff&size=128');
        });

      return deferred.promise;
    }
  };

  return service;
}]);
