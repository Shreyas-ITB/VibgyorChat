import angular from 'angular';
import '../../app.module.js';

angular.module('vibgyorChat').service('DomainValidationService', ['$http', '$q', function($http, $q) {
  
  // Get API base URL
  const getApiBase = function() {
    return window.APP_CONFIG ? window.APP_CONFIG.API_BASE_URL : 'http://localhost:8000';
  };
  
  // Cache for allowed domains and employees
  let allowedDomainsCache = null;
  let employeesCache = null;
  let cacheTimestamp = null;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  // Check if cache is valid
  const isCacheValid = function() {
    return cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_DURATION;
  };
  
  // Fetch allowed domains from API
  this.fetchAllowedDomains = function() {
    const deferred = $q.defer();
    
    // Return cached data if valid
    if (isCacheValid() && allowedDomainsCache) {
      deferred.resolve(allowedDomainsCache);
      return deferred.promise;
    }
    
    const url = `${getApiBase()}/admin/allowed-domains`;
    
    $http.get(url)
      .then(function(response) {
        if (response.data.success && response.data.allowed_domains) {
          allowedDomainsCache = response.data.allowed_domains;
          cacheTimestamp = Date.now();
          console.log('📋 Fetched allowed domains for login validation:', allowedDomainsCache);
          deferred.resolve(allowedDomainsCache);
        } else {
          console.log('⚠️ No allowed domains configured or API error');
          allowedDomainsCache = [];
          deferred.resolve([]);
        }
      })
      .catch(function(error) {
        console.error('❌ Failed to fetch allowed domains:', error);
        // Don't block login if API fails
        allowedDomainsCache = [];
        deferred.resolve([]);
      });
    
    return deferred.promise;
  };
  
  // Fetch employees from API
  this.fetchEmployees = function() {
    const deferred = $q.defer();
    
    // Return cached data if valid
    if (isCacheValid() && employeesCache) {
      deferred.resolve(employeesCache);
      return deferred.promise;
    }
    
    const url = `${getApiBase()}/admin/employees`;
    
    $http.get(url)
      .then(function(response) {
        if (response.data.success && response.data.employees) {
          employeesCache = response.data.employees;
          cacheTimestamp = Date.now();
          console.log('👥 Fetched employees for login validation:', employeesCache.length, 'employees');
          deferred.resolve(employeesCache);
        } else {
          console.log('⚠️ No employees found or API error');
          employeesCache = [];
          deferred.resolve([]);
        }
      })
      .catch(function(error) {
        console.error('❌ Failed to fetch employees:', error);
        // Don't block login if API fails
        employeesCache = [];
        deferred.resolve([]);
      });
    
    return deferred.promise;
  };
  
  // Check if email domain is in allowed domains
  this.isEmailDomainAllowed = function(email, allowedDomains) {
    if (!email || !allowedDomains || allowedDomains.length === 0) {
      return false;
    }
    
    const emailLower = email.toLowerCase();
    
    // Check if email ends with any of the allowed domains
    for (let domain of allowedDomains) {
      if (emailLower.endsWith(domain.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  };
  
  // Check if email exists in employees list
  this.isEmailInEmployees = function(email, employees) {
    if (!email || !employees || employees.length === 0) {
      return false;
    }
    
    const emailLower = email.toLowerCase();
    
    // Check if email exists in employees list
    return employees.some(employee => 
      employee.email && employee.email.toLowerCase() === emailLower
    );
  };
  
  // Main validation function
  this.validateEmailForLogin = function(email) {
    const deferred = $q.defer();
    
    if (!email) {
      deferred.resolve({ valid: true }); // Allow empty email for now
      return deferred.promise;
    }
    
    // Fetch both allowed domains and employees
    $q.all([
      this.fetchAllowedDomains(),
      this.fetchEmployees()
    ]).then((results) => {
      const allowedDomains = results[0];
      const employees = results[1];
      
      // If no allowed domains are configured, allow all emails
      if (!allowedDomains || allowedDomains.length === 0) {
        deferred.resolve({ valid: true });
        return;
      }
      
      const isDomainAllowed = this.isEmailDomainAllowed(email, allowedDomains);
      const isInEmployees = this.isEmailInEmployees(email, employees);
      
      if (isDomainAllowed && !isInEmployees) {
        // Email domain is allowed but user is not in employees list
        const domainsString = allowedDomains.join(', ');
        deferred.resolve({
          valid: false,
          error: `It looks like you have to be an employee (${domainsString}), but your account doesn't exist in the admin panel. Please add yourself as an employee to continue logging in.`
        });
      } else {
        // Either domain is not restricted or user is in employees list
        deferred.resolve({ valid: true });
      }
    }).catch((error) => {
      console.error('❌ Error during email validation:', error);
      // Don't block login if validation fails
      deferred.resolve({ valid: true });
    });
    
    return deferred.promise;
  };
  
  // Clear cache (useful for testing or when data changes)
  this.clearCache = function() {
    allowedDomainsCache = null;
    employeesCache = null;
    cacheTimestamp = null;
  };
}]);