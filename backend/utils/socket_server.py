# utils/socket_server.py

import socketio
from datetime import datetime
from jose import jwt, JWTError
from bson import ObjectId
import base64
from pathlib import Path
from config import JWT_SECRET, JWT_ALGORITHM
from database import get_database

# ------------------------------------
# SOCKET.IO SERVER INSTANCE
# ------------------------------------
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=["http://localhost:3000"]
)

socket_app = socketio.ASGIApp(sio)

# ------------------------------------
# PRESENCE STATE (IN-MEMORY)
# ------------------------------------
ONLINE_USERS: set[str] = set()

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

    await sio.save_session(sid, {"uid": uid})

    # ---------------------------
    # PRESENCE: ONLINE
    # ---------------------------
    ONLINE_USERS.add(uid)

    db = await get_database()
    conversations = db["conversations"]

    user_conversations = conversations.find(
        {"participants": uid},
        {"_id": 1}
    )

    async for convo in user_conversations:
        await sio.enter_room(sid, str(convo["_id"]))

    # Notify others
    await sio.emit(
        "presence",
        {"user": uid, "status": "online"}
    )

    print(f"Socket connected: {uid}")


@sio.event
async def disconnect(sid):
    session = await sio.get_session(sid)
    if not session:
        return

    uid = session.get("uid")

    # ---------------------------
    # PRESENCE: OFFLINE
    # ---------------------------
    if uid in ONLINE_USERS:
        ONLINE_USERS.remove(uid)

    await sio.emit(
        "presence",
        {
            "user": uid,
            "status": "offline",
            "last_seen": datetime.utcnow().isoformat()
        }
    )

    print(f"Socket disconnected: {uid}")

@sio.event
async def typing(sid, data):
    """
    data = { conversation_id }
    """
    session = await sio.get_session(sid)
    uid = session["uid"]

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
        await sio.enter_room(sid, conversation_id)


# ------------------------------------
# SEND MESSAGE
# ------------------------------------
# @sio.event
# async def send_message(sid, data):
#     """
#     data = {
#         conversation_id,
#         content,
#         type: "text" | "image",
#         media_url (optional)
#     }
#     """
#     session = await sio.get_session(sid)
#     sender = session["uid"]

#     db = await get_database()
#     messages = db["messages"]
#     conversations = db["conversations"]

#     message = {
#         "conversation_id": data["conversation_id"],
#         "sender": sender,
#         "content": data.get("content"),
#         "type": data["type"],
#         "media_url": data.get("media_url"),
#         "is_deleted": False,
#         "created_at": datetime.utcnow(),
#         "edited_at": None,
#         "pinned": False,
#     }

#     result = await messages.insert_one(message)
#     message["_id"] = str(result.inserted_id)
#     message_id = str(result.inserted_id)
#     message["_id"] = message_id

#     # ------------------------------------------
#     # UPDATE CONVERSATION.LAST_MESSAGE
#     # ------------------------------------------
#     await conversations.update_one(
#         {"_id": ObjectId(data["conversation_id"])},
#         {"$set": {"last_message": message_id}}
#     )

#     message["created_at"] = message["created_at"].isoformat()
#     if message["edited_at"]:
#         message["edited_at"] = message["edited_at"].isoformat()

#     # Emit to everyone in the conversation room
#     print("EMITTING new_message TO ROOM:", data["conversation_id"])
#     await sio.emit(
#         "new_message",
#         message,
#         room=data["conversation_id"]
#     )

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