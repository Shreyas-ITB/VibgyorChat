# main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from config import JWT_SECRET
from utils.socket_server import sio
from database import connect_to_mongo, close_mongo_connection
from routes import media, auth, users, conversations, messages
from socketio import ASGIApp


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
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Session Middleware
api.add_middleware(
    SessionMiddleware,
    secret_key=JWT_SECRET,
    same_site="lax",
    https_only=False
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

# ------------------------------------
# Wrap FastAPI inside Socket.IO
# ------------------------------------
app = ASGIApp(
    socketio_server=sio,
    other_asgi_app=api,
    socketio_path="/ws/socket.io"
)


# ------------------------------------
# Only reachable through root-level ASGI app
# ------------------------------------
@api.get("/")
async def root():
    return { "message": "Welcome to Vibgyor Chats API 🚀" }


# ------------------------------------
# Uvicorn
# ------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
