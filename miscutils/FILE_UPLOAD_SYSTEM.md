# File Upload System - Reliable Video, Image & File Uploads

## Problem Solved

**Issue:** Socket.IO disconnects when uploading large files (especially videos) because:
1. WebSocket has payload size limits
2. Base64 encoding increases file size by ~33%
3. Large payloads block the event loop
4. Network interruptions cause complete upload failure

**Solution:** Use HTTP REST API for file uploads instead of Socket.IO for reliability.

## Architecture

### Two Upload Methods

#### 1. HTTP Upload (RECOMMENDED for all files, especially videos)
- **Endpoint:** `POST /messages/upload`
- **Method:** Multipart form-data
- **Max Size:** Limited only by server configuration (can handle GB files)
- **Reliability:** ✅ Resumable, progress tracking, no disconnections
- **Use For:** Videos, large images, documents, all files

#### 2. Socket.IO Upload (Legacy, for small files only)
- **Event:** `send_message`
- **Method:** Base64 encoded in JSON
- **Max Size:** 50MB (but not recommended for files > 5MB)
- **Reliability:** ⚠️ Can cause disconnections with large files
- **Use For:** Small images only (< 5MB), backward compatibility

## Supported File Types

### Images
- `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`
- Type: `"image"`

### Videos (NEW!)
- `.mp4`, `.webm`, `.mov`, `.avi`, `.mkv`, `.flv`
- Type: `"video"`

### Files
- All other file types
- Type: `"file"`

## HTTP Upload API

### Endpoint
```
POST /messages/upload
```

### Request Format
**Content-Type:** `multipart/form-data`

**Form Fields:**
- `file` (required): The file to upload
- `conversation_id` (required): Conversation ID
- `content` (optional): Text caption/message
- `reply_to` (optional): Message ID to reply to

### Example: JavaScript/Fetch

```javascript
async function uploadFile(file, conversationId, caption = null, replyTo = null) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('conversation_id', conversationId);
  
  if (caption) {
    formData.append('content', caption);
  }
  
  if (replyTo) {
    formData.append('reply_to', replyTo);
  }
  
  const response = await fetch('/messages/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: formData
  });
  
  const data = await response.json();
  return data.message;
}
```

### Example: With Progress Tracking

```javascript
async function uploadFileWithProgress(file, conversationId, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('conversation_id', conversationId);
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        onProgress(percentComplete);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve(data.message);
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });
    
    xhr.addEventListener('error', () => reject(new Error('Upload failed')));
    
    xhr.open('POST', '/messages/upload');
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.send(formData);
  });
}

// Usage
uploadFileWithProgress(videoFile, conversationId, (progress) => {
  console.log(`Upload progress: ${progress.toFixed(2)}%`);
  updateProgressBar(progress);
});
```

### Example: React with Axios

```javascript
import axios from 'axios';

async function uploadFile(file, conversationId, caption) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('conversation_id', conversationId);
  if (caption) formData.append('content', caption);
  
  const response = await axios.post('/messages/upload', formData, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      console.log(`Upload: ${percentCompleted}%`);
    }
  });
  
  return response.data.message;
}
```

### Response Format

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
    "media_url": "/uploads/chats/507f1f77bcf86cd799439011/my_video.mp4",
    "reply_to": null,
    "is_read": false,
    "is_deleted": false,
    "created_at": "2024-01-26T12:00:00Z",
    "edited_at": null,
    "pinned": false
  }
}
```

**Error (400/403/404/500):**
```json
{
  "detail": "Error message"
}
```

## Socket.IO Upload (Legacy)

### Event: send_message

**For small files only (< 5MB)**

```javascript
// NOT RECOMMENDED for videos or large files
socket.emit('send_message', {
  conversation_id: '507f1f77bcf86cd799439012',
  content: 'Caption text',
  type: 'image',  // or 'video', 'file'
  file_name: 'photo.jpg',
  file_data: base64EncodedString,  // Base64 encoded file
  reply_to: null
});
```

**Warning:** This method can cause disconnections with large files!

## Migration Guide

### Before (Socket.IO - Unreliable)

```javascript
// OLD WAY - Causes disconnections with large files
function sendFile(file, conversationId) {
  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result.split(',')[1];
    socket.emit('send_message', {
      conversation_id: conversationId,
      type: 'video',
      file_name: file.name,
      file_data: base64  // ❌ Large base64 causes disconnection
    });
  };
  reader.readAsDataURL(file);
}
```

### After (HTTP - Reliable)

```javascript
// NEW WAY - Reliable for all file sizes
async function sendFile(file, conversationId) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('conversation_id', conversationId);
  
  const response = await fetch('/messages/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  const data = await response.json();
  return data.message;  // ✅ Reliable, no disconnections
}
```

## Complete Frontend Example

```javascript
// File upload component
class FileUploader {
  constructor(socket, apiUrl, token) {
    this.socket = socket;
    this.apiUrl = apiUrl;
    this.token = token;
  }
  
  async sendMessage(file, conversationId, caption = null) {
    // Determine if we should use HTTP or Socket.IO
    const fileSize = file.size;
    const useSockets = fileSize < 5 * 1024 * 1024; // 5MB threshold
    
    if (useSockets && file.type.startsWith('image/')) {
      // Small image - can use Socket.IO
      return this.uploadViaSocket(file, conversationId, caption);
    } else {
      // Large file or video - use HTTP
      return this.uploadViaHTTP(file, conversationId, caption);
    }
  }
  
  async uploadViaHTTP(file, conversationId, caption) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversation_id', conversationId);
    if (caption) formData.append('content', caption);
    
    const response = await fetch(`${this.apiUrl}/messages/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.message;
  }
  
  uploadViaSocket(file, conversationId, caption) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        
        this.socket.emit('send_message', {
          conversation_id: conversationId,
          content: caption,
          type: file.type.startsWith('image/') ? 'image' : 'file',
          file_name: file.name,
          file_data: base64
        });
        
        // Listen for confirmation
        this.socket.once('new_message', (message) => {
          resolve(message);
        });
      };
      
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

// Usage
const uploader = new FileUploader(socket, 'http://localhost:8000', token);

// Upload video (automatically uses HTTP)
const videoFile = document.getElementById('video-input').files[0];
const message = await uploader.sendMessage(
  videoFile, 
  conversationId, 
  'Check out this video!'
);

console.log('Video uploaded:', message);
```

## Server Configuration

### Socket.IO Settings (Updated)

```python
# backend/utils/socket_server.py
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=ALLOWED_ORIGINS_LIST,
    max_http_buffer_size=50 * 1024 * 1024,  # 50MB max
    ping_timeout=60,  # Longer timeout for uploads
    ping_interval=25
)
```

### File Storage Structure

```
uploads/
└── chats/
    └── <message_id>/
        └── <filename>
```

**Example:**
```
uploads/
└── chats/
    └── 507f1f77bcf86cd799439011/
        └── my_video.mp4
```

## Best Practices

### 1. Always Use HTTP for Videos
```javascript
// ✅ GOOD
if (file.type.startsWith('video/')) {
  await uploadViaHTTP(file, conversationId);
}

// ❌ BAD - Will cause disconnections
socket.emit('send_message', { type: 'video', file_data: base64 });
```

### 2. Show Upload Progress
```javascript
const xhr = new XMLHttpRequest();
xhr.upload.addEventListener('progress', (e) => {
  const percent = (e.loaded / e.total) * 100;
  updateProgressBar(percent);
});
```

### 3. Handle Errors Gracefully
```javascript
try {
  const message = await uploadFile(file, conversationId);
  showSuccess('File uploaded successfully!');
} catch (error) {
  showError(`Upload failed: ${error.message}`);
  // Optionally retry
}
```

### 4. Validate File Size
```javascript
const MAX_SIZE = 100 * 1024 * 1024; // 100MB

if (file.size > MAX_SIZE) {
  showError('File too large. Maximum size is 100MB.');
  return;
}
```

### 5. Show File Type Icons
```javascript
function getFileIcon(type) {
  if (type === 'image') return '🖼️';
  if (type === 'video') return '🎥';
  if (type === 'file') return '📄';
  return '📎';
}
```

## Testing

### Test Video Upload
```bash
curl -X POST http://localhost:8000/messages/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/video.mp4" \
  -F "conversation_id=507f1f77bcf86cd799439012" \
  -F "content=Check out this video!"
```

### Test Large File
```bash
# Create a 50MB test file
dd if=/dev/zero of=test_50mb.bin bs=1M count=50

# Upload it
curl -X POST http://localhost:8000/messages/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test_50mb.bin" \
  -F "conversation_id=507f1f77bcf86cd799439012"
```

## Troubleshooting

### Issue: Upload fails with 413 Payload Too Large
**Solution:** Increase server max body size in nginx/proxy configuration

### Issue: Socket still disconnects
**Solution:** Use HTTP upload endpoint instead of Socket.IO

### Issue: Video doesn't play in browser
**Solution:** Ensure video is in web-compatible format (MP4 with H.264 codec)

### Issue: Slow uploads
**Solution:** 
- Check network connection
- Use HTTP/2 if available
- Compress videos before upload

## Summary

✅ **What's New:**
- HTTP upload endpoint for reliable file uploads
- Video message type support
- Progress tracking capability
- No more socket disconnections

✅ **Recommended Approach:**
- Use HTTP upload for ALL files
- Especially important for videos and large files
- Socket.IO upload only for backward compatibility

✅ **Benefits:**
- Reliable uploads (no disconnections)
- Progress tracking
- Resumable uploads (with additional implementation)
- Better error handling
- Supports larger files
