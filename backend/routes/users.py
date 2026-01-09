# routes/users.py

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from typing import Optional
from jose.jwt import decode as jwt_decode
from config import JWT_SECRET, JWT_ALGORITHM
from utils.jwt import verify_token_bool, get_uid_from_request
from database import get_database
from datetime import datetime
import re

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/search")
async def search_users(
    request: Request,
    q: str = Query(..., min_length=1),
    db=Depends(get_database)
):
    # -------------------------
    # AUTH CHECK
    # -------------------------
    auth_header = request.headers.get("authorization")

    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing access token")

    token = auth_header.split(" ")[1]

    if not verify_token_bool(token):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    payload = jwt_decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    uid = payload.get("uid")

    users = db["users"]

    # -------------------------
    # CURRENT USER
    # -------------------------
    current_user = await users.find_one({"email": uid})

    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")

    # FIX: Extract only email strings
    contact_emails = [
        c.get("email") for c in current_user.get("contact_list", [])
        if isinstance(c, dict) and c.get("email")
    ]

    # -------------------------
    # REGEX SEARCH
    # -------------------------
    regex = re.compile(q, re.IGNORECASE)
    search_filter = {
        "$or": [
            {"username": {"$regex": regex}},
            {"name": {"$regex": regex}}
        ]
    }

    # -------------------------
    # CONTACT SEARCH
    # -------------------------
    contacts_cursor = users.find(
        {
            "email": {"$in": contact_emails},
            **search_filter
        },
        {
            "_id": 0,
            "email": 1,
            "name": 1,
            "username": 1,
            "profile_picture": 1
        }
    )
    contacts = [user async for user in contacts_cursor]

    # -------------------------
    # GLOBAL SEARCH
    # -------------------------
    global_cursor = users.find(
        {
            **search_filter,
            "email": {
                "$nin": contact_emails + [uid]
            }
        },
        {
            "_id": 0,
            "email": 1,
            "name": 1,
            "username": 1,
            "profile_picture": 1
        }
    ).limit(20)

    global_users = [user async for user in global_cursor]

    return {
        "success": True,
        "query": q,
        "results": {
            "contacts": contacts,
            "global": global_users
        }
    }

@router.get("/me")
async def get_me(
    request: Request,
    db=Depends(get_database)
):
    # -------------------------
    # AUTH CHECK
    # -------------------------
    auth_header = request.headers.get("authorization")

    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing access token")

    token = auth_header.split(" ")[1]

    if not verify_token_bool(token):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    payload = jwt_decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    uid = payload.get("uid")

    users = db["users"]

    # -------------------------
    # FETCH USER
    # -------------------------
    user = await users.find_one(
        {"email": uid},
        {
            "_id": 0,
            "email": 1,
            "name": 1,
            "username": 1,
            "profile_picture": 1,
            "created_at": 1,
        }
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # -------------------------
    # RESPONSE
    # -------------------------
    return {
        "success": True,
        "user": user
    }

@router.post("/info")
async def get_user_info(
    email: dict,
    request: Request,
    db=Depends(get_database)
):
    # -------------------------
    # AUTH CHECK
    # -------------------------
    auth_header = request.headers.get("authorization")

    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing access token")

    token = auth_header.split(" ")[1]
    email_to_add = email.get("email")
    if not verify_token_bool(token):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    users = db["users"]

    # -------------------------
    # FETCH USER
    # -------------------------
    user = await users.find_one(
        {"email": email_to_add},
        {
            "_id": 0,
            "email": 1,
            "name": 1,
            "username": 1,
            "profile_picture": 1,
            "created_at": 1
        }
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "success": True,
        "user": user
    }

@router.post("/add")
async def add_user_to_contacts(
    payload: dict,
    request: Request,
    db=Depends(get_database)
):
    email_to_add = payload.get("email")

    if not email_to_add:
        raise HTTPException(status_code=400, detail="Email is required")

    # -------------------------
    # AUTH CHECK
    # -------------------------
    auth_header = request.headers.get("authorization")

    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing access token")

    token = auth_header.split(" ")[1]

    if not verify_token_bool(token):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    payload = jwt_decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    uid = payload.get("uid")

    users = db["users"]

    # -------------------------
    # VALIDATIONS
    # -------------------------
    if email_to_add == uid:
        raise HTTPException(status_code=400, detail="You cannot add yourself")

    target_user = await users.find_one({"email": email_to_add})
    if not target_user:
        raise HTTPException(status_code=404, detail="User does not exist")

    # Check if already in contacts
    existing_contact = await users.find_one({
        "email": uid,
        "contact_list.email": email_to_add
    })

    if existing_contact:
        raise HTTPException(status_code=409, detail="User already in contacts")

    # -------------------------
    # ADD TO CONTACT LIST
    # -------------------------
    contact_object = {
        "email": email_to_add,
        "muted": False,
        "blocked": False,
        "archived": False,
        "is_deleted": False,
        "is_favorited": False,
        "is_pinned": False,
        "added_at": datetime.utcnow()
    }

    await users.update_one(
        {"email": uid},
        {"$push": {"contact_list": contact_object}}
    )

    return {
        "success": True,
        "message": "User added to contacts"
    }

@router.post("/remove")
async def remove_user_from_contacts(
    payload: dict,
    request: Request,
    db=Depends(get_database)
):
    email_to_remove = payload.get("email")

    if not email_to_remove:
        raise HTTPException(status_code=400, detail="Email is required")

    # -------------------------
    # AUTH CHECK
    # -------------------------
    auth_header = request.headers.get("authorization")

    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing access token")

    token = auth_header.split(" ")[1]

    if not verify_token_bool(token):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    payload = jwt_decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    uid = payload.get("uid")

    users = db["users"]

    # -------------------------
    # REMOVE FROM CONTACT LIST
    # -------------------------
    result = await users.update_one(
        {"email": uid},
        {"$pull": {"contact_list": {"email": email_to_remove}}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found in contacts")

    return {
        "success": True,
        "message": "User removed from contacts"
    }

@router.post("/mute")
async def toggle_mute_user(
    payload: dict,
    request: Request,
    db=Depends(get_database)
):
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    uid = get_uid_from_request(request)
    users = db["users"]

    user = await users.find_one(
        {"email": uid, "contact_list.email": email},
        {"contact_list.$": 1}
    )

    if not user or "contact_list" not in user:
        raise HTTPException(status_code=404, detail="User not in contacts")

    current_state = user["contact_list"][0]["muted"]
    new_state = not current_state

    await users.update_one(
        {"email": uid, "contact_list.email": email},
        {"$set": {"contact_list.$.muted": new_state}}
    )

    return {
        "success": True,
        "muted": new_state
    }

@router.post("/block")
async def toggle_block_user(
    payload: dict,
    request: Request,
    db=Depends(get_database)
):
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    uid = get_uid_from_request(request)
    users = db["users"]

    user = await users.find_one(
        {"email": uid, "contact_list.email": email},
        {"contact_list.$": 1}
    )

    if not user or "contact_list" not in user:
        raise HTTPException(status_code=404, detail="User not in contacts")

    current_state = user["contact_list"][0]["blocked"]
    new_state = not current_state

    await users.update_one(
        {"email": uid, "contact_list.email": email},
        {
            "$set": {
                "contact_list.$.blocked": new_state,
            }
        }
    )

    return {
        "success": True,
        "blocked": new_state
    }

@router.post("/archive")
async def toggle_archive_user(
    payload: dict,
    request: Request,
    db=Depends(get_database)
):
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    uid = get_uid_from_request(request)
    users = db["users"]

    user = await users.find_one(
        {"email": uid, "contact_list.email": email},
        {"contact_list.$": 1}
    )

    if not user or "contact_list" not in user:
        raise HTTPException(status_code=404, detail="User not in contacts")

    current_state = user["contact_list"][0]["archived"]
    new_state = not current_state

    await users.update_one(
        {"email": uid, "contact_list.email": email},
        {"$set": {"contact_list.$.archived": new_state}}
    )

    return {
        "success": True,
        "archived": new_state
    }

@router.post("/favorite")
async def toggle_favorite_user(
    payload: dict,
    request: Request,
    db=Depends(get_database)
):
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    uid = get_uid_from_request(request)
    users = db["users"]

    user = await users.find_one(
        {"email": uid, "contact_list.email": email},
        {"contact_list.$": 1}
    )

    if not user or "contact_list" not in user:
        raise HTTPException(status_code=404, detail="User not in contacts")

    current_state = user["contact_list"][0]["is_favorited"]
    new_state = not current_state

    await users.update_one(
        {"email": uid, "contact_list.email": email},
        {"$set": {"contact_list.$.is_favorited": new_state}}
    )

    return {
        "success": True,
        "is_favorited": new_state
    }

@router.post("/deleted")
async def toggle_deleted_user(
    payload: dict,
    request: Request,
    db=Depends(get_database)
):
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    uid = get_uid_from_request(request)
    users = db["users"]

    user = await users.find_one(
        {"email": uid, "contact_list.email": email},
        {"contact_list.$": 1}
    )

    if not user or "contact_list" not in user:
        raise HTTPException(status_code=404, detail="User not in contacts")

    current_state = user["contact_list"][0]["is_deleted"]
    new_state = not current_state

    await users.update_one(
        {"email": uid, "contact_list.email": email},
        {"$set": {"contact_list.$.is_deleted": new_state}}
    )

    return {
        "success": True,
        "is_deleted": new_state
    }

@router.post("/pinned")
async def toggle_deleted_user(
    payload: dict,
    request: Request,
    db=Depends(get_database)
):
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    uid = get_uid_from_request(request)
    users = db["users"]

    user = await users.find_one(
        {"email": uid, "contact_list.email": email},
        {"contact_list.$": 1}
    )

    if not user or "contact_list" not in user:
        raise HTTPException(status_code=404, detail="User not in contacts")

    current_state = user["contact_list"][0]["is_pinned"]
    new_state = not current_state

    await users.update_one(
        {"email": uid, "contact_list.email": email},
        {"$set": {"contact_list.$.is_pinned": new_state}}
    )

    return {
        "success": True,
        "is_pinned": new_state
    }

@router.get("/contacts")
async def get_contacts(
    request: Request,
    db=Depends(get_database),
    muted: Optional[bool] = Query(None),
    archived: Optional[bool] = Query(None),
    blocked: Optional[bool] = Query(None)
):
    """
    Fetch the user's contacts with optional filters:
    - muted
    - archived
    - blocked (useful for admin or debugging; defaults hidden)
    
    By default, blocked users are excluded.
    """
    uid = get_uid_from_request(request)
    users = db["users"]

    # Fetch the contact list
    user = await users.find_one({"email": uid}, {"contact_list": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    contacts = user.get("contact_list", [])

    # Apply filters
    filtered_contacts = []
    for contact in contacts:
        # Default behavior: exclude blocked contacts unless explicitly requested
        if blocked is None and contact.get("blocked", False):
            continue

        if muted is not None and contact.get("muted", False) != muted:
            continue
        if archived is not None and contact.get("archived", False) != archived:
            continue
        if blocked is not None and contact.get("blocked", False) != blocked:
            continue

        filtered_contacts.append(contact)

    return {
        "success": True,
        "contacts": filtered_contacts
    }