# routes/conversations.py

from fastapi import APIRouter, Depends, HTTPException, Query, Request, File, UploadFile
from bson import ObjectId
from datetime import datetime
import os
import uuid
from models.conversation import CreateDMRequest, CreateGroupRequest, EditGroupRequest, LeaveGroupRequest, JoinGroupRequest, ApproveJoinRequest, RejectJoinRequest, CancelJoinRequest
from database import get_database
from utils.jwt import get_uid_from_request
from routes.auth import generate_avatar

router = APIRouter(prefix="/conversations", tags=["Conversations"])
UPLOAD_DIR = "uploads/profile_pictures"
os.makedirs(UPLOAD_DIR, exist_ok=True)

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
    Works for both DM and group conversations.
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

    # Verify user is a participant
    if user_id not in conversation.get("participants", []):
        raise HTTPException(status_code=403, detail="You are not a participant in this conversation")

    # Convert fields
    conversation["_id"] = str(conversation["_id"])
    conversation["created_at"] = conversation["created_at"].isoformat() + "Z"

    return conversation


@router.post("/create/group")
async def create_group_conversation(
    payload: CreateGroupRequest,
    request: Request,
    db=Depends(get_database),
):
    """
    Create a group conversation with multiple participants
    (Only admin users can create groups)
    """

    # -------------------------
    # AUTH
    # -------------------------
    owner_email = get_uid_from_request(request)
    
    users = db["users"]
    conversations = db["conversations"]

    # -------------------------
    # CHECK IF USER IS ADMIN
    # -------------------------
    owner_user = await users.find_one({"email": owner_email})
    if not owner_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not owner_user.get("employ_id"):
        raise HTTPException(
            status_code=403, 
            detail="Only admin users can create groups"
        )

    # -------------------------
    # VALIDATE PARTICIPANTS
    # -------------------------
    all_participants = [owner_email] + payload.participants
    
    # Remove duplicates
    all_participants = list(set(all_participants))
    
    # Validate all users exist
    for participant_email in payload.participants:
        user = await users.find_one({"email": participant_email})
        if not user:
            raise HTTPException(
                status_code=404,
                detail=f"User {participant_email} does not exist"
            )

    # -------------------------
    # GENERATE GROUP PICTURE
    # -------------------------
    group_picture_url = generate_avatar(payload.group_name)

    # -------------------------
    # CREATE GROUP
    # -------------------------
    conversation = {
        "type": "group",
        "group_name": payload.group_name,
        "group_description": payload.group_description,
        "group_picture": group_picture_url,
        "participants": all_participants,
        "owner": owner_email,
        "admins": [],
        "roles": [],
        "role_assignments": {},
        "created_at": datetime.utcnow(),
        "last_message": None,
        "pinned_messages": [],
    }

    result = await conversations.insert_one(conversation)
    conversation_id = str(result.inserted_id)

    # -------------------------
    # ADD TO EACH USER'S GROUP LIST
    # -------------------------
    group_object = {
        "conversation_id": conversation_id,
        "muted": False,
        "archived": False,
        "is_deleted": False,
        "is_favorited": False,
        "is_pinned": False,
        "joined_at": datetime.utcnow()
    }

    for participant_email in all_participants:
        await users.update_one(
            {"email": participant_email},
            {"$push": {"group_list": group_object}}
        )

    return {
        "success": True,
        "conversation_id": conversation_id,
        "group_name": payload.group_name,
        "group_picture": group_picture_url,
        "owner": owner_email,
        "participants": all_participants
    }


@router.put("/edit/group")
async def edit_group_conversation(
    payload: EditGroupRequest,
    conversation_id: str = Query(...),
    request: Request = None,
    db=Depends(get_database),
):
    """
    Edit a group conversation (only owner can edit)
    Accepts JSON payload with fields to update
    """

    # -------------------------
    # AUTH
    # -------------------------
    user_email = get_uid_from_request(request)
    
    conversations = db["conversations"]
    users = db["users"]

    # -------------------------
    # VALIDATE CONVERSATION
    # -------------------------
    try:
        conversation = await conversations.find_one({"_id": ObjectId(conversation_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid conversation_id")

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if conversation.get("type") != "group":
        raise HTTPException(status_code=400, detail="Not a group conversation")

    # -------------------------
    # CHECK OWNERSHIP
    # -------------------------
    if conversation.get("owner") != user_email:
        raise HTTPException(
            status_code=403,
            detail="Only the group owner can edit the group"
        )

    # -------------------------
    # BUILD UPDATE OPERATIONS
    # -------------------------
    update_ops = {}
    
    # Update basic info
    if payload.group_name is not None:
        update_ops["group_name"] = payload.group_name
    
    if payload.group_description is not None:
        update_ops["group_description"] = payload.group_description

    # Handle participants
    if payload.add_participants:
        participant_list = [str(email) for email in payload.add_participants]
        for email in participant_list:
            user = await users.find_one({"email": email})
            if not user:
                raise HTTPException(status_code=404, detail=f"User {email} does not exist")
        
        current_participants = conversation.get("participants", [])
        new_participants = list(set(current_participants + participant_list))
        update_ops["participants"] = new_participants

    if payload.remove_participants:
        participant_list = [str(email) for email in payload.remove_participants]
        current_participants = conversation.get("participants", [])
        # Don't allow removing the owner
        if user_email in participant_list:
            raise HTTPException(status_code=400, detail="Cannot remove the owner from the group")
        
        new_participants = [p for p in current_participants if p not in participant_list]
        update_ops["participants"] = new_participants
        
        # Also remove from admins if they were admins
        current_admins = conversation.get("admins", [])
        new_admins = [a for a in current_admins if a not in participant_list]
        update_ops["admins"] = new_admins

    # Handle admins
    if payload.add_admins:
        admin_list = [str(email) for email in payload.add_admins]
        current_admins = conversation.get("admins", [])
        current_participants = update_ops.get("participants", conversation.get("participants", []))
        
        # Validate admins are participants
        for email in admin_list:
            if email not in current_participants:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot add {email} as admin - not a participant"
                )
        
        new_admins = list(set(current_admins + admin_list))
        update_ops["admins"] = new_admins

    if payload.remove_admins:
        admin_list = [str(email) for email in payload.remove_admins]
        current_admins = conversation.get("admins", [])
        new_admins = [a for a in current_admins if a not in admin_list]
        update_ops["admins"] = new_admins

    # Handle roles
    if payload.add_role:
        current_roles = conversation.get("roles", [])
        # Check if role name already exists
        if any(r.get("name") == payload.add_role.name for r in current_roles):
            raise HTTPException(status_code=400, detail=f"Role {payload.add_role.name} already exists")
        
        current_roles.append({"name": payload.add_role.name, "color": payload.add_role.color})
        update_ops["roles"] = current_roles

    if payload.remove_role:
        current_roles = conversation.get("roles", [])
        new_roles = [r for r in current_roles if r.get("name") != payload.remove_role]
        update_ops["roles"] = new_roles
        
        # Remove role assignments for this role
        current_assignments = conversation.get("role_assignments", {})
        new_assignments = {}
        for email, role_list in current_assignments.items():
            if isinstance(role_list, list):
                # New format: list of roles
                filtered_roles = [role for role in role_list if role != payload.remove_role]
                if filtered_roles:  # Only keep if user still has other roles
                    new_assignments[email] = filtered_roles
            else:
                # Legacy format: single role (convert to new format)
                if role_list != payload.remove_role:
                    new_assignments[email] = [role_list]
        update_ops["role_assignments"] = new_assignments

    if payload.assign_roles:
        # payload.assign_roles should be {email: [role_names]}
        current_assignments = conversation.get("role_assignments", {})
        current_roles = update_ops.get("roles", conversation.get("roles", []))
        current_participants = update_ops.get("participants", conversation.get("participants", []))
        
        for email, role_names in payload.assign_roles.items():
            # Validate user is participant
            if email not in current_participants:
                raise HTTPException(status_code=400, detail=f"User {email} is not a participant")
            
            # Ensure role_names is a list
            if isinstance(role_names, str):
                role_names = [role_names]
            
            # Validate all roles exist
            available_role_names = [r.get("name") for r in current_roles]
            for role_name in role_names:
                if role_name not in available_role_names:
                    raise HTTPException(status_code=404, detail=f"Role {role_name} does not exist")
            
            # Get current user roles (convert legacy format if needed)
            current_user_roles = current_assignments.get(email, [])
            if isinstance(current_user_roles, str):
                # Legacy format: convert single role to list
                current_user_roles = [current_user_roles]
            elif not isinstance(current_user_roles, list):
                current_user_roles = []
            
            # Add new roles (avoid duplicates)
            updated_roles = list(set(current_user_roles + role_names))
            
            # Check maximum roles limit (6 roles max)
            if len(updated_roles) > 6:
                raise HTTPException(
                    status_code=400, 
                    detail=f"User {email} cannot have more than 6 roles. Currently has {len(current_user_roles)} roles, trying to add {len(role_names)} more."
                )
            
            current_assignments[email] = updated_roles
        
        update_ops["role_assignments"] = current_assignments

    if payload.unassign_roles:
        # payload.unassign_roles should be {email: [role_names]} or {email: "all"}
        current_assignments = conversation.get("role_assignments", {})
        
        for email, roles_to_remove in payload.unassign_roles.items():
            if email not in current_assignments:
                continue  # User has no roles assigned
            
            current_user_roles = current_assignments[email]
            
            # Convert legacy format if needed
            if isinstance(current_user_roles, str):
                current_user_roles = [current_user_roles]
            elif not isinstance(current_user_roles, list):
                continue  # Invalid format, skip
            
            if roles_to_remove == "all":
                # Remove all roles for this user
                del current_assignments[email]
            else:
                # Remove specific roles
                if isinstance(roles_to_remove, str):
                    roles_to_remove = [roles_to_remove]
                
                updated_roles = [role for role in current_user_roles if role not in roles_to_remove]
                
                if updated_roles:
                    current_assignments[email] = updated_roles
                else:
                    # No roles left, remove user from assignments
                    del current_assignments[email]
        
        update_ops["role_assignments"] = current_assignments

    # -------------------------
    # APPLY UPDATES
    # -------------------------
    if update_ops:
        await conversations.update_one(
            {"_id": ObjectId(conversation_id)},
            {"$set": update_ops}
        )

    return {
        "success": True,
        "conversation_id": conversation_id,
        "updated_fields": list(update_ops.keys())
    }


@router.delete("/delete/group")
async def delete_group_conversation(
    conversation_id: str,
    request: Request,
    db=Depends(get_database),
):
    """
    Delete a group conversation (only owner can delete)
    """

    # -------------------------
    # AUTH
    # -------------------------
    user_email = get_uid_from_request(request)
    
    conversations = db["conversations"]

    # -------------------------
    # VALIDATE CONVERSATION
    # -------------------------
    try:
        conversation = await conversations.find_one({"_id": ObjectId(conversation_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid conversation_id")

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if conversation.get("type") != "group":
        raise HTTPException(status_code=400, detail="Not a group conversation")

    # -------------------------
    # CHECK OWNERSHIP
    # -------------------------
    if conversation.get("owner") != user_email:
        raise HTTPException(
            status_code=403,
            detail="Only the group owner can delete the group"
        )

    # -------------------------
    # DELETE GROUP
    # -------------------------
    await conversations.delete_one({"_id": ObjectId(conversation_id)})

    return {
        "success": True,
        "conversation_id": conversation_id,
        "message": "Group conversation deleted successfully"
    }


@router.post("/group/join")
async def join_group_conversation(
    payload: JoinGroupRequest,
    request: Request,
    db=Depends(get_database),
):
    """
    Request to join a group conversation via URL/invitation link
    Creates a pending join request that requires admin/owner approval
    """

    # -------------------------
    # AUTH
    # -------------------------
    user_email = get_uid_from_request(request)
    
    conversations = db["conversations"]
    users = db["users"]

    # -------------------------
    # VALIDATE CONVERSATION
    # -------------------------
    try:
        conversation = await conversations.find_one({"_id": ObjectId(payload.conversation_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid conversation_id")

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if conversation.get("type") != "group":
        raise HTTPException(status_code=400, detail="Not a group conversation")

    # -------------------------
    # CHECK IF ALREADY A PARTICIPANT
    # -------------------------
    current_participants = conversation.get("participants", [])
    
    if user_email in current_participants:
        return {
            "success": True,
            "conversation_id": payload.conversation_id,
            "message": "Already a member of this group",
            "already_member": True,
            "status": "approved"
        }

    # -------------------------
    # CHECK IF REQUEST ALREADY EXISTS
    # -------------------------
    pending_requests = conversation.get("pending_join_requests", [])
    
    # Check if user already has a pending request
    existing_request = next(
        (req for req in pending_requests if req.get("email") == user_email),
        None
    )
    
    if existing_request:
        return {
            "success": True,
            "conversation_id": payload.conversation_id,
            "message": "Join request already pending approval",
            "already_requested": True,
            "status": "pending",
            "requested_at": existing_request.get("requested_at")
        }

    # -------------------------
    # CREATE JOIN REQUEST
    # -------------------------
    join_request = {
        "email": user_email,
        "requested_at": datetime.utcnow(),
        "status": "pending"
    }

    await conversations.update_one(
        {"_id": ObjectId(payload.conversation_id)},
        {"$push": {"pending_join_requests": join_request}}
    )

    # -------------------------
    # GET USER INFO FOR NOTIFICATION
    # -------------------------
    user_info = await users.find_one(
        {"email": user_email},
        {"name": 1, "username": 1, "profile_picture": 1}
    )

    # -------------------------
    # BROADCAST TO ADMINS AND OWNER VIA SOCKET.IO
    # -------------------------
    try:
        from utils.socket_server import sio, USER_CONNECTIONS
        
        # Get owner and admins
        owner = conversation.get("owner")
        admins = conversation.get("admins", [])
        notifiable_users = [owner] + admins
        
        notification_data = {
            "type": "join_request",
            "conversation_id": payload.conversation_id,
            "group_name": conversation.get("group_name"),
            "requester": {
                "email": user_email,
                "name": user_info.get("name") if user_info else user_email,
                "username": user_info.get("username") if user_info else "",
                "profile_picture": user_info.get("profile_picture") if user_info else ""
            },
            "requested_at": join_request["requested_at"].isoformat() + "Z",
            "message": f"{user_info.get('name') if user_info else user_email} wants to join {conversation.get('group_name')}"
        }
        
        # Send to all admins and owner who are online
        for admin_email in notifiable_users:
            if admin_email in USER_CONNECTIONS:
                for sid in USER_CONNECTIONS[admin_email]:
                    await sio.emit("group_join_request", notification_data, to=sid)
                    print(f"📨 Sent join request notification to {admin_email}")
    except Exception as e:
        print(f"❌ Error broadcasting join request: {e}")

    return {
        "success": True,
        "conversation_id": payload.conversation_id,
        "message": "Join request sent. Waiting for admin approval.",
        "status": "pending",
        "group_name": conversation.get("group_name"),
        "requested_at": join_request["requested_at"].isoformat() + "Z"
    }


@router.get("/fetch/groups")
async def fetch_user_groups(
    request: Request,
    db=Depends(get_database),
):
    """
    Fetch all group conversations that the user is a participant in
    Import-related fields (is_imported, import_date, original_message_count) are only included for imported groups
    """

    # -------------------------
    # AUTH
    # -------------------------
    user_email = get_uid_from_request(request)
    
    conversations = db["conversations"]

    # -------------------------
    # FETCH USER'S GROUPS
    # -------------------------
    groups = await conversations.find({
        "type": "group",
        "participants": user_email
    }).to_list(length=None)

    # -------------------------
    # FORMAT RESPONSE
    # -------------------------
    formatted_groups = []
    for group in groups:
        formatted_group = {
            "_id": str(group["_id"]),
            "group_name": group.get("group_name"),
            "group_description": group.get("group_description"),
            "group_picture": group.get("group_picture"),
            "owner": group.get("owner"),
            "admins": group.get("admins", []),
            "participants": group.get("participants", []),
            "participant_count": len(group.get("participants", [])),
            "roles": group.get("roles", []),
            "role_assignments": group.get("role_assignments", {}),
            "created_at": group["created_at"].isoformat() + "Z",
            "last_message": group.get("last_message"),
            "pinned_messages": group.get("pinned_messages", []),
        }
        
        # Only add import-related fields if the group is actually imported
        if group.get("is_imported"):
            formatted_group["is_imported"] = True
            if group.get("import_date"):
                formatted_group["import_date"] = group.get("import_date").isoformat() + "Z"
            if group.get("original_message_count") is not None:
                formatted_group["original_message_count"] = group.get("original_message_count", 0)
        
        formatted_groups.append(formatted_group)

    return {
        "success": True,
        "groups": formatted_groups,
        "count": len(formatted_groups)
    }


@router.post("/mute")
async def toggle_mute_group(
    payload: dict,
    request: Request,
    db=Depends(get_database)
):
    """
    Toggle mute status for a group conversation
    """
    conversation_id = payload.get("conversation_id")
    if not conversation_id:
        raise HTTPException(status_code=400, detail="conversation_id is required")

    user_email = get_uid_from_request(request)
    users = db["users"]

    user = await users.find_one(
        {"email": user_email, "group_list.conversation_id": conversation_id},
        {"group_list.$": 1}
    )

    if not user or "group_list" not in user:
        raise HTTPException(status_code=404, detail="Group not in your list")

    current_state = user["group_list"][0]["muted"]
    new_state = not current_state

    await users.update_one(
        {"email": user_email, "group_list.conversation_id": conversation_id},
        {"$set": {"group_list.$.muted": new_state}}
    )

    return {
        "success": True,
        "muted": new_state
    }


@router.post("/archive")
async def toggle_archive_group(
    payload: dict,
    request: Request,
    db=Depends(get_database)
):
    """
    Toggle archive status for a group conversation
    """
    conversation_id = payload.get("conversation_id")
    if not conversation_id:
        raise HTTPException(status_code=400, detail="conversation_id is required")

    user_email = get_uid_from_request(request)
    users = db["users"]

    user = await users.find_one(
        {"email": user_email, "group_list.conversation_id": conversation_id},
        {"group_list.$": 1}
    )

    if not user or "group_list" not in user:
        raise HTTPException(status_code=404, detail="Group not in your list")

    current_state = user["group_list"][0]["archived"]
    new_state = not current_state

    await users.update_one(
        {"email": user_email, "group_list.conversation_id": conversation_id},
        {"$set": {"group_list.$.archived": new_state}}
    )

    return {
        "success": True,
        "archived": new_state
    }


@router.post("/favorite")
async def toggle_favorite_group(
    payload: dict,
    request: Request,
    db=Depends(get_database)
):
    """
    Toggle favorite status for a group conversation
    """
    conversation_id = payload.get("conversation_id")
    if not conversation_id:
        raise HTTPException(status_code=400, detail="conversation_id is required")

    user_email = get_uid_from_request(request)
    users = db["users"]

    user = await users.find_one(
        {"email": user_email, "group_list.conversation_id": conversation_id},
        {"group_list.$": 1}
    )

    if not user or "group_list" not in user:
        raise HTTPException(status_code=404, detail="Group not in your list")

    current_state = user["group_list"][0]["is_favorited"]
    new_state = not current_state

    await users.update_one(
        {"email": user_email, "group_list.conversation_id": conversation_id},
        {"$set": {"group_list.$.is_favorited": new_state}}
    )

    return {
        "success": True,
        "is_favorited": new_state
    }


@router.post("/deleted")
async def toggle_deleted_group(
    payload: dict,
    request: Request,
    db=Depends(get_database)
):
    """
    Toggle deleted status for a group conversation
    """
    conversation_id = payload.get("conversation_id")
    if not conversation_id:
        raise HTTPException(status_code=400, detail="conversation_id is required")

    user_email = get_uid_from_request(request)
    users = db["users"]

    user = await users.find_one(
        {"email": user_email, "group_list.conversation_id": conversation_id},
        {"group_list.$": 1}
    )

    if not user or "group_list" not in user:
        raise HTTPException(status_code=404, detail="Group not in your list")

    current_state = user["group_list"][0]["is_deleted"]
    new_state = not current_state

    await users.update_one(
        {"email": user_email, "group_list.conversation_id": conversation_id},
        {"$set": {"group_list.$.is_deleted": new_state}}
    )

    return {
        "success": True,
        "is_deleted": new_state
    }


@router.post("/pinned")
async def toggle_pinned_group(
    payload: dict,
    request: Request,
    db=Depends(get_database)
):
    """
    Toggle pinned status for a group conversation
    """
    conversation_id = payload.get("conversation_id")
    if not conversation_id:
        raise HTTPException(status_code=400, detail="conversation_id is required")

    user_email = get_uid_from_request(request)
    users = db["users"]

    user = await users.find_one(
        {"email": user_email, "group_list.conversation_id": conversation_id},
        {"group_list.$": 1}
    )

    if not user or "group_list" not in user:
        raise HTTPException(status_code=404, detail="Group not in your list")

    current_state = user["group_list"][0]["is_pinned"]
    new_state = not current_state

    await users.update_one(
        {"email": user_email, "group_list.conversation_id": conversation_id},
        {"$set": {"group_list.$.is_pinned": new_state}}
    )

    return {
        "success": True,
        "is_pinned": new_state
    }


@router.post("/leave")
async def leave_group_conversation(
    payload: LeaveGroupRequest,
    request: Request,
    db=Depends(get_database)
):
    """
    Leave a group conversation
    """
    conversation_id = payload.conversation_id

    user_email = get_uid_from_request(request)
    conversations = db["conversations"]
    users = db["users"]

    # -------------------------
    # VALIDATE CONVERSATION
    # -------------------------
    try:
        conversation = await conversations.find_one({"_id": ObjectId(conversation_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid conversation_id")

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if conversation.get("type") != "group":
        raise HTTPException(status_code=400, detail="Can only leave group conversations")

    # -------------------------
    # CHECK IF USER IS PARTICIPANT
    # -------------------------
    current_participants = conversation.get("participants", [])
    if user_email not in current_participants:
        raise HTTPException(status_code=400, detail="You are not a participant in this group")

    # -------------------------
    # PREVENT OWNER FROM LEAVING
    # -------------------------
    if conversation.get("owner") == user_email:
        raise HTTPException(
            status_code=403, 
            detail="Group owner cannot leave the group. You can delete the group instead using the delete endpoint."
        )

    # -------------------------
    # REGULAR PARTICIPANT LEAVING
    # -------------------------
    update_ops = {
        "participants": [p for p in current_participants if p != user_email],
        "admins": [a for a in conversation.get("admins", []) if a != user_email]  # Remove from admins if was admin
    }
    
    # Remove from role assignments
    current_assignments = conversation.get("role_assignments", {})
    if user_email in current_assignments:
        del current_assignments[user_email]
        update_ops["role_assignments"] = current_assignments
    
    await conversations.update_one(
        {"_id": ObjectId(conversation_id)},
        {"$set": update_ops}
    )

    # -------------------------
    # REMOVE FROM USER'S GROUP LIST
    # -------------------------
    await users.update_one(
        {"email": user_email},
        {"$pull": {"group_list": {"conversation_id": conversation_id}}}
    )

    return {
        "success": True,
        "conversation_id": conversation_id,
        "message": "Successfully left the group"
    }


@router.post("/group/join/approve")
async def approve_join_request(
    payload: ApproveJoinRequest,
    request: Request,
    db=Depends(get_database)
):
    """
    Approve a pending join request (Owner or Admin only)
    """
    user_email = get_uid_from_request(request)
    conversations = db["conversations"]
    users = db["users"]

    # -------------------------
    # VALIDATE CONVERSATION
    # -------------------------
    try:
        conversation = await conversations.find_one({"_id": ObjectId(payload.conversation_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid conversation_id")

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # -------------------------
    # CHECK PERMISSIONS (Owner or Admin)
    # -------------------------
    owner = conversation.get("owner")
    admins = conversation.get("admins", [])
    
    if user_email != owner and user_email not in admins:
        raise HTTPException(
            status_code=403,
            detail="Only group owner or admins can approve join requests"
        )

    # -------------------------
    # FIND AND REMOVE PENDING REQUEST
    # -------------------------
    pending_requests = conversation.get("pending_join_requests", [])
    request_to_approve = next(
        (req for req in pending_requests if req.get("email") == payload.requester_email),
        None
    )
    
    if not request_to_approve:
        raise HTTPException(status_code=404, detail="Join request not found")

    # Remove from pending requests
    await conversations.update_one(
        {"_id": ObjectId(payload.conversation_id)},
        {"$pull": {"pending_join_requests": {"email": payload.requester_email}}}
    )

    # -------------------------
    # ADD USER TO GROUP
    # -------------------------
    await conversations.update_one(
        {"_id": ObjectId(payload.conversation_id)},
        {"$addToSet": {"participants": payload.requester_email}}
    )

    # -------------------------
    # ADD TO USER'S GROUP LIST
    # -------------------------
    group_object = {
        "conversation_id": payload.conversation_id,
        "muted": False,
        "archived": False,
        "is_deleted": False,
        "is_favorited": False,
        "is_pinned": False,
        "joined_at": datetime.utcnow()
    }

    await users.update_one(
        {"email": payload.requester_email},
        {"$push": {"group_list": group_object}}
    )

    # -------------------------
    # BROADCAST APPROVAL VIA SOCKET.IO
    # -------------------------
    try:
        from utils.socket_server import sio, USER_CONNECTIONS
        
        # Notify the requester
        if payload.requester_email in USER_CONNECTIONS:
            approval_data = {
                "type": "join_request_approved",
                "conversation_id": payload.conversation_id,
                "group_name": conversation.get("group_name"),
                "approved_by": user_email,
                "message": f"Your request to join {conversation.get('group_name')} has been approved"
            }
            
            for sid in USER_CONNECTIONS[payload.requester_email]:
                await sio.emit("group_join_approved", approval_data, to=sid)
                print(f"✅ Sent approval notification to {payload.requester_email}")
        
        # Notify all admins and owner about the approval
        notifiable_users = [owner] + admins
        for admin_email in notifiable_users:
            if admin_email in USER_CONNECTIONS and admin_email != user_email:
                admin_notification = {
                    "type": "join_request_processed",
                    "conversation_id": payload.conversation_id,
                    "group_name": conversation.get("group_name"),
                    "requester_email": payload.requester_email,
                    "action": "approved",
                    "processed_by": user_email
                }
                
                for sid in USER_CONNECTIONS[admin_email]:
                    await sio.emit("group_join_request_update", admin_notification, to=sid)
    except Exception as e:
        print(f"❌ Error broadcasting approval: {e}")

    return {
        "success": True,
        "conversation_id": payload.conversation_id,
        "requester_email": payload.requester_email,
        "message": f"Successfully approved {payload.requester_email} to join the group",
        "action": "approved"
    }


@router.post("/group/join/reject")
async def reject_join_request(
    payload: RejectJoinRequest,
    request: Request,
    db=Depends(get_database)
):
    """
    Reject a pending join request (Owner or Admin only)
    """
    user_email = get_uid_from_request(request)
    conversations = db["conversations"]

    # -------------------------
    # VALIDATE CONVERSATION
    # -------------------------
    try:
        conversation = await conversations.find_one({"_id": ObjectId(payload.conversation_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid conversation_id")

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # -------------------------
    # CHECK PERMISSIONS (Owner or Admin)
    # -------------------------
    owner = conversation.get("owner")
    admins = conversation.get("admins", [])
    
    if user_email != owner and user_email not in admins:
        raise HTTPException(
            status_code=403,
            detail="Only group owner or admins can reject join requests"
        )

    # -------------------------
    # FIND AND REMOVE PENDING REQUEST
    # -------------------------
    pending_requests = conversation.get("pending_join_requests", [])
    request_to_reject = next(
        (req for req in pending_requests if req.get("email") == payload.requester_email),
        None
    )
    
    if not request_to_reject:
        raise HTTPException(status_code=404, detail="Join request not found")

    # Remove from pending requests
    await conversations.update_one(
        {"_id": ObjectId(payload.conversation_id)},
        {"$pull": {"pending_join_requests": {"email": payload.requester_email}}}
    )

    # -------------------------
    # BROADCAST REJECTION VIA SOCKET.IO
    # -------------------------
    try:
        from utils.socket_server import sio, USER_CONNECTIONS
        
        # Notify the requester
        if payload.requester_email in USER_CONNECTIONS:
            rejection_data = {
                "type": "join_request_rejected",
                "conversation_id": payload.conversation_id,
                "group_name": conversation.get("group_name"),
                "rejected_by": user_email,
                "message": f"Your request to join {conversation.get('group_name')} has been rejected"
            }
            
            for sid in USER_CONNECTIONS[payload.requester_email]:
                await sio.emit("group_join_rejected", rejection_data, to=sid)
                print(f"❌ Sent rejection notification to {payload.requester_email}")
        
        # Notify all admins and owner about the rejection
        notifiable_users = [owner] + admins
        for admin_email in notifiable_users:
            if admin_email in USER_CONNECTIONS and admin_email != user_email:
                admin_notification = {
                    "type": "join_request_processed",
                    "conversation_id": payload.conversation_id,
                    "group_name": conversation.get("group_name"),
                    "requester_email": payload.requester_email,
                    "action": "rejected",
                    "processed_by": user_email
                }
                
                for sid in USER_CONNECTIONS[admin_email]:
                    await sio.emit("group_join_request_update", admin_notification, to=sid)
    except Exception as e:
        print(f"❌ Error broadcasting rejection: {e}")

    return {
        "success": True,
        "conversation_id": payload.conversation_id,
        "requester_email": payload.requester_email,
        "message": f"Successfully rejected {payload.requester_email}'s join request",
        "action": "rejected"
    }


@router.get("/group/join/pending")
async def get_pending_join_requests(
    conversation_id: str = Query(...),
    request: Request = None,
    db=Depends(get_database)
):
    """
    Get all pending join requests for a group (Owner or Admin only)
    """
    user_email = get_uid_from_request(request)
    conversations = db["conversations"]
    users = db["users"]

    # -------------------------
    # VALIDATE CONVERSATION
    # -------------------------
    try:
        conversation = await conversations.find_one({"_id": ObjectId(conversation_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid conversation_id")

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # -------------------------
    # CHECK PERMISSIONS (Owner or Admin)
    # -------------------------
    owner = conversation.get("owner")
    admins = conversation.get("admins", [])
    
    if user_email != owner and user_email not in admins:
        raise HTTPException(
            status_code=403,
            detail="Only group owner or admins can view join requests"
        )

    # -------------------------
    # GET PENDING REQUESTS WITH USER INFO
    # -------------------------
    pending_requests = conversation.get("pending_join_requests", [])
    
    # Fetch user info for each requester
    enriched_requests = []
    for req in pending_requests:
        requester_email = req.get("email")
        user_info = await users.find_one(
            {"email": requester_email},
            {"name": 1, "username": 1, "profile_picture": 1, "created_at": 1}
        )
        
        enriched_request = {
            "email": requester_email,
            "requested_at": req.get("requested_at").isoformat() + "Z" if req.get("requested_at") else None,
            "status": req.get("status", "pending"),
            "user_info": {
                "name": user_info.get("name") if user_info else requester_email,
                "username": user_info.get("username") if user_info else "",
                "profile_picture": user_info.get("profile_picture") if user_info else "",
                "created_at": user_info.get("created_at").isoformat() + "Z" if user_info and user_info.get("created_at") else None
            }
        }
        enriched_requests.append(enriched_request)

    return {
        "success": True,
        "conversation_id": conversation_id,
        "group_name": conversation.get("group_name"),
        "pending_requests": enriched_requests,
        "count": len(enriched_requests)
    }


@router.get("/group/join/my-pending")
async def get_my_pending_join_requests(
    request: Request = None,
    db=Depends(get_database)
):
    """
    Get all pending join requests made by the current user
    Returns all groups where the user has a pending join request
    """
    user_email = get_uid_from_request(request)
    conversations = db["conversations"]

    # -------------------------
    # FIND ALL GROUPS WITH USER'S PENDING REQUEST
    # -------------------------
    # Query for groups where user has a pending request
    groups_with_pending = await conversations.find({
        "type": "group",
        "pending_join_requests": {
            "$elemMatch": {
                "email": user_email,
                "status": "pending"
            }
        }
    }).to_list(length=None)

    # -------------------------
    # FORMAT RESPONSE
    # -------------------------
    pending_requests = []
    for group in groups_with_pending:
        # Find the user's specific request in this group
        user_request = next(
            (req for req in group.get("pending_join_requests", []) 
             if req.get("email") == user_email and req.get("status") == "pending"),
            None
        )
        
        if user_request:
            pending_request = {
                "conversation_id": str(group["_id"]),
                "group_name": group.get("group_name"),
                "group_description": group.get("group_description"),
                "group_picture": group.get("group_picture"),
                "requested_at": user_request.get("requested_at").isoformat() + "Z" if user_request.get("requested_at") else None,
                "status": user_request.get("status", "pending"),
                "participant_count": len(group.get("participants", [])),
                "owner": group.get("owner"),
                "admins": group.get("admins", [])
            }
            pending_requests.append(pending_request)

    return {
        "success": True,
        "pending_requests": pending_requests,
        "count": len(pending_requests)
    }


@router.post("/group/join/cancel")
async def cancel_join_request(
    payload: CancelJoinRequest,
    request: Request = None,
    db=Depends(get_database)
):
    """
    Cancel a pending join request made by the current user
    User can only cancel their own pending requests
    """
    user_email = get_uid_from_request(request)
    conversations = db["conversations"]

    # -------------------------
    # VALIDATE CONVERSATION
    # -------------------------
    try:
        conversation = await conversations.find_one({"_id": ObjectId(payload.conversation_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid conversation_id")

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if conversation.get("type") != "group":
        raise HTTPException(status_code=400, detail="Can only cancel join requests for group conversations")

    # -------------------------
    # CHECK IF USER IS ALREADY A MEMBER
    # -------------------------
    if user_email in conversation.get("participants", []):
        raise HTTPException(
            status_code=400,
            detail="You are already a member of this group"
        )

    # -------------------------
    # FIND USER'S PENDING REQUEST
    # -------------------------
    pending_requests = conversation.get("pending_join_requests", [])
    
    user_request = next(
        (req for req in pending_requests if req.get("email") == user_email and req.get("status") == "pending"),
        None
    )

    if not user_request:
        raise HTTPException(
            status_code=404,
            detail="No pending join request found for this group"
        )

    # -------------------------
    # REMOVE PENDING REQUEST
    # -------------------------
    await conversations.update_one(
        {"_id": ObjectId(payload.conversation_id)},
        {"$pull": {"pending_join_requests": {"email": user_email}}}
    )

    # -------------------------
    # NOTIFY ADMINS VIA SOCKET.IO
    # -------------------------
    try:
        from utils.socket_server import sio, USER_CONNECTIONS
        
        # Get owner and admins
        owner = conversation.get("owner")
        admins = conversation.get("admins", [])
        admin_list = [owner] + admins if owner else admins
        
        # Broadcast to all online admins
        for admin_email in admin_list:
            if admin_email in USER_CONNECTIONS:
                for admin_sid in USER_CONNECTIONS[admin_email]:
                    await sio.emit(
                        "group_join_request_cancelled",
                        {
                            "type": "join_request_cancelled",
                            "conversation_id": payload.conversation_id,
                            "group_name": conversation.get("group_name"),
                            "requester_email": user_email,
                            "message": f"{user_email} cancelled their join request for {conversation.get('group_name')}"
                        },
                        to=admin_sid
                    )
                    print(f"📢 Notified admin {admin_email} about cancelled request from {user_email}")
    except Exception as e:
        print(f"❌ Error broadcasting cancel notification: {e}")
        # Don't fail the cancellation if broadcast fails

    return {
        "success": True,
        "conversation_id": payload.conversation_id,
        "group_name": conversation.get("group_name"),
        "message": f"Successfully cancelled your join request for {conversation.get('group_name')}",
        "action": "cancelled"
    }

