import angular from 'angular';
import '../../app.module.js'; // Ensure the module is loaded

angular.module('vibgyorChat').directive('ngRightClick', function() {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      element.bind('contextmenu', function(event) {
        scope.$apply(function() {
          scope.$eval(attrs.ngRightClick, { $event: event });
        });
      });
    }
  };
});