import angular from 'angular';
import '../../app.module.js'; // Ensure the module is loaded

angular.module('vibgyorChat').factory('ThemeService', [function() {
  const service = {
    currentTheme: 'dark', // Force dark mode only
    systemTheme: 'dark', // Always dark

    init: function() {
      // Force dark theme only - ignore system preferences and saved settings
      service.setTheme('dark');
    },

    detectSystemTheme: function() {
      // Always return dark theme
      service.systemTheme = 'dark';
    },

    setTheme: function(theme) {
      // Force dark theme regardless of input
      service.currentTheme = 'dark';
      localStorage.setItem('theme', 'dark');
      service.applyTheme();
    },

    applyTheme: function() {
      // Always apply dark theme
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.classList.remove('dark');
      // Dark theme is the default, no additional attributes needed
    },

    toggleTheme: function() {
      // Disabled - always stay on dark theme
      service.setTheme('dark');
    },

    isDark: function() {
      // Always return true since we're forcing dark mode
      return true;
    },

    getThemeDisplayName: function(theme) {
      // Always return Dark
      return 'Dark';
    },

    getAvailableThemes: function() {
      // Only return dark theme option
      return [
        { value: 'dark', label: 'Dark' }
      ];
    }
  };

  return service;
}]);
