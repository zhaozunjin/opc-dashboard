"""
认证路由 — 注册 / 登录
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import get_db
from app.models.schemas import UserRegister, UserLogin, TokenResponse, UserOut
from app.services.auth import create_user, authenticate_user, create_access_token, get_user_by_email

router = APIRouter(prefix="/auth", tags=["认证"])


@router.post("/register", response_model=TokenResponse)
async def register(body: UserRegister, db: AsyncSession = Depends(get_db)):
    existing = await get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(status_code=400, detail="邮箱已注册")
    user = await create_user(db, body.email, body.password)
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user_id=str(user.id))


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, body.email, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user_id=str(user.id))
