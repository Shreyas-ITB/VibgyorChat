import angular from 'angular';

angular.module('vibgyorChat').directive('authVideo', ['AuthService', '$timeout', function(AuthService, $timeout) {
  return {
    restrict: 'A',
    scope: {
      authVideo: '@'
    },
    link: function(scope, element, attrs) {
      // Watch for changes to the auth-video attribute
      scope.$watch('authVideo', function(newUrl) {
        if (!newUrl) return;
        
        const token = AuthService.getToken();
        
        // Fetch video with authentication
        fetch(newUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to load video: ' + response.status);
          }
          return response.blob();
        })
        .then(blob => {
          // Create blob URL
          const blobUrl = URL.createObjectURL(blob);
          
          // Set video source
          element[0].src = blobUrl;
          
          // Store blob URL for cleanup
          element.data('blobUrl', blobUrl);
          
          // Load the video
          element[0].load();
        })
        .catch(error => {
          console.error('Failed to load video:', error);
        });
      });
      
      // Cleanup on destroy
      scope.$on('$destroy', function() {
        const blobUrl = element.data('blobUrl');
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }
      });
    }
  };
}]);
