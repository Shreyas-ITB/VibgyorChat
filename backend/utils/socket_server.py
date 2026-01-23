# utils/socket_server.py

import asyncio
import socketio
from datetime import datetime
from jose import jwt, JWTError
from bson import ObjectId
import base64
from pathlib import Path
from config import JWT_SECRET, JWT_ALGORITHM, ALLOWED_ORIGINS_LIST
from database import get_database
from collections import defaultdict
from utils.otp import redis_client

# ------------------------------------
# SOCKET.IO SERVER INSTANCE
# ------------------------------------
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=ALLOWED_ORIGINS_LIST
)

socket_app = socketio.ASGIApp(sio)

# Track sockets per user locally
USER_CONNECTIONS = defaultdict(set)

# Track which users are in which conversation rooms
USER_ROOM_CONNECTIONS = defaultdict(lambda: defaultdict(set))  # {room_id: {user_email: {sid1, sid2}}}

# Avoid flicker on refresh
PRESENCE_GRACE_PERIOD = 5  # seconds

# ------------------------------------
# AUTH HELPER
# ------------------------------------
def verify_socket_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("uid")
    except JWTError:
        return None


# ------------------------------------
# SOCKET EVENTS
# ------------------------------------
# ------------------------------------
# CONNECT EVENT
# ------------------------------------

@sio.event
async def connect(sid, environ, auth):
    token = auth.get("access_token") if auth else None
    if not token:
        await sio.disconnect(sid)
        return

    uid = verify_socket_token(token)
    if not uid:
        await sio.disconnect(sid)
        return

    # Save UID in socket session
    await sio.save_session(sid, {"uid": uid})

    # Add socket connection
    USER_CONNECTIONS[uid].add(sid)

    print(f"[CONNECT] {uid} → sockets: {len(USER_CONNECTIONS[uid])}")


# ------------------------------------
# DISCONNECT EVENT
# ------------------------------------
@sio.event
async def disconnect(sid):
    session = await sio.get_session(sid)
    if not session:
        return

    uid = session.get("uid")

    if uid in USER_CONNECTIONS and sid in USER_CONNECTIONS[uid]:
        USER_CONNECTIONS[uid].remove(sid)

    # Clean up room tracking
    for room_id in list(USER_ROOM_CONNECTIONS.keys()):
        if uid in USER_ROOM_CONNECTIONS[room_id]:
            USER_ROOM_CONNECTIONS[room_id][uid].discard(sid)
            if not USER_ROOM_CONNECTIONS[room_id][uid]:
                del USER_ROOM_CONNECTIONS[room_id][uid]
        if not USER_ROOM_CONNECTIONS[room_id]:
            del USER_ROOM_CONNECTIONS[room_id]

    print(f"[DISCONNECT] {uid} → remaining sockets: {len(USER_CONNECTIONS[uid])}")

    # If user still has other sockets open, do NOT mark offline
    if len(USER_CONNECTIONS[uid]) > 0:
        return

    # Wait a moment to prevent false offline from page refresh
    await asyncio.sleep(PRESENCE_GRACE_PERIOD)

    # If no reconnection happened in grace period → truly offline
    if len(USER_CONNECTIONS[uid]) == 0:
        # Delete presence entry from Redis
        await redis_client.delete(f"presence:{uid}")

        await sio.emit(
            "presence_update",
            {
                "user": uid,
                "status": "offline",
                "last_seen": datetime.utcnow().isoformat() + "Z"
            }
        )

        print(f"[PRESENCE] {uid} is now OFFLINE")


# ------------------------------------
# USER GOES ONLINE
# ------------------------------------
@sio.event
async def presence_online(sid):
    session = await sio.get_session(sid)
    uid = session["uid"]

    # Write status into Redis
    await redis_client.hset(
        f"presence:{uid}",
        mapping={
            "status": "online",
            "last_seen": datetime.utcnow().isoformat() + "Z"
        }
    )

    await sio.emit(
        "presence_update",
        {"user": uid, "status": "online"}
    )

    print(f"[PRESENCE] {uid} → ONLINE")


# ------------------------------------
# USER GOES IDLE
# ------------------------------------
@sio.event
async def presence_idle(sid):
    session = await sio.get_session(sid)
    uid = session["uid"]

    await redis_client.hset(
        f"presence:{uid}",
        mapping={
            "status": "idle",
            "last_seen": datetime.utcnow().isoformat() + "Z"
        }
    )

    await sio.emit(
        "presence_update",
        {"user": uid, "status": "idle"}
    )

    print(f"[PRESENCE] {uid} → IDLE")


# ------------------------------------
# FETCH ALL USER STATUSES
# ------------------------------------
@sio.event
async def presence_get_all(sid, data):
    """
    Returns:
    [
        { "user": uid, "status": "online", "last_seen": "..." },
        { "user": uid, "status": "idle", "last_seen": "..." }
    ]
    """

    keys = await redis_client.keys("presence:*")

    results = []

    for key in keys:
        uid = key.split(":")[1]
        data = await redis_client.hgetall(key)

        results.append({
            "user": uid,
            "status": data.get("status", "offline"),
            "last_seen": data.get("last_seen")
        })

    return results

@sio.event
async def typing(sid, data):
    """
    data = { conversation_id }
    """
    session = await sio.get_session(sid)
    uid = session["uid"]
    print(f"User {uid} is typing in conversation {data['conversation_id']}")
    await sio.emit(
        "typing",
        {
            "conversation_id": data["conversation_id"],
            "user": uid
        },
        room=data["conversation_id"],
        skip_sid=sid  # don't send to self
    )

@sio.event
async def stop_typing(sid, data):
    """
    data = { conversation_id }
    """
    session = await sio.get_session(sid)
    uid = session["uid"]
    print(f"User {uid} stopped typing in conversation {data['conversation_id']}")
    await sio.emit(
        "stop_typing",
        {
            "conversation_id": data["conversation_id"],
            "user": uid
        },
        room=data["conversation_id"],
        skip_sid=sid
    )

# ------------------------------------
# JOIN CONVERSATION (OPTIONAL)
# ------------------------------------
@sio.event
async def join_conversation(sid, data):
    """
    data = { conversation_id }
    """
    conversation_id = data.get("conversation_id")
    print("JOINED ROOM:", conversation_id)
    if conversation_id:
        session = await sio.get_session(sid)
        user_email = session.get("uid")
        
        # Join the socket.io room
        await sio.enter_room(sid, conversation_id)
        
        # Track user in room for notification purposes
        if user_email:
            USER_ROOM_CONNECTIONS[conversation_id][user_email].add(sid)
            print(f"👥 {user_email} joined room {conversation_id} (sid: {sid})")

@sio.event
async def leave_conversation(sid, data):
    """
    Leave a conversation room
    data = { conversation_id }
    """
    conversation_id = data.get("conversation_id")
    if conversation_id:
        session = await sio.get_session(sid)
        user_email = session.get("uid")
        
        # Leave the socket.io room
        await sio.leave_room(sid, conversation_id)
        
        # Remove user from room tracking
        if user_email and conversation_id in USER_ROOM_CONNECTIONS:
            if user_email in USER_ROOM_CONNECTIONS[conversation_id]:
                USER_ROOM_CONNECTIONS[conversation_id][user_email].discard(sid)
                if not USER_ROOM_CONNECTIONS[conversation_id][user_email]:
                    del USER_ROOM_CONNECTIONS[conversation_id][user_email]
                print(f"👋 {user_email} left room {conversation_id} (sid: {sid})")


# ------------------------------------
# SEND MESSAGE
# ------------------------------------

@sio.event
async def send_message(sid, data):
    """
    data = {
        conversation_id: str,
        content: str | None,
        type: "text" | "image" | "file",
        file_name: str | None,
        file_data: str (base64) | None,
        reply_to: str | None
    }
    """

    session = await sio.get_session(sid)
    sender = session["uid"]

    db = await get_database()
    messages = db["messages"]
    conversations = db["conversations"]

    # ------------------------------------------
    # BASE MESSAGE DOCUMENT
    # ------------------------------------------
    message = {
        "conversation_id": data["conversation_id"],
        "sender": sender,
        "content": data.get("content"),
        "type": data["type"],
        "media_url": None,
        "reply_to": data.get("reply_to"),    # NEW FIELD
        "is_deleted": False,
        "created_at": datetime.utcnow(),
        "edited_at": None,
        "pinned": False,
    }

    # ------------------------------------------
    # INSERT TEMPORARY MESSAGE (we need message_id)
    # ------------------------------------------
    result = await messages.insert_one(message)
    message_id = str(result.inserted_id)

    # Overwrite now that _id exists
    message["_id"] = message_id

    # ------------------------------------------
    # HANDLE FILE UPLOADS (image/file)
    # ------------------------------------------
    if data["type"] in ["image", "file"]:
        file_name = data.get("file_name")
        file_data = data.get("file_data")

        if file_name is None or file_data is None:
            print("⚠️ File message missing file_name or file_data")
        else:
            # Create folder path: uploads/chats/<message_id>/
            folder_path = Path("uploads/chats") / message_id
            folder_path.mkdir(parents=True, exist_ok=True)

            # Decode base64 → bytes
            try:
                file_bytes = base64.b64decode(file_data)
            except Exception as e:
                print("❌ Base64 decode error:", e)
                file_bytes = None

            if file_bytes:
                file_path = folder_path / file_name
                with open(file_path, "wb") as f:
                    f.write(file_bytes)

                # Save URL for frontend
                message["media_url"] = f"/uploads/chats/{message_id}/{file_name}"

                # Update DB
                await messages.update_one(
                    {"_id": result.inserted_id},
                    {"$set": {"media_url": message["media_url"]}}
                )

    # ------------------------------------------
    # UPDATE last_message IN CONVERSATION
    # ------------------------------------------
    await conversations.update_one(
        {"_id": ObjectId(data["conversation_id"])},
        {"$set": {"last_message": message_id}}
    )

    # ------------------------------------------
    # CONVERT DATES TO STRING FOR SOCKET.IO
    # ------------------------------------------
    message["created_at"] = message["created_at"].isoformat() + "Z"
    if message["edited_at"]:
        message["edited_at"] = message["edited_at"].isoformat() + "Z"

    # ------------------------------------------
    # EMIT TO ALL PARTICIPANTS IN ROOM
    # ------------------------------------------
    print("EMITTING new_message TO ROOM:", data["conversation_id"])
    await sio.emit(
        "new_message",
        message,
        room=data["conversation_id"]
    )

    # ------------------------------------------
    # BROADCAST TO ALL CONVERSATION PARTICIPANTS
    # (Even if they're not in the room)
    # ------------------------------------------
    try:
        # Get conversation details to find all participants
        conversation = await conversations.find_one({"_id": ObjectId(data["conversation_id"])})
        if conversation:
            participants = conversation.get("participants", [])
            
            # Broadcast to all participants who are online
            for participant_email in participants:
                if participant_email != sender:  # Don't send to the sender
                    # Check if user is online (has active socket connections)
                    if participant_email in USER_CONNECTIONS:
                        # Check if user is currently active in this conversation room
                        is_active_in_room = (
                            data["conversation_id"] in USER_ROOM_CONNECTIONS and
                            participant_email in USER_ROOM_CONNECTIONS[data["conversation_id"]] and
                            len(USER_ROOM_CONNECTIONS[data["conversation_id"]][participant_email]) > 0
                        )
                        
                        for user_sid in USER_CONNECTIONS[participant_email]:
                            # Send message to all user's socket connections
                            await sio.emit(
                                "new_message_broadcast",
                                {
                                    **message,  # Include all message data (including created_at)
                                    "conversation_info": {
                                        "conversation_id": data["conversation_id"],
                                        "type": conversation.get("type"),
                                        "group_name": conversation.get("group_name"),
                                        "participants": participants
                                    },
                                    "user_status": {
                                        "is_active_in_room": is_active_in_room,
                                        "should_notify": not is_active_in_room  # Suggest notification if not active
                                    },
                                    "timestamp": message["created_at"]  # Explicit timestamp for easy access
                                },
                                to=user_sid
                            )
                            print(f"📢 Broadcasted message to {participant_email} (active: {is_active_in_room}, sid: {user_sid})")
    except Exception as e:
        print(f"❌ Error broadcasting message: {e}")
        # Don't fail the message sending if broadcast fails


# ------------------------------------
# EDIT MESSAGE
# ------------------------------------
@sio.event
async def edit_message(sid, data):
    """
    data = {
        message_id,
        new_content
    }
    """
    session = await sio.get_session(sid)
    uid = session["uid"]

    db = await get_database()
    messages = db["messages"]

    msg = await messages.find_one({"_id": ObjectId(data["message_id"])})

    if not msg or msg["sender"] != uid:
        return

    await messages.update_one(
        {"_id": ObjectId(data["message_id"])},
        {"$set": {
            "content": data["new_content"],
            "edited_at": datetime.utcnow()
        }}
    )

    await sio.emit(
        "message_edited",
        {
            "message_id": data["message_id"],
            "new_content": data["new_content"],
            "edited_at": datetime.utcnow().isoformat() + "Z"
        },
        room=msg["conversation_id"]
    )


# ------------------------------------
# DELETE / UNSEND MESSAGE
# ------------------------------------
@sio.event
async def delete_message(sid, data):
    """
    data = { message_id }
    """
    session = await sio.get_session(sid)
    uid = session["uid"]

    db = await get_database()
    messages = db["messages"]

    msg = await messages.find_one({"_id": ObjectId(data["message_id"])})

    if not msg or msg["sender"] != uid:
        return

    await messages.update_one(
        {"_id": ObjectId(data["message_id"])},
        {"$set": {"is_deleted": True}}
    )

    await sio.emit(
        "message_deleted",
        {"message_id": data["message_id"]},
        room=msg["conversation_id"]
    )


# ------------------------------------
# PIN / UNPIN MESSAGE
# ------------------------------------
@sio.event
async def toggle_pin_message(sid, data):
    """
    data = { message_id }
    """
    db = await get_database()
    messages = db["messages"]
    conversations = db["conversations"]

    msg = await messages.find_one({"_id": ObjectId(data["message_id"])})
    if not msg:
        return

    new_state = not msg.get("pinned", False)

    await messages.update_one(
        {"_id": ObjectId(data["message_id"])},
        {"$set": {"pinned": new_state}}
    )

    update_op = "$addToSet" if new_state else "$pull"

    await conversations.update_one(
        {"_id": ObjectId(msg["conversation_id"])},
        {update_op: {"pinned_messages": data["message_id"]}}
    )

    await sio.emit(
        "message_pinned",
        {
            "message_id": data["message_id"],
            "pinned": new_state
        },
        room=msg["conversation_id"]
    )