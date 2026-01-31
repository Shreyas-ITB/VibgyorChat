import angular from 'angular';

angular.module('vibgyorChat').directive('authAudio', ['AuthService', '$timeout', function(AuthService, $timeout) {
  return {
    restrict: 'A',
    scope: {
      authAudio: '@'
    },
    link: function(scope, element, attrs) {
      // Watch for changes to the auth-audio attribute
      scope.$watch('authAudio', function(newUrl) {
        if (!newUrl) return;
        
        const token = AuthService.getToken();
        
        // Fetch audio with authentication
        fetch(newUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to load audio: ' + response.status);
          }
          return response.blob();
        })
        .then(blob => {
          // Create blob URL
          const blobUrl = URL.createObjectURL(blob);
          
          // Set audio source
          element[0].src = blobUrl;
          
          // Store blob URL for cleanup
          element.data('blobUrl', blobUrl);
          
          // Load the audio
          element[0].load();
        })
        .catch(error => {
          console.error('Failed to load audio:', error);
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
