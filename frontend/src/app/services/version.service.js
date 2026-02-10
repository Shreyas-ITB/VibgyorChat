import angular from 'angular';
import '../../app.module.js';

angular.module('vibgyorChat').service('VersionService', ['$http', '$q', function($http, $q) {
  
  // Get API base URL from config
  const getApiBase = function() {
    return window.APP_CONFIG ? window.APP_CONFIG.API_BASE_URL : 'http://localhost:8000';
  };
  
  // Fetch version information from API root endpoint
  this.getVersionInfo = function() {
    const deferred = $q.defer();
    
    const apiUrl = getApiBase();
    console.log('🔍 Fetching version info from:', apiUrl + '/');
    
    $http.get(apiUrl + '/', {
      timeout: 5000, // 5 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(function(response) {
      console.log('✅ Version info fetched from API:', response.data);
      deferred.resolve(response.data);
    })
    .catch(function(error) {
      console.error('❌ Failed to fetch version info from API:', error);
      deferred.reject(error);
    });
    
    return deferred.promise;
  };
  
}]);