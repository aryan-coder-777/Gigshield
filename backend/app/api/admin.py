from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta
from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.worker import Worker
from app.models.policy import Policy
from app.models.claim import Claim
from app.models.payout import Payout
from app.models.trigger_event import TriggerEvent
from app.services.payout import initiate_payout
from app.services.predictive_analytics import (
    known_zones_subset,
    next_week_claim_forecast,
    snapshot_live_trigger_pressure,
)

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


async def _prediction_zones_city(db: AsyncSession) -> tuple[str, list[str]]:
    result = await db.execute(select(Worker.city, Worker.zones))
    rows = result.all()
    cities = [c for c, _ in rows if c]
    city = cities[0] if cities else "Chennai"
    zones: list[str] = []
    for _, zs in rows:
        if isinstance(zs, list):
            zones.extend(zs)
        elif zs:
            zones.append(zs)
    uniq = sorted(set(zones))
    if not uniq:
        uniq = ["Tambaram", "Anna Nagar", "Velachery", "Andheri", "Koramangala"]
    return city, known_zones_subset(uniq)


@router.get("/predictions")
async def get_claim_predictions(
    db: AsyncSession = Depends(get_db),
    admin: Worker = Depends(get_current_admin),
):
    """
    Next-week disruption / claim intensity forecast plus live mock trigger pressure.
    """
    city, zones = await _prediction_zones_city(db)
    forecast = next_week_claim_forecast(zones, city)
    live = snapshot_live_trigger_pressure(zones, city)
    return {"forecast": forecast, "live_pressure": live}


@router.get("/dashboard")
async def get_admin_dashboard(
    db: AsyncSession = Depends(get_db),
    admin: Worker = Depends(get_current_admin),
):
    """Comprehensive admin dashboard KPIs."""
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)

    # Active policies count
    active_policies = await db.execute(
        select(func.count(Policy.id)).where(
            and_(Policy.status == "ACTIVE", Policy.end_date >= now)
        )
    )
    active_count = active_policies.scalar() or 0

    # Total workers registered
    total_workers = await db.execute(select(func.count(Worker.id)))
    worker_count = total_workers.scalar() or 0

    # Claims this week
    claims_week = await db.execute(
        select(Claim).where(Claim.created_at >= week_ago)
    )
    claims = claims_week.scalars().all()
    total_claims = len(claims)
    auto_approved = sum(1 for c in claims if c.status in ["AUTO_APPROVED", "PAID"])
    flagged = sum(1 for c in claims if c.status == "FLAGGED_FOR_REVIEW")
    rejected = sum(1 for c in claims if c.status == "REJECTED")
    fraud_rate = round((flagged + rejected) / max(total_claims, 1) * 100, 1)

    # Total payouts this week
    payouts_week = await db.execute(
        select(func.sum(Payout.amount)).where(
            and_(Payout.status == "COMPLETED", Payout.initiated_at >= week_ago)
        )
    )
    total_payout_week = float(payouts_week.scalar() or 0)

    # Total premiums this week
    premiums_week = await db.execute(
        select(func.sum(Policy.weekly_premium)).where(
            Policy.created_at >= week_ago
        )
    )
    total_premium_week = float(premiums_week.scalar() or 0)

    # Loss ratio
    loss_ratio = round((total_payout_week / max(total_premium_week, 1)) * 100, 1)

    # Today's payouts
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    payouts_today = await db.execute(
        select(func.sum(Payout.amount)).where(
            and_(Payout.status == "COMPLETED", Payout.initiated_at >= today_start)
        )
    )
    total_payout_today = float(payouts_today.scalar() or 0)

    # Recent trigger events
    triggers_result = await db.execute(
        select(TriggerEvent)
        .where(TriggerEvent.detected_at >= week_ago)
        .order_by(TriggerEvent.detected_at.desc())
        .limit(10)
    )
    recent_triggers = triggers_result.scalars().all()

    # Zone disruption heatmap
    zone_counts = {}
    for t in recent_triggers:
        zone_counts[t.zone] = zone_counts.get(t.zone, 0) + 1

    return {
        "summary": {
            "active_policies": active_count,
            "total_workers": worker_count,
            "total_claims_week": total_claims,
            "auto_approved_week": auto_approved,
            "flagged_week": flagged,
            "rejected_week": rejected,
            "fraud_detection_rate": fraud_rate,
            "total_payout_week": total_payout_week,
            "total_premium_week": total_premium_week,
            "loss_ratio": loss_ratio,
            "total_payout_today": total_payout_today,
        },
        "zone_heatmap": zone_counts,
        "recent_triggers": [
            {
                "id": t.id,
                "type": t.trigger_type,
                "zone": t.zone,
                "severity": t.severity,
                "claims_generated": t.claims_generated,
                "total_payout": t.total_payout_triggered,
                "detected_at": t.detected_at.isoformat(),
            }
            for t in recent_triggers
        ],
    }


@router.get("/claims/flagged")
async def get_flagged_claims(
    db: AsyncSession = Depends(get_db),
    admin: Worker = Depends(get_current_admin),
):
    result = await db.execute(
        select(Claim)
        .where(Claim.status.in_(["FLAGGED_FOR_REVIEW", "APPEAL_PENDING"]))
        .order_by(Claim.created_at.desc())
    )
    claims = result.scalars().all()
    return {
        "flagged_claims": [
            {
                "id": c.id,
                "worker_id": c.worker_id,
                "claim_type": c.claim_type,
                "zone": c.zone,
                "payout_amount": c.payout_amount,
                "fraud_score": c.fraud_score,
                "fraud_tier": c.fraud_tier,
                "fraud_signals": c.fraud_signals,
                "advance_paid": c.advance_paid,
                "status": c.status,
                "appeal_note": c.appeal_note,
                "created_at": c.created_at.isoformat(),
            }
            for c in claims
        ],
        "total": len(claims),
    }


@router.put("/claims/{claim_id}/decision")
async def make_claim_decision(
    claim_id: int,
    decision: str,  # "approve" or "reject"
    note: str = None,
    db: AsyncSession = Depends(get_db),
    admin: Worker = Depends(get_current_admin),
):
    result = await db.execute(select(Claim).where(Claim.id == claim_id))
    claim = result.scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    if decision == "approve":
        claim.status = "AUTO_APPROVED"
        claim.review_note = note or "Manually approved by admin"
        claim.reviewed_by = admin.id
        claim.reviewed_at = datetime.utcnow()
        # Initiate payout
        remaining = claim.payout_amount - (claim.advance_paid or 0)
        if remaining > 0:
            await initiate_payout(
                db=db,
                worker_id=claim.worker_id,
                claim_id=claim.id,
                policy_id=claim.policy_id,
                amount=remaining,
            )
            claim.status = "PAID"

        policy_result = await db.execute(select(Policy).where(Policy.id == claim.policy_id))
        policy = policy_result.scalar_one_or_none()
        if policy:
            total_paid_now = (claim.advance_paid or 0) + max(remaining, 0)
            policy.total_payout_received += total_paid_now
            policy.remaining_weekly_payout = max(0, policy.remaining_weekly_payout - total_paid_now)
    elif decision == "reject":
        claim.status = "REJECTED"
        claim.review_note = note or "Rejected after review"
        claim.reviewed_by = admin.id
        claim.reviewed_at = datetime.utcnow()
    else:
        raise HTTPException(status_code=400, detail="Decision must be 'approve' or 'reject'")

    await db.commit()
    return {"message": f"Claim {claim_id} {decision}d", "status": claim.status}


@router.get("/workers")
async def list_all_workers(
    db: AsyncSession = Depends(get_db),
    admin: Worker = Depends(get_current_admin),
):
    result = await db.execute(select(Worker).order_by(Worker.created_at.desc()))
    workers = result.scalars().all()
    return {
        "workers": [
            {
                "id": w.id,
                "name": w.name,
                "phone": w.phone,
                "platform": w.platform,
                "city": w.city,
                "zones": w.zones,
                "zone_risk_score": w.zone_risk_score,
                "risk_tier": w.risk_tier,
                "kyc_status": w.kyc_status,
                "is_active": w.is_active,
                "created_at": w.created_at.isoformat(),
            }
            for w in workers
        ],
        "total": len(workers),
    }
