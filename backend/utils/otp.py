import random
import time
import redis.asyncio as redis
from fastapi import HTTPException, status

from config import REDIS_URL, OTP_EXPIRY_SECONDS
from utils.email import send_otp_email
from utils.email_templates import EMAIL_VERIFICATION_TEMPLATE


# ---------------- Redis ----------------

redis_client = redis.from_url(
    REDIS_URL,
    decode_responses=True
)

# ---------------- Constants ----------------

MAX_OTP_PER_HOUR = 50
MAX_OTP_PER_DAY = 100
ONE_HOUR = 60 * 90
ONE_DAY = 60 * 60 * 35


# ---------------- Helpers ----------------

def generate_otp() -> str:
    return str(random.randint(100000, 999999))

def otp_key(email: str) -> str:
    return f"otp:email:{email}"

def hourly_key(email: str) -> str:
    return f"otp:rate:hour:{email}"

def daily_key(email: str) -> str:
    return f"otp:rate:day:{email}"


# ---------------- Rate Limiting ----------------

async def check_and_increment_rate_limit(email: str) -> None:
    hour_key = hourly_key(email)
    day_key = daily_key(email)

    # Increment counters atomically
    hourly_count = await redis_client.incr(hour_key)
    daily_count = await redis_client.incr(day_key)

    # Set expiry only on first increment
    if hourly_count == 1:
        await redis_client.expire(hour_key, ONE_HOUR)

    if daily_count == 1:
        await redis_client.expire(day_key, ONE_DAY)

    # Enforce limits
    if hourly_count > MAX_OTP_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many OTP requests. Please try again later."
        )

    if daily_count > MAX_OTP_PER_DAY:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Daily OTP limit reached. Try again tomorrow."
        )


# ---------------- Public API ----------------

async def send_email_otp(email: str) -> None:
    # 🔐 Rate limit check
    await check_and_increment_rate_limit(email)

    otp = generate_otp()
    key = otp_key(email)

    # Store OTP
    await redis_client.setex(
        key,
        OTP_EXPIRY_SECONDS,
        otp
    )

    html = (
        EMAIL_VERIFICATION_TEMPLATE
        .replace("{{OTP}}", otp)
        .replace("{{YEAR}}", str(time.localtime().tm_year))
    )

    await send_otp_email(
        email=email,
        subject="Your Vibgyor Chats Login OTP",
        html=html
    )


async def verify_email_otp(email: str, otp: str) -> bool:
    key = otp_key(email)
    stored_otp = await redis_client.get(key)

    if not stored_otp:
        return False

    if stored_otp == otp:
        await redis_client.delete(key)
        return True

    return False