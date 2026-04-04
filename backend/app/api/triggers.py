from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timedelta
from app.core.database import get_db
from app.core.security import get_current_worker
from app.models.worker import Worker
from app.models.policy import Policy
from app.models.claim import Claim
from app.models.trigger_event import TriggerEvent
from app.schemas.claim import TriggerEventResponse, TriggerSimulateRequest
from app.services.mock_apis import check_all_triggers
from app.services.trigger_monitor import process_trigger_for_zone

router = APIRouter(prefix="/api/v1/triggers", tags=["Triggers"])


@router.get("/active")
async def get_active_triggers(
    worker: Worker = Depends(get_current_worker),
    db: AsyncSession = Depends(get_db),
):
    """Get currently active trigger events in the worker's zones."""
    all_triggers = []
    for zone in (worker.zones or ["Tambaram"]):
        check = check_all_triggers(zone, worker.city or "Chennai")
        for t in check["active_triggers"]:
            t["zone"] = zone
            all_triggers.append(t)

    # Also fetch stored trigger events from DB (last 24 hrs)
    since = datetime.utcnow() - timedelta(hours=24)
    result = await db.execute(
        select(TriggerEvent)
        .where(
            and_(
                TriggerEvent.detected_at >= since,
                TriggerEvent.is_active == True,
            )
        )
        .order_by(TriggerEvent.detected_at.desc())
    )
    db_events = result.scalars().all()

    return {
        "live_triggers": all_triggers,
        "has_active": len(all_triggers) > 0,
        "db_events": [TriggerEventResponse.model_validate(e) for e in db_events],
        "zones_checked": worker.zones,
        "checked_at": datetime.utcnow().isoformat(),
    }


@router.get("/check-all")
async def check_trigger_status(
    worker: Worker = Depends(get_current_worker),
):
    """Real-time trigger check for all worker zones."""
    results = {}
    for zone in (worker.zones or ["Tambaram"]):
        results[zone] = check_all_triggers(zone, worker.city or "Chennai")
    return results


@router.post("/simulate")
async def simulate_trigger(
    data: TriggerSimulateRequest,
    db: AsyncSession = Depends(get_db),
    worker: Worker = Depends(get_current_worker),
):
    """
    DEMO ENDPOINT: Manually fire a trigger and auto-process claims.
    For hackathon demo purposes — shows the full pipeline live.
    """
    VALID_TYPES = ["RAIN", "EXTREME_HEAT", "HAZARDOUS_AQI", "FLOOD", "HUB_SHUTDOWN", "CURFEW", "ROAD_CLOSURE"]
    if data.trigger_type not in VALID_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid trigger type. Choose: {VALID_TYPES}")

    # Defaults per trigger type
    defaults = {
        "RAIN": (15.5, 10.0, "mm/hr"),
        "EXTREME_HEAT": (44.2, 42.0, "°C"),
        "HAZARDOUS_AQI": (342.0, 300.0, "AQI"),
        "FLOOD": (503.0, 500.0, "code"),
        "HUB_SHUTDOWN": (0.0, 1.0, "status"),
        "CURFEW": (1.0, 1.0, "alert"),
        "ROAD_CLOSURE": (0.9, 0.8, "score"),
    }
    measured, threshold, unit = defaults[data.trigger_type]
    if data.measured_value is not None:
        measured = data.measured_value

    desc_map = {
        "RAIN": f"[DEMO] Heavy rainfall {measured} mm/hr exceeds threshold in {data.zone}",
        "EXTREME_HEAT": f"[DEMO] Extreme heat {measured}°C alert in {data.zone}",
        "HAZARDOUS_AQI": f"[DEMO] Hazardous AQI {measured} detected in {data.zone}",
        "FLOOD": f"[DEMO] Flood/storm alert in {data.zone}",
        "HUB_SHUTDOWN": f"[DEMO] Warehouse hub DOWN in {data.zone}",
        "CURFEW": f"[DEMO] Section 144 imposed in {data.zone}",
        "ROAD_CLOSURE": f"[DEMO] Road blockade in {data.zone}",
    }

    # Create trigger event
    trigger_event = TriggerEvent(
        trigger_type=data.trigger_type,
        trigger_source="MANUAL",
        zone=data.zone,
        city=worker.city or "Chennai",
        measured_value=measured,
        threshold_value=threshold,
        unit=unit,
        description=data.description or desc_map[data.trigger_type],
        severity="HIGH",
        is_active=True,
        detected_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(hours=6),
        raw_data={"simulated": True, "fired_by": worker.id},
    )
    db.add(trigger_event)
    await db.commit()
    await db.refresh(trigger_event)

    # Run trigger processing for this zone
    await process_trigger_for_zone(data.zone, worker.city or "Chennai", db, data.simulate_gps_spoof)

    # Count claims generated
    result = await db.execute(
        select(Claim).where(
            and_(
                Claim.trigger_event_id == trigger_event.id,
            )
        )
    )
    # Fetch updated trigger
    await db.refresh(trigger_event)

    return {
        "message": "Trigger simulated successfully",
        "trigger_id": trigger_event.id,
        "trigger_type": data.trigger_type,
        "zone": data.zone,
        "claims_generated": trigger_event.claims_generated,
        "total_payout_triggered": trigger_event.total_payout_triggered,
        "description": trigger_event.description,
    }
