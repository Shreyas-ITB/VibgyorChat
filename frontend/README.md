# VibgyorChat

A beautiful, production-ready chat application built with AngularJS (1.x), featuring real-time messaging, Socket.IO integration, and a modern purple-themed UI with dark mode support.

## Features

- **Real-time Messaging**: Instant message delivery using Socket.IO
- **Modern UI**: WhatsApp/Discord-inspired interface with smooth animations
- **Purple Theme**: Beautiful gradient design with dark/light mode support
- **Contact Management**: Add, remove, mute, block, and archive contacts
- **Message Actions**: Edit, delete, pin/unpin messages
- **Typing Indicators**: See when someone is typing
- **Online Status**: Real-time presence indicators
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Secure Authentication**: JWT-based authentication with token refresh

## Tech Stack

- **Framework**: AngularJS 1.8.3
- **Socket**: Socket.IO Client 4.7.2
- **Styling**: TailwindCSS 3.4.0
- **Build Tool**: Vite 5.0.0
- **State Management**: Browser localStorage

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Backend API running (FastAPI + Socket.IO)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Configuration

Edit `src/config.js` to configure your API and Socket endpoints:

```javascript
window.APP_CONFIG = {
  API_BASE_URL: 'http://localhost:8000',
  SOCKET_BASE_URL: 'http://localhost:8000',
  APP_NAME: 'VibgyorChat'
};
```

### Development

Run the development server:

```bash
npm start
```

The application will be available at `http://localhost:3000`

### Build for Production

Build the application:

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

Preview the production build:

```bash
npm run preview
```

## Project Structure

```
src/
├── app/
│   ├── controllers/
│   │   ├── login.controller.js
│   │   └── chat.controller.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── user.service.js
│   │   ├── chat.service.js
│   │   ├── socket.service.js
│   │   ├── theme.service.js
│   │   └── toast.service.js
│   └── views/
│       ├── login.html
│       └── chat.html
├── config.js
├── global_styles.css
└── main.js
```

## Backend API Endpoints

The application expects the following endpoints:

### Authentication
- `POST /auth/email/login` - Login with email/password
- `POST /auth/login/completion` - Complete registration
- `POST /auth/refreshtoken` - Refresh access token
- `POST /auth/logout` - Logout

### Users
- `GET /users/me` - Get current user
- `GET /users/contacts` - Get user contacts
- `GET /users/search?q=` - Search users
- `GET /users/info?email=` - Get user info by email
- `POST /users/add` - Add contact
- `POST /users/remove` - Remove contact
- `POST /users/mute` - Mute contact
- `POST /users/block` - Block contact
- `POST /users/archive` - Archive contact

### Media
- `GET /media/profile/{filename}` - Get profile picture

### Conversations
- `POST /conversations/create` - Create or get conversation

## Socket.IO Events

### Client → Server
- `connect` - Connect with access token
- `typing` - User started typing
- `stop_typing` - User stopped typing
- `send_message` - Send a message
- `edit_message` - Edit a message
- `delete_message` - Delete a message
- `toggle_pin_message` - Pin/unpin a message

### Server → Client
- `new_message` - New message received
- `message_edited` - Message was edited
- `message_deleted` - Message was deleted
- `message_pinned` - Message pin status changed
- `presence` - User online/offline status
- `typing` - User is typing
- `stop_typing` - User stopped typing

## Features in Detail

### Authentication
- Email/password login
- Profile completion for new users
- Automatic token refresh
- Secure logout with server notification

### Contact Management
- View all contacts with profile pictures
- Filter by All, Archived, Muted
- Search contacts by name, username, or email
- Add/remove contacts
- Mute, block, and archive contacts
- Real-time online/offline indicators

### Messaging
- Send and receive real-time messages
- Edit your own messages
- Delete messages (shows "Message deleted")
- Pin important messages
- Typing indicators
- Message timestamps
- Automatic scroll to latest message
- Image message support (backend implementation required)

### Theme & UI
- Light and dark mode
- Smooth theme transitions
- Purple-based color scheme
- Animated message bubbles
- Hover effects on contacts and messages
- Toast notifications for actions
- Responsive design
- Custom scrollbars

## Customization

### Changing Colors

Edit `tailwind.config.js` to customize the primary color:

```javascript
colors: {
  primary: {
    // Your custom color shades
  }
}
```

### Animations

All animations are defined in `src/global_styles.css` and can be customized.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is for VibgyorChat - Home automation, interior designing, and painting company.

## Notes

- AngularJS 1.x is used as per project requirements
- All API calls include JWT token authentication
- Socket connection is established after login
- Theme preference is stored in localStorage
- Profile pictures use UI Avatars as fallback
