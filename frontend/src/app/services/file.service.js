import angular from 'angular';
import '../../app.module.js';

angular.module('vibgyorChat').factory('FileService', ['$q', 'ToastService', 'AuthService', function($q, ToastService, AuthService) {
  
  const service = {
    // Upload file via HTTP with progress tracking (NEW - RECOMMENDED)
    uploadFile: function(file, conversationId, caption, replyTo, onProgress) {
      const deferred = $q.defer();
      
      if (!file) {
        deferred.reject('No file provided');
        return deferred.promise;
      }
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversation_id', conversationId);
      if (caption) formData.append('content', caption);
      if (replyTo) formData.append('reply_to', replyTo);
      
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', function(e) {
        if (e.lengthComputable && onProgress) {
          const percent = (e.loaded / e.total) * 100;
          onProgress(percent, e.loaded, e.total);
        }
      });
      
      // Handle completion
      xhr.addEventListener('load', function() {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            deferred.resolve(response.message);
          } catch (error) {
            deferred.reject('Invalid response from server');
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            deferred.reject(error.message || 'Upload failed: ' + xhr.status);
          } catch (e) {
            deferred.reject('Upload failed: ' + xhr.status);
          }
        }
      });
      
      // Handle errors
      xhr.addEventListener('error', function() {
        deferred.reject('Network error during upload');
      });
      
      xhr.addEventListener('abort', function() {
        deferred.reject('Upload cancelled');
      });
      
      // Get API base URL and token
      const API_BASE = window.APP_CONFIG ? window.APP_CONFIG.API_BASE_URL : 'http://localhost:8000';
      const token = AuthService.getToken();
      
      xhr.open('POST', API_BASE + '/messages/upload');
      xhr.setRequestHeader('Authorization', 'Bearer ' + token);
      xhr.send(formData);
      
      // Return promise with abort method
      const promise = deferred.promise;
      promise.abort = function() {
        xhr.abort();
      };
      
      return promise;
    },
    
    // Convert file to base64 (LEGACY - for backward compatibility)
    fileToBase64: function(file) {
      const deferred = $q.defer();
      
      if (!file) {
        deferred.reject('No file provided');
        return deferred.promise;
      }

      const reader = new FileReader();
      
      reader.onload = function(e) {
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
    validateFile: function(file, maxSizeMB) {
      maxSizeMB = maxSizeMB || 10;
      const errors = [];
      
      if (!file) {
        errors.push('No file selected');
        return errors;
      }
      
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        errors.push('File size must be less than ' + maxSizeMB + 'MB');
      }
      
      return errors;
    },

    // Validate image file
    validateImage: function(file, maxSizeMB) {
      maxSizeMB = maxSizeMB || 5;
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
    selectFile: function(accept, multiple) {
      accept = accept || '*/*';
      multiple = multiple || false;
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
      
      setTimeout(function() {
        if (!resolved) {
          rejectPromise('File selection timeout');
        }
      }, 30000);
      
      document.body.appendChild(input);
      input.click();
      
      return deferred.promise;
    },

    // Select image file
    selectImage: function() {
      return service.selectFile('image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,image/svg+xml,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg');
    },

    // Select any file
    selectAnyFile: function() {
      return service.selectFile('*/*');
    },

    // Select document files
    selectDocument: function() {
      return service.selectFile('.pdf,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z');
    },
    
    // Select video files
    selectVideo: function() {
      return service.selectFile('video/mp4,video/webm,video/mov,video/avi,video/mkv,video/flv,.mp4,.webm,.mov,.avi,.mkv,.flv');
    }
  };

  return service;
}]);
