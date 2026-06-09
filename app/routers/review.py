"""
Review 路由 — 生成 Review 问题 + 提交回答
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import (
    get_db, User, Canvas, Module, Review, ReviewAnswer, MODULE_KEYS,
)
from app.models.schemas import (
    ReviewStart, ReviewQuestionOut, ReviewAnswerIn, ReviewOut,
)
from app.routers.deps import get_current_user
from app.services.ai import generate

router = APIRouter(prefix="/review", tags=["Review"])

# 模块中文名映射
MODULE_NAMES = {
    "resources": "核心资源", "activities": "关键业务", "customers": "客户群体",
    "value": "价值服务", "channels": "渠道通路", "relationships": "客户关系",
    "partners": "重要合作", "costs": "成本结构", "revenue": "收入来源",
}

# Review 问题模板（v1）
REVIEW_QUESTIONS = {
    "resources": ["最近学了什么新技能？", "有没有被低估的资源没用上？"],
    "activities": ["上个月实际花时间最多的事是什么？", "有没有该砍掉的活动？"],
    "customers": ["最近有没有新客户类型出现？", "哪类客户 ROI 最高？"],
    "value": ["客户最近的反馈是什么？", "你的价值主张还成立吗？"],
    "channels": ["哪个渠道效果最好？", "有没有该放弃的渠道？"],
    "relationships": ["客户续费/复购情况？", "有没有流失信号？"],
    "partners": ["有没有新的合作机会？", "现有合作还健康吗？"],
    "costs": ["最大的隐性成本是什么？", "有没有可以砍的支出？"],
    "revenue": ["收入结构有变化吗？", "哪个收入来源最不稳定？"],
}


@router.post("/start", response_model=ReviewOut)
async def start_review(
    body: ReviewStart,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """开始一轮 Review — 为每个模块生成一个问题"""
    # 验证画布归属
    canvas_result = await db.execute(
        select(Canvas).where(Canvas.id == body.canvas_id, Canvas.user_id == user.id)
    )
    canvas = canvas_result.scalar_one_or_none()
    if not canvas:
        raise HTTPException(status_code=404, detail="画布不存在或无权访问")

    # 创建 Review 记录
    review = Review(canvas_id=body.canvas_id)
    db.add(review)
    await db.flush()

    # 为每个模块生成问题
    for key in MODULE_KEYS:
        # 获取模块内容
        mod_result = await db.execute(
            select(Module).where(Module.canvas_id == body.canvas_id, Module.module_key == key)
        )
        module = mod_result.scalar_one_or_none()
        content_str = str(module.content) if module else "{}"

        # 从模板选一个问题（简单轮替：根据 review id 奇偶）
        questions = REVIEW_QUESTIONS.get(key, ["这个模块需要更新吗？"])
        question = questions[0]  # v1 简单取第一个

        # AI 增强（如果有 API key）
        prompt = f"你是用户的经营教练。用户的「{MODULE_NAMES[key]}」模块当前内容是：{content_str}。\n请基于以上信息，问一个具体的、有针对性的问题，帮助用户审视这个模块是否需要调整。"
        ai_result = await generate(prompt)

        # 如果 AI 返回了有效结果，用 AI 的问题
        if ai_result["provider"] != "template-fallback":
            question = ai_result["response"]

        answer_record = ReviewAnswer(
            review_id=review.id,
            module_key=key,
            question=question,
        )
        db.add(answer_record)

    await db.commit()
    await db.refresh(review)

    return await _review_with_answers(db, review.id)


@router.post("/{review_id}/answer")
async def submit_answer(
    review_id: str,
    body: ReviewAnswerIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """提交一个模块的 Review 回答"""
    # 验证 Review 归属
    review_result = await db.execute(
        select(Review).join(Canvas).where(
            Review.id == review_id,
            Canvas.user_id == user.id,
        )
    )
    review = review_result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review 不存在或无权访问")

    # 更新回答
    answer_result = await db.execute(
        select(ReviewAnswer).where(
            ReviewAnswer.review_id == review_id,
            ReviewAnswer.module_key == body.module_key,
        )
    )
    answer = answer_result.scalar_one_or_none()
    if not answer:
        raise HTTPException(status_code=404, detail="该模块的 Review 问题不存在")

    answer.answer = body.answer
    await db.commit()

    return {"ok": True}


@router.get("/{review_id}", response_model=ReviewOut)
async def get_review(
    review_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取 Review 详情（含所有问题和回答）"""
    review_result = await db.execute(
        select(Review).join(Canvas).where(
            Review.id == review_id,
            Canvas.user_id == user.id,
        )
    )
    review = review_result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review 不存在或无权访问")

    return await _review_with_answers(db, review.id)


async def _review_with_answers(db: AsyncSession, review_id) -> ReviewOut:
    review_result = await db.execute(select(Review).where(Review.id == review_id))
    review = review_result.scalar_one()

    answers_result = await db.execute(
        select(ReviewAnswer)
        .where(ReviewAnswer.review_id == review_id)
        .order_by(ReviewAnswer.module_key)
    )
    answers = answers_result.scalars().all()

    return ReviewOut(
        id=str(review.id),
        canvas_id=str(review.canvas_id),
        status=review.status,
        started_at=review.started_at,
        completed_at=review.completed_at,
        answers=[
            ReviewAnswerOut(
                module_key=a.module_key,
                module_name=MODULE_NAMES.get(a.module_key, a.module_key),
                question=a.question,
            )
            for a in answers
        ],
    )
