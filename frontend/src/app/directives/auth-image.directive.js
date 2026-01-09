import angular from 'angular';
import '../../app.module.js'; // Ensure the module is loaded

angular.module('vibgyorChat').directive('authImage', ['UserService', function(UserService) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      let currentImageUrl = null;

      function loadImage() {
        const src = attrs.authImage || attrs.ngSrc;
        
        if (!src) {
          return;
        }

        // If it's an auth-image:// URL, load it through the authenticated service
        if (src.startsWith('auth-image://')) {
          const filename = src.replace('auth-image://', '');
          
          // Show loading placeholder
          element.attr('src', 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiBmaWxsPSIjMzc0MTUxIi8+CjxjaXJjbGUgY3g9IjY0IiBjeT0iNjQiIHI9IjE2IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSI+CjxhbmltYXRlVHJhbnNmb3JtIGF0dHJpYnV0ZU5hbWU9InRyYW5zZm9ybSIgdHlwZT0icm90YXRlIiB2YWx1ZXM9IjAgNjQgNjQ7MzYwIDY0IDY0IiBkdXI9IjFzIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIvPgo8L2NpcmNsZT4KPC9zdmc+');
          
          UserService.loadAuthenticatedImage(filename).then(function(imageUrl) {
            // Clean up previous blob URL
            if (currentImageUrl && currentImageUrl.startsWith('blob:')) {
              URL.revokeObjectURL(currentImageUrl);
            }
            
            currentImageUrl = imageUrl;
            element.attr('src', imageUrl);
            
            // Add error handling for the image element itself
            element.on('error', function() {
              console.warn('Failed to display authenticated image, falling back to default');
              element.attr('src', 'https://ui-avatars.com/api/?name=User&background=9333ea&color=fff&size=128');
            });
          }).catch(function(error) {
            console.error('Failed to load authenticated image:', error);
            element.attr('src', 'https://ui-avatars.com/api/?name=User&background=9333ea&color=fff&size=128');
          });
        } else {
          // Regular image, just set the src
          element.attr('src', src);
        }
      }

      // Watch for changes in the auth-image attribute
      attrs.$observe('authImage', loadImage);
      attrs.$observe('ngSrc', loadImage);

      // Initial load
      loadImage();

      // Clean up blob URLs when element is destroyed
      scope.$on('$destroy', function() {
        if (currentImageUrl && currentImageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(currentImageUrl);
        }
      });
    }
  };
}]);