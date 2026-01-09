import angular from 'angular';
import '../../app.module.js'; // Ensure the module is loaded

angular.module('vibgyorChat').factory('ThemeService', [function() {
  const service = {
    currentTheme: 'light',

    init: function() {
      const savedTheme = localStorage.getItem('theme') || 'light';
      service.setTheme(savedTheme);
    },

    setTheme: function(theme) {
      service.currentTheme = theme;
      localStorage.setItem('theme', theme);

      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },

    toggleTheme: function() {
      const newTheme = service.currentTheme === 'light' ? 'dark' : 'light';
      service.setTheme(newTheme);
    },

    isDark: function() {
      return service.currentTheme === 'dark';
    }
  };

  return service;
}]);
