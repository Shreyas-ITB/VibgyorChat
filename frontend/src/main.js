import angular from 'angular';
import './config.js';
import './global_styles.css';

// Import emoji picker
import 'emoji-picker-element';

// Import the app module first
import app from './app.module.js';

// Now import all services and controllers
import './app/services/auth.service.js';
import './app/services/user.service.js';
import './app/services/chat.service.js';
import './app/services/socket.service.js';
import './app/services/theme.service.js';
import './app/services/toast.service.js';
import './app/services/file.service.js';
import './app/services/invite.service.js';
import './app/services/join-request.service.js';

import './app/controllers/login.controller.js';
import './app/controllers/chat.controller.js';
import './app/controllers/onboarding.controller.js';
import './app/controllers/invite.controller.js';
import './app/controllers/admin-login.controller.js';
import './app/controllers/admin-panel.controller.js';

// Import directives
import './app/directives/auth-image.directive.js';
import './app/directives/auth-video.directive.js';
import './app/directives/auth-audio.directive.js';
import './app/directives/right-click.directive.js';
import './app/directives/mobile-swipe-reply.directive.js';
import './app/directives/mobile-scroll.directive.js';

// Import filters
import './app/filters/discord-time.filter.js';

app.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
  $locationProvider.html5Mode(true);
  $locationProvider.hashPrefix('!');

  $routeProvider
    .when('/login', {
      templateUrl: '/src/app/views/login.html',
      controller: 'LoginController'
    })
    .when('/auth/google/callback', {
      templateUrl: '/src/app/views/login.html',
      controller: 'LoginController'
    })
    .when('/onboarding', {
      templateUrl: '/src/app/views/onboarding.html',
      controller: 'OnboardingController'
    })
    .when('/invite/:inviteCode', {
      templateUrl: '/src/app/views/invite.html',
      controller: 'InviteController'
    })
    .when('/chat', {
      templateUrl: '/src/app/views/chat.html',
      controller: 'ChatController',
      resolve: {
        auth: ['AuthService', function(AuthService) {
          return AuthService.checkAuth();
        }]
      }
    })
    .when('/panel/admin/login', {
      templateUrl: '/src/app/views/admin-login.html',
      controller: 'AdminLoginController'
    })
    .when('/panel/admin', {
      templateUrl: '/src/app/views/admin-panel.html',
      controller: 'AdminPanelController'
    })
    .otherwise({
      redirectTo: '/login'
    });
}]);

app.run(['$rootScope', '$location', 'AuthService', 'ThemeService', function($rootScope, $location, AuthService, ThemeService) {
  ThemeService.init();

  $rootScope.$on('$routeChangeStart', function(event, next, current) {
    // Clean up any lingering URL parameters that contain tokens BEFORE route change
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('access_token') || urlParams.get('refresh_token')) {
      // Only allow these parameters on the login and Google callback routes
      const allowedPaths = ['/login', '/auth/google/callback'];
      const currentPath = next.$$route ? next.$$route.originalPath : '';
      
      if (!allowedPaths.includes(currentPath)) {
        // Clean up URL parameters for security BEFORE proceeding with route change
        window.history.replaceState({}, document.title, window.location.pathname);
        console.log('Cleaned up URL parameters before route change to:', currentPath);
      }
    }

    // Skip auth check for admin panel routes
    const isAdminRoute = next.$$route && next.$$route.originalPath && next.$$route.originalPath.startsWith('/panel/admin');
    
    if (next.$$route && next.$$route.originalPath !== '/login' && next.$$route.originalPath !== '/auth/google/callback' && next.$$route.originalPath !== '/onboarding' && !next.$$route.originalPath.startsWith('/invite/') && !isAdminRoute) {
      if (!AuthService.isAuthenticated()) {
        event.preventDefault();
        $location.path('/login');
      }
    }
  });

  $rootScope.$on('$routeChangeError', function(event, current, previous, rejection) {
    $location.path('/login');
  });
}]);

export default app;

angular.element(document).ready(() => {
  angular.bootstrap(document, ['vibgyorChat']);
});
