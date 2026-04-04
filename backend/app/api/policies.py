from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timedelta
import json
from app.core.database import get_db
from app.core.security import get_current_worker
from app.core.logger import get_logger
from app.models.worker import Worker
from app.models.policy import Policy
from app.schemas.policy import PlanListResponse, PolicyCreateRequest, PolicyResponse, PolicyRenewResponse
from app.services.premium_ai import calculate_premium

router = APIRouter(prefix="/api/v1/policies", tags=["Policies"])
logger = get_logger(__name__)

PLAN_CONFIG = {
    "Basic": {"premium": 20.0, "max_payout": 300.0},
    "Standard": {"premium": 40.0, "max_payout": 700.0},
    "Premium": {"premium": 70.0, "max_payout": 1200.0},
}


@router.get("/plans", response_model=PlanListResponse)
async def get_plan_options(
    worker: Worker = Depends(get_current_worker),
    db: AsyncSession = Depends(get_db),
):
    """Get AI-calculated personalised plan options for the current worker."""
    logger.debug("Fetching plan options", extra={"worker_id": worker.id})
    premium_data = calculate_premium(worker.zones, worker.weekly_hours, worker.platform)
    plans = []
    for plan in premium_data["plans"]:
        plans.append({
            "plan_type": plan["plan_type"],
            "weekly_premium": plan["weekly_premium"],
            "max_weekly_payout": plan["max_weekly_payout"],
            "features": plan["features"],
            "recommended": plan["recommended"],
            "zone_risk_score": premium_data["zone_risk_score"],
            "risk_tier": premium_data["risk_tier"],
        })
    return PlanListResponse(
        plans=plans,
        ai_recommendation=premium_data["ai_recommendation"],
        zone_risk_score=premium_data["zone_risk_score"],
        risk_explanation=premium_data["risk_explanation"],
    )


@router.post("/create", response_model=PolicyResponse, status_code=201)
async def create_policy(
    data: PolicyCreateRequest,
    worker: Worker = Depends(get_current_worker),
    db: AsyncSession = Depends(get_db),
):
    logger.info("Policy creation requested", extra={"worker_id": worker.id, "plan_type": data.plan_type})
    if data.plan_type not in PLAN_CONFIG:
        logger.warning("Invalid plan type requested", extra={"worker_id": worker.id, "plan_type": data.plan_type})
        raise HTTPException(status_code=400, detail="Invalid plan type")

    # Check for existing active policy
    now = datetime.utcnow()
    result = await db.execute(
        select(Policy).where(
            and_(
                Policy.worker_id == worker.id,
                Policy.status == "ACTIVE",
                Policy.end_date >= now,
            )
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        logger.warning("Worker already has active policy", extra={"worker_id": worker.id, "existing_policy_id": existing.id})
        raise HTTPException(status_code=400, detail="You already have an active policy")

    config = PLAN_CONFIG[data.plan_type]
    start = now
    end = now + timedelta(days=7)

    policy = Policy(
        worker_id=worker.id,
        plan_type=data.plan_type,
        weekly_premium=config["premium"],
        max_weekly_payout=config["max_payout"],
        start_date=start,
        end_date=end,
        renewal_date=end,
        total_paid_premium=config["premium"],  # Week 1 paid
        total_payout_received=0.0,
        remaining_weekly_payout=config["max_payout"],
        status="ACTIVE",
        auto_renew=True,
        zone_risk_score=worker.zone_risk_score,
        covered_zones=json.dumps(worker.zones),
    )
    db.add(policy)
    await db.commit()
    await db.refresh(policy)
    logger.info("Policy created successfully", extra={"worker_id": worker.id, "policy_id": policy.id, "plan_type": policy.plan_type})
    return policy


@router.get("/active", response_model=PolicyResponse)
async def get_active_policy(
    worker: Worker = Depends(get_current_worker),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.utcnow()
    result = await db.execute(
        select(Policy).where(
            and_(
                Policy.worker_id == worker.id,
                Policy.status == "ACTIVE",
                Policy.end_date >= now,
            )
        )
    )
    policy = result.scalar_one_or_none()
    if not policy:
        logger.debug("No active policy found", extra={"worker_id": worker.id})
        raise HTTPException(status_code=404, detail="No active policy found")
    return policy


@router.get("/history")
async def get_policy_history(
    worker: Worker = Depends(get_current_worker),
    db: AsyncSession = Depends(get_db),
):
    logger.debug("Fetching policy history", extra={"worker_id": worker.id})
    result = await db.execute(
        select(Policy)
        .where(Policy.worker_id == worker.id)
        .order_by(Policy.created_at.desc())
    )
    policies = result.scalars().all()
    return {"policies": [PolicyResponse.model_validate(p) for p in policies], "total": len(policies)}


@router.post("/renew", response_model=PolicyRenewResponse)
async def renew_policy(
    worker: Worker = Depends(get_current_worker),
    db: AsyncSession = Depends(get_db),
):
    logger.info("Policy renewal requested", extra={"worker_id": worker.id})
    now = datetime.utcnow()
    # Find most recent policy
    result = await db.execute(
        select(Policy)
        .where(Policy.worker_id == worker.id)
        .order_by(Policy.created_at.desc())
    )
    last_policy = result.scalar_one_or_none()
    if not last_policy:
        logger.warning("Renewal failed: no previous policy", extra={"worker_id": worker.id})
        raise HTTPException(status_code=404, detail="No previous policy to renew")

    config = PLAN_CONFIG[last_policy.plan_type]
    new_policy = Policy(
        worker_id=worker.id,
        plan_type=last_policy.plan_type,
        weekly_premium=config["premium"],
        max_weekly_payout=config["max_payout"],
        start_date=now,
        end_date=now + timedelta(days=7),
        renewal_date=now + timedelta(days=7),
        total_paid_premium=config["premium"],
        remaining_weekly_payout=config["max_payout"],
        status="ACTIVE",
        auto_renew=True,
        zone_risk_score=worker.zone_risk_score,
        covered_zones=json.dumps(worker.zones),
    )
    db.add(new_policy)
    # Expire old policy
    last_policy.status = "EXPIRED"
    await db.commit()
    await db.refresh(new_policy)
    logger.info("Policy renewed successfully", extra={"worker_id": worker.id, "new_policy_id": new_policy.id, "plan_type": new_policy.plan_type})
    return PolicyRenewResponse(message="Policy renewed for next week", policy=new_policy)
