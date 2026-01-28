import angular from 'angular';
import '../../app.module.js'; // Ensure the module is loaded

angular.module('vibgyorChat').controller('InviteController', ['$scope', '$location', '$routeParams', '$timeout', 'AuthService', 'ToastService', 'InviteService', function($scope, $location, $routeParams, $timeout, AuthService, ToastService, InviteService) {
  $scope.loading = true;
  $scope.inviteCode = $routeParams.inviteCode;
  $scope.message = 'Processing invite link...';
  $scope.error = false;

  $scope.init = function() {
    // Validate the invite code (UUID)
    if (!$scope.inviteCode) {
      $scope.error = true;
      $scope.message = 'Error: Invalid invite link';
      $scope.loading = false;
      return;
    }
    
    // Validate the invite link
    const validation = InviteService.validateInviteLink($scope.inviteCode);
    
    if (!validation.valid) {
      $scope.error = true;
      $scope.loading = false;
      
      if (validation.reason === 'revoked') {
        $scope.message = 'This invite link has been revoked by the group admin. Please request a new link.';
      } else if (validation.reason === 'expired') {
        $scope.message = 'This invite link has expired. Please request a new link from the group admin.';
      } else {
        $scope.message = 'Invalid invite link. Please request a new link from the group admin.';
      }
      
      console.log('❌ Invalid invite link:', validation);
      return;
    }
    
    // Valid invite link - extract group ID
    const groupId = validation.groupId;
    console.log('✅ Valid invite link for group:', groupId);
    
    // Store the group ID and invite token
    try {
      localStorage.setItem('pendingGroupInvite', groupId);
      localStorage.setItem('pendingInviteToken', $scope.inviteCode);
      
      // Verify storage
      const stored = localStorage.getItem('pendingGroupInvite');
      const storedToken = localStorage.getItem('pendingInviteToken');
      if (stored !== groupId || storedToken !== $scope.inviteCode) {
        $scope.error = true;
        $scope.message = 'Error: Failed to process invite';
        $scope.loading = false;
        return;
      }
    } catch (error) {
      $scope.error = true;
      $scope.message = 'Error: Cannot access browser storage';
      $scope.loading = false;
      return;
    }
    
    // Check authentication and redirect
    $timeout(function() {
      const hasAccessToken = !!localStorage.getItem('access_token');
      const hasRefreshToken = !!localStorage.getItem('refresh_token');
      const isAuthenticated = AuthService.isAuthenticated();
      
      if (hasAccessToken && hasRefreshToken && isAuthenticated) {
        // User is authenticated, go to chat
        $scope.message = 'Joining group...';
        
        $timeout(function() {
          $location.path('/chat');
        }, 1000);
      } else {
        // User not authenticated, go to login
        $scope.message = 'Redirecting to login...';
        
        $timeout(function() {
          $location.path('/login');
        }, 1500);
      }
    }, 800); // Show the animation for a bit
  };

  // Initialize
  $scope.init();
}]);