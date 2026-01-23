from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
import mimetypes
from fastapi.responses import JSONResponse
from utils.jwt import get_uid_from_request
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pathlib import Path
from utils.jwt import verify_token_bool

router = APIRouter(prefix="/media", tags=["Media"])
security = HTTPBearer()

UPLOAD_DIR = Path("uploads/profile_pictures")
CHAT_UPLOAD_DIR = Path("uploads/chats")


@router.get("/get")
async def get_chat_media(
    request: Request,
    message_id: str = Query(...)
):
    """
    Returns the media file for a specific message.
    
    - If it's an image: returns the actual image
    - If it's another file: returns filename + download URL
    """

    # --------------------------------------------
    # AUTHENTICATION
    # --------------------------------------------
    user_id = get_uid_from_request(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Folder: uploads/chats/<message_id>/
    folder_path = CHAT_UPLOAD_DIR / message_id

    if not folder_path.exists() or not folder_path.is_dir():
        raise HTTPException(404, detail="Message media folder not found")

    # Get file inside the folder (each message only stores 1 file)
    files = list(folder_path.iterdir())
    if len(files) == 0:
        raise HTTPException(404, detail="No media found for this message")

    file_path = files[0]
    filename = file_path.name

    # Detect MIME type
    mime_type, _ = mimetypes.guess_type(filename)

    # --------------------------------------------
    # CASE 1: It's an image → return raw file
    # --------------------------------------------
    if mime_type and mime_type.startswith("image"):
        return FileResponse(
            path=file_path,
            media_type=mime_type,
            filename=filename
        )

    # --------------------------------------------
    # CASE 2: Other file → return metadata + download URL
    # --------------------------------------------
    download_url = f"/media/download/{message_id}/{filename}"

    return JSONResponse({
        "filename": filename,
        "download_url": download_url
    })

@router.get("/download/{message_id}/{filename}")
async def download_chat_file(
    # request: Request,
    message_id: str,
    filename: str
):
    # Verify token same way
    # user_id = get_uid_from_request(request)
    # if not user_id:
    #     raise HTTPException(401, "Unauthorized")

    file_path = CHAT_UPLOAD_DIR / message_id / filename

    if not file_path.exists():
        raise HTTPException(404, "File not found")

    # Auto-detect mime
    mime_type, _ = mimetypes.guess_type(str(file_path))

    return FileResponse(
        path=file_path,
        media_type=mime_type or "application/octet-stream",
        filename=filename
    )

@router.get("/profile/{filename}")
async def get_profile_picture(
    filename: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials

    # ✅ Verify access token
    if not verify_token_bool(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    file_path = UPLOAD_DIR / filename

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found",
        )

    return FileResponse(
        file_path,
        media_type="image/jpeg"
    )

