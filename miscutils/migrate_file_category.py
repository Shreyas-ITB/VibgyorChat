"""
Migration Script: Add file_category field to existing messages

This script updates all existing messages to include the file_category field
based on their file extension.

Run this script once after deploying the file_category feature.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "VibgyorChats")


def get_file_category_from_filename(filename: str) -> str:
    """
    Determine file category based on file extension.
    Returns: "image", "video", "audio", "pdf", "document", "archive", "code", "other"
    """
    file_extension = Path(filename).suffix.lower()
    
    # Image files
    if file_extension in [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg", ".ico"]:
        return "image"
    
    # Video files
    if file_extension in [".mp4", ".webm", ".mov", ".avi", ".mkv", ".flv", ".wmv", ".m4v"]:
        return "video"
    
    # Audio files
    if file_extension in [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac", ".wma", ".opus"]:
        return "audio"
    
    # PDF files
    if file_extension == ".pdf":
        return "pdf"
    
    # Document files
    if file_extension in [".doc", ".docx", ".txt", ".rtf", ".odt", ".pages", ".xls", ".xlsx", ".csv", ".ods", ".numbers", ".ppt", ".pptx", ".odp", ".key"]:
        return "document"
    
    # Archive files
    if file_extension in [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz"]:
        return "archive"
    
    # Code files
    if file_extension in [".js", ".py", ".java", ".cpp", ".c", ".h", ".cs", ".php", ".rb", ".go", ".rs", ".swift", ".kt", ".ts", ".jsx", ".tsx", ".html", ".css", ".scss", ".json", ".xml", ".yaml", ".yml", ".sql"]:
        return "code"
    
    # Default
    return "other"


async def migrate_file_categories():
    """
    Add file_category field to all existing messages with media_url
    """
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    messages = db["messages"]
    
    print("🔍 Searching for messages without file_category field...")
    
    # Find all messages with media_url but no file_category
    messages_to_update = await messages.find({
        "media_url": {"$ne": None},
        "file_category": {"$exists": False}
    }).to_list(length=None)
    
    if not messages_to_update:
        print("✅ No messages need migration. All messages already have file_category field.")
        client.close()
        return
    
    print(f"📝 Found {len(messages_to_update)} messages to migrate")
    
    updated_count = 0
    
    for msg in messages_to_update:
        # Extract filename from media_url
        # Format: /uploads/chats/{message_id}/{filename}
        media_url = msg.get("media_url", "")
        if not media_url:
            continue
        
        filename = media_url.split("/")[-1]
        file_category = get_file_category_from_filename(filename)
        
        result = await messages.update_one(
            {"_id": msg["_id"]},
            {"$set": {"file_category": file_category}}
        )
        
        if result.modified_count > 0:
            updated_count += 1
            print(f"  ✓ Updated message {msg['_id']} → file_category: {file_category} (filename: {filename})")
    
    print(f"\n✅ Migration complete! Updated {updated_count} messages.")
    
    # Show statistics
    print("\n📊 File Category Statistics:")
    categories = await messages.aggregate([
        {"$match": {"file_category": {"$ne": None}}},
        {"$group": {"_id": "$file_category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]).to_list(length=None)
    
    for cat in categories:
        print(f"  - {cat['_id']}: {cat['count']} messages")
    
    client.close()


if __name__ == "__main__":
    print("=" * 60)
    print("File Category Migration Script")
    print("=" * 60)
    print()
    
    asyncio.run(migrate_file_categories())
    
    print()
    print("=" * 60)
    print("Migration finished!")
    print("=" * 60)
