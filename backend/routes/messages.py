from fastapi import APIRouter, Request, HTTPException, Query
from bson import ObjectId
from datetime import datetime

from database import get_database
from utils.jwt import get_uid_from_request

router = APIRouter(prefix="/messages", tags=["Messages"])


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