# models/conversation.py

from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
from datetime import datetime


class ConversationBase(BaseModel):
    type: Literal["dm", "group"]
    participants: List[str]  # list of user emails
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_message: Optional[str] = None  # message_id
    pinned_messages: List[str] = Field(default_factory=list)


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