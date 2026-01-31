# models/auth.py

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class Contact(BaseModel):
    email: EmailStr
    muted: bool = False
    blocked: bool = False
    archived: bool = False
    is_deleted: bool = False
    is_favorited: bool = False
    is_pinned: bool = False
    added_at: datetime

class UserCreate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    email: EmailStr
    is_verified: bool = False
    profile_picture: Optional[str] = None
    created_at: datetime
    contact_list: Optional[List[Contact]] = []
    employ_id: Optional[str] = None  # Only for admin users, null for normal users


class UserInDB(UserCreate):
    id: Optional[str] = Field(alias="_id")

class RefreshTokenRequest(BaseModel):
    refresh_token: str