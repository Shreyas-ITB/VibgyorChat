# routes/backup.py

from fastapi import APIRouter, Depends, HTTPException, Request, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from bson import ObjectId
from datetime import datetime
import csv
import io
import os
from database import get_database
from utils.jwt import get_uid_from_request
from routes.auth import generate_avatar

router = APIRouter(prefix="/backup", tags=["Backup"])

@router.get("/export/group/chat")
async def export_group_chat(
    conversation_id: str = Query(...),
    request: Request = None,
    db=Depends(get_database),
):
    """
    Export all chat messages from a group conversation to CSV format
    """
    
    # -------------------------
    # AUTH
    # -------------------------
    user_email = get_uid_from_request(request)
    
    conversations = db["conversations"]
    messages = db["messages"]

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
        raise HTTPException(status_code=400, detail="Can only export group conversations")

    # -------------------------
    # CHECK PERMISSIONS
    # -------------------------
    current_participants = conversation.get("participants", [])
    if user_email not in current_participants:
        raise HTTPException(status_code=403, detail="You are not a participant in this group")

    # -------------------------
    # FETCH ALL MESSAGES
    # -------------------------
    messages_cursor = messages.find(
        {"conversation_id": conversation_id}
    ).sort("created_at", 1)  # Sort by creation time ascending
    
    all_messages = await messages_cursor.to_list(length=None)

    # -------------------------
    # PREPARE CSV DATA
    # -------------------------
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header with group info
    writer.writerow([
        "group_name",
        "group_description", 
        "message_id",
        "sender",
        "content", 
        "type",
        "media_filename",
        "media_url",
        "reply_to_message_id",
        "is_read",
        "is_deleted",
        "created_at",
        "edited_at",
        "pinned"
    ])
    
    # Get group info
    group_name = conversation.get("group_name", "Unknown Group")
    group_description = conversation.get("group_description", "No description available")
    
    # Write message data
    for message in all_messages:
        # Extract filename from media_url if it exists
        media_filename = ""
        media_url = ""
        if message.get("media_url"):
            media_url = message["media_url"]
            media_filename = os.path.basename(media_url)
        
        writer.writerow([
            group_name,  # Include group name in every row
            group_description,  # Include group description in every row
            str(message["_id"]),
            message.get("sender", ""),
            message.get("content", ""),
            message.get("type", "text"),
            media_filename,
            media_url,  # Include full media URL
            message.get("reply_to", ""),
            message.get("is_read", False),
            message.get("is_deleted", False),
            message.get("created_at", "").isoformat() if message.get("created_at") else "",
            message.get("edited_at", "").isoformat() if message.get("edited_at") else "",
            message.get("pinned", False)
        ])

    # -------------------------
    # PREPARE RESPONSE
    # -------------------------
    output.seek(0)
    
    # Generate filename with group name and timestamp
    group_name = conversation.get("group_name", "Unknown_Group")
    # Clean group name for filename
    safe_group_name = "".join(c for c in group_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
    safe_group_name = safe_group_name.replace(' ', '_')
    
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"{safe_group_name}_chat_export_{timestamp}.csv"
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/import/group/chat")
async def import_group_chat(
    file: UploadFile = File(...),
    request: Request = None,
    db=Depends(get_database),
):
    """
    Import chat messages from CSV file and create a new group with the data
    (for message recovery purposes - creates group with no members)
    Group name and description are read from the CSV file
    A profile picture is automatically generated using the group name
    """
    
    # -------------------------
    # AUTH
    # -------------------------
    user_email = get_uid_from_request(request)
    
    conversations = db["conversations"]
    messages = db["messages"]

    # -------------------------
    # VALIDATE FILE
    # -------------------------
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV file")

    # -------------------------
    # READ AND PARSE CSV
    # -------------------------
    try:
        content = await file.read()
        csv_content = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_content))
        
        # Validate CSV headers - check for required headers
        required_headers = {
            "group_name", "group_description", "message_id", "sender", "content", "type", 
            "reply_to_message_id", "is_read", "is_deleted", "created_at", "edited_at", "pinned"
        }
        
        # Optional headers for backward compatibility
        optional_headers = {"media_filename", "media_url"}
        
        csv_headers = set(csv_reader.fieldnames)
        
        if not required_headers.issubset(csv_headers):
            missing_headers = required_headers - csv_headers
            raise HTTPException(
                status_code=400, 
                detail=f"CSV must contain these required headers: {', '.join(missing_headers)}"
            )
        
        # Check which optional headers are present
        has_media_url = "media_url" in csv_headers
        has_media_filename = "media_filename" in csv_headers
        
        # Parse messages and extract group info
        imported_messages = []
        group_name = None
        group_description = None
        
        for row in csv_reader:
            try:
                # Extract group info from first row (should be same for all rows)
                if group_name is None:
                    group_name = row["group_name"] if row["group_name"] else "Imported Group"
                if group_description is None:
                    group_description = row["group_description"] if row["group_description"] else "No description available"
                
                # Parse datetime fields
                created_at = datetime.fromisoformat(row["created_at"].replace('Z', '+00:00')) if row["created_at"] else datetime.utcnow()
                edited_at = datetime.fromisoformat(row["edited_at"].replace('Z', '+00:00')) if row["edited_at"] else None
                
                # Handle media URLs with backward compatibility
                media_url = None
                if has_media_url and row.get("media_url"):
                    # Use media_url directly from CSV (preferred method)
                    media_url = row["media_url"]
                elif has_media_filename and row.get("media_filename"):
                    # Fallback: reconstruct from filename for backward compatibility
                    if row["type"] == "image":
                        media_url = f"uploads/profile_pictures/{row['media_filename']}"
                    else:
                        media_url = f"uploads/{row['media_filename']}"
                
                message = {
                    "sender": row["sender"],
                    "content": row["content"] if row["content"] else None,
                    "type": row["type"] if row["type"] else "text",
                    "media_url": media_url,
                    "reply_to": row["reply_to_message_id"] if row["reply_to_message_id"] else None,
                    "is_read": row["is_read"].lower() == "true" if row["is_read"] else False,
                    "is_deleted": row["is_deleted"].lower() == "true" if row["is_deleted"] else False,
                    "created_at": created_at,
                    "edited_at": edited_at,
                    "pinned": row["pinned"].lower() == "true" if row["pinned"] else False
                }
                imported_messages.append(message)
                
            except Exception as e:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Error parsing message data: {str(e)}"
                )
        
        # Set defaults if no group info found
        if group_name is None:
            group_name = "Imported Group"
        if group_description is None:
            group_description = "No description available"
                
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading CSV file: {str(e)}")

    # -------------------------
    # CREATE NEW GROUP (NO MEMBERS)
    # -------------------------
    # Generate group picture using the group name
    group_picture_url = generate_avatar(group_name)
    
    conversation = {
        "type": "group",
        "group_name": group_name,
        "group_description": group_description,
        "group_picture": group_picture_url,  # Generated avatar for imported groups
        "participants": [user_email],  # Only the importer as participant
        "owner": user_email,
        "admins": [],
        "roles": [],
        "role_assignments": {},
        "created_at": datetime.utcnow(),
        "last_message": None,
        "pinned_messages": [],
        "is_imported": True,  # Flag to indicate this is an imported group
        "import_date": datetime.utcnow(),
        "original_message_count": len(imported_messages)
    }

    result = await conversations.insert_one(conversation)
    conversation_id = str(result.inserted_id)

    # -------------------------
    # INSERT MESSAGES
    # -------------------------
    if imported_messages:
        # Add conversation_id to all messages
        for message in imported_messages:
            message["conversation_id"] = conversation_id
        
        # Insert all messages
        await messages.insert_many(imported_messages)
        
        # Update last_message in conversation if there are messages
        last_message = max(imported_messages, key=lambda x: x["created_at"])
        await conversations.update_one(
            {"_id": ObjectId(conversation_id)},
            {"$set": {"last_message": str(last_message.get("_id", ""))}}
        )

    # -------------------------
    # ADD TO USER'S GROUP LIST
    # -------------------------
    users = db["users"]
    group_object = {
        "conversation_id": conversation_id,
        "muted": False,
        "archived": False,
        "is_deleted": False,
        "is_favorited": False,
        "is_pinned": False,
        "joined_at": datetime.utcnow()
    }

    await users.update_one(
        {"email": user_email},
        {"$push": {"group_list": group_object}}
    )

    return {
        "success": True,
        "conversation_id": conversation_id,
        "group_name": group_name,
        "group_picture": group_picture_url,
        "messages_imported": len(imported_messages),
        "message": f"Successfully imported {len(imported_messages)} messages into new group '{group_name}'"
    }