from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_worker
from app.models.trigger_event import TriggerEvent
from app.models.worker import Worker
from app.schemas.claim import TriggerEventResponse, TriggerSimulateRequest
from app.services.mock_apis import check_all_triggers
from app.services.trigger_monitor import process_trigger_for_zone
from app.services.location_validation import zone_centers_public

router = APIRouter(prefix="/api/v1/triggers", tags=["Triggers"])


@router.get("/zones/geo")
async def get_zone_geography():
    """Zone centers and coverage radius for map UI (public catalog)."""
    return {"zones": zone_centers_public()}


@router.get("/active")
async def get_active_triggers(
    worker: Worker = Depends(get_current_worker),
    db: AsyncSession = Depends(get_db),
):
    all_triggers = []
    for zone in (worker.zones or ["Tambaram"]):
        check = check_all_triggers(zone, worker.city or "Chennai")
        for trigger in check["active_triggers"]:
            trigger["zone"] = zone
            all_triggers.append(trigger)

    since = datetime.utcnow() - timedelta(hours=24)
    result = await db.execute(
        select(TriggerEvent)
        .where(and_(TriggerEvent.detected_at >= since, TriggerEvent.is_active == True))
        .order_by(TriggerEvent.detected_at.desc())
    )
    db_events = result.scalars().all()

    return {
        "live_triggers": all_triggers,
        "has_active": len(all_triggers) > 0,
        "db_events": [TriggerEventResponse.model_validate(event) for event in db_events],
        "zones_checked": worker.zones,
        "checked_at": datetime.utcnow().isoformat(),
    }


@router.get("/check-all")
async def check_trigger_status(worker: Worker = Depends(get_current_worker)):
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
    valid_types = ["RAIN", "EXTREME_HEAT", "HAZARDOUS_AQI", "FLOOD", "HUB_SHUTDOWN", "CURFEW", "ROAD_CLOSURE"]
    if data.trigger_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid trigger type. Choose: {valid_types}")

    defaults = {
        "RAIN": (15.5, 10.0, "mm/hr"),
        "EXTREME_HEAT": (44.2, 42.0, "deg C"),
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
        "EXTREME_HEAT": f"[DEMO] Extreme heat {measured} deg C alert in {data.zone}",
        "HAZARDOUS_AQI": f"[DEMO] Hazardous AQI {measured} detected in {data.zone}",
        "FLOOD": f"[DEMO] Flood or storm alert in {data.zone}",
        "HUB_SHUTDOWN": f"[DEMO] Warehouse hub down in {data.zone}",
        "CURFEW": f"[DEMO] Section 144 imposed in {data.zone}",
        "ROAD_CLOSURE": f"[DEMO] Road blockade in {data.zone}",
    }

    created_events = await process_trigger_for_zone(
        data.zone,
        worker.city or "Chennai",
        db,
        bool(data.simulate_gps_spoof),
        trigger_payloads=[
            {
                "type": data.trigger_type,
                "measured": measured,
                "threshold": threshold,
                "unit": unit,
                "description": data.description or desc_map[data.trigger_type],
                "severity": "HIGH",
                "simulated": True,
                "fired_by": worker.id,
                "_demo_low_weather_history": bool(data.simulate_low_weather_history),
            }
        ],
        trigger_source="MANUAL",
        device_latitude=data.latitude,
        device_longitude=data.longitude,
    )
    trigger_event = created_events[0]

    return {
        "message": "Trigger simulated successfully",
        "trigger_id": trigger_event.id,
        "trigger_type": data.trigger_type,
        "zone": data.zone,
        "claims_generated": trigger_event.claims_generated,
        "total_payout_triggered": trigger_event.total_payout_triggered,
        "description": trigger_event.description,
    }
