from fastapi import APIRouter, Request, HTTPException, Query, File, UploadFile, Form
from bson import ObjectId
from datetime import datetime
from pathlib import Path
import uuid
import os

from database import get_database
from utils.jwt import get_uid_from_request

router = APIRouter(prefix="/messages", tags=["Messages"])

# Upload directories
UPLOAD_BASE_DIR = "uploads/chats"
os.makedirs(UPLOAD_BASE_DIR, exist_ok=True)


def get_file_category(filename: str, content_type: str = "") -> str:
    """
    Determine file category based on file extension and content type.
    Returns: "image", "video", "audio", "pdf", "document", "archive", "code", "other"
    """
    file_extension = Path(filename).suffix.lower()
    
    # Image files
    if content_type.startswith("image/") or file_extension in [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg", ".ico"]:
        return "image"
    
    # Video files
    if content_type.startswith("video/") or file_extension in [".mp4", ".webm", ".mov", ".avi", ".mkv", ".flv", ".wmv", ".m4v"]:
        return "video"
    
    # Audio files
    if content_type.startswith("audio/") or file_extension in [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac", ".wma", ".opus"]:
        return "audio"
    
    # PDF files
    if file_extension == ".pdf" or content_type == "application/pdf":
        return "pdf"
    
    # Document files
    if file_extension in [".doc", ".docx", ".txt", ".rtf", ".odt", ".pages"]:
        return "document"
    
    # Spreadsheet files
    if file_extension in [".xls", ".xlsx", ".csv", ".ods", ".numbers"]:
        return "document"
    
    # Presentation files
    if file_extension in [".ppt", ".pptx", ".odp", ".key"]:
        return "document"
    
    # Archive files
    if file_extension in [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz"]:
        return "archive"
    
    # Code files
    if file_extension in [".js", ".py", ".java", ".cpp", ".c", ".h", ".cs", ".php", ".rb", ".go", ".rs", ".swift", ".kt", ".ts", ".jsx", ".tsx", ".html", ".css", ".scss", ".json", ".xml", ".yaml", ".yml", ".sql"]:
        return "code"
    
    # Default
    return "other"


# -----------------------------------------------------------
# 🟦 GET /messages/get
# Fetch paginated messages for a conversation
# -----------------------------------------------------------
@router.get("/get")
async def get_messages(
    request: Request,
    conversation_id: str = Query(...),
    limit: int | None = Query(None),
    before: str | None = Query(None)
):
    """
    Fetch messages from newest → oldest.
    
    Parameters:
        conversation_id: str (required)
        limit: int = 30 (default)
        before: message_id (optional for pagination)
    
    Behavior:
        - If 'before' is NOT provided → return latest messages
        - If 'before' IS provided   → return messages older than that one
    """

    # Authenticate request
    user_id = get_uid_from_request(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    db = await get_database()
    messages = db["messages"]

    # ------------------------------
    # Pagination Logic (Discord-style)
    # ------------------------------
    query = {"conversation_id": conversation_id}

    if not limit:
        limit = 30

    if before:
        try:
            before_created_at = await messages.find_one(
                {"_id": ObjectId(before)}
            )
            if not before_created_at:
                raise HTTPException(status_code=404, detail="Invalid 'before' message_id")

            query["created_at"] = {"$lt": before_created_at["created_at"]}

        except Exception:
            raise HTTPException(status_code=400, detail="Invalid 'before' message_id")

    # Fetch messages newest → oldest
    cursor = messages.find(query).sort("created_at", -1).limit(limit)
    results = await cursor.to_list(length=limit)

    # Convert ObjectId + datetime → string
    formatted = []
    for msg in results:
        msg["_id"] = str(msg["_id"])
        msg["created_at"] = msg["created_at"].isoformat() + "Z"
        if msg.get("edited_at"):
            msg["edited_at"] = msg["edited_at"].isoformat() + "Z"
        formatted.append(msg)

    return {
        "count": len(formatted),
        "messages": formatted
    }


# -----------------------------------------------------------
# 🟦 GET /messages/info
# Get a single message by ID
# -----------------------------------------------------------
@router.get("/info")
async def get_message_info(
    request: Request,
    message_id: str = Query(...)
):
    """
    Fetch full message document by message_id.
    """

    user_id = get_uid_from_request(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    db = await get_database()
    messages = db["messages"]

    try:
        message = await messages.find_one({"_id": ObjectId(message_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid message_id")

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    # Convert fields
    message["_id"] = str(message["_id"])
    message["created_at"] = message["created_at"].isoformat() + "Z"
    if message.get("edited_at"):
        message["edited_at"] = message["edited_at"].isoformat() + "Z"

    return message


# -----------------------------------------------------------
# 🟦 POST /messages/upload
# Upload file/image/video via HTTP (more reliable than Socket.IO)
# -----------------------------------------------------------
@router.post("/upload")
async def upload_message_file(
    request: Request,
    file: UploadFile = File(...),
    conversation_id: str = Form(...),
    content: str = Form(None),
    reply_to: str = Form(None)
):
    """
    Upload a file/image/video and create a message.
    This is more reliable than Socket.IO for large files.
    
    Parameters:
        file: The file to upload (image/video/document)
        conversation_id: The conversation to send the message to
        content: Optional text content/caption
        reply_to: Optional message_id to reply to
    
    Returns:
        The created message object
    """
    
    # Authenticate
    user_id = get_uid_from_request(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    db = await get_database()
    messages = db["messages"]
    conversations = db["conversations"]
    
    # Validate conversation exists and user is participant
    try:
        conversation = await conversations.find_one({"_id": ObjectId(conversation_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid conversation_id")
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if user_id not in conversation.get("participants", []):
        raise HTTPException(status_code=403, detail="You are not a participant in this conversation")
    
    # Determine file type based on content type
    content_type = file.content_type or ""
    file_extension = Path(file.filename).suffix.lower()
    
    # Determine message type (for backward compatibility)
    if content_type.startswith("image/") or file_extension in [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"]:
        message_type = "image"
    elif content_type.startswith("video/") or file_extension in [".mp4", ".webm", ".mov", ".avi", ".mkv", ".flv"]:
        message_type = "video"
    elif content_type.startswith("audio/") or file_extension in [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"]:
        message_type = "audio"
    else:
        message_type = "file"
    
    # Determine file category (more specific)
    file_category = get_file_category(file.filename, content_type)
    
    # Create message first to get message_id
    message = {
        "conversation_id": conversation_id,
        "sender": user_id,
        "content": content,
        "type": message_type,
        "file_category": file_category,
        "media_url": None,  # Will update after saving file
        "reply_to": reply_to,
        "is_read": False,
        "is_deleted": False,
        "created_at": datetime.utcnow(),
        "edited_at": None,
        "pinned": False
    }
    
    result = await messages.insert_one(message)
    message_id = str(result.inserted_id)
    
    # Create folder for this message: uploads/chats/<message_id>/
    message_folder = Path(UPLOAD_BASE_DIR) / message_id
    message_folder.mkdir(parents=True, exist_ok=True)
    
    # Save file with original filename (sanitized)
    safe_filename = "".join(c for c in file.filename if c.isalnum() or c in "._- ")
    if not safe_filename:
        safe_filename = f"file{file_extension}"
    
    file_path = message_folder / safe_filename
    
    # Save file
    try:
        with open(file_path, "wb") as f:
            content_bytes = await file.read()
            f.write(content_bytes)
    except Exception as e:
        # If file save fails, delete the message
        await messages.delete_one({"_id": result.inserted_id})
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Update message with media_url
    media_url = f"/uploads/chats/{message_id}/{safe_filename}"
    await messages.update_one(
        {"_id": result.inserted_id},
        {"$set": {"media_url": media_url}}
    )
    
    # Update conversation's last_message
    await conversations.update_one(
        {"_id": ObjectId(conversation_id)},
        {"$set": {"last_message": message_id}}
    )
    
    # Prepare response
    message["_id"] = message_id
    message["media_url"] = media_url
    message["created_at"] = message["created_at"].isoformat() + "Z"
    
    # Broadcast to Socket.IO room (if socket server is available)
    try:
        from utils.socket_server import sio
        await sio.emit(
            "new_message",
            message,
            room=conversation_id
        )
        
        # Also broadcast to all participants
        participants = conversation.get("participants", [])
        from utils.socket_server import USER_CONNECTIONS, USER_ROOM_CONNECTIONS
        
        for participant_email in participants:
            if participant_email != user_id:
                if participant_email in USER_CONNECTIONS:
                    is_active_in_room = (
                        conversation_id in USER_ROOM_CONNECTIONS and
                        participant_email in USER_ROOM_CONNECTIONS[conversation_id] and
                        len(USER_ROOM_CONNECTIONS[conversation_id][participant_email]) > 0
                    )
                    
                    for user_sid in USER_CONNECTIONS[participant_email]:
                        await sio.emit(
                            "new_message_broadcast",
                            {
                                **message,
                                "conversation_info": {
                                    "conversation_id": conversation_id,
                                    "type": conversation.get("type"),
                                    "group_name": conversation.get("group_name"),
                                    "participants": participants
                                },
                                "user_status": {
                                    "is_active_in_room": is_active_in_room,
                                    "should_notify": not is_active_in_room
                                },
                                "timestamp": message["created_at"]
                            },
                            to=user_sid
                        )
    except Exception as e:
        print(f"⚠️ Failed to broadcast message via socket: {e}")
        # Don't fail the request if socket broadcast fails
    
    return {
        "success": True,
        "message": message
    }