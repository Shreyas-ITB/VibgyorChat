# Media URL Fix - Correct Format

## Problem
Previously, the code was extracting `message_id` from the `media_url` path:
```
media_url: "/uploads/chats/69771d50655b9f720654837c"
Extracted: messageId = "chats", filename = "69771d50655b9f720654837c"
Result: http://localhost:8000/media/download/chats/69771d50655b9f720654837c ❌
```

## Solution
Now using the message's `_id` or `id` field directly:
```javascript
// Get message ID from message object
const messageId = message._id || message.id;

// Extract only filename from media_url
const parts = message.media_url.split('/');
const filename = parts[parts.length - 1]; // Get last part
```

## Example
Given a message:
```javascript
{
  _id: "507f1f77bcf86cd799439011",
  media_url: "/uploads/507f1f77bcf86cd799439011/voice-message.ogg",
  type: "audio"
}
```

### Generated URLs:
- **Stream**: `http://localhost:8000/media/stream/507f1f77bcf86cd799439011/voice-message.ogg` ✅
- **View**: `http://localhost:8000/media/view/507f1f77bcf86cd799439011/voice-message.ogg` ✅
- **Download**: `http://localhost:8000/media/download/507f1f77bcf86cd799439011/voice-message.ogg` ✅

## Functions Updated
1. `$scope.getMediaUrl(message, type)` - For video/audio players
2. `getRawMediaUrl(message, type)` - For fetch requests (download, PDF preview, audio)

## Authentication
All requests use Bearer token:
```javascript
fetch(url, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

## File Types Handled
- **Video**: `.mp4`, `.webm`, `.mov`, `.avi`, `.mkv`, `.flv`
- **Audio**: `.mp3`, `.wav`, `.ogg`, `.m4a`, `.aac`, `.flac`, `.wma`, `.opus`
- **PDF**: `.pdf`
- **Other**: All other file types

All media endpoints now receive the correct format: `/media/{type}/{message_id}/{filename}`
