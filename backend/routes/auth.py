# routes/auth.py

from fastapi import APIRouter, Depends, Request, HTTPException, status, Query
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.responses import RedirectResponse
from urllib.parse import urlencode
from fastapi import UploadFile, File, Form, Depends, HTTPException, Request
from authlib.integrations.starlette_client import OAuth
from datetime import datetime, timedelta
from jose import jwt
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import uuid, os
from utils.otp import send_email_otp, verify_email_otp, redis_client

from config import (
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    REFRESH_TOKEN_EXPIRE_MINUTES,
    FRONT_END_URL
)
from database import get_database
from models.auth import UserCreate, RefreshTokenRequest
from utils.jwt import create_access_token, verify_token_bool, decode_token_allow_expired, verify_refresh_token
from config import JWT_SECRET, JWT_ALGORITHM

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()
UPLOAD_DIR = "uploads/profile_pictures"
os.makedirs(UPLOAD_DIR, exist_ok=True)

oauth = OAuth()

oauth.register(
    name="google",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

# ------------------------------------
# HELPER FUNCTIONS
# ------------------------------------

def is_admin_user(user_doc) -> bool:
    """
    Check if a user is an admin (has employ_id)
    """
    return user_doc.get("employ_id") is not None

async def get_user_and_check_admin(user_email: str, db) -> tuple:
    """
    Get user document and check if they're admin
    Returns (user_doc, is_admin)
    """
    users = db["users"]
    user = await users.find_one({"email": user_email})
    if not user:
        return None, False
    return user, is_admin_user(user)

# utils/profile.py

def is_profile_complete(user) -> bool:
    """
    Return True only if the user's profile contains a valid username.
    Safe for Mongo dicts AND Pydantic models.
    """

    # Normalize: ALWAYS convert to dict first
    if not isinstance(user, dict):
        try:
            user = user.dict()
        except Exception:
            return False

    username = user.get("username")

    if not username:
        return False

    if isinstance(username, str) and not username.strip():
        return False

    return True


def generate_avatar(username: str) -> str:
    return (
        "https://api.dicebear.com/7.x/initials/svg"
        f"?seed={username}"
        "&backgroundColor=1e1e1e,2d2d2d,444444"
        "&textColor=ffffff"
    )

@router.get("/test/oauth-flow")
async def test_oauth_flow():
    """
    Test endpoint to verify OAuth configuration
    """
    return {
        "google_client_id": GOOGLE_CLIENT_ID[:10] + "..." if GOOGLE_CLIENT_ID else "Not set",
        "google_redirect_uri": GOOGLE_REDIRECT_URI,
        "frontend_url": FRONT_END_URL,
        "oauth_configured": bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
    }

@router.get("/debug/session")
async def debug_session(request: Request):
    """
    Debug endpoint to check session state (remove in production)
    """
    return {
        "session_keys": list(request.session.keys()),
        "oauth_state": request.session.get("oauth_state"),
        "session_id": request.session.get("_session_id", "No session ID")
    }

# --------------------------------------------------
# STEP 1: Redirect user to Google
# --------------------------------------------------
@router.get("/google/login")
async def google_login(request: Request):
    try:
        # Generate a random state parameter for CSRF protection
        state = str(uuid.uuid4())
        
        # Get the redirect response first to see what Authlib stores in session
        redirect_response = await oauth.google.authorize_redirect(
            request,
            GOOGLE_REDIRECT_URI,
            state=state
        )
        
        # Now capture what Authlib stored in the session
        session_data = dict(request.session)
        print(f"🔐 Generated OAuth state: {state}")
        print(f"🔐 Session after authorize_redirect: {session_data}")
        
        # Store both our state and the full session data in Redis
        await redis_client.setex(f"oauth_state:{state}", 1800, "valid")
        await redis_client.setex(f"oauth_session:{state}", 1800, str(session_data))
        
        return redirect_response
        
    except Exception as e:
        print(f"❌ Error in google_login: {e}")
        raise HTTPException(status_code=500, detail="Failed to initiate Google OAuth")

# --------------------------------------------------
# STEP 2: Google Callback
# --------------------------------------------------
@router.get("/google/callback")
async def google_callback(request: Request, state: str = Query(None), db=Depends(get_database)):
    try:
        # Debug: Print received state and session state
        stored_state = request.session.get("oauth_state")
        redis_state = await redis_client.get(f"oauth_state:{state}")
        
        print(f"🔍 Received state: {state}")
        print(f"🔍 Stored state (session): {stored_state}")
        print(f"🔍 Stored state (redis): {redis_state}")
        print(f"🔍 Session keys: {list(request.session.keys())}")
        
        # Verify state parameter using either session or Redis
        state_valid = False
        
        if stored_state and stored_state == state:
            print("✅ State verified via session")
            state_valid = True
        elif redis_state:
            # Handle both string and bytes from Redis
            redis_value = redis_state.decode() if isinstance(redis_state, bytes) else redis_state
            if redis_value == "valid":
                print("✅ State verified via Redis")
                state_valid = True
                
                # Restore the full session data that Authlib needs
                try:
                    session_data_raw = await redis_client.get(f"oauth_session:{state}")
                    if session_data_raw:
                        session_data_str = session_data_raw.decode() if isinstance(session_data_raw, bytes) else session_data_raw
                        # Parse the session data (it's stored as string representation of dict)
                        import ast
                        session_data = ast.literal_eval(session_data_str)
                        
                        # Restore all session data that Authlib stored
                        for key, value in session_data.items():
                            request.session[key] = value
                        
                        print(f"🔧 Restored full session data: {session_data}")
                    else:
                        # Fallback: just restore the state
                        request.session["oauth_state"] = state
                        print(f"🔧 Fallback: restored only state: {state}")
                        
                except Exception as e:
                    print(f"⚠️ Error restoring session data: {e}")
                    # Fallback: just restore the state
                    request.session["oauth_state"] = state
        
        if not state_valid:
            print("❌ State verification failed")
            # Clean up any stored states
            request.session.pop("oauth_state", None)
            if state:
                await redis_client.delete(f"oauth_state:{state}")
            
            raise HTTPException(
                status_code=400, 
                detail="Invalid or expired state parameter. Please try logging in again."
            )
        
        print("✅ State verification successful")
        print(f"🔧 Session state restored: {request.session.get('oauth_state')}")
        
        # Complete the OAuth flow (Authlib will verify state again internally)
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get("userinfo")
        
        # Clear the state from both session and Redis after successful completion
        request.session.clear()  # Clear entire session after successful OAuth
        if state:
            await redis_client.delete(f"oauth_state:{state}")
            await redis_client.delete(f"oauth_session:{state}")
        
    except HTTPException:
        # Re-raise HTTP exceptions (like state mismatch)
        raise
    except Exception as e:
        print(f"❌ Google OAuth Error: {e}")
        # Clear any stored state on error
        request.session.clear()
        if state:
            await redis_client.delete(f"oauth_state:{state}")
            await redis_client.delete(f"oauth_session:{state}")
        raise HTTPException(status_code=400, detail=f"Google authentication failed: {str(e)}")

    if not user_info or not user_info.get("email"):
        raise HTTPException(status_code=400, detail="Email not received from Google")

    email = user_info["email"]
    users_collection = db["users"]

    existing_user = await users_collection.find_one({"email": email})

    payload = {"uid": email}
    access_token = create_access_token(payload)
    refresh_token = create_access_token({
        **payload,
        "exp": datetime.utcnow() + timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)
    })

    if not existing_user:
        user_data = UserCreate(
            email=email,
            is_verified=True,
            created_at=datetime.utcnow()
        )
        await users_collection.insert_one(user_data.dict())
        complete = is_profile_complete(user_data)
        is_admin = is_admin_user(user_data.dict())
    else:
        complete = is_profile_complete(existing_user)
        is_admin = is_admin_user(existing_user)

    # 🔁 REDIRECT TO FRONTEND
    params = urlencode({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "complete": str(complete).lower(),
        "is_admin": str(is_admin).lower()
    })

    return RedirectResponse(
        url=f"{FRONT_END_URL}/auth/google/callback?{params}"
    )

@router.post("/email/login")
async def email_login(payload: dict, db=Depends(get_database)):
    email = payload.get("email")
    otp = payload.get("otp")

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    users = db["users"]

    # ----------------------------------
    # STEP 1: REQUEST OTP
    # ----------------------------------
    if not otp:
        await send_email_otp(email)
        return {
            "success": True,
            "otp_sent": True
        }

    # ----------------------------------
    # STEP 2: VERIFY OTP
    # ----------------------------------
    if not await verify_email_otp(email, otp):
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")

    existing_user = await users.find_one({"email": email})

    payload = {"uid": email}

    access_token = create_access_token(payload)
    refresh_token = create_access_token({
        **payload,
        "exp": datetime.utcnow() + timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)
    })

    # ----------------------------------
    # NEW USER
    # ----------------------------------
    if not existing_user:
        user = UserCreate(
            email=email,
            is_verified=False,
            created_at=datetime.utcnow()
        )
        complete = is_profile_complete(user)
        is_admin = is_admin_user(user.dict())
        await users.insert_one(user.dict())

        return {
            "success": True,
            "complete": complete,
            "is_admin": is_admin,
            "access_token": access_token,
            "refresh_token": refresh_token
        }

    # ----------------------------------
    # EXISTING USER
    # ----------------------------------
    complete = is_profile_complete(existing_user)
    is_admin = is_admin_user(existing_user)
    return {
        "success": True,
        "complete": complete,
        "is_admin": is_admin,
        "access_token": access_token,
        "refresh_token": refresh_token
    }

@router.post("/login/completion")
async def complete_profile(
    request: Request,
    name: str | None = Form(None),
    username: str | None = Form(None),
    profile_picture: UploadFile | None = File(None),
    db=Depends(get_database)
):
    # -------------------------
    # AUTH CHECK
    # -------------------------
    auth_header = request.headers.get("authorization")
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing access token")

    token = auth_header.split(" ")[1]

    if not verify_token_bool(token):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    uid = payload.get("uid")

    users = db["users"]

    user = await users.find_one({"email": uid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = {}
    profile_pic_url = user.get("profile_picture")

    # -------------------------
    # NAME VALIDATION
    # -------------------------
    if name is not None:
        if not (4 <= len(name) <= 20):
            raise HTTPException(
                status_code=400,
                detail="Name must be between 4 and 20 characters"
            )
        update_data["name"] = name

    # -------------------------
    # USERNAME VALIDATION
    # -------------------------
    if username is not None:
        if not (4 <= len(username) <= 30):
            raise HTTPException(
                status_code=400,
                detail="Username must be between 4 and 10 characters"
            )

        existing_username = await users.find_one(
            {"username": username, "email": {"$ne": uid}}
        )
        if existing_username:
            raise HTTPException(
                status_code=409,
                detail="Username already taken"
            )

        update_data["username"] = username

    # -------------------------
    # PROFILE PICTURE HANDLING
    # -------------------------
    if profile_picture:
        ext = profile_picture.filename.split(".")[-1]
        filename = f"{uuid.uuid4()}.{ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        with open(file_path, "wb") as f:
            f.write(await profile_picture.read())

        profile_pic_url = f"/{UPLOAD_DIR}/{filename}"
        update_data["profile_picture"] = profile_pic_url

    elif not user.get("profile_picture"):
        # Generate ONLY if user has no existing picture
        generated_username = username or user.get("username") or uid
        profile_pic_url = generate_avatar(generated_username)
        update_data["profile_picture"] = profile_pic_url

    # -------------------------
    # UPDATE USER
    # -------------------------
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await users.update_one(
            {"email": uid},
            {"$set": update_data}
        )

    updated_user = await users.find_one({"email": uid})
    complete = is_profile_complete(updated_user)

    return {
        "success": True,
        "complete": complete,
        "profile_picture": updated_user.get("profile_picture"),
    }

@router.get("/login/checkusername")
async def check_username(
    q: str = Query(..., min_length=3, max_length=30),
    request: Request = None,
    admin_username_hash: str = Query(None),
    admin_password_hash: str = Query(None),
    db=Depends(get_database)
):
    """
    Check if a username is available
    Supports two authentication methods:
    1. JWT Token (Bearer token in Authorization header)
    2. Admin credentials (admin_username_hash and admin_password_hash query parameters)
    """
    
    # -------------------------
    # AUTHENTICATION CHECK
    # -------------------------
    authenticated = False
    
    # Method 1: Check for admin credentials
    if admin_username_hash and admin_password_hash:
        # Import admin verification function
        from routes.admin import verify_admin_credentials
        
        if verify_admin_credentials(admin_username_hash, admin_password_hash):
            authenticated = True
    
    # Method 2: Check for JWT token
    if not authenticated and request:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ")[1]
            if verify_token_bool(token):
                authenticated = True
    
    # If neither authentication method succeeded, return 401
    if not authenticated:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Provide either valid JWT token or admin credentials."
        )
    
    # -------------------------
    # CHECK USERNAME AVAILABILITY
    # -------------------------
    users_collection = db["users"]

    existing_user = await users_collection.find_one(
        {"username": q},
        {"_id": 1}
    )

    # username exists → NOT available
    if existing_user:
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "available": False
            }
        )

    # username does not exist → available
    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "available": True
        }
    )

@router.post("/refreshtoken")
async def refresh_access_token(
    data: RefreshTokenRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    access_token = credentials.credentials
    if verify_token_bool(access_token):
        return {
            "success": True,
            "message": "Access token is still valid",
        }

    uid = decode_token_allow_expired(access_token)
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",
        )

    refresh_uid = verify_refresh_token(data.refresh_token)
    if refresh_uid != uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    new_access_token = create_access_token(uid)

    return {
        "success": True,
        "access_token": new_access_token,
    }

@router.post("/logout")
async def logout(request: Request):
    # -------------------------
    # AUTH CHECK
    # -------------------------
    auth_header = request.headers.get("authorization")

    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing access token")

    token = auth_header.split(" ")[1]

    if not verify_token_bool(token):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # -------------------------
    # LOGOUT SUCCESS
    # -------------------------
    return {
        "success": True,
        "message": "Logged out successfully. Please remove tokens from local storage."
}