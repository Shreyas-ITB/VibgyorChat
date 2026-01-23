import angular from 'angular';
import '../../app.module.js'; // Ensure the module is loaded

angular.module('vibgyorChat').factory('ToastService', [function() {
  const service = {
    show: function(message, type = 'info', duration = 3000) {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.textContent = message;

      container.appendChild(toast);

      setTimeout(function() {
        toast.style.opacity = '0';
        setTimeout(function() {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      }, duration);
    },

    success: function(message, duration) {
      service.show(message, 'success', duration);
    },

    error: function(message, duration) {
      service.show(message, 'error', duration);
    },

    info: function(message, duration) {
      service.show(message, 'info', duration);
    }
  };

  return service;
}]);
