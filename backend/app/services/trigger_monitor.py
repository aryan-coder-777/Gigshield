"""
Trigger monitoring service — runs every 15 minutes via APScheduler.
Polls all registered zones, detects threshold breaches, auto-creates claims.
"""
import asyncio
import random
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.database import AsyncSessionLocal
from app.core.logger import trigger_logger
from app.models.worker import Worker
from app.models.policy import Policy
from app.models.claim import Claim
from app.models.trigger_event import TriggerEvent
from app.services.mock_apis import check_all_triggers, weather_history_consistency_score
from app.services.location_validation import is_within_zone_coverage
from app.services.fraud_ai import compute_fraud_score, classify_claim_status, get_km_from_zone
from app.services.payout import initiate_payout


# Payout amounts per trigger type (INR)
PAYOUT_MAP = {
    "RAIN":          300.0,
    "EXTREME_HEAT":  250.0,
    "HAZARDOUS_AQI": 350.0,
    "FLOOD":         400.0,
    "HUB_SHUTDOWN":  500.0,
    "CURFEW":        450.0,
    "ROAD_CLOSURE":  280.0,
}


async def process_trigger_for_zone(
    zone: str,
    city: str,
    db: AsyncSession,
    is_gps_spoofed: bool = False,
    trigger_payloads: list[dict] | None = None,
    trigger_source: str = "MOCK_API",
    device_latitude: float | None = None,
    device_longitude: float | None = None,
):
    """
    Check triggers for a zone and auto-process claims for all active policy holders.
    Fully logged with structured output.
    """
    device_outside_zone = False
    km_from_center = 0.0

    if device_latitude is not None and device_longitude is not None:
        ok, _ = is_within_zone_coverage(device_latitude, device_longitude, zone)
        device_outside_zone = not ok
        from app.services.fraud_ai import get_km_from_zone
        km_from_center = get_km_from_zone(device_latitude, device_longitude, zone)
        trigger_logger.info(
            "GPS received for zone check",
            extra={"zone": zone, "km_from_center": km_from_center, "outside": device_outside_zone}
        )

    payloads = trigger_payloads
    if payloads is None:
        check_result = check_all_triggers(zone, city)
        if not check_result["has_triggers"]:
            trigger_logger.info("No active triggers", extra={"zone": zone, "city": city})
            return []
        payloads = check_result["active_triggers"]

    trigger_logger.info(
        "Processing triggers",
        extra={"zone": zone, "count": len(payloads), "source": trigger_source}
    )

    created_events = []

    for trigger_data in payloads:
        trigger_event = TriggerEvent(
            trigger_type=trigger_data["type"],
            trigger_source=trigger_source,
            zone=zone,
            city=city,
            measured_value=trigger_data["measured"],
            threshold_value=trigger_data["threshold"],
            unit=trigger_data["unit"],
            description=trigger_data["description"],
            severity=trigger_data["severity"],
            is_active=True,
            detected_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(hours=6),
            raw_data=trigger_data,
        )
        db.add(trigger_event)
        await db.flush()
        created_events.append(trigger_event)

        trigger_logger.info(
            "Trigger event created",
            extra={
                "type": trigger_data["type"],
                "zone": zone,
                "severity": trigger_data["severity"],
                "measured": trigger_data["measured"],
                "unit": trigger_data["unit"],
            }
        )

        now = datetime.utcnow()
        result = await db.execute(
            select(Policy).join(Worker).where(
                and_(
                    Policy.status == "ACTIVE",
                    Policy.start_date <= now,
                    Policy.end_date >= now,
                )
            )
        )
        policies = result.scalars().all()

        claims_created = 0
        total_payout = 0.0

        for policy in policies:
            worker_result = await db.execute(select(Worker).where(Worker.id == policy.worker_id))
            worker = worker_result.scalar_one_or_none()
            if not worker:
                continue

            worker_zones = worker.zones if isinstance(worker.zones, list) else [worker.zones]
            if zone not in worker_zones:
                continue

            # Duplicate check (same trigger type, same day)
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            dup_result = await db.execute(
                select(Claim).where(
                    and_(
                        Claim.worker_id == worker.id,
                        Claim.policy_id == policy.id,
                        Claim.claim_type == trigger_data["type"],
                        Claim.created_at >= today_start,
                    )
                )
            )
            if dup_result.scalar_one_or_none():
                trigger_logger.info(
                    "Duplicate claim skipped",
                    extra={"worker_id": worker.id, "type": trigger_data["type"]}
                )
                continue

            if policy.remaining_weekly_payout <= 0:
                trigger_logger.info(
                    "Policy cap exhausted — skipping",
                    extra={"worker_id": worker.id, "policy_id": policy.id}
                )
                continue

            base_payout = PAYOUT_MAP.get(trigger_data["type"], 300.0)
            payout_amount = min(base_payout, policy.remaining_weekly_payout)

            claims_7d_result = await db.execute(
                select(Claim).where(
                    and_(
                        Claim.worker_id == worker.id,
                        Claim.created_at >= datetime.utcnow() - timedelta(days=7),
                    )
                )
            )
            claims_last_7d = len(claims_7d_result.scalars().all())

            account_age_days = (datetime.utcnow() - worker.created_at).days
            policy_age_days  = (datetime.utcnow() - policy.created_at).days
            zone_match       = 1.0 if zone in worker_zones else 0.0
            claim_latency    = random.uniform(45, 180)

            wh_consistency = weather_history_consistency_score(zone, city, trigger_data["type"])
            if trigger_data.get("_demo_low_weather_history"):
                wh_consistency = 0.06

            fraud_result = compute_fraud_score(
                claims_last_7d=claims_last_7d,
                zone_match_score=zone_match,
                hours_since_disruption=0.5,
                account_age_days=account_age_days,
                claim_latency_seconds=claim_latency,
                policy_age_days=policy_age_days,
                weather_history_consistency=wh_consistency,
                is_gps_spoofed=is_gps_spoofed,
                device_outside_claim_zone=device_outside_zone,
                km_from_zone_center=km_from_center,
            )

            claim_status = classify_claim_status(fraud_result["fraud_tier"])
            advance_paid = 0.0

            claim = Claim(
                worker_id=worker.id,
                policy_id=policy.id,
                trigger_event_id=trigger_event.id,
                claim_type=trigger_data["type"],
                disruption_description=trigger_data["description"],
                zone=zone,
                payout_amount=payout_amount,
                estimated_daily_loss=payout_amount * 1.5,
                coverage_hours=8.0,
                status=claim_status,
                fraud_score=fraud_result["fraud_score"],
                fraud_signals=fraud_result["signals"],
                fraud_tier=fraud_result["fraud_tier"],
                trigger_timestamp=datetime.utcnow(),
                claim_latency_seconds=claim_latency,
            )
            db.add(claim)
            await db.flush()
            claims_created += 1

            trigger_logger.info(
                "Claim created",
                extra={
                    "claim_id": claim.id,
                    "worker_id": worker.id,
                    "status": claim_status,
                    "fraud_tier": fraud_result["fraud_tier"],
                    "fraud_score": fraud_result["fraud_score"],
                    "payout_amount": payout_amount,
                }
            )

            # Handle REVIEW — ₹100 advance
            if fraud_result["fraud_tier"] == "REVIEW":
                advance_paid = min(100.0, payout_amount)
                claim.advance_paid = advance_paid

            # Initiate payout for AUTO_APPROVED
            if claim_status == "AUTO_APPROVED":
                await initiate_payout(
                    db=db,
                    worker_id=worker.id,
                    claim_id=claim.id,
                    policy_id=policy.id,
                    amount=payout_amount,
                )
                claim.status = "PAID"
                policy.total_payout_received = (policy.total_payout_received or 0) + payout_amount
                policy.remaining_weekly_payout = max(0, policy.remaining_weekly_payout - payout_amount)
                total_payout += payout_amount
                trigger_logger.info(
                    "Auto-payout completed",
                    extra={"worker_id": worker.id, "amount": payout_amount, "type": trigger_data["type"]}
                )

            elif fraud_result["fraud_tier"] == "REVIEW" and advance_paid > 0:
                await initiate_payout(
                    db=db,
                    worker_id=worker.id,
                    claim_id=claim.id,
                    policy_id=policy.id,
                    amount=advance_paid,
                    payout_type="ADVANCE",
                )
                policy.total_payout_received = (policy.total_payout_received or 0) + advance_paid
                policy.remaining_weekly_payout = max(0, policy.remaining_weekly_payout - advance_paid)
                total_payout += advance_paid
                trigger_logger.info(
                    "Review advance paid",
                    extra={"worker_id": worker.id, "advance": advance_paid}
                )

        trigger_event.claims_generated = claims_created
        trigger_event.total_payout_triggered = total_payout
        trigger_logger.info(
            "Trigger processed",
            extra={
                "type": trigger_data["type"],
                "zone": zone,
                "claims": claims_created,
                "total_payout": total_payout,
            }
        )

    await db.commit()
    return created_events


async def run_trigger_monitor():
    """Main scheduler job — polls all zones with active policy holders."""
    trigger_logger.info("Trigger monitor cycle started")
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Worker.zones, Worker.city)
            .join(Policy, Policy.worker_id == Worker.id)
            .where(Policy.status == "ACTIVE")
            .distinct()
        )
        rows = result.all()

        zones_checked = set()
        for zones_json, city in rows:
            zones = zones_json if isinstance(zones_json, list) else [zones_json]
            for zone in zones:
                if zone not in zones_checked:
                    await process_trigger_for_zone(zone, city or "Chennai", db)
                    zones_checked.add(zone)

    trigger_logger.info(
        "Trigger monitor cycle complete",
        extra={"zones_checked": len(zones_checked) if 'zones_checked' in dir() else 0}
    )


def run_monitor_sync():
    """For APScheduler (sync wrapper)."""
    asyncio.run(run_trigger_monitor())
