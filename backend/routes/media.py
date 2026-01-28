from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, Header
import mimetypes
from fastapi.responses import JSONResponse, StreamingResponse
from utils.jwt import get_uid_from_request
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pathlib import Path
from utils.jwt import verify_token_bool
import os
from typing import Optional

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

@router.get("/stream/{message_id}/{filename}")
async def stream_media_file(
    message_id: str,
    filename: str,
    request: Request,
    range: Optional[str] = Header(None)
):
    """
    Stream video/audio files with range request support for seeking.
    This enables video/audio players to seek and load progressively.
    """
    
    # Authentication
    user_id = get_uid_from_request(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    file_path = CHAT_UPLOAD_DIR / message_id / filename
    
    if not file_path.exists():
        raise HTTPException(404, "File not found")
    
    # Get file size and mime type
    file_size = file_path.stat().st_size
    mime_type, _ = mimetypes.guess_type(str(file_path))
    mime_type = mime_type or "application/octet-stream"
    
    # Handle range requests for video/audio seeking
    if range:
        # Parse range header (e.g., "bytes=0-1023")
        range_str = range.replace("bytes=", "")
        start, end = range_str.split("-")
        start = int(start) if start else 0
        end = int(end) if end else file_size - 1
        end = min(end, file_size - 1)
        
        # Calculate content length
        content_length = end - start + 1
        
        # Open file and seek to start position
        def iterfile():
            with open(file_path, "rb") as f:
                f.seek(start)
                remaining = content_length
                chunk_size = 8192
                while remaining > 0:
                    chunk = f.read(min(chunk_size, remaining))
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk
        
        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(content_length),
            "Content-Type": mime_type,
        }
        
        return StreamingResponse(
            iterfile(),
            status_code=206,  # Partial Content
            headers=headers,
            media_type=mime_type
        )
    
    # No range request - return full file
    def iterfile():
        with open(file_path, "rb") as f:
            chunk_size = 8192
            while chunk := f.read(chunk_size):
                yield chunk
    
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(file_size),
        "Content-Type": mime_type,
    }
    
    return StreamingResponse(
        iterfile(),
        headers=headers,
        media_type=mime_type
    )


@router.get("/view/{message_id}/{filename}")
async def view_file(
    message_id: str,
    filename: str,
    request: Request
):
    """
    View files inline (for PDFs, images, etc.)
    Sets Content-Disposition to inline so browser displays it
    """
    
    # Authentication
    user_id = get_uid_from_request(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    file_path = CHAT_UPLOAD_DIR / message_id / filename
    
    if not file_path.exists():
        raise HTTPException(404, "File not found")
    
    mime_type, _ = mimetypes.guess_type(str(file_path))
    mime_type = mime_type or "application/octet-stream"
    
    return FileResponse(
        path=file_path,
        media_type=mime_type,
        filename=filename,
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )


@router.get("/download/{message_id}/{filename}")
async def download_chat_file(
    message_id: str,
    filename: str,
    request: Request
):
    """
    Download files (forces download instead of inline view)
    """
    
    # Authentication
    user_id = get_uid_from_request(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    file_path = CHAT_UPLOAD_DIR / message_id / filename
    
    if not file_path.exists():
        raise HTTPException(404, "File not found")
    
    mime_type, _ = mimetypes.guess_type(str(file_path))
    mime_type = mime_type or "application/octet-stream"
    
    return FileResponse(
        path=file_path,
        media_type=mime_type,
        filename=filename,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
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

