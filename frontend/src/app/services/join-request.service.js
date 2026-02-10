import angular from 'angular';
import '../../app.module.js';

angular.module('vibgyorChat').service('JoinRequestService', ['$http', '$q', 'ToastService', 'AuthService', function($http, $q, ToastService, AuthService) {
  
  // Helper to get API base URL
  const getApiBase = function() {
    return window.APP_CONFIG ? window.APP_CONFIG.API_BASE_URL : 'http://localhost:8000';
  };
  
  // Helper to get headers
  const getHeaders = function() {
    return {
      'Authorization': `Bearer ${AuthService.getToken()}`
    };
  };
  
  // Request to join a group
  this.requestToJoin = function(conversationId) {
    const deferred = $q.defer();
    
    $http.post(`${getApiBase()}/conversations/group/join`, {
      conversation_id: conversationId
    }, {
      headers: getHeaders()
    })
    .then(function(response) {
      console.log('✅ Join request sent:', response.data);
      deferred.resolve(response.data);
    })
    .catch(function(error) {
      console.error('❌ Failed to send join request:', error);
      deferred.reject(error);
    });
    
    return deferred.promise;
  };
  
  // Get pending join requests for a group (admin/owner only)
  this.getPendingRequests = function(conversationId) {
    const deferred = $q.defer();
    
    $http.get(`${getApiBase()}/conversations/group/join/pending?conversation_id=${conversationId}`, {
      headers: getHeaders()
    })
    .then(function(response) {
      console.log('✅ Fetched pending requests:', response.data);
      deferred.resolve(response.data);
    })
    .catch(function(error) {
      console.error('❌ Failed to fetch pending requests:', error);
      deferred.reject(error);
    });
    
    return deferred.promise;
  };
  
  // Approve a join request (admin/owner only)
  this.approveRequest = function(conversationId, requesterEmail) {
    const deferred = $q.defer();
    
    $http.post(`${getApiBase()}/conversations/group/join/approve`, {
      conversation_id: conversationId,
      requester_email: requesterEmail
    }, {
      headers: getHeaders()
    })
    .then(function(response) {
      console.log('✅ Request approved:', response.data);
      deferred.resolve(response.data);
    })
    .catch(function(error) {
      console.error('❌ Failed to approve request:', error);
      deferred.reject(error);
    });
    
    return deferred.promise;
  };
  
  // Reject a join request (admin/owner only)
  this.rejectRequest = function(conversationId, requesterEmail) {
    const deferred = $q.defer();
    
    $http.post(`${getApiBase()}/conversations/group/join/reject`, {
      conversation_id: conversationId,
      requester_email: requesterEmail
    }, {
      headers: getHeaders()
    })
    .then(function(response) {
      console.log('✅ Request rejected:', response.data);
      deferred.resolve(response.data);
    })
    .catch(function(error) {
      console.error('❌ Failed to reject request:', error);
      deferred.reject(error);
    });
    
    return deferred.promise;
  };
  
  // Get user's own pending join requests
  this.getMyPendingRequests = function() {
    const deferred = $q.defer();
    
    $http.get(`${getApiBase()}/conversations/group/join/my-pending`, {
      headers: getHeaders()
    })
    .then(function(response) {
      console.log('✅ Fetched my pending requests:', response.data);
      deferred.resolve(response.data);
    })
    .catch(function(error) {
      console.error('❌ Failed to fetch my pending requests:', error);
      deferred.reject(error);
    });
    
    return deferred.promise;
  };
  
  // Cancel own join request (requester only)
  this.cancelRequest = function(conversationId) {
    const deferred = $q.defer();
    
    $http.post(`${getApiBase()}/conversations/group/join/cancel`, {
      conversation_id: conversationId
    }, {
      headers: getHeaders()
    })
    .then(function(response) {
      console.log('✅ Request cancelled:', response.data);
      deferred.resolve(response.data);
    })
    .catch(function(error) {
      console.error('❌ Failed to cancel request:', error);
      deferred.reject(error);
    });
    
    return deferred.promise;
  };
}]);
