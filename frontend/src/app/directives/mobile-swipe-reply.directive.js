import angular from 'angular';

angular.module('vibgyorChat').directive('mobileSwipeReply', ['$timeout', function($timeout) {
  return {
    restrict: 'A',
    scope: {
      message: '=mobileSwipeReply'
    },
    link: function(scope, element, attrs) {
      // Access parent scope for isMobile and startReply function
      const parentScope = scope.$parent;
      
      if (!parentScope.isMobile) return;

      let swipeState = {
        startX: 0,
        startY: 0,
        currentX: 0,
        isDragging: false,
        replyThreshold: 80
      };

      function handleTouchStart(event) {
        const touch = event.touches[0];
        swipeState.startX = touch.clientX;
        swipeState.startY = touch.clientY;
        swipeState.isDragging = false;
        swipeState.currentX = 0;
      }

      function handleTouchMove(event) {
        const touch = event.touches[0];
        const deltaX = touch.clientX - swipeState.startX;
        const deltaY = touch.clientY - swipeState.startY;
        
        // Only start dragging if horizontal movement is greater than vertical
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
          swipeState.isDragging = true;
          swipeState.currentX = deltaX;
          
          // Only allow right swipe (positive deltaX)
          if (deltaX > 0) {
            const translateX = Math.min(deltaX, swipeState.replyThreshold);
            element[0].style.transform = `translateX(${translateX}px)`;
            element[0].style.transition = 'none';
            
            // Add visual feedback when threshold is reached
            if (deltaX >= swipeState.replyThreshold) {
              element[0].classList.add('swipe-reply-active');
            } else {
              element[0].classList.remove('swipe-reply-active');
            }
          }
        }
      }

      function handleTouchEnd(event) {
        const deltaX = swipeState.currentX;
        
        // Reset transform with animation
        element[0].style.transition = 'transform 0.3s ease';
        element[0].style.transform = 'translateX(0)';
        element[0].classList.remove('swipe-reply-active');
        
        // Trigger reply if threshold was reached
        if (deltaX >= swipeState.replyThreshold && scope.message) {
          $timeout(function() {
            parentScope.startReply(scope.message);
            parentScope.$apply(); // Force digest cycle
          }, 100);
        }
        
        // Reset swipe state
        swipeState = {
          startX: 0,
          startY: 0,
          currentX: 0,
          isDragging: false,
          replyThreshold: 80
        };
      }

      // Add event listeners
      element[0].addEventListener('touchstart', handleTouchStart, { passive: true });
      element[0].addEventListener('touchmove', handleTouchMove, { passive: false });
      element[0].addEventListener('touchend', handleTouchEnd, { passive: true });

      // Cleanup
      scope.$on('$destroy', function() {
        element[0].removeEventListener('touchstart', handleTouchStart);
        element[0].removeEventListener('touchmove', handleTouchMove);
        element[0].removeEventListener('touchend', handleTouchEnd);
      });
    }
  };
}]);