import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "VibgyorChats")

# JWT configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-super-secret-jwt-key-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

# Google OAuth
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI",
    "http://localhost:8000/auth/google/callback"
)
FRONT_END_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Token expirations
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30       # 1 month
REFRESH_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30 * 6  # 6 months

# -------------------------
# Email (Gmail SMTP)
# -------------------------
MAIL_USERNAME = os.getenv("MAIL_USERNAME")  # your@gmail.com
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")  # Gmail App Password
MAIL_FROM = os.getenv("MAIL_FROM", MAIL_USERNAME)

MAIL_SERVER = "smtp.gmail.com"
MAIL_PORT = 587
MAIL_STARTTLS = True
MAIL_SSL_TLS = False

# -------------------------
# Redis (OTP storage)
# -------------------------
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
OTP_EXPIRY_SECONDS = 600  # 10 minutes