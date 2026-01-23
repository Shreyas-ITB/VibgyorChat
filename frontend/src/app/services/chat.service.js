import angular from 'angular';
import '../../app.module.js'; // Ensure the module is loaded

angular.module('vibgyorChat').factory('ChatService', ['$http', '$q', 'AuthService', 'ToastService', 'UserService', function($http, $q, AuthService, ToastService, UserService) {
  const API_BASE = window.APP_CONFIG.API_BASE_URL;

  const service = {
    currentConversation: null,
    messages: [],
    messageCache: {}, // Cache messages by conversation_id
    userCache: {}, // Cache user info by email
    loadingMessages: false,
    hasMoreMessages: true,

    getHeaders: function() {
      return {
        'Authorization': `Bearer ${AuthService.getToken()}`
      };
    },

    createConversation: function(email) {
      const deferred = $q.defer();

      $http.post(`${API_BASE}/conversations/create`, {
        email: email
      }, {
        headers: service.getHeaders()
      })
        .then(function(response) {
          if (response.data.success) {
            service.currentConversation = {
              id: response.data.conversation_id,
              email: response.data.email,
              already_exists: response.data.already_exists
            };
            deferred.resolve(service.currentConversation);
          } else {
            deferred.reject('Failed to create conversation');
          }
        })
        .catch(function(error) {
          console.error('Failed to create conversation:', error);
          ToastService.error('Failed to create conversation');
          deferred.reject(error);
        });

      return deferred.promise;
    },

    // Fetch messages from the API
    fetchMessages: function(conversationId, limit = 30, before = null) {
      const deferred = $q.defer();
      
      if (service.loadingMessages) {
        deferred.reject('Already loading messages');
        return deferred.promise;
      }

      service.loadingMessages = true;

      let url = `${API_BASE}/messages/get?conversation_id=${conversationId}&limit=${limit}`;
      if (before) {
        url += `&before=${before}`;
      }

      $http.get(url, { headers: service.getHeaders() })
        .then(function(response) {
          if (response.data && response.data.messages) {
            const messages = response.data.messages;
            
            // Process messages and get user info for each sender
            const processPromises = messages.map(function(message) {
              return service.processMessage(message);
            });

            $q.all(processPromises).then(function(processedMessages) {
              service.loadingMessages = false;
              service.hasMoreMessages = messages.length === limit;
              deferred.resolve({
                messages: processedMessages,
                count: response.data.count,
                hasMore: service.hasMoreMessages
              });
            }).catch(function(error) {
              console.error('Failed to process messages:', error);
              service.loadingMessages = false;
              deferred.reject(error);
            });
          } else {
            service.loadingMessages = false;
            deferred.resolve({ messages: [], count: 0, hasMore: false });
          }
        })
        .catch(function(error) {
          console.error('Failed to fetch messages:', error);
          service.loadingMessages = false;
          deferred.reject(error);
        });

      return deferred.promise;
    },

    // Process individual message to get sender info and media
    processMessage: function(message) {
      const deferred = $q.defer();

      // Get sender info
      service.getUserInfo(message.sender).then(function(userInfo) {
        const processedMessage = {
          ...message,
          id: message._id,
          sender_info: userInfo,
          sender_name: userInfo.name || userInfo.username,
          sender_avatar: userInfo.profile_picture,
          created_at: message.created_at,
          edited_at: message.edited_at,
          pinned: message.pinned || false,
          edited: !!message.edited_at,
          deleted: message.is_deleted
        };

        // Handle reply_to
        const promises = [];
        
        if (message.reply_to) {
          const replyPromise = service.getMessageInfo(message.reply_to).then(function(replyInfo) {
            processedMessage.reply_info = {
              reply_to_id: replyInfo._id,
              id: replyInfo._id,
              sender: replyInfo.sender,
              content: replyInfo.content || (replyInfo.type === 'image' ? '📷 Image' : replyInfo.type === 'file' ? '📎 File' : 'Message'),
              is_deleted: replyInfo.deleted || replyInfo.is_deleted || false
            };
            
            // Get sender info for replied message
            return service.getUserInfo(replyInfo.sender).then(function(replySenderInfo) {
              processedMessage.reply_info.sender_name = replySenderInfo.name || replySenderInfo.username;
              processedMessage.reply_info.sender_avatar = replySenderInfo.profile_picture;
            });
          }).catch(function(error) {
            console.error('Failed to get reply info:', error);
          });
          promises.push(replyPromise);
        }

        // Handle media messages
        if (message.media_url && !message.content) {
          const mediaPromise = service.getMediaInfo(message._id).then(function(mediaInfo) {
            processedMessage.media_info = mediaInfo;
            processedMessage.file_name = mediaInfo.filename;
            
            if (mediaInfo.isImage) {
              // For images, store the blob URL
              processedMessage.imageUrl = mediaInfo.imageUrl;
              processedMessage.isImage = true;
            } else {
              // For files, store the download URL
              processedMessage.download_url = mediaInfo.download_url;
              processedMessage.isImage = false;
            }
          }).catch(function(error) {
            console.error('Failed to get media info:', error);
          });
          promises.push(mediaPromise);
        }
        
        // Wait for all promises to complete
        $q.all(promises).then(function() {
          deferred.resolve(processedMessage);
        }).catch(function() {
          deferred.resolve(processedMessage);
        });
        
      }).catch(function(error) {
        console.error('Failed to get user info for sender:', message.sender, error);
        // Fallback with basic info
        const processedMessage = {
          ...message,
          id: message._id,
          sender_info: { email: message.sender, name: message.sender.split('@')[0] },
          sender_name: message.sender.split('@')[0],
          sender_avatar: null,
          created_at: message.created_at,
          pinned: message.pinned || false,
          edited: !!message.edited_at,
          deleted: message.is_deleted
        };
        deferred.resolve(processedMessage);
      });

      return deferred.promise;
    },

    // Get user info with caching
    getUserInfo: function(email) {
      const deferred = $q.defer();

      // Check cache first
      if (service.userCache[email]) {
        deferred.resolve(service.userCache[email]);
        return deferred.promise;
      }

      // Fetch from API
      UserService.getUserInfo(email).then(function(userInfo) {
        service.userCache[email] = userInfo;
        deferred.resolve(userInfo);
      }).catch(function(error) {
        deferred.reject(error);
      });

      return deferred.promise;
    },

    // Get media info for media messages
    getMediaInfo: function(messageId) {
      const deferred = $q.defer();

      $http.get(`${API_BASE}/media/get?message_id=${messageId}`, {
        headers: service.getHeaders(),
        responseType: 'blob' // Get as blob to handle both images and JSON
      })
        .then(function(response) {
          const contentType = response.headers('Content-Type');
          
          // Check if response is an image
          if (contentType && contentType.startsWith('image/')) {
            // It's an image - create blob URL
            const blob = response.data;
            const imageUrl = URL.createObjectURL(blob);
            
            // Extract filename from content-disposition header if available
            const contentDisposition = response.headers('Content-Disposition');
            let filename = 'image.jpg';
            if (contentDisposition) {
              const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
              if (matches != null && matches[1]) {
                filename = matches[1].replace(/['"]/g, '');
              }
            }
            
            deferred.resolve({
              isImage: true,
              imageUrl: imageUrl,
              filename: filename,
              blob: blob
            });
          } else {
            // It's a file - parse JSON from blob
            const reader = new FileReader();
            reader.onload = function() {
              try {
                const jsonData = JSON.parse(reader.result);
                deferred.resolve({
                  isImage: false,
                  filename: jsonData.filename,
                  download_url: jsonData.download_url
                });
              } catch (error) {
                console.error('Failed to parse media response:', error);
                deferred.reject('Invalid media response');
              }
            };
            reader.onerror = function() {
              deferred.reject('Failed to read media response');
            };
            reader.readAsText(response.data);
          }
        })
        .catch(function(error) {
          console.error('Failed to get media info:', error);
          deferred.reject(error);
        });

      return deferred.promise;
    },

    // Load messages for a conversation
    loadMessages: function(conversationId, before = null) {
      const deferred = $q.defer();

      service.fetchMessages(conversationId, 30, before).then(function(result) {
        if (before) {
          // Prepend older messages (maintain chronological order)
          const newMessages = result.messages.reverse(); // Reverse to show oldest first
          service.messages = newMessages.concat(service.messages);
        } else {
          // Replace with latest messages
          service.messages = result.messages.reverse(); // Reverse to show oldest first
        }

        // Cache messages
        if (!service.messageCache[conversationId]) {
          service.messageCache[conversationId] = [];
        }
        service.messageCache[conversationId] = service.messages;

        deferred.resolve(result);
      }).catch(function(error) {
        console.error('Failed to load messages:', error);
        deferred.reject(error);
      });

      return deferred.promise;
    },

    // Download file with authentication
    downloadFile: function(downloadUrl, filename) {
      const deferred = $q.defer();

      $http.get(`${API_BASE}${downloadUrl}`, {
        headers: service.getHeaders(),
        responseType: 'arraybuffer'
      })
        .then(function(response) {
          // Create blob and download
          const blob = new Blob([response.data]);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          deferred.resolve();
        })
        .catch(function(error) {
          console.error('Failed to download file:', error);
          deferred.reject(error);
        });

      return deferred.promise;
    },

    addMessage: function(message) {
      // Process the new message and add to current messages
      service.processMessage(message).then(function(processedMessage) {
        // Check if message already exists to avoid duplicates
        // Check by ID, or by content+sender+timestamp for messages without ID yet
        const existingIndex = service.messages.findIndex(m => {
          // Check by ID first
          if ((m.id && processedMessage.id && m.id === processedMessage.id) || 
              (m._id && processedMessage._id && m._id === processedMessage._id)) {
            return true;
          }
          
          // For file/image messages, also check by filename, type, sender and approximate timestamp
          if (processedMessage.type === 'image' || processedMessage.type === 'file') {
            const sameFile = m.file_name === processedMessage.file_name &&
                            m.type === processedMessage.type &&
                            m.sender === processedMessage.sender;
            
            if (sameFile) {
              // Check if timestamps are within 2 seconds of each other
              const time1 = new Date(m.created_at).getTime();
              const time2 = new Date(processedMessage.created_at).getTime();
              const timeDiff = Math.abs(time1 - time2);
              
              if (timeDiff < 2000) { // Within 2 seconds
                return true;
              }
            }
          }
          
          return false;
        });
        
        if (existingIndex === -1) {
          service.messages.push(processedMessage);
          
          // Update cache
          if (service.currentConversation && service.messageCache[service.currentConversation.id]) {
            service.messageCache[service.currentConversation.id] = service.messages;
          }
        } else {
          // Update existing message with new data (in case it has more complete info)
          if (processedMessage._id || processedMessage.id) {
            service.messages[existingIndex] = processedMessage;
          }
        }
      }).catch(function(error) {
        console.error('Failed to process new message:', error);
      });
    },

    updateMessage: function(messageId, updates) {
      const message = service.messages.find(m => m.id === messageId || m._id === messageId);
      if (message) {
        Object.assign(message, updates);
      }
    },

    removeMessage: function(messageId) {
      const index = service.messages.findIndex(m => m.id === messageId || m._id === messageId);
      if (index !== -1) {
        service.messages.splice(index, 1);
      }
    },

    clearMessages: function() {
      service.messages = [];
      service.hasMoreMessages = true;
    },

    setCurrentConversation: function(conversation) {
      service.currentConversation = conversation;
      service.clearMessages();
    },

    // Get conversation info
    getConversationInfo: function(conversationId) {
      const deferred = $q.defer();

      $http.get(`${API_BASE}/conversations/info?conversation_id=${conversationId}`, {
        headers: service.getHeaders()
      })
        .then(function(response) {
          deferred.resolve(response.data);
        })
        .catch(function(error) {
          console.error('Failed to get conversation info:', error);
          deferred.reject(error);
        });

      return deferred.promise;
    },

    // Get message info
    getMessageInfo: function(messageId) {
      const deferred = $q.defer();

      $http.get(`${API_BASE}/messages/info?message_id=${messageId}`, {
        headers: service.getHeaders()
      })
        .then(function(response) {
          deferred.resolve(response.data);
        })
        .catch(function(error) {
          console.error('Failed to get message info:', error);
          deferred.reject(error);
        });

      return deferred.promise;
    },

    // Create a new group
    createGroup: function(groupName, participants) {
      const deferred = $q.defer();

      $http.post(`${API_BASE}/conversations/create/group`, {
        group_name: groupName,
        participants: participants
      }, {
        headers: service.getHeaders()
      })
        .then(function(response) {
          if (response.data.success) {
            deferred.resolve(response.data);
          } else {
            deferred.reject('Failed to create group');
          }
        })
        .catch(function(error) {
          console.error('Failed to create group:', error);
          deferred.reject(error);
        });

      return deferred.promise;
    },

    // Fetch all groups
    fetchGroups: function() {
      const deferred = $q.defer();

      $http.get(`${API_BASE}/conversations/fetch/groups`, {
        headers: service.getHeaders()
      })
        .then(function(response) {
          if (response.data.success) {
            deferred.resolve(response.data.groups || []);
          } else {
            deferred.reject('Failed to fetch groups');
          }
        })
        .catch(function(error) {
          console.error('Failed to fetch groups:', error);
          deferred.reject(error);
        });

      return deferred.promise;
    },

    // Fetch group data (states like archived, muted, pinned, favorited)
    fetchGroupData: function() {
      const deferred = $q.defer();

      $http.get(`${API_BASE}/users/getgroupdata`, {
        headers: service.getHeaders()
      })
        .then(function(response) {
          if (response.data.success) {
            deferred.resolve(response.data.group_list || []);
          } else {
            deferred.reject('Failed to fetch group data');
          }
        })
        .catch(function(error) {
          console.error('Failed to fetch group data:', error);
          deferred.reject(error);
        });

      return deferred.promise;
    },

    // Archive/Unarchive group
    archiveGroup: function(groupId) {
      const deferred = $q.defer();

      $http.post(`${API_BASE}/conversations/archive`, {
        conversation_id: groupId
      }, {
        headers: service.getHeaders()
      })
        .then(function(response) {
          if (response.data.success) {
            deferred.resolve(response.data);
          } else {
            deferred.reject('Failed to archive group');
          }
        })
        .catch(function(error) {
          console.error('Failed to archive group:', error);
          deferred.reject(error);
        });

      return deferred.promise;
    },

    // Mute/Unmute group
    muteGroup: function(groupId) {
      const deferred = $q.defer();

      $http.post(`${API_BASE}/conversations/mute`, {
        conversation_id: groupId
      }, {
        headers: service.getHeaders()
      })
        .then(function(response) {
          if (response.data.success) {
            deferred.resolve(response.data);
          } else {
            deferred.reject('Failed to mute group');
          }
        })
        .catch(function(error) {
          console.error('Failed to mute group:', error);
          deferred.reject(error);
        });

      return deferred.promise;
    },

    // Pin/Unpin group
    pinGroup: function(groupId) {
      const deferred = $q.defer();

      $http.post(`${API_BASE}/conversations/pinned`, {
        conversation_id: groupId
      }, {
        headers: service.getHeaders()
      })
        .then(function(response) {
          if (response.data.success) {
            deferred.resolve(response.data);
          } else {
            deferred.reject('Failed to pin group');
          }
        })
        .catch(function(error) {
          console.error('Failed to pin group:', error);
          deferred.reject(error);
        });

      return deferred.promise;
    },

    // Favorite/Unfavorite group
    favoriteGroup: function(groupId) {
      const deferred = $q.defer();

      $http.post(`${API_BASE}/conversations/favorite`, {
        conversation_id: groupId
      }, {
        headers: service.getHeaders()
      })
        .then(function(response) {
          if (response.data.success) {
            deferred.resolve(response.data);
          } else {
            deferred.reject('Failed to favorite group');
          }
        })
        .catch(function(error) {
          console.error('Failed to favorite group:', error);
          deferred.reject(error);
        });

      return deferred.promise;
    },

    // Delete group
    deleteGroup: function(groupId) {
      const deferred = $q.defer();

      $http({
        method: 'DELETE',
        url: `${API_BASE}/conversations/delete/group?conversation_id=${groupId}`,
        headers: service.getHeaders()
      })
        .then(function(response) {
          if (response.data.success) {
            deferred.resolve(response.data);
          } else {
            deferred.reject('Failed to delete group');
          }
        })
        .catch(function(error) {
          console.error('Failed to delete group:', error);
          deferred.reject(error);
        });

      return deferred.promise;
    },

    // Leave group
    leaveGroup: function(groupId) {
      const deferred = $q.defer();

      $http.post(`${API_BASE}/conversations/leave`, {
        conversation_id: groupId
      }, {
        headers: service.getHeaders()
      })
        .then(function(response) {
          if (response.data.success) {
            deferred.resolve(response.data);
          } else {
            deferred.reject('Failed to leave group');
          }
        })
        .catch(function(error) {
          console.error('Failed to leave group:', error);
          deferred.reject(error);
        });

      return deferred.promise;
    },

    // Join group with ID
    joinGroup: function(conversationId) {
      const deferred = $q.defer();

      $http.post(`${API_BASE}/conversations/group/join?conversation_id=${conversationId}`, {}, {
        headers: service.getHeaders()
      })
        .then(function(response) {
          if (response.data.success) {
            deferred.resolve(response.data);
          } else {
            deferred.reject('Failed to join group');
          }
        })
        .catch(function(error) {
          console.error('Failed to join group:', error);
          ToastService.error(error.data?.message || 'Failed to join group');
          deferred.reject(error);
        });

      return deferred.promise;
    },

    // Edit group
    editGroup: function(conversationId, data) {
      const deferred = $q.defer();

      $http.put(`${API_BASE}/conversations/edit/group?conversation_id=${conversationId}`, data, {
        headers: {
          ...service.getHeaders(),
          'Content-Type': 'application/json'
        }
      })
        .then(function(response) {
          if (response.data.success) {
            deferred.resolve(response.data);
          } else {
            deferred.reject('Failed to edit group');
          }
        })
        .catch(function(error) {
          console.error('Failed to edit group:', error);
          ToastService.error(error.data?.message || 'Failed to edit group');
          deferred.reject(error);
        });

      return deferred.promise;
    },

  };

  // Group chat backup functionality
  service.exportGroupChat = function(conversationId) {
    return $http({
      method: 'GET',
      url: API_BASE + '/backup/export/group/chat',
      params: {
        conversation_id: conversationId
      },
      headers: {
        'Authorization': 'Bearer ' + AuthService.getToken()
      },
      responseType: 'blob' // Important for file download
    });
  };

  service.importGroupChat = function(csvFile) {
    const formData = new FormData();
    formData.append('file', csvFile);

    return $http({
      method: 'POST',
      url: API_BASE + '/backup/import/group/chat',
      data: formData,
      headers: {
        'Authorization': 'Bearer ' + AuthService.getToken(),
        'Content-Type': undefined // Let browser set the content type for FormData
      }
    });
  };

  return service;
}]);
