# routes/conversations.py

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from bson import ObjectId
from datetime import datetime
from models.conversation import CreateDMRequest
from database import get_database
from utils.jwt import get_uid_from_request

router = APIRouter(prefix="/conversations", tags=["Conversations"])

@router.post("/create")
async def create_dm_conversation(
    payload: CreateDMRequest,
    request: Request,
    db=Depends(get_database),
):
    """
    Create or fetch a DM conversation between two users
    """

    # -------------------------
    # AUTH
    # -------------------------
    my_email = get_uid_from_request(request)
    other_email = payload.email

    if my_email == other_email:
        raise HTTPException(
            status_code=400,
            detail="Cannot create conversation with yourself"
        )

    users = db["users"]
    conversations = db["conversations"]

    # -------------------------
    # VALIDATE OTHER USER
    # -------------------------
    other_user = await users.find_one({"email": other_email})
    if not other_user:
        raise HTTPException(
            status_code=404,
            detail="User does not exist"
        )

    # -------------------------
    # CHECK EXISTING DM
    # -------------------------
    existing_conversation = await conversations.find_one({
        "type": "dm",
        "participants": {
            "$all": [my_email, other_email],
            "$size": 2
        }
    })

    if existing_conversation:
        return {
            "success": True,
            "conversation_id": str(existing_conversation["_id"]),
            "email": payload.email,
            "already_exists": True
        }

    # -------------------------
    # CREATE NEW DM
    # -------------------------
    conversation = {
        "type": "dm",
        "participants": [my_email, other_email],
        "created_at": datetime.utcnow(),
        "last_message": None,
        "pinned_messages": [],
    }

    result = await conversations.insert_one(conversation)

    return {
        "success": True,
        "conversation_id": str(result.inserted_id),
        "email": payload.email,
        "already_exists": False
    }

@router.get("/info")
async def get_conversation_info(
    request: Request,
    conversation_id: str = Query(...)
):
    """
    Fetch full conversation document by conversation_id.
    """

    user_id = get_uid_from_request(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    db = await get_database()
    conversations = db["conversations"]

    try:
        conversation = await conversations.find_one({"_id": ObjectId(conversation_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid conversation_id")

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Convert fields
    conversation["_id"] = str(conversation["_id"])
    conversation["created_at"] = conversation["created_at"].isoformat() + "Z"

    return conversation