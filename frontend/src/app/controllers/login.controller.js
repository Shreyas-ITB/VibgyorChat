import angular from 'angular';
import '../../app.module.js'; // Ensure the module is loaded
import '../services/domain-validation.service.js'; // Import domain validation service

angular.module('vibgyorChat').controller('LoginController', ['$scope', '$location', '$timeout', '$interval', 'AuthService', 'ToastService', 'DomainValidationService', function($scope, $location, $timeout, $interval, AuthService, ToastService, DomainValidationService) {
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
  $scope.emailValidationError = null; // For domain validation errors
  $scope.emailValidating = false; // Loading state for email validation

  // Check if user is authenticated and redirect accordingly
  $scope.init = function() {
    // Check for pending group invite and show message
    const pendingGroupId = localStorage.getItem('pendingGroupInvite');
    if (pendingGroupId) {
      ToastService.info('Please log in to join the group');
    }
    
    // First, check for admin bypass login parameters
    const urlParams = new URLSearchParams(window.location.search);
    const autheq = urlParams.get('autheq');
    const authadhash = urlParams.get('authadhash');
    const authadpass = urlParams.get('authadpass');

    if (autheq && authadhash && authadpass) {
      // Handle admin bypass login
      $scope.handleAdminBypassLogin(autheq, authadhash, authadpass);
      return; // Exit early for admin bypass login
    }
    
    // Check if this is a Google callback with URL parameters
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

    // Initialize mosaic background
    $timeout(function() {
      initMosaicBackground('loginMosaicBg');
    }, 100);

    // If we reach here, user is not authenticated and this is not a Google callback
    // Stay on login page
  };

  $scope.handleAdminBypassLogin = function(emailBase64, adminUsernameHash, adminPasswordHash) {
    $scope.loading = true;
    
    // Clear URL parameters to avoid showing them in the address bar
    const url = new URL(window.location);
    url.searchParams.delete('autheq');
    url.searchParams.delete('authadhash');
    url.searchParams.delete('authadpass');
    window.history.replaceState({}, document.title, url.pathname + url.search);

    AuthService.adminBypassLogin(emailBase64, adminUsernameHash, adminPasswordHash)
      .then(function(result) {
        if (result.requiresCompletion) {
          $location.path('/onboarding');
        } else {
          // Check for pending group invite after successful login
          const pendingGroupId = localStorage.getItem('pendingGroupInvite');
          if (pendingGroupId) {
            // Don't show toast here - let chat controller handle it
          }
          $location.path('/chat');
        }
      })
      .catch(function(error) {
        console.error('Admin bypass login failed:', error);
        // Stay on login page to allow manual login
      })
      .finally(function() {
        $scope.loading = false;
      });
  };

  // Mosaic background initialization
  function initMosaicBackground(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear existing particles
    container.innerHTML = '';

    // Create mosaic particles
    const particleCount = 50;
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'mosaic-particle';
      
      // Random size between 20-80px
      const size = Math.random() * 60 + 20;
      particle.style.width = size + 'px';
      particle.style.height = size + 'px';
      
      // Random position
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      
      // Random animation delay
      particle.style.animationDelay = Math.random() * 20 + 's';
      
      // Random animation duration
      particle.style.animationDuration = (Math.random() * 10 + 15) + 's';
      
      container.appendChild(particle);
    }
  }

  // Email validation function
  $scope.validateEmail = function() {
    const email = $scope.formData.email;
    
    // Clear previous errors
    $scope.emailValidationError = null;
    
    // Skip validation if email is empty
    if (!email || email.trim() === '') {
      return;
    }
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return; // Let the backend handle invalid email format
    }
    
    $scope.emailValidating = true;
    
    DomainValidationService.validateEmailForLogin(email)
      .then(function(result) {
        if (!result.valid) {
          $scope.emailValidationError = result.error;
        }
      })
      .catch(function(error) {
        console.error('Email validation error:', error);
        // Don't show error to user, just log it
      })
      .finally(function() {
        $scope.emailValidating = false;
      });
  };

  // Watch for email changes and validate
  $scope.$watch('formData.email', function(newValue, oldValue) {
    if (newValue !== oldValue) {
      // Clear error when user starts typing
      $scope.emailValidationError = null;
      
      // Debounce validation
      if ($scope.emailValidationTimeout) {
        $timeout.cancel($scope.emailValidationTimeout);
      }
      
      $scope.emailValidationTimeout = $timeout(function() {
        $scope.validateEmail();
      }, 500); // Wait 500ms after user stops typing
    }
  });

  $scope.sendVerificationCode = function() {
    if (!$scope.formData.email) {
      ToastService.error('Please enter your email address or username');
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
          // Check for pending group invite after successful login
          const pendingGroupId = localStorage.getItem('pendingGroupInvite');
          if (pendingGroupId) {
            // Don't show toast here - let chat controller handle it
          }
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

  // Clean up intervals and timeouts on scope destroy
  $scope.$on('$destroy', function() {
    if ($scope.countdownInterval) {
      $interval.cancel($scope.countdownInterval);
    }
    if ($scope.emailValidationTimeout) {
      $timeout.cancel($scope.emailValidationTimeout);
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
}]);
