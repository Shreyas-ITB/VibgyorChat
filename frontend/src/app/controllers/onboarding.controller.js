import angular from 'angular';
import '../../app.module.js'; // Ensure the module is loaded

angular.module('vibgyorChat').controller('OnboardingController', ['$scope', '$location', '$timeout', 'AuthService', 'ToastService', function($scope, $location, $timeout, AuthService, ToastService) {
  $scope.formData = {
    name: '',
    username: '',
    profilePicture: null
  };

  $scope.loading = false;
  $scope.usernameChecking = false;
  $scope.usernameAvailable = null;
  $scope.usernameError = '';
  $scope.checkUsernameTimeout = null;
  $scope.profilePicturePreview = null;

  // Check if user is authenticated
  $scope.init = function() {
    // NEVER read tokens from URL - only use localStorage
    if (!AuthService.isAuthenticated()) {
      $location.path('/login');
      return;
    }

    // User is authenticated via localStorage, proceed with onboarding
  };

  $scope.onUsernameChange = function() {
    // Clear previous timeout
    if ($scope.checkUsernameTimeout) {
      $timeout.cancel($scope.checkUsernameTimeout);
    }

    // Reset states
    $scope.usernameAvailable = null;
    $scope.usernameError = '';

    if (!$scope.formData.username || $scope.formData.username.length < 3) {
      $scope.usernameError = 'Username must be at least 3 characters long';
      return;
    }

    // Check username after user stops typing (500ms delay)
    $scope.checkUsernameTimeout = $timeout(function() {
      $scope.checkUsername();
    }, 500);
  };

  $scope.checkUsername = function() {
    if (!$scope.formData.username) return;

    $scope.usernameChecking = true;
    $scope.usernameError = '';

    AuthService.checkUsernameAvailability($scope.formData.username)
      .then(function(response) {
        if (response.success) {
          if (response.available) {
            $scope.usernameAvailable = true;
            $scope.usernameError = '';
          } else {
            $scope.usernameAvailable = false;
            $scope.usernameError = 'Username is not available. Please choose a different one.';
          }
        }
      })
      .catch(function(error) {
        $scope.usernameError = 'Error checking username availability';
        console.error('Username check failed:', error);
      })
      .finally(function() {
        $scope.usernameChecking = false;
      });
  };

  $scope.onProfilePictureChange = function(event) {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        ToastService.error('Please select a valid image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        ToastService.error('Image size should be less than 5MB');
        return;
      }

      $scope.formData.profilePicture = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = function(e) {
        $scope.$apply(function() {
          $scope.profilePicturePreview = e.target.result;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  $scope.removeProfilePicture = function() {
    $scope.formData.profilePicture = null;
    $scope.profilePicturePreview = null;
    
    // Clear file input
    const fileInput = document.getElementById('profilePictureInput');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  $scope.completeProfile = function() {
    // Validate form
    if (!$scope.formData.name || !$scope.formData.username) {
      ToastService.error('Please fill in all required fields');
      return;
    }

    if ($scope.usernameAvailable === false) {
      ToastService.error('Please choose an available username');
      return;
    }

    if ($scope.usernameAvailable === null && $scope.formData.username) {
      ToastService.error('Please wait for username validation to complete');
      return;
    }

    $scope.loading = true;

    AuthService.completeProfile($scope.formData)
      .then(function(response) {
        ToastService.success('Profile completed successfully!');
        $location.path('/chat');
      })
      .catch(function(error) {
        console.error('Profile completion failed:', error);
      })
      .finally(function() {
        $scope.loading = false;
      });
  };

  $scope.skipProfilePicture = function() {
    $scope.formData.profilePicture = null;
    $scope.profilePicturePreview = null;
  };

  // Clean up timeout on scope destroy
  $scope.$on('$destroy', function() {
    if ($scope.checkUsernameTimeout) {
      $timeout.cancel($scope.checkUsernameTimeout);
    }
  });

  // Initialize the controller
  $scope.init();
}]);