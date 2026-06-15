"""
RAG Forge – Authentication Router
"""
from __future__ import annotations
import logging
import urllib.parse
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_otp,
    hash_password,
    verify_password,
)
from app.core.config import settings
from app.models.models import User
from app.schemas.schemas import (
    OTPRequest, TokenResponse,
    UserOut, UserRegister, ChangePasswordSchema, ProfileUpdate, ResetPasswordSchema
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
logger = logging.getLogger(__name__)


def send_otp_email(email: str, otp: str):
    """Sends a secure magic link for password reset."""
    try:
        safe_email = urllib.parse.quote(email)
        # The 'otp' here is your secure token
        reset_link = f"{settings.frontend_url}/reset-password?email={safe_email}&token={otp}"
        
        body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
            <h2 style="color: #111827;">RAG Forge Security</h2>
            <p>We received a request to reset your password. Click below to create a new one:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_link}" style="background-color: #4F46E5; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Reset My Password
                </a>
            </div>
            <p>This link expires in {settings.otp_expire_minutes} minutes.</p>
        </div>
        """
        
        payload = {"to": email, "subject": "RAG Forge Password Reset", "html": body}
        with httpx.Client(follow_redirects=True) as client:
            response = client.post(settings.apps_script_url, json=payload, timeout=15.0)
            response.raise_for_status()
        
        logger.info(f"Successfully sent reset link to {email}")
    except Exception as e:
        logger.error(f"Failed to send email to {email}: {e}")


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = await db.get(User, payload.get("sub"))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


@router.post("/register", response_model=UserOut, status_code=201)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=payload.email, full_name=payload.full_name, hashed_password=hash_password(payload.password), is_active=True)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == form.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return TokenResponse(access_token=create_access_token({"sub": user.id, "type": "access"}), refresh_token=create_refresh_token({"sub": user.id, "type": "refresh"}))


@router.post("/forgot-password")
async def forgot_password(payload: OTPRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if user:
        token = generate_otp() # This acts as your secure reset token
        user.otp_code = token
        user.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.otp_expire_minutes)
        await db.commit()
        background_tasks.add_task(send_otp_email, user.email, token)
    return {"message": "If the email exists, a reset link was sent"}


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordSchema, db: AsyncSession = Depends(get_db)):
    """Consolidated reset: Validate token and update password in one go."""
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    
    if not user or not user.otp_code or user.otp_code != payload.token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    
    if user.otp_expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Link expired")
    
    user.hashed_password = hash_password(payload.new_password)
    user.otp_code = None # Consume the token
    await db.commit()
    return {"message": "Password reset successfully"}


@router.post("/change-password")
async def change_password(data: ChangePasswordSchema, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(data.new_password)
    await db.commit()
    return {"message": "Password updated successfully"}


@router.patch("/profile", response_model=UserOut)
async def update_profile(payload: ProfileUpdate, current: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    current.full_name = payload.full_name
    await db.commit()
    await db.refresh(current)
    return current


@router.get("/me", response_model=UserOut)
async def me(current: User = Depends(get_current_user)):
    return current