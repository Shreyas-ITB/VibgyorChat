# File Upload System - Quick Summary

## Problem Fixed
Socket.IO disconnects when uploading large files (especially videos) because WebSocket has payload size limits and base64 encoding increases file size.

## Solution
Added HTTP REST API endpoint for reliable file uploads.

## Changes Made

### 1. Message Model (`backend/models/message.py`)
```python
# Added video and file types
type: Literal["text", "image", "video", "file"]
```

### 2. New HTTP Upload Endpoint (`backend/routes/messages.py`)
```
POST /messages/upload
Content-Type: multipart/form-data

Form Fields:
- file (required): The file to upload
- conversation_id (required): Conversation ID
- content (optional): Caption/text
- reply_to (optional): Message ID to reply to
```

### 3. Socket.IO Configuration (`backend/utils/socket_server.py`)
```python
# Increased payload limits (but still recommend HTTP for large files)
max_http_buffer_size=50 * 1024 * 1024  # 50MB
ping_timeout=60
ping_interval=25
```

## Usage

### Frontend: Upload File via HTTP (RECOMMENDED)

```javascript
async function uploadFile(file, conversationId, caption = null) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('conversation_id', conversationId);
  if (caption) formData.append('content', caption);
  
  const response = await fetch('/messages/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  const data = await response.json();
  return data.message;
}

// Usage
const videoFile = document.getElementById('video-input').files[0];
const message = await uploadFile(videoFile, conversationId, 'Check this out!');
```

### With Progress Tracking

```javascript
function uploadWithProgress(file, conversationId, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('conversation_id', conversationId);
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = (e.loaded / e.total) * 100;
        onProgress(percent);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText).message);
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });
    
    xhr.open('POST', '/messages/upload');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

// Usage
uploadWithProgress(videoFile, conversationId, (progress) => {
  console.log(`Upload: ${progress.toFixed(2)}%`);
  updateProgressBar(progress);
});
```

## Supported File Types

### Images
- `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`
- Type: `"image"`

### Videos (NEW!)
- `.mp4`, `.webm`, `.mov`, `.avi`, `.mkv`, `.flv`
- Type: `"video"`

### Files
- All other types
- Type: `"file"`

## When to Use What

### Use HTTP Upload (RECOMMENDED)
✅ Videos (all sizes)
✅ Large images (> 5MB)
✅ Documents/files
✅ When you need progress tracking
✅ When reliability is important

### Use Socket.IO (Legacy)
⚠️ Small images only (< 5MB)
⚠️ Backward compatibility
⚠️ Real-time requirements

## Migration Example

### Before (Unreliable)
```javascript
// ❌ OLD WAY - Causes disconnections
function sendVideo(file, conversationId) {
  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result.split(',')[1];
    socket.emit('send_message', {
      conversation_id: conversationId,
      type: 'video',
      file_name: file.name,
      file_data: base64  // Large payload causes disconnect
    });
  };
  reader.readAsDataURL(file);
}
```

### After (Reliable)
```javascript
// ✅ NEW WAY - No disconnections
async function sendVideo(file, conversationId) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('conversation_id', conversationId);
  
  const response = await fetch('/messages/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  
  return (await response.json()).message;
}
```

## API Response

**Success (200):**
```json
{
  "success": true,
  "message": {
    "_id": "507f1f77bcf86cd799439011",
    "conversation_id": "507f1f77bcf86cd799439012",
    "sender": "user@example.com",
    "content": "Check out this video!",
    "type": "video",
    "media_url": "/uploads/chats/507f1f77bcf86cd799439011/video.mp4",
    "created_at": "2024-01-26T12:00:00Z"
  }
}
```

## Testing

```bash
# Test video upload
curl -X POST http://localhost:8000/messages/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@video.mp4" \
  -F "conversation_id=CONVERSATION_ID" \
  -F "content=Check this out!"
```

## Benefits

✅ **No More Disconnections** - HTTP is reliable for large files
✅ **Progress Tracking** - Show upload progress to users
✅ **Video Support** - Upload videos of any size
✅ **Better Error Handling** - Proper HTTP status codes
✅ **Resumable** - Can implement resume functionality
✅ **Faster** - No base64 encoding overhead

## Files Modified

- ✅ `backend/models/message.py` - Added video/file types
- ✅ `backend/routes/messages.py` - Added `/messages/upload` endpoint
- ✅ `backend/utils/socket_server.py` - Increased payload limits
- ✅ `FILE_UPLOAD_SYSTEM.md` - Complete documentation
- ✅ `FILE_UPLOAD_SUMMARY.md` - This file
- ✅ `API_EXAMPLES.json` - Added upload endpoint example

## No Migration Required

This is a new feature. Existing messages work as before. Just update frontend to use HTTP upload for new files.

## Summary

🎯 **Problem:** Socket disconnects with large files/videos
🔧 **Solution:** HTTP upload endpoint
🚀 **Result:** Reliable uploads, no disconnections, progress tracking
📚 **Documentation:** See `FILE_UPLOAD_SYSTEM.md` for complete guide
