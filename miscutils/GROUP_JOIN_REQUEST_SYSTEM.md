# Group Join Request System - Complete Guide

## Overview
The group join request system requires admin/owner approval before users can join a group. This prevents unauthorized access and gives group administrators control over membership.

---

## How It Works - Step by Step

### Step 1: User Requests to Join
**Endpoint:** `POST /conversations/group/join`

**Request Body:**
```json
{
  "conversation_id": "group_id_here"
}
```

**What Happens:**
1. User clicks a group invite link or tries to join a group
2. System checks if user is already a member → If yes, returns "already_member"
3. System checks if user already has a pending request → If yes, returns "already_requested"
4. System creates a pending join request in the conversation document
5. **Real-time broadcast** sent to all online admins and owner via Socket.IO

**Response:**
```json
{
  "success": true,
  "conversation_id": "...",
  "message": "Join request sent. Waiting for admin approval.",
  "status": "pending",
  "group_name": "My Group",
  "requested_at": "2024-01-25T10:30:00Z"
}
```

**Socket.IO Event Sent to Admins:**
- **Event Name:** `group_join_request`
- **Data:**
```json
{
  "type": "join_request",
  "conversation_id": "...",
  "group_name": "My Group",
  "requester": {
    "email": "user@example.com",
    "name": "John Doe",
    "username": "johndoe",
    "profile_picture": "..."
  },
  "requested_at": "2024-01-25T10:30:00Z",
  "message": "John Doe wants to join My Group"
}
```

---

### Step 2: Admin/Owner Views Pending Requests
**Endpoint:** `GET /conversations/group/join/pending?conversation_id=group_id`

**Who Can Access:** Only group owner or admins

**Response:**
```json
{
  "success": true,
  "conversation_id": "...",
  "group_name": "My Group",
  "pending_requests": [
    {
      "email": "user@example.com",
      "requested_at": "2024-01-25T10:30:00Z",
      "status": "pending",
      "user_info": {
        "name": "John Doe",
        "username": "johndoe",
        "profile_picture": "...",
        "created_at": "2024-01-01T00:00:00Z"
      }
    }
  ],
  "count": 1
}
```

---

### Step 3A: Admin/Owner Approves Request
**Endpoint:** `POST /conversations/group/join/approve`

**Request Body:**
```json
{
  "conversation_id": "group_id_here",
  "requester_email": "user@example.com"
}
```

**What Happens:**
1. Validates that requester is owner or admin
2. Removes request from `pending_join_requests`
3. Adds user to group `participants`
4. Adds group to user's `group_list`
5. **Real-time broadcasts** sent via Socket.IO:
   - To requester: "Your request was approved"
   - To other admins: "Admin X approved user Y"

**Response:**
```json
{
  "success": true,
  "conversation_id": "...",
  "requester_email": "user@example.com",
  "message": "Successfully approved user@example.com to join the group",
  "action": "approved"
}
```

**Socket.IO Events:**

**To Requester:**
- **Event Name:** `group_join_approved`
- **Data:**
```json
{
  "type": "join_request_approved",
  "conversation_id": "...",
  "group_name": "My Group",
  "approved_by": "admin@example.com",
  "message": "Your request to join My Group has been approved"
}
```

**To Other Admins:**
- **Event Name:** `group_join_request_update`
- **Data:**
```json
{
  "type": "join_request_processed",
  "conversation_id": "...",
  "group_name": "My Group",
  "requester_email": "user@example.com",
  "action": "approved",
  "processed_by": "admin@example.com"
}
```

---

### Step 3B: Admin/Owner Rejects Request
**Endpoint:** `POST /conversations/group/join/reject`

**Request Body:**
```json
{
  "conversation_id": "group_id_here",
  "requester_email": "user@example.com"
}
```

**What Happens:**
1. Validates that requester is owner or admin
2. Removes request from `pending_join_requests`
3. User is NOT added to the group
4. **Real-time broadcasts** sent via Socket.IO:
   - To requester: "Your request was rejected"
   - To other admins: "Admin X rejected user Y"

**Response:**
```json
{
  "success": true,
  "conversation_id": "...",
  "requester_email": "user@example.com",
  "message": "Successfully rejected user@example.com's join request",
  "action": "rejected"
}
```

**Socket.IO Events:**

**To Requester:**
- **Event Name:** `group_join_rejected`
- **Data:**
```json
{
  "type": "join_request_rejected",
  "conversation_id": "...",
  "group_name": "My Group",
  "rejected_by": "admin@example.com",
  "message": "Your request to join My Group has been rejected"
}
```

**To Other Admins:**
- **Event Name:** `group_join_request_update`
- **Data:**
```json
{
  "type": "join_request_processed",
  "conversation_id": "...",
  "group_name": "My Group",
  "requester_email": "user@example.com",
  "action": "rejected",
  "processed_by": "admin@example.com"
}
```

---

### Step 3C: User Cancels Their Own Request
**Endpoint:** `POST /conversations/group/join/cancel`

**Request Body:**
```json
{
  "conversation_id": "group_id_here"
}
```

**What Happens:**
1. User can cancel their own pending request at any time
2. Removes request from `pending_join_requests`
3. **Real-time notification** sent to all admins via Socket.IO

**Response:**
```json
{
  "success": true,
  "conversation_id": "...",
  "group_name": "My Group",
  "message": "Successfully cancelled your join request for My Group",
  "action": "cancelled"
}
```

**Socket.IO Event Sent to Admins:**
- **Event Name:** `group_join_request_cancelled`
- **Data:**
```json
{
  "type": "join_request_cancelled",
  "conversation_id": "...",
  "group_name": "My Group",
  "requester_email": "user@example.com",
  "message": "user@example.com cancelled their join request for My Group"
}
```

---

## Database Structure

### Conversation Document
```javascript
{
  "_id": ObjectId("..."),
  "type": "group",
  "group_name": "My Group",
  "participants": ["admin@example.com", "member@example.com"],
  "owner": "admin@example.com",
  "admins": ["admin2@example.com"],
  
  // NEW FIELD
  "pending_join_requests": [
    {
      "email": "user@example.com",
      "requested_at": ISODate("2024-01-25T10:30:00Z"),
      "status": "pending"
    }
  ]
}
```

---

## Frontend Implementation Guide

### 1. Listen for Socket.IO Events

```javascript
// For Admins/Owners - Listen for new join requests
socket.on('group_join_request', (data) => {
  console.log('New join request:', data);
  // Show notification to admin
  // Update pending requests list
  // data contains: conversation_id, group_name, requester info
});

// For Requesters - Listen for approval
socket.on('group_join_approved', (data) => {
  console.log('Request approved:', data);
  // Show success notification
  // Redirect to group or refresh group list
});

// For Requesters - Listen for rejection
socket.on('group_join_rejected', (data) => {
  console.log('Request rejected:', data);
  // Show rejection notification
});

// For Admins - Listen for updates from other admins
socket.on('group_join_request_update', (data) => {
  console.log('Request processed by another admin:', data);
  // Remove request from pending list
  // Show notification that another admin handled it
});
```

### 2. User Flow - Requesting to Join

```javascript
async function requestToJoinGroup(conversationId) {
  try {
    const response = await fetch('/conversations/group/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ conversation_id: conversationId })
    });
    
    const data = await response.json();
    
    if (data.already_member) {
      // User is already a member
      navigateToGroup(conversationId);
    } else if (data.already_requested) {
      // Request already pending
      showMessage('Your request is pending approval');
    } else if (data.status === 'pending') {
      // New request created
      showMessage('Join request sent! Waiting for admin approval.');
    }
  } catch (error) {
    console.error('Error requesting to join:', error);
  }
}
```

### 3. Admin Flow - Viewing Pending Requests

```javascript
async function fetchPendingRequests(conversationId) {
  try {
    const response = await fetch(
      `/conversations/group/join/pending?conversation_id=${conversationId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    const data = await response.json();
    
    // Display pending requests
    displayPendingRequests(data.pending_requests);
  } catch (error) {
    console.error('Error fetching pending requests:', error);
  }
}
```

### 4. Admin Flow - Approving/Rejecting

```javascript
async function approveRequest(conversationId, requesterEmail) {
  try {
    const response = await fetch('/conversations/group/join/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        requester_email: requesterEmail
      })
    });
    
    const data = await response.json();
    showMessage(`Approved ${requesterEmail}`);
    // Remove from pending list
  } catch (error) {
    console.error('Error approving request:', error);
  }
}

async function rejectRequest(conversationId, requesterEmail) {
  try {
    const response = await fetch('/conversations/group/join/reject', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        requester_email: requesterEmail
      })
    });
    
    const data = await response.json();
    showMessage(`Rejected ${requesterEmail}`);
    // Remove from pending list
  } catch (error) {
    console.error('Error rejecting request:', error);
  }
}
```

### 5. User Flow - Cancelling Request

```javascript
async function cancelJoinRequest(conversationId) {
  try {
    const response = await fetch('/conversations/group/join/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        conversation_id: conversationId
      })
    });
    
    const data = await response.json();
    showMessage('Join request cancelled');
    // Remove from user's pending requests list
  } catch (error) {
    console.error('Error cancelling request:', error);
  }
}
```

### 6. Listen for Cancellation Events (Admins)

```javascript
// For Admins - Listen for cancelled requests
socket.on('group_join_request_cancelled', (data) => {
  console.log('User cancelled their request:', data);
  // Remove request from pending list
  // Show notification that user cancelled
});
```

---

## Security Features

1. **Permission Checks:** Only owner and admins can approve/reject requests
2. **Duplicate Prevention:** System prevents duplicate pending requests
3. **Real-time Updates:** All admins see requests immediately
4. **Audit Trail:** `requested_at` timestamp tracks when requests were made

---

## Summary

**For Users:**
1. Click join link → Request sent → Wait for approval
2. Get real-time notification when approved/rejected
3. Can cancel request at any time before it's processed

**For Admins:**
1. Get real-time notification of new requests
2. View all pending requests
3. Approve or reject with one click
4. See when other admins process requests
5. Get notified when users cancel their requests

**Real-time Events:**
- `group_join_request` - New request notification (to admins)
- `group_join_approved` - Approval notification (to requester)
- `group_join_rejected` - Rejection notification (to requester)
- `group_join_request_update` - Admin action notification (to other admins)
- `group_join_request_cancelled` - Cancellation notification (to admins)
