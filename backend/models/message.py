# models/message.py

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class MessageBase(BaseModel):
    conversation_id: str
    sender: str  # sender email
    content: Optional[str] = None
    type: Literal["text", "image", "video", "audio", "file"]
    file_category: Optional[Literal["image", "video", "audio", "pdf", "document", "archive", "code", "other"]] = None
    media_url: Optional[str] = None
    reply_to: Optional[str] = None  # message_id
    is_read: bool = False
    is_deleted: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    edited_at: Optional[datetime] = None
    pinned: bool = False
    pinned_by: Optional[str] = None  # email of user who pinned the message
    pinned_at: Optional[datetime] = None  # when the message was pinned


class MessageCreate(MessageBase):
    """
    Used when sending a new message
    """
    pass


class MessageInDB(MessageBase):
    id: Optional[str] = Field(alias="_id")

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
