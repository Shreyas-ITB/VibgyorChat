import angular from 'angular';
import ngRoute from 'angular-route';

// Create the main application module
const app = angular.module('vibgyorChat', ['ngRoute']);

// Trust HTML filter for mentions
app.filter('trustAsHtml', ['$sce', function($sce) {
  return function(text) {
    return $sce.trustAsHtml(text);
  };
}]);

// Directive to render mentions with HTML
app.directive('renderMentions', ['$compile', function($compile) {
  return {
    restrict: 'A',
    scope: {
      content: '=renderMentions'
    },
    link: function(scope, element) {
      scope.$watch('content', function(newValue) {
        if (newValue) {
          element.html(newValue);
        }
      });
    }
  };
}]);

// HTTP Interceptor for authentication errors and token refresh
app.config(['$httpProvider', function($httpProvider) {
  $httpProvider.interceptors.push(['$q', '$location', '$injector', function($q, $location, $injector) {
    let isRefreshing = false;
    let refreshPromise = null;

    return {
      responseError: function(rejection) {
        const AuthService = $injector.get('AuthService');
        const $http = $injector.get('$http');
        
        // Skip interceptor for refresh token requests to prevent infinite loop
        if (rejection.config && rejection.config.headers && rejection.config.headers['X-Skip-Interceptor']) {
          return $q.reject(rejection);
        }
        
        // Handle authentication errors (401, 403)
        if (rejection.status === 401 || rejection.status === 403) {
          console.log('Authentication error detected, attempting token refresh');
          
          // If already refreshing, wait for that promise
          if (isRefreshing) {
            return refreshPromise.then(function(newToken) {
              // Retry the original request with new token
              rejection.config.headers['Authorization'] = `Bearer ${newToken}`;
              return $http(rejection.config);
            }).catch(function() {
              return $q.reject(rejection);
            });
          }
          
          // Start refresh process
          isRefreshing = true;
          refreshPromise = AuthService.refreshToken().then(function(newToken) {
            isRefreshing = false;
            refreshPromise = null;
            
            // Retry the original request with new token
            rejection.config.headers['Authorization'] = `Bearer ${newToken}`;
            return $http(rejection.config);
          }).catch(function(error) {
            isRefreshing = false;
            refreshPromise = null;
            
            // Refresh failed, logout user
            console.error('Token refresh failed, logging out');
            return $q.reject(rejection);
          });
          
          return refreshPromise;
        }
        
        // Handle 404 errors
        if (rejection.status === 404) {
          console.log('404 error detected');
          // Don't automatically logout on 404, just log it
          // The specific service can handle 404s as needed
        }
        
        return $q.reject(rejection);
      }
    };
  }]);
}]);

export default app;