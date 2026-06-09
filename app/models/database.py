"""
OPC Dashboard 数据库模型
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Text, DateTime, ForeignKey, Integer, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, relationship

from app.config import settings


class Base(DeclarativeBase):
    pass


# ── User ──────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    canvases = relationship("Canvas", back_populates="user", cascade="all, delete-orphan")


# ── Canvas ────────────────────────────────────────
class Canvas(Base):
    __tablename__ = "canvases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), default="我的画布")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="canvases")
    modules = relationship("Module", back_populates="canvas", cascade="all, delete-orphan")


# ── Module ────────────────────────────────────────
MODULE_KEYS = [
    "resources", "activities", "customers", "value", "channels",
    "relationships", "partners", "costs", "revenue",
]

# 每个模块的默认内容结构
DEFAULT_MODULE_CONTENT = {
    "summary": "",
    "items": [],
    "notes": "",
    "status": "not_started",
    "last_reviewed_at": None,
}


class Module(Base):
    __tablename__ = "modules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    canvas_id = Column(UUID(as_uuid=True), ForeignKey("canvases.id"), nullable=False)
    module_key = Column(String(50), nullable=False)
    content = Column(JSONB, default=DEFAULT_MODULE_CONTENT)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    canvas = relationship("Canvas", back_populates="modules")
    versions = relationship("ModuleVersion", back_populates="module", cascade="all, delete-orphan")


# ── Module Version (历史快照) ─────────────────────
class ModuleVersion(Base):
    __tablename__ = "module_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module_id = Column(UUID(as_uuid=True), ForeignKey("modules.id"), nullable=False)
    content = Column(JSONB, nullable=False)
    version_num = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    module = relationship("Module", back_populates="versions")


# ── Review ────────────────────────────────────────
class Review(Base):
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    canvas_id = Column(UUID(as_uuid=True), ForeignKey("canvases.id"), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="in_progress")  # in_progress | completed


class ReviewAnswer(Base):
    __tablename__ = "review_answers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id = Column(UUID(as_uuid=True), ForeignKey("reviews.id"), nullable=False)
    module_key = Column(String(50), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ── Database Engine ───────────────────────────────
engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    """创建所有表"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """FastAPI 依赖注入"""
    async with async_session() as session:
        yield session
