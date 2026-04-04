from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_worker
from app.core.logger import get_logger
from app.models.claim import Claim
from app.models.payout import Payout
from app.models.policy import Policy
from app.models.worker import Worker

router = APIRouter(prefix="/api/v1/worker", tags=["Worker Insights"])
logger = get_logger(__name__)


@router.get("/dashboard-summary")
async def worker_dashboard_summary(
    worker: Worker = Depends(get_current_worker),
    db: AsyncSession = Depends(get_db),
):
    """
    Enriched worker dashboard: weekly coverage, earnings protected, claim activity,
    streak weeks insured, risk trend, avg claim latency.
    """
    now        = datetime.utcnow()
    week_start = now - timedelta(days=7)
    month_ago  = now - timedelta(days=30)

    # Active policy
    policy_result = await db.execute(
        select(Policy)
        .where(and_(
            Policy.worker_id == worker.id,
            Policy.status == "ACTIVE",
            Policy.end_date >= now,
        ))
        .order_by(Policy.end_date.desc())
        .limit(1)
    )
    active = policy_result.scalars().first()

    # Lifetime earnings protected (completed payouts)
    payout_total = await db.execute(
        select(func.coalesce(func.sum(Payout.amount), 0))
        .where(and_(Payout.worker_id == worker.id, Payout.status == "COMPLETED"))
    )
    earnings_protected_lifetime = float(payout_total.scalar() or 0)

    # This week earnings protected
    payout_week = await db.execute(
        select(func.coalesce(func.sum(Payout.amount), 0))
        .where(and_(
            Payout.worker_id == worker.id,
            Payout.status == "COMPLETED",
            Payout.initiated_at >= week_start,
        ))
    )
    earnings_protected_week = float(payout_week.scalar() or 0)

    # Total claims
    claims_result = await db.execute(
        select(func.count(Claim.id)).where(Claim.worker_id == worker.id)
    )
    claims_total = int(claims_result.scalar() or 0)

    # Approved this week
    approved_week = await db.execute(
        select(func.count(Claim.id)).where(and_(
            Claim.worker_id == worker.id,
            Claim.created_at >= week_start,
            Claim.status.in_(["AUTO_APPROVED", "PAID"]),
        ))
    )
    claims_approved_week = int(approved_week.scalar() or 0)

    # Average claim latency (last 30 days)
    latency_result = await db.execute(
        select(func.avg(Claim.claim_latency_seconds))
        .where(and_(
            Claim.worker_id == worker.id,
            Claim.created_at >= month_ago,
            Claim.claim_latency_seconds.isnot(None),
        ))
    )
    avg_latency = round(float(latency_result.scalar() or 0), 1)

    # Streak weeks insured (count of ACTIVE + EXPIRED policies, consecutive)
    all_policies_result = await db.execute(
        select(Policy)
        .where(Policy.worker_id == worker.id)
        .order_by(Policy.start_date.desc())
    )
    all_policies = all_policies_result.scalars().all()
    streak_weeks = sum(1 for p in all_policies if p.status in ("ACTIVE", "EXPIRED"))

    # Risk score trend (compare current zone_risk_score vs. first policy)
    risk_trend = "STABLE"
    if len(all_policies) >= 2:
        newest_risk = getattr(all_policies[0], "zone_risk_score", 0) or 0
        oldest_risk = getattr(all_policies[-1], "zone_risk_score", 0) or 0
        if newest_risk > oldest_risk + 5:
            risk_trend = "INCREASING"
        elif newest_risk < oldest_risk - 5:
            risk_trend = "DECREASING"

    # Disruption hours averted estimate (each paid claim = 8 hrs protected)
    paid_claims_count = await db.execute(
        select(func.count(Claim.id)).where(and_(
            Claim.worker_id == worker.id,
            Claim.status.in_(["PAID", "AUTO_APPROVED"]),
        ))
    )
    disruption_hours_averted = int(paid_claims_count.scalar() or 0) * 8

    # Build policy dict
    days_left = 0
    week_progress_pct = 0.0
    if active:
        total_secs   = (active.end_date - active.start_date).total_seconds() or 1
        elapsed      = (now - active.start_date).total_seconds()
        week_progress_pct = round(min(100.0, max(0.0, (elapsed / total_secs) * 100)), 1)
        days_left    = max(0, int((active.end_date - now).total_seconds() // 86400))

    logger.info(
        "Dashboard summary fetched",
        extra={
            "worker_id": worker.id,
            "active_policy": active is not None,
            "lifetime_protected": earnings_protected_lifetime,
            "streak_weeks": streak_weeks,
        }
    )

    return {
        "active_policy": active is not None,
        "policy": None if not active else {
            "plan_type":                  active.plan_type,
            "weekly_premium_inr":         active.weekly_premium,
            "max_weekly_payout_inr":      active.max_weekly_payout,
            "remaining_weekly_payout_inr": active.remaining_weekly_payout,
            "coverage_used_pct":          round(
                (1 - active.remaining_weekly_payout / max(active.max_weekly_payout, 1)) * 100, 1
            ),
            "week_start":                 active.start_date.isoformat(),
            "week_end":                   active.end_date.isoformat(),
            "days_left_in_policy_week":   days_left,
            "week_progress_pct":          week_progress_pct,
            "status":                     active.status,
            "auto_renew":                 active.auto_renew,
        },
        "earnings_protected_inr_lifetime":  earnings_protected_lifetime,
        "earnings_protected_inr_this_week": earnings_protected_week,
        "claims_total":                     claims_total,
        "claims_auto_approved_this_week":   claims_approved_week,
        "streak_weeks_insured":             streak_weeks,
        "avg_claim_latency_seconds":        avg_latency,
        "disruption_hours_averted":         disruption_hours_averted,
        "risk_score_trend":                 risk_trend,
        "worker_risk_score":                worker.zone_risk_score,
        "persona_hint": "Income-loss only — no health, vehicle, or accident cover.",
    }
