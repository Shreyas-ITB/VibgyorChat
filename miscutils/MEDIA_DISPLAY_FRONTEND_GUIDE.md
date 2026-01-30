# Media Display Frontend Guide

## Overview
This guide shows how to properly display different file types (images, videos, audio, PDFs, files) in your chat application.

## Backend Endpoints

### 1. Stream Media (for videos/audio with seeking support)
```
GET /media/stream/{message_id}/{filename}
```
- Supports range requests for video/audio seeking
- Use for: `<video>` and `<audio>` tags

### 2. View File Inline (for PDFs, images)
```
GET /media/view/{message_id}/{filename}
```
- Opens file in browser
- Use for: PDFs, images (alternative to direct display)

### 3. Download File
```
GET /media/download/{message_id}/{filename}
```
- Forces download
- Use for: Download buttons

## Message Types

Your messages now have these types:
- `"text"` - Text message
- `"image"` - Image file
- `"video"` - Video file
- `"audio"` - Audio file (NEW!)
- `"file"` - Other files (PDF, documents, etc.)

## Frontend Implementation

### Helper Function: Get Media URL

```javascript
function getMediaUrl(message, type = 'stream') {
  if (!message.media_url) return null;
  
  // Extract message_id and filename from media_url
  // media_url format: "/uploads/chats/{message_id}/{filename}"
  const parts = message.media_url.split('/');
  const messageId = parts[3];  // message_id
  const filename = parts[4];    // filename
  
  const baseUrl = 'http://localhost:8000';  // Your API URL
  const token = localStorage.getItem('access_token');
  
  switch (type) {
    case 'stream':
      return `${baseUrl}/media/stream/${messageId}/${filename}?token=${token}`;
    case 'view':
      return `${baseUrl}/media/view/${messageId}/${filename}?token=${token}`;
    case 'download':
      return `${baseUrl}/media/download/${messageId}/${filename}?token=${token}`;
    default:
      return `${baseUrl}/media/stream/${messageId}/${filename}?token=${token}`;
  }
}
```

### Alternative: Using Authorization Header

```javascript
async function getMediaBlob(message, type = 'stream') {
  const parts = message.media_url.split('/');
  const messageId = parts[3];
  const filename = parts[4];
  
  const baseUrl = 'http://localhost:8000';
  const token = localStorage.getItem('access_token');
  
  const endpoint = type === 'download' 
    ? `/media/download/${messageId}/${filename}`
    : `/media/stream/${messageId}/${filename}`;
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
```

## React Component Examples

### Complete Message Renderer

```jsx
import React from 'react';

const MessageMedia = ({ message }) => {
  const getMediaUrl = (type = 'stream') => {
    if (!message.media_url) return null;
    
    const parts = message.media_url.split('/');
    const messageId = parts[3];
    const filename = parts[4];
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const token = localStorage.getItem('access_token');
    
    return `${baseUrl}/media/${type}/${messageId}/${filename}?token=${token}`;
  };
  
  const getFilename = () => {
    if (!message.media_url) return 'file';
    const parts = message.media_url.split('/');
    return parts[parts.length - 1];
  };
  
  const getFileExtension = () => {
    const filename = getFilename();
    return filename.split('.').pop().toLowerCase();
  };
  
  const getFileIcon = () => {
    const ext = getFileExtension();
    
    if (['pdf'].includes(ext)) return '📄';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['xls', 'xlsx'].includes(ext)) return '📊';
    if (['zip', 'rar', '7z'].includes(ext)) return '📦';
    if (['txt'].includes(ext)) return '📃';
    return '📎';
  };
  
  const handleDownload = () => {
    const url = getMediaUrl('download');
    const link = document.createElement('a');
    link.href = url;
    link.download = getFilename();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Render based on message type
  switch (message.type) {
    case 'image':
      return (
        <div className="message-image">
          <img 
            src={getMediaUrl('stream')} 
            alt="Shared image"
            style={{ maxWidth: '400px', borderRadius: '8px' }}
            onClick={() => window.open(getMediaUrl('view'), '_blank')}
          />
          {message.content && <p className="caption">{message.content}</p>}
          <button onClick={handleDownload} className="download-btn">
            ⬇️ Download
          </button>
        </div>
      );
    
    case 'video':
      return (
        <div className="message-video">
          <video 
            controls 
            style={{ maxWidth: '400px', borderRadius: '8px' }}
            preload="metadata"
          >
            <source src={getMediaUrl('stream')} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          {message.content && <p className="caption">{message.content}</p>}
          <button onClick={handleDownload} className="download-btn">
            ⬇️ Download Video
          </button>
        </div>
      );
    
    case 'audio':
      return (
        <div className="message-audio">
          <div className="audio-player">
            🔊 <strong>{getFilename()}</strong>
          </div>
          <audio 
            controls 
            style={{ width: '100%', marginTop: '8px' }}
            preload="metadata"
          >
            <source src={getMediaUrl('stream')} />
            Your browser does not support the audio tag.
          </audio>
          {message.content && <p className="caption">{message.content}</p>}
          <button onClick={handleDownload} className="download-btn">
            ⬇️ Download Audio
          </button>
        </div>
      );
    
    case 'file':
      const isPDF = getFileExtension() === 'pdf';
      
      return (
        <div className="message-file">
          <div className="file-card">
            <div className="file-icon">{getFileIcon()}</div>
            <div className="file-info">
              <div className="file-name">{getFilename()}</div>
              <div className="file-actions">
                {isPDF && (
                  <button 
                    onClick={() => window.open(getMediaUrl('view'), '_blank')}
                    className="view-btn"
                  >
                    👁️ View PDF
                  </button>
                )}
                <button onClick={handleDownload} className="download-btn">
                  ⬇️ Download
                </button>
              </div>
            </div>
          </div>
          {message.content && <p className="caption">{message.content}</p>}
        </div>
      );
    
    case 'text':
    default:
      return <p className="message-text">{message.content}</p>;
  }
};

export default MessageMedia;
```

### Styled Components Version

```jsx
import styled from 'styled-components';

const MessageImage = styled.img`
  max-width: 400px;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;
  
  &:hover {
    transform: scale(1.02);
  }
`;

const VideoPlayer = styled.video`
  max-width: 400px;
  border-radius: 8px;
  background: #000;
`;

const AudioPlayer = styled.audio`
  width: 100%;
  margin-top: 8px;
`;

const FileCard = styled.div`
  display: flex;
  align-items: center;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
  gap: 12px;
  max-width: 400px;
`;

const FileIcon = styled.div`
  font-size: 32px;
`;

const FileInfo = styled.div`
  flex: 1;
`;

const FileName = styled.div`
  font-weight: 500;
  margin-bottom: 8px;
`;

const FileActions = styled.div`
  display: flex;
  gap: 8px;
`;

const DownloadButton = styled.button`
  padding: 6px 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background: #0056b3;
  }
`;

const ViewButton = styled.button`
  padding: 6px 12px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background: #218838;
  }
`;
```

### Vanilla JavaScript Example

```javascript
function renderMessage(message, container) {
  const getMediaUrl = (type = 'stream') => {
    const parts = message.media_url.split('/');
    const messageId = parts[3];
    const filename = parts[4];
    const token = localStorage.getItem('access_token');
    return `http://localhost:8000/media/${type}/${messageId}/${filename}?token=${token}`;
  };
  
  const getFilename = () => {
    const parts = message.media_url.split('/');
    return parts[parts.length - 1];
  };
  
  let html = '';
  
  switch (message.type) {
    case 'image':
      html = `
        <div class="message-image">
          <img src="${getMediaUrl('stream')}" alt="Image" style="max-width: 400px; border-radius: 8px;">
          ${message.content ? `<p>${message.content}</p>` : ''}
          <button onclick="downloadFile('${getMediaUrl('download')}', '${getFilename()}')">
            ⬇️ Download
          </button>
        </div>
      `;
      break;
    
    case 'video':
      html = `
        <div class="message-video">
          <video controls style="max-width: 400px; border-radius: 8px;">
            <source src="${getMediaUrl('stream')}" type="video/mp4">
          </video>
          ${message.content ? `<p>${message.content}</p>` : ''}
          <button onclick="downloadFile('${getMediaUrl('download')}', '${getFilename()}')">
            ⬇️ Download
          </button>
        </div>
      `;
      break;
    
    case 'audio':
      html = `
        <div class="message-audio">
          <div>🔊 <strong>${getFilename()}</strong></div>
          <audio controls style="width: 100%;">
            <source src="${getMediaUrl('stream')}">
          </audio>
          ${message.content ? `<p>${message.content}</p>` : ''}
          <button onclick="downloadFile('${getMediaUrl('download')}', '${getFilename()}')">
            ⬇️ Download
          </button>
        </div>
      `;
      break;
    
    case 'file':
      const isPDF = getFilename().endsWith('.pdf');
      html = `
        <div class="message-file">
          <div class="file-card">
            <div class="file-icon">📄</div>
            <div>
              <div><strong>${getFilename()}</strong></div>
              ${isPDF ? `<button onclick="window.open('${getMediaUrl('view')}', '_blank')">👁️ View PDF</button>` : ''}
              <button onclick="downloadFile('${getMediaUrl('download')}', '${getFilename()}')">⬇️ Download</button>
            </div>
          </div>
          ${message.content ? `<p>${message.content}</p>` : ''}
        </div>
      `;
      break;
    
    default:
      html = `<p>${message.content}</p>`;
  }
  
  container.innerHTML = html;
}

function downloadFile(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```

## CSS Styling

```css
/* Message Media Styles */
.message-image {
  margin: 8px 0;
}

.message-image img {
  max-width: 400px;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.message-image img:hover {
  transform: scale(1.02);
}

.message-video video {
  max-width: 400px;
  border-radius: 8px;
  background: #000;
}

.message-audio {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 8px;
  max-width: 400px;
}

.audio-player {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.message-file .file-card {
  display: flex;
  align-items: center;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
  gap: 12px;
  max-width: 400px;
}

.file-icon {
  font-size: 32px;
}

.file-info {
  flex: 1;
}

.file-name {
  font-weight: 500;
  margin-bottom: 8px;
}

.file-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.download-btn, .view-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.download-btn {
  background: #007bff;
  color: white;
}

.download-btn:hover {
  background: #0056b3;
}

.view-btn {
  background: #28a745;
  color: white;
}

.view-btn:hover {
  background: #218838;
}

.caption {
  margin-top: 8px;
  color: #666;
  font-size: 14px;
}
```

## Advanced Features

### 1. Video Thumbnail Generation

```javascript
function generateVideoThumbnail(videoUrl) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    
    video.addEventListener('loadeddata', () => {
      video.currentTime = 1; // Seek to 1 second
    });
    
    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      resolve(canvas.toDataURL());
    });
  });
}
```

### 2. Audio Waveform Visualization

```javascript
import WaveSurfer from 'wavesurfer.js';

function createAudioPlayer(audioUrl, container) {
  const wavesurfer = WaveSurfer.create({
    container: container,
    waveColor: '#ddd',
    progressColor: '#007bff',
    cursorColor: '#007bff',
    height: 60
  });
  
  wavesurfer.load(audioUrl);
  
  return wavesurfer;
}
```

### 3. PDF Preview

```javascript
import { Document, Page } from 'react-pdf';

function PDFPreview({ pdfUrl }) {
  const [numPages, setNumPages] = useState(null);
  
  return (
    <Document
      file={pdfUrl}
      onLoadSuccess={({ numPages }) => setNumPages(numPages)}
    >
      <Page pageNumber={1} width={400} />
      {numPages > 1 && <p>Page 1 of {numPages}</p>}
    </Document>
  );
}
```

### 4. Lightbox for Images

```javascript
import Lightbox from 'react-image-lightbox';

function ImageMessage({ message }) {
  const [isOpen, setIsOpen] = useState(false);
  const imageUrl = getMediaUrl(message, 'stream');
  
  return (
    <>
      <img 
        src={imageUrl} 
        onClick={() => setIsOpen(true)}
        style={{ cursor: 'pointer' }}
      />
      
      {isOpen && (
        <Lightbox
          mainSrc={imageUrl}
          onCloseRequest={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
```

## File Type Icons

```javascript
const FILE_ICONS = {
  // Documents
  pdf: '📄',
  doc: '📝',
  docx: '📝',
  txt: '📃',
  
  // Spreadsheets
  xls: '📊',
  xlsx: '📊',
  csv: '📊',
  
  // Presentations
  ppt: '📊',
  pptx: '📊',
  
  // Archives
  zip: '📦',
  rar: '📦',
  '7z': '📦',
  tar: '📦',
  
  // Code
  js: '💻',
  py: '💻',
  java: '💻',
  cpp: '💻',
  
  // Default
  default: '📎'
};

function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return FILE_ICONS[ext] || FILE_ICONS.default;
}
```

## Testing

### Test Different File Types

```javascript
// Test image
const imageMessage = {
  type: 'image',
  media_url: '/uploads/chats/123/photo.jpg',
  content: 'Beautiful sunset'
};

// Test video
const videoMessage = {
  type: 'video',
  media_url: '/uploads/chats/124/video.mp4',
  content: 'Check this out!'
};

// Test audio
const audioMessage = {
  type: 'audio',
  media_url: '/uploads/chats/125/voice.ogg',
  content: 'Voice message'
};

// Test PDF
const pdfMessage = {
  type: 'file',
  media_url: '/uploads/chats/126/document.pdf',
  content: 'Important document'
};
```

## Summary

✅ **Images** - Display with `<img>` tag, click to enlarge
✅ **Videos** - Use `<video>` tag with `/media/stream` endpoint
✅ **Audio** - Use `<audio>` tag with `/media/stream` endpoint
✅ **PDFs** - View button opens in new tab with `/media/view`
✅ **Files** - Show icon, filename, and download button
✅ **All Types** - Include download button for user convenience

The key is using the correct endpoint:
- **Stream** (`/media/stream`) - For videos/audio (supports seeking)
- **View** (`/media/view`) - For PDFs/images (inline display)
- **Download** (`/media/download`) - For downloading files
