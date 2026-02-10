import angular from 'angular';
import '../../app.module.js'; // Ensure the module is loaded

angular.module('vibgyorChat').factory('AuthService', ['$http', '$q', '$location', '$window', '$rootScope', '$injector', 'ToastService', function($http, $q, $location, $window, $rootScope, $injector, ToastService) {
  const API_BASE = window.APP_CONFIG.API_BASE_URL;

  const service = {
    _isLoggingOut: false,
    
    sendVerificationCode: function(email) {
      const deferred = $q.defer();

      $http.post(`${API_BASE}/auth/email/login`, { email: email })
        .then(function(response) {
          if (response.data.success && response.data.otp_sent) {
            // Handle new response format with email_used and login_method
            const emailUsed = response.data.email_used || email;
            const loginMethod = response.data.login_method || 'email';
            
            ToastService.success(`Verification code sent to ${emailUsed}`);
            deferred.resolve(response.data);
          } else {
            ToastService.error('Failed to send verification code');
            deferred.reject('Failed to send verification code');
          }
        })
        .catch(function(error) {
          ToastService.error(error.data?.message || 'Failed to send verification code');
          deferred.reject(error);
        });

      return deferred.promise;
    },

    verifyEmailCode: function(email, otp) {
      const deferred = $q.defer();

      $http.post(`${API_BASE}/auth/email/login`, { 
        email: email, 
        otp: otp 
      })
        .then(function(response) {
          if (response.data.success) {
            // Store tokens
            service.setToken(response.data.access_token);
            service.setRefreshToken(response.data.refresh_token);
            
            ToastService.success('Login successful');
            
            // Check if profile completion is required
            if (!response.data.complete) {
              deferred.resolve({ requiresCompletion: true, data: response.data });
            } else {
              deferred.resolve({ requiresCompletion: false });
            }
          } else {
            ToastService.error('Invalid verification code');
            deferred.reject('Invalid verification code');
          }
        })
        .catch(function(error) {
          ToastService.error(error.data?.message || 'Invalid verification code');
          deferred.reject(error);
        });

      return deferred.promise;
    },

    adminBypassLogin: function(emailBase64, adminUsernameHash, adminPasswordHash) {
      const deferred = $q.defer();

      $http.post(`${API_BASE}/admin/bypass-login`, {
        email_base64: emailBase64,
        admin_username_hash: adminUsernameHash,
        admin_password_hash: adminPasswordHash
      })
        .then(function(response) {
          if (response.data.success) {
            // Store tokens
            service.setToken(response.data.access_token);
            service.setRefreshToken(response.data.refresh_token);
            
            ToastService.success('Admin bypass login successful');
            
            // Check if profile completion is required
            if (!response.data.complete) {
              deferred.resolve({ requiresCompletion: true, data: response.data });
            } else {
              deferred.resolve({ requiresCompletion: false, data: response.data });
            }
          } else {
            ToastService.error('Admin bypass login failed');
            deferred.reject('Admin bypass login failed');
          }
        })
        .catch(function(error) {
          console.error('Admin bypass login failed:', error);
          ToastService.error(error.data?.detail || 'Admin bypass login failed');
          deferred.reject(error);
        });

      return deferred.promise;
    },

    googleLogin: function() {
      // Redirect to Google OAuth - this works correctly as per your description
      $window.location.href = `${API_BASE}/auth/google/login`;
    },

    handleGoogleCallback: function(accessToken, refreshToken, complete) {
      // Store tokens internally without exposing to user
      service.setToken(accessToken);
      service.setRefreshToken(refreshToken);
      
      ToastService.success('Login successful');
      
      // Check if profile completion is required
      if (complete === 'false' || complete === false) {
        return { requiresCompletion: true };
      } else {
        return { requiresCompletion: false };
      }
    },

    handleGoogleCallbackAndRedirect: function(accessToken, refreshToken, complete, $location) {
      // Process callback
      const result = service.handleGoogleCallback(accessToken, refreshToken, complete);
      
      // Clear search parameters
      $location.search({});
      
      // Check for pending group invite
      const pendingGroupId = localStorage.getItem('pendingGroupInvite');
      
      // Redirect based on completion status
      if (result.requiresCompletion) {
        $location.path('/onboarding').replace();
      } else {
        if (pendingGroupId) {
          // Show message about joining group
          console.log('Pending group invite found after Google login:', pendingGroupId);
        }
        $location.path('/chat').replace();
      }
      
      return result;
    },

    cleanupUrlParameters: function() {
      // Remove any authentication-related URL parameters
      const url = new URL(window.location);
      url.searchParams.delete('access_token');
      url.searchParams.delete('refresh_token');
      url.searchParams.delete('complete');
      window.history.replaceState({}, document.title, url.pathname + url.search);
    },

    checkUsernameAvailability: function(username) {
      const deferred = $q.defer();

      $http.get(`${API_BASE}/auth/login/checkusername?q=${encodeURIComponent(username)}`)
        .then(function(response) {
          deferred.resolve(response.data);
        })
        .catch(function(error) {
          deferred.reject(error);
        });

      return deferred.promise;
    },

    checkUsername: function(username) {
      return service.checkUsernameAvailability(username);
    },

    updateProfile: function(formData) {
      const deferred = $q.defer();

      $http.post(`${API_BASE}/auth/login/completion`, formData, {
        headers: {
          'Content-Type': undefined, // Let browser set the content type for FormData
          'Authorization': `Bearer ${service.getToken()}`
        }
      })
        .then(function(response) {
          if (response.data.success) {
            ToastService.success('Profile updated successfully');
            deferred.resolve(response.data);
          } else {
            ToastService.error('Profile update failed');
            deferred.reject('Profile update failed');
          }
        })
        .catch(function(error) {
          ToastService.error(error.data?.message || 'Profile update failed');
          deferred.reject(error);
        });

      return deferred.promise;
    },

    completeProfile: function(formData) {
      const deferred = $q.defer();
      
      // Create FormData for file upload
      const data = new FormData();
      data.append('name', formData.name);
      data.append('username', formData.username);
      
      if (formData.profilePicture) {
        data.append('profile_picture', formData.profilePicture);
      }

      $http.post(`${API_BASE}/auth/login/completion`, data, {
        headers: {
          'Content-Type': undefined, // Let browser set the content type for FormData
          'Authorization': `Bearer ${service.getToken()}`
        }
      })
        .then(function(response) {
          if (response.data.success) {
            // Update tokens if provided
            if (response.data.access_token) {
              service.setToken(response.data.access_token);
            }
            if (response.data.refresh_token) {
              service.setRefreshToken(response.data.refresh_token);
            }
            
            ToastService.success('Profile completed successfully');
            deferred.resolve(response.data);
          } else {
            ToastService.error('Profile completion failed');
            deferred.reject('Profile completion failed');
          }
        })
        .catch(function(error) {
          ToastService.error(error.data?.message || 'Profile completion failed');
          deferred.reject(error);
        });

      return deferred.promise;
    },

    logout: function() {
      const token = service.getToken();

      // Set logout flag to prevent redirects during logout
      service._isLoggingOut = true;

      // Clear tokens immediately to prevent race conditions
      service.clearTokens();

      if (token) {
        $http.post(`${API_BASE}/auth/logout`, {}, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).finally(function() {
          service._isLoggingOut = false;
          // Clear user cache on logout using $injector to avoid circular dependency
          try {
            const UserService = $injector.get('UserService');
            UserService.clearCache();
          } catch (e) {
            // UserService might not be available
          }
          $location.path('/login');
        });
      } else {
        service._isLoggingOut = false;
        $location.path('/login');
      }
    },

    refreshToken: function() {
      const deferred = $q.defer();
      const refreshToken = service.getRefreshToken();
      const accessToken = service.getToken();

      if (!refreshToken) {
        deferred.reject('No refresh token available');
        service.logout();
        return deferred.promise;
      }

      $http.post(`${API_BASE}/auth/refreshtoken`, {
        refresh_token: refreshToken
      }, {
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'X-Skip-Interceptor': 'true' // Skip interceptor to prevent infinite loop
        }
      })
        .then(function(response) {
          if (response.data.success) {
            if (response.data.message === "Access token is still valid") {
              // Access token is still valid, no need to update
              deferred.resolve(accessToken);
            } else if (response.data.access_token) {
              // New access token received, update it
              service.setToken(response.data.access_token);
              deferred.resolve(response.data.access_token);
            } else {
              deferred.reject('Invalid refresh token response');
              service.logout();
            }
          } else {
            deferred.reject('Refresh token failed');
            service.logout();
          }
        })
        .catch(function(error) {
          console.error('Token refresh failed:', error);
          service.clearTokens();
          if (!service._isLoggingOut) {
            ToastService.error('Session expired. Please login again.');
            $location.path('/login');
          }
          deferred.reject(error);
        });

      return deferred.promise;
    },

    setToken: function(token) {
      localStorage.setItem('access_token', token);
      // Update HTTP headers
      $http.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Notify that token has been updated (for socket reconnection)
      service.onTokenUpdated();
    },

    onTokenUpdated: function() {
      // Broadcast token update event for socket reconnection
      $rootScope.$broadcast('auth:tokenUpdated');
    },

    getToken: function() {
      return localStorage.getItem('access_token');
    },

    setRefreshToken: function(token) {
      localStorage.setItem('refresh_token', token);
    },

    getRefreshToken: function() {
      return localStorage.getItem('refresh_token');
    },

    clearTokens: function() {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      delete $http.defaults.headers.common['Authorization'];
      
      // Reset logout flag
      service._isLoggingOut = false;
      
      // Broadcast token cleared event
      $rootScope.$broadcast('auth:tokenCleared');
    },

    isAuthenticated: function() {
      // Don't consider user authenticated during logout process
      if (service._isLoggingOut) {
        return false;
      }
      return !!(service.getToken() && service.getRefreshToken());
    },

    checkAuth: function() {
      const deferred = $q.defer();

      if (service.isAuthenticated()) {
        deferred.resolve();
      } else {
        deferred.reject('Not authenticated');
      }

      return deferred.promise;
    }
  };

  // Set authorization header if token exists
  const token = service.getToken();
  if (token) {
    $http.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  return service;
}]);
