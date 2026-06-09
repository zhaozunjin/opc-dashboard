"""
画布 + 模块 CRUD 路由
"""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import (
    get_db, User, Canvas, Module, ModuleVersion,
    MODULE_KEYS, DEFAULT_MODULE_CONTENT,
)
from app.models.schemas import (
    CanvasCreate, CanvasOut, ModuleOut, ModuleUpdate, VersionOut, VersionDiff,
)
from app.routers.deps import get_current_user

router = APIRouter(prefix="/canvas", tags=["画布"])


# ── Canvas CRUD ───────────────────────────────────
@router.post("", response_model=CanvasOut)
async def create_canvas(
    body: CanvasCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建画布（自动初始化 9 个空模块）"""
    canvas = Canvas(user_id=user.id, name=body.name)
    db.add(canvas)
    await db.flush()

    # 初始化 9 个模块
    for key in MODULE_KEYS:
        module = Module(
            canvas_id=canvas.id,
            module_key=key,
            content=DEFAULT_MODULE_CONTENT.copy(),
        )
        db.add(module)

    await db.commit()
    await db.refresh(canvas)
    return await _canvas_with_modules(db, canvas.id)


@router.get("", response_model=list[CanvasOut])
async def list_canvases(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """列出用户所有画布"""
    result = await db.execute(
        select(Canvas).where(Canvas.user_id == user.id).order_by(Canvas.created_at.desc())
    )
    canvases = result.scalars().all()
    return [await _canvas_with_modules(db, c.id) for c in canvases]


@router.get("/{canvas_id}", response_model=CanvasOut)
async def get_canvas(
    canvas_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单个画布 + 全部模块"""
    canvas = await _get_owned_canvas(db, canvas_id, user.id)
    return await _canvas_with_modules(db, canvas.id)


# ── Module CRUD ───────────────────────────────────
@router.put("/{canvas_id}/modules/{module_key}", response_model=ModuleOut)
async def update_module(
    canvas_id: str,
    module_key: str,
    body: ModuleUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    更新模块内容（自动创建版本快照）
    """
    await _get_owned_canvas(db, canvas_id, user.id)

    if module_key not in MODULE_KEYS:
        raise HTTPException(status_code=400, detail=f"无效的 module_key: {module_key}")

    # 查找模块
    result = await db.execute(
        select(Module).where(
            Module.canvas_id == canvas_id,
            Module.module_key == module_key,
        )
    )
    module = result.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="模块不存在")

    # 创建版本快照（保存旧内容）
    version_result = await db.execute(
        select(ModuleVersion)
        .where(ModuleVersion.module_id == module.id)
        .order_by(ModuleVersion.version_num.desc())
        .limit(1)
    )
    last_version = version_result.scalar_one_or_none()
    next_version_num = (last_version.version_num + 1) if last_version else 1

    snapshot = ModuleVersion(
        module_id=module.id,
        content=module.content,
        version_num=next_version_num,
    )
    db.add(snapshot)

    # 更新模块
    module.content = body.content.model_dump()
    module.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(module)

    return ModuleOut(
        id=str(module.id),
        module_key=module.module_key,
        content=module.content,
        updated_at=module.updated_at,
    )


@router.get("/{canvas_id}/modules/{module_key}/versions", response_model=list[VersionOut])
async def list_versions(
    canvas_id: str,
    module_key: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """查看模块版本历史"""
    await _get_owned_canvas(db, canvas_id, user.id)

    result = await db.execute(
        select(Module).where(
            Module.canvas_id == canvas_id,
            Module.module_key == module_key,
        )
    )
    module = result.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="模块不存在")

    versions = await db.execute(
        select(ModuleVersion)
        .where(ModuleVersion.module_id == module.id)
        .order_by(ModuleVersion.version_num.desc())
    )
    return [
        VersionOut(
            id=str(v.id),
            version_num=v.version_num,
            content=v.content,
            created_at=v.created_at,
        )
        for v in versions.scalars().all()
    ]


@router.get("/{canvas_id}/modules/{module_key}/diff", response_model=VersionDiff)
async def diff_versions(
    canvas_id: str,
    module_key: str,
    version_a: int,
    version_b: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """对比两个版本的差异"""
    await _get_owned_canvas(db, canvas_id, user.id)

    result = await db.execute(
        select(Module).where(
            Module.canvas_id == canvas_id,
            Module.module_key == module_key,
        )
    )
    module = result.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="模块不存在")

    versions = await db.execute(
        select(ModuleVersion)
        .where(ModuleVersion.module_id == module.id)
        .order_by(ModuleVersion.version_num)
    )
    version_list = {v.version_num: v.content for v in versions.scalars().all()}

    old = version_list.get(version_a, {})
    new = version_list.get(version_b, {})

    # 字段级对比
    changes = {}
    all_keys = set(list(old.keys()) + list(new.keys()))
    for key in all_keys:
        old_val = old.get(key)
        new_val = new.get(key)
        if old_val != new_val:
            changes[key] = {"old": old_val, "new": new_val}

    return VersionDiff(module_key=module_key, changes=changes)


# ── Helpers ───────────────────────────────────────
async def _get_owned_canvas(db: AsyncSession, canvas_id: str, user_id) -> Canvas:
    result = await db.execute(
        select(Canvas).where(Canvas.id == canvas_id, Canvas.user_id == user_id)
    )
    canvas = result.scalar_one_or_none()
    if not canvas:
        raise HTTPException(status_code=404, detail="画布不存在或无权访问")
    return canvas


async def _canvas_with_modules(db: AsyncSession, canvas_id) -> CanvasOut:
    canvas_result = await db.execute(select(Canvas).where(Canvas.id == canvas_id))
    canvas = canvas_result.scalar_one()

    modules_result = await db.execute(
        select(Module).where(Module.canvas_id == canvas_id).order_by(Module.module_key)
    )
    modules = modules_result.scalars().all()

    return CanvasOut(
        id=str(canvas.id),
        name=canvas.name,
        created_at=canvas.created_at,
        modules=[
            ModuleOut(
                id=str(m.id),
                module_key=m.module_key,
                content=m.content,
                updated_at=m.updated_at,
            )
            for m in modules
        ],
    )
