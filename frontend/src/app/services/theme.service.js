import angular from 'angular';
import '../../app.module.js'; // Ensure the module is loaded

angular.module('vibgyorChat').factory('ThemeService', [function() {
  const availableThemes = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' }
  ];

  const service = {
    currentTheme: 'dark',
    systemTheme: 'dark',

    init: function() {
      service.detectSystemTheme();
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        service.setTheme(savedTheme);
      } else {
        service.setTheme('system');
      }
    },

    detectSystemTheme: function() {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        service.systemTheme = 'light';
      } else {
        service.systemTheme = 'dark';
      }
    },

    setTheme: function(theme) {
      // Prevent unnecessary updates
      if (service.currentTheme === theme) {
        return;
      }
      
      service.currentTheme = theme;
      localStorage.setItem('theme', theme);
      service.applyTheme();
    },

    applyTheme: function() {
      let actualTheme = service.currentTheme;
      
      if (actualTheme === 'system') {
        service.detectSystemTheme();
        actualTheme = service.systemTheme;
      }
      
      // Prevent unnecessary DOM updates
      const currentDataTheme = document.documentElement.getAttribute('data-theme');
      
      if (actualTheme === 'light') {
        if (currentDataTheme !== 'light') {
          document.documentElement.setAttribute('data-theme', 'light');
          document.documentElement.classList.remove('dark');
        }
      } else {
        if (currentDataTheme !== null) {
          document.documentElement.removeAttribute('data-theme');
          document.documentElement.classList.remove('dark');
        }
      }
    },

    toggleTheme: function() {
      const newTheme = service.isDark() ? 'light' : 'dark';
      service.setTheme(newTheme);
    },

    isDark: function() {
      let actualTheme = service.currentTheme;
      if (actualTheme === 'system') {
        actualTheme = service.systemTheme;
      }
      return actualTheme === 'dark';
    },

    getThemeDisplayName: function(theme) {
      const themeNames = {
        'light': 'Light',
        'dark': 'Dark',
        'system': 'System'
      };
      return themeNames[theme] || 'Dark';
    },

    getAvailableThemes: function() {
      return availableThemes;
    }
  };

  return service;
}]);
