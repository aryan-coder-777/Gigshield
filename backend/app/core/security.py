from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.core.database import get_db


pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_worker(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    from app.models.worker import Worker
    payload = decode_token(token)
    worker_id: str = payload.get("sub")
    if worker_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    result = await db.execute(select(Worker).where(Worker.id == int(worker_id)))
    worker = result.scalar_one_or_none()
    if worker is None:
        raise HTTPException(status_code=401, detail="Worker not found")
    return worker


async def get_current_admin(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    from app.models.worker import Worker
    payload = decode_token(token)
    worker_id: str = payload.get("sub")
    role: str = payload.get("role", "worker")
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.execute(select(Worker).where(Worker.id == int(worker_id)))
    worker = result.scalar_one_or_none()
    if worker is None:
        raise HTTPException(status_code=401, detail="Admin not found")
    return worker
