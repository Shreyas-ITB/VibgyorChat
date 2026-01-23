# routes/admin.py

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
import os
import hashlib
from database import get_database
from models.auth import UserCreate
from routes.auth import generate_avatar
from config import ADMIN_DASHBOARD_USERNAME, ADMIN_DASHBOARD_PASSWORD

router = APIRouter(prefix="/admin", tags=["Admin Panel"])

# ------------------------------------
# MODELS
# ------------------------------------

class AdminAuth(BaseModel):
    admin_username_hash: str  # SHA256 hash
    admin_password_hash: str  # SHA256 hash

class CreateEmployeeRequest(BaseModel):
    email: EmailStr
    name: str
    username: str
    employ_id: str
    admin_username_hash: str  # SHA256 hash
    admin_password_hash: str  # SHA256 hash

class EditEmployeeRequest(BaseModel):
    employ_id: str
    new_employ_id: str
    admin_username_hash: str  # SHA256 hash
    admin_password_hash: str  # SHA256 hash

class RemoveEmployeeRequest(BaseModel):
    employ_id: str
    admin_username_hash: str  # SHA256 hash
    admin_password_hash: str  # SHA256 hash

# ------------------------------------
# HELPER FUNCTIONS
# ------------------------------------

def create_sha256_hash(text: str) -> str:
    """
    Create SHA256 hash of the given text
    """
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

def verify_admin_credentials(admin_username_hash: str, admin_password_hash: str) -> bool:
    """
    Verify admin dashboard credentials against environment variables using SHA256 hashes
    """
    # Create hashes of the environment variables
    env_username_hash = create_sha256_hash(ADMIN_DASHBOARD_USERNAME)
    env_password_hash = create_sha256_hash(ADMIN_DASHBOARD_PASSWORD)
    
    # Compare hashes
    return (
        admin_username_hash == env_username_hash and 
        admin_password_hash == env_password_hash
    )

# ------------------------------------
# ADMIN ROUTES
# ------------------------------------

@router.post("/create-employee")
async def create_employee(
    payload: CreateEmployeeRequest,
    db=Depends(get_database)
):
    """
    Create a new employee account (Admin panel only)
    """
    
    # -------------------------
    # VERIFY ADMIN CREDENTIALS
    # -------------------------
    if not verify_admin_credentials(payload.admin_username_hash, payload.admin_password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid admin credentials"
        )
    
    users = db["users"]
    
    # -------------------------
    # VALIDATE EMPLOYEE DATA
    # -------------------------
    
    # Check if email already exists
    existing_email = await users.find_one({"email": payload.email})
    if existing_email:
        raise HTTPException(
            status_code=409,
            detail="Email already exists"
        )
    
    # Check if username already exists
    existing_username = await users.find_one({"username": payload.username})
    if existing_username:
        raise HTTPException(
            status_code=409,
            detail="Username already taken"
        )
    
    # Check if employ_id already exists
    existing_employ_id = await users.find_one({"employ_id": payload.employ_id})
    if existing_employ_id:
        raise HTTPException(
            status_code=409,
            detail="Employee ID already taken"
        )
    
    # Validate field lengths
    if not (4 <= len(payload.name) <= 50):
        raise HTTPException(
            status_code=400,
            detail="Name must be between 4 and 50 characters"
        )
    
    if not (4 <= len(payload.username) <= 30):
        raise HTTPException(
            status_code=400,
            detail="Username must be between 4 and 30 characters"
        )
    
    if not (3 <= len(payload.employ_id) <= 20):
        raise HTTPException(
            status_code=400,
            detail="Employee ID must be between 3 and 20 characters"
        )
    
    # -------------------------
    # CREATE EMPLOYEE ACCOUNT
    # -------------------------
    
    # Generate avatar for the employee
    profile_picture = generate_avatar(payload.username)
    
    # Create user document
    employee_data = {
        "name": payload.name,
        "username": payload.username,
        "email": payload.email,
        "employ_id": payload.employ_id,
        "is_verified": True,  # Auto-verified for admin-created accounts
        "profile_picture": profile_picture,
        "created_at": datetime.utcnow(),
        "contact_list": [],
        "group_list": []
    }
    
    # Insert employee
    result = await users.insert_one(employee_data)
    employee_id = str(result.inserted_id)
    
    return {
        "success": True,
        "employee_id": employee_id,
        "email": payload.email,
        "name": payload.name,
        "username": payload.username,
        "employ_id": payload.employ_id,
        "profile_picture": profile_picture,
        "message": f"Employee {payload.name} created successfully"
    }


@router.get("/employees")
async def get_all_employees(
    request: Request,
    admin_username_hash: str,
    admin_password_hash: str,
    db=Depends(get_database)
):
    """
    Get all employees/admin users (Admin panel only)
    """
    
    # -------------------------
    # VERIFY ADMIN CREDENTIALS
    # -------------------------
    if not verify_admin_credentials(admin_username_hash, admin_password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid admin credentials"
        )
    
    users = db["users"]
    
    # -------------------------
    # FETCH ALL EMPLOYEES
    # -------------------------
    employees = await users.find(
        {"employ_id": {"$ne": None}},  # Only users with employ_id (admins)
        {
            "password": 0,  # Exclude sensitive fields
            "contact_list": 0,
            "group_list": 0
        }
    ).to_list(length=None)
    
    # Format response
    formatted_employees = []
    for employee in employees:
        formatted_employee = {
            "_id": str(employee["_id"]),
            "name": employee.get("name"),
            "username": employee.get("username"),
            "email": employee.get("email"),
            "employ_id": employee.get("employ_id"),
            "is_verified": employee.get("is_verified", False),
            "profile_picture": employee.get("profile_picture"),
            "created_at": employee.get("created_at").isoformat() + "Z" if employee.get("created_at") else None
        }
        formatted_employees.append(formatted_employee)
    
    return {
        "success": True,
        "employees": formatted_employees,
        "count": len(formatted_employees)
    }


@router.put("/edit-employee")
async def edit_employee_id(
    payload: EditEmployeeRequest,
    db=Depends(get_database)
):
    """
    Edit employee ID only (Admin panel only)
    """
    
    # -------------------------
    # VERIFY ADMIN CREDENTIALS
    # -------------------------
    if not verify_admin_credentials(payload.admin_username_hash, payload.admin_password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid admin credentials"
        )
    
    users = db["users"]
    
    # -------------------------
    # VALIDATE REQUEST
    # -------------------------
    
    # Check if current employ_id exists
    existing_employee = await users.find_one({"employ_id": payload.employ_id})
    if not existing_employee:
        raise HTTPException(
            status_code=404,
            detail="Employee with this ID not found"
        )
    
    # Check if new employ_id is already taken
    existing_new_id = await users.find_one({"employ_id": payload.new_employ_id})
    if existing_new_id:
        raise HTTPException(
            status_code=409,
            detail="New employee ID already taken"
        )
    
    # Validate new employ_id length
    if not (3 <= len(payload.new_employ_id) <= 20):
        raise HTTPException(
            status_code=400,
            detail="Employee ID must be between 3 and 20 characters"
        )
    
    # -------------------------
    # UPDATE EMPLOYEE ID
    # -------------------------
    
    result = await users.update_one(
        {"employ_id": payload.employ_id},
        {"$set": {"employ_id": payload.new_employ_id}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=500,
            detail="Failed to update employee ID"
        )
    
    return {
        "success": True,
        "old_employ_id": payload.employ_id,
        "new_employ_id": payload.new_employ_id,
        "message": f"Employee ID updated from {payload.employ_id} to {payload.new_employ_id}"
    }


@router.delete("/remove-employee")
async def remove_employee(
    payload: RemoveEmployeeRequest,
    db=Depends(get_database)
):
    """
    Remove an employee account (Admin panel only)
    """
    
    # -------------------------
    # VERIFY ADMIN CREDENTIALS
    # -------------------------
    if not verify_admin_credentials(payload.admin_username_hash, payload.admin_password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid admin credentials"
        )
    
    users = db["users"]
    
    # -------------------------
    # FIND AND REMOVE EMPLOYEE
    # -------------------------
    
    # Check if employee exists
    employee = await users.find_one({"employ_id": payload.employ_id})
    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee with this ID not found"
        )
    
    # Remove the employee
    result = await users.delete_one({"employ_id": payload.employ_id})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=500,
            detail="Failed to remove employee"
        )
    
    return {
        "success": True,
        "employ_id": payload.employ_id,
        "removed_employee": {
            "name": employee.get("name"),
            "username": employee.get("username"),
            "email": employee.get("email")
        },
        "message": f"Employee {employee.get('name')} removed successfully"
    }


@router.get("/statistics")
async def get_admin_statistics(
    admin_username_hash: str,
    admin_password_hash: str,
    db=Depends(get_database)
):
    """
    Get admin dashboard statistics (Admin panel only)
    Returns: Total Users, Total Messages, Total Groups, Active Users
    """
    
    # -------------------------
    # VERIFY ADMIN CREDENTIALS
    # -------------------------
    if not verify_admin_credentials(admin_username_hash, admin_password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid admin credentials"
        )
    
    # -------------------------
    # GET COLLECTIONS
    # -------------------------
    users = db["users"]
    messages = db["messages"]
    conversations = db["conversations"]
    
    # -------------------------
    # CALCULATE STATISTICS
    # -------------------------
    
    # Total Users (all users including admins and normal users)
    total_users = await users.count_documents({})
    
    # Total Messages (all messages in the system)
    total_messages = await messages.count_documents({})
    
    # Total Groups (conversations with type "group")
    total_groups = await conversations.count_documents({"type": "group"})
    
    # Active Users (users who have sent at least one message in the last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    # Get unique senders from messages in the last 30 days
    active_users_pipeline = [
        {
            "$match": {
                "created_at": {"$gte": thirty_days_ago}
            }
        },
        {
            "$group": {
                "_id": "$sender"
            }
        },
        {
            "$count": "active_users"
        }
    ]
    
    active_users_result = await messages.aggregate(active_users_pipeline).to_list(length=1)
    active_users = active_users_result[0]["active_users"] if active_users_result else 0
    
    # -------------------------
    # ADDITIONAL STATISTICS
    # -------------------------
    
    # Admin Users (users with employ_id)
    admin_users = await users.count_documents({"employ_id": {"$ne": None}})
    
    # Normal Users (users without employ_id)
    normal_users = total_users - admin_users
    
    # DM Conversations
    total_dms = await conversations.count_documents({"type": "dm"})
    
    # Messages sent today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    messages_today = await messages.count_documents({
        "created_at": {"$gte": today_start}
    })
    
    # Groups created this month
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    groups_this_month = await conversations.count_documents({
        "type": "group",
        "created_at": {"$gte": month_start}
    })
    
    return {
        "success": True,
        "statistics": {
            # Main statistics (matching frontend cards)
            "total_users": total_users,
            "total_messages": total_messages,
            "total_groups": total_groups,
            "active_users": active_users,
            
            # Additional detailed statistics
            "breakdown": {
                "admin_users": admin_users,
                "normal_users": normal_users,
                "total_dms": total_dms,
                "messages_today": messages_today,
                "groups_this_month": groups_this_month
            },
            
            # Metadata
            "last_updated": datetime.utcnow().isoformat() + "Z",
            "active_users_period": "30 days"
        }
    }


@router.post("/generate-hash")
async def generate_admin_hash(
    username: str,
    password: str
):
    """
    Generate SHA256 hashes for admin credentials (Development/Testing only)
    Remove this endpoint in production!
    """
    
    username_hash = create_sha256_hash(username)
    password_hash = create_sha256_hash(password)
    
    return {
        "success": True,
        "username": username,
        "password": password,
        "username_hash": username_hash,
        "password_hash": password_hash,
        "note": "Use these hashes in your frontend for admin authentication"
    }