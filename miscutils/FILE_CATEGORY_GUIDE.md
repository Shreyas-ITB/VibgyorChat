# File Category Field - Implementation Guide

## Overview
Added `file_category` field to messages for more specific file type identification, making frontend rendering easier and more accurate.

## Problem Solved

**Before:**
```json
{
  "type": "file",
  "media_url": "/uploads/chats/123/workout.pdf"
}
```
Frontend doesn't know it's a PDF without parsing the filename.

**After:**
```json
{
  "type": "file",
  "file_category": "pdf",
  "media_url": "/uploads/chats/123/workout.pdf"
}
```
Frontend immediately knows it's a PDF!

## File Categories

The `file_category` field can have these values:

1. **`"image"`** - Image files
   - `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`, `.svg`, `.ico`

2. **`"video"`** - Video files
   - `.mp4`, `.webm`, `.mov`, `.avi`, `.mkv`, `.flv`, `.wmv`, `.m4v`

3. **`"audio"`** - Audio files
   - `.mp3`, `.wav`, `.ogg`, `.m4a`, `.aac`, `.flac`, `.wma`, `.opus`

4. **`"pdf"`** - PDF documents
   - `.pdf`

5. **`"document"`** - Office documents
   - Word: `.doc`, `.docx`, `.txt`, `.rtf`, `.odt`, `.pages`
   - Excel: `.xls`, `.xlsx`, `.csv`, `.ods`, `.numbers`
   - PowerPoint: `.ppt`, `.pptx`, `.odp`, `.key`

6. **`"archive"`** - Compressed files
   - `.zip`, `.rar`, `.7z`, `.tar`, `.gz`, `.bz2`, `.xz`

7. **`"code"`** - Source code files
   - `.js`, `.py`, `.java`, `.cpp`, `.c`, `.h`, `.cs`, `.php`, `.rb`, `.go`, `.rs`, `.swift`, `.kt`, `.ts`, `.jsx`, `.tsx`, `.html`, `.css`, `.scss`, `.json`, `.xml`, `.yaml`, `.yml`, `.sql`

8. **`"other"`** - Everything else

## API Response Examples

### Image Message
```json
{
  "_id": "6977173f655b9f7206548379",
  "type": "image",
  "file_category": "image",
  "media_url": "/uploads/chats/6977173f655b9f7206548379/9.png"
}
```

### Audio Message
```json
{
  "_id": "69771773655b9f720654837a",
  "type": "audio",
  "file_category": "audio",
  "media_url": "/uploads/chats/69771773655b9f720654837a/voice-message.ogg"
}
```

### PDF Message
```json
{
  "_id": "69771927655b9f720654837b",
  "type": "file",
  "file_category": "pdf",
  "media_url": "/uploads/chats/69771927655b9f720654837b/workout.pdf"
}
```

### Document Message
```json
{
  "_id": "123",
  "type": "file",
  "file_category": "document",
  "media_url": "/uploads/chats/123/report.docx"
}
```

### Archive Message
```json
{
  "_id": "124",
  "type": "file",
  "file_category": "archive",
  "media_url": "/uploads/chats/124/files.zip"
}
```

## Frontend Implementation

### Simplified Rendering with file_category

```jsx
const MessageMedia = ({ message }) => {
  const getMediaUrl = (type = 'stream') => {
    const parts = message.media_url.split('/');
    const messageId = parts[3];
    const filename = parts[4];
    const token = localStorage.getItem('access_token');
    return `http://localhost:8000/media/${type}/${messageId}/${filename}?token=${token}`;
  };
  
  const getFilename = () => {
    return message.media_url.split('/').pop();
  };
  
  // Use file_category for easier rendering
  switch (message.file_category) {
    case 'image':
      return (
        <div className="message-image">
          <img src={getMediaUrl('stream')} alt="Image" style={{ maxWidth: '400px' }} />
          <button onClick={() => window.open(getMediaUrl('download'))}>
            ⬇️ Download
          </button>
        </div>
      );
    
    case 'video':
      return (
        <div className="message-video">
          <video controls style={{ maxWidth: '400px' }}>
            <source src={getMediaUrl('stream')} type="video/mp4" />
          </video>
          <button onClick={() => window.open(getMediaUrl('download'))}>
            ⬇️ Download
          </button>
        </div>
      );
    
    case 'audio':
      return (
        <div className="message-audio">
          <div>🔊 {getFilename()}</div>
          <audio controls style={{ width: '100%' }}>
            <source src={getMediaUrl('stream')} />
          </audio>
          <button onClick={() => window.open(getMediaUrl('download'))}>
            ⬇️ Download
          </button>
        </div>
      );
    
    case 'pdf':
      return (
        <div className="message-pdf">
          <div className="file-card">
            <div className="file-icon">📄</div>
            <div>
              <div><strong>{getFilename()}</strong></div>
              <div className="file-actions">
                <button onClick={() => window.open(getMediaUrl('view'), '_blank')}>
                  👁️ View PDF
                </button>
                <button onClick={() => window.open(getMediaUrl('download'))}>
                  ⬇️ Download
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    
    case 'document':
      return (
        <div className="message-document">
          <div className="file-card">
            <div className="file-icon">📝</div>
            <div>
              <div><strong>{getFilename()}</strong></div>
              <button onClick={() => window.open(getMediaUrl('download'))}>
                ⬇️ Download
              </button>
            </div>
          </div>
        </div>
      );
    
    case 'archive':
      return (
        <div className="message-archive">
          <div className="file-card">
            <div className="file-icon">📦</div>
            <div>
              <div><strong>{getFilename()}</strong></div>
              <button onClick={() => window.open(getMediaUrl('download'))}>
                ⬇️ Download
              </button>
            </div>
          </div>
        </div>
      );
    
    case 'code':
      return (
        <div className="message-code">
          <div className="file-card">
            <div className="file-icon">💻</div>
            <div>
              <div><strong>{getFilename()}</strong></div>
              <button onClick={() => window.open(getMediaUrl('download'))}>
                ⬇️ Download
              </button>
            </div>
          </div>
        </div>
      );
    
    case 'other':
    default:
      return (
        <div className="message-file">
          <div className="file-card">
            <div className="file-icon">📎</div>
            <div>
              <div><strong>{getFilename()}</strong></div>
              <button onClick={() => window.open(getMediaUrl('download'))}>
                ⬇️ Download
              </button>
            </div>
          </div>
        </div>
      );
  }
  
  // Fallback for text messages
  if (message.type === 'text') {
    return <p>{message.content}</p>;
  }
};
```

### File Icons Helper

```javascript
const FILE_CATEGORY_ICONS = {
  image: '🖼️',
  video: '🎥',
  audio: '🔊',
  pdf: '📄',
  document: '📝',
  archive: '📦',
  code: '💻',
  other: '📎'
};

function getFileCategoryIcon(category) {
  return FILE_CATEGORY_ICONS[category] || FILE_CATEGORY_ICONS.other;
}
```

### Backward Compatibility

```javascript
// For old messages without file_category, fallback to type
function getDisplayCategory(message) {
  if (message.file_category) {
    return message.file_category;
  }
  
  // Fallback to type for old messages
  if (message.type === 'image') return 'image';
  if (message.type === 'video') return 'video';
  if (message.type === 'audio') return 'audio';
  
  // For generic 'file' type, try to guess from filename
  if (message.media_url) {
    const filename = message.media_url.split('/').pop().toLowerCase();
    if (filename.endsWith('.pdf')) return 'pdf';
    if (filename.endsWith('.doc') || filename.endsWith('.docx')) return 'document';
    if (filename.endsWith('.zip') || filename.endsWith('.rar')) return 'archive';
  }
  
  return 'other';
}
```

## Migration

### Run Migration Script

```bash
cd backend
python ../migrate_file_category.py
```

**What it does:**
- Finds all messages with `media_url` but no `file_category`
- Extracts filename from `media_url`
- Determines category based on file extension
- Updates message with `file_category` field

**Expected Output:**
```
============================================================
File Category Migration Script
============================================================

🔍 Searching for messages without file_category field...
📝 Found 15 messages to migrate
  ✓ Updated message 123 → file_category: pdf (filename: workout.pdf)
  ✓ Updated message 124 → file_category: audio (filename: voice-message.ogg)
  ✓ Updated message 125 → file_category: image (filename: 9.png)
  ...

✅ Migration complete! Updated 15 messages.

📊 File Category Statistics:
  - image: 8 messages
  - pdf: 3 messages
  - audio: 2 messages
  - video: 1 messages
  - document: 1 messages

============================================================
Migration finished!
============================================================
```

## Benefits

### 1. Easier Frontend Logic
```javascript
// Before: Complex logic to determine file type
if (message.type === 'file') {
  const filename = message.media_url.split('/').pop();
  if (filename.endsWith('.pdf')) {
    // Show PDF viewer
  } else if (filename.endsWith('.doc')) {
    // Show document icon
  }
  // ... many more conditions
}

// After: Simple switch on file_category
switch (message.file_category) {
  case 'pdf': return <PDFViewer />;
  case 'document': return <DocumentIcon />;
  // Clean and simple!
}
```

### 2. Better User Experience
- Show appropriate icons immediately
- Enable/disable features based on category (e.g., "View PDF" only for PDFs)
- Better file organization and filtering

### 3. Consistent Categorization
- Backend determines category once during upload
- Frontend doesn't need to duplicate logic
- Consistent across all clients

## API Changes

### Upload Response (New)
```json
{
  "success": true,
  "message": {
    "_id": "123",
    "type": "file",
    "file_category": "pdf",
    "media_url": "/uploads/chats/123/document.pdf"
  }
}
```

### Socket Event (New)
```javascript
socket.on('new_message', (message) => {
  console.log(message.file_category); // "pdf", "audio", etc.
});
```

## Testing

### Test Different Categories

```bash
# Test PDF
curl -X POST http://localhost:8000/messages/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@document.pdf" \
  -F "conversation_id=CONV_ID"

# Response should include: "file_category": "pdf"

# Test Audio
curl -X POST http://localhost:8000/messages/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@voice.ogg" \
  -F "conversation_id=CONV_ID"

# Response should include: "file_category": "audio"

# Test Archive
curl -X POST http://localhost:8000/messages/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@files.zip" \
  -F "conversation_id=CONV_ID"

# Response should include: "file_category": "archive"
```

## Summary

✅ **What's Added:**
- `file_category` field in message model
- Automatic category detection based on file extension
- 8 categories: image, video, audio, pdf, document, archive, code, other

✅ **Benefits:**
- Simpler frontend logic
- Better user experience
- Consistent categorization

✅ **Migration:**
- Run `migrate_file_category.py` once
- Backward compatible (old messages still work)

✅ **Frontend:**
- Use `message.file_category` instead of parsing filenames
- Show appropriate icons and actions per category
