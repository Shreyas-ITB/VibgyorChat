import angular from 'angular';
import '../../app.module.js'; // Ensure the module is loaded

angular.module('vibgyorChat').controller('ChatController', ['$scope', '$rootScope', '$timeout', '$q', '$sce', 'AuthService', 'UserService', 'ChatService', 'SocketService', 'ThemeService', 'ToastService', 'FileService', 'InviteService', 'JoinRequestService', function($scope, $rootScope, $timeout, $q, $sce, AuthService, UserService, ChatService, SocketService, ThemeService, ToastService, FileService, InviteService, JoinRequestService) {

  $scope.currentUser = null;
  
  // Initialize theme service
  ThemeService.init();
  
  // Helper function to check if current user is an employee
  $scope.isEmployee = function() {
    return $scope.currentUser && $scope.currentUser.employ_id;
  };
  
  $scope.contacts = [];
  $scope.filteredContacts = [];
  $scope.selectedContact = null;
  $scope.messages = [];
  $scope.messageInput = ''; // Initialize messageInput as empty string
  $scope.searchQuery = '';
  $scope.filter = 'all';
  $scope.groupFilter = 'all';
  $scope.filteredGroups = [];
  
  // Character limit functionality
  $scope.maxMessageLength = 250;
  $scope.showCharacterCount = false;
  $scope.characterCount = 0;
  $scope.characterLimitModal = {
    show: false,
    type: 'message', // 'message', 'file', 'image'
    title: '',
    message: ''
  };
  
  // Draft storage functionality
  $scope.draftKey = null; // Will be set when selecting a contact/group
  
  // Mobile responsiveness
  $scope.isMobile = window.innerWidth < 768;
  $scope.showMobileSidebar = false;
  $scope.showMobileNav = false;
  $scope.mobileView = 'chats'; // 'chats', 'groups', 'settings', 'chat'
  
  // Sidebar collapse/expand
  $scope.sidebarCollapsed = false;
  $scope.toggleSidebarCollapse = function() {
    $scope.sidebarCollapsed = !$scope.sidebarCollapsed;
  };
  
  // Mobile navigation
  $scope.setMobileView = function(view) {
    $scope.mobileView = view;
    if (view === 'chats') {
      $scope.setSidebarView('chats');
    } else if (view === 'groups') {
      $scope.setSidebarView('groups');
    } else if (view === 'settings') {
      $scope.setSidebarView('settings');
    }
  };
  
  // Toggle mobile sidebar
  $scope.toggleMobileSidebar = function() {
    $scope.showMobileSidebar = !$scope.showMobileSidebar;
  };
  
  // Close mobile sidebar
  $scope.closeMobileSidebar = function() {
    $scope.showMobileSidebar = false;
  };
  
  // Select contact and switch to chat view on mobile
  $scope.selectContactMobile = function(contact) {
    // Clear unread count and new message flags when selecting contact
    if (contact.unreadCount > 0) {
      console.log('🔄 Clearing unread count for:', contact.name || contact.username);
      contact.unreadCount = 0;
      contact.hasUnread = false;
      contact.isNewMessage = false;
      
      // Clear from localStorage
      $scope.clearUnreadCount(contact.email || contact.conversation_id, 'contact');
      
      // Update total unread count and page title
      $scope.calculateTotalUnreadCount();
    }
    
    $scope.selectContact(contact);
    if ($scope.isMobile) {
      $scope.mobileView = 'chat';
      // Ensure mobile auto-scroll after selecting contact
      $timeout(function() {
        $scope.scrollToBottomMobile(true);
      }, 200);
    }
  };
  
  // Select group and switch to chat view on mobile
  $scope.selectGroupMobile = function(group) {
    // Clear unread count and new message flags when selecting group
    if (group.unreadCount > 0) {
      console.log('🔄 Clearing unread count for:', group.name);
      group.unreadCount = 0;
      group.hasUnread = false;
      group.isNewMessage = false;
      
      // Clear from localStorage
      $scope.clearUnreadCount(group.conversation_id || group.id, 'group');
      
      // Update total unread count and page title
      $scope.calculateTotalUnreadCount();
    }
    
    $scope.selectGroup(group);
    if ($scope.isMobile) {
      $scope.mobileView = 'chat';
      // Ensure mobile auto-scroll after selecting group
      $timeout(function() {
        $scope.scrollToBottomMobile(true);
      }, 200);
    }
  };
  
  // Back to list view on mobile
  $scope.backToList = function() {
    if ($scope.isMobile) {
      $scope.mobileView = $scope.sidebarView === 'groups' ? 'groups' : 'chats';
      $scope.selectedContact = null;
    }
  };

  // Mobile chat functions
  $scope.showPinnedMessages = false;
  $scope.pinnedMessages = [];

  $scope.togglePinnedMessages = function() {
    $scope.showPinnedMessages = !$scope.showPinnedMessages;
    if ($scope.showPinnedMessages) {
      $scope.loadPinnedMessages();
    }
  };

  $scope.closePinnedMessages = function() {
    $scope.showPinnedMessages = false;
  };

  $scope.loadPinnedMessages = function() {
    if (!$scope.selectedContact) return;
    
    // Filter pinned messages from current messages
    $scope.pinnedMessages = $scope.messages.filter(function(message) {
      return message.pinned;
    });
  };

  $scope.jumpToMessage = function(message) {
    // Close pinned messages popup
    $scope.closePinnedMessages();
    
    // Scroll to message (implementation depends on your message rendering)
    $timeout(function() {
      var messageElement = document.querySelector('[data-message-id="' + (message.id || message._id) + '"]');
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight the message briefly
        messageElement.classList.add('message-highlight');
        $timeout(function() {
          messageElement.classList.remove('message-highlight');
        }, 2000);
      }
    }, 100);
  };

  $scope.startVoiceCall = function() {
    if (!$scope.selectedContact || $scope.selectedContact.isGroup) return;
    
    // Placeholder for voice call functionality
    ToastService.info('Voice call feature coming soon!');
  };

  $scope.startVideoCall = function() {
    if (!$scope.selectedContact || $scope.selectedContact.isGroup) return;
    
    // Placeholder for video call functionality
    ToastService.info('Video call feature coming soon!');
  };

  $scope.showMobileChatOptions = function(event) {
    // Placeholder for mobile chat options menu
    // This would show a context menu with options like:
    // - View profile/group info
    // - Search in conversation
    // - Clear chat history
    // - Block user (for contacts)
    // - Leave group (for groups)
    ToastService.info('Chat options menu coming soon!');
  };

  // Mobile attachment and emoji functions
  $scope.toggleEmojiPicker = function() {
    $scope.showEmojiPicker = !$scope.showEmojiPicker;
  };

  // Insert emoji into message input
  $scope.insertEmoji = function(emoji) {
    if (!$scope.messageInput) {
      $scope.messageInput = '';
    }
    $scope.messageInput += emoji;
    
    // Focus back on the input field
    $timeout(function() {
      const textarea = document.querySelector('.mobile-input-field');
      if (textarea) {
        textarea.focus();
      }
    }, 100);
  };

  // Mobile swipe-to-reply functionality - Reply functions only
  $scope.replyingTo = null;
  
  $scope.startReply = function(message) {
    $scope.replyingTo = {
      id: message.id,
      content: message.content,
      sender: message.sender || message.user,
      senderName: message.sender ? message.sender.username : (message.user ? message.user.username : 'Unknown')
    };
    
    // Focus on input
    $timeout(function() {
      const textarea = document.querySelector('.mobile-input-field') || document.querySelector('textarea[ng-model="messageInput"]');
      if (textarea) {
        textarea.focus();
      }
    }, 100);
  };

  $scope.cancelReply = function() {
    $scope.replyingTo = null;
  };

  // Mobile Jump to Present button state
  $scope.showMobileJumpToPresent = false;
  $scope.mobileJumpToPresentLoaded = false;

  // Notification Management System
  $scope.unreadCounts = new Map();
  $scope.activeConversationId = null;
  $scope.totalUnreadCount = 0;
  $scope.chatUnreadCount = 0;
  $scope.groupUnreadCount = 0;

  // Audio notification
  $scope.notificationAudio = null;

  // Initialize notification audio
  $scope.initializeNotificationAudio = function() {
    try {
      // Try multiple possible paths for the audio file
      const audioPaths = [
        '/src/app/public/new_message.mp3',  // Vite dev server path
        './src/app/public/new_message.mp3', // Relative path
        'src/app/public/new_message.mp3',   // Without leading slash
        '/assets/new_message.mp3',          // Build path
        './assets/new_message.mp3'          // Build relative path
      ];
      
      let pathIndex = 0;
      let audioLoaded = false;
      
      const tryNextPath = function() {
        if (pathIndex >= audioPaths.length) {
          console.error('❌ All audio paths failed - notification sound will not work');
          console.error('💡 Make sure new_message.mp3 exists in src/app/public/ directory');
          return;
        }
        
        const currentPath = audioPaths[pathIndex];
        console.log('🔊 Trying audio path:', currentPath);
        
        $scope.notificationAudio = new Audio();
        $scope.notificationAudio.volume = 0.8; // Set volume to 80%
        $scope.notificationAudio.preload = 'auto';
        
        // Add event listeners
        $scope.notificationAudio.addEventListener('canplaythrough', function() {
          if (!audioLoaded) {
            audioLoaded = true;
            console.log('✅ Notification audio loaded successfully from:', currentPath);
          }
        });
        
        $scope.notificationAudio.addEventListener('loadeddata', function() {
          if (!audioLoaded) {
            audioLoaded = true;
            console.log('✅ Audio data loaded for:', currentPath);
          }
        });
        
        $scope.notificationAudio.addEventListener('error', function(e) {
          console.error('❌ Audio error for path:', currentPath, 'Error:', e.type, e.message || 'Unknown error');
          if (!audioLoaded) {
            pathIndex++;
            $timeout(function() {
              tryNextPath();
            }, 100);
          }
        });
        
        // Set the source and try to load
        $scope.notificationAudio.src = currentPath;
        $scope.notificationAudio.load();
        
        // Test if we can play after a short delay
        $timeout(function() {
          if ($scope.notificationAudio && $scope.notificationAudio.readyState >= 2) {
            console.log('🎵 Audio ready state:', $scope.notificationAudio.readyState, 'for path:', currentPath);
            if (!audioLoaded) {
              audioLoaded = true;
              console.log('✅ Audio ready for playback from:', currentPath);
            }
          }
        }, 500);
      };
      
      tryNextPath();
      
    } catch (error) {
      console.error('❌ Failed to initialize notification audio:', error);
    }
  };

  // Play notification sound
  $scope.playNotificationSound = function() {
    try {
      if ($scope.notificationAudio && $scope.notificationAudio.readyState >= 2) {
        // Reset to beginning
        $scope.notificationAudio.currentTime = 0;
        
        // Attempt to play
        const playPromise = $scope.notificationAudio.play();
        
        if (playPromise !== undefined) {
          playPromise.then(function() {
            console.log('🔊 Notification sound played successfully');
          }).catch(function(error) {
            console.error('❌ Failed to play notification sound:', error.name, error.message);
            
            // Handle common autoplay policy errors
            if (error.name === 'NotAllowedError') {
              console.log('💡 Audio blocked by browser autoplay policy. User interaction required.');
              // You could show a toast here asking user to enable audio
            } else if (error.name === 'NotSupportedError') {
              console.log('💡 Audio format not supported by browser');
            }
          });
        }
      } else {
        console.warn('⚠️ Notification audio not ready. Ready state:', 
          $scope.notificationAudio ? $scope.notificationAudio.readyState : 'null');
        
        // Try to initialize audio again if it's not ready
        if (!$scope.notificationAudio || $scope.notificationAudio.readyState === 0) {
          console.log('🔄 Re-initializing notification audio...');
          $scope.initializeNotificationAudio();
        }
      }
    } catch (error) {
      console.error('❌ Error playing notification sound:', error);
    }
  };

  // Test notification sound (for debugging)
  $scope.testNotificationSound = function() {
    console.log('🧪 Testing notification sound...');
    $scope.playNotificationSound();
  };

  // Enable audio with user interaction (required for autoplay policy)
  $scope.enableAudioWithUserInteraction = function() {
    if ($scope.notificationAudio) {
      // Play and immediately pause to enable audio context
      const playPromise = $scope.notificationAudio.play();
      if (playPromise !== undefined) {
        playPromise.then(function() {
          $scope.notificationAudio.pause();
          $scope.notificationAudio.currentTime = 0;
          console.log('✅ Audio context enabled with user interaction');
          ToastService.success('Notification sounds enabled!');
        }).catch(function(error) {
          console.error('❌ Failed to enable audio:', error);
          ToastService.error('Failed to enable notification sounds');
        });
      }
    } else {
      console.log('🔄 Audio not initialized, initializing now...');
      $scope.initializeNotificationAudio();
      $timeout(function() {
        $scope.enableAudioWithUserInteraction();
      }, 1000);
    }
  };

  // Check if audio file is accessible
  $scope.checkAudioFileAccess = function() {
    const testPaths = [
      '/src/app/public/new_message.mp3',
      './src/app/public/new_message.mp3',
      'src/app/public/new_message.mp3'
    ];
    
    console.log('🔍 Checking audio file accessibility...');
    
    testPaths.forEach(function(path, index) {
      fetch(path, { method: 'HEAD' })
        .then(function(response) {
          if (response.ok) {
            console.log('✅ Audio file accessible at:', path, 'Status:', response.status);
          } else {
            console.log('❌ Audio file not accessible at:', path, 'Status:', response.status);
          }
        })
        .catch(function(error) {
          console.log('❌ Failed to check audio file at:', path, 'Error:', error.message);
        });
    });
  };

  // Calculate total unread count from all contacts and groups
  $scope.calculateTotalUnreadCount = function() {
    let total = 0;
    
    // Count unread messages from contacts
    if ($scope.contacts) {
      $scope.contacts.forEach(contact => {
        total += contact.unreadCount || 0;
      });
    }
    
    // Count unread messages from groups
    if ($scope.groups) {
      $scope.groups.forEach(group => {
        total += group.unreadCount || 0;
      });
    }
    
    // Count unread messages from archived contacts
    if ($scope.archivedContacts) {
      $scope.archivedContacts.forEach(contact => {
        total += contact.unreadCount || 0;
      });
    }
    
    // Count unread messages from archived groups
    if ($scope.archivedGroups) {
      $scope.archivedGroups.forEach(group => {
        total += group.unreadCount || 0;
      });
    }
    
    $scope.totalUnreadCount = total;
    $scope.updatePageTitle();
    
    // Update sidebar badge counts (but avoid recursion)
    if (!$scope._calculatingSidebar) {
      $scope._calculatingSidebar = true;
      $scope.calculateSidebarUnreadCounts();
      $scope._calculatingSidebar = false;
    }
    
    console.log('📊 Total unread count:', total);
    return total;
  };

  // Calculate separate unread counts for sidebar badges
  $scope.calculateSidebarUnreadCounts = function() {
    let chatUnreadCount = 0;
    let groupUnreadCount = 0;
    
    // Count unread messages from contacts (including archived)
    if ($scope.contacts) {
      $scope.contacts.forEach(contact => {
        chatUnreadCount += contact.unreadCount || 0;
      });
    }
    if ($scope.archivedContacts) {
      $scope.archivedContacts.forEach(contact => {
        chatUnreadCount += contact.unreadCount || 0;
      });
    }
    
    // Count unread messages from groups (including archived)
    if ($scope.groups) {
      $scope.groups.forEach(group => {
        groupUnreadCount += group.unreadCount || 0;
      });
    }
    if ($scope.archivedGroups) {
      $scope.archivedGroups.forEach(group => {
        groupUnreadCount += group.unreadCount || 0;
      });
    }
    
    $scope.chatUnreadCount = chatUnreadCount;
    $scope.groupUnreadCount = groupUnreadCount;
    
    console.log('📊 Sidebar counts - Chats:', chatUnreadCount, 'Groups:', groupUnreadCount);
  };

  // Format count for display (9+ if more than 9)
  $scope.formatUnreadCount = function(count) {
    if (count > 9) {
      return '9+';
    }
    return count.toString();
  };

  // Update page title with unread count
  $scope.updatePageTitle = function() {
    const baseTitle = 'VibgyorChat';
    if ($scope.totalUnreadCount > 0) {
      document.title = `(${$scope.totalUnreadCount}) ${baseTitle}`;
      console.log('📋 Updated page title to:', document.title);
    } else {
      document.title = baseTitle;
      console.log('📋 Reset page title to:', document.title);
    }
  };

  // localStorage key for unread counts
  $scope.UNREAD_STORAGE_KEY = 'vibgyorchat_unread_counts';

  // Save unread counts to localStorage
  $scope.saveUnreadCounts = function() {
    try {
      const unreadData = {};
      
      // Save contact unread counts
      $scope.contacts.forEach(contact => {
        if (contact.unreadCount > 0) {
          unreadData[contact.email || contact.conversation_id] = {
            count: contact.unreadCount,
            lastMessage: contact.lastMessageContent,
            lastTime: contact.lastMessageTime,
            isNewMessage: contact.isNewMessage,
            type: 'contact'
          };
        }
      });
      
      // Save group unread counts
      $scope.groups.forEach(group => {
        if (group.unreadCount > 0) {
          unreadData[group.conversation_id || group.id] = {
            count: group.unreadCount,
            lastMessage: group.lastMessageContent,
            lastTime: group.lastMessageTime,
            isNewMessage: group.isNewMessage,
            type: 'group'
          };
        }
      });
      
      localStorage.setItem($scope.UNREAD_STORAGE_KEY, JSON.stringify(unreadData));
      console.log('💾 Saved unread counts to localStorage:', unreadData);
    } catch (error) {
      console.error('❌ Failed to save unread counts:', error);
    }
  };

  // Load unread counts from localStorage
  $scope.loadUnreadCounts = function() {
    try {
      const stored = localStorage.getItem($scope.UNREAD_STORAGE_KEY);
      if (!stored) return;
      
      const unreadData = JSON.parse(stored);
      console.log('📂 Loading unread counts from localStorage:', unreadData);
      
      // Restore contact unread counts
      $scope.contacts.forEach(contact => {
        const key = contact.email || contact.conversation_id;
        if (unreadData[key] && unreadData[key].type === 'contact') {
          contact.unreadCount = unreadData[key].count;
          contact.hasUnread = true;
          contact.isNewMessage = unreadData[key].isNewMessage;
          if (unreadData[key].lastMessage) {
            contact.lastMessageContent = unreadData[key].lastMessage;
          }
          if (unreadData[key].lastTime) {
            contact.lastMessageTime = new Date(unreadData[key].lastTime);
          }
        }
      });
      
      // Restore group unread counts
      $scope.groups.forEach(group => {
        const key = group.conversation_id || group.id;
        if (unreadData[key] && unreadData[key].type === 'group') {
          group.unreadCount = unreadData[key].count;
          group.hasUnread = true;
          group.isNewMessage = unreadData[key].isNewMessage;
          if (unreadData[key].lastMessage) {
            group.lastMessageContent = unreadData[key].lastMessage;
          }
          if (unreadData[key].lastTime) {
            group.lastMessageTime = new Date(unreadData[key].lastTime);
          }
        }
      });
      
      // Calculate total unread count after loading
      $scope.calculateTotalUnreadCount();
      
    } catch (error) {
      console.error('❌ Failed to load unread counts:', error);
    }
  };

  // Clear unread count for specific contact/group
  $scope.clearUnreadCount = function(identifier, type) {
    try {
      const stored = localStorage.getItem($scope.UNREAD_STORAGE_KEY);
      if (!stored) return;
      
      const unreadData = JSON.parse(stored);
      delete unreadData[identifier];
      
      localStorage.setItem($scope.UNREAD_STORAGE_KEY, JSON.stringify(unreadData));
      console.log('🗑️ Cleared unread count for:', identifier);
    } catch (error) {
      console.error('❌ Failed to clear unread count:', error);
    }
  };

  // Initialize notification system
  $scope.initializeNotifications = function() {
    console.log('🔔 Initializing notification system');
    
    // Listen for broadcast messages (new notification system)
    $rootScope.$on('message:broadcast', function(event, data) {
      console.log('📢 Received message:broadcast event:', data);
      $scope.handleBroadcastMessage(data);
    });

    // Listen for regular new messages (existing system)
    $rootScope.$on('message:new', function(event, message) {
      console.log('💬 Received message:new event:', message);
      // Existing message handling logic will be here
    });
    
    // Listen for group join requests (for admins/owners)
    $rootScope.$on('group_join_request', function(event, data) {
      console.log('🔔 New join request received:', data);
      
      // Show notification immediately
      ToastService.info(`${data.requester.name || data.requester.username} wants to join ${data.group_name}`);
      
      // Play notification sound
      $scope.playNotificationSound();
      
      // If viewing this group, reload requests
      if ($scope.selectedContact && $scope.selectedContact.isGroup) {
        const currentGroupId = $scope.selectedContact.conversation_id || $scope.selectedContact.id;
        if (currentGroupId === data.conversation_id) {
          console.log('🔄 Reloading join requests for current group');
          $scope.loadJoinRequests();
        }
      }
      
      // Update the join requests count badge for this group
      const allGroups = ($scope.groups || []).concat($scope.archivedGroups || []);
      const targetGroup = allGroups.find(g => (g.conversation_id || g.id) === data.conversation_id);
      if (targetGroup) {
        // Increment pending requests count
        targetGroup.pendingRequestsCount = (targetGroup.pendingRequestsCount || 0) + 1;
        console.log('📊 Updated pending requests count for group:', targetGroup.name, targetGroup.pendingRequestsCount);
      }
    });
    
    // Listen for join request approval (for requester)
    $rootScope.$on('group_join_approved', function(event, data) {
      console.log('✅ Join request approved:', data);
      
      // Show success notification
      ToastService.success(`Your request to join ${data.group_name} has been approved!`);
      
      // Play notification sound
      $scope.playNotificationSound();
      
      // Reload groups to show the newly joined group
      console.log('🔄 Reloading groups after approval...');
      $scope.loadGroups().then(function() {
        console.log('✅ Groups reloaded successfully');
        
        // Find and select the newly joined group
        const allGroups = ($scope.groups || []).concat($scope.archivedGroups || []);
        const joinedGroup = allGroups.find(g => (g.id || g.conversation_id) === data.conversation_id);
        
        if (joinedGroup) {
          console.log('🎉 Found newly joined group:', joinedGroup.name);
          // Auto-select the group to show it to the user
          $timeout(function() {
            $scope.selectGroupMobile(joinedGroup);
          }, 500);
        }
      }).catch(function(error) {
        console.error('❌ Failed to reload groups:', error);
      });
      
      // Remove from pending requests
      $scope.loadPendingRequestGroups();
    });
    
    // Listen for join request rejection (for requester)
    $rootScope.$on('group_join_rejected', function(event, data) {
      console.log('❌ Join request rejected:', data);
      
      // Show rejection notification
      ToastService.info(`Your request to join ${data.group_name} was not approved`);
      
      // Remove from pending requests
      $scope.loadPendingRequestGroups();
    });
    
    // Listen for join request updates (for other admins)
    $rootScope.$on('group_join_request_update', function(event, data) {
      console.log('🔄 Join request processed by another admin:', data);
      
      // If viewing this group, reload requests
      if ($scope.selectedContact && $scope.selectedContact.isGroup) {
        const currentGroupId = $scope.selectedContact.conversation_id || $scope.selectedContact.id;
        if (currentGroupId === data.conversation_id) {
          console.log('🔄 Reloading join requests after update');
          $scope.loadJoinRequests();
        }
      }
      
      // Update the join requests count badge for this group
      const allGroups = ($scope.groups || []).concat($scope.archivedGroups || []);
      const targetGroup = allGroups.find(g => (g.conversation_id || g.id) === data.conversation_id);
      if (targetGroup && targetGroup.pendingRequestsCount > 0) {
        // Decrement pending requests count
        targetGroup.pendingRequestsCount = Math.max(0, (targetGroup.pendingRequestsCount || 0) - 1);
        console.log('📊 Updated pending requests count for group:', targetGroup.name, targetGroup.pendingRequestsCount);
      }
      
      // Show notification
      const action = data.action === 'approved' ? 'approved' : 'rejected';
      ToastService.info(`${data.requester_email} was ${action} by another admin`);
    });
    
    // Listen for join request cancellations (for admins)
    $rootScope.$on('group_join_request_cancelled', function(event, data) {
      console.log('🚫 Join request cancelled:', data);
      
      // If viewing this group, reload requests
      if ($scope.selectedContact && $scope.selectedContact.isGroup) {
        const currentGroupId = $scope.selectedContact.conversation_id || $scope.selectedContact.id;
        if (currentGroupId === data.conversation_id) {
          console.log('🔄 Reloading join requests after cancellation');
          $scope.loadJoinRequests();
        }
      }
      
      // Update the join requests count badge for this group
      const allGroups = ($scope.groups || []).concat($scope.archivedGroups || []);
      const targetGroup = allGroups.find(g => (g.conversation_id || g.id) === data.conversation_id);
      if (targetGroup && targetGroup.pendingRequestsCount > 0) {
        targetGroup.pendingRequestsCount = Math.max(0, (targetGroup.pendingRequestsCount || 0) - 1);
        console.log('📊 Updated pending requests count for group:', targetGroup.name, targetGroup.pendingRequestsCount);
      }
      
      // Show notification to admins
      ToastService.info(`${data.requester_email} cancelled their request to join ${data.group_name}`);
    });
  };

  // Handle broadcast messages for notifications
  $scope.handleBroadcastMessage = function(data) {
    console.log('🔔 Processing broadcast message:', {
      conversation_id: data.conversation_id,
      sender: data.sender,
      content: data.content,
      timestamp: data.timestamp || data.created_at,
      should_notify: data.user_status?.should_notify,
      is_active_in_room: data.user_status?.is_active_in_room,
      conversation_type: data.conversation_info?.type
    });

    const { conversation_info, user_status } = data;
    
    if (user_status && user_status.should_notify) {
      console.log('🔔 Should show notification for conversation:', conversation_info.conversation_id);
      
      // Find the contact by sender email/username
      let targetContact = null;
      
      // Search in contacts
      for (let contact of $scope.contacts) {
        if (contact.email === data.sender || contact.username === data.sender) {
          targetContact = contact;
          break;
        }
      }
      
      // Search in groups if not found in contacts
      if (!targetContact) {
        for (let group of $scope.groups) {
          if (group.conversation_id === conversation_info.conversation_id) {
            targetContact = group;
            break;
          }
        }
      }
      
      if (targetContact) {
        console.log('📊 Found target contact:', targetContact.name || targetContact.username);
        
        // Update contact with latest message info
        const messageTime = new Date(data.timestamp || data.created_at);
        
        // Increment unread count
        const currentCount = targetContact.unreadCount || 0;
        const newCount = currentCount + 1;
        targetContact.unreadCount = newCount;
        targetContact.hasUnread = true;
        
        // Update latest message content and time (WhatsApp style)
        targetContact.lastMessageContent = data.content || 'Sent a file';
        targetContact.lastMessageTime = messageTime;
        targetContact.isNewMessage = true; // Flag to show bold text
        
        console.log('📊 Updated contact:', {
          name: targetContact.name || targetContact.username,
          unreadCount: newCount,
          lastMessage: targetContact.lastMessageContent,
          lastTime: messageTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
        });
        
        // Re-sort contacts/groups to move this conversation to the top (WhatsApp style)
        if (conversation_info.type === 'group') {
          $scope.filterGroups($scope.groupFilter);
        } else {
          $scope.filterContacts($scope.filter);
        }
        
        // Play notification sound
        $scope.playNotificationSound();
        
        // Update total unread count and page title
        $scope.calculateTotalUnreadCount();
        
        // Save to localStorage
        $scope.saveUnreadCounts();
        
        // Force UI update
        $scope.$apply();
        
        // Show browser notification if permission granted
        $scope.showBrowserNotification(data);
      } else {
        console.log('❌ Could not find contact for sender:', data.sender);
      }
    } else {
      console.log('🔕 No notification needed - user is active in room');
    }
  };

  // Show browser notification
  $scope.showBrowserNotification = function(data) {
    const NOTIFICATION_STORAGE_KEY = 'allownotifications';
    const allowNotifications = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    
    // Only show notifications if explicitly allowed in localStorage and browser permission is granted
    if (allowNotifications === 'true' && Notification.permission === 'granted') {
      const { conversation_info } = data;
      const title = conversation_info.type === 'group' 
        ? `New message in ${conversation_info.group_name}`
        : `New message from ${data.sender}`;
      const body = data.content || 'Sent a file';
      
      console.log('🔔 Showing browser notification:', { title, body });
      
      const notification = new Notification(title, {
        body,
        icon: '/src/app/public/logo.png',
        tag: conversation_info.conversation_id,
        badge: '/src/app/public/logo.png',
        requireInteraction: false, // Auto-dismiss after a few seconds
        silent: false // Allow notification sound
      });
      
      // Auto-close notification after 5 seconds
      setTimeout(function() {
        notification.close();
      }, 5000);
      
      // Handle notification click
      notification.onclick = function() {
        window.focus();
        notification.close();
      };
    } else {
      console.log('🔕 Browser notifications disabled. localStorage:', allowNotifications, 'Browser permission:', Notification.permission);
    }
  };

  // Update contact unread status in UI
  $scope.updateContactUnreadStatus = function() {
    console.log('🔄 Updating contact unread status, current counts:', Array.from($scope.unreadCounts.entries()));
    
    // Update contacts
    $scope.contacts.forEach(contact => {
      const unreadCount = $scope.unreadCounts.get(contact.conversation_id) || 0;
      contact.unreadCount = unreadCount;
      contact.hasUnread = unreadCount > 0;
    });
    
    // Update groups
    $scope.groups.forEach(group => {
      const unreadCount = $scope.unreadCounts.get(group.conversation_id) || 0;
      group.unreadCount = unreadCount;
      group.hasUnread = unreadCount > 0;
    });
  };

  // Join conversation (for room tracking)
  $scope.joinConversation = function(conversationId) {
    console.log('🚪 Joining conversation:', conversationId);
    
    // Leave previous conversation
    if ($scope.activeConversationId && $scope.activeConversationId !== conversationId) {
      console.log('🚪 Leaving previous conversation:', $scope.activeConversationId);
      SocketService.emit('leave_conversation', {
        conversation_id: $scope.activeConversationId
      });
    }
    
    // Join new conversation
    $scope.activeConversationId = conversationId;
    SocketService.emit('join_conversation', {
      conversation_id: conversationId
    });
    
    // Clear unread count for this conversation
    if ($scope.unreadCounts.has(conversationId)) {
      console.log('🔄 Clearing unread count for:', conversationId);
      $scope.unreadCounts.set(conversationId, 0);
      $scope.updateContactUnreadStatus();
    }
  };

  // Leave conversation (for room tracking)
  $scope.leaveConversation = function(conversationId) {
    console.log('🚪 Leaving conversation:', conversationId);
    SocketService.emit('leave_conversation', {
      conversation_id: conversationId
    });
    $scope.activeConversationId = null;
  };

  // Check and request notification permission based on localStorage
  $scope.checkAndRequestNotificationPermission = function() {
    const NOTIFICATION_STORAGE_KEY = 'allownotifications';
    const allowNotifications = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    
    console.log('🔔 Checking notification permission. localStorage value:', allowNotifications);
    console.log('🔔 Browser permission status:', Notification.permission);
    
    // Update scope variable
    $scope.notificationPermission = Notification.permission;
    
    // If localStorage is null/undefined or explicitly set to 'false', request permission
    if (allowNotifications === null || allowNotifications === 'false') {
      console.log('🔔 Notifications not allowed in localStorage, requesting permission...');
      
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          // Request permission and handle the result
          Notification.requestPermission().then(function(permission) {
            console.log('🔔 User responded to notification request:', permission);
            
            // Update scope variable
            $scope.notificationPermission = permission;
            
            if (permission === 'granted') {
              localStorage.setItem(NOTIFICATION_STORAGE_KEY, 'true');
              console.log('✅ Notifications granted and saved to localStorage');
              ToastService.success('Notifications enabled! You\'ll now receive message alerts.');
            } else if (permission === 'denied') {
              localStorage.setItem(NOTIFICATION_STORAGE_KEY, 'false');
              console.log('❌ Notifications denied and saved to localStorage');
              ToastService.info('Notifications disabled. You can enable them later in browser settings.');
            }
            
            $scope.$apply(); // Trigger digest cycle to update UI
          }).catch(function(error) {
            console.error('❌ Error requesting notification permission:', error);
            localStorage.setItem(NOTIFICATION_STORAGE_KEY, 'false');
          });
        } else if (Notification.permission === 'granted') {
          // Already granted, update localStorage
          localStorage.setItem(NOTIFICATION_STORAGE_KEY, 'true');
          console.log('✅ Notifications already granted, updated localStorage');
        } else if (Notification.permission === 'denied') {
          // Already denied, update localStorage
          localStorage.setItem(NOTIFICATION_STORAGE_KEY, 'false');
          console.log('❌ Notifications already denied, updated localStorage');
        }
      } else {
        console.log('❌ Notifications not supported in this browser');
        localStorage.setItem(NOTIFICATION_STORAGE_KEY, 'false');
        $scope.notificationPermission = 'not-supported';
      }
    } else if (allowNotifications === 'true') {
      console.log('✅ Notifications already allowed in localStorage');
      
      // Double-check browser permission matches localStorage
      if (Notification.permission !== 'granted') {
        console.log('⚠️ localStorage says allowed but browser permission is:', Notification.permission);
        // Reset localStorage to trigger permission request again
        localStorage.setItem(NOTIFICATION_STORAGE_KEY, 'false');
        // Recursively call to request permission
        $scope.checkAndRequestNotificationPermission();
      }
    }
  };

  // Legacy function for manual permission requests
  $scope.requestNotificationPermission = function() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(function(permission) {
        console.log('🔔 Manual notification permission request result:', permission);
        const NOTIFICATION_STORAGE_KEY = 'allownotifications';
        
        if (permission === 'granted') {
          localStorage.setItem(NOTIFICATION_STORAGE_KEY, 'true');
          ToastService.success('Notifications enabled!');
        } else {
          localStorage.setItem(NOTIFICATION_STORAGE_KEY, 'false');
          ToastService.info('Notifications disabled.');
        }
      });
    }
  };

  // Initialize notification system when controller loads
  $timeout(function() {
    console.log('🔔 Initializing notification system...');
    $scope.initializeNotifications();
    
    // Check if audio file is accessible
    $scope.checkAudioFileAccess();
    
    // Initialize audio after a short delay to ensure DOM is ready
    $timeout(function() {
      $scope.initializeNotificationAudio();
    }, 500);
    
    // Check and request notification permission based on localStorage
    $timeout(function() {
      $scope.checkAndRequestNotificationPermission();
    }, 1500); // Delay to ensure page is fully loaded
    
    // Periodically save unread counts to localStorage (every 30 seconds)
    $scope.saveInterval = setInterval(function() {
      $scope.saveUnreadCounts();
    }, 30000);
  }, 1000);
  
  // Clean up interval when scope is destroyed
  $scope.$on('$destroy', function() {
    if ($scope.saveInterval) {
      clearInterval($scope.saveInterval);
    }
    // Save one final time before destroying
    $scope.saveUnreadCounts();
  });

  $scope.jumpToPresentMobile = function() {
    const messagesContainer = document.getElementById('mobile-messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      $scope.showMobileJumpToPresent = false;
      $scope.mobileJumpToPresentLoaded = false;
    }
  };

  $scope.scrollToBottomMobile = function(force) {
    $timeout(function() {
      const messagesContainer = document.getElementById('mobile-messages-container');
      if (messagesContainer) {
        // Only auto-scroll if forced or user is near bottom (within 100px)
        const isNearBottom = force || (messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight) < 100;
        
        if (isNearBottom) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
          $scope.showMobileJumpToPresent = false;
          $scope.mobileJumpToPresentLoaded = false;
        }
      }
    }, 50);
  };

  // Watch for mobile jump to present loaded state
  $scope.$watch('showMobileJumpToPresent', function(newVal) {
    if (newVal) {
      $timeout(function() {
        $scope.mobileJumpToPresentLoaded = true;
      }, 100);
    } else {
      $scope.mobileJumpToPresentLoaded = false;
    }
  });

  // Universal scroll to bottom function (works for both desktop and mobile)
  $scope.scrollToBottomUniversal = function(force) {
    $scope.scrollToBottom(force); // Desktop
    if ($scope.isMobile) {
      $scope.scrollToBottomMobile(force); // Mobile
    }
  };
  
  // Handle window resize
  window.addEventListener('resize', function() {
    $timeout(function() {
      $scope.isMobile = window.innerWidth < 768;
      if (!$scope.isMobile) {
        $scope.showMobileSidebar = false;
        $scope.mobileView = 'chats';
      }
    });
  });
  
  // Mention functionality
  $scope.mentionSuggestions = [];
  $scope.showMentionSuggestions = false;
  $scope.mentionSearchQuery = '';
  $scope.mentionStartPos = -1;
  $scope.selectedMentionIndex = -1;
  $scope.mentionActiveTab = 'members'; // 'members' or 'roles'
  $scope.memberSuggestions = [];
  $scope.roleSuggestions = [];
  $scope.typingUsers = {};
  $scope.typingTimeout = null;
  $scope.isTyping = false;
  $scope.loading = true;
  $scope.ThemeService = ThemeService;
  $scope.availableThemes = ThemeService.getAvailableThemes(); // Cache available themes
  
  $scope.ChatService = ChatService; // Make ChatService available in scope
  $scope.showProfilePopup = false;
  $scope.editingProfile = false;
  $scope.editForm = {
    name: '',
    username: '',
    profile_picture: null,
    profilePicturePreview: null
  };
  $scope.usernameAvailable = null;
  $scope.checkingUsername = false;
  $scope.usernameCheckTimeout = null;
  
  // Delete confirmation modal state
  $scope.deleteConfirmation = {
    show: false,
    message: null
  };
  
  // Delete chat confirmation state
  $scope.deleteChatConfirmation = {
    show: false,
    contact: null
  };
  
  // Leave group confirmation state
  $scope.leaveGroupConfirmation = {
    show: false,
    group: null
  };
  
  // Delete role confirmation state
  $scope.deleteRoleConfirmation = {
    show: false,
    roleName: null
  };
  
  // Remove member confirmation state
  $scope.removeMemberConfirmation = {
    show: false,
    memberEmail: null,
    memberName: null
  };
  
  // Request notification permission
  $scope.requestNotificationPermission = function() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(function(permission) {
        $scope.$apply(function() {
          $scope.notificationPermission = permission;
        });
        if (permission === 'granted') {
          ToastService.success('Notifications enabled');
        }
      });
    }
  };
  
  // Check notification permission on load
  if ('Notification' in window) {
    $scope.notificationPermission = Notification.permission;
    
    // Update permission status periodically
    $scope.updateNotificationStatus = function() {
      $scope.notificationPermission = Notification.permission;
    };
    
    // Check status every few seconds
    setInterval(function() {
      const currentPermission = Notification.permission;
      if ($scope.notificationPermission !== currentPermission) {
        $timeout(function() {
          $scope.notificationPermission = currentPermission;
        });
      }
    }, 2000);
  } else {
    $scope.notificationPermission = 'not-supported';
  }
  
  // Show notification for new message
  $scope.showNotification = function(title, body, icon) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'vibgyorchat-message'
      });
      
      notification.onclick = function() {
        window.focus();
        notification.close();
      };
      
      // Auto-close after 5 seconds
      setTimeout(function() {
        notification.close();
      }, 5000);
    }
  };

  // Sidebar resize state
  $scope.sidebarWidth = parseInt(localStorage.getItem('sidebarWidth')) || 384; // Default 384px (w-96 equivalent)
  $scope.minSidebarWidth = 320; // Increased from 280 to prevent text overlap
  $scope.maxSidebarWidth = 600;
  $scope.isResizing = false;
  $scope.showFilterDropdown = false;
  
  // Check if sidebar is in compact mode (filters should be in dropdown)
  $scope.isCompactMode = function() {
    return $scope.sidebarWidth < 350;
  };

  // Resize handle functions
  $scope.startResize = function($event) {
    $event.preventDefault();
    $scope.isResizing = true;
    $scope.startX = $event.clientX;
    $scope.startWidth = $scope.sidebarWidth;
    
    // Add event listeners to document
    angular.element(document).on('mousemove', $scope.onResize);
    angular.element(document).on('mouseup', $scope.stopResize);
  };

  $scope.onResize = function($event) {
    if (!$scope.isResizing) return;
    
    const deltaX = $event.clientX - $scope.startX;
    let newWidth = $scope.startWidth + deltaX;
    
    // Clamp width between min and max
    newWidth = Math.max($scope.minSidebarWidth, Math.min($scope.maxSidebarWidth, newWidth));
    
    $scope.$apply(function() {
      $scope.sidebarWidth = newWidth;
    });
  };

  $scope.stopResize = function() {
    if (!$scope.isResizing) return;
    
    $scope.$apply(function() {
      $scope.isResizing = false;
      // Save to localStorage
      localStorage.setItem('sidebarWidth', $scope.sidebarWidth);
    });
    
    // Remove event listeners
    angular.element(document).off('mousemove', $scope.onResize);
    angular.element(document).off('mouseup', $scope.stopResize);
  };

  // Toggle filter dropdown
  $scope.toggleFilterDropdown = function() {
    $scope.showFilterDropdown = !$scope.showFilterDropdown;
  };

  // Close filter dropdown
  $scope.closeFilterDropdown = function() {
    $scope.showFilterDropdown = false;
  };

  // Filter and close dropdown
  $scope.filterAndClose = function(filterType) {
    $scope.filterContacts(filterType);
    $scope.closeFilterDropdown();
  };

  // Search related variables
  $scope.searchResults = {
    contacts: [],
    global: []
  };
  $scope.isSearching = false;
  $scope.searchTimeout = null;
  $scope.addingToContacts = {}; // Track loading state for each user
  $scope.sidebarView = 'chats'; // Default sidebar view
  $scope.contextMenu = {
    show: false,
    contact: null,
    x: 0,
    y: 0
  };
  $scope.showDeleteConfirmation = false;
  $scope.deleteContact = null;
  $scope.showAttachmentMenu = false;
  $scope.sendingMessage = false;
  $scope.uploadingFile = false;
  $scope.socketConnected = false;
  $scope.loadingMessages = false;
  $scope.loadingOlderMessages = false;

  // File preview state - Multiple files support
  $scope.filePreviews = [];

  // Lightbox state
  $scope.lightbox = {
    show: false,
    currentImage: null,
    images: [],
    currentIndex: 0
  };

  // Emoji picker variable (using emoji-picker library)
  $scope.showEmojiPicker = false;

  // Starfield animation variables
  $scope.stars = [];
  $scope.mouseX = 0;
  $scope.mouseY = 0;

  $scope.init = function() {
    // Check if we came from an invite link
    const currentPath = window.location.pathname;
    const inviteMatch = currentPath.match(/\/invite\/([a-f0-9]{24})/);
    if (inviteMatch) {
      const groupId = inviteMatch[1];
      // Store the group ID for processing after initialization
      $scope.pendingInviteGroupId = groupId;
      // Clean up the URL
      window.history.replaceState({}, document.title, '/chat');
    }
    
    UserService.getMe().then(function(user) {
      $scope.currentUser = user;
      SocketService.connect();
      
      // Save draft when user leaves the page
      window.addEventListener('beforeunload', function() {
        if ($scope.selectedContact && $scope.draftKey && $scope.messageInput) {
          $scope.saveDraft();
        }
      });
      
      // Monitor socket connection status more reliably
      $scope.checkSocketConnection = setInterval(function() {
        const isConnected = SocketService.isConnected();
        if ($scope.socketConnected !== isConnected) {
          $timeout(function() {
            $scope.socketConnected = isConnected;
            
            // If socket just connected, fetch all presences
            if (isConnected && $scope.contacts.length > 0) {
              $scope.fetchAllPresences();
            }
          });
        }
      }, 500); // Check every 500ms for more responsive updates
      
      // Periodically fetch all presences every 2 minutes
      $scope.presenceFetchInterval = setInterval(function() {
        if (SocketService.isConnected() && $scope.contacts.length > 0) {
          $scope.fetchAllPresences();
        }
      }, 120000); // 2 minutes = 120000ms
      
      return $scope.loadContacts();
    }).then(function() {
      // Load groups
      return $scope.loadGroups();
    }).then(function() {
      // Load pending request groups
      $scope.loadPendingRequestGroups();
      
      // Check for pending group invite
      $scope.handlePendingGroupInvite();
      
      $scope.loading = false;
      
      // Initialize mosaic background after a short delay to ensure DOM is ready
      $timeout(function() {
        initMosaicBackground('chatMosaicBg');
        initMosaicBackground('messagesMosaicBg');
        initMosaicBackground('welcomeMosaicBg');
      }, 100);
    }).catch(function(error) {
      console.error('Initialization failed:', error);
      $scope.loading = false;
    });
  };

  // Handle pending group invite from localStorage or URL
  $scope.handlePendingGroupInvite = function() {
    let pendingGroupId = localStorage.getItem('pendingGroupInvite') || $scope.pendingInviteGroupId;
    
    if (pendingGroupId) {
      // Remove from localStorage if it exists
      localStorage.removeItem('pendingGroupInvite');
      // Clear the URL-based pending invite
      $scope.pendingInviteGroupId = null;
      
      // Check if user is already in this group
      const allGroups = ($scope.groups || []).concat($scope.archivedGroups || []);
      const existingGroup = allGroups.find(g => g.id === pendingGroupId);
      
      if (existingGroup) {
        // User is already in this group, just open it
        ToastService.info(`You're already a member of ${existingGroup.name}`);
        $scope.selectGroupMobile(existingGroup);
        return;
      }
      
      // Try to join the group
      $scope.joinGroupById(pendingGroupId);
    }
  };

  // Handle invite link from URL parameters
  $scope.handleInviteFromUrl = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const groupId = urlParams.get('invite');
    
    if (groupId) {
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Check if user is already in this group
      const allGroups = ($scope.groups || []).concat($scope.archivedGroups || []);
      const existingGroup = allGroups.find(g => g.id === groupId);
      
      if (existingGroup) {
        // User is already in this group, just open it
        ToastService.info(`You're already a member of ${existingGroup.name}`);
        $scope.selectGroupMobile(existingGroup);
        return;
      }
      
      // Try to join the group
      $scope.joinGroupById(groupId);
    }
  };

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

  $scope.loadContacts = function() {
    return UserService.getContacts().then(function(contacts) {
      $scope.contacts = contacts;
      
      // Load unread counts from localStorage after contacts are loaded
      $scope.loadUnreadCounts();
      
      // Apply the current filter to separate archived contacts
      $scope.filterContacts($scope.filter);
      
      // Fetch last message for each contact
      contacts.forEach(function(contact) {
        $scope.fetchLastMessage(contact);
      });
      
      // Fetch all presence statuses
      $scope.fetchAllPresences();
      
      // Calculate initial total unread count
      $timeout(function() {
        $scope.calculateTotalUnreadCount();
      }, 500);
      
      return contacts;
    }).catch(function(error) {
      console.error('Failed to load contacts:', error);
      $scope.contacts = [];
      $scope.filteredContacts = [];
      $scope.archivedContacts = [];
      return [];
    });
  };

  // Fetch all user presence statuses
  $scope.fetchAllPresences = function() {
    // Check if socket is connected before attempting
    if (!SocketService.isConnected()) {
      console.log('Socket not connected yet, skipping presence fetch');
      return;
    }
    
    SocketService.getAllPresences().then(function(presences) {
      console.log('Updating presence for all users:', presences);
      
      // Use $timeout to ensure we're in Angular's digest cycle
      $timeout(function() {
        // Update each contact with their presence status
        presences.forEach(function(presence) {
          const contact = $scope.contacts.find(c => c.email === presence.user);
          if (contact) {
            contact.online = presence.status === 'online';
            contact.idle = presence.status === 'idle';
            if (presence.last_seen) {
              contact.last_seen = presence.last_seen;
            }
            
            // Update selected contact if it matches
            if ($scope.selectedContact && $scope.selectedContact.email === presence.user) {
              $scope.selectedContact.online = contact.online;
              $scope.selectedContact.idle = contact.idle;
              $scope.selectedContact.last_seen = contact.last_seen;
            }
          }
        });
      });
    }).catch(function(error) {
      console.error('Failed to fetch presences:', error);
    });
  };

  // Fetch last message for a contact
  $scope.fetchLastMessage = function(contact) {
    if (!contact.conversation_id) {
      // Create conversation first to get conversation_id
      ChatService.createConversation(contact.email).then(function(conversation) {
        contact.conversation_id = conversation.id;
        return ChatService.getConversationInfo(conversation.id);
      }).then(function(conversationInfo) {
        if (conversationInfo.last_message) {
          return ChatService.getMessageInfo(conversationInfo.last_message);
        }
        return null;
      }).then(function(messageInfo) {
        if (messageInfo) {
          $timeout(function() {
            // Check if message is deleted
            if (messageInfo.is_deleted || messageInfo.deleted) {
              contact.lastMessageContent = 'This message was deleted';
            } else {
              contact.lastMessageContent = messageInfo.content || (messageInfo.type === 'image' ? '📷 Image' : messageInfo.type === 'file' ? '📎 File' : 'Message');
            }
            contact.lastMessageTime = messageInfo.created_at;
          });
        }
      }).catch(function(error) {
        console.error('Failed to fetch last message for contact:', contact.email, error);
      });
    } else {
      // Already have conversation_id
      ChatService.getConversationInfo(contact.conversation_id).then(function(conversationInfo) {
        if (conversationInfo.last_message) {
          return ChatService.getMessageInfo(conversationInfo.last_message);
        }
        return null;
      }).then(function(messageInfo) {
        if (messageInfo) {
          $timeout(function() {
            // Check if message is deleted
            if (messageInfo.is_deleted || messageInfo.deleted) {
              contact.lastMessageContent = 'This message was deleted';
            } else {
              contact.lastMessageContent = messageInfo.content || (messageInfo.type === 'image' ? '📷 Image' : messageInfo.type === 'file' ? '📎 File' : 'Message');
            }
            contact.lastMessageTime = messageInfo.created_at;
          });
        }
      }).catch(function(error) {
        console.error('Failed to fetch last message for contact:', contact.email, error);
      });
    }
  };

  $scope.filterContacts = function(filterType) {
    $scope.filter = filterType;

    switch(filterType) {
      case 'all':
        // Exclude archived contacts from main list, sort with pinned ones first, then by last message time
        $scope.filteredContacts = $scope.contacts.filter(c => !c.archived).sort(function(a, b) {
          // Pinned contacts always come first
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          
          // Within pinned or non-pinned, sort by last message time (most recent first)
          const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return bTime - aTime; // Descending order (newest first)
        });
        // Separate archived contacts, also sorted by last message time
        $scope.archivedContacts = $scope.contacts.filter(c => c.archived).sort(function(a, b) {
          const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return bTime - aTime;
        });
        
        // Also filter groups for chats view
        $scope.filteredGroups = $scope.groups.filter(g => !g.archived).sort(function(a, b) {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return bTime - aTime;
        });
        // Separate archived groups
        $scope.archivedGroups = $scope.groups.filter(g => g.archived).sort(function(a, b) {
          const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return bTime - aTime;
        });
        break;
      case 'muted':
        $scope.filteredContacts = $scope.contacts.filter(c => c.muted && !c.archived).sort(function(a, b) {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return bTime - aTime;
        });
        $scope.archivedContacts = $scope.contacts.filter(c => c.archived).sort(function(a, b) {
          const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return bTime - aTime;
        });
        
        // Also filter muted groups
        $scope.filteredGroups = $scope.groups.filter(g => g.muted && !g.archived).sort(function(a, b) {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return bTime - aTime;
        });
        $scope.archivedGroups = $scope.groups.filter(g => g.archived).sort(function(a, b) {
          const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return bTime - aTime;
        });
        break;
      case 'favorites':
        $scope.filteredContacts = $scope.contacts.filter(c => c.favorited && !c.archived).sort(function(a, b) {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return bTime - aTime;
        });
        $scope.archivedContacts = $scope.contacts.filter(c => c.archived).sort(function(a, b) {
          const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return bTime - aTime;
        });
        
        // Also filter favorited groups
        $scope.filteredGroups = $scope.groups.filter(g => g.is_favorited && !g.archived).sort(function(a, b) {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return bTime - aTime;
        });
        $scope.archivedGroups = $scope.groups.filter(g => g.archived).sort(function(a, b) {
          const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return bTime - aTime;
        });
        break;
      default:
        $scope.filteredContacts = $scope.contacts.filter(c => !c.archived).sort(function(a, b) {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return bTime - aTime;
        });
        $scope.archivedContacts = $scope.contacts.filter(c => c.archived).sort(function(a, b) {
          const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return bTime - aTime;
        });
        
        // Also filter groups
        $scope.filteredGroups = $scope.groups.filter(g => !g.archived).sort(function(a, b) {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return bTime - aTime;
        });
        $scope.archivedGroups = $scope.groups.filter(g => g.archived).sort(function(a, b) {
          const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return bTime - aTime;
        });
    }
  };

  // Filter groups
  $scope.filterGroups = function(filterType) {
    $scope.groupFilter = filterType;

    switch(filterType) {
      case 'all':
        // Exclude archived groups from main list, sort with pinned ones first, then by last message time
        $scope.filteredGroups = $scope.groups.filter(g => !g.archived).sort(function(a, b) {
          // Pinned groups always come first
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          
          // Within pinned or non-pinned, sort by last message time (most recent first)
          const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return bTime - aTime; // Descending order (newest first)
        });
        break;
      case 'muted':
        $scope.filteredGroups = $scope.groups.filter(g => g.muted && !g.archived).sort(function(a, b) {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return bTime - aTime;
        });
        break;
      case 'favorites':
        $scope.filteredGroups = $scope.groups.filter(g => g.is_favorited && !g.archived).sort(function(a, b) {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return bTime - aTime;
        });
        break;
      default:
        $scope.filteredGroups = $scope.groups.filter(g => !g.archived).sort(function(a, b) {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return bTime - aTime;
        });
    }
  };

  // Archived folder toggle
  $scope.showArchivedFolder = false;
  $scope.archivedContacts = [];
  $scope.archivedGroups = [];

  $scope.toggleArchivedFolder = function() {
    $scope.showArchivedFolder = !$scope.showArchivedFolder;
  };
  
  // Pending requests folder toggle
  $scope.togglePendingRequestsFolder = function() {
    $scope.showPendingRequestsFolder = !$scope.showPendingRequestsFolder;
  };
  
  // Load pending request groups for current user
  $scope.loadPendingRequestGroups = function() {
    if (!$scope.currentUser) return;
    
    console.log('📋 Loading pending request groups for current user...');
    
    JoinRequestService.getMyPendingRequests().then(function(response) {
      $scope.pendingRequestGroups = response.pending_requests || [];
      console.log('✅ Loaded pending request groups:', $scope.pendingRequestGroups.length);
      
      // Show the folder if there are pending requests
      if ($scope.pendingRequestGroups.length > 0) {
        console.log('📂 Showing pending requests folder with', $scope.pendingRequestGroups.length, 'groups');
      }
    }).catch(function(error) {
      console.error('❌ Failed to load pending request groups:', error);
      $scope.pendingRequestGroups = [];
    });
  };
  
  // Cancel join request
  $scope.cancelJoinRequest = function(conversationId) {
    console.log('🚫 Cancelling join request for group:', conversationId);
    
    JoinRequestService.cancelRequest(conversationId).then(function(response) {
      console.log('✅ Join request cancelled successfully:', response);
      ToastService.success(`Cancelled request to join ${response.group_name}`);
      
      // Reload pending request groups to update the UI
      $scope.loadPendingRequestGroups();
    }).catch(function(error) {
      console.error('❌ Failed to cancel join request:', error);
      ToastService.error(error.data?.message || 'Failed to cancel request');
    });
  };
  
  // Toggle join requests popup
  $scope.toggleJoinRequestsPopup = function() {
    console.log('🔔 Toggle join requests popup called');
    console.log('Current state:', $scope.showJoinRequestsPopup);
    console.log('Selected contact:', $scope.selectedContact);
    
    // Close pinned messages popup if open
    if ($scope.showPinnedMessagesPopup) {
      $scope.showPinnedMessagesPopup = false;
    }
    
    $scope.showJoinRequestsPopup = !$scope.showJoinRequestsPopup;
    
    console.log('New state:', $scope.showJoinRequestsPopup);
    
    if ($scope.showJoinRequestsPopup) {
      $scope.loadJoinRequests();
      $scope.hasUnreadJoinRequests = false; // Mark as read
    }
    
    // Force digest cycle to ensure UI updates
    $timeout(function() {
      console.log('🔄 Forced digest cycle, popup should be visible now');
    }, 0);
  };
  
  // Load join requests for current group from backend
  $scope.loadJoinRequests = function() {
    if (!$scope.selectedContact || !$scope.selectedContact.isGroup) {
      console.log('❌ Cannot load join requests - no group selected');
      $scope.joinRequests = [];
      return;
    }
    
    const groupId = $scope.selectedContact.conversation_id || $scope.selectedContact.id;
    console.log('📋 Loading join requests for group:', groupId);
    
    JoinRequestService.getPendingRequests(groupId).then(function(response) {
      $scope.joinRequests = response.pending_requests || [];
      console.log('✅ Fetched pending requests:', $scope.joinRequests, 'count:', $scope.joinRequests.length);
      
      // No need for $apply() - Angular's $http service already triggers digest cycle
    }).catch(function(error) {
      console.error('❌ Failed to load join requests:', error);
      $scope.joinRequests = [];
    });
  };
  
  // Accept join request via backend API
  $scope.acceptJoinRequest = function(request) {
    console.log('✅ Accepting join request:', request);
    
    const groupId = $scope.selectedContact.conversation_id || $scope.selectedContact.id;
    
    JoinRequestService.approveRequest(groupId, request.email).then(function(response) {
      ToastService.success(`${request.user_info.name || request.email} has been added to the group`);
      
      // Reload join requests
      $scope.loadJoinRequests();
      
      // Refresh group data
      $scope.loadGroups();
    }).catch(function(error) {
      console.error('Failed to approve request:', error);
      ToastService.error(error.data?.message || 'Failed to approve request');
    });
  };
  
  // Reject join request via backend API
  $scope.rejectJoinRequest = function(request) {
    console.log('❌ Rejecting join request:', request);
    
    const groupId = $scope.selectedContact.conversation_id || $scope.selectedContact.id;
    
    JoinRequestService.rejectRequest(groupId, request.email).then(function(response) {
      ToastService.info(`Join request from ${request.user_info.name || request.email} has been rejected`);
      
      // Reload join requests
      $scope.loadJoinRequests();
    }).catch(function(error) {
      console.error('Failed to reject request:', error);
      ToastService.error(error.data?.message || 'Failed to reject request');
    });
  };
  
  // Get pending join requests count for current group
  $scope.getJoinRequestsCount = function() {
    if (!$scope.selectedContact || !$scope.selectedContact.isGroup) {
      return 0;
    }
    
    const count = $scope.joinRequests ? $scope.joinRequests.length : 0;
    console.log('📊 Join requests count for group', $scope.selectedContact.conversation_id, ':', count);
    return count;
  };
  
  // Check if current user is admin or owner of selected group
  $scope.isGroupAdminOrOwner = function() {
    if (!$scope.selectedContact || !$scope.selectedContact.isGroup || !$scope.currentUser) {
      return false;
    }
    
    const group = $scope.selectedContact;
    const userEmail = $scope.currentUser.email;
    
    // Check if owner
    if (group.owner === userEmail) {
      return true;
    }
    
    // Check if admin
    if (group.admins && group.admins.includes(userEmail)) {
      return true;
    }
    
    return false;
  };

  $scope.searchContacts = function() {
    // Cancel previous search timeout
    if ($scope.searchTimeout) {
      $timeout.cancel($scope.searchTimeout);
    }

    if (!$scope.searchQuery || $scope.searchQuery.trim().length === 0) {
      // Reset to show regular contacts when search is empty
      $scope.filterContacts($scope.filter);
      $scope.searchResults = { contacts: [], global: [], groups: [], messages: [], groupIdMatch: null };
      $scope.isSearching = false;
      return;
    }

    // Set searching state
    $scope.isSearching = true;

    // Debounce search to avoid too many operations
    $scope.searchTimeout = $timeout(function() {
      const query = $scope.searchQuery.toLowerCase().trim();
      
      // Check if query looks like a MongoDB ObjectId (24 hex characters)
      const isObjectId = /^[0-9a-f]{24}$/i.test(query);
      
      if (isObjectId) {
        // Check if user is already in this group
        const allGroups = ($scope.groups || []).concat($scope.archivedGroups || []);
        const existingGroup = allGroups.find(g => g.id === query);
        
        if (existingGroup) {
          // User is already in this group
          $scope.searchResults = {
            contacts: [],
            global: [],
            groups: [existingGroup],
            messages: [],
            groupIdMatch: {
              id: query,
              alreadyMember: true,
              group: existingGroup
            }
          };
          $scope.isSearching = false;
        } else {
          // Show option to join this group
          $scope.searchResults = {
            contacts: [],
            global: [],
            groups: [],
            messages: [],
            groupIdMatch: {
              id: query,
              alreadyMember: false
            }
          };
          $scope.isSearching = false;
        }
        return;
      }
      
      // Regular search (not a group ID)
      // Check if user is an employee for user search
      if (!$scope.isEmployee()) {
        // Non-employees can only search messages and groups, not users
        console.log('🚫 User search restricted: Not an employee');
        $scope.searchResults = {
          contacts: [],
          global: [],
          groups: [],
          messages: [],
          groupIdMatch: null
        };
        
        // Search in groups (frontend search)
        const allGroups = ($scope.groups || []).concat($scope.archivedGroups || []);
        allGroups.forEach(function(group) {
          if (group.name.toLowerCase().includes(query)) {
            $scope.searchResults.groups.push(group);
          }
        });
        
        // Search in messages (frontend search)
        $scope.searchInMessages(query);
        
        $scope.isSearching = false;
        return;
      }
      
      // Employee user search - Search in contacts (API call)
      UserService.searchUsers($scope.searchQuery).then(function(results) {
        $scope.searchResults = results;
        $scope.searchResults.groupIdMatch = null;
        
        // Filter out global users who are already in contacts
        if (results.global && results.global.length > 0) {
          const contactEmails = (results.contacts || []).map(c => c.email);
          $scope.searchResults.global = results.global.filter(user => 
            !contactEmails.includes(user.email)
          );
        }
        
        // Search in groups (frontend search)
        $scope.searchResults.groups = [];
        const allGroups = ($scope.groups || []).concat($scope.archivedGroups || []);
        allGroups.forEach(function(group) {
          if (group.name.toLowerCase().includes(query)) {
            $scope.searchResults.groups.push(group);
          }
        });
        
        // Search in messages (frontend search)
        $scope.searchResults.messages = [];
        $scope.searchInMessages(query);
        
        $scope.isSearching = false;
      }).catch(function(error) {
        console.error('Search failed:', error);
        $scope.searchResults = { contacts: [], global: [], groups: [], messages: [], groupIdMatch: null };
        $scope.isSearching = false;
      });
    }, 300); // 300ms debounce
  };
  
  // Search in messages across all conversations
  $scope.searchInMessages = function(query) {
    const messageResults = [];
    const searchedConversations = new Set();
    
    console.log('Starting message search for query:', query);
    console.log('Available contacts:', $scope.contacts ? $scope.contacts.length : 0);
    console.log('Available groups:', $scope.groups ? $scope.groups.length : 0);
    console.log('Available archived groups:', $scope.archivedGroups ? $scope.archivedGroups.length : 0);
    
    // Search in contact conversations
    ($scope.contacts || []).forEach(function(contact) {
      if (contact.conversation_id && !searchedConversations.has(contact.conversation_id)) {
        searchedConversations.add(contact.conversation_id);
        
        ChatService.loadMessages(contact.conversation_id).then(function(result) {
          const messages = result.messages || [];
          console.log('Searching in contact:', contact.name, 'Messages:', messages.length);
          
          messages.forEach(function(message) {
            // Skip deleted messages
            if (message.is_deleted || message.deleted) {
              return;
            }
            
            if (message.content && message.content.toLowerCase().includes(query)) {
              console.log('Found matching message in contact:', contact.name, 'Message:', message.content.substring(0, 50));
              messageResults.push({
                message: message,
                conversation: contact,
                conversationType: 'contact'
              });
            }
          });
          
          // Update search results
          $scope.searchResults.messages = messageResults;
          $scope.$applyAsync();
        }).catch(function(error) {
          console.error('Failed to search messages in contact:', contact.email, error);
        });
      }
    });
    
    // Search in group conversations
    const allGroups = ($scope.groups || []).concat($scope.archivedGroups || []);
    console.log('Total groups to search:', allGroups.length);
    
    allGroups.forEach(function(group) {
      console.log('Checking group:', group.name, 'ID:', group.id, 'Conversation ID:', group.conversation_id);
      
      // Use group.id as conversation_id for groups
      const conversationId = group.conversation_id || group.id;
      
      if (conversationId && !searchedConversations.has(conversationId)) {
        searchedConversations.add(conversationId);
        
        console.log('Searching messages in group:', group.name, 'Conversation ID:', conversationId);
        
        ChatService.loadMessages(conversationId).then(function(result) {
          const messages = result.messages || [];
          console.log('Searching in group:', group.name, 'Messages:', messages.length);
          
          messages.forEach(function(message) {
            // Skip deleted messages
            if (message.is_deleted || message.deleted) {
              return;
            }
            
            if (message.content && message.content.toLowerCase().includes(query)) {
              console.log('Found matching message in group:', group.name, 'Message:', message.content.substring(0, 50));
              messageResults.push({
                message: message,
                conversation: group,
                conversationType: 'group'
              });
            }
          });
          
          // Update search results
          $scope.searchResults.messages = messageResults;
          console.log('Total message results so far:', messageResults.length);
          $scope.$applyAsync();
        }).catch(function(error) {
          console.error('Failed to search messages in group:', group.name, error);
        });
      }
    });
  };
  
  // Open conversation from message search result
  $scope.openMessageResult = function(result) {
    if (result.conversationType === 'contact') {
      $scope.selectContactMobile(result.conversation);
    } else if (result.conversationType === 'group') {
      $scope.selectGroupMobile(result.conversation);
    }
    
    // Clear search after opening
    $scope.clearSearch();
    
    // Scroll to the message after a delay
    $timeout(function() {
      const messageElement = document.getElementById('message-' + result.message._id);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight the message briefly
        messageElement.classList.add('bg-yellow-500/20');
        $timeout(function() {
          messageElement.classList.remove('bg-yellow-500/20');
        }, 2000);
      }
    }, 500);
  };
  
  // Join group by ID - Creates a join request via API
  $scope.joiningGroup = false;
  $scope.joinGroupById = function(groupId) {
    if ($scope.joiningGroup) return;
    
    $scope.joiningGroup = true;
    
    // Additional validation: Check if this join attempt is from a revoked invite
    const pendingInvite = localStorage.getItem('pendingGroupInvite');
    if (pendingInvite === groupId) {
      // Check if there's a stored invite token that might be revoked
      const inviteToken = localStorage.getItem('pendingInviteToken');
      if (inviteToken) {
        const revokedCheck = InviteService.isInviteRevoked(inviteToken);
        if (revokedCheck.revoked) {
          console.log('🚫 Blocked join attempt for revoked invite:', inviteToken);
          ToastService.error('This invite link has been revoked. Please request a new link.');
          $scope.joiningGroup = false;
          localStorage.removeItem('pendingGroupInvite');
          localStorage.removeItem('pendingInviteToken');
          return;
        }
      }
    }
    
    // Send join request to backend
    JoinRequestService.requestToJoin(groupId).then(function(response) {
      if (response.already_member) {
        ToastService.info('You are already a member of this group');
        // Reload groups and select
        $scope.loadGroups().then(function() {
          const allGroups = ($scope.groups || []).concat($scope.archivedGroups || []);
          const joinedGroup = allGroups.find(g => g.id === groupId);
          if (joinedGroup) {
            $scope.selectGroupMobile(joinedGroup);
          }
        });
      } else if (response.already_requested) {
        ToastService.info('Your request is already pending approval');
      } else if (response.status === 'pending') {
        ToastService.success('Join request sent! Waiting for admin approval.');
        // Add to pending requests
        $scope.loadPendingRequestGroups();
      }
      
      // Clean up pending invite data
      localStorage.removeItem('pendingGroupInvite');
      localStorage.removeItem('pendingInviteToken');
      $scope.clearSearch();
      $scope.joiningGroup = false;
    }).catch(function(error) {
      console.error('Failed to send join request:', error);
      ToastService.error(error.data?.message || 'Failed to send join request');
      $scope.joiningGroup = false;
    });
  };
  
  // Clear search and return to appropriate view
  $scope.clearSearch = function() {
    $scope.searchQuery = '';
    $scope.searchResults = { contacts: [], global: [], groups: [], messages: [], groupIdMatch: null };
    $scope.isSearching = false;
    
    // Return to the appropriate view based on selected contact type
    if ($scope.selectedContact && $scope.selectedContact.isGroup) {
      $scope.sidebarView = 'groups';
    } else {
      $scope.sidebarView = 'chats';
    }
  };

  $scope.selectContact = function(contact) {
    // Save current draft before switching
    if ($scope.selectedContact && $scope.draftKey) {
      $scope.saveDraft();
    }
    
    // Clear mention suggestions when switching contacts
    $scope.closeMentionSuggestions();
    
    $scope.selectedContact = contact;
    $scope.messages = [];
    $scope.loadingMessages = true;
    $scope.showPinnedMessages = false; // Reset pinned messages panel
    $scope.showPinnedMessagesPopup = false; // Reset pinned messages popup
    $scope.pinnedMessages = []; // Reset pinned messages
    
    // Set up draft key for this contact
    $scope.draftKey = $scope.getDraftKey(contact);
    console.log('Switching to contact, draft key:', $scope.draftKey);
    
    // Clear current message input first
    $scope.messageInput = '';
    $scope.characterCount = 0;
    $scope.showCharacterCount = false;
    
    // Manually clear the textarea DOM element immediately
    const textarea = document.querySelector('textarea[ng-model="messageInput"]');
    if (textarea) {
      textarea.value = '';
    }
    
    // Use $timeout to ensure Angular digest cycle updates, then load draft
    $timeout(function() {
      // Load the draft for the new contact
      const draft = localStorage.getItem($scope.draftKey);
      console.log('Loading draft for contact:', $scope.draftKey, 'Draft:', draft);
      
      if (draft) {
        $scope.messageInput = draft;
        $scope.characterCount = draft.length;
        $scope.showCharacterCount = draft.length >= ($scope.maxMessageLength - 30);
        
        // Update textarea DOM element
        if (textarea) {
          textarea.value = draft;
          textarea.style.height = 'auto';
          textarea.style.height = textarea.scrollHeight + 'px';
        }
      }
    }, 50);
    
    // Load viewed pinned count from localStorage for this conversation
    const storageKey = 'pinnedViewed_' + contact.email;
    const storedCount = localStorage.getItem(storageKey);
    $scope.lastViewedPinnedCount = storedCount ? parseInt(storedCount) : 0;
    $scope.hasUnviewedPinnedMessages = false; // Will be updated when messages load
    
    // Reset unread count when opening conversation
    if (contact.unreadCount > 0) {
      contact.unreadCount = 0;
      contact.hasUnread = false;
      contact.isNewMessage = false;
      
      // Clear from localStorage
      $scope.clearUnreadCount(contact.email || contact.conversation_id, 'contact');
      
      // Update total unread count and page title
      $scope.calculateTotalUnreadCount();
    }

    ChatService.createConversation(contact.email).then(function(conversation) {
      // Store conversation_id in contact for future reference
      contact.conversation_id = conversation.id;
      
      ChatService.setCurrentConversation(conversation);
      
      // Join the conversation room via socket
      SocketService.joinConversation(conversation.id);
      
      // Load messages from database
      return ChatService.loadMessages(conversation.id);
    }).then(function(result) {
      $scope.messages = ChatService.messages;
      $scope.loadingMessages = false;
      
      // Update pinned messages
      $scope.updatePinnedMessages();
      
      // Initialize mosaic background for messages area
      $timeout(function() {
        initMosaicBackground('messagesMosaicBg');
        $scope.scrollToBottom(true);
      }, 100);
    }).catch(function(error) {
      console.error('Failed to create conversation or load messages:', error);
      ToastService.error('Failed to start conversation');
      $scope.loadingMessages = false;
    });
  };

  // Pinned Messages functionality
  $scope.showPinnedMessages = false;
  $scope.showPinnedMessagesPopup = false;
  $scope.pinnedMessages = [];
  $scope.lastPinnedMessage = null;
  $scope.hasUnviewedPinnedMessages = false;
  $scope.lastViewedPinnedCount = 0;

  $scope.togglePinnedMessages = function() {
    $scope.showPinnedMessages = !$scope.showPinnedMessages;
  };

  $scope.togglePinnedMessagesPopup = function() {
    // Close join requests popup if open
    if ($scope.showJoinRequestsPopup) {
      $scope.showJoinRequestsPopup = false;
    }
    
    $scope.showPinnedMessagesPopup = !$scope.showPinnedMessagesPopup;
    
    // Mark pinned messages as viewed when opening the popup
    if ($scope.showPinnedMessagesPopup && $scope.selectedContact) {
      $scope.hasUnviewedPinnedMessages = false;
      $scope.lastViewedPinnedCount = $scope.pinnedMessages.length;
      
      // Save to localStorage (use email for contacts, id for groups)
      const identifier = $scope.selectedContact.isGroup ? $scope.selectedContact.email : $scope.selectedContact.email;
      const storageKey = 'pinnedViewed_' + identifier;
      localStorage.setItem(storageKey, $scope.pinnedMessages.length.toString());
    }
  };

  $scope.updatePinnedMessages = function() {
    $scope.pinnedMessages = $scope.messages.filter(function(msg) {
      return msg.pinned || msg.is_pinned;
    });
    
    // Update last pinned message for the notification banner
    if ($scope.pinnedMessages.length > 0) {
      $scope.lastPinnedMessage = $scope.pinnedMessages[$scope.pinnedMessages.length - 1];
      
      // Check if there are new pinned messages since last view
      // Only show red dot if current count is greater than last viewed count
      if ($scope.pinnedMessages.length > $scope.lastViewedPinnedCount) {
        $scope.hasUnviewedPinnedMessages = true;
      } else {
        $scope.hasUnviewedPinnedMessages = false;
      }
    } else {
      $scope.lastPinnedMessage = null;
      $scope.hasUnviewedPinnedMessages = false;
      
      // Clear localStorage when no pinned messages
      if ($scope.selectedContact) {
        const identifier = $scope.selectedContact.isGroup ? $scope.selectedContact.email : $scope.selectedContact.email;
        const storageKey = 'pinnedViewed_' + identifier;
        localStorage.removeItem(storageKey);
      }
    }
  };

  $scope.scrollToMessage = function(message) {
    const messageId = message.id || message._id;
    const messageElement = document.getElementById('message-' + messageId);
    
    if (messageElement) {
      // Close pinned messages panel
      $scope.showPinnedMessages = false;
      
      // Scroll to message
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Highlight message temporarily
      messageElement.classList.add('message-highlight');
      $timeout(function() {
        messageElement.classList.remove('message-highlight');
      }, 2000);
    }
  };

  $scope.togglePinMessage = function(message) {
    const messageId = message.id || message._id;
    SocketService.togglePinMessage(messageId);
    $scope.hideMessageOptions();
  };

  $scope.sendMessage = function(event) {
    // Prevent sending messages in imported groups
    if ($scope.selectedContact && $scope.selectedContact.isGroup && $scope.isImportedGroup($scope.selectedContact)) {
      console.log('Blocked message sending in imported group:', $scope.selectedContact.name);
      ToastService.error('Cannot send messages in imported groups');
      return;
    }
    
    // Manually sync textarea value with scope before sending
    const textarea = document.querySelector('textarea[ng-model="messageInput"]');
    if (textarea && textarea.value) {
      $scope.messageInput = textarea.value;
    }
    
    // If this was triggered by a keydown event and shift was held, don't send
    if (event && event.shiftKey) {
      return;
    }
    
    if (!$scope.messageInput || !$scope.messageInput.trim()) {
      return;
    }
    
    // Check character limit
    const content = $scope.messageInput.trim();
    if (content.length > $scope.maxMessageLength) {
      $scope.showCharacterLimitModal('message', 'Oops! Message Too Long', 
        `Your message is ${content.length} characters long, but the limit is ${$scope.maxMessageLength} characters. Please shorten your message and try again.`);
      return;
    }
    
    if (!ChatService.currentConversation) {
      return;
    }
    
    if ($scope.sendingMessage) {
      return;
    }

    const replyToId = $scope.replyingTo ? $scope.replyingTo.id : null;
    
    $scope.messageInput = '';
    $scope.replyingTo = null; // Clear reply after sending
    $scope.characterCount = 0; // Reset character count
    $scope.showCharacterCount = false; // Hide character count
    
    // Clear draft after sending
    $scope.clearDraft();
    
    // Clear textarea as well
    if (textarea) {
      textarea.value = '';
    }
    
    $scope.sendingMessage = true;

    // Stop typing indicator
    if ($scope.isTyping) {
      $scope.isTyping = false;
      if ($scope.typingTimeout) {
        $timeout.cancel($scope.typingTimeout);
      }
      console.log('Stopping typing indicator (message sent)');
      SocketService.stopTyping(ChatService.currentConversation.id);
    }

    SocketService.sendTextMessage(ChatService.currentConversation.id, content, replyToId);
    
    // Don't refresh messages immediately to prevent profile picture blinking
    $timeout(function() {
      $scope.sendingMessage = false;
    }, 500);
  };

  $scope.onMessageInput = function() {
    // Manually sync textarea value with scope
    const textarea = document.querySelector('textarea[ng-model="messageInput"]');
    if (textarea && textarea.value !== undefined) {
      $scope.messageInput = textarea.value;
    }
    
    // Update character count
    const currentLength = $scope.messageInput ? $scope.messageInput.length : 0;
    $scope.characterCount = currentLength;
    
    // Show character count when approaching limit (30 characters before limit)
    $scope.showCharacterCount = currentLength >= ($scope.maxMessageLength - 30);
    
    // Save draft
    $scope.saveDraft();
    
    // Detect @ mentions
    $scope.detectMention();
    
    if (ChatService.currentConversation) {
      // Clear existing timeout
      if ($scope.typingTimeout) {
        $timeout.cancel($scope.typingTimeout);
      }
      
      // Only send typing event if not already typing
      if (!$scope.isTyping) {
        $scope.isTyping = true;
        console.log('Starting typing indicator for conversation:', ChatService.currentConversation.id);
        SocketService.startTyping(ChatService.currentConversation.id);
      }
      
      // Set timeout to stop typing after 3 seconds of inactivity
      $scope.typingTimeout = $timeout(function() {
        if ($scope.isTyping) {
          $scope.isTyping = false;
          console.log('Stopping typing indicator (3s inactivity)');
          SocketService.stopTyping(ChatService.currentConversation.id);
        }
      }, 3000);
    }
    
    // Auto-resize textarea while maintaining center alignment
    $timeout(function() {
      const textarea = document.querySelector('textarea[ng-model="messageInput"]');
      if (textarea) {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 120);
        textarea.style.height = newHeight + 'px';
        
        // Ensure the parent container maintains center alignment
        const container = textarea.closest('.flex.items-center');
        if (container && newHeight > 44) {
          container.style.alignItems = 'flex-end';
        } else if (container) {
          container.style.alignItems = 'center';
        }
      }
    }, 0);
  };

  // Mention detection and handling
  $scope.detectMention = function() {
    const textarea = document.querySelector('textarea[ng-model="messageInput"]');
    if (!textarea) return;
    
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = $scope.messageInput.substring(0, cursorPos);
    
    // Find the last @ symbol before cursor
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      // Check if there's a space between @ and cursor (if so, not a mention)
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      
      if (textAfterAt.indexOf(' ') === -1 && textAfterAt.indexOf('\n') === -1) {
        // Valid mention in progress
        $scope.mentionSearchQuery = textAfterAt.toLowerCase();
        $scope.mentionStartPos = lastAtIndex;
        $scope.selectedMentionIndex = -1; // Don't highlight any item initially
        $scope.updateMentionSuggestions();
        $scope.showMentionSuggestions = $scope.mentionSuggestions.length > 0;
        return;
      }
    }
    
    // No valid mention detected
    $scope.showMentionSuggestions = false;
    $scope.mentionSuggestions = [];
    $scope.selectedMentionIndex = -1;
  };

  // Switch mention tab
  $scope.switchMentionTab = function(tab) {
    $scope.mentionActiveTab = tab;
    $scope.selectedMentionIndex = -1;
    $scope.updateMentionSuggestions();
  };

  // Get current mention suggestions based on active tab
  $scope.getCurrentMentionSuggestions = function() {
    if ($scope.mentionActiveTab === 'members') {
      return $scope.memberSuggestions;
    } else if ($scope.mentionActiveTab === 'roles') {
      return $scope.roleSuggestions;
    }
    return [];
  };

  // Check if current conversation is a group (for showing tabs)
  $scope.isGroupConversation = function() {
    return $scope.selectedContact && $scope.selectedContact.isGroup;
  };

  $scope.updateMentionSuggestions = function() {
    // Reset suggestions
    $scope.memberSuggestions = [];
    $scope.roleSuggestions = [];
    
    // Get member suggestions
    $scope.updateMemberSuggestions();
    
    // Get role suggestions (only for groups)
    if ($scope.selectedContact && $scope.selectedContact.isGroup) {
      $scope.updateRoleSuggestions();
    }
    
    // Set the main suggestions based on active tab
    if ($scope.mentionActiveTab === 'members') {
      $scope.mentionSuggestions = $scope.memberSuggestions;
    } else if ($scope.mentionActiveTab === 'roles') {
      $scope.mentionSuggestions = $scope.roleSuggestions;
    }
    
    // Auto-switch to members tab if no roles found and we're on roles tab
    if ($scope.mentionActiveTab === 'roles' && $scope.roleSuggestions.length === 0 && $scope.memberSuggestions.length > 0) {
      $scope.mentionActiveTab = 'members';
      $scope.mentionSuggestions = $scope.memberSuggestions;
    }
    
    // Auto-switch to roles tab if no members found and we're on members tab (and roles exist)
    if ($scope.mentionActiveTab === 'members' && $scope.memberSuggestions.length === 0 && $scope.roleSuggestions.length > 0) {
      $scope.mentionActiveTab = 'roles';
      $scope.mentionSuggestions = $scope.roleSuggestions;
    }
  };

  $scope.updateMemberSuggestions = function() {
    let users = [];
    
    if ($scope.selectedContact && $scope.selectedContact.isGroup) {
      // For groups, suggest group members (including current user)
      if ($scope.selectedContact.participants) {
        $scope.selectedContact.participants.forEach(function(email) {
          // Try to get user info from groupSettingsModal cache first
          let userInfo = null;
          if ($scope.groupSettingsModal && $scope.groupSettingsModal.memberInfo && $scope.groupSettingsModal.memberInfo[email]) {
            userInfo = $scope.groupSettingsModal.memberInfo[email];
          }
          
          // If not found, try to find in contacts
          if (!userInfo) {
            const contact = $scope.contacts.find(c => c.email === email);
            if (contact) {
              userInfo = {
                email: contact.email,
                name: contact.name || contact.username,
                username: contact.username || contact.email.split('@')[0],
                profile_picture: contact.profile_picture
              };
            }
          }
          
          // If it's current user, use current user info
          if (!userInfo && $scope.currentUser && email === $scope.currentUser.email) {
            userInfo = {
              email: $scope.currentUser.email,
              name: $scope.currentUser.name || $scope.currentUser.username,
              username: $scope.currentUser.username || $scope.currentUser.email.split('@')[0],
              profile_picture: $scope.currentUser.profile_picture
            };
          }
          
          // If still not found, create basic info
          if (!userInfo) {
            userInfo = {
              email: email,
              name: email.split('@')[0],
              username: email.split('@')[0],
              profile_picture: null
            };
          }
          
          users.push(userInfo);
        });
      }
    } else if ($scope.selectedContact) {
      // For 1-on-1 chats, suggest both the other person and current user
      const contact = $scope.contacts.find(c => c.email === $scope.selectedContact.email);
      if (contact) {
        users.push({
          email: contact.email,
          name: contact.name || contact.username,
          username: contact.username || contact.email.split('@')[0],
          profile_picture: contact.profile_picture
        });
      }
      
      // Add current user
      if ($scope.currentUser) {
        users.push({
          email: $scope.currentUser.email,
          name: $scope.currentUser.name || $scope.currentUser.username,
          username: $scope.currentUser.username || $scope.currentUser.email.split('@')[0],
          profile_picture: $scope.currentUser.profile_picture
        });
      }
    }
    
    // Filter by search query
    if ($scope.mentionSearchQuery) {
      users = users.filter(function(user) {
        return user.username.toLowerCase().includes($scope.mentionSearchQuery) ||
               user.name.toLowerCase().includes($scope.mentionSearchQuery);
      });
    }
    
    // Limit to 5 suggestions
    $scope.memberSuggestions = users.slice(0, 5);
  };

  $scope.updateRoleSuggestions = function() {
    let roles = [];
    
    // Only for groups
    if ($scope.selectedContact && $scope.selectedContact.isGroup) {
      // Get roles from selected contact (this is where the roles are stored)
      let groupRoles = [];
      if ($scope.selectedContact.roles) {
        groupRoles = $scope.selectedContact.roles;
      } else if ($scope.groupSettingsModal && $scope.groupSettingsModal.roles) {
        // Fallback to group settings modal if available
        groupRoles = $scope.groupSettingsModal.roles;
      }
      
      // Filter roles by search query
      if ($scope.mentionSearchQuery) {
        roles = groupRoles.filter(function(role) {
          return role.name.toLowerCase().includes($scope.mentionSearchQuery);
        });
      } else {
        roles = groupRoles.slice();
      }
      
      // Transform roles to match suggestion format
      roles = roles.map(function(role) {
        return {
          type: 'role',
          name: role.name,
          color: role.color,
          username: role.name, // For mention insertion
          displayName: role.name
        };
      });
    }
    
    // Limit to 5 suggestions
    $scope.roleSuggestions = roles.slice(0, 5);
  };

  $scope.selectMention = function(item) {
    if (!item || !item.username) {
      return;
    }

    const textarea = document.querySelector('textarea[ng-model="messageInput"]');
    if (!textarea) {
      return;
    }
    
    // Determine mention prefix based on type
    let mentionText = '';
    if (item.type === 'role') {
      mentionText = '@' + item.username; // For roles, use @rolename
    } else {
      mentionText = '@' + item.username; // For users, use @username
    }
    
    // Get the current cursor position
    const currentCursorPos = textarea.selectionStart;
    
    // Replace the @search with the mention
    const beforeMention = $scope.messageInput.substring(0, $scope.mentionStartPos);
    const afterCursor = $scope.messageInput.substring(currentCursorPos);
    
    // Create the new message with the mention
    const newMessage = beforeMention + mentionText + ' ' + afterCursor;
    
    // Update the scope variable
    $scope.messageInput = newMessage;
    
    // Update character count
    $scope.characterCount = $scope.messageInput.length;
    $scope.showCharacterCount = $scope.characterCount >= ($scope.maxMessageLength - 30);
    
    // Hide suggestions
    $scope.showMentionSuggestions = false;
    $scope.mentionSuggestions = [];
    $scope.memberSuggestions = [];
    $scope.roleSuggestions = [];
    $scope.selectedMentionIndex = -1;
    
    // Force Angular to update the view
    $scope.$applyAsync();
    
    // Set cursor position after the mention
    $timeout(function() {
      const newCursorPos = beforeMention.length + mentionText.length + 1; // +1 for space
      
      // Make sure the textarea value is updated
      textarea.value = $scope.messageInput;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      
      // Trigger input event to ensure Angular knows about the change
      const inputEvent = new Event('input', { bubbles: true });
      textarea.dispatchEvent(inputEvent);
      
      // Auto-resize the textarea
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }, 10);
  };

  $scope.closeMentionSuggestions = function() {
    $scope.showMentionSuggestions = false;
    $scope.mentionSuggestions = [];
    $scope.memberSuggestions = [];
    $scope.roleSuggestions = [];
    $scope.selectedMentionIndex = -1;
    $scope.mentionActiveTab = 'members'; // Reset to members tab
  };

  // Parse mentions in message content for display
  $scope.parseMentions = function(content) {
    if (!content) return content;
    
    // Find all @username patterns (word characters only)
    const mentionRegex = /@(\w+)/g;
    let result = content;
    
    result = result.replace(mentionRegex, function(match, username) {
      // Check if this is a role mention first (for groups)
      if ($scope.selectedContact && $scope.selectedContact.isGroup && $scope.selectedContact.roles) {
        const role = $scope.selectedContact.roles.find(function(r) {
          return r.name === username;
        });
        
        if (role) {
          // This is a role mention - display in role color
          return '<span class="mention role-mention" style="color: ' + role.color + '; background-color: ' + role.color + '20; border-color: ' + role.color + ';">@' + username + '</span>';
        }
      }
      
      // Check if this is a valid user mention
      let isValid = false;
      
      if ($scope.selectedContact && $scope.selectedContact.isGroup) {
        // For groups, check if username exists in participants
        if ($scope.selectedContact.participants) {
          isValid = $scope.selectedContact.participants.some(function(email) {
            // Check in contacts
            const contact = $scope.contacts.find(function(c) {
              return c.email === email;
            });
            if (contact && contact.username === username) {
              return true;
            }
            // Check if it's current user
            if ($scope.currentUser && email === $scope.currentUser.email && $scope.currentUser.username === username) {
              return true;
            }
            return false;
          });
        }
      } else if ($scope.selectedContact) {
        // For 1-on-1, check if it's the other person or current user
        isValid = $scope.selectedContact.username === username || 
                  ($scope.currentUser && $scope.currentUser.username === username);
      }
      
      // Only render as mention if valid
      if (isValid) {
        return '<span class="mention user-mention">@' + username + '</span>';
      }
      
      return match;
    });
    
    return result;
  };

  // Check if message mentions current user (and validate it's a real mention)
  $scope.isMentioned = function(message) {
    if (!message.content || !$scope.currentUser || !$scope.currentUser.username) return false;
    
    // Check for @username pattern (user mention)
    const userMentionPattern = new RegExp('@' + $scope.currentUser.username + '(?:\\s|$)', 'i');
    if (userMentionPattern.test(message.content)) {
      // Validate that this is a real mention (user is in the conversation)
      if ($scope.selectedContact && $scope.selectedContact.isGroup) {
        // For groups, check if current user is in participants
        if ($scope.selectedContact.participants && $scope.selectedContact.participants.includes($scope.currentUser.email)) {
          return true;
        }
      } else if ($scope.selectedContact) {
        // For 1-on-1, always valid if mentioned
        return true;
      }
    }
    
    // Check for role mentions (only in groups)
    if ($scope.selectedContact && $scope.selectedContact.isGroup && $scope.selectedContact.roles && $scope.selectedContact.role_assignments) {
      // Get current user's roles - handle both string and array formats
      const userRoleAssignment = $scope.selectedContact.role_assignments[$scope.currentUser.email];
      let userRoles = [];
      
      if (userRoleAssignment) {
        if (Array.isArray(userRoleAssignment)) {
          userRoles = userRoleAssignment;
        } else if (typeof userRoleAssignment === 'string') {
          userRoles = [userRoleAssignment];
        }
      }
      
      // Check if any of the user's roles are mentioned
      for (let i = 0; i < userRoles.length; i++) {
        const roleName = userRoles[i];
        const roleMentionPattern = new RegExp('@' + roleName + '(?:\\s|$)', 'i');
        if (roleMentionPattern.test(message.content)) {
          // Verify this role actually exists in the group
          const roleExists = $scope.selectedContact.roles.some(function(role) {
            return role.name === roleName;
          });
          if (roleExists) {
            return true;
          }
        }
      }
    }
    
    return false;
  };

  // Handle keyboard events for message input
  $scope.onMessageKeyDown = function(event) {
    // Handle mention suggestions navigation
    if ($scope.showMentionSuggestions && $scope.mentionSuggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        // Select first suggestion if none selected
        if ($scope.selectedMentionIndex === -1) {
          $scope.selectedMentionIndex = 0;
        } else {
          $scope.selectedMentionIndex = Math.min($scope.selectedMentionIndex + 1, $scope.mentionSuggestions.length - 1);
        }
        return;
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if ($scope.selectedMentionIndex > 0) {
          $scope.selectedMentionIndex--;
        } else if ($scope.selectedMentionIndex === 0) {
          $scope.selectedMentionIndex = -1; // Deselect all
        }
        return;
      } else if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        // Select highlighted mention
        if ($scope.selectedMentionIndex >= 0 && $scope.selectedMentionIndex < $scope.mentionSuggestions.length) {
          $scope.selectMention($scope.mentionSuggestions[$scope.selectedMentionIndex]);
        }
        return;
      } else if (event.key === 'Escape') {
        event.preventDefault();
        $scope.closeMentionSuggestions();
        return;
      }
    }
    
    if (event.key === 'Enter' && !event.shiftKey) {
      // Enter without shift: Send message or files
      event.preventDefault();
      
      // If file previews exist, send the files
      if ($scope.filePreviews.length > 0) {
        $scope.sendStagedFiles();
      } else {
        $scope.sendMessage();
      }
    }
    // For Shift+Enter or other keys, allow default behavior
  };

  // File attachment functions with safer approach
  $scope.toggleAttachmentMenu = function() {
    $scope.showAttachmentMenu = !$scope.showAttachmentMenu;
  };

  $scope.closeAttachmentMenu = function() {
    $scope.showAttachmentMenu = false;
  };

  // Simplified file selection without digest conflicts - Multiple files support
  $scope.selectImage = function() {
    $scope.closeAttachmentMenu();
    
    if (!ChatService.currentConversation) {
      ToastService.error('Please select a conversation first');
      return;
    }

    if ($scope.uploadingFile) {
      ToastService.error('Please wait for the current upload to complete');
      return;
    }

    // Create file input directly without promises to avoid digest issues
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,image/svg+xml,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg';
    input.multiple = true; // Allow multiple file selection
    input.style.display = 'none';
    
    input.onchange = function(event) {
      const files = Array.from(event.target.files);
      if (files.length > 0) {
        // Use $timeout to safely update scope
        $timeout(function() {
          files.forEach(function(file) {
            // Validate file size (5MB limit for images)
            if (!$scope.validateFileSize(file, 5, 'image')) {
              return;
            }

            // Stage the file for preview instead of sending immediately
            $scope.stageFileForPreview(file, 'image');
          });
        });
      }
      
      // Cleanup
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
    };
    
    document.body.appendChild(input);
    input.click();
  };

  $scope.selectFile = function() {
    $scope.closeAttachmentMenu();
    
    if (!ChatService.currentConversation) {
      ToastService.error('Please select a conversation first');
      return;
    }

    if ($scope.uploadingFile) {
      ToastService.error('Please wait for the current upload to complete');
      return;
    }

    // Create file input directly without promises to avoid digest issues
    const input = document.createElement('input');
    input.type = 'file';
    // Accept all files EXCEPT images
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.tar,.gz,.mp3,.mp4,.avi,.mov,.wmv,.flv,.webm,.mkv,.wav,.ogg,.aac,.m4a,.flac';
    input.multiple = true; // Allow multiple file selection
    input.style.display = 'none';
    
    input.onchange = function(event) {
      const files = Array.from(event.target.files);
      if (files.length > 0) {
        // Use $timeout to safely update scope
        $timeout(function() {
          files.forEach(function(file) {
            // Check if it's a video file and apply appropriate size limit
            if ($scope.isVideoFile(file.name)) {
              // Validate file size (35MB limit for videos)
              if (!$scope.validateFileSize(file, 35, 'video')) {
                return;
              }
            } else {
              // Validate file size (10MB limit for other files)
              if (!$scope.validateFileSize(file, 10, 'file')) {
                return;
              }
            }

            // Stage the file for preview instead of sending immediately
            $scope.stageFileForPreview(file, 'file');
          });
        });
      }
      
      // Cleanup
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
    };
    
    document.body.appendChild(input);
    input.click();
  };

  // Stage file for preview - Multiple files support
  $scope.stageFileForPreview = function(file, fileType) {
    const preview = {
      file: file,
      fileName: file.name,
      fileType: fileType,
      fileSize: file.size,
      previewUrl: null,
      uploadProgress: 0,
      uploading: false,
      uploaded: false,
      error: null
    };
    
    // Add to array
    $scope.filePreviews.push(preview);
    
    // Create preview URL for images
    if (fileType === 'image') {
      const reader = new FileReader();
      reader.onload = function(e) {
        $timeout(function() {
          preview.previewUrl = e.target.result;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove specific file preview
  $scope.removeFilePreview = function(index) {
    if (index >= 0 && index < $scope.filePreviews.length) {
      const preview = $scope.filePreviews[index];
      // Abort upload if in progress
      if (preview.uploadPromise && preview.uploadPromise.abort) {
        preview.uploadPromise.abort();
      }
      $scope.filePreviews.splice(index, 1);
    }
  };

  // Send all staged files using HTTP upload
  $scope.sendStagedFiles = function() {
    if ($scope.filePreviews.length === 0) {
      return;
    }
    
    if (!$scope.selectedContact) {
      ToastService.error('No conversation selected');
      return;
    }

    const conversationId = $scope.selectedContact.conversation_id || $scope.selectedContact.email;
    const caption = $scope.messageInput.trim() || null;
    const replyTo = $scope.replyingTo ? $scope.replyingTo.id : null;
    
    // Clear message input
    $scope.messageInput = '';
    $scope.replyingTo = null;
    
    // Upload each file
    $scope.filePreviews.forEach(function(preview, index) {
      preview.uploading = true;
      preview.uploadProgress = 0;
      
      // Only add caption to first file
      const fileCaption = (index === 0) ? caption : null;
      
      // Upload with progress tracking
      preview.uploadPromise = FileService.uploadFile(
        preview.file,
        conversationId,
        fileCaption,
        replyTo,
        function(percent, loaded, total) {
          // Progress callback
          $timeout(function() {
            preview.uploadProgress = Math.round(percent);
          });
        }
      );
      
      preview.uploadPromise.then(function(message) {
        $timeout(function() {
          preview.uploading = false;
          preview.uploaded = true;
          preview.uploadProgress = 100;
          
          console.log('✅ File uploaded successfully:', preview.fileName);
          
          // Add message to chat immediately
          if (message) {
            $scope.messages.push(message);
            $scope.scrollToBottomUniversal(true);
          }
          
          // Remove preview after short delay
          $timeout(function() {
            const idx = $scope.filePreviews.indexOf(preview);
            if (idx > -1) {
              $scope.filePreviews.splice(idx, 1);
            }
          }, 1000);
        });
      }).catch(function(error) {
        $timeout(function() {
          preview.uploading = false;
          preview.error = error;
          preview.uploadProgress = 0;
          
          console.error('❌ File upload failed:', preview.fileName, error);
          ToastService.error(`Failed to upload ${preview.fileName}: ${error}`);
        });
      });
    });
  };
  // Typing indicator helpers
  $scope.isAnyoneTyping = function() {
    return Object.keys($scope.typingUsers).length > 0;
  };

  $scope.getTypingUserName = function() {
    const typingUserEmails = Object.keys($scope.typingUsers);
    if (typingUserEmails.length === 0) return '';
    
    // Handle multiple users typing
    if (typingUserEmails.length >= 3) {
      return 'Several members are';
    }
    
    if (typingUserEmails.length === 2) {
      const names = typingUserEmails.map(function(email) {
        // Try to find in contacts
        const contact = $scope.contacts.find(function(c) {
          return c.email === email;
        });
        if (contact) {
          return contact.name || contact.username;
        }
        // Fallback to email username part
        return email.split('@')[0];
      });
      return names[0] + ' and ' + names[1] + ' are';
    }
    
    // Single user typing
    const typingEmail = typingUserEmails[0];
    
    // If it's the selected contact, return their name
    if ($scope.selectedContact && $scope.selectedContact.email === typingEmail) {
      return ($scope.selectedContact.name || $scope.selectedContact.username) + ' is';
    }
    
    // Otherwise, try to find the contact in the contacts list
    const contact = $scope.contacts.find(function(c) {
      return c.email === typingEmail;
    });
    
    if (contact) {
      return (contact.name || contact.username) + ' is';
    }
    
    // Fallback to email username part
    return typingEmail.split('@')[0] + ' is';
  };

  // Right-click handler for messages
  $scope.onMessageRightClick = function(message, $event) {
    // Don't allow right-click on deleted messages
    if (message.deleted || message.is_deleted) {
      return;
    }
    $event.preventDefault();
    $event.stopPropagation();
    $scope.showMessageOptions(message, $event);
  };

  // Message options menu
  $scope.messageOptionsMenu = {
    show: false,
    x: 0,
    y: 0,
    message: null
  };

  $scope.showMessageOptions = function(message, $event) {
    // Don't show message options for imported groups
    if ($scope.selectedContact && $scope.selectedContact.isGroup && $scope.isImportedGroup($scope.selectedContact)) {
      return;
    }
    
    $event.stopPropagation();
    $event.preventDefault();
    
    console.log('Showing message options for:', message);
    console.log('Event position:', $event.clientX, $event.clientY);
    
    // Calculate menu position to keep it on screen
    const menuWidth = 200; // Approximate menu width
    const menuHeight = 350; // Approximate menu height
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let x = $event.clientX;
    let y = $event.clientY;
    
    // Adjust X position if menu would go off right edge
    if (x + menuWidth > windowWidth) {
      x = windowWidth - menuWidth - 10;
    }
    
    // Adjust Y position if menu would go off bottom edge
    if (y + menuHeight > windowHeight) {
      y = windowHeight - menuHeight - 10;
    }
    
    // Ensure menu doesn't go off left edge
    if (x < 10) {
      x = 10;
    }
    
    // Ensure menu doesn't go off top edge
    if (y < 10) {
      y = 10;
    }
    
    $scope.messageOptionsMenu.show = true;
    $scope.messageOptionsMenu.x = x;
    $scope.messageOptionsMenu.y = y;
    $scope.messageOptionsMenu.message = message;
    
    console.log('Menu state:', $scope.messageOptionsMenu);
  };

  $scope.hideMessageOptions = function() {
    $scope.messageOptionsMenu.show = false;
  };

  // Simple click outside handler for message options menu
  angular.element(document).on('click', function(event) {
    const menu = document.querySelector('.message-options-menu');
    const target = event.target;
    
    // If menu exists and click is outside menu
    if (menu && !menu.contains(target) && $scope.messageOptionsMenu.show) {
      $scope.$apply(function() {
        $scope.hideMessageOptions();
      });
    }

    // Click outside handler for pinned messages popup
    const pinnedPopup = document.querySelector('.pinned-messages-popup');
    const pinnedButton = event.target.closest('[title="Pinned Messages"]');
    
    // If popup exists, click is outside popup, and not on the button that toggles it
    if (pinnedPopup && !pinnedPopup.contains(target) && !pinnedButton && $scope.showPinnedMessagesPopup) {
      $scope.$apply(function() {
        $scope.showPinnedMessagesPopup = false;
      });
    }
  });

  $scope.editMessage = function(message) {
    $scope.hideMessageOptions();
    
    if (!message.content || message.deleted) {
      ToastService.error('Cannot edit this message');
      return;
    }
    
    // Enter edit mode
    message.isEditing = true;
    message.editContent = message.content;
    
    // Focus on the textarea
    $timeout(function() {
      const textarea = document.querySelector('.edit-message-input');
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }, 100);
  };

  $scope.onEditKeyDown = function(event, message) {
    if (event.key === 'Escape') {
      // Cancel edit
      message.isEditing = false;
      message.editContent = null;
      event.preventDefault();
    } else if (event.key === 'Enter' && !event.shiftKey) {
      // Save edit
      event.preventDefault();
      
      const newContent = message.editContent.trim();
      if (!newContent) {
        ToastService.error('Message cannot be empty');
        return;
      }
      
      if (newContent === message.content) {
        // No changes
        message.isEditing = false;
        message.editContent = null;
        return;
      }
      
      SocketService.editMessage(message.id || message._id, newContent);
      message.isEditing = false;
      message.editContent = null;
      
      // Refetch messages after edit to ensure consistency
      // track by in ng-repeat prevents flickering
      $timeout(function() {
        if (ChatService.currentConversation) {
          ChatService.loadMessages(ChatService.currentConversation.id).then(function() {
            $scope.messages = ChatService.messages;
            ToastService.success('Message edited');
            // Update contact's last message
            if ($scope.selectedContact) {
              $scope.fetchLastMessage($scope.selectedContact);
            }
          });
        }
      }, 300);
    }
  };

  // Show delete message confirmation modal
  $scope.showDeleteMessageConfirmation = function(message) {
    $scope.hideMessageOptions();
    $scope.deleteConfirmation = {
      show: true,
      message: message
    };
  };
  
  // Cancel delete message
  $scope.cancelDeleteMessage = function() {
    $scope.deleteConfirmation = {
      show: false,
      message: null
    };
  };
  
  // Confirm delete message
  // Confirm delete message
  $scope.confirmDeleteMessage = function() {
    const message = $scope.deleteConfirmation.message;
    $scope.cancelDeleteMessage();
    
    if (message) {
      SocketService.deleteMessage(message.id || message._id);
      
      // Refetch messages after delete to ensure consistency
      // track by in ng-repeat prevents flickering
      $timeout(function() {
        if (ChatService.currentConversation) {
          ChatService.loadMessages(ChatService.currentConversation.id).then(function() {
            $scope.messages = ChatService.messages;
            ToastService.success('Message deleted');
            // Update contact's last message
            if ($scope.selectedContact) {
              $scope.fetchLastMessage($scope.selectedContact);
            }
          });
        }
      }, 300);
    }
  };
  
  // Legacy function for compatibility
  $scope.deleteMessage = function(message) {
    $scope.showDeleteMessageConfirmation(message);
  };

  // Character limit and file size modal functions
  $scope.showCharacterLimitModal = function(type, title, message) {
    $scope.characterLimitModal = {
      show: true,
      type: type,
      title: title,
      message: message
    };
  };

  $scope.hideCharacterLimitModal = function() {
    $scope.characterLimitModal.show = false;
  };

  // File size validation with custom modal
  $scope.validateFileSize = function(file, maxSizeMB, fileType) {
    if (!file) return false;
    
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const actualSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      let fileTypeText = 'file';
      
      if (fileType === 'image') {
        fileTypeText = 'image';
      } else if (fileType === 'video') {
        fileTypeText = 'video';
      } else {
        fileTypeText = 'file';
      }
      
      $scope.showCharacterLimitModal(
        fileType,
        `Oops! ${fileTypeText.charAt(0).toUpperCase() + fileTypeText.slice(1)} Too Large`,
        `Your ${fileTypeText} "${file.name}" is ${actualSizeMB}MB, but the limit is ${maxSizeMB}MB. Please choose a smaller ${fileTypeText} and try again.`
      );
      return false;
    }
    return true;
  };

  // Draft storage functions
  $scope.saveDraft = function() {
    if (!$scope.draftKey || !$scope.messageInput || $scope.messageInput.trim().length === 0) {
      // Clear draft if message is empty
      if ($scope.draftKey) {
        localStorage.removeItem($scope.draftKey);
      }
      return;
    }
    
    try {
      localStorage.setItem($scope.draftKey, $scope.messageInput);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  };

  $scope.loadDraft = function() {
    if (!$scope.draftKey) return;
    
    try {
      const draft = localStorage.getItem($scope.draftKey);
      if (draft) {
        $scope.messageInput = draft;
        $scope.characterCount = draft.length;
        $scope.showCharacterCount = draft.length >= ($scope.maxMessageLength - 30);
        
        // Force Angular to update the view
        if (!$scope.$$phase) {
          $scope.$apply();
        }
      } else {
        // No draft found, ensure input is empty
        $scope.messageInput = '';
        $scope.characterCount = 0;
        $scope.showCharacterCount = false;
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  };

  $scope.clearDraft = function() {
    if (!$scope.draftKey) return;
    
    try {
      localStorage.removeItem($scope.draftKey);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  };

  $scope.getDraftKey = function(contact) {
    if (!contact) return null;
    
    // Use different keys for groups vs individual contacts
    if (contact.isGroup) {
      // For groups, use id if email is not set (for group cards), otherwise use email (for selected contact)
      const groupId = contact.email || contact.id;
      return `draft_group_${groupId}`;
    } else {
      return `draft_contact_${contact.email}`;
    }
  };
  
  // Get draft text for a contact (for display on contact card)
  $scope.getDraftText = function(contact) {
    if (!contact) return null;
    
    const draftKey = $scope.getDraftKey(contact);
    if (!draftKey) return null;
    
    try {
      const draft = localStorage.getItem(draftKey);
      return draft && draft.trim().length > 0 ? draft : null;
    } catch (error) {
      console.error('Failed to get draft:', error);
      return null;
    }
  };
  
  // Check if contact has a draft
  $scope.hasDraft = function(contact) {
    if (!contact) return false;
    
    // Don't show draft if this is the currently selected conversation
    // (user is actively in this chat)
    if ($scope.selectedContact) {
      // For groups, compare by id
      if (contact.isGroup && $scope.selectedContact.isGroup) {
        const contactId = contact.email || contact.id;
        const selectedId = $scope.selectedContact.email || $scope.selectedContact.id;
        if (contactId === selectedId) {
          return false;
        }
      }
      // For regular contacts, compare by email
      else if (!contact.isGroup && !$scope.selectedContact.isGroup) {
        if (contact.email === $scope.selectedContact.email) {
          return false;
        }
      }
    }
    
    return $scope.getDraftText(contact) !== null;
  };

  $scope.copyMessageText = function(message) {
    $scope.hideMessageOptions();
    
    if (!message.content) {
      ToastService.error('No text to copy');
      return;
    }
    
    // Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(message.content).then(function() {
        ToastService.success('Text copied to clipboard');
      }).catch(function(error) {
        console.error('Failed to copy text:', error);
        ToastService.error('Failed to copy text');
      });
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = message.content;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        ToastService.success('Text copied to clipboard');
      } catch (error) {
        console.error('Failed to copy text:', error);
        ToastService.error('Failed to copy text');
      }
      document.body.removeChild(textarea);
    }
  };

  $scope.copyMessageId = function(message) {
    $scope.hideMessageOptions();
    
    const messageId = message.id || message._id;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(messageId).then(function() {
        ToastService.success('Message ID copied to clipboard');
      }).catch(function(error) {
        console.error('Failed to copy message ID:', error);
        ToastService.error('Failed to copy message ID');
      });
    } else {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = messageId;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        ToastService.success('Message ID copied to clipboard');
      } catch (error) {
        console.error('Failed to copy message ID:', error);
        ToastService.error('Failed to copy message ID');
      }
      document.body.removeChild(textarea);
    }
  };

  $scope.pinMessage = function(message) {
    $scope.hideMessageOptions();
    ToastService.info('Pin functionality will be implemented soon');
    // TODO: Implement pin functionality
  };

  // Forward Message Modal
  $scope.forwardModal = {
    show: false,
    message: null,
    searchQuery: '',
    activeTab: 'chats', // 'chats' or 'groups'
    filteredChats: [],
    filteredGroups: [],
    isSearching: false
  };

  $scope.forwardMessage = function(message) {
    console.log('📤 Opening forward modal for message:', message);
    console.log('📊 Current state:', {
      contactsCount: ($scope.contacts || []).length,
      groupsCount: ($scope.groups || []).length,
      selectedContact: $scope.selectedContact ? $scope.selectedContact.name : 'none'
    });
    
    $scope.hideMessageOptions();
    
    // Store the message to forward
    $scope.forwardModal = {
      show: true,
      message: message,
      searchQuery: '',
      activeTab: 'chats',
      filteredChats: [],
      filteredGroups: [],
      isSearching: false
    };
    
    // Initialize with current contacts and groups
    $scope.updateForwardLists();
  };

  $scope.closeForwardModal = function() {
    $scope.forwardModal = {
      show: false,
      message: null,
      searchQuery: '',
      activeTab: 'chats',
      filteredChats: [],
      filteredGroups: [],
      isSearching: false
    };
  };

  $scope.setForwardTab = function(tab) {
    $scope.forwardModal.activeTab = tab;
    $scope.updateForwardLists();
  };

  $scope.updateForwardLists = function() {
    const query = $scope.forwardModal.searchQuery.toLowerCase();
    
    // Ensure contacts and groups arrays exist
    const contacts = $scope.contacts || [];
    const groups = $scope.groups || [];
    
    console.log('🔍 Updating forward lists:', {
      contactsCount: contacts.length,
      groupsCount: groups.length,
      query: query
    });
    
    // Filter contacts (exclude current selected contact)
    $scope.forwardModal.filteredChats = contacts.filter(function(contact) {
      if ($scope.selectedContact && !$scope.selectedContact.isGroup && 
          contact.email === $scope.selectedContact.email) {
        return false; // Don't show current contact
      }
      
      if (!query) return true;
      
      const name = (contact.name || '').toLowerCase();
      const username = (contact.username || '').toLowerCase();
      return name.includes(query) || username.includes(query);
    });
    
    // Filter groups (exclude current selected group)
    $scope.forwardModal.filteredGroups = groups.filter(function(group) {
      if ($scope.selectedContact && $scope.selectedContact.isGroup && 
          group.conversation_id === $scope.selectedContact.conversation_id) {
        return false; // Don't show current group
      }
      
      if (!query) return true;
      
      const name = (group.name || '').toLowerCase();
      return name.includes(query);
    });
    
    console.log('📊 Filtered results:', {
      filteredChats: $scope.forwardModal.filteredChats.length,
      filteredGroups: $scope.forwardModal.filteredGroups.length
    });
  };

  $scope.onForwardSearchChange = function() {
    $scope.updateForwardLists();
  };

  $scope.forwardToContact = function(contact) {
    console.log('📤 Forwarding message to contact:', contact.name);
    $scope.forwardMessageToTarget(contact, false);
  };

  $scope.forwardToGroup = function(group) {
    console.log('📤 Forwarding message to group:', group.name);
    $scope.forwardMessageToTarget(group, true);
  };

  $scope.forwardMessageToTarget = function(target, isGroup) {
    const message = $scope.forwardModal.message;
    if (!message || !target) return;
    
    console.log('📤 Forwarding message:', {
      messageId: message.id,
      content: message.content,
      targetName: target.name,
      isGroup: isGroup
    });
    
    // Close the forward modal
    $scope.closeForwardModal();
    
    // Switch to the target conversation
    if (isGroup) {
      $scope.selectGroupMobile(target);
    } else {
      $scope.selectContactMobile(target);
    }
    
    // Wait a moment for the conversation to load, then send the forwarded message
    $timeout(function() {
      $scope.sendForwardedMessage(message);
    }, 500);
  };

  $scope.sendForwardedMessage = function(originalMessage) {
    if (!$scope.selectedContact) {
      console.error('❌ No conversation selected for forwarding');
      return;
    }
    
    // Create forwarded message content
    let forwardedContent = '';
    
    if (originalMessage.content) {
      // Text message - just the original content
      forwardedContent = originalMessage.content;
    } else if (originalMessage.file_url) {
      // File message - forward as text with file info
      const fileName = originalMessage.file_name || 'file';
      const fileSize = originalMessage.file_size ? ` (${$scope.formatFileSize(originalMessage.file_size)})` : '';
      forwardedContent = `📎 ${fileName}${fileSize}\n🔗 ${originalMessage.file_url}`;
    } else {
      forwardedContent = 'Message';
    }
    
    console.log('📤 Sending forwarded message:', forwardedContent);
    
    // Use the existing sendMessage function
    const tempMessageInput = $scope.messageInput;
    $scope.messageInput = forwardedContent;
    
    // Send the message
    $scope.sendMessage();
    
    console.log('✅ Forwarded message sent successfully');
    ToastService.success('Message forwarded successfully');
    
    // Restore original message input
    $scope.messageInput = tempMessageInput;
  };

  // Helper function to format file size
  $scope.formatFileSize = function(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  $scope.togglePinMessage = function(message) {
    const messageId = message.id || message._id;
    SocketService.togglePinMessage(messageId);
    $scope.hideMessageOptions();
  };

  $scope.logout = function() {
    SocketService.disconnect();
    AuthService.logout();
  };

  $scope.toggleProfilePopup = function() {
    $scope.showProfilePopup = !$scope.showProfilePopup;
  };

  $scope.closeProfilePopup = function() {
    $scope.showProfilePopup = false;
    $scope.editingProfile = false;
    $scope.resetEditForm();
  };

  $scope.startEditProfile = function() {
    $scope.editingProfile = true;
    $scope.editForm.name = $scope.currentUser.name || '';
    $scope.editForm.username = $scope.currentUser.username || '';
    $scope.editForm.profile_picture = null;
    $scope.editForm.profilePicturePreview = null;
    $scope.usernameAvailable = null;
  };

  $scope.triggerProfilePictureUpload = function() {
    const fileInput = document.getElementById('editProfilePictureInput');
    if (fileInput) {
      fileInput.click();
    }
  };

  // User Profile Popup (Discord-style)
  $scope.userProfilePopup = {
    show: false,
    user: null,
    showMenu: false,
    x: 0,
    y: 0,
    isCurrentUser: false
  };

  $scope.showUserProfilePopup = function(message, event) {
    event.stopPropagation();
    
    console.log('📋 Opening user profile popup for message:', message);
    
    // Get user info from message
    let userEmail, userName, userAvatar;
    
    // Messages have sender (email), sender_name, and sender_avatar
    if (message.sender) {
      userEmail = message.sender;
      userName = message.sender_name || message.sender;
      userAvatar = message.sender_avatar;
    } else {
      console.error('❌ Cannot determine user from message:', message);
      return;
    }
    
    // Check if this is the current user
    const isCurrentUser = userEmail === $scope.currentUser.email;
    
    console.log('👤 User info extracted:', { userEmail, userName, userAvatar, isCurrentUser });
    
    // Calculate popup position near the clicked element
    const rect = event.target.getBoundingClientRect();
    const popupWidth = 300;
    const popupHeight = 250; // Approximate height
    const padding = 10;
    
    // Position to the right of the clicked name, or left if not enough space
    let x = rect.right + padding;
    let y = rect.top;
    
    // Check if popup would go off-screen to the right
    if (x + popupWidth > window.innerWidth) {
      x = rect.left - popupWidth - padding;
    }
    
    // Check if popup would go off-screen at the bottom
    if (y + popupHeight > window.innerHeight) {
      y = window.innerHeight - popupHeight - padding;
    }
    
    // Ensure popup doesn't go off-screen at the top
    if (y < padding) {
      y = padding;
    }
    
    $scope.userProfilePopup.x = x;
    $scope.userProfilePopup.y = y;
    $scope.userProfilePopup.isCurrentUser = isCurrentUser;
    
    // If current user, use their info directly
    if (isCurrentUser) {
      $scope.userProfilePopup.user = {
        email: $scope.currentUser.email,
        name: $scope.currentUser.name,
        username: $scope.currentUser.username,
        profile_picture: $scope.currentUser.profile_picture,
        online: true,
        idle: false,
        last_seen: null
      };
      
      $scope.userProfilePopup.show = true;
      $scope.userProfilePopup.showMenu = false;
      
      console.log('✅ User profile popup opened for current user');
      $scope.$applyAsync();
      return;
    }
    
    // Find user in contacts to get presence status
    const contact = $scope.contacts.find(c => c.email === userEmail);
    
    // Fetch full user info
    UserService.getUserInfo(userEmail).then(function(userInfo) {
      console.log('✅ Fetched user info:', userInfo);
      
      $scope.userProfilePopup.user = {
        email: userEmail,
        name: userInfo.name || userName,
        username: userInfo.username || userEmail.split('@')[0],
        profile_picture: userInfo.profile_picture || userAvatar,
        online: contact ? contact.online : false,
        idle: contact ? contact.idle : false,
        last_seen: contact ? contact.last_seen : null
      };
      
      $scope.userProfilePopup.show = true;
      $scope.userProfilePopup.showMenu = false;
      
      console.log('✅ User profile popup opened:', $scope.userProfilePopup.user);
      $scope.$applyAsync();
    }).catch(function(error) {
      console.error('Failed to fetch user info:', error);
      
      // Show with basic info
      $scope.userProfilePopup.user = {
        email: userEmail,
        name: userName,
        username: userEmail.split('@')[0],
        profile_picture: userAvatar,
        online: contact ? contact.online : false,
        idle: contact ? contact.idle : false,
        last_seen: contact ? contact.last_seen : null
      };
      
      $scope.userProfilePopup.show = true;
      $scope.userProfilePopup.showMenu = false;
      
      console.log('✅ User profile popup opened with basic info:', $scope.userProfilePopup.user);
      $scope.$applyAsync();
    });
  };

  $scope.closeUserProfilePopup = function() {
    $scope.userProfilePopup.show = false;
    $scope.userProfilePopup.showMenu = false;
    $scope.userProfilePopup.user = null;
  };

  $scope.toggleUserProfileMenu = function(event) {
    event.stopPropagation();
    $scope.userProfilePopup.showMenu = !$scope.userProfilePopup.showMenu;
  };

  $scope.goToUserChat = function() {
    if (!$scope.userProfilePopup.user) return;
    
    const userEmail = $scope.userProfilePopup.user.email;
    
    // Find contact
    let contact = $scope.contacts.find(c => c.email === userEmail);
    
    if (!contact) {
      // Check archived contacts
      contact = $scope.archivedContacts.find(c => c.email === userEmail);
    }
    
    if (contact) {
      // Close popup and select contact
      $scope.closeUserProfilePopup();
      $scope.selectContactMobile(contact);
      ToastService.success('Opened chat with ' + contact.name);
    } else {
      ToastService.error('User not in contacts');
    }
  };

  $scope.blockUserFromPopup = function() {
    if (!$scope.userProfilePopup.user) return;
    
    const userEmail = $scope.userProfilePopup.user.email;
    const userName = $scope.userProfilePopup.user.name || $scope.userProfilePopup.user.username;
    
    // Find contact
    const contact = $scope.contacts.find(c => c.email === userEmail);
    
    if (contact) {
      $scope.closeUserProfilePopup();
      $scope.blockContact(contact);
    } else {
      ToastService.error('Cannot block user: not in contacts');
    }
  };

  $scope.addUserToContacts = function() {
    if (!$scope.userProfilePopup.user) return;
    
    const userEmail = $scope.userProfilePopup.user.email;
    const userName = $scope.userProfilePopup.user.name || $scope.userProfilePopup.user.username;
    
    console.log('➕ Adding user to contacts:', userEmail);
    
    UserService.addContact(userEmail).then(function(response) {
      ToastService.success('Added ' + userName + ' to contacts');
      
      // Reload contacts
      return $scope.loadContacts();
    }).then(function() {
      // Close popup
      $scope.closeUserProfilePopup();
    }).catch(function(error) {
      console.error('Failed to add contact:', error);
      ToastService.error(error.data?.message || 'Failed to add contact');
    });
  };

  $scope.isUserInContacts = function(email) {
    if (!email) return false;
    
    const allContacts = ($scope.contacts || []).concat($scope.archivedContacts || []);
    return allContacts.some(c => c.email === email);
  };

  $scope.onEditProfilePictureChange = function(event) {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        ToastService.error('Please select a valid image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        ToastService.error('Image size should be less than 5MB');
        return;
      }

      $scope.editForm.profile_picture = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = function(e) {
        $scope.$apply(function() {
          $scope.editForm.profilePicturePreview = e.target.result;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  $scope.removeEditProfilePicture = function() {
    $scope.editForm.profile_picture = null;
    $scope.editForm.profilePicturePreview = null;
    
    // Clear file input
    const fileInput = document.getElementById('editProfilePictureInput');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  $scope.cancelEditProfile = function() {
    $scope.editingProfile = false;
    $scope.resetEditForm();
  };

  $scope.resetEditForm = function() {
    $scope.editForm = {
      name: '',
      username: '',
      profile_picture: null,
      profilePicturePreview: null
    };
    $scope.usernameAvailable = null;
    $scope.checkingUsername = false;
    
    // Clear file input
    const fileInput = document.getElementById('editProfilePictureInput');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  $scope.checkUsernameAvailability = function() {
    if (!$scope.editForm.username || $scope.editForm.username === $scope.currentUser.username) {
      $scope.usernameAvailable = null;
      return;
    }

    $scope.checkingUsername = true;
    
    // Cancel previous timeout if exists
    if ($scope.usernameCheckTimeout) {
      $timeout.cancel($scope.usernameCheckTimeout);
    }
    
    $scope.usernameCheckTimeout = $timeout(function() {
      AuthService.checkUsername($scope.editForm.username).then(function(response) {
        $scope.usernameAvailable = response.available;
        $scope.checkingUsername = false;
      }).catch(function(error) {
        console.error('Username check failed:', error);
        $scope.usernameAvailable = null;
        $scope.checkingUsername = false;
      });
    }, 500);
  };

  $scope.saveProfile = function() {
    if (!$scope.editForm.name.trim() || !$scope.editForm.username.trim()) {
      return;
    }

    if ($scope.usernameAvailable === false) {
      return;
    }

    const formData = new FormData();
    formData.append('name', $scope.editForm.name);
    formData.append('username', $scope.editForm.username);
    
    if ($scope.editForm.profile_picture) {
      formData.append('profile_picture', $scope.editForm.profile_picture);
    }

    AuthService.updateProfile(formData).then(function(response) {
      // Clear cache and refetch user data
      UserService.clearCache();
      return UserService.getMe(true);
    }).then(function(updatedUser) {
      $scope.currentUser = updatedUser;
      $scope.editingProfile = false;
      $scope.resetEditForm();
    }).catch(function(error) {
      console.error('Profile update failed:', error);
    });
  };

  $scope.openAttachmentMenu = function() {
    // Placeholder for future file attachment functionality
    console.log('Attachment menu clicked - feature coming soon!');
  };

  $scope.addToContacts = function(user) {
    if (!user || !user.email) {
      ToastService.error('Invalid user data');
      return;
    }

    // Check if user is already in contacts
    const existingContact = $scope.contacts.find(function(contact) {
      return contact.email === user.email;
    });

    if (existingContact) {
      ToastService.error('User is already in your contacts');
      return;
    }

    // Set loading state for this specific user
    $scope.addingToContacts[user.email] = true;

    UserService.addContact(user.email).then(function(response) {
      // Successfully added to contacts, now refresh the contacts list
      return $scope.loadContacts();
    }).then(function(updatedContacts) {
      // Remove the user from global search results since they're now a contact
      if ($scope.searchResults.global) {
        $scope.searchResults.global = $scope.searchResults.global.filter(function(globalUser) {
          return globalUser.email !== user.email;
        });
      }

      // Add the user to the contacts search results if we're currently searching
      if ($scope.searchQuery && $scope.searchQuery.trim().length > 0) {
        // Find the newly added contact in the updated contacts list
        const newContact = updatedContacts.find(function(contact) {
          return contact.email === user.email;
        });
        
        if (newContact) {
          if (!$scope.searchResults.contacts) {
            $scope.searchResults.contacts = [];
          }
          $scope.searchResults.contacts.push(newContact);
        }
      }

      ToastService.success(`${user.name || user.username} added to contacts`);
    }).catch(function(error) {
      console.error('Failed to add contact:', error);
      // Error message is already shown by the service
    }).finally(function() {
      // Clear loading state
      delete $scope.addingToContacts[user.email];
    });
  };

  $scope.setSidebarView = function(view) {
    $scope.sidebarView = view;
  };

  // Group-related variables
  $scope.groups = []; // Will hold user's groups
  $scope.pendingRequestGroups = []; // Groups with pending join requests
  $scope.showPendingRequestsFolder = false;
  $scope.joinGroupId = ''; // For joining group with ID
  $scope.createGroupModal = {
    show: false,
    groupName: '',
    selectedMembers: [],
    creating: false,
    memberSearch: ''
  };
  
  // Join requests popup (similar to pinned messages)
  $scope.showJoinRequestsPopup = false;
  $scope.joinRequests = [];
  $scope.hasUnreadJoinRequests = false;

  // Load groups
  $scope.loadGroups = function() {
    // Fetch both groups and group data in parallel
    const groupsPromise = ChatService.fetchGroups();
    const groupDataPromise = ChatService.fetchGroupData();

    return $q.all([groupsPromise, groupDataPromise]).then(function(results) {
      const groups = results[0];
      const groupDataList = results[1];

      // Create a map of group data by conversation_id for quick lookup
      const groupDataMap = {};
      groupDataList.forEach(function(groupData) {
        groupDataMap[groupData.conversation_id] = groupData;
      });

      // Map groups and merge with group data
      const allGroups = groups.map(function(group) {
        const lastMessage = group.last_message;
        const groupData = groupDataMap[group._id] || {};

        return {
          id: group._id,
          name: group.group_name,
          picture: group.group_picture,
          members_count: group.participant_count,
          participants: group.participants,
          owner: group.owner,
          admins: group.admins || [],
          roles: group.roles || [],
          role_assignments: group.role_assignments || {},
          description: group.group_description || '',
          last_message: lastMessage,
          lastMessageTime: lastMessage ? lastMessage.created_at : null,
          lastMessageContent: lastMessage ? (lastMessage.content || (lastMessage.type === 'image' ? '📷 Image' : lastMessage.type === 'file' ? '📎 File' : 'No messages yet')) : 'No messages yet',
          pinned_messages: group.pinned_messages || [],
          pinned: groupData.is_pinned || false,
          muted: groupData.muted || false,
          archived: groupData.archived || false,
          is_favorited: groupData.is_favorited || false,
          is_pinned: groupData.is_pinned || false,
          unreadCount: group.unread_count || 0,
          isGroup: true, // Flag to identify groups
          // Imported group fields - preserve exact API values
          is_imported: group.is_imported, // Don't use || false, preserve undefined/true as-is
          import_date: group.import_date || null,
          original_message_count: group.original_message_count || null,
          conversation_id: group._id // Add conversation_id for fetchLastMessage
        };
      });

      // Store ALL groups (both archived and non-archived) - just like contacts
      $scope.groups = allGroups;
      
      // Initialize archivedGroups array (will be populated by filter function)
      $scope.archivedGroups = [];

      // Load unread counts from localStorage after groups are loaded
      $scope.loadUnreadCounts();
      
      // Fetch last message for each group to ensure we have the latest
      allGroups.forEach(function(group) {
        $scope.fetchLastMessage(group);
      });

      // Apply current filter to separate archived groups
      if ($scope.sidebarView === 'chats') {
        // If in chats view, use filterContacts which now handles both
        $scope.filterContacts($scope.filter);
      } else {
        // If in groups view, use filterGroups
        $scope.filterGroups($scope.groupFilter);
      }

      $scope.$applyAsync();
      
      // Calculate total unread count after loading groups
      $timeout(function() {
        $scope.calculateTotalUnreadCount();
      }, 500);
      
      return allGroups; // Return the groups for chaining
    }).catch(function(error) {
      console.error('Failed to load groups:', error);
      ToastService.error('Failed to load groups');
      throw error; // Re-throw for proper error handling in chain
    });
  };

  // Filter contacts for group creation based on search
  $scope.getFilteredContactsForGroup = function() {
    if (!$scope.createGroupModal.memberSearch || $scope.createGroupModal.memberSearch.trim().length === 0) {
      return $scope.contacts;
    }
    
    const searchLower = $scope.createGroupModal.memberSearch.toLowerCase();
    return $scope.contacts.filter(function(contact) {
      const name = (contact.name || contact.username || '').toLowerCase();
      const username = (contact.username || '').toLowerCase();
      return name.includes(searchLower) || username.includes(searchLower);
    });
  };

  // Show create group modal
  $scope.showCreateGroupModal = function() {
    $scope.createGroupModal = {
      show: true,
      groupName: '',
      selectedMembers: [],
      creating: false,
      memberSearch: ''
    };
  };

  // Cancel create group
  $scope.cancelCreateGroup = function() {
    $scope.createGroupModal = {
      show: false,
      groupName: '',
      selectedMembers: [],
      creating: false,
      memberSearch: ''
    };
  };

  // Toggle member selection
  $scope.toggleMemberSelection = function(email) {
    const index = $scope.createGroupModal.selectedMembers.indexOf(email);
    if (index === -1) {
      // Add member
      $scope.createGroupModal.selectedMembers.push(email);
    } else {
      // Remove member
      $scope.createGroupModal.selectedMembers.splice(index, 1);
    }
  };

  // Check if contact is selected
  $scope.isContactSelected = function(email) {
    return $scope.createGroupModal.selectedMembers.indexOf(email) !== -1;
  };

  // Confirm create group
  $scope.confirmCreateGroup = function() {
    // Validate
    if (!$scope.createGroupModal.groupName || $scope.createGroupModal.groupName.trim().length === 0) {
      ToastService.error('Please enter a group name');
      return;
    }

    if ($scope.createGroupModal.selectedMembers.length === 0) {
      ToastService.error('Please select at least one member');
      return;
    }

    // Check for duplicate group names
    const groupName = $scope.createGroupModal.groupName.trim();
    const existingGroup = $scope.groups.find(function(group) {
      return group.name.toLowerCase() === groupName.toLowerCase();
    });

    if (existingGroup) {
      ToastService.error('A group with this name already exists. Please choose a different name.');
      return;
    }

    // Also check archived groups
    const existingArchivedGroup = $scope.archivedGroups.find(function(group) {
      return group.name.toLowerCase() === groupName.toLowerCase();
    });

    if (existingArchivedGroup) {
      ToastService.error('A group with this name already exists (in archived). Please choose a different name.');
      return;
    }

    // Set creating state
    $scope.createGroupModal.creating = true;

    // Create group
    ChatService.createGroup(
      groupName,
      $scope.createGroupModal.selectedMembers
    ).then(function(response) {
      ToastService.success(`Group "${response.group_name}" created successfully`);
      
      // Close modal
      $scope.cancelCreateGroup();
      
      // Reload groups
      $scope.loadGroups();
    }).catch(function(error) {
      console.error('Failed to create group:', error);
      ToastService.error('Failed to create group');
      $scope.createGroupModal.creating = false;
    });
  };

  // Join group with ID
  $scope.joinGroupWithId = function() {
    if (!$scope.joinGroupId || $scope.joinGroupId.trim().length === 0) {
      ToastService.error('Please enter a Group ID');
      return;
    }
    ToastService.info('Join group functionality will be implemented next');
    // TODO: Implement join group with ID
    $scope.joinGroupId = ''; // Clear input
  };

  // Show group actions modal (for floating button)
  $scope.showGroupActionsModal = function() {
    // For now, just show create group modal
    // Later can add a choice between create and join
    $scope.showCreateGroupModal();
  };

  // Contact Info Modal
  $scope.contactInfoModal = {
    show: false,
    contact: null
  };

  // Show contact info
  $scope.showContactInfo = function() {
    if (!$scope.selectedContact || $scope.selectedContact.isGroup) {
      return;
    }

    console.log('📋 Opening contact info for:', $scope.selectedContact.name);

    $scope.contactInfoModal = {
      show: true,
      contact: $scope.selectedContact
    };
  };

  // Close contact info
  $scope.closeContactInfo = function() {
    $scope.contactInfoModal.show = false;
  };

  // Group Settings Modal
  $scope.groupSettingsModal = {
    show: false,
    group: null,
    editedName: '',
    editedDescription: '',
    selectedPicture: null,
    picturePreview: null,
    activeTab: 'overview', // overview, members, roles
    newRoleName: '',
    newRoleColor: '#5865f2',
    selectedMemberForRole: null,
    selectedRoleForMember: null,
    addMemberEmail: '',
    saving: false
  };

  // Show group settings
  $scope.showGroupSettings = function() {
    if (!$scope.selectedContact || !$scope.selectedContact.isGroup) {
      return;
    }

    // Find the full group object
    const group = $scope.groups.find(g => g.id === $scope.selectedContact.conversation_id) ||
                  $scope.archivedGroups.find(g => g.id === $scope.selectedContact.conversation_id);

    if (!group) {
      ToastService.error('Group not found');
      return;
    }

    $scope.groupSettingsModal = {
      show: true,
      group: group,
      editedName: group.name,
      editedDescription: group.description || '',
      selectedPicture: null,
      picturePreview: group.picture,
      activeTab: 'overview',
      newRoleName: '',
      newRoleColor: '#5865f2',
      selectedMemberForRole: null,
      selectedRoleForMember: null,
      addMemberEmail: '',
      saving: false,
      roles: group.roles || [],
      roleAssignments: group.role_assignments || {},
      admins: group.admins || [],
      isOwner: group.owner === $scope.currentUser.email,
      isAdmin: (group.admins || []).includes($scope.currentUser.email) || group.owner === $scope.currentUser.email,
      memberInfo: {}, // Initialize member info cache
      memberSearch: '', // Initialize search query
      inviteLink: '', // Will be set by loadInviteLink
      inviteLinkExpiration: 2, // Default 2 days
      inviteLinkExpiresAt: null,
      hasActiveInviteLink: false
    };
    
    // Load or generate invite link
    $scope.loadInviteLink();
    
    // Fetch member info for all participants
    if (group.participants) {
      group.participants.forEach(function(email) {
        $scope.fetchMemberInfo(email);
      });
    }
    
    // Initialize Coloris after modal is shown
    $timeout(function() {
      if (typeof Coloris !== 'undefined') {
        Coloris({
          themeMode: 'dark',
          theme: 'large',
          format: 'hex',
          alpha: false,
          focusInput: false,
          margin: 8,
          onChange: function(color, input) {
            // Update the AngularJS model
            $scope.$apply(function() {
              $scope.groupSettingsModal.newRoleColor = color;
            });
            
            // Force update the color preview circle with multiple approaches
            $timeout(function() {
              $scope.updateColorPreview(color);
            }, 10);
          }
        });
        
        // Also set up a watcher for when the picker opens
        $scope.setupColorPreviewWatcher();
      }
    }, 100);
    
    // Function to update color preview
    $scope.updateColorPreview = function(color) {
      const preview = document.querySelector('.clr-picker .clr-preview');
      if (preview) {
        // Set CSS custom property
        document.documentElement.style.setProperty('--selected-color', color);
        
        // Force update with inline styles
        preview.style.setProperty('background-color', color, 'important');
        preview.style.setProperty('background', color, 'important');
        
        // Update child elements
        const previewChildren = preview.querySelectorAll('*');
        previewChildren.forEach(function(child) {
          child.style.setProperty('background-color', color, 'important');
          child.style.setProperty('background', color, 'important');
        });
      }
    };
    
    // Set up mutation observer to watch for color picker changes
    $scope.setupColorPreviewWatcher = function() {
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'childList') {
            const picker = document.querySelector('.clr-picker');
            if (picker) {
              // Color picker was added to DOM, update preview
              $timeout(function() {
                $scope.updateColorPreview($scope.groupSettingsModal.newRoleColor);
              }, 50);
            }
          }
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Clean up observer when modal closes
      $scope.$on('$destroy', function() {
        observer.disconnect();
      });
    };
    
    // Fetch member info for all participants
    if (group.participants && group.participants.length > 0) {
      group.participants.forEach(function(email) {
        $scope.fetchMemberInfo(email);
      });
    }
  };

  // Close group settings
  $scope.closeGroupSettings = function() {
    $scope.groupSettingsModal.show = false;
  };

  // Handle picture selection
  $scope.onGroupPictureSelect = function(files) {
    if (files && files.length > 0) {
      const file = files[0];
      $scope.groupSettingsModal.selectedPicture = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = function(e) {
        $scope.$apply(function() {
          $scope.groupSettingsModal.picturePreview = e.target.result;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Save group basic info
  $scope.saveGroupBasicInfo = function() {
    if (!$scope.groupSettingsModal.isOwner) {
      ToastService.error('Only the owner can edit group info');
      return;
    }

    $scope.groupSettingsModal.saving = true;
    
    const data = {};
    
    // Check for changes and add to data object
    if ($scope.groupSettingsModal.editedName !== $scope.groupSettingsModal.group.name) {
      data.group_name = $scope.groupSettingsModal.editedName;
    }

    if ($scope.groupSettingsModal.editedDescription !== ($scope.groupSettingsModal.group.description || '')) {
      data.group_description = $scope.groupSettingsModal.editedDescription;
    }
    
    // TODO: Handle file uploads - might need separate endpoint or different handling
    if ($scope.groupSettingsModal.selectedPicture) {
      ToastService.error('File uploads not yet supported. Please update text fields only.');
      $scope.groupSettingsModal.saving = false;
      return;
    }
    
    // Only make request if there are changes
    if (Object.keys(data).length === 0) {
      ToastService.info('No changes to save');
      $scope.groupSettingsModal.saving = false;
      return;
    }
    
    ChatService.editGroup($scope.groupSettingsModal.group.id, data).then(function(response) {
      ToastService.success('Group updated successfully');
      $scope.groupSettingsModal.saving = false;
      
      // Refresh group data and update modal with latest information
      $scope.refreshGroupDataAndModal();
      
    }).catch(function(error) {
      console.error('Failed to update group:', error);
      ToastService.error('Failed to update group');
      $scope.groupSettingsModal.saving = false;
    });
  };

  // Add member to group
  $scope.addMemberToGroup = function() {
    if (!$scope.groupSettingsModal.addMemberEmail || !$scope.groupSettingsModal.addMemberEmail.trim()) {
      ToastService.error('Please enter an email');
      return;
    }

    const email = $scope.groupSettingsModal.addMemberEmail.trim();
    const data = {
      add_participants: [email]
    };

    ChatService.editGroup($scope.groupSettingsModal.group.id, data).then(function(response) {
      ToastService.success('Member added successfully');
      $scope.groupSettingsModal.addMemberEmail = '';
      
      // Refresh group data and update modal with latest information
      $scope.refreshGroupDataAndModal();
      
    }).catch(function(error) {
      console.error('Failed to add member:', error);
      ToastService.error('Failed to add member');
    });
  };

  // Remove member from group
  $scope.removeMemberFromGroup = function(email) {
    // Get member info to show name in confirmation
    const memberInfo = $scope.groupSettingsModal.memberInfo[email];
    const memberName = memberInfo ? (memberInfo.name || memberInfo.username || email) : email;
    
    // Show confirmation modal
    $scope.removeMemberConfirmation = {
      show: true,
      memberEmail: email,
      memberName: memberName
    };
  };

  $scope.confirmRemoveMember = function() {
    const email = $scope.removeMemberConfirmation.memberEmail;
    
    if (!email) {
      $scope.cancelRemoveMember();
      return;
    }

    const data = {
      remove_participants: [email]
    };

    ChatService.editGroup($scope.groupSettingsModal.group.id, data).then(function(response) {
      ToastService.success('Member removed successfully');
      
      // Refresh group data and update modal with latest information
      $scope.refreshGroupDataAndModal();
      
    }).catch(function(error) {
      console.error('Failed to remove member:', error);
      ToastService.error('Failed to remove member');
    });
    
    $scope.cancelRemoveMember();
  };

  $scope.cancelRemoveMember = function() {
    $scope.removeMemberConfirmation = {
      show: false,
      memberEmail: null,
      memberName: null
    };
  };

  // Promote to admin
  $scope.promoteToAdmin = function(email) {
    const data = {
      add_admins: [email]
    };

    ChatService.editGroup($scope.groupSettingsModal.group.id, data).then(function(response) {
      ToastService.success('Member promoted to admin');
      
      // Refresh group data and update modal with latest information
      $scope.refreshGroupDataAndModal();
      
    }).catch(function(error) {
      console.error('Failed to promote member:', error);
      ToastService.error('Failed to promote member');
    });
  };

  // Demote from admin
  $scope.demoteFromAdmin = function(email) {
    const data = {
      remove_admins: [email]
    };

    ChatService.editGroup($scope.groupSettingsModal.group.id, data).then(function(response) {
      ToastService.success('Admin demoted');
      
      // Refresh group data and update modal with latest information
      $scope.refreshGroupDataAndModal();
      
    }).catch(function(error) {
      console.error('Failed to demote admin:', error);
      ToastService.error('Failed to demote admin');
    });
  };

  // Role management functions
  $scope.createRole = function() {
    if (!$scope.groupSettingsModal.newRoleName || !$scope.groupSettingsModal.newRoleName.trim()) {
      ToastService.error('Please enter a role name');
      return;
    }

    if (!$scope.groupSettingsModal.newRoleColor) {
      ToastService.error('Please select a role color');
      return;
    }

    const roleName = $scope.groupSettingsModal.newRoleName.trim();
    const existingRoles = $scope.groupSettingsModal.roles || [];
    
    // Check if role name already exists (case-insensitive)
    const roleExists = existingRoles.some(function(role) {
      return role.name.toLowerCase() === roleName.toLowerCase();
    });
    
    if (roleExists) {
      ToastService.error('A role with this name already exists');
      return;
    }

    const newRole = {
      name: roleName,
      color: $scope.groupSettingsModal.newRoleColor
    };

    const data = {
      add_role: newRole
    };

    ChatService.editGroup($scope.groupSettingsModal.group.id, data).then(function(response) {
      ToastService.success('Role created successfully');
      
      $scope.groupSettingsModal.newRoleName = ''; // Reset form
      $scope.groupSettingsModal.newRoleColor = '#5865f2'; // Reset color
      
      // Refresh group data and update modal with latest information
      $scope.refreshGroupDataAndModal();
      
    }).catch(function(error) {
      console.error('Failed to create role:', error);
      ToastService.error('Failed to create role');
    });
  };

  $scope.deleteRole = function(roleName) {
    // Show confirmation modal
    $scope.deleteRoleConfirmation = {
      show: true,
      roleName: roleName
    };
  };

  $scope.confirmDeleteRole = function() {
    const roleName = $scope.deleteRoleConfirmation.roleName;
    
    if (!roleName) {
      $scope.cancelDeleteRole();
      return;
    }

    const data = {
      remove_role: roleName
    };

    ChatService.editGroup($scope.groupSettingsModal.group.id, data).then(function(response) {
      ToastService.success('Role deleted successfully');
      
      // Refresh group data and update modal with latest information
      $scope.refreshGroupDataAndModal();
      
    }).catch(function(error) {
      console.error('Failed to delete role:', error);
      ToastService.error('Failed to delete role');
    });
    
    $scope.cancelDeleteRole();
  };

  $scope.cancelDeleteRole = function() {
    $scope.deleteRoleConfirmation = {
      show: false,
      roleName: null
    };
  };

  // Helper function to count roles for a user (currently supports 1 role per user)
  $scope.getUserRoleCount = function(email) {
    if (!$scope.groupSettingsModal.roleAssignments) return 0;
    return $scope.groupSettingsModal.roleAssignments[email] ? 1 : 0;
  };

  // Helper function to get the roles assigned to a user (supports multiple roles)
  $scope.getUserRoles = function(email) {
    if (!$scope.groupSettingsModal.roleAssignments) {
      return [];
    }
    
    const roleAssignment = $scope.groupSettingsModal.roleAssignments[email];
    let roles = [];
    
    if (roleAssignment) {
      if (Array.isArray(roleAssignment)) {
        roles = roleAssignment;
      } else if (typeof roleAssignment === 'string') {
        roles = [roleAssignment];
      }
    }
    
    return roles;
  };

  // Helper function to get the role assigned to a user (backward compatibility)
  $scope.getUserRole = function(email) {
    const roles = $scope.getUserRoles(email);
    return roles.length > 0 ? roles[0] : null;
  };

  // Helper function to check if user has a specific role
  $scope.userHasRole = function(email, roleName) {
    const roles = $scope.getUserRoles(email);
    return roles.includes(roleName);
  };

  // Helper function to get role color
  $scope.getRoleColor = function(roleName) {
    if (!$scope.groupSettingsModal.roles || !roleName) return '#5865f2';
    const role = $scope.groupSettingsModal.roles.find(function(r) {
      return r.name === roleName;
    });
    return role ? role.color : '#5865f2';
  };

  $scope.assignRoleToMember = function(email, roleName) {
    // Check if user already has this role
    if ($scope.userHasRole(email, roleName)) {
      ToastService.error('User already has this role');
      return;
    }
    
    // Check if user would exceed maximum roles (6)
    const currentRoles = $scope.getUserRoles(email);
    if (currentRoles.length >= 6) {
      ToastService.error('User cannot have more than 6 roles');
      return;
    }

    // Get current roles for this user and add the new role
    const userCurrentRoles = $scope.getUserRoles(email);
    const newRoles = [...userCurrentRoles, roleName]; // Add the new role

    const data = {
      assign_roles: {
        [email]: newRoles
      }
    };

    ChatService.editGroup($scope.groupSettingsModal.group.id, data).then(function(response) {
      ToastService.success('Role assigned successfully');
      
      // Refresh group data and update modal with latest information
      $scope.refreshGroupDataAndModal();
      
    }).catch(function(error) {
      console.error('Failed to assign role:', error);
      ToastService.error('Failed to assign role');
    });
  };

  $scope.unassignRoleFromMember = function(email, roleName) {
    // Get current roles for this user
    const userCurrentRoles = $scope.getUserRoles(email);
    
    // Remove the specific role
    const newRoles = userCurrentRoles.filter(function(role) {
      return role !== roleName;
    });

    const data = {
      unassign_roles: {
        [email]: [roleName] // Unassign only this specific role
      }
    };

    ChatService.editGroup($scope.groupSettingsModal.group.id, data).then(function(response) {
      ToastService.success('Role unassigned successfully');
      
      // Refresh group data and update modal with latest information
      $scope.refreshGroupDataAndModal();
      
    }).catch(function(error) {
      console.error('Failed to unassign role:', error);
      ToastService.error('Failed to unassign role');
    });
  };

  // Handle click outside to close dropdowns
  $scope.handleClickOutside = function(event) {
    // Close role assignment dropdowns if clicking outside
    const dropdowns = document.querySelectorAll('.role-assign-dropdown');
    let clickedInside = false;
    
    dropdowns.forEach(function(dropdown) {
      if (dropdown.contains(event.target)) {
        clickedInside = true;
      }
    });
    
    if (!clickedInside) {
      $scope.$apply(function() {
        $scope.closeRoleAssignDropdown(); // Close all dropdowns
      });
    }
  };

  // Add click outside listener when modal opens
  $scope.$watch('groupSettingsModal.show', function(newVal) {
    if (newVal) {
      $timeout(function() {
        document.addEventListener('click', $scope.handleClickOutside);
      });
    } else {
      document.removeEventListener('click', $scope.handleClickOutside);
      $scope.closeRoleAssignDropdown(); // Close all dropdowns
    }
  });

  // Custom dropdown state for role assignment - one per role
  $scope.roleAssignDropdowns = {}; // Object to store dropdown state for each role

  // Toggle role assignment dropdown
  $scope.toggleRoleAssignDropdown = function(role) {
    // Initialize dropdown state for this role if it doesn't exist
    if (!$scope.roleAssignDropdowns[role.name]) {
      $scope.roleAssignDropdowns[role.name] = {
        isOpen: false,
        searchQuery: ''
      };
    }
    
    // Close all other dropdowns first
    Object.keys($scope.roleAssignDropdowns).forEach(function(roleName) {
      if (roleName !== role.name) {
        $scope.roleAssignDropdowns[roleName].isOpen = false;
      }
    });
    
    // Toggle this dropdown
    $scope.roleAssignDropdowns[role.name].isOpen = !$scope.roleAssignDropdowns[role.name].isOpen;
    $scope.roleAssignDropdowns[role.name].searchQuery = '';
  };

  // Close role assignment dropdown
  $scope.closeRoleAssignDropdown = function(roleName) {
    if (roleName && $scope.roleAssignDropdowns[roleName]) {
      $scope.roleAssignDropdowns[roleName].isOpen = false;
    } else {
      // Close all dropdowns
      Object.keys($scope.roleAssignDropdowns).forEach(function(name) {
        $scope.roleAssignDropdowns[name].isOpen = false;
      });
    }
  };

  // Check if dropdown is open for a specific role
  $scope.isRoleDropdownOpen = function(roleName) {
    return $scope.roleAssignDropdowns[roleName] && $scope.roleAssignDropdowns[roleName].isOpen;
  };

  // Get search query for a specific role
  $scope.getRoleSearchQuery = function(roleName) {
    return $scope.roleAssignDropdowns[roleName] ? $scope.roleAssignDropdowns[roleName].searchQuery : '';
  };

  // Get filtered members for role assignment (excluding those who already have the role)
  $scope.getFilteredMembersForRoleAssignment = function(roleName) {
    if (!$scope.groupSettingsModal.group || !$scope.groupSettingsModal.group.participants) {
      return [];
    }
    
    const searchQuery = $scope.getRoleSearchQuery(roleName).toLowerCase();
    let members = $scope.groupSettingsModal.group.participants;
    
    // Filter out members who already have this role
    members = members.filter(function(participant) {
      return !$scope.userHasRole(participant, roleName);
    });
    
    // Filter by search query if provided
    if (searchQuery) {
      members = members.filter(function(participant) {
        const memberInfo = $scope.groupSettingsModal.memberInfo[participant];
        if (!memberInfo) return false;
        
        const name = (memberInfo.name || '').toLowerCase();
        const username = (memberInfo.username || '').toLowerCase();
        const email = participant.toLowerCase();
        
        return name.includes(searchQuery) || 
               username.includes(searchQuery) || 
               email.includes(searchQuery);
      });
    }
    
    return members;
  };

  // Check if all members already have the role
  $scope.allMembersHaveRole = function(roleName) {
    if (!$scope.groupSettingsModal.group || !$scope.groupSettingsModal.group.participants) {
      return false;
    }
    
    const totalMembers = $scope.groupSettingsModal.group.participants.length;
    const membersWithRole = $scope.groupSettingsModal.group.participants.filter(function(participant) {
      return $scope.userHasRole(participant, roleName);
    }).length;
    
    return totalMembers > 0 && membersWithRole === totalMembers;
  };

  // Get filtered members for role assignment
  $scope.getFilteredMembersForRole = function() {
    if (!$scope.groupSettingsModal.group || !$scope.groupSettingsModal.group.participants) {
      return [];
    }
    
    const searchQuery = ($scope.roleAssignDropdown.searchQuery || '').toLowerCase();
    let members = $scope.groupSettingsModal.group.participants;
    
    // Filter by search query if provided
    if (searchQuery) {
      members = members.filter(function(participant) {
        const memberInfo = $scope.groupSettingsModal.memberInfo[participant];
        if (!memberInfo) return false;
        
        const name = (memberInfo.name || '').toLowerCase();
        const username = (memberInfo.username || '').toLowerCase();
        const email = participant.toLowerCase();
        
        return name.includes(searchQuery) || 
               username.includes(searchQuery) || 
               email.includes(searchQuery);
      });
    }
    
    return members;
  };

  // Check if a role has any assignments
  $scope.hasRoleAssignments = function(roleName) {
    if (!$scope.groupSettingsModal.roleAssignments || !$scope.groupSettingsModal.group) return false;
    
    // Get current participants list
    const currentParticipants = $scope.groupSettingsModal.group.participants || [];
    
    return Object.keys($scope.groupSettingsModal.roleAssignments).some(function(email) {
      // Only check users who are still participants AND have the role
      return currentParticipants.includes(email) && $scope.userHasRole(email, roleName);
    });
  };

  // Get list of members who have a specific role
  $scope.getMembersWithRole = function(roleName) {
    if (!$scope.groupSettingsModal.roleAssignments || !$scope.groupSettingsModal.group) return [];
    
    // Get current participants list
    const currentParticipants = $scope.groupSettingsModal.group.participants || [];
    
    return Object.keys($scope.groupSettingsModal.roleAssignments).filter(function(email) {
      // Only include users who are still participants AND have the role
      return currentParticipants.includes(email) && $scope.userHasRole(email, roleName);
    });
  };

  // Assign role and close dropdown
  $scope.assignRoleAndClose = function(email, roleName) {
    $scope.assignRoleToMember(email, roleName);
    $scope.closeRoleAssignDropdown(roleName);
  };

  // Copy group ID
  $scope.copyGroupId = function() {
    const groupId = $scope.groupSettingsModal.group.id;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(groupId).then(function() {
        ToastService.success('Group ID copied to clipboard');
      }).catch(function() {
        ToastService.error('Failed to copy Group ID');
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = groupId;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        ToastService.success('Group ID copied to clipboard');
      } catch (err) {
        ToastService.error('Failed to copy Group ID');
      }
      document.body.removeChild(textArea);
    }
  };

  // Load or check for active invite link
  $scope.loadInviteLink = function() {
    if (!$scope.groupSettingsModal.group) return;
    
    const groupId = $scope.groupSettingsModal.group.id;
    const activeLink = InviteService.getActiveInviteLink(groupId);
    
    if (activeLink) {
      // Active link exists
      $scope.groupSettingsModal.hasActiveInviteLink = true;
      $scope.groupSettingsModal.inviteLink = window.APP_CONFIG.FRONTEND_URL + '/invite/' + activeLink.uuid;
      $scope.groupSettingsModal.inviteLinkExpiresAt = new Date(activeLink.expiresAt);
      $scope.groupSettingsModal.inviteLinkExpiration = activeLink.expirationDays;
      console.log('✅ Loaded active invite link:', activeLink);
    } else {
      // No active link
      $scope.groupSettingsModal.hasActiveInviteLink = false;
      $scope.groupSettingsModal.inviteLink = '';
      $scope.groupSettingsModal.inviteLinkExpiresAt = null;
      console.log('ℹ️ No active invite link found');
    }
  };
  
  // Generate new invite link
  $scope.generateInviteLink = function() {
    if (!$scope.groupSettingsModal.group) return;
    
    const groupId = $scope.groupSettingsModal.group.id;
    const expirationDays = $scope.groupSettingsModal.inviteLinkExpiration;
    
    // Create new invite link
    const inviteData = InviteService.createInviteLink(groupId, expirationDays);
    
    // Update modal
    $scope.groupSettingsModal.hasActiveInviteLink = true;
    $scope.groupSettingsModal.inviteLink = window.APP_CONFIG.FRONTEND_URL + '/invite/' + inviteData.uuid;
    $scope.groupSettingsModal.inviteLinkExpiresAt = new Date(inviteData.expiresAt);
    
    console.log('✅ Generated new invite link:', inviteData);
    ToastService.success('New invite link generated!');
  };
  
  // Format expiration date for display
  $scope.formatExpirationDate = function(date) {
    if (!date) return '';
    
    const now = new Date();
    const expDate = new Date(date);
    const diffMs = expDate - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return 'Expired';
    } else if (diffDays === 0) {
      return 'Expires today';
    } else if (diffDays === 1) {
      return 'Expires tomorrow';
    } else {
      return `Expires in ${diffDays} days`;
    }
  };
  
  // Revoke active invite link
  $scope.revokeInviteLink = function() {
    if (!$scope.groupSettingsModal.hasActiveInviteLink) {
      ToastService.error('No active invite link to revoke');
      return;
    }
    
    // Extract UUID from the invite link
    const inviteLink = $scope.groupSettingsModal.inviteLink;
    const uuid = inviteLink.split('/invite/')[1];
    
    if (!uuid) {
      ToastService.error('Invalid invite link format');
      return;
    }
    
    // Revoke the link
    const success = InviteService.revokeInviteLink(uuid);
    
    if (success) {
      // Update modal state
      $scope.groupSettingsModal.hasActiveInviteLink = false;
      $scope.groupSettingsModal.inviteLink = '';
      $scope.groupSettingsModal.inviteLinkExpiresAt = null;
      
      ToastService.success('Invite link revoked successfully');
      console.log('✅ Invite link revoked:', uuid);
    } else {
      ToastService.error('Failed to revoke invite link');
    }
  };

  // Copy invite link
  $scope.copyInviteLink = function() {
    const inviteLink = $scope.groupSettingsModal.inviteLink;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteLink).then(function() {
        ToastService.success('Invite link copied to clipboard');
      }).catch(function() {
        ToastService.error('Failed to copy invite link');
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        ToastService.success('Invite link copied to clipboard');
      } catch (err) {
        ToastService.error('Failed to copy invite link');
      }
      document.body.removeChild(textArea);
    }
  };
  
  // Get count of members with a specific role
  $scope.getRoleMembersCount = function(roleName) {
    if (!$scope.groupSettingsModal.roleAssignments || !$scope.groupSettingsModal.group) return 0;
    
    // Get current participants list
    const currentParticipants = $scope.groupSettingsModal.group.participants || [];
    
    let count = 0;
    Object.keys($scope.groupSettingsModal.roleAssignments).forEach(function(email) {
      // Only count users who are still participants AND have the role
      if (currentParticipants.includes(email) && $scope.userHasRole(email, roleName)) {
        count++;
      }
    });
    
    return count;
  };
  
  // Fetch member info for display
  $scope.fetchMemberInfo = function(email) {
    if (!$scope.groupSettingsModal.memberInfo) {
      $scope.groupSettingsModal.memberInfo = {};
    }
    
    if ($scope.groupSettingsModal.memberInfo[email]) {
      return; // Already fetched
    }
    
    UserService.getUserInfo(email).then(function(userInfo) {
      $scope.groupSettingsModal.memberInfo[email] = userInfo;
      
      // Get presence status from contacts list
      const contact = $scope.contacts.find(c => c.email === email);
      if (contact && $scope.groupSettingsModal.memberInfo[email]) {
        $scope.groupSettingsModal.memberInfo[email].online = contact.online || false;
        $scope.groupSettingsModal.memberInfo[email].idle = contact.idle || false;
        $scope.groupSettingsModal.memberInfo[email].last_seen = contact.last_seen;
        console.log('👤 Updated presence for member:', email, 'Online:', contact.online, 'Idle:', contact.idle);
      } else {
        // Set default offline status
        $scope.groupSettingsModal.memberInfo[email].online = false;
        $scope.groupSettingsModal.memberInfo[email].idle = false;
      }
      
      $scope.$applyAsync();
    }).catch(function(error) {
      console.error('Failed to fetch member info:', email, error);
      // Set fallback info
      $scope.groupSettingsModal.memberInfo[email] = {
        email: email,
        username: email.split('@')[0],
        name: email.split('@')[0],
        profile_picture: null,
        online: false,
        idle: false
      };
      $scope.$applyAsync();
    });
  };

  // Helper function to refresh group data and update modal
  $scope.refreshGroupDataAndModal = function() {
    if (!$scope.groupSettingsModal || !$scope.groupSettingsModal.group) {
      console.error('Cannot refresh: groupSettingsModal or group is not defined');
      return Promise.resolve();
    }
    
    const currentGroupId = $scope.groupSettingsModal.group.id;
    
    // Refetch all groups to get latest data
    return $scope.loadGroups().then(function() {
      // Find the updated group data
      const updatedGroup = $scope.groups.find(g => g.id === currentGroupId) ||
                          $scope.archivedGroups.find(g => g.id === currentGroupId);
      
      if (updatedGroup) {
        // Update the modal with fresh data
        $scope.groupSettingsModal.group = updatedGroup;
        $scope.groupSettingsModal.editedName = updatedGroup.name;
        $scope.groupSettingsModal.editedDescription = updatedGroup.description || '';
        $scope.groupSettingsModal.roles = updatedGroup.roles || [];
        $scope.groupSettingsModal.roleAssignments = updatedGroup.role_assignments || {};
        $scope.groupSettingsModal.admins = updatedGroup.admins || [];
        $scope.groupSettingsModal.isOwner = updatedGroup.owner === $scope.currentUser.email;
        $scope.groupSettingsModal.isAdmin = (updatedGroup.admins || []).includes($scope.currentUser.email) || updatedGroup.owner === $scope.currentUser.email;
        
        // Update selected contact if it's the same group
        if ($scope.selectedContact && $scope.selectedContact.conversation_id === currentGroupId) {
          $scope.selectedContact.name = updatedGroup.name;
          $scope.selectedContact.description = updatedGroup.description;
          $scope.selectedContact.members_count = updatedGroup.members_count || updatedGroup.participant_count || (updatedGroup.participants ? updatedGroup.participants.length : 0);
          $scope.selectedContact.participants = updatedGroup.participants;
          $scope.selectedContact.roles = updatedGroup.roles || [];
          $scope.selectedContact.role_assignments = updatedGroup.role_assignments || {};
          $scope.selectedContact.admins = updatedGroup.admins || [];
          $scope.selectedContact.owner = updatedGroup.owner;
          
          console.log('Selected contact updated, new member count:', $scope.selectedContact.members_count);
        }
        
        // Fetch member info for any new members
        if (updatedGroup.participants) {
          updatedGroup.participants.forEach(function(email) {
            $scope.fetchMemberInfo(email);
          });
        }
      } else {
        console.error('Updated group not found after refresh');
      }
    }).catch(function(error) {
      console.error('Failed to refresh group data:', error);
    });
  };

  // Helper function to check if a member is an admin
  $scope.isAdmin = function(email) {
    if (!$scope.groupSettingsModal || !$scope.groupSettingsModal.group) return false;
    const admins = $scope.groupSettingsModal.admins || $scope.groupSettingsModal.group.admins || [];
    return admins.includes(email) || $scope.groupSettingsModal.group.owner === email;
  };

  // Helper function to check if a member is the owner
  $scope.isOwner = function(email) {
    if (!$scope.groupSettingsModal || !$scope.groupSettingsModal.group) return false;
    return $scope.groupSettingsModal.group.owner === email;
  };

  // Get filtered members based on search query
  $scope.getFilteredMembers = function() {
    if (!$scope.groupSettingsModal || !$scope.groupSettingsModal.group || !$scope.groupSettingsModal.group.participants) {
      return [];
    }
    
    const participants = $scope.groupSettingsModal.group.participants;
    const searchQuery = ($scope.groupSettingsModal.memberSearch || '').toLowerCase().trim();
    
    if (!searchQuery) {
      return participants;
    }
    
    // Filter by name, username, or email
    const filtered = participants.filter(function(email) {
      const memberInfo = $scope.groupSettingsModal.memberInfo[email];
      
      if (!memberInfo) {
        // If member info not loaded yet, search by email
        return email.toLowerCase().includes(searchQuery);
      }
      
      // Search in name, username, and email
      const name = (memberInfo.name || '').toLowerCase();
      const username = (memberInfo.username || '').toLowerCase();
      const emailLower = email.toLowerCase();
      
      return name.includes(searchQuery) || 
             username.includes(searchQuery) || 
             emailLower.includes(searchQuery);
    });
    
    return filtered;
  };

  // Select a group to open chat
  $scope.selectGroup = function(group) {
    // Save current draft before switching
    if ($scope.selectedContact && $scope.draftKey) {
      $scope.saveDraft();
    }
    
    // Clear mention suggestions when switching groups
    $scope.closeMentionSuggestions();
    
    // Treat group like a contact for UI purposes
    $scope.selectedContact = {
      email: group.id, // Use group ID as identifier
      name: group.name,
      username: group.name,
      profile_picture: group.picture,
      picture: group.picture, // Add this for getGroupPicture function
      conversation_id: group.id,
      isGroup: true,
      participants: group.participants,
      owner: group.owner,
      members_count: group.members_count,
      roles: group.roles || [], // Include roles data
      role_assignments: group.role_assignments || {}, // Include role assignments
      // IMPORTANT: Include imported group fields
      is_imported: group.is_imported,
      import_date: group.import_date,
      original_message_count: group.original_message_count
    };
    
    $scope.messages = [];
    $scope.loadingMessages = true;
    $scope.showPinnedMessages = false;
    $scope.showPinnedMessagesPopup = false;
    $scope.pinnedMessages = [];
    
    // Set up draft key for this group
    $scope.draftKey = $scope.getDraftKey($scope.selectedContact);
    console.log('Switching to group, draft key:', $scope.draftKey);
    
    // Clear current message input first
    $scope.messageInput = '';
    $scope.characterCount = 0;
    $scope.showCharacterCount = false;
    
    // Manually clear the textarea DOM element immediately
    const textarea = document.querySelector('textarea[ng-model="messageInput"]');
    if (textarea) {
      textarea.value = '';
    }
    
    // Use $timeout to ensure Angular digest cycle updates, then load draft
    $timeout(function() {
      // Load the draft for the new group
      const draft = localStorage.getItem($scope.draftKey);
      console.log('Loading draft for group:', $scope.draftKey, 'Draft:', draft);
      
      if (draft) {
        $scope.messageInput = draft;
        $scope.characterCount = draft.length;
        $scope.showCharacterCount = draft.length >= ($scope.maxMessageLength - 30);
        
        // Update textarea DOM element
        if (textarea) {
          textarea.value = draft;
          textarea.style.height = 'auto';
          textarea.style.height = textarea.scrollHeight + 'px';
        }
      }
    }, 50);
    
    // Load viewed pinned count from localStorage for this group
    const storageKey = 'pinnedViewed_' + group.id;
    const storedCount = localStorage.getItem(storageKey);
    $scope.lastViewedPinnedCount = storedCount ? parseInt(storedCount) : 0;
    $scope.hasUnviewedPinnedMessages = false;
    
    // Clear unread count when opening group conversation
    if (group.unreadCount > 0) {
      console.log('🔄 Clearing unread count for group:', group.name);
      group.unreadCount = 0;
      group.hasUnread = false;
      group.isNewMessage = false;
      
      // Clear from localStorage
      $scope.clearUnreadCount(group.conversation_id || group.id, 'group');
      
      // Update total unread count and page title
      $scope.calculateTotalUnreadCount();
    }
    
    // Set current conversation
    ChatService.setCurrentConversation({
      id: group.id,
      email: group.id,
      isGroup: true
    });
    
    // Join the conversation room via socket
    SocketService.joinConversation(group.id);
    
    // Load messages from database
    ChatService.loadMessages(group.id).then(function(result) {
      $scope.messages = ChatService.messages;
      $scope.loadingMessages = false;
      
      // Update pinned messages
      $scope.updatePinnedMessages();
      
      // Initialize mosaic background for messages area
      $timeout(function() {
        initMosaicBackground('messagesMosaicBg');
        $scope.scrollToBottom(true);
      }, 100);
    }).catch(function(error) {
      console.error('Failed to load group messages:', error);
      ToastService.error('Failed to load group messages');
      $scope.loadingMessages = false;
    });
  };

  $scope.showContextMenu = function(event, contact) {
    event.preventDefault();
    event.stopPropagation();
    
    $scope.contextMenu.show = true;
    $scope.contextMenu.contact = contact;
    $scope.contextMenu.x = event.clientX;
    $scope.contextMenu.y = event.clientY;
  };

  $scope.hideContextMenu = function() {
    $scope.contextMenu.show = false;
    $scope.contextMenu.contact = null;
  };

  // Mobile context menu function for three-dot menu buttons
  $scope.showMobileContextMenu = function(event, contact) {
    console.log('Mobile context menu clicked for:', contact.name || contact.username);
    
    // Stop event propagation
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Get button position
    const button = event.target.closest('.mobile-menu-button');
    const buttonRect = button.getBoundingClientRect();
    
    // Calculate position relative to button
    let x = buttonRect.left;
    let y = buttonRect.bottom + 5; // 5px below the button
    
    // Adjust for screen boundaries
    const menuWidth = 200;
    const menuHeight = 350;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // If menu would go off right edge, position it to the left of the button
    if (x + menuWidth > screenWidth - 10) {
      x = buttonRect.right - menuWidth;
    }
    
    // If menu would go off bottom, position it above the button
    if (y + menuHeight > screenHeight - 10) {
      y = buttonRect.top - menuHeight - 5;
    }
    
    // Ensure minimum margins
    x = Math.max(10, x);
    y = Math.max(10, y);
    
    console.log('Positioning menu at:', x, y);
    
    // Use $timeout to avoid $apply conflicts
    $timeout(function() {
      $scope.contextMenu = {
        show: true,
        contact: contact,
        x: x,
        y: y
      };
      console.log('Context menu state set:', $scope.contextMenu);
    }, 0);
    
    // Add haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  // Long-press handler for mobile context menu
  $scope.handleLongPress = function(event, contact) {
    // Calculate position for mobile context menu
    const touch = event.touches ? event.touches[0] : event.changedTouches ? event.changedTouches[0] : event;
    let x = touch ? touch.clientX : event.clientX;
    let y = touch ? touch.clientY : event.clientY;
    
    // Adjust position to keep menu on screen
    const menuWidth = 200;
    const menuHeight = 300;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Adjust X position if menu would go off right edge
    if (x + menuWidth > screenWidth) {
      x = screenWidth - menuWidth - 10;
    }
    
    // Adjust Y position if menu would go off bottom edge
    if (y + menuHeight > screenHeight) {
      y = screenHeight - menuHeight - 10;
    }
    
    // Ensure minimum margins
    x = Math.max(10, x);
    y = Math.max(10, y);
    
    $scope.contextMenu.show = true;
    $scope.contextMenu.contact = contact;
    $scope.contextMenu.x = x;
    $scope.contextMenu.y = y;
    
    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    // Prevent default context menu and event bubbling
    event.preventDefault();
    event.stopPropagation();
  };

  $scope.archiveChat = function(contact) {
    if (contact.isGroup) {
      // Archive group
      ChatService.archiveGroup(contact.id).then(function(response) {
        if (response && typeof response.archived !== 'undefined') {
          // Update the contact object immediately
          contact.archived = response.archived;
          
          // Also update in the groups arrays
          const updateGroupInArray = function(arr) {
            const group = arr.find(g => g.id === contact.id);
            if (group) {
              group.archived = response.archived;
            }
          };
          
          updateGroupInArray($scope.groups);
          updateGroupInArray($scope.archivedGroups);
          updateGroupInArray($scope.filteredGroups);
        }
        // Reload groups to get updated state
        $scope.loadGroups();
      }).catch(function(error) {
        console.error('Failed to archive group:', error);
        ToastService.error('Failed to archive group');
      });
    } else {
      // Archive contact
      UserService.archiveContact(contact.email).then(function(response) {
        // Update the contact's archived status based on API response
        if (response && typeof response.archived !== 'undefined') {
          contact.archived = response.archived;
        }
        $scope.loadContacts().then(function() {
          // Refresh the current filter to update the display
          $scope.filterContacts($scope.filter);
        });
      });
    }
    $scope.hideContextMenu();
  };

  $scope.muteChat = function(contact) {
    if (contact.isGroup) {
      // Mute group
      ChatService.muteGroup(contact.id).then(function(response) {
        if (response && typeof response.muted !== 'undefined') {
          // Update the contact object immediately
          contact.muted = response.muted;
          
          // Also update in the groups arrays
          const updateGroupInArray = function(arr) {
            const group = arr.find(g => g.id === contact.id);
            if (group) {
              group.muted = response.muted;
            }
          };
          
          updateGroupInArray($scope.groups);
          updateGroupInArray($scope.archivedGroups);
          updateGroupInArray($scope.filteredGroups);
        }
        // Reload groups to get updated state
        $scope.loadGroups();
      }).catch(function(error) {
        console.error('Failed to mute group:', error);
        ToastService.error('Failed to mute group');
      });
    } else {
      // Mute contact
      UserService.muteContact(contact.email).then(function(response) {
        // Update the contact's muted status based on API response
        if (response && typeof response.muted !== 'undefined') {
          contact.muted = response.muted;
        }
        $scope.loadContacts();
      });
    }
    $scope.hideContextMenu();
  };

  $scope.pinChat = function(contact) {
    if (contact.isGroup) {
      // Pin group
      ChatService.pinGroup(contact.id).then(function(response) {
        if (response && typeof response.pinned !== 'undefined') {
          // Update the contact object immediately
          contact.pinned = response.pinned;
          contact.is_pinned = response.pinned;
          
          // Also update in the groups arrays
          const updateGroupInArray = function(arr) {
            const group = arr.find(g => g.id === contact.id);
            if (group) {
              group.pinned = response.pinned;
              group.is_pinned = response.pinned;
            }
          };
          
          updateGroupInArray($scope.groups);
          updateGroupInArray($scope.archivedGroups);
          updateGroupInArray($scope.filteredGroups);
        }
        // Reload groups to get updated state
        $scope.loadGroups();
      }).catch(function(error) {
        console.error('Failed to pin group:', error);
        ToastService.error('Failed to pin group');
      });
    } else {
      // Pin contact
      UserService.pinContact(contact.email).then(function(response) {
        // Update the contact's pinned status based on API response
        if (response && typeof response.pinned !== 'undefined') {
          contact.pinned = response.pinned;
          contact.is_pinned = response.pinned;
        }
        $scope.loadContacts();
      });
    }
    $scope.hideContextMenu();
  };

  $scope.markAsRead = function(contact) {
    console.log('🔄 Marking as read:', contact.name || contact.username);
    
    if (!contact) {
      console.error('❌ No contact provided to mark as read');
      return;
    }
    
    // Clear unread count and flags
    const previousUnreadCount = contact.unreadCount || 0;
    contact.unreadCount = 0;
    contact.hasUnread = false;
    contact.isNewMessage = false;
    
    // Determine the identifier for localStorage
    let identifier;
    if (contact.isGroup) {
      identifier = contact.conversation_id || contact.id;
    } else {
      identifier = contact.email || contact.conversation_id;
    }
    
    // Clear from localStorage
    if (identifier) {
      $scope.clearUnreadCount(identifier, contact.isGroup ? 'group' : 'contact');
      console.log('🗑️ Cleared unread count from localStorage for:', identifier);
    }
    
    // Update total unread count and page title
    $scope.calculateTotalUnreadCount();
    
    // Save updated unread counts
    $scope.saveUnreadCounts();
    
    // Hide context menu
    $scope.hideContextMenu();
    
    // Show success message
    const itemType = contact.isGroup ? 'group' : 'chat';
    const itemName = contact.name || contact.username || 'conversation';
    
    if (previousUnreadCount > 0) {
      ToastService.success(`Marked ${itemName} as read (${previousUnreadCount} unread messages cleared)`);
      console.log(`✅ Marked ${itemType} "${itemName}" as read, cleared ${previousUnreadCount} unread messages`);
    } else {
      ToastService.info(`${itemName} was already marked as read`);
      console.log(`ℹ️ ${itemType} "${itemName}" was already marked as read`);
    }
  };

  $scope.addToFavorites = function(contact) {
    if (contact.isGroup) {
      // Favorite group
      ChatService.favoriteGroup(contact.id).then(function(response) {
        if (response && typeof response.favorited !== 'undefined') {
          // Update the contact object immediately
          contact.favorited = response.favorited;
          contact.is_favorited = response.favorited;
          
          // Also update in the groups arrays
          const updateGroupInArray = function(arr) {
            const group = arr.find(g => g.id === contact.id);
            if (group) {
              group.favorited = response.favorited;
              group.is_favorited = response.favorited;
            }
          };
          
          updateGroupInArray($scope.groups);
          updateGroupInArray($scope.archivedGroups);
          updateGroupInArray($scope.filteredGroups);
        }
        // Reload groups to get updated state from server
        $scope.loadGroups();
      }).catch(function(error) {
        console.error('Failed to favorite group:', error);
        ToastService.error('Failed to favorite group');
      });
    } else {
      // Favorite contact
      UserService.favoriteContact(contact.email).then(function(response) {
        // Update the contact's favorited status based on API response
        if (response && typeof response.favorited !== 'undefined') {
          contact.favorited = response.favorited;
          contact.is_favorited = response.favorited;
        }
        $scope.loadContacts();
      });
    }
    $scope.hideContextMenu();
  };

  // Block Contact Confirmation Modal
  $scope.blockContactConfirmation = {
    show: false,
    contact: null
  };

  $scope.confirmBlockContact = function(contact) {
    console.log('📋 Opening block confirmation for:', contact.name, 'Email:', contact.email);
    console.log('📋 Full contact object:', contact);
    
    // Create a clean copy of the contact to avoid reference issues
    $scope.blockContactConfirmation = {
      show: true,
      contact: {
        email: contact.email,
        name: contact.name,
        username: contact.username,
        profile_picture: contact.profile_picture
      }
    };
  };

  $scope.cancelBlockContact = function() {
    $scope.blockContactConfirmation = {
      show: false,
      contact: null
    };
  };

  $scope.executeBlockContact = function() {
    const contact = $scope.blockContactConfirmation.contact;
    if (contact && contact.email) {
      console.log('🚫 Blocking contact:', contact.email, 'Name:', contact.name);
      
      // Store contact info before making the API call
      const contactEmail = contact.email;
      const contactName = contact.name || contact.username;
      
      UserService.blockContact(contactEmail).then(function(response) {
        console.log('✅ Contact blocked successfully:', response);
        ToastService.success('Blocked ' + contactName);
        
        // Close contact info modal if open
        if ($scope.contactInfoModal.show) {
          $scope.closeContactInfo();
        }
        
        // Close the chat if it's the selected contact
        if ($scope.selectedContact && $scope.selectedContact.email === contactEmail) {
          $scope.selectedContact = null;
          ChatService.currentConversation = null;
        }
        
        // Reload contacts list
        $scope.loadContacts();
      }).catch(function(error) {
        console.error('❌ Failed to block contact:', error);
        ToastService.error(error.data?.message || 'Failed to block contact');
      });
    } else {
      console.error('❌ No contact or email found for blocking');
      ToastService.error('Cannot block contact: missing information');
    }
    
    // Always close the confirmation modal
    $scope.cancelBlockContact();
  };

  $scope.archiveInsteadOfBlock = function() {
    const contact = $scope.blockContactConfirmation.contact;
    if (contact && contact.email) {
      console.log('📦 Archiving contact instead of blocking:', contact.email, 'Name:', contact.name);
      
      // Store contact info before making the API call
      const contactEmail = contact.email;
      const contactName = contact.name || contact.username;
      
      // Use UserService.archiveContact instead of $scope.archiveContact
      UserService.archiveContact(contactEmail).then(function(response) {
        console.log('✅ Contact archived successfully:', response);
        ToastService.success('Archived ' + contactName);
        
        // Close contact info modal if open
        if ($scope.contactInfoModal.show) {
          $scope.closeContactInfo();
        }
        
        // Close the chat if it's the selected contact
        if ($scope.selectedContact && $scope.selectedContact.email === contactEmail) {
          $scope.selectedContact = null;
          ChatService.currentConversation = null;
        }
        
        // Reload contacts list
        $scope.loadContacts();
      }).catch(function(error) {
        console.error('❌ Failed to archive contact:', error);
        ToastService.error(error.data?.message || 'Failed to archive contact');
      });
    } else {
      console.error('❌ No contact or email found for archiving');
      ToastService.error('Cannot archive contact: missing information');
    }
    
    // Always close the confirmation modal
    $scope.cancelBlockContact();
  };

  // Legacy block contact function (now shows confirmation)
  $scope.blockContact = function(contact) {
    $scope.confirmBlockContact(contact);
    $scope.hideContextMenu();
  };

  // Blocked Users Modal
  $scope.blockedUsersModal = {
    show: false,
    loading: false,
    searchQuery: '',
    blockedUsers: []
  };

  $scope.openBlockedUsersModal = function() {
    console.log('📋 Opening blocked users modal');
    $scope.blockedUsersModal.show = true;
    $scope.blockedUsersModal.loading = true;
    $scope.blockedUsersModal.searchQuery = '';
    
    // Fetch blocked users
    UserService.getBlockedUsers().then(function(blockedUsers) {
      console.log('✅ Fetched blocked users:', blockedUsers);
      $scope.blockedUsersModal.blockedUsers = blockedUsers || [];
      $scope.blockedUsersModal.loading = false;
    }).catch(function(error) {
      console.error('❌ Failed to fetch blocked users:', error);
      $scope.blockedUsersModal.blockedUsers = [];
      $scope.blockedUsersModal.loading = false;
      ToastService.error('Failed to load blocked users');
    });
  };

  $scope.closeBlockedUsersModal = function() {
    $scope.blockedUsersModal.show = false;
    $scope.blockedUsersModal.searchQuery = '';
  };

  $scope.getFilteredBlockedUsers = function() {
    if (!$scope.blockedUsersModal.searchQuery) {
      return $scope.blockedUsersModal.blockedUsers;
    }
    
    const query = $scope.blockedUsersModal.searchQuery.toLowerCase();
    return $scope.blockedUsersModal.blockedUsers.filter(function(user) {
      const name = (user.name || '').toLowerCase();
      const username = (user.username || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      
      return name.includes(query) || username.includes(query) || email.includes(query);
    });
  };

  $scope.unblockUser = function(user) {
    console.log('🔓 Unblocking user:', user.email);
    user.unblocking = true;
    
    UserService.unblockContact(user.email).then(function() {
      console.log('✅ User unblocked successfully');
      ToastService.success('Unblocked ' + (user.name || user.username));
      
      // Remove from blocked users list
      const index = $scope.blockedUsersModal.blockedUsers.indexOf(user);
      if (index > -1) {
        $scope.blockedUsersModal.blockedUsers.splice(index, 1);
      }
      
      // Reload contacts to update UI
      $scope.loadContacts();
    }).catch(function(error) {
      console.error('❌ Failed to unblock user:', error);
      ToastService.error(error.data?.message || 'Failed to unblock user');
      user.unblocking = false;
    });
  };


  // Leave group
  $scope.leaveGroup = function(group) {
    if (!group.isGroup) {
      console.error('Cannot leave a non-group conversation');
      return;
    }

    // Show confirmation modal
    $scope.leaveGroupConfirmation = {
      show: true,
      group: group
    };
    $scope.hideContextMenu();
  };

  $scope.confirmLeaveGroup = function() {
    const group = $scope.leaveGroupConfirmation.group;
    if (group) {
      ChatService.leaveGroup(group.id).then(function() {
        ToastService.success('Left group successfully');
        
        // Close the chat if it's the selected group
        if ($scope.selectedContact && $scope.selectedContact.email === group.id) {
          $scope.selectedContact = null;
          ChatService.currentConversation = null;
        }
        
        // Reload groups list
        $scope.loadGroups();
      }).catch(function(error) {
        console.error('Failed to leave group:', error);
        ToastService.error('Failed to leave group');
      });
    }
    $scope.cancelLeaveGroup();
  };

  $scope.cancelLeaveGroup = function() {
    $scope.leaveGroupConfirmation = {
      show: false,
      group: null
    };
  };

  // Delete chat functions
  $scope.deleteChat = function(contact) {
    $scope.deleteChatConfirmation = {
      show: true,
      contact: contact
    };
    $scope.hideContextMenu();
  };

  $scope.confirmDeleteChat = function() {
    const contact = $scope.deleteChatConfirmation.contact;
    if (contact) {
      if (contact.isGroup) {
        // Delete group
        ChatService.deleteGroup(contact.id).then(function() {
          ToastService.success('Group deleted successfully');
          
          // Close the chat if it's the selected group
          if ($scope.selectedContact && $scope.selectedContact.email === contact.id) {
            $scope.selectedContact = null;
            ChatService.currentConversation = null;
          }
          
          // Reload groups list
          $scope.loadGroups();
        }).catch(function(error) {
          console.error('Failed to delete group:', error);
          
          // Provide more specific error message
          let errorMessage = 'Failed to delete group';
          if (error.data && error.data.message) {
            errorMessage = error.data.message;
          } else if (error.status === 403) {
            errorMessage = 'You do not have permission to delete this group';
          } else if (error.status === 404) {
            errorMessage = 'Group not found';
          }
          
          ToastService.error(errorMessage);
        });
      } else {
        // Delete contact chat
        console.log('Delete chat confirmed:', contact);
        // TODO: Implement actual delete functionality for contacts
        ToastService.success('Chat deleted');
      }
    }
    $scope.cancelDeleteChat();
  };

  $scope.cancelDeleteChat = function() {
    $scope.deleteChatConfirmation = {
      show: false,
      contact: null
    };
  };

  // Remove Contact Confirmation
  $scope.removeContactConfirmation = {
    show: false,
    contact: null
  };

  $scope.showRemoveContactConfirmation = function(contact) {
    $scope.removeContactConfirmation = {
      show: true,
      contact: contact
    };
  };

  $scope.confirmRemoveContact = function() {
    const contact = $scope.removeContactConfirmation.contact;
    if (contact) {
      console.log('Remove contact confirmed:', contact);
      UserService.removeContact(contact.email).then(function() {
        // Close contact info modal if open
        if ($scope.contactInfoModal.show) {
          $scope.closeContactInfo();
        }
        
        // Close the chat if it's the selected contact
        if ($scope.selectedContact && $scope.selectedContact.email === contact.email) {
          $scope.selectedContact = null;
          ChatService.currentConversation = null;
        }
        
        // Reload contacts list
        $scope.loadContacts().then(function() {
          // Refresh search results if there's an active search
          if ($scope.searchQuery && $scope.searchQuery.trim().length > 0 && $scope.isEmployee()) {
            $scope.isSearching = true;
            UserService.searchUsers($scope.searchQuery).then(function(results) {
              $timeout(function() {
                $scope.searchResults = results;
                
                // Filter out global users who are already in contacts
                if (results.global && results.global.length > 0) {
                  const contactEmails = (results.contacts || []).map(c => c.email);
                  $scope.searchResults.global = results.global.filter(user => 
                    !contactEmails.includes(user.email)
                  );
                }
                
                $scope.isSearching = false;
              });
            }).catch(function(error) {
              console.error('Search refresh failed:', error);
              $scope.searchResults = { contacts: [], global: [] };
              $scope.isSearching = false;
            });
          }
        });
      }).catch(function(error) {
        console.error('Failed to remove contact:', error);
      });
    }
    $scope.cancelRemoveContact();
  };

  $scope.cancelRemoveContact = function() {
    $scope.removeContactConfirmation = {
      show: false,
      contact: null
    };
  };

  // Search Contact Context Menu
  $scope.searchContactMenu = {
    show: false,
    contact: null,
    x: 0,
    y: 0
  };

  $scope.showSearchContactMenu = function(event, contact) {
    event.preventDefault();
    event.stopPropagation();
    
    $scope.searchContactMenu = {
      show: true,
      contact: contact,
      x: event.clientX,
      y: event.clientY
    };
  };

  $scope.hideSearchContactMenu = function() {
    $scope.searchContactMenu = {
      show: false,
      contact: null,
      x: 0,
      y: 0
    };
  };

  $scope.viewChatFromMenu = function() {
    const contact = $scope.searchContactMenu.contact;
    if (contact) {
      $scope.selectContact(contact);
    }
    $scope.hideSearchContactMenu();
  };

  $scope.removeContactFromMenu = function() {
    const contact = $scope.searchContactMenu.contact;
    if (contact) {
      $scope.showRemoveContactConfirmation(contact);
    }
    $scope.hideSearchContactMenu();
  };

  // Close search contact menu when clicking outside
  angular.element(document).on('click', function(event) {
    if ($scope.searchContactMenu.show) {
      $timeout(function() {
        $scope.hideSearchContactMenu();
      });
    }
  });

  $scope.formatJoinDate = function(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  $scope.formatMessageTime = function(dateString) {
    if (!dateString) return '';
    
    // Parse ISO format date
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '';
    }
    
    if (diffInHours < 24) {
      // Show time for messages from today
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffInHours < 24 * 7) {
      // Show day and time for messages from this week
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      // Show full date for older messages
      return date.toLocaleDateString('en-US', { 
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
  };

  $scope.toggleTheme = function() {
    ThemeService.toggleTheme();
  };

  // Theme functionality
  $scope.showThemeDropdown = false;
  
  $scope.selectTheme = function(theme) {
    ThemeService.setTheme(theme);
    $scope.showThemeDropdown = false;
  };

  // Close theme dropdown when clicking outside (not needed but keeping for consistency)
  $scope.closeThemeDropdown = function() {
    $scope.showThemeDropdown = false;
  };

  // Group chat backup functionality
  $scope.backupDropdownOpen = false;
  $scope.adminGroups = [];
  $scope.selectedGroupForBackup = null;
  $scope.exportingGroup = false;
  $scope.importingGroup = false;

  // Get groups where user is admin or owner
  $scope.getAdminGroups = function() {
    if (!$scope.groups || !$scope.currentUser) return [];
    
    return $scope.groups.filter(function(group) {
      return group.owner === $scope.currentUser.email || 
             (group.admins && group.admins.includes($scope.currentUser.email));
    });
  };

  // Toggle backup dropdown
  $scope.toggleBackupDropdown = function() {
    $scope.backupDropdownOpen = !$scope.backupDropdownOpen;
    if ($scope.backupDropdownOpen) {
      $scope.adminGroups = $scope.getAdminGroups();
    }
  };

  // Close backup dropdown
  $scope.closeBackupDropdown = function() {
    $scope.backupDropdownOpen = false;
  };

  // Export group chat
  $scope.exportGroupChat = function(group) {
    if ($scope.exportingGroup) return;
    
    $scope.exportingGroup = true;
    $scope.selectedGroupForBackup = group;
    
    // Use $timeout to ensure scope is applied
    $timeout(function() {
      ChatService.exportGroupChat(group.conversation_id || group.id).then(function(response) {
        // Create blob and download file
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${group.name}_chat_backup_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        ToastService.success(`Successfully exported ${group.name} chat history`);
        $scope.closeBackupDropdown();
      }).catch(function(error) {
        console.error('Failed to export group chat:', error);
        if (error.data && error.data.message) {
          ToastService.error(error.data.message);
        } else if (error.status === 404) {
          ToastService.error('Group chat not found or you do not have permission to export it');
        } else if (error.status === 403) {
          ToastService.error('You do not have permission to export this group chat');
        } else {
          ToastService.error('Failed to export group chat. Please try again.');
        }
      }).finally(function() {
        $timeout(function() {
          $scope.exportingGroup = false;
          $scope.selectedGroupForBackup = null;
        });
      });
    });
  };

  // Handle file selection for import
  $scope.onImportFileSelected = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Check if file is CSV
    if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
      ToastService.error('Please select a CSV file only');
      event.target.value = ''; // Clear the input
      return;
    }

    $scope.importGroupChat(file);
  };

  // Import group chat
  $scope.importGroupChat = function(csvFile) {
    if ($scope.importingGroup) return;
    
    $scope.importingGroup = true;
    
    // Use $timeout to ensure scope is applied
    $timeout(function() {
      ChatService.importGroupChat(csvFile).then(function(response) {
        ToastService.success('Successfully imported group chat data');
        
        // Reload groups list
        $scope.loadGroups().then(function() {
          // Apply current filter
          $scope.filterGroups($scope.groupFilter);
        });
        
        // Clear file input
        const fileInput = document.getElementById('importCsvFile');
        if (fileInput) {
          fileInput.value = '';
        }
      }).catch(function(error) {
        console.error('Failed to import group chat:', error);
        if (error.data && error.data.message) {
          ToastService.error(error.data.message);
        } else if (error.status === 400) {
          ToastService.error('Invalid CSV file format. Please check your file and try again.');
        } else if (error.status === 413) {
          ToastService.error('File is too large. Please try with a smaller file.');
        } else {
          ToastService.error('Failed to import group chat. Please check the CSV format.');
        }
      }).finally(function() {
        $timeout(function() {
          $scope.importingGroup = false;
        });
      });
    });
  };

  // Trigger file input click
  $scope.triggerImportFile = function() {
    document.getElementById('importCsvFile').click();
  };

  // Get group picture from API data
  $scope.getGroupPicture = function(group) {
    if (group && group.picture) {
      return group.picture;
    }
    if (group && group.group_picture) {
      return group.group_picture;
    }
    // Fallback to a default group avatar if no picture is provided
    return 'data:image/svg+xml;base64,' + btoa(`
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="120" fill="#2d2d2d"/>
        <circle cx="60" cy="45" r="20" fill="#ffffff"/>
        <path d="M20 100 C20 80, 40 70, 60 70 C80 70, 100 80, 100 100 L100 120 L20 120 Z" fill="#ffffff"/>
      </svg>
    `);
  };

  // Check if group is imported (based on is_imported field from API)
  $scope.isImportedGroup = function(group) {
    if (!group) return false;
    return group.is_imported === true;
  };


  // Check if message should be hidden in imported groups (media-only messages)
  $scope.shouldHideMessageInImportedGroup = function(message) {
    if (!$scope.selectedContact || !$scope.selectedContact.isGroup || !$scope.isImportedGroup($scope.selectedContact)) {
      return false; // Not an imported group, show all messages
    }
    
    // Hide messages that are only media (image or file) with no text content
    const isMediaOnly = (message.type === 'image' || message.type === 'file' || 
                        message.imageUrl || message.file_name) && 
                       (!message.content || message.content.trim() === '');
    
    return isMediaOnly;
  };

  // Enhanced profile picture function with fallback
  $scope.getProfilePicture = function(profilePicture) {
    if (profilePicture && profilePicture !== '' && !profilePicture.includes('placeholder')) {
      return profilePicture;
    }
    
    // Return a default user avatar SVG data URL
    return 'data:image/svg+xml;base64,' + btoa(`
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="60" fill="#374151"/>
        <circle cx="60" cy="45" r="20" fill="#9CA3AF"/>
        <path d="M20 100c0-22.091 17.909-40 40-40s40 17.909 40 40" fill="#9CA3AF"/>
      </svg>
    `);
  };

  $scope.isMessageFromMe = function(message) {
    return $scope.currentUser && message.sender_id === $scope.currentUser.id;
  };

  $scope.getProfilePicture = function(filename) {
    return UserService.getProfilePicture(filename);
  };

  // Message rendering functions
  $scope.isTextMessage = function(message) {
    return !message.type || message.type === 'text';
  };

  $scope.isImageMessage = function(message) {
    return message.type === 'image';
  };

  $scope.isFileMessage = function(message) {
    return message.type === 'file';
  };

  // Discord-style message helper functions
  $scope.getMessageSenderAvatar = function(message) {
    if (message.sender_avatar) {
      return UserService.getProfilePicture(message.sender_avatar);
    }
    return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(message.sender_name || 'User') + '&background=9333ea&color=fff&size=128';
  };

  $scope.getMessageSenderName = function(message) {
    return message.sender_name || message.sender || 'Unknown';
  };

  // Check if message is from current user
  $scope.isMessageFromMe = function(message) {
    return $scope.currentUser && (message.sender === $scope.currentUser.email);
  };

  // Infinite scroll - load older messages
  $scope.loadOlderMessages = function() {
    if (!ChatService.currentConversation || $scope.loadingOlderMessages || !ChatService.hasMoreMessages) {
      return;
    }

    if ($scope.messages.length === 0) {
      return;
    }

    $scope.loadingOlderMessages = true;
    const oldestMessage = $scope.messages[0];
    const beforeId = oldestMessage.id || oldestMessage._id;

    ChatService.loadMessages(ChatService.currentConversation.id, beforeId).then(function(result) {
      $scope.messages = ChatService.messages;
      $scope.loadingOlderMessages = false;
      
      // Update hasMoreMessages flag
      ChatService.hasMoreMessages = result.hasMore;
    }).catch(function(error) {
      console.error('Failed to load older messages:', error);
      ToastService.error('Failed to load older messages');
      $scope.loadingOlderMessages = false;
    });
  };

  // Jump to Present button state
  $scope.showJumpToPresent = false;

  // Scroll handling
  $scope.onScroll = function(event) {
    const element = event.target;
    
    // Calculate distance from bottom
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    
    // Show "Jump to Present" button if user scrolled up more than ~10 messages worth (approximately 500px)
    $scope.$apply(function() {
      $scope.showJumpToPresent = distanceFromBottom > 500;
    });
    
    // Check if scrolled to top (load more messages)
    if (element.scrollTop === 0 && !$scope.loadingOlderMessages && ChatService.hasMoreMessages) {
      const scrollHeight = element.scrollHeight;
      
      $scope.loadOlderMessages();
      
      // Maintain scroll position after loading older messages
      $timeout(function() {
        const newScrollHeight = element.scrollHeight;
        const scrollDiff = newScrollHeight - scrollHeight;
        element.scrollTop = scrollDiff;
      }, 100);
    }
  };

  $scope.jumpToPresent = function() {
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      $scope.showJumpToPresent = false;
    }
  };

  $scope.scrollToBottom = function(force) {
    $timeout(function() {
      const messagesContainer = document.getElementById('messages-container');
      if (messagesContainer) {
        // Only auto-scroll if forced or user is near bottom (within 100px)
        const isNearBottom = force || (messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight) < 100;
        
        if (isNearBottom) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
          $scope.showJumpToPresent = false;
        }
      }
    }, 50);
  };

  // Scroll to a specific message (for reply clicks)
  $scope.scrollToReplyMessage = function(replyId) {
    if (!replyId) return;
    
    $timeout(function() {
      const messageElement = document.getElementById('message-' + replyId);
      if (messageElement) {
        // Scroll to the message
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add highlight class
        messageElement.classList.add('message-highlight');
        
        // Remove highlight after 2 seconds
        $timeout(function() {
          messageElement.classList.remove('message-highlight');
        }, 2000);
      }
    }, 100);
  };

  // Media handling functions
  $scope.isMediaMessage = function(message) {
    return message.media_url && !message.content;
  };

  $scope.isAudioFile = function(filename) {
    if (!filename) return false;
    const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'];
    const ext = filename.split('.').pop().toLowerCase();
    return audioExtensions.includes(ext);
  };

  $scope.isImageFile = function(filename) {
    if (!filename) return false;
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    const ext = filename.split('.').pop().toLowerCase();
    return imageExtensions.includes(ext);
  };

  $scope.downloadMediaFile = function(message) {
    // For images, check if we should open lightbox or download
    if (message.isImage && message.imageUrl && message.file_name) {
      // Open lightbox instead of downloading
      $scope.openLightbox(message.imageUrl, $scope.getAllImageUrls());
      return;
    }
    
    // For non-images, download the file
    if (message.download_url && message.file_name) {
      // For files, use the download URL
      ChatService.downloadFile(message.download_url, message.file_name).catch(function(error) {
        ToastService.error('Failed to download file');
      });
    }
  };

  $scope.getMediaUrl = function(message) {
    // For images, use the blob URL created during processing
    if (message.isImage && message.imageUrl) {
      return message.imageUrl;
    }
    // For files, construct the download URL
    if (message.download_url) {
      return window.APP_CONFIG.API_BASE_URL + message.download_url;
    }
    return null;
  };

  // Reply functionality
  $scope.replyingTo = null;

  $scope.replyToMessage = function(message) {
    $scope.replyingTo = {
      id: message.id || message._id,
      sender_name: message.sender_name || message.sender_info?.name || message.sender_info?.username,
      content: message.content || (message.type === 'image' ? '📷 Image' : message.type === 'file' ? '📎 File' : 'Message')
    };
    
    // Focus on the message input
    $timeout(function() {
      const textarea = document.querySelector('textarea[ng-model="messageInput"]');
      if (textarea) {
        textarea.focus();
      }
    }, 100);
  };

  $scope.cancelReply = function() {
    $scope.replyingTo = null;
  };

  $scope.forwardMessage = function(message) {
    console.log('📤 Opening forward modal for message:', message);
    
    // Store the message to forward
    $scope.forwardModal = {
      show: true,
      message: message,
      searchQuery: '',
      activeTab: 'chats',
      filteredChats: [],
      filteredGroups: [],
      isSearching: false
    };
    
    // Initialize with current contacts and groups
    $scope.updateForwardLists();
  };

  $scope.getFileIcon = function(fileName) {
    if (!fileName) return 'file';
    
    const ext = fileName.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) return 'document';
    if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) return 'spreadsheet';
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'wma'].includes(ext)) return 'audio';
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) return 'archive';
    
    return 'file';
  };

  $scope.formatFileSize = function(bytes) {
    if (!bytes) return '';
    return FileService.formatFileSize(bytes);
  };

  $scope.downloadFile = function(message) {
    // For images from socket (base64), open lightbox
    if (message.file_data && message.file_name && message.type === 'image') {
      const imageUrl = 'data:image/jpeg;base64,' + message.file_data;
      $scope.openLightbox(imageUrl, $scope.getAllImageUrls());
      return;
    }
    
    // For files, download them
    if (message.file_data && message.file_name) {
      try {
        // Convert base64 to blob and download
        const byteCharacters = atob(message.file_data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray]);
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = message.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Failed to download file:', error);
        ToastService.error('Failed to download file');
      }
    }
  };

  // Check if file is an audio file (kept for backward compatibility with old messages)
  $scope.isAudioFile = function(fileName) {
    if (!fileName) return false;
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma', '.opus'];
    const lowerFileName = fileName.toLowerCase();
    return audioExtensions.some(ext => lowerFileName.endsWith(ext));
  };

  // Check if file is a video file (kept for backward compatibility with old messages)
  $scope.isVideoFile = function(fileName) {
    if (!fileName) return false;
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv'];
    const lowerFileName = fileName.toLowerCase();
    return videoExtensions.some(ext => lowerFileName.endsWith(ext));
  };

  // Check if file is a PDF file (kept for backward compatibility with old messages)
  $scope.isPDFFile = function(fileName) {
    if (!fileName) return false;
    return fileName.toLowerCase().endsWith('.pdf');
  };

  // Build media URL for streaming/viewing/downloading
  $scope.getMediaUrl = function(message, type = 'stream') {
    if (!message.media_url) return null;
    
    // Get message ID from message object
    const messageId = message._id || message.id;
    
    // Extract filename from media_url
    // Format: /uploads/{message_id}/{filename}
    const parts = message.media_url.split('/');
    const filename = parts[parts.length - 1]; // Get last part (filename)
    
    const token = AuthService.getToken();
    const baseUrl = window.APP_CONFIG.API_BASE_URL;
    
    // Build URL: /media/{type}/{message_id}/{filename}
    const url = `${baseUrl}/media/${type}/${messageId}/${filename}`;
    return url;
  };

  // Get filename from media_url
  $scope.getMediaFilename = function(message) {
    if (!message.media_url) return message.file_name || 'file';
    const parts = message.media_url.split('/');
    return parts[parts.length - 1] || message.file_name || 'file';
  };

  // Helper function to check if a message is deleted
  $scope.isMessageDeleted = function(message) {
    if (!message) return false;
    return !!(message.is_deleted || message.deleted);
  };

  // Build raw media URL (not trusted, for downloads and window.open)
  function getRawMediaUrl(message, type = 'stream') {
    if (!message.media_url) return null;
    
    // Get message ID from message object
    const messageId = message._id || message.id;
    
    // Extract filename from media_url
    const parts = message.media_url.split('/');
    const filename = parts[parts.length - 1];
    
    const baseUrl = window.APP_CONFIG.API_BASE_URL;
    
    // Build URL: /media/{type}/{message_id}/{filename}
    return `${baseUrl}/media/${type}/${messageId}/${filename}`;
  }

  // PDF Preview popup
  $scope.pdfPreview = {
    show: false,
    url: null,
    filename: null
  };

  $scope.openPDFPreview = function(message) {
    // Handle newer messages with media_url
    if (message.media_url) {
      const url = getRawMediaUrl(message, 'view');
      const token = AuthService.getToken();
      
      // Fetch PDF with authentication and create blob URL
      fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => response.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        $timeout(function() {
          $scope.pdfPreview.url = $sce.trustAsResourceUrl(blobUrl);
          $scope.pdfPreview.filename = $scope.getMediaFilename(message);
          $scope.pdfPreview.show = true;
        });
      })
      .catch(error => {
        console.error('Failed to load PDF:', error);
        ToastService.error('Failed to load PDF');
      });
    }
    // Handle older messages with file_data (base64)
    else if (message.file_data && message.file_name && message.file_name.toLowerCase().endsWith('.pdf')) {
      try {
        // Convert base64 to blob
        const byteCharacters = atob(message.file_data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        const blobUrl = URL.createObjectURL(blob);
        $timeout(function() {
          $scope.pdfPreview.url = $sce.trustAsResourceUrl(blobUrl);
          $scope.pdfPreview.filename = message.file_name;
          $scope.pdfPreview.show = true;
        });
      } catch (error) {
        console.error('Failed to load PDF from base64:', error);
        ToastService.error('Failed to load PDF');
      }
    }
    else {
      ToastService.error('PDF file not available');
    }
  };

  $scope.closePDFPreview = function() {
    // Revoke blob URL to free memory
    if ($scope.pdfPreview.url) {
      const url = $scope.pdfPreview.url.toString();
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    }
    $scope.pdfPreview.show = false;
    $scope.pdfPreview.url = null;
    $scope.pdfPreview.filename = null;
  };

  // Helper function to get PDF page count (placeholder - could be enhanced with actual PDF parsing)
  $scope.getPDFPageCount = function(message) {
    // For now, return a placeholder. In a real implementation, you might:
    // 1. Store page count in message metadata when file is uploaded
    // 2. Parse PDF to get actual page count
    // 3. Use a PDF library to extract this information
    return message.pdf_pages || null;
  };

  // Helper function to get file size in human readable format
  $scope.getFileSize = function(message) {
    if (message.file_size) {
      const bytes = parseInt(message.file_size);
      if (bytes === 0) return '0 B';
      
      const k = 1024;
      const sizes = ['B', 'kB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    return null;
  };

  // Helper function to get file size in human readable format
  $scope.getFileSize = function(message) {
    if (message.file_size) {
      const bytes = parseInt(message.file_size);
      if (bytes === 0) return '0 B';
      
      const k = 1024;
      const sizes = ['B', 'kB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    // Fallback: try to estimate from filename or return placeholder
    return null;
  };

  // Download file using new media endpoint with proper authentication
  $scope.downloadMediaFile = function(message) {
    const downloadUrl = getRawMediaUrl(message, 'download');
    const token = AuthService.getToken();
    const filename = $scope.getMediaFilename(message);
    
    // Fetch file with authentication
    fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Download failed');
      }
      return response.blob();
    })
    .then(blob => {
      // Create blob URL and trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      ToastService.success('Download started');
    })
    .catch(error => {
      console.error('Failed to download file:', error);
      ToastService.error('Failed to download file');
    });
  };


  // Format time in MM:SS format
  function formatAudioTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
  }

  // Toggle audio playback
  $scope.toggleAudioPlayback = function(message) {
    const audioId = 'audio-' + (message._id || message.id);
    const audioElement = document.getElementById(audioId);
    
    if (!audioElement) {
      console.error('Audio element not found:', audioId);
      return;
    }

    // Stop all other audio players
    $scope.messages.forEach(function(msg) {
      if (msg !== message && msg.audioPlaying) {
        const otherId = 'audio-' + (msg._id || msg.id);
        const otherAudio = document.getElementById(otherId);
        if (otherAudio) {
          otherAudio.pause();
          otherAudio.currentTime = 0;
        }
        $timeout(function() {
          msg.audioPlaying = false;
          msg.audioProgress = 0;
          msg.audioCurrentTime = '0:00';
        });
      }
    });

    if (message.audioPlaying) {
      // Pause
      audioElement.pause();
      $timeout(function() {
        message.audioPlaying = false;
      });
    } else {
      // Set the audio source if not already set
      if (!audioElement.src || audioElement.src === window.location.href) {
        const url = getRawMediaUrl(message, 'stream');
        const token = AuthService.getToken();
        
        console.log('Loading audio from URL:', url);
        console.log('Using token:', token ? 'Token present (length: ' + token.length + ')' : 'NO TOKEN');
        
        if (!token) {
          console.error('No authentication token available');
          ToastService.error('Authentication required. Please refresh the page.');
          return;
        }
        
        // Fetch audio with authentication and create blob URL
        fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        .then(response => {
          console.log('Audio fetch response status:', response.status);
          console.log('Audio fetch response headers:', response.headers);
          if (!response.ok) {
            if (response.status === 401) {
              throw new Error('Authentication failed. Please refresh the page and try again.');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.blob();
        })
        .then(blob => {
          console.log('Audio blob created, size:', blob.size, 'type:', blob.type);
          const blobUrl = URL.createObjectURL(blob);
          audioElement.src = blobUrl;
          
          // Store blob URL for cleanup
          message.audioBlobUrl = blobUrl;
          
          // Play after setting source
          return audioElement.play();
        })
        .then(function() {
          $timeout(function() {
            message.audioPlaying = true;
            
            // Set duration once loaded
            if (!message.audioDuration && audioElement.duration) {
              message.audioDuration = formatAudioTime(audioElement.duration);
            }
          });
        })
        .catch(function(error) {
          console.error('Failed to play audio:', error);
          ToastService.error('Failed to play audio: ' + error.message);
        });
      } else {
        // Audio already loaded, just play
        audioElement.play().then(function() {
          $timeout(function() {
            message.audioPlaying = true;
            
            // Set duration once loaded
            if (!message.audioDuration && audioElement.duration) {
              message.audioDuration = formatAudioTime(audioElement.duration);
            }
          });
        }).catch(function(error) {
          console.error('Failed to play audio:', error);
          ToastService.error('Failed to play audio');
        });
      }

      // Update progress
      audioElement.ontimeupdate = function() {
        $timeout(function() {
          if (audioElement.duration) {
            message.audioProgress = (audioElement.currentTime / audioElement.duration) * 100;
            message.audioCurrentTime = formatAudioTime(audioElement.currentTime);
            if (!message.audioDuration) {
              message.audioDuration = formatAudioTime(audioElement.duration);
            }
          }
        });
      };

      // Handle audio end
      audioElement.onended = function() {
        $timeout(function() {
          message.audioPlaying = false;
          message.audioProgress = 0;
          message.audioCurrentTime = '0:00';
          audioElement.currentTime = 0;
        });
      };

      // Load metadata to get duration
      audioElement.onloadedmetadata = function() {
        $timeout(function() {
          message.audioDuration = formatAudioTime(audioElement.duration);
        });
      };
    }
  };

  // Custom Audio Player Functions
  $scope.toggleCustomAudio = function(message) {
    const audioId = 'custom-audio-' + (message._id || message.id);
    const audioElement = document.getElementById(audioId);
    
    if (!audioElement) {
      console.error('Custom audio element not found:', audioId);
      return;
    }

    // Stop all other custom audio players
    $scope.messages.forEach(function(msg) {
      if (msg !== message && msg.customAudioPlaying) {
        const otherId = 'custom-audio-' + (msg._id || msg.id);
        const otherAudio = document.getElementById(otherId);
        if (otherAudio) {
          otherAudio.pause();
        }
        $timeout(function() {
          msg.customAudioPlaying = false;
          msg.customAudioProgress = 0;
          msg.customAudioCurrentTime = '0:00';
        });
      }
    });

    if (message.customAudioPlaying) {
      // Pause
      audioElement.pause();
      $timeout(function() {
        message.customAudioPlaying = false;
      });
    } else {
      // Play
      audioElement.play().then(function() {
        $timeout(function() {
          message.customAudioPlaying = true;
          
          // Set duration once loaded
          if (!message.customAudioDuration && audioElement.duration) {
            message.customAudioDuration = formatAudioTime(audioElement.duration);
          }
        });
      }).catch(function(error) {
        console.error('Failed to play custom audio:', error);
        ToastService.error('Failed to play audio');
      });
    }

    // Update progress
    audioElement.ontimeupdate = function() {
      $timeout(function() {
        if (audioElement.duration) {
          message.customAudioProgress = (audioElement.currentTime / audioElement.duration) * 100;
          message.customAudioCurrentTime = formatAudioTime(audioElement.currentTime);
          if (!message.customAudioDuration) {
            message.customAudioDuration = formatAudioTime(audioElement.duration);
          }
        }
      });
    };

    // Handle audio end
    audioElement.onended = function() {
      $timeout(function() {
        message.customAudioPlaying = false;
        message.customAudioProgress = 0;
        message.customAudioCurrentTime = '0:00';
        audioElement.currentTime = 0;
      });
    };

    // Load metadata to get duration
    audioElement.onloadedmetadata = function() {
      $timeout(function() {
        message.customAudioDuration = formatAudioTime(audioElement.duration);
      });
    };
  };

  $scope.seekCustomAudio = function(message, event) {
    const audioId = 'custom-audio-' + (message._id || message.id);
    const audioElement = document.getElementById(audioId);
    
    if (!audioElement || !audioElement.duration) {
      return;
    }

    // Get click position relative to progress bar
    const progressBar = event.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    
    // Seek to position
    audioElement.currentTime = audioElement.duration * percentage;
    
    $timeout(function() {
      message.customAudioProgress = percentage * 100;
      message.customAudioCurrentTime = formatAudioTime(audioElement.currentTime);
    });
  };


  $scope.$on('user:typing', function(event, data) {
    console.log('Typing event received:', data);
    
    // Don't show typing indicator for self (data.user is email)
    if ($scope.currentUser && data.user === $scope.currentUser.email) {
      console.log('Ignoring typing from self');
      return;
    }
    
    // Show typing for current conversation in chat window
    if (ChatService.currentConversation && data.conversation_id === ChatService.currentConversation.id) {
      console.log('Setting typing user in chat window:', data.user);
      $timeout(function() {
        $scope.typingUsers[data.user] = true;
      });
    }
    
    // Always update contact card typing state (works outside conversation too)
    const contact = $scope.contacts.find(c => c.email === data.user);
    if (contact) {
      console.log('Setting typing indicator on contact card for:', data.user);
      $timeout(function() {
        contact.isTyping = true;
      });
    }
  });

  $scope.$on('user:stop_typing', function(event, data) {
    console.log('Stop typing event received:', data);
    
    // Remove from chat window typing users
    $timeout(function() {
      delete $scope.typingUsers[data.user];
    });
    
    // Always update contact card typing state
    const contact = $scope.contacts.find(c => c.email === data.user);
    if (contact) {
      console.log('Removing typing indicator from contact card for:', data.user);
      $timeout(function() {
        contact.isTyping = false;
      });
    }
  });

  // Handle presence updates with grace period for reconnections
  $scope.presenceGracePeriods = {}; // Track users who might be reconnecting
  $scope.userPresenceStatus = 'online'; // Track current user's presence
  $scope.lastActivityTime = Date.now();
  $scope.idleTimeout = null;
  
  // Activity tracking - reset idle timer on any user interaction
  $scope.resetIdleTimer = function() {
    $scope.lastActivityTime = Date.now();
    
    // If we were idle, go back to online
    if ($scope.userPresenceStatus === 'idle') {
      $scope.userPresenceStatus = 'online';
      SocketService.setPresenceOnline();
      console.log('User became active again - setting presence to online');
    }
    
    // Clear existing idle timeout
    if ($scope.idleTimeout) {
      $timeout.cancel($scope.idleTimeout);
    }
    
    // Set new idle timeout (5 minutes of inactivity = idle)
    $scope.idleTimeout = $timeout(function() {
      $scope.userPresenceStatus = 'idle';
      SocketService.setPresenceIdle();
      console.log('User went idle after 5 minutes of inactivity');
    }, 120000); // 2 minutes = 120000ms
  };
  
  // Initialize activity tracking
  $timeout(function() {
    $scope.resetIdleTimer();
    
    // Listen for user activity on document
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'touchmove'];
    
    activityEvents.forEach(function(eventType) {
      document.addEventListener(eventType, function() {
        $scope.resetIdleTimer();
      }, { passive: true });
    });
    
    console.log('Idle detection initialized - will go idle after 5 minutes of inactivity');
  }, 1000);
  
  // Listen for contact list updates (when someone adds/removes you as a contact)
  $scope.$on('contact:list_updated', function(event, data) {
    console.log('📇 Contact list update received:', data);
    // Reload contacts to reflect the change
    $scope.loadContacts().then(function() {
      console.log('✅ Contacts refreshed after update');
      $scope.$apply();
    });
  });
  
  $scope.$on('user:presence', function(event, data) {
    console.log('Presence update received:', data);
    // data = { user: email, status: "online"/"idle"/"offline", last_seen: timestamp }
    
    // Find contact by email
    const contact = $scope.contacts.find(c => c.email === data.user);
    if (!contact) return;
    
    if (data.status === 'online' || data.status === 'idle') {
      // User is online or idle - cancel any pending offline timeout
      if ($scope.presenceGracePeriods[data.user]) {
        $timeout.cancel($scope.presenceGracePeriods[data.user]);
        delete $scope.presenceGracePeriods[data.user];
      }
      
      // Update status immediately
      contact.online = data.status === 'online';
      contact.idle = data.status === 'idle';
      if (data.last_seen) {
        contact.last_seen = data.last_seen;
      }
      
      // Update selected contact if it's the same person
      if ($scope.selectedContact && $scope.selectedContact.email === data.user) {
        $scope.selectedContact.online = contact.online;
        $scope.selectedContact.idle = contact.idle;
        $scope.selectedContact.last_seen = contact.last_seen;
      }
      
      // Update group settings modal member info if open
      if ($scope.groupSettingsModal && $scope.groupSettingsModal.memberInfo && $scope.groupSettingsModal.memberInfo[data.user]) {
        $scope.groupSettingsModal.memberInfo[data.user].online = contact.online;
        $scope.groupSettingsModal.memberInfo[data.user].idle = contact.idle;
        $scope.groupSettingsModal.memberInfo[data.user].last_seen = contact.last_seen;
        console.log('👤 Updated group member presence:', data.user, 'Status:', data.status);
      }
      
      // Update user profile popup if open and showing this user
      if ($scope.userProfilePopup.show && $scope.userProfilePopup.user && $scope.userProfilePopup.user.email === data.user) {
        $scope.userProfilePopup.user.online = contact.online;
        $scope.userProfilePopup.user.idle = contact.idle;
        $scope.userProfilePopup.user.last_seen = contact.last_seen;
        console.log('👤 Updated user profile popup presence:', data.user, 'Status:', data.status);
      }
      
      $scope.$apply();
    } else if (data.status === 'offline') {
      // User went offline - mark immediately (backend already has grace period)
      contact.online = false;
      contact.idle = false;
      if (data.last_seen) {
        contact.last_seen = data.last_seen;
      }
      
      // Update selected contact if it's the same person
      if ($scope.selectedContact && $scope.selectedContact.email === data.user) {
        $scope.selectedContact.online = false;
        $scope.selectedContact.idle = false;
        $scope.selectedContact.last_seen = contact.last_seen;
      }
      
      // Update group settings modal member info if open
      if ($scope.groupSettingsModal && $scope.groupSettingsModal.memberInfo && $scope.groupSettingsModal.memberInfo[data.user]) {
        $scope.groupSettingsModal.memberInfo[data.user].online = false;
        $scope.groupSettingsModal.memberInfo[data.user].idle = false;
        $scope.groupSettingsModal.memberInfo[data.user].last_seen = contact.last_seen;
        console.log('👤 Updated group member presence (offline):', data.user);
      }
      
      // Update user profile popup if open and showing this user
      if ($scope.userProfilePopup.show && $scope.userProfilePopup.user && $scope.userProfilePopup.user.email === data.user) {
        $scope.userProfilePopup.user.online = false;
        $scope.userProfilePopup.user.idle = false;
        $scope.userProfilePopup.user.last_seen = contact.last_seen;
        console.log('👤 Updated user profile popup presence (offline):', data.user);
      }
      
      $scope.$apply();
    }
  });

  // Socket event handlers for real-time message updates
  $scope.$on('message:new', function(event, message) {
    console.log('Received new message event:', message);
    console.log('Message type:', message.type, 'Has media_url:', !!message.media_url);
    console.log('Current conversation:', ChatService.currentConversation);
    
    if (ChatService.currentConversation && message.conversation_id === ChatService.currentConversation.id) {
      console.log('Message is for current conversation, adding to messages');
      
      // For media messages, force a refresh to ensure proper loading
      if (message.type === 'image' || message.type === 'file' || message.media_url) {
        console.log('Media message detected, refreshing messages from API');
        $timeout(function() {
          ChatService.loadMessages(ChatService.currentConversation.id).then(function() {
            $scope.messages = ChatService.messages;
            console.log('Messages refreshed after media message, count:', $scope.messages.length);
            $scope.scrollToBottomUniversal(false);
          });
        }, 500);
      } else {
        // For text messages, add directly
        ChatService.addMessage(message);
        $timeout(function() {
          $scope.messages = ChatService.messages;
          console.log('Updated scope messages, count:', $scope.messages.length);
          // Auto-scroll for new messages (will only scroll if user is near bottom)
          $scope.scrollToBottomUniversal(false);
        }, 100);
      }
    } else {
      console.log('Message is for different conversation');
      // Message is for a different conversation - increment unread count
      // Check both contacts and groups
      let contact = $scope.contacts.find(c => c.conversation_id === message.conversation_id);
      if (!contact) {
        contact = $scope.groups.find(g => g.id === message.conversation_id);
      }
      
      if (contact) {
        contact.unreadCount = (contact.unreadCount || 0) + 1;
        
        // Show notification if not from current user
        if (message.sender !== $scope.currentUser.email) {
          const senderName = contact.name || contact.username || 'Someone';
          const messagePreview = message.content || (message.type === 'image' ? '📷 Sent an image' : message.type === 'file' ? '📎 Sent a file' : 'Sent a message');
          $scope.showNotification(senderName, messagePreview, contact.profile_picture || contact.picture);
        }
      }
    }
    
    // Update last message for the contact/group in the sidebar
    let contact = $scope.contacts.find(c => c.conversation_id === message.conversation_id);
    let isGroup = false;
    if (!contact) {
      contact = $scope.groups.find(g => g.id === message.conversation_id);
      isGroup = true;
    }
    
    if (contact) {
      $timeout(function() {
        contact.lastMessageContent = message.content || (message.type === 'image' ? '📷 Image' : message.type === 'file' ? '📎 File' : 'Message');
        contact.lastMessageTime = message.created_at;
        
        // Re-sort to move this conversation to the top (WhatsApp style)
        if (isGroup) {
          $scope.filterGroups($scope.groupFilter);
        } else {
          $scope.filterContacts($scope.filter);
        }
      });
    }
  });

  $scope.$on('message:updated', function(event, data) {
    console.log('Message updated event received:', data);
    // Since socket rooms ensure we only get events for our conversation, just refetch
    if (ChatService.currentConversation) {
      $timeout(function() {
        ChatService.loadMessages(ChatService.currentConversation.id).then(function() {
          $scope.messages = ChatService.messages;
          $scope.updatePinnedMessages(); // Update pinned messages list
          console.log('Messages reloaded after update');
        });
      }, 100);
    }
  });
  
  // Handle pinned message notifications with correct pinner info
  $scope.$on('message:pinned', function(event, data) {
    console.log('📌 Message pinned event received:', data);
    
    // data contains: message_id, pinned, pinned_by, pinned_at, message_sender, message_content
    if (data.pinned) {
      // Get the name of the person who pinned it (not the message sender!)
      const pinnerName = $scope.getUserDisplayName(data.pinned_by);
      
      // Show notification with correct pinner
      ToastService.info(`${pinnerName} pinned a message to this chat`);
      console.log(`✅ Showing correct pin notification: ${pinnerName} pinned the message (not ${data.message_sender})`);
    } else {
      // Get the name of the person who unpinned it
      const unpinnerName = $scope.getUserDisplayName(data.pinned_by);
      ToastService.info(`${unpinnerName} unpinned a message`);
      console.log(`✅ Showing correct unpin notification: ${unpinnerName} unpinned the message`);
    }
  });
  
  // Helper function to get user display name from email
  $scope.getUserDisplayName = function(email) {
    if (!email) return 'Someone';
    
    // Check if it's the current user
    if ($scope.currentUser && email === $scope.currentUser.email) {
      return 'You';
    }
    
    // Search in contacts
    const contact = $scope.contacts.find(c => c.email === email);
    if (contact) {
      return contact.name || contact.username || email.split('@')[0];
    }
    
    // Search in group members if viewing a group
    if ($scope.selectedContact && $scope.selectedContact.isGroup && $scope.selectedContact.members) {
      const member = $scope.selectedContact.members.find(m => m.email === email);
      if (member) {
        return member.name || member.username || email.split('@')[0];
      }
    }
    
    // Fallback to email username part
    return email.split('@')[0];
  };

  $scope.$on('message:deleted', function(event, data) {
    console.log('Message deleted event received');
    
    // Since socket rooms ensure we only get events for our conversation, just refetch
    if (ChatService.currentConversation) {
      $timeout(function() {
        ChatService.loadMessages(ChatService.currentConversation.id).then(function() {
          $scope.messages = ChatService.messages;
          $scope.updatePinnedMessages(); // Update pinned messages list
          
          // Force Angular to re-evaluate all bindings
          if (!$scope.$$phase) {
            $scope.$apply();
          }
        });
      }, 100);
    }
  });

  // Group event handlers for real-time updates
  $scope.$on('group:member_added', function(event, data) {
    console.log('Group member added event received:', data);
    // data = { conversation_id, member_email, member_info }
    
    // Reload groups list to get updated member count
    $scope.loadGroups();
    
    // If this is the currently selected group, update its info
    if ($scope.selectedContact && $scope.selectedContact.isGroup && $scope.selectedContact.conversation_id === data.conversation_id) {
      $scope.refreshCurrentGroupInfo();
    }
    
    // If group settings modal is open for this group, refresh it
    if ($scope.groupSettingsModal.show && $scope.groupSettingsModal.group && $scope.groupSettingsModal.group.id === data.conversation_id) {
      $scope.refreshGroupSettingsModal();
    }
  });

  $scope.$on('group:member_removed', function(event, data) {
    console.log('Group member removed event received:', data);
    // data = { conversation_id, member_email }
    
    // Reload groups list to get updated member count
    $scope.loadGroups();
    
    // If this is the currently selected group, update its info
    if ($scope.selectedContact && $scope.selectedContact.isGroup && $scope.selectedContact.conversation_id === data.conversation_id) {
      $scope.refreshCurrentGroupInfo();
    }
    
    // If group settings modal is open for this group, refresh it
    if ($scope.groupSettingsModal.show && $scope.groupSettingsModal.group && $scope.groupSettingsModal.group.id === data.conversation_id) {
      $scope.refreshGroupSettingsModal();
    }
  });

  $scope.$on('group:updated', function(event, data) {
    console.log('Group updated event received:', data);
    // data = { conversation_id, updated_fields }
    
    // Reload groups list to get updated info
    $scope.loadGroups();
    
    // If this is the currently selected group, update its info
    if ($scope.selectedContact && $scope.selectedContact.isGroup && $scope.selectedContact.conversation_id === data.conversation_id) {
      $scope.refreshCurrentGroupInfo();
    }
    
    // If group settings modal is open for this group, refresh it
    if ($scope.groupSettingsModal.show && $scope.groupSettingsModal.group && $scope.groupSettingsModal.group.id === data.conversation_id) {
      $scope.refreshGroupSettingsModal();
    }
  });

  // Helper functions for real-time group updates
  $scope.refreshCurrentGroupInfo = function() {
    if (!$scope.selectedContact || !$scope.selectedContact.isGroup) return;
    
    const groupId = $scope.selectedContact.conversation_id;
    console.log('Refreshing current group info for group:', groupId);
    
    // Find the group in the current groups list and update from there
    const allGroups = ($scope.groups || []).concat($scope.archivedGroups || []);
    const updatedGroup = allGroups.find(g => g.id === groupId);
    
    if (updatedGroup) {
      // Update from existing groups data (most reliable)
      $scope.selectedContact.participants = updatedGroup.participants;
      $scope.selectedContact.members_count = updatedGroup.members_count || updatedGroup.participant_count || (updatedGroup.participants ? updatedGroup.participants.length : 0);
      $scope.selectedContact.roles = updatedGroup.roles || [];
      $scope.selectedContact.role_assignments = updatedGroup.role_assignments || {};
      $scope.selectedContact.admins = updatedGroup.admins || [];
      $scope.selectedContact.owner = updatedGroup.owner;
      
      console.log('Current group info refreshed from groups list, new member count:', $scope.selectedContact.members_count);
      
      // Force UI update
      $scope.$applyAsync();
    } else {
      console.warn('Group not found in current groups list, may need to reload groups');
      // Reload groups if the current group is not found
      $scope.loadGroups();
    }
  };

  $scope.refreshGroupSettingsModal = function() {
    if (!$scope.groupSettingsModal.show || !$scope.groupSettingsModal.group) return;
    
    const groupId = $scope.groupSettingsModal.group.id;
    console.log('Refreshing group settings modal for group:', groupId);
    
    // Find the group in the current groups list and update from there
    const allGroups = ($scope.groups || []).concat($scope.archivedGroups || []);
    const updatedGroup = allGroups.find(g => g.id === groupId);
    
    if (updatedGroup) {
      // Update from existing groups data (most reliable)
      $scope.groupSettingsModal.group.participants = updatedGroup.participants;
      $scope.groupSettingsModal.group.members_count = updatedGroup.members_count || updatedGroup.participant_count || (updatedGroup.participants ? updatedGroup.participants.length : 0);
      $scope.groupSettingsModal.roles = updatedGroup.roles || [];
      $scope.groupSettingsModal.roleAssignments = updatedGroup.role_assignments || {};
      $scope.groupSettingsModal.admins = updatedGroup.admins || [];
      $scope.groupSettingsModal.group.owner = updatedGroup.owner;
      
      // Refresh member info for new participants
      if (updatedGroup.participants) {
        updatedGroup.participants.forEach(function(email) {
          $scope.fetchMemberInfo(email);
        });
      }
      
      console.log('Group settings modal refreshed from groups list, new member count:', $scope.groupSettingsModal.group.members_count);
      
      // Force UI update
      $scope.$applyAsync();
    } else {
      console.warn('Group not found in current groups list for settings modal, may need to reload groups');
      // Reload groups if the current group is not found
      $scope.loadGroups();
    }
  };

  // Track if we should auto-scroll (only when user is near bottom)
  $scope.shouldAutoScroll = true;
  
  $scope.$watch(function() {
    return ChatService.messages;
  }, function(newMessages, oldMessages) {
    if (newMessages === oldMessages) return;
    
    $scope.messages = newMessages;
    
    // Only auto-scroll if user is near the bottom
    $scope.scrollToBottomUniversal(false);
  }, true);

  // Lightbox functions
  $scope.getAllImageUrls = function() {
    const imageUrls = [];
    
    $scope.messages.forEach(function(message) {
      // Images from database (media messages)
      if (message.isImage && message.imageUrl) {
        imageUrls.push(message.imageUrl);
      }
      // Images from socket (base64)
      else if (message.type === 'image' && message.file_data) {
        imageUrls.push('data:image/jpeg;base64,' + message.file_data);
      }
    });
    
    return imageUrls;
  };

  // Date divider helper - Check if we need to show a date divider
  $scope.shouldShowDateDivider = function(currentMessage, previousMessage) {
    if (!previousMessage) {
      return true; // Always show divider for first message
    }
    
    const currentDate = new Date(currentMessage.created_at);
    const previousDate = new Date(previousMessage.created_at);
    
    // Check if dates are different days
    return currentDate.toDateString() !== previousDate.toDateString();
  };

  // Format date for divider
  $scope.formatDateDivider = function(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    // Check if it's yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Format as "January 12, 2026"
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Format time only (for grouped messages)
  $scope.formatTimeOnly = function(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '';
    }
    
    // Return just the time in 12-hour format
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Message grouping - Check if message should show header (profile pic + name)
  $scope.shouldShowMessageHeader = function(currentMessage, previousMessage, currentIndex) {
    // Always show header for first message
    if (!previousMessage || currentIndex === 0) {
      return true;
    }
    
    // Show header if different sender
    if (currentMessage.sender !== previousMessage.sender) {
      return true;
    }
    
    // Show header if there's a reply (replies always show full header)
    if (currentMessage.reply_info) {
      return true;
    }
    
    // Show header if time gap is more than 2 minutes (120 seconds)
    const currentTime = new Date(currentMessage.created_at).getTime();
    const previousTime = new Date(previousMessage.created_at).getTime();
    const timeDiff = (currentTime - previousTime) / 1000; // in seconds
    
    if (timeDiff > 120) {
      return true;
    }
    
    // Count consecutive messages from same sender
    let consecutiveCount = 1;
    for (let i = currentIndex - 1; i >= 0; i--) {
      if ($scope.messages[i].sender === currentMessage.sender) {
        consecutiveCount++;
      } else {
        break;
      }
    }
    
    // Show header every 12 messages
    if (consecutiveCount > 12 && consecutiveCount % 12 === 1) {
      return true;
    }
    
    return false;
  };

  $scope.openLightbox = function(imageUrl, allImages) {
    $scope.lightbox.images = allImages || [imageUrl];
    $scope.lightbox.currentImage = imageUrl;
    $scope.lightbox.currentIndex = $scope.lightbox.images.indexOf(imageUrl);
    $scope.lightbox.show = true;
    
    // Add keyboard listener
    angular.element(document).on('keydown.lightbox', function(event) {
      $scope.$apply(function() {
        if (event.key === 'ArrowLeft') {
          $scope.previousImage();
        } else if (event.key === 'ArrowRight') {
          $scope.nextImage();
        } else if (event.key === 'Escape') {
          $scope.closeLightbox();
        }
      });
    });
  };

  $scope.closeLightbox = function() {
    $scope.lightbox.show = false;
    $scope.lightbox.currentImage = null;
    $scope.lightbox.images = [];
    $scope.lightbox.currentIndex = 0;
    
    // Remove keyboard listener
    angular.element(document).off('keydown.lightbox');
  };

  $scope.nextImage = function() {
    if ($scope.lightbox.images.length > 1) {
      $scope.lightbox.currentIndex = ($scope.lightbox.currentIndex + 1) % $scope.lightbox.images.length;
      $scope.lightbox.currentImage = $scope.lightbox.images[$scope.lightbox.currentIndex];
    }
  };

  $scope.previousImage = function() {
    if ($scope.lightbox.images.length > 1) {
      $scope.lightbox.currentIndex = ($scope.lightbox.currentIndex - 1 + $scope.lightbox.images.length) % $scope.lightbox.images.length;
      $scope.lightbox.currentImage = $scope.lightbox.images[$scope.lightbox.currentIndex];
    }
  };

  $scope.init();

  // Watch messageInput for real-time character count updates and draft saving
  $scope.$watch('messageInput', function(newValue, oldValue) {
    if (newValue !== oldValue) {
      const currentLength = newValue ? newValue.length : 0;
      $scope.characterCount = currentLength;
      $scope.showCharacterCount = currentLength >= ($scope.maxMessageLength - 30);
      
      // Save draft whenever messageInput changes
      $scope.saveDraft();
    }
  });

  // Clean up timeouts on scope destroy
  $scope.$on('$destroy', function() {
    if ($scope.usernameCheckTimeout) {
      $timeout.cancel($scope.usernameCheckTimeout);
    }
    if ($scope.searchTimeout) {
      $timeout.cancel($scope.searchTimeout);
    }
    if ($scope.checkSocketConnection) {
      clearInterval($scope.checkSocketConnection);
    }
    if ($scope.presenceFetchInterval) {
      clearInterval($scope.presenceFetchInterval);
    }
    if ($scope.typingTimeout) {
      $timeout.cancel($scope.typingTimeout);
    }
  });

  // Emoji picker functions
  $scope.toggleEmojiPicker = function() {
    $scope.showEmojiPicker = !$scope.showEmojiPicker;
    
    if ($scope.showEmojiPicker) {
      // Initialize emoji picker after DOM update
      $timeout(function() {
        let picker = document.querySelector('emoji-picker');
        
        if (!picker) {
          // Create picker if it doesn't exist
          picker = document.createElement('emoji-picker');
          picker.className = 'dark';
          
          // Set custom properties for dark theme
          picker.style.setProperty('--background', '#000000');
          picker.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.1)');
          picker.style.setProperty('--indicator-color', 'rgba(255, 255, 255, 0.3)');
          picker.style.setProperty('--input-border-color', 'rgba(255, 255, 255, 0.1)');
          picker.style.setProperty('--input-font-color', 'rgba(255, 255, 255, 0.9)');
          picker.style.setProperty('--input-placeholder-color', 'rgba(255, 255, 255, 0.5)');
          picker.style.setProperty('--outline-color', 'rgba(255, 255, 255, 0.3)');
          picker.style.setProperty('--category-font-color', 'rgba(255, 255, 255, 0.7)');
          picker.style.setProperty('--button-hover-background', 'rgba(255, 255, 255, 0.1)');
          picker.style.setProperty('--button-active-background', 'rgba(255, 255, 255, 0.15)');
          
          const container = document.getElementById('emojiPickerPopup');
          if (container) {
            container.appendChild(picker);
          }
        }
        
        if (picker && !picker._initialized) {
          picker._initialized = true;
          picker.addEventListener('emoji-click', function(event) {
            const emoji = event.detail.unicode;
            const textarea = document.querySelector('textarea[ng-model="messageInput"]');
            if (textarea) {
              const cursorPos = textarea.selectionStart || 0;
              const textBefore = $scope.messageInput.substring(0, cursorPos);
              const textAfter = $scope.messageInput.substring(cursorPos);
              
              $scope.$apply(function() {
                $scope.messageInput = textBefore + emoji + textAfter;
              });
              
              // Set cursor position after emoji
              $timeout(function() {
                textarea.focus();
                const newPos = cursorPos + emoji.length;
                textarea.setSelectionRange(newPos, newPos);
              });
            }
            
            // Close picker after selection
            $scope.$apply(function() {
              $scope.showEmojiPicker = false;
            });
          });
        }
      }, 100);
    }
  };

  // Hide context menu when clicking elsewhere
  angular.element(document).on('click', function(event) {
    $scope.$apply(function() {
      $scope.hideContextMenu();
      
      // Close attachment menu if clicking outside
      if ($scope.showAttachmentMenu) {
        const attachmentMenu = event.target.closest('.attachment-menu');
        const plusButton = event.target.closest('button[ng-click="toggleAttachmentMenu()"]');
        
        if (!attachmentMenu && !plusButton) {
          $scope.closeAttachmentMenu();
        }
      }

      // Close emoji picker if clicking outside
      if ($scope.showEmojiPicker) {
        const emojiPicker = event.target.closest('.emoji-picker-popup');
        const emojiButton = event.target.closest('button[ng-click="toggleEmojiPicker()"]');
        
        if (!emojiPicker && !emojiButton) {
          $scope.showEmojiPicker = false;
        }
      }

      // Close filter dropdown if clicking outside
      if ($scope.showFilterDropdown) {
        const filterDropdown = event.target.closest('.filter-dropdown');
        const filterButton = event.target.closest('button[ng-click="toggleFilterDropdown()"]');
        
        if (!filterDropdown && !filterButton) {
          $scope.closeFilterDropdown();
        }
      }
    });
  });
  
  // Initialize jump to present loaded state
  $scope.jumpToPresentLoaded = false;
  $scope.$watch('showJumpToPresent', function(newVal) {
    if (newVal) {
      $timeout(function() {
        $scope.jumpToPresentLoaded = true;
      }, 50);
    } else {
      $scope.jumpToPresentLoaded = false;
    }
  });
}]);
