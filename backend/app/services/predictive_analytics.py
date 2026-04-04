"""
Insurer-facing predictive analytics: next-week disruption / claim likelihood (mock + historical signals).
"""
from datetime import datetime, timedelta
from typing import Any

from app.services.mock_apis import ZONE_COORDINATES, _get_time_seed, check_all_triggers


def forecast_zone_day(zone: str, city: str, day_offset: int) -> dict[str, Any]:
    """Single day mock forecast + implied claim risk."""
    seed = _get_time_seed() + day_offset * 997 + abs(hash(zone)) % 10000
    rng = random.Random(seed)
    rain_prob = round(rng.uniform(0.15, 0.65), 2)
    heat_stress = round(rng.uniform(0.1, 0.45), 2)
    aqi_stress = round(rng.uniform(0.12, 0.55), 2)
    civic_risk = round(rng.uniform(0.02, 0.18), 2)
    composite = min(1.0, (rain_prob * 0.35 + heat_stress * 0.25 + aqi_stress * 0.25 + civic_risk * 0.15))
    day = (datetime.utcnow() + timedelta(days=day_offset)).date().isoformat()
    return {
        "date": day,
        "rain_disruption_prob": rain_prob,
        "heat_disruption_prob": heat_stress,
        "aqi_disruption_prob": aqi_stress,
        "civic_disruption_prob": civic_risk,
        "estimated_claim_intensity": round(composite, 3),
    }


def next_week_claim_forecast(zones: list[str], city: str) -> dict[str, Any]:
    """7-day forward view per zone for admin dashboard."""
    by_zone = {}
    for zone in zones:
        days = [forecast_zone_day(zone, city, d) for d in range(7)]
        avg_intensity = round(sum(d["estimated_claim_intensity"] for d in days) / 7, 3)
        by_zone[zone] = {
            "daily": days,
            "week_avg_claim_intensity": avg_intensity,
            "peak_day": max(days, key=lambda x: x["estimated_claim_intensity"]),
        }

    # Portfolio-level rollup
    all_intensities = [z["week_avg_claim_intensity"] for z in by_zone.values()]
    portfolio_avg = round(sum(all_intensities) / max(len(all_intensities), 1), 3)

    narrative = (
        f"Next 7 days: portfolio claim-intensity index ≈ {portfolio_avg}. "
        "Elevated rain/heat in mock forecast increases auto-trigger probability for food & q-commerce riders."
    )

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "city": city,
        "zones": by_zone,
        "portfolio_week_avg_intensity": portfolio_avg,
        "narrative": narrative,
    }


def snapshot_live_trigger_pressure(zones: list[str], city: str) -> dict[str, Any]:
    """Current mock API snapshot — complements forward forecast."""
    pressure = {}
    for zone in zones:
        snap = check_all_triggers(zone, city)
        pressure[zone] = {
            "active_now": len(snap["active_triggers"]),
            "types": [t["type"] for t in snap["active_triggers"]],
        }
    return {"checked_at": datetime.utcnow().isoformat(), "by_zone": pressure}


def known_zones_subset(zones: list[str]) -> list[str]:
    """Prefer coordinates we know; else pass through."""
    known = [z for z in zones if z in ZONE_COORDINATES]
    return known if known else zones
