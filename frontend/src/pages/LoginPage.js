import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const LoginPage = () => {
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  // DEMO MODE FOR TESTING - Comment out this function in production
  const handleDemoLogin = async () => {
    try {
      const response = await axios.post(`${API}/auth/demo`, {}, { withCredentials: true });
      const user = response.data;
      navigate('/dashboard', { state: { user }, replace: true });
    } catch (error) {
      console.error('Demo login error:', error);
    }
  };

  return (
    <div className="grid md:grid-cols-2 h-screen w-full">
      {/* Left side - Image */}
      <div 
        className="hidden md:block bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.pexels.com/photos/8399185/pexels-photo-8399185.jpeg?auto=compress&cs=tinysrgb&w=1920')`
        }}
      >
        <div className="h-full bg-gradient-to-br from-vibgyor-green/80 to-vibgyor-orange/60 flex items-center justify-center p-12">
          <div className="text-white max-w-md">
            <h1 className="font-heading text-5xl mb-4">Vibgyor Chats</h1>
            <p className="text-xl font-light">Professional team communication for interior design excellence</p>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="font-heading text-4xl mb-2 text-foreground">Welcome Back</h2>
            <p className="text-muted-foreground">Sign in to continue to Vibgyor Chats</p>
          </div>

          <div className="space-y-4">
            <button
              data-testid="google-login-button"
              onClick={handleGoogleLogin}
              className="w-full bg-vibgyor-orange hover:bg-vibgyor-orange-dark text-white rounded-full px-8 py-4 font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-3"
            >
              <LogIn className="w-5 h-5" />
              Sign in with Google
            </button>

            {/* DEMO MODE - Remove or comment out this button in production */}
            <button
              data-testid="demo-login-button"
              onClick={handleDemoLogin}
              className="w-full bg-transparent border-2 border-vibgyor-green text-vibgyor-green dark:border-vibgyor-green-light dark:text-vibgyor-green-light rounded-full px-8 py-4 font-medium hover:bg-vibgyor-green/5 transition-all duration-300 flex items-center justify-center gap-3"
            >
              Demo Mode (Testing)
            </button>
          </div>

          <p className="text-sm text-center text-muted-foreground mt-8">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};