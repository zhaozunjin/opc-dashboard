"""
OPC 经营仪表盘 — FastAPI 主入口
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models.database import init_db
from app.routers import auth, canvas, review


@asynccontextmanager
async def lifespan(app: FastAPI):
    """启动时初始化数据库"""
    await init_db()
    yield


app = FastAPI(
    title="OPC 经营仪表盘 API",
    description="经营画布 + AI Review 引擎",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 路由注册
app.include_router(auth.router)
app.include_router(canvas.router)
app.include_router(review.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "opc-dashboard"}
