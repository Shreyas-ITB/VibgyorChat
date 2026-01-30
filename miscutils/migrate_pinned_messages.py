"""
Migration Script: Add pinned_by and pinned_at fields to existing pinned messages

This script updates all existing pinned messages in the database to include:
- pinned_by: Set to the message sender (as a fallback, since we don't know who actually pinned it)
- pinned_at: Set to the message created_at time (as a fallback)

Run this script once after deploying the new pinned message feature.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "VibgyorChats")


async def migrate_pinned_messages():
    """
    Migrate existing pinned messages to include pinned_by and pinned_at fields
    """
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    messages = db["messages"]
    
    print("🔍 Searching for pinned messages without pinned_by field...")
    
    # Find all pinned messages that don't have pinned_by field
    pinned_messages = await messages.find({
        "pinned": True,
        "pinned_by": {"$exists": False}
    }).to_list(length=None)
    
    if not pinned_messages:
        print("✅ No messages need migration. All pinned messages already have pinned_by field.")
        client.close()
        return
    
    print(f"📝 Found {len(pinned_messages)} pinned messages to migrate")
    
    updated_count = 0
    
    for msg in pinned_messages:
        # Use the message sender as fallback for pinned_by
        # Use created_at as fallback for pinned_at
        pinned_by = msg.get("sender", "unknown")
        pinned_at = msg.get("created_at", datetime.utcnow())
        
        result = await messages.update_one(
            {"_id": msg["_id"]},
            {
                "$set": {
                    "pinned_by": pinned_by,
                    "pinned_at": pinned_at
                }
            }
        )
        
        if result.modified_count > 0:
            updated_count += 1
            print(f"  ✓ Updated message {msg['_id']} (pinned_by: {pinned_by})")
    
    print(f"\n✅ Migration complete! Updated {updated_count} messages.")
    print(f"⚠️  Note: pinned_by was set to the message sender as a fallback.")
    print(f"   Future pins will correctly track who actually pinned the message.")
    
    client.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Pinned Messages Migration Script")
    print("=" * 60)
    print()
    
    asyncio.run(migrate_pinned_messages())
    
    print()
    print("=" * 60)
    print("Migration finished!")
    print("=" * 60)
