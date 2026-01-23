import angular from 'angular';
import '../../app.module.js'; // Ensure the module is loaded

angular.module('vibgyorChat').controller('InviteController', ['$scope', '$location', '$routeParams', '$timeout', 'AuthService', 'ToastService', function($scope, $location, $routeParams, $timeout, AuthService, ToastService) {
  $scope.loading = true;
  $scope.groupId = $routeParams.groupId;
  $scope.message = 'Processing invite link...';

  $scope.init = function() {
    // Store the group ID
    if ($scope.groupId) {
      try {
        localStorage.setItem('pendingGroupInvite', $scope.groupId);
        
        // Verify storage
        const stored = localStorage.getItem('pendingGroupInvite');
        if (stored !== $scope.groupId) {
          $scope.message = 'Error: Failed to process invite';
          return;
        }
      } catch (error) {
        $scope.message = 'Error: Cannot access browser storage';
        return;
      }
    } else {
      $scope.message = 'Error: Invalid invite link';
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