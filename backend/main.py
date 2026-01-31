# main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from config import JWT_SECRET, ALLOWED_ORIGINS_LIST, API_URL, API_PORT, VERSION_DETAILS_URL
from utils.socket_server import sio
from database import connect_to_mongo, close_mongo_connection
from routes import media, auth, users, conversations, messages, backup, admin
from socketio import ASGIApp
import httpx
import asyncio


# ------------------------------------
# Create FastAPI (API only)
# ------------------------------------
api = FastAPI(
    title="Vibgyor Chats API",
    description="Backend API for Vibgyor Chats",
    version="1.0.0",
)


# ------------------------------------
# CORS for API only
# ------------------------------------
api.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Session Middleware - Enhanced configuration for OAuth
api.add_middleware(
    SessionMiddleware,
    secret_key=JWT_SECRET,
    same_site="lax",
    https_only=False,
    max_age=1800,  # 30 minutes for OAuth flow
    session_cookie="session"
)


# ------------------------------------
# MongoDB lifecycle
# ------------------------------------
@api.on_event("startup")
async def startup():
    await connect_to_mongo()

@api.on_event("shutdown")
async def shutdown():
    await close_mongo_connection()


# ------------------------------------
# API routes
# ------------------------------------
api.include_router(auth.router)
api.include_router(media.router)
api.include_router(users.router)
api.include_router(conversations.router)
api.include_router(messages.router)
api.include_router(backup.router)
api.include_router(admin.router)

# ------------------------------------
# Wrap FastAPI inside Socket.IO
# ------------------------------------
app = ASGIApp(
    socketio_server=sio,
    other_asgi_app=api,
    socketio_path="/ws/socket.io"
)


# ------------------------------------
# Version fetching utility
# ------------------------------------
async def fetch_version_details():
    """
    Fetch version details from GitHub raw URL
    Returns dict with API_VERSION and FRONTEND_VERSION
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(VERSION_DETAILS_URL)
            response.raise_for_status()
            
            # Parse the version file content
            content = response.text.strip()
            versions = {}
            
            for line in content.split('\n'):
                line = line.strip()
                if '=' in line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    versions[key.strip()] = value.strip()
            
            return {
                "api_version": versions.get("API_VERSION", "Unknown"),
                "frontend_version": versions.get("FRONTEND_VERSION", "Unknown")
            }
    except Exception as e:
        print(f"⚠️ Failed to fetch version details: {e}")
        return {
            "api_version": "Unknown",
            "frontend_version": "Unknown"
        }


# ------------------------------------
# Only reachable through root-level ASGI app
# ------------------------------------
@api.get("/")
async def root():
    """
    API Information endpoint
    Returns API URL, PORT, and version information fetched from GitHub
    """
    
    # Fetch version details from GitHub
    version_info = await fetch_version_details()
    
    return {
        "message": "Welcome to Vibgyor Chats API 🚀",
        "api_url": API_URL,
        "api_port": API_PORT,
        "api_version": version_info["api_version"],
        "frontend_version": version_info["frontend_version"],
        "version_source": VERSION_DETAILS_URL,
        "status": "online"
    }


# ------------------------------------
# Uvicorn
# ------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=API_URL, port=API_PORT, reload=True)
