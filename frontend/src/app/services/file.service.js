import angular from 'angular';
import '../../app.module.js'; // Ensure the module is loaded

angular.module('vibgyorChat').factory('FileService', ['$q', 'ToastService', function($q, ToastService) {
  
  const service = {
    // Convert file to base64
    fileToBase64: function(file) {
      const deferred = $q.defer();
      
      if (!file) {
        deferred.reject('No file provided');
        return deferred.promise;
      }

      const reader = new FileReader();
      
      reader.onload = function(e) {
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = e.target.result.split(',')[1];
        deferred.resolve(base64Data);
      };
      
      reader.onerror = function(error) {
        console.error('File reading error:', error);
        deferred.reject(error);
      };
      
      reader.readAsDataURL(file);
      
      return deferred.promise;
    },

    // Validate file type and size
    validateFile: function(file, maxSizeMB = 10) {
      const errors = [];
      
      if (!file) {
        errors.push('No file selected');
        return errors;
      }
      
      // Check file size
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        errors.push(`File size must be less than ${maxSizeMB}MB`);
      }
      
      return errors;
    },

    // Validate image file
    validateImage: function(file, maxSizeMB = 5) {
      const errors = service.validateFile(file, maxSizeMB);
      
      if (file && !file.type.startsWith('image/')) {
        errors.push('Please select a valid image file');
      }
      
      return errors;
    },

    // Get file type category
    getFileCategory: function(file) {
      if (!file || !file.type) return 'file';
      
      if (file.type.startsWith('image/')) return 'image';
      if (file.type.startsWith('video/')) return 'video';
      if (file.type.startsWith('audio/')) return 'audio';
      if (file.type.includes('pdf')) return 'pdf';
      if (file.type.includes('document') || file.type.includes('word')) return 'document';
      if (file.type.includes('spreadsheet') || file.type.includes('excel')) return 'spreadsheet';
      
      return 'file';
    },

    // Format file size
    formatFileSize: function(bytes) {
      if (bytes === 0) return '0 Bytes';
      
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Create file input element and trigger file selection
    selectFile: function(accept = '*/*', multiple = false) {
      const deferred = $q.defer();
      
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.multiple = multiple;
      input.style.display = 'none';
      
      let resolved = false;
      
      const cleanup = function() {
        if (document.body.contains(input)) {
          document.body.removeChild(input);
        }
      };
      
      const resolvePromise = function(result) {
        if (!resolved) {
          resolved = true;
          cleanup();
          deferred.resolve(result);
        }
      };
      
      const rejectPromise = function(error) {
        if (!resolved) {
          resolved = true;
          cleanup();
          deferred.reject(error);
        }
      };
      
      input.onchange = function(event) {
        const files = event.target.files;
        if (files && files.length > 0) {
          resolvePromise(multiple ? Array.from(files) : files[0]);
        } else {
          rejectPromise('No file selected');
        }
      };
      
      input.oncancel = function() {
        rejectPromise('File selection cancelled');
      };
      
      input.onerror = function() {
        rejectPromise('File selection error');
      };
      
      // Cleanup after timeout to prevent memory leaks
      setTimeout(function() {
        if (!resolved) {
          rejectPromise('File selection timeout');
        }
      }, 30000); // 30 second timeout
      
      document.body.appendChild(input);
      input.click();
      
      return deferred.promise;
    },

    // Select image file with proper image extensions
    selectImage: function() {
      return service.selectFile('image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,image/svg+xml,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg');
    },

    // Select any file but show all file types
    selectAnyFile: function() {
      return service.selectFile('*/*');
    },

    // Select document files (excluding images)
    selectDocument: function() {
      return service.selectFile('.pdf,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z');
    }
  };

  return service;
}]);