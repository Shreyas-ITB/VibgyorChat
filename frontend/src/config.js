// Read configuration from environment variables (injected by Vite)
window.APP_CONFIG = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  SOCKET_BASE_URL: import.meta.env.VITE_SOCKET_BASE_URL || 'http://localhost:8000',
  FRONTEND_URL: import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3000',
  APP_NAME: import.meta.env.VITE_APP_NAME || 'VibgyorChat',
  ADMIN_USERNAME: import.meta.env.VITE_ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: import.meta.env.VITE_ADMIN_PASSWORD || 'admin123',
  EDIT_DELETE_MESSAGE_TIMER: parseInt(import.meta.env.VITE_EDIT_DELETE_MESSAGE_TIMER) || 15
};