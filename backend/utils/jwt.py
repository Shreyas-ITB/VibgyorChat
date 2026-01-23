from datetime import datetime, timedelta
from jose import JWTError, jwt
from jose.jwt import decode as jwt_decode
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import JWT_SECRET, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from typing import Optional

security = HTTPBearer()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def decode_token_allow_expired(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={"verify_exp": False}
        )
        return payload.get("uid")
    except JWTError:
        return None
    
def verify_refresh_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            return None
        return payload.get("uid")
    except JWTError:
        return None

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        uid: str = payload.get("uid")
        if uid is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )
        return uid
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

async def get_optional_uid(request: Request) -> Optional[str]:
    auth_header = request.headers.get("authorization")
    if not auth_header:
        return None

    if not auth_header.lower().startswith("bearer "):
        return None

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        uid = payload.get("uid")
        return uid
    except JWTError:
        return None

def verify_token_bool(token: str) -> bool:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        uid: str = payload.get("uid")
        return uid is not None
    except JWTError:
        return False
    
def get_uid_from_request(request: Request) -> str:
    auth_header = request.headers.get("authorization")

    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing access token")

    token = auth_header.split(" ")[1]

    if not verify_token_bool(token):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    payload = jwt_decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    return payload.get("uid")
