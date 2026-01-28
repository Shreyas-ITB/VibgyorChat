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
    """
    Search for users (Only admin users can search)
    """
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
    # CHECK IF USER IS ADMIN
    # -------------------------
    current_user = await users.find_one({"email": uid})
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not current_user.get("employ_id"):
        raise HTTPException(
            status_code=403, 
            detail="Only admin users can search for other users"
        )

    # -------------------------
    # CURRENT USER CONTACTS
    # -------------------------
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
            "employ_id": 1,
        }
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # -------------------------
    # BUILD RESPONSE
    # -------------------------
    response_data = {
        "email": user.get("email"),
        "name": user.get("name"),
        "username": user.get("username"),
        "profile_picture": user.get("profile_picture"),
        "created_at": user.get("created_at"),
    }
    
    # Only include employ_id if it exists and is not None
    if user.get("employ_id") is not None:
        response_data["employ_id"] = user.get("employ_id")

    # -------------------------
    # RESPONSE
    # -------------------------
    return {
        "success": True,
        "user": response_data
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
    # ADD TO BOTH CONTACT LISTS (MUTUAL)
    # -------------------------
    current_time = datetime.utcnow()
    
    # Contact object for current user's contact list
    contact_object_for_current_user = {
        "email": email_to_add,
        "muted": False,
        "blocked": False,
        "archived": False,
        "is_deleted": False,
        "is_favorited": False,
        "is_pinned": False,
        "added_at": current_time
    }

    # Contact object for target user's contact list
    contact_object_for_target_user = {
        "email": uid,
        "muted": False,
        "blocked": False,
        "archived": False,
        "is_deleted": False,
        "is_favorited": False,
        "is_pinned": False,
        "added_at": current_time
    }

    # Add current user to target user's contacts (if not already there)
    existing_reverse_contact = await users.find_one({
        "email": email_to_add,
        "contact_list.email": uid
    })

    # Add to current user's contact list
    await users.update_one(
        {"email": uid},
        {"$push": {"contact_list": contact_object_for_current_user}}
    )

    # Add to target user's contact list (only if not already there)
    if not existing_reverse_contact:
        await users.update_one(
            {"email": email_to_add},
            {"$push": {"contact_list": contact_object_for_target_user}}
        )

    return {
        "success": True,
        "message": "User added to contacts (mutual contact established)",
        "mutual_contact": not bool(existing_reverse_contact)
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
    # REMOVE FROM BOTH CONTACT LISTS (MUTUAL)
    # -------------------------
    
    # Remove from current user's contact list
    result = await users.update_one(
        {"email": uid},
        {"$pull": {"contact_list": {"email": email_to_remove}}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found in contacts")

    # Remove current user from target user's contact list
    await users.update_one(
        {"email": email_to_remove},
        {"$pull": {"contact_list": {"email": uid}}}
    )

    return {
        "success": True,
        "message": "User removed from contacts (mutual contact removed)"
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

    # Prepare update fields
    update_fields = {
        "contact_list.$.blocked": new_state,
    }
    
    # If blocking the user, set blocked_at timestamp
    # If unblocking, remove the blocked_at field
    if new_state:
        update_fields["contact_list.$.blocked_at"] = datetime.utcnow()
    else:
        # When unblocking, we'll use $unset to remove blocked_at
        await users.update_one(
            {"email": uid, "contact_list.email": email},
            {
                "$set": {"contact_list.$.blocked": new_state},
                "$unset": {"contact_list.$.blocked_at": ""}
            }
        )
        return {
            "success": True,
            "blocked": new_state
        }

    await users.update_one(
        {"email": uid, "contact_list.email": email},
        {"$set": update_fields}
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

@router.get("/getgroupdata")
async def get_group_data(
    request: Request,
    db=Depends(get_database)
):
    """
    Fetch the user's group_list with all group preferences
    """
    uid = get_uid_from_request(request)
    users = db["users"]

    # Fetch the group list
    user = await users.find_one({"email": uid}, {"group_list": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    group_list = user.get("group_list", [])

    return {
        "success": True,
        "group_list": group_list,
        "count": len(group_list)
    }


@router.get("/blocked")
async def get_blocked_users(
    request: Request,
    db=Depends(get_database)
):
    """
    Fetch all blocked users from the current user's contacts with their full information
    """
    uid = get_uid_from_request(request)
    users = db["users"]

    # Fetch the user's contact list
    user = await users.find_one({"email": uid}, {"contact_list": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    contacts = user.get("contact_list", [])

    # Filter blocked contacts
    blocked_contacts = [
        contact for contact in contacts 
        if contact.get("blocked", False) is True
    ]

    # Extract blocked user emails
    blocked_emails = [contact.get("email") for contact in blocked_contacts]

    if not blocked_emails:
        return {
            "success": True,
            "blocked_users": [],
            "count": 0
        }

    # Fetch full user information for blocked users
    blocked_users_cursor = users.find(
        {"email": {"$in": blocked_emails}},
        {
            "_id": 0,
            "email": 1,
            "name": 1,
            "username": 1,
            "profile_picture": 1,
            "created_at": 1
        }
    )

    blocked_users_info = []
    async for user_info in blocked_users_cursor:
        # Find the corresponding contact object to get blocked_at and other metadata
        contact_data = next(
            (c for c in blocked_contacts if c.get("email") == user_info["email"]), 
            {}
        )
        
        # Format datetime fields with Z suffix
        created_at = user_info.get("created_at")
        if created_at and hasattr(created_at, 'isoformat'):
            created_at = created_at.isoformat() + "Z"
        
        # Use the actual blocked_at timestamp (not added_at)
        blocked_at = contact_data.get("blocked_at")
        if blocked_at and hasattr(blocked_at, 'isoformat'):
            blocked_at = blocked_at.isoformat() + "Z"
        
        # Merge user info with contact metadata
        blocked_user = {
            "email": user_info.get("email"),
            "name": user_info.get("name"),
            "username": user_info.get("username"),
            "profile_picture": user_info.get("profile_picture"),
            "created_at": created_at,
            "blocked_at": blocked_at,
            "muted": contact_data.get("muted", False),
            "archived": contact_data.get("archived", False),
            "is_favorited": contact_data.get("is_favorited", False),
            "is_pinned": contact_data.get("is_pinned", False)
        }
        blocked_users_info.append(blocked_user)

    return {
        "success": True,
        "blocked_users": blocked_users_info,
        "count": len(blocked_users_info)
    }