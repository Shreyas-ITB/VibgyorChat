from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import aiofiles
import socketio
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Socket.IO for WebSocket connections
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

# WebSocket connection manager
active_connections: Dict[str, str] = {}  # user_id -> sid

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime

class Conversation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    conversation_id: str
    type: str  # 'direct' or 'group'
    name: Optional[str] = None
    picture: Optional[str] = None  # Group picture
    participants: List[str]
    admins: Optional[List[str]] = []  # List of admin user_ids
    owner: Optional[str] = None  # Group owner user_id
    created_at: datetime
    last_message_at: Optional[datetime] = None

class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    message_id: str
    conversation_id: str
    sender_id: str
    content: str
    type: str  # 'text', 'image', 'video', 'file'
    file_url: Optional[str] = None
    reactions: Optional[Dict[str, List[str]]] = {}  # emoji -> [user_ids]
    edited_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    created_at: datetime

class GroupRole(BaseModel):
    model_config = ConfigDict(extra="ignore")
    role_id: str
    conversation_id: str
    role_name: str
    member_ids: List[str]
    created_at: datetime

# Helper function to get user from session
async def get_user_from_request(request: Request) -> Optional[User]:
    session_token = request.cookies.get('session_token')
    if not session_token:
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            session_token = auth_header.replace('Bearer ', '')
    
    if not session_token:
        return None
    
    session_doc = await db.user_sessions.find_one(
        {'session_token': session_token},
        {'_id': 0}
    )
    
    if not session_doc:
        return None
    
    # Check expiry
    expires_at = session_doc['expires_at']
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    
    user_doc = await db.users.find_one(
        {'user_id': session_doc['user_id']},
        {'_id': 0}
    )
    
    if not user_doc:
        return None
    
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

# Auth endpoints
@api_router.post("/auth/session")
async def process_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get('session_id')
    
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    # Call Emergent auth service
    async with httpx.AsyncClient() as http_client:
        auth_response = await http_client.get(
            'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data',
            headers={'X-Session-ID': session_id}
        )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        auth_data = auth_response.json()
    
    # Check if user exists
    user_doc = await db.users.find_one({'email': auth_data['email']}, {'_id': 0})
    
    if user_doc:
        user_id = user_doc['user_id']
        # Update user info
        await db.users.update_one(
            {'user_id': user_id},
            {'$set': {
                'name': auth_data['name'],
                'picture': auth_data['picture']
            }}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            'user_id': user_id,
            'email': auth_data['email'],
            'name': auth_data['name'],
            'picture': auth_data['picture'],
            'created_at': datetime.now(timezone.utc)
        })
    
    # Create session
    session_token = auth_data['session_token']
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        'user_id': user_id,
        'session_token': session_token,
        'expires_at': expires_at,
        'created_at': datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key='session_token',
        value=session_token,
        httponly=True,
        secure=True,
        samesite='none',
        path='/'
    )
    
    # Return user data
    user = await db.users.find_one({'user_id': user_id}, {'_id': 0})
    return user

# DEMO MODE: Bypass authentication for testing
@api_router.post("/auth/demo")
async def demo_login(response: Response):
    """
    DEMO MODE FOR TESTING ONLY
    Remove or comment out this endpoint in production
    """
    demo_email = f"demo_{uuid.uuid4().hex[:8]}@vibgyor.com"
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    
    await db.users.insert_one({
        'user_id': user_id,
        'email': demo_email,
        'name': 'Demo User',
        'picture': 'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=150',
        'created_at': datetime.now(timezone.utc)
    })
    
    session_token = f"demo_session_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        'user_id': user_id,
        'session_token': session_token,
        'expires_at': expires_at,
        'created_at': datetime.now(timezone.utc)
    })
    
    response.set_cookie(
        key='session_token',
        value=session_token,
        httponly=True,
        secure=True,
        samesite='none',
        path='/'
    )
    
    user = await db.users.find_one({'user_id': user_id}, {'_id': 0})
    return user

@api_router.get("/auth/me")
async def get_current_user(request: Request):
    user = await get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get('session_token')
    if session_token:
        await db.user_sessions.delete_one({'session_token': session_token})
    response.delete_cookie('session_token', path='/')
    return {"message": "Logged out"}

# User endpoints
@api_router.get("/users/search")
async def search_users(request: Request, q: str = ""):
    user = await get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {}
    if q:
        query = {'$or': [
            {'name': {'$regex': q, '$options': 'i'}},
            {'email': {'$regex': q, '$options': 'i'}}
        ]}
    
    users = await db.users.find(query, {'_id': 0}).limit(20).to_list(20)
    return users

# Conversation endpoints
@api_router.get("/conversations")
async def get_conversations(request: Request):
    user = await get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    conversations = await db.conversations.find(
        {'participants': user.user_id},
        {'_id': 0}
    ).sort('last_message_at', -1).to_list(100)
    
    # Get participant details and last message for each conversation
    for conv in conversations:
        # Get participant details
        participant_ids = [p for p in conv['participants'] if p != user.user_id]
        participants = await db.users.find(
            {'user_id': {'$in': participant_ids}},
            {'_id': 0, 'user_id': 1, 'name': 1, 'picture': 1}
        ).to_list(100)
        conv['participant_details'] = participants
        
        # Get last message
        last_msg = await db.messages.find_one(
            {'conversation_id': conv['conversation_id'], 'deleted_at': None},
            {'_id': 0},
            sort=[('created_at', -1)]
        )
        conv['last_message'] = last_msg
    
    return conversations

@api_router.post("/conversations")
async def create_conversation(request: Request):
    user = await get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    body = await request.json()
    conv_type = body.get('type', 'direct')
    participant_ids = body.get('participants', [])
    name = body.get('name')
    
    # Add current user to participants
    if user.user_id not in participant_ids:
        participant_ids.append(user.user_id)
    
    # Check if direct conversation already exists
    if conv_type == 'direct' and len(participant_ids) == 2:
        existing = await db.conversations.find_one({
            'type': 'direct',
            'participants': {'$all': participant_ids, '$size': 2}
        }, {'_id': 0})
        if existing:
            # Add participant details to existing conversation
            participant_ids_to_fetch = [p for p in existing['participants'] if p != user.user_id]
            participants = await db.users.find(
                {'user_id': {'$in': participant_ids_to_fetch}},
                {'_id': 0, 'user_id': 1, 'name': 1, 'picture': 1}
            ).to_list(100)
            existing['participant_details'] = participants
            return existing
    
    conversation_id = f"conv_{uuid.uuid4().hex[:12]}"
    conversation = {
        'conversation_id': conversation_id,
        'type': conv_type,
        'name': name,
        'participants': participant_ids,
        'created_at': datetime.now(timezone.utc),
        'last_message_at': None
    }
    
    await db.conversations.insert_one(conversation)
    conv = await db.conversations.find_one({'conversation_id': conversation_id}, {'_id': 0})
    
    # Add participant details
    participant_ids_to_fetch = [p for p in conv['participants'] if p != user.user_id]
    participants = await db.users.find(
        {'user_id': {'$in': participant_ids_to_fetch}},
        {'_id': 0, 'user_id': 1, 'name': 1, 'picture': 1}
    ).to_list(100)
    conv['participant_details'] = participants
    
    return conv

@api_router.get("/conversations/{conversation_id}")
async def get_conversation(request: Request, conversation_id: str):
    user = await get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    conversation = await db.conversations.find_one(
        {'conversation_id': conversation_id, 'participants': user.user_id},
        {'_id': 0}
    )
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return conversation

# Message endpoints
@api_router.get("/messages/{conversation_id}")
async def get_messages(request: Request, conversation_id: str, limit: int = 50, before: Optional[str] = None):
    user = await get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Verify user is participant
    conv = await db.conversations.find_one(
        {'conversation_id': conversation_id, 'participants': user.user_id},
        {'_id': 0}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    query = {'conversation_id': conversation_id, 'deleted_at': None}
    if before:
        query['created_at'] = {'$lt': datetime.fromisoformat(before)}
    
    messages = await db.messages.find(
        query,
        {'_id': 0}
    ).sort('created_at', -1).limit(limit).to_list(limit)
    
    # Get sender details
    sender_ids = list(set([msg['sender_id'] for msg in messages]))
    senders = await db.users.find(
        {'user_id': {'$in': sender_ids}},
        {'_id': 0, 'user_id': 1, 'name': 1, 'picture': 1}
    ).to_list(100)
    
    sender_map = {s['user_id']: s for s in senders}
    for msg in messages:
        msg['sender'] = sender_map.get(msg['sender_id'])
    
    return list(reversed(messages))

@api_router.post("/messages/send")
async def send_message(request: Request):
    user = await get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    body = await request.json()
    conversation_id = body.get('conversation_id')
    content = body.get('content', '')
    msg_type = body.get('type', 'text')
    file_url = body.get('file_url')
    
    # Verify user is participant
    conv = await db.conversations.find_one(
        {'conversation_id': conversation_id, 'participants': user.user_id},
        {'_id': 0}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    message = {
        'message_id': message_id,
        'conversation_id': conversation_id,
        'sender_id': user.user_id,
        'content': content,
        'type': msg_type,
        'file_url': file_url,
        'reactions': {},
        'edited_at': None,
        'deleted_at': None,
        'created_at': datetime.now(timezone.utc)
    }
    
    await db.messages.insert_one(message)
    await db.conversations.update_one(
        {'conversation_id': conversation_id},
        {'$set': {'last_message_at': datetime.now(timezone.utc)}}
    )
    
    # Broadcast message via WebSocket
    msg_doc = await db.messages.find_one({'message_id': message_id}, {'_id': 0})
    user_doc = await db.users.find_one({'user_id': user.user_id}, {'_id': 0, 'user_id': 1, 'name': 1, 'picture': 1})
    msg_doc['sender'] = user_doc
    
    await sio.emit('new_message', msg_doc, room=conversation_id)
    
    return msg_doc

@api_router.put("/messages/{message_id}")
async def edit_message(request: Request, message_id: str):
    user = await get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    body = await request.json()
    content = body.get('content')
    
    message = await db.messages.find_one({'message_id': message_id}, {'_id': 0})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if message['sender_id'] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.messages.update_one(
        {'message_id': message_id},
        {'$set': {'content': content, 'edited_at': datetime.now(timezone.utc)}}
    )
    
    updated_msg = await db.messages.find_one({'message_id': message_id}, {'_id': 0})
    await sio.emit('message_edited', updated_msg, room=message['conversation_id'])
    
    return updated_msg

@api_router.delete("/messages/{message_id}")
async def delete_message(request: Request, message_id: str):
    user = await get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    message = await db.messages.find_one({'message_id': message_id}, {'_id': 0})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if message['sender_id'] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.messages.update_one(
        {'message_id': message_id},
        {'$set': {'deleted_at': datetime.now(timezone.utc)}}
    )
    
    await sio.emit('message_deleted', {'message_id': message_id}, room=message['conversation_id'])
    
    return {"message": "Message deleted"}

@api_router.post("/messages/{message_id}/react")
async def react_to_message(request: Request, message_id: str):
    user = await get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    body = await request.json()
    emoji = body.get('emoji')
    
    message = await db.messages.find_one({'message_id': message_id}, {'_id': 0})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    reactions = message.get('reactions', {})
    if emoji not in reactions:
        reactions[emoji] = []
    
    if user.user_id in reactions[emoji]:
        reactions[emoji].remove(user.user_id)
        if not reactions[emoji]:
            del reactions[emoji]
    else:
        reactions[emoji].append(user.user_id)
    
    await db.messages.update_one(
        {'message_id': message_id},
        {'$set': {'reactions': reactions}}
    )
    
    updated_msg = await db.messages.find_one({'message_id': message_id}, {'_id': 0})
    await sio.emit('message_reaction', updated_msg, room=message['conversation_id'])
    
    return updated_msg

# Group role endpoints
@api_router.post("/groups/{conversation_id}/roles")
async def create_group_role(request: Request, conversation_id: str):
    user = await get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    body = await request.json()
    role_name = body.get('role_name')
    color = body.get('color', '#5865F2')
    member_ids = body.get('member_ids', [])
    
    # Verify group exists and user is participant
    conv = await db.conversations.find_one(
        {'conversation_id': conversation_id, 'type': 'group', 'participants': user.user_id},
        {'_id': 0}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Group not found")
    
    role_id = f"role_{uuid.uuid4().hex[:12]}"
    role = {
        'role_id': role_id,
        'conversation_id': conversation_id,
        'role_name': role_name.lower(),
        'color': color,
        'member_ids': member_ids,
        'created_at': datetime.now(timezone.utc)
    }
    
    await db.group_roles.insert_one(role)
    return await db.group_roles.find_one({'role_id': role_id}, {'_id': 0})

@api_router.get("/groups/{conversation_id}/roles")
async def get_group_roles(request: Request, conversation_id: str):
    user = await get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    roles = await db.group_roles.find(
        {'conversation_id': conversation_id},
        {'_id': 0}
    ).to_list(100)
    
    return roles

@api_router.delete("/groups/{conversation_id}/roles/{role_id}")
async def delete_group_role(request: Request, conversation_id: str, role_id: str):
    user = await get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Verify group exists and user is participant
    conv = await db.conversations.find_one(
        {'conversation_id': conversation_id, 'type': 'group', 'participants': user.user_id},
        {'_id': 0}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Group not found")
    
    await db.group_roles.delete_one({'role_id': role_id, 'conversation_id': conversation_id})
    return {"message": "Role deleted"}

@api_router.post("/groups/{conversation_id}/roles/{role_id}/assign")
async def assign_role_to_member(request: Request, conversation_id: str, role_id: str):
    user = await get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    body = await request.json()
    user_id = body.get('user_id')
    
    # Verify group exists and user is participant
    conv = await db.conversations.find_one(
        {'conversation_id': conversation_id, 'type': 'group', 'participants': user.user_id},
        {'_id': 0}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Add user to role's member list
    await db.group_roles.update_one(
        {'role_id': role_id, 'conversation_id': conversation_id},
        {'$addToSet': {'member_ids': user_id}}
    )
    
    return {"message": "Role assigned"}

@api_router.post("/groups/{conversation_id}/roles/{role_id}/remove")
async def remove_role_from_member(request: Request, conversation_id: str, role_id: str):
    user = await get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    body = await request.json()
    user_id = body.get('user_id')
    
    # Verify group exists and user is participant
    conv = await db.conversations.find_one(
        {'conversation_id': conversation_id, 'type': 'group', 'participants': user.user_id},
        {'_id': 0}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Remove user from role's member list
    await db.group_roles.update_one(
        {'role_id': role_id, 'conversation_id': conversation_id},
        {'$pull': {'member_ids': user_id}}
    )
    
    return {"message": "Role removed"}

# File upload endpoint
@api_router.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    user = await get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Generate unique filename
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else ''
    file_name = f"{uuid.uuid4().hex[:12]}.{file_ext}"
    file_path = UPLOADS_DIR / file_name
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Return file URL (in production, use cloud storage)
    file_url = f"/uploads/{file_name}"
    return {'file_url': file_url, 'file_name': file.filename, 'file_type': file.content_type}

# Socket.IO events
@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    # Remove from active connections
    for user_id, conn_sid in list(active_connections.items()):
        if conn_sid == sid:
            del active_connections[user_id]
            break

@sio.event
async def join_conversation(sid, data):
    conversation_id = data.get('conversation_id')
    user_id = data.get('user_id')
    if conversation_id and user_id:
        active_connections[user_id] = sid
        await sio.enter_room(sid, conversation_id)
        print(f"User {user_id} joined conversation {conversation_id}")

@sio.event
async def leave_conversation(sid, data):
    conversation_id = data.get('conversation_id')
    if conversation_id:
        await sio.leave_room(sid, conversation_id)

@sio.event
async def typing(sid, data):
    conversation_id = data.get('conversation_id')
    user_id = data.get('user_id')
    is_typing = data.get('is_typing')
    if conversation_id:
        await sio.emit('user_typing', {'user_id': user_id, 'is_typing': is_typing}, room=conversation_id, skip_sid=sid)

# Include the router in the main app
app.include_router(api_router)

# Wrap the entire app with Socket.IO
sio_app = socketio.ASGIApp(sio, other_asgi_app=app, socketio_path='/socket.io')

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()