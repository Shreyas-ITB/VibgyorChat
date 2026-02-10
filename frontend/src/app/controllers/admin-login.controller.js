import angular from 'angular';
import '../../app.module.js';

angular.module('vibgyorChat').controller('AdminLoginController', ['$scope', '$location', function($scope, $location) {
  
  $scope.credentials = {
    username: '',
    password: ''
  };
  
  $scope.error = '';
  $scope.loading = false;

  // Check if already logged in
  const adminToken = localStorage.getItem('admin_token');
  if (adminToken) {
    $location.path('/panel/admin');
  }

  $scope.login = function() {
    $scope.error = '';
    
    if (!$scope.credentials.username || !$scope.credentials.password) {
      $scope.error = 'Please enter both username and password';
      return;
    }

    $scope.loading = true;

    // Check credentials against config
    if ($scope.credentials.username === window.APP_CONFIG.ADMIN_USERNAME && 
        $scope.credentials.password === window.APP_CONFIG.ADMIN_PASSWORD) {
      
      // Generate a simple token (in production, this should be more secure)
      const token = btoa($scope.credentials.username + ':' + Date.now());
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_username', $scope.credentials.username);
      
      // Redirect to admin panel
      $location.path('/panel/admin');
    } else {
      $scope.error = 'Invalid username or password';
      $scope.loading = false;
    }
  };

  $scope.onKeyPress = function(event) {
    if (event.key === 'Enter') {
      $scope.login();
    }
  };

  $scope.goBackToApp = function() {
    $location.path('/login');
  };

}]);
