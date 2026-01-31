import angular from 'angular';

angular.module('vibgyorChat').directive('mobileScroll', ['$timeout', function($timeout) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      if (!scope.isMobile) return;

      let scrollTimeout;

      function handleScroll() {
        // Clear previous timeout
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }

        // Debounce scroll events
        scrollTimeout = setTimeout(function() {
          const el = element[0];
          
          // Calculate distance from bottom
          const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
          
          // Show "Jump to Present" button if user scrolled up more than 500px from bottom
          const shouldShow = distanceFromBottom > 500;
          
          scope.$apply(function() {
            scope.showMobileJumpToPresent = shouldShow;
          });
          
          // Check if scrolled to top (load more messages)
          if (el.scrollTop === 0 && !scope.loadingOlderMessages && scope.ChatService && scope.ChatService.hasMoreMessages) {
            const scrollHeight = el.scrollHeight;
            
            scope.$apply(function() {
              scope.loadOlderMessages();
            });
            
            // Maintain scroll position after loading older messages
            $timeout(function() {
              const newScrollHeight = el.scrollHeight;
              const scrollDiff = newScrollHeight - scrollHeight;
              el.scrollTop = scrollDiff;
            }, 100);
          }
        }, 50);
      }

      // Add scroll event listener
      element[0].addEventListener('scroll', handleScroll, { passive: true });

      // Cleanup
      scope.$on('$destroy', function() {
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
        element[0].removeEventListener('scroll', handleScroll);
      });
    }
  };
}]);