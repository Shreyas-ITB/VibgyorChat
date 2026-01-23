# models/conversation.py

from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
from datetime import datetime


class Role(BaseModel):
    name: str
    color: str  # hex format like #FF5733


class ConversationBase(BaseModel):
    type: Literal["dm", "group"]
    participants: List[str]  # list of user emails
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_message: Optional[str] = None  # message_id
    pinned_messages: List[str] = Field(default_factory=list)
    
    # Group-specific fields
    owner: Optional[str] = None  # email of group owner
    admins: List[str] = Field(default_factory=list)  # list of admin emails
    roles: List[Role] = Field(default_factory=list)  # list of roles
    role_assignments: dict = Field(default_factory=dict)  # {email: [role_names]} - supports multiple roles per user
    group_name: Optional[str] = None
    group_description: Optional[str] = None
    group_picture: Optional[str] = None  # URL or path to group picture


class ConversationCreate(ConversationBase):
    """
    Used when creating a new conversation
    """
    pass


class ConversationInDB(ConversationBase):
    id: Optional[str] = Field(alias="_id")

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True


class CreateDMRequest(BaseModel):
    email: EmailStr


class CreateGroupRequest(BaseModel):
    group_name: str
    group_description: Optional[str] = None
    participants: List[EmailStr]  # initial participants (excluding creator)


class EditGroupRequest(BaseModel):
    group_name: Optional[str] = None
    group_description: Optional[str] = None
    add_participants: Optional[List[EmailStr]] = None
    remove_participants: Optional[List[EmailStr]] = None
    add_admins: Optional[List[EmailStr]] = None
    remove_admins: Optional[List[EmailStr]] = None
    add_role: Optional[Role] = None
    remove_role: Optional[str] = None  # role name
    assign_roles: Optional[dict] = None  # {email: [role_names]} - supports multiple roles per user
    unassign_roles: Optional[dict] = None  # {email: [role_names]} or {email: "all"} to remove all roles


class LeaveGroupRequest(BaseModel):
    conversation_id: str