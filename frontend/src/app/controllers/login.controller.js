import angular from 'angular';
import '../../app.module.js'; // Ensure the module is loaded

angular.module('vibgyorChat').controller('LoginController', ['$scope', '$location', '$timeout', '$interval', 'AuthService', 'ToastService', function($scope, $location, $timeout, $interval, AuthService, ToastService) {
  $scope.formData = {
    email: '',
    verificationCode: '',
    username: '',
    fullName: ''
  };

  $scope.loading = false;
  $scope.verificationSent = false;
  $scope.canResend = true;
  $scope.resendCountdown = 0;
  $scope.countdownInterval = null;

  // Check if user is authenticated and redirect accordingly
  $scope.init = function() {
    // First, check if this is a Google callback with URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const complete = urlParams.get('complete');

    if (accessToken && refreshToken) {
      // Handle Google callback - this should only happen once
      AuthService.handleGoogleCallbackAndRedirect(accessToken, refreshToken, complete, $location);
      return; // Exit early for Google callback
    }

    // For normal login page visits, check if user is already authenticated via localStorage
    if (AuthService.isAuthenticated()) {
      $location.path('/chat');
      return;
    }

    // If we reach here, user is not authenticated and this is not a Google callback
    // Stay on login page
  };

  $scope.sendVerificationCode = function() {
    if (!$scope.formData.email) {
      ToastService.error('Please enter your email address');
      return;
    }

    $scope.loading = true;

    AuthService.sendVerificationCode($scope.formData.email)
      .then(function(result) {
        $scope.verificationSent = true;
        $scope.startResendCountdown();
      })
      .catch(function(error) {
        console.error('Failed to send verification code:', error);
      })
      .finally(function() {
        $scope.loading = false;
      });
  };

  $scope.verifyCode = function() {
    if (!$scope.formData.verificationCode) {
      ToastService.error('Please enter the verification code');
      return;
    }

    $scope.loading = true;

    AuthService.verifyEmailCode($scope.formData.email, $scope.formData.verificationCode)
      .then(function(result) {
        if (result.requiresCompletion) {
          $location.path('/onboarding');
        } else {
          $location.path('/chat');
        }
      })
      .catch(function(error) {
        console.error('Verification failed:', error);
      })
      .finally(function() {
        $scope.loading = false;
      });
  };

  $scope.googleLogin = function() {
    AuthService.googleLogin();
  };

  $scope.startResendCountdown = function() {
    $scope.canResend = false;
    $scope.resendCountdown = 60;

    $scope.countdownInterval = $interval(function() {
      $scope.resendCountdown--;
      if ($scope.resendCountdown <= 0) {
        $scope.canResend = true;
        $interval.cancel($scope.countdownInterval);
        $scope.countdownInterval = null;
      }
    }, 1000);
  };

  $scope.resendCode = function() {
    if ($scope.canResend) {
      $scope.sendVerificationCode();
    }
  };

  // Clean up interval on scope destroy
  $scope.$on('$destroy', function() {
    if ($scope.countdownInterval) {
      $interval.cancel($scope.countdownInterval);
    }
  });

  // Initialize the controller
  $scope.init();

  // Initialize starfield for login page
  angular.element(document).ready(function() {
    $scope.initLoginStarfield();
  });

  $scope.initLoginStarfield = function() {
    const parallaxContainer = document.getElementById('loginParallaxContainer');
    if (!parallaxContainer) return;
    
    // Create stars
    for (let i = 0; i < 30; i++) {
      const star = $scope.createStar();
      parallaxContainer.appendChild(star);
    }
    
    // Add mouse move listener
    document.addEventListener('mousemove', function(e) {
      const mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      const mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      
      const translateX = mouseX * 15;
      const translateY = mouseY * 8;
      
      parallaxContainer.style.transform = `translate(${translateX}px, ${translateY}px)`;
    });
    
    // Add new stars periodically
    setInterval(function() {
      if (parallaxContainer.children.length < 40) {
        const star = $scope.createStar();
        parallaxContainer.appendChild(star);
        
        setTimeout(function() {
          if (star.parentNode) {
            star.parentNode.removeChild(star);
          }
        }, 20000);
      }
    }, 3000);
  };

  $scope.createStar = function() {
    const star = document.createElement('div');
    star.className = 'star';
    
    const sizes = ['small', 'medium', 'large'];
    const size = sizes[Math.floor(Math.random() * sizes.length)];
    star.classList.add(size);
    
    if (Math.random() < 0.3) {
      star.classList.add('bright');
    }
    
    star.style.left = Math.random() * 100 + '%';
    star.style.animationDelay = Math.random() * 8 + 's';
    
    return star;
  };
}]);
