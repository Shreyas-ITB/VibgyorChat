import angular from 'angular';
import '../../app.module.js'; // Ensure the module is loaded

angular.module('vibgyorChat').controller('InviteController', ['$scope', '$location', '$routeParams', '$timeout', 'AuthService', 'ToastService', 'InviteService', function($scope, $location, $routeParams, $timeout, AuthService, ToastService, InviteService) {
  $scope.loading = true;
  $scope.inviteCode = $routeParams.inviteCode;
  $scope.message = 'Processing invite link...';
  $scope.error = false;
  $scope.validationDetails = null;

  $scope.init = function() {
    // Validate the invite code (UUID)
    if (!$scope.inviteCode) {
      $scope.error = true;
      $scope.message = 'Error: Invalid invite link format';
      $scope.loading = false;
      return;
    }
    
    console.log('🔍 Processing invite link with backend validation:', $scope.inviteCode.substring(0, 20) + '...');
    
    // Enhanced validation with backend integration
    InviteService.validateInviteLink($scope.inviteCode).then(function(validation) {
      $scope.validationDetails = validation;
      
      if (!validation.valid) {
        $scope.error = true;
        $scope.loading = false;
        
        // Provide specific error messages with helpful guidance
        if (validation.reason === 'revoked') {
          $scope.message = 'This invite link has been revoked by the group admin.';
          console.log('❌ Invite link revoked:', validation.revokedReason || 'unknown reason');
        } else if (validation.reason === 'expired') {
          $scope.message = 'This invite link has expired.';
          console.log('❌ Invite link expired at:', validation.expiredAt);
        } else if (validation.reason === 'invalid') {
          $scope.message = 'Invalid invite link format. The link may be corrupted.';
        } else {
          $scope.message = validation.message || 'Invalid invite link.';
        }
        
        console.log('❌ Invalid invite link:', validation);
        return;
      }
      
      // Valid invite link - extract group ID
      const groupId = validation.groupId;
      console.log('✅ Valid invite link for group:', groupId, 'expires:', validation.expiresAt);
      
      // Store the group ID and invite token securely
      try {
        localStorage.setItem('pendingGroupInvite', groupId);
        localStorage.setItem('pendingInviteToken', $scope.inviteCode);
        
        // Verify storage worked
        const stored = localStorage.getItem('pendingGroupInvite');
        const storedToken = localStorage.getItem('pendingInviteToken');
        if (stored !== groupId || storedToken !== $scope.inviteCode) {
          throw new Error('Storage verification failed');
        }
        
        console.log('✅ Invite data stored successfully');
      } catch (error) {
        console.error('❌ Failed to store invite data:', error);
        $scope.error = true;
        $scope.message = 'Error: Cannot access browser storage. Please check your browser settings.';
        $scope.loading = false;
        return;
      }
      
      // Check authentication and redirect with appropriate timing
      $timeout(function() {
        const hasAccessToken = !!localStorage.getItem('access_token');
        const hasRefreshToken = !!localStorage.getItem('refresh_token');
        const isAuthenticated = AuthService.isAuthenticated();
        
        if (hasAccessToken && hasRefreshToken && isAuthenticated) {
          // User is authenticated, go to chat
          $scope.message = 'Joining group...';
          console.log('✅ User authenticated, redirecting to chat');
          
          $timeout(function() {
            $location.path('/chat');
          }, 1000);
        } else {
          // User not authenticated, go to login
          $scope.message = 'Redirecting to login...';
          console.log('ℹ️ User not authenticated, redirecting to login');
          
          $timeout(function() {
            $location.path('/login');
          }, 1500);
        }
      }, 800); // Show the processing animation for a bit
    }).catch(function(error) {
      console.error('❌ Failed to validate invite link with backend:', error);
      $scope.error = true;
      $scope.loading = false;
      
      if (error.status === 401) {
        $scope.message = 'Authentication required. Please log in to use this invite link.';
        
        // Store invite for after login
        try {
          const decoded = InviteService.decodeInviteToken($scope.inviteCode);
          if (decoded) {
            localStorage.setItem('pendingGroupInvite', decoded.groupId);
            localStorage.setItem('pendingInviteToken', $scope.inviteCode);
          }
        } catch (e) {
          console.error('Failed to store invite for later:', e);
        }
        
        $timeout(function() {
          $location.path('/login');
        }, 2000);
      } else if (error.status === 403) {
        $scope.message = 'You do not have permission to access this group.';
      } else {
        $scope.message = 'Failed to validate invite link. Please try again or request a new link.';
      }
    });
  };

  // Initialize
  $scope.init();
}]);