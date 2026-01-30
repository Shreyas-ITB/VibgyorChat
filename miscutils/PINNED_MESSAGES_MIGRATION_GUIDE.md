# Pinned Messages Migration Guide

## Problem Fixed
Previously, when a user pinned another user's message, the system would incorrectly show that the message author pinned their own message. For example:
- **Before**: "Sunil pinned a message to this chat" (when Shreyas actually pinned Sunil's message)
- **After**: "Shreyas pinned a message to this chat" (correctly shows who pinned it)

## Changes Made

### 1. Database Schema Changes
Added two new fields to the message model:
- `pinned_by` (string): Email of the user who pinned the message
- `pinned_at` (datetime): Timestamp when the message was pinned

### 2. Socket Event Changes
The `message_pinned` event now includes additional information:
```javascript
{
  "message_id": "...",
  "pinned": true/false,
  "pinned_by": "user@example.com",        // NEW: Who pinned it
  "pinned_at": "2024-01-25T12:00:00Z",    // NEW: When it was pinned
  "message_sender": "sender@example.com",  // NEW: Original message author
  "message_content": "Hello world"         // NEW: Message content
}
```

## Migration Steps

### Step 1: Backup Your Database
**IMPORTANT**: Always backup before running migrations!

```bash
# MongoDB backup
mongodump --uri="mongodb://localhost:27017" --db=VibgyorChats --out=./backup_before_pinned_migration
```

### Step 2: Update Backend Code
The code has already been updated in:
- `backend/models/message.py` - Added `pinned_by` and `pinned_at` fields
- `backend/utils/socket_server.py` - Updated `toggle_pin_message` event handler

### Step 3: Run Migration Script
This script updates existing pinned messages to include the new fields:

```bash
cd backend
python ../migrate_pinned_messages.py
```

**What the migration does:**
- Finds all pinned messages without `pinned_by` field
- Sets `pinned_by` to the message sender (as a fallback)
- Sets `pinned_at` to the message creation time (as a fallback)
- Future pins will correctly track who actually pinned them

**Expected Output:**
```
============================================================
Pinned Messages Migration Script
============================================================

🔍 Searching for pinned messages without pinned_by field...
📝 Found 5 pinned messages to migrate
  ✓ Updated message 507f1f77bcf86cd799439011 (pinned_by: user1@example.com)
  ✓ Updated message 507f1f77bcf86cd799439012 (pinned_by: user2@example.com)
  ...

✅ Migration complete! Updated 5 messages.
⚠️  Note: pinned_by was set to the message sender as a fallback.
   Future pins will correctly track who actually pinned the message.

============================================================
Migration finished!
============================================================
```

### Step 4: Update Frontend Code
Update your frontend to handle the new event data:

#### Before (Old Code):
```javascript
socket.on('message_pinned', (data) => {
  const { message_id, pinned } = data;
  // Only knew if message was pinned/unpinned
  // Had to use message.sender to show who pinned it (WRONG!)
});
```

#### After (New Code):
```javascript
socket.on('message_pinned', (data) => {
  const { 
    message_id, 
    pinned, 
    pinned_by,        // NEW: Who actually pinned it
    pinned_at,        // NEW: When it was pinned
    message_sender,   // NEW: Original message author
    message_content   // NEW: Message content
  } = data;
  
  // Now you can correctly show:
  // "{pinned_by} pinned a message to this chat"
  // Instead of incorrectly showing the message_sender
});
```

#### Example Frontend Update:
```javascript
// Display pinned message notification
const displayPinNotification = (data) => {
  if (data.pinned) {
    // Use pinned_by instead of message_sender
    const pinnerName = getUserName(data.pinned_by);
    showNotification(`${pinnerName} pinned a message to this chat`);
  } else {
    const unpinnerName = getUserName(data.pinned_by);
    showNotification(`${unpinnerName} unpinned a message`);
  }
};
```

### Step 5: Test the Changes

#### Test Case 1: Pin a Message
1. User A sends a message
2. User B pins User A's message
3. **Expected**: System shows "User B pinned a message to this chat"
4. **Not**: "User A pinned a message to this chat"

#### Test Case 2: Unpin a Message
1. User B unpins the message
2. **Expected**: System shows "User B unpinned a message"

#### Test Case 3: Fetch Pinned Messages
When fetching messages, pinned messages should now include:
```json
{
  "_id": "...",
  "sender": "user1@example.com",
  "content": "Hello",
  "pinned": true,
  "pinned_by": "user2@example.com",
  "pinned_at": "2024-01-25T12:00:00Z"
}
```

### Step 6: Verify Migration Success

Run this MongoDB query to verify all pinned messages have the new fields:

```javascript
// In MongoDB shell or Compass
db.messages.find({ 
  pinned: true, 
  $or: [
    { pinned_by: { $exists: false } },
    { pinned_at: { $exists: false } }
  ]
}).count()

// Should return 0 if migration was successful
```

## Rollback Plan

If you need to rollback:

### 1. Restore Database Backup
```bash
mongorestore --uri="mongodb://localhost:27017" --db=VibgyorChats ./backup_before_pinned_migration/VibgyorChats
```

### 2. Revert Code Changes
```bash
git revert <commit-hash>
```

## Notes

- **Backward Compatibility**: The new fields are optional, so the system won't break if they're missing
- **Existing Pinned Messages**: Will show the message sender as the pinner (fallback behavior)
- **New Pins**: Will correctly track who actually pinned the message
- **Performance**: No performance impact - only adds two small fields to pinned messages

## Support

If you encounter any issues during migration:
1. Check the migration script output for errors
2. Verify MongoDB connection settings in `.env`
3. Ensure you have write permissions to the database
4. Check that all pinned messages have valid sender emails

## Summary

✅ **What's Fixed**: Pinned messages now correctly show who pinned them, not who authored them
✅ **Migration Required**: Yes, run `migrate_pinned_messages.py` once
✅ **Frontend Changes**: Update socket event handlers to use `pinned_by` instead of `message_sender`
✅ **Backward Compatible**: Yes, system handles missing fields gracefully
