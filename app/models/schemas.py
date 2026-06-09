"""
Pydantic schemas — 请求 / 响应模型
"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ── Auth ──────────────────────────────────────────
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str


class UserOut(BaseModel):
    id: str
    email: str
    created_at: datetime


# ── Canvas ────────────────────────────────────────
class CanvasCreate(BaseModel):
    name: str = "我的画布"


class CanvasOut(BaseModel):
    id: str
    name: str
    created_at: datetime
    modules: list["ModuleOut"] = []


# ── Module ────────────────────────────────────────
class ModuleItem(BaseModel):
    id: str = ""
    text: str = ""
    tags: list[str] = []


class ModuleContent(BaseModel):
    summary: str = ""
    items: list[ModuleItem] = []
    notes: str = ""
    status: str = "not_started"
    last_reviewed_at: Optional[str] = None


class ModuleUpdate(BaseModel):
    content: ModuleContent


class ModuleOut(BaseModel):
    id: str
    module_key: str
    content: dict
    updated_at: datetime


# ── Version ───────────────────────────────────────
class VersionOut(BaseModel):
    id: str
    version_num: int
    content: dict
    created_at: datetime


class VersionDiff(BaseModel):
    module_key: str
    changes: dict  # { field: { old: ..., new: ... } }


# ── Review ────────────────────────────────────────
class ReviewStart(BaseModel):
    canvas_id: str


class ReviewQuestionOut(BaseModel):
    module_key: str
    module_name: str
    question: str


class ReviewAnswerIn(BaseModel):
    module_key: str
    question: str
    answer: str


class ReviewAnswerOut(BaseModel):
    module_key: str
    module_name: str
    question: str
    answer: str | None = None


class ReviewOut(BaseModel):
    id: str
    canvas_id: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    answers: list[ReviewAnswerOut] = []


# ── AI ────────────────────────────────────────────
class AISuggestRequest(BaseModel):
    module_key: str
    content: dict


class AISuggestResponse(BaseModel):
    suggestions: str
    provider: str
