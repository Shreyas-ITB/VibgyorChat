import angular from 'angular';
import CryptoJS from 'crypto-js';
import '../../app.module.js';

angular.module('vibgyorChat').controller('AdminPanelController', ['$scope', '$location', '$http', '$timeout', function($scope, $location, $http, $timeout) {
  
  // Check if logged in
  const adminToken = localStorage.getItem('admin_token');
  if (!adminToken) {
    $location.path('/panel/admin/login');
    return;
  }

  $scope.adminUsername = localStorage.getItem('admin_username') || 'Admin';

  // Get API URL from config
  const API_BASE_URL = window.APP_CONFIG.API_BASE_URL;
  const ADMIN_USERNAME = window.APP_CONFIG.ADMIN_USERNAME;
  const ADMIN_PASSWORD = window.APP_CONFIG.ADMIN_PASSWORD;

  // Helper function to convert string to SHA256 hash
  $scope.hashToSHA256 = function(text) {
    return CryptoJS.SHA256(text).toString();
  };

  // Generate admin credential hashes
  const usernameHash = $scope.hashToSHA256(ADMIN_USERNAME);
  const passwordHash = $scope.hashToSHA256(ADMIN_PASSWORD);

  console.log('🔐 Admin credential hashes generated');
  console.log('Username hash:', usernameHash);
  console.log('Password hash:', passwordHash);

  // Statistics data
  $scope.stats = {
    totalUsers: 0,
    totalGroups: 0,
    totalMessages: 0,
    activeUsers: 0
  };

  $scope.loading = true;
  $scope.error = null;

  // Fetch statistics from API
  $scope.fetchStatistics = function() {
    console.log('📊 Fetching admin statistics...');
    $scope.loading = true;
    $scope.error = null;

    const url = `${API_BASE_URL}/admin/statistics?admin_username_hash=${usernameHash}&admin_password_hash=${passwordHash}`;
    
    console.log('🌐 API URL:', url);

    $http.get(url)
      .then(function(response) {
        console.log('✅ Statistics fetched successfully:', response.data);
        
        if (response.data.success && response.data.statistics) {
          const stats = response.data.statistics;
          
          // Update stats with animation
          $timeout(function() {
            $scope.stats.totalUsers = stats.total_users || 0;
            $scope.stats.totalGroups = stats.total_groups || 0;
            $scope.stats.totalMessages = stats.total_messages || 0;
            $scope.stats.activeUsers = stats.active_users || 0;
            
            // Store additional breakdown data if needed
            $scope.breakdown = stats.breakdown || {};
            $scope.lastUpdated = stats.last_updated;
            $scope.activeUsersPeriod = stats.active_users_period || '30 days';
            
            console.log('📊 Statistics updated:', $scope.stats);
          });
        } else {
          console.error('❌ Invalid response format:', response.data);
          $scope.error = 'Invalid response format from server';
        }
        
        $scope.loading = false;
      })
      .catch(function(error) {
        console.error('❌ Failed to fetch statistics:', error);
        $scope.error = error.data?.message || 'Failed to fetch statistics';
        $scope.loading = false;
        
        // Show error details
        if (error.status === 401) {
          $scope.error = 'Unauthorized: Invalid admin credentials';
        } else if (error.status === 404) {
          $scope.error = 'Statistics endpoint not found';
        } else if (error.status === 0) {
          $scope.error = 'Cannot connect to server';
        }
      });
  };

  // Refresh statistics
  $scope.refreshStatistics = function() {
    console.log('🔄 Refreshing statistics...');
    $scope.fetchStatistics();
  };

  // Fetch statistics on load
  $scope.fetchStatistics();

  // Auto-refresh statistics every 30 seconds
  const refreshInterval = setInterval(function() {
    $scope.fetchStatistics();
  }, 30000);

  // Clean up interval on scope destroy
  $scope.$on('$destroy', function() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });

  // ========== EMPLOYEE MANAGEMENT ==========

  $scope.employees = [];
  $scope.employeesLoading = true;
  $scope.employeesError = null;
  $scope.showEmployeeModal = false;
  $scope.employeeModalMode = 'add'; // 'add' or 'edit'
  $scope.employeeForm = {};
  $scope.employeeFormError = null;
  $scope.employeeFormLoading = false;
  $scope.showRemoveConfirmModal = false;
  $scope.employeeToRemove = null;
  $scope.removeEmployeeLoading = false;
  
  // Username availability check
  $scope.usernameChecking = false;
  $scope.usernameAvailable = null;
  $scope.usernameError = '';
  $scope.checkUsernameTimeout = null;

  // Fetch employees from API
  $scope.fetchEmployees = function() {
    console.log('👥 Fetching employees...');
    $scope.employeesLoading = true;
    $scope.employeesError = null;

    const url = `${API_BASE_URL}/admin/employees?admin_username_hash=${usernameHash}&admin_password_hash=${passwordHash}`;
    
    console.log('🌐 Employees API URL:', url);

    $http.get(url)
      .then(function(response) {
        console.log('✅ Employees response received:', response);
        
        if (!response || !response.data) {
          console.error('❌ Null or undefined response');
          $scope.employeesError = 'Received null response from server';
          $scope.employeesLoading = false;
          return;
        }
        
        console.log('✅ Employees data:', response.data);
        
        if (response.data.success && response.data.employees) {
          $scope.employees = response.data.employees;
          console.log('👥 Total employees:', $scope.employees.length);
        } else if (response.data.success === false) {
          console.error('❌ API returned success: false:', response.data);
          $scope.employeesError = response.data.message || 'Failed to fetch employees';
        } else {
          console.error('❌ Invalid response format:', response.data);
          $scope.employeesError = 'Invalid response format from server';
        }
        
        $scope.employeesLoading = false;
      })
      .catch(function(error) {
        console.error('❌ Failed to fetch employees:', error);
        
        if (error && error.data) {
          $scope.employeesError = error.data.message || 'Failed to fetch employees';
        } else if (error && error.status) {
          if (error.status === 401) {
            $scope.employeesError = 'Unauthorized: Invalid admin credentials';
          } else if (error.status === 404) {
            $scope.employeesError = 'Employees endpoint not found';
          } else if (error.status === 0) {
            $scope.employeesError = 'Cannot connect to server';
          } else {
            $scope.employeesError = `Server error: ${error.status}`;
          }
        } else {
          $scope.employeesError = 'Unknown error occurred';
        }
        
        $scope.employeesLoading = false;
      });
  };

  // Open Add Employee Modal
  $scope.openAddEmployeeModal = function() {
    console.log('➕ Opening add employee modal');
    $scope.employeeModalMode = 'add';
    $scope.employeeForm = {
      name: '',
      username: '',
      email: '',
      employ_id: ''
    };
    $scope.employeeFormError = null;
    $scope.usernameAvailable = null;
    $scope.usernameError = '';
    $scope.showEmployeeModal = true;
  };

  // Open Edit Employee Modal
  $scope.openEditEmployeeModal = function(employee) {
    console.log('✏️ Opening edit employee modal for:', employee.username);
    $scope.employeeModalMode = 'edit';
    $scope.employeeForm = {
      name: employee.name,
      username: employee.username,
      email: employee.email,
      employ_id: employee.employ_id,
      original_employ_id: employee.employ_id // Store original for edit endpoint
    };
    $scope.employeeFormError = null;
    $scope.usernameAvailable = null;
    $scope.usernameError = '';
    $scope.showEmployeeModal = true;
  };

  // Username change handler with debounce
  $scope.onEmployeeUsernameChange = function() {
    // Clear previous timeout
    if ($scope.checkUsernameTimeout) {
      $timeout.cancel($scope.checkUsernameTimeout);
    }

    // Reset states
    $scope.usernameAvailable = null;
    $scope.usernameError = '';

    if (!$scope.employeeForm.username || $scope.employeeForm.username.length < 3) {
      $scope.usernameError = 'Username must be at least 3 characters long';
      return;
    }

    // Check username after user stops typing (500ms delay)
    $scope.checkUsernameTimeout = $timeout(function() {
      $scope.checkEmployeeUsername();
    }, 500);
  };

  // Check username availability
  $scope.checkEmployeeUsername = function() {
    if (!$scope.employeeForm.username) return;

    $scope.usernameChecking = true;
    $scope.usernameError = '';

    const url = `${API_BASE_URL}/auth/login/checkusername?q=${encodeURIComponent($scope.employeeForm.username)}`;
    
    console.log('🔍 Checking username availability:', url);

    $http.get(url)
      .then(function(response) {
        console.log('✅ Username check response:', response.data);
        
        if (response && response.data && response.data.success) {
          if (response.data.available) {
            $scope.usernameAvailable = true;
            $scope.usernameError = '';
            console.log('✅ Username is available');
          } else {
            $scope.usernameAvailable = false;
            $scope.usernameError = 'Username is not available. Please choose a different one.';
            console.log('❌ Username is not available');
          }
        } else {
          $scope.usernameError = 'Error checking username availability';
        }
        
        $scope.usernameChecking = false;
      })
      .catch(function(error) {
        console.error('❌ Username check failed:', error);
        $scope.usernameError = 'Error checking username availability';
        $scope.usernameChecking = false;
      });
  };

  // Close Employee Modal
  $scope.closeEmployeeModal = function() {
    console.log('❌ Closing employee modal');
    $scope.showEmployeeModal = false;
    $scope.employeeForm = {};
    $scope.employeeFormError = null;
    $scope.usernameAvailable = null;
    $scope.usernameError = '';
    
    // Clear timeout if exists
    if ($scope.checkUsernameTimeout) {
      $timeout.cancel($scope.checkUsernameTimeout);
    }
  };

  // Save Employee (Add or Edit)
  $scope.saveEmployee = function() {
    console.log('💾 Saving employee:', $scope.employeeForm);
    
    // Validation
    if (!$scope.employeeForm.name || !$scope.employeeForm.username || !$scope.employeeForm.email || !$scope.employeeForm.employ_id) {
      $scope.employeeFormError = 'Please fill in all required fields';
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test($scope.employeeForm.email)) {
      $scope.employeeFormError = 'Please enter a valid email address';
      return;
    }

    // Check username availability for add mode
    if ($scope.employeeModalMode === 'add') {
      if ($scope.usernameAvailable === false) {
        $scope.employeeFormError = 'Please choose an available username';
        return;
      }

      if ($scope.usernameAvailable === null && $scope.employeeForm.username) {
        $scope.employeeFormError = 'Please wait for username validation to complete';
        return;
      }
    }

    $scope.employeeFormLoading = true;
    $scope.employeeFormError = null;

    let requestBody;
    let endpoint;

    if ($scope.employeeModalMode === 'add') {
      endpoint = '/admin/create-employee';
      requestBody = {
        admin_username_hash: usernameHash,
        admin_password_hash: passwordHash,
        email: $scope.employeeForm.email,
        name: $scope.employeeForm.name,
        username: $scope.employeeForm.username,
        employ_id: $scope.employeeForm.employ_id
      };
    } else {
      endpoint = '/admin/edit-employee';
      requestBody = {
        admin_username_hash: usernameHash,
        admin_password_hash: passwordHash,
        employ_id: $scope.employeeForm.original_employ_id, // Current employ_id (original)
        new_employ_id: $scope.employeeForm.employ_id // New employ_id (edited value)
      };
    }
    
    const url = `${API_BASE_URL}${endpoint}`;
    
    console.log('🌐 Save employee URL:', url);
    console.log('📦 Request body:', requestBody);

    // Use POST for create, PUT for edit
    const httpMethod = $scope.employeeModalMode === 'add' ? $http.post : $http.put;

    httpMethod(url, requestBody)
      .then(function(response) {
        console.log('✅ Employee save response:', response);
        
        if (!response || !response.data) {
          console.error('❌ Null or undefined response');
          $scope.employeeFormError = 'Received null response from server';
          $scope.employeeFormLoading = false;
          return;
        }
        
        console.log('✅ Employee saved successfully:', response.data);
        
        if (response.data.success) {
          $scope.closeEmployeeModal();
          $scope.fetchEmployees(); // Refresh employee list
          
          // Show success message (you can add a toast notification here)
          console.log('🎉 Employee ' + ($scope.employeeModalMode === 'add' ? 'added' : 'updated') + ' successfully');
        } else {
          $scope.employeeFormError = response.data.message || 'Failed to save employee';
        }
        
        $scope.employeeFormLoading = false;
      })
      .catch(function(error) {
        console.error('❌ Failed to save employee:', error);
        
        if (error && error.data && error.data.message) {
          $scope.employeeFormError = error.data.message;
        } else if (error && error.status) {
          if (error.status === 401) {
            $scope.employeeFormError = 'Unauthorized: Invalid admin credentials';
          } else if (error.status === 404) {
            $scope.employeeFormError = 'Employee endpoint not found';
          } else if (error.status === 0) {
            $scope.employeeFormError = 'Cannot connect to server';
          } else {
            $scope.employeeFormError = `Server error: ${error.status}`;
          }
        } else {
          $scope.employeeFormError = 'Unknown error occurred';
        }
        
        $scope.employeeFormLoading = false;
      });
  };

  // Confirm Remove Employee
  $scope.confirmRemoveEmployee = function(employee) {
    console.log('⚠️ Confirming remove employee:', employee.username);
    $scope.employeeToRemove = employee;
    $scope.showRemoveConfirmModal = true;
  };

  // Close Remove Confirm Modal
  $scope.closeRemoveConfirmModal = function() {
    console.log('❌ Closing remove confirm modal');
    $scope.showRemoveConfirmModal = false;
    $scope.employeeToRemove = null;
  };

  // Remove Employee
  $scope.removeEmployee = function() {
    if (!$scope.employeeToRemove) return;

    console.log('🗑️ Removing employee:', $scope.employeeToRemove.username);
    $scope.removeEmployeeLoading = true;

    const url = `${API_BASE_URL}/admin/remove-employee`;
    
    const requestBody = {
      admin_username_hash: usernameHash,
      admin_password_hash: passwordHash,
      employ_id: $scope.employeeToRemove.employ_id
    };
    
    console.log('🌐 Remove employee URL:', url);
    console.log('📦 Request body:', requestBody);

    // Use DELETE method with request body
    $http.delete(url, { data: requestBody, headers: { 'Content-Type': 'application/json' } })
      .then(function(response) {
        console.log('✅ Employee remove response:', response);
        
        if (!response || !response.data) {
          console.error('❌ Null or undefined response');
          alert('Received null response from server');
          $scope.removeEmployeeLoading = false;
          return;
        }
        
        console.log('✅ Employee removed successfully:', response.data);
        
        if (response.data.success) {
          $scope.closeRemoveConfirmModal();
          $scope.fetchEmployees(); // Refresh employee list
          
          console.log('🎉 Employee removed successfully');
        } else {
          console.error('❌ Failed to remove employee:', response.data.message);
          alert('Failed to remove employee: ' + (response.data.message || 'Unknown error'));
        }
        
        $scope.removeEmployeeLoading = false;
      })
      .catch(function(error) {
        console.error('❌ Failed to remove employee:', error);
        
        let errorMessage = 'Unknown error';
        if (error && error.data && error.data.message) {
          errorMessage = error.data.message;
        } else if (error && error.status) {
          errorMessage = `Server error: ${error.status}`;
        }
        
        alert('Failed to remove employee: ' + errorMessage);
        $scope.removeEmployeeLoading = false;
      });
  };

  // Fetch employees on load
  $scope.fetchEmployees();

  // Clean up timeouts on scope destroy
  $scope.$on('$destroy', function() {
    if ($scope.checkUsernameTimeout) {
      $timeout.cancel($scope.checkUsernameTimeout);
    }
  });

  // Mosaic background initialization
  function initMosaicBackground(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear existing particles
    container.innerHTML = '';

    // Create mosaic particles
    const particleCount = 50;
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'mosaic-particle';
      
      // Random size between 20-80px
      const size = Math.random() * 60 + 20;
      particle.style.width = size + 'px';
      particle.style.height = size + 'px';
      
      // Random position
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      
      // Random animation delay
      particle.style.animationDelay = Math.random() * 20 + 's';
      
      // Random animation duration
      particle.style.animationDuration = (Math.random() * 10 + 15) + 's';
      
      container.appendChild(particle);
    }
  }

  // Initialize mosaic background after a short delay to ensure DOM is ready
  $timeout(function() {
    initMosaicBackground('adminMosaicBg');
    console.log('✨ Admin panel mosaic background initialized');
  }, 100);

  $scope.logout = function() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
    $location.path('/panel/admin/login');
  };

}]);
