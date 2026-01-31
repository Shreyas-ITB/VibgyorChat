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

# CORS Configuration
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8000")
# Convert comma-separated string to list
ALLOWED_ORIGINS_LIST = [origin.strip() for origin in ALLOWED_ORIGINS.split(",") if origin.strip()]

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

# -------------------------
# Admin Dashboard Credentials
# -------------------------
ADMIN_DASHBOARD_USERNAME = os.getenv("ADMIN_DASHBOARD_USERNAME", "admin")
ADMIN_DASHBOARD_PASSWORD = os.getenv("ADMIN_DASHBOARD_PASSWORD", "admin123")

# -------------------------
# Allowed Employee Email Domains
# -------------------------
ALLOWED_EMPLOYEE_DOMAINS = os.getenv("ALLOWED_EMPLOYEE_DOMAINS", "@vibgyor.co.in")
# Convert comma-separated string to list and strip whitespace
ALLOWED_EMPLOYEE_DOMAINS_LIST = [domain.strip() for domain in ALLOWED_EMPLOYEE_DOMAINS.split(",") if domain.strip()]

# -------------------------
# API Configuration
# -------------------------
API_URL = os.getenv("API_URL", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))

# -------------------------
# Version Information
# -------------------------
VERSION_DETAILS_URL = os.getenv("VERSION_DETAILS", "https://raw.githubusercontent.com/Shreyas-ITB/VibgyorChat/refs/heads/main/assets/__VERSION.txt")