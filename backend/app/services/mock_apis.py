"""
Mock API services for all parametric trigger data sources.
Provides realistic fake data for: Weather, AQI, Hub Status, Civic Alerts, Traffic.
All values are seeded for reproducibility but appear dynamic.
"""
import random
import math
from datetime import datetime
from typing import Dict, Any, Optional


# Chennai zones and their coordinates (lat, lon)
ZONE_COORDINATES = {
    "Tambaram": (12.9249, 80.1000),
    "Anna Nagar": (13.0850, 80.2101),
    "T. Nagar": (13.0418, 80.2341),
    "Velachery": (12.9815, 80.2209),
    "Perambur": (13.1143, 80.2329),
    "Porur": (13.0358, 80.1572),
    "Sholinganallur": (12.9010, 80.2279),
    "Chromepet": (12.9516, 80.1462),
    "Andheri": (19.1136, 72.8697),
    "Koramangala": (12.9279, 77.6271),
    "Hitech City": (17.4474, 78.3762),
    "Connaught Place": (28.6315, 77.2167),
    "Zone A": (12.9716, 77.5946),
    "Zone B": (19.0760, 72.8777),
    "Zone C": (28.7041, 77.1025),
}


def _get_time_seed() -> int:
    """Seed based on current hour for consistent-within-session data."""
    now = datetime.utcnow()
    return now.year * 1000000 + now.month * 10000 + now.day * 100 + now.hour


def get_weather_data(zone: str, city: str = "Chennai") -> Dict[str, Any]:
    """
    Mock OpenWeatherMap-style weather data.
    Returns realistic weather readings for the zone.
    """
    seed = _get_time_seed() + hash(zone) % 1000
    rng = random.Random(seed)

    # Monthly rain probability simulation
    month = datetime.utcnow().month
    # Monsoon months Jun-Oct have higher rain probability
    rain_prob = 0.7 if month in [6, 7, 8, 9, 10] else 0.2

    is_raining = rng.random() < rain_prob
    rainfall_mm_hr = rng.uniform(12, 35) if is_raining else rng.uniform(0, 2)

    base_temp = 32 + rng.uniform(-5, 10)
    # Hotter in summer (Mar-May)
    if month in [3, 4, 5]:
        base_temp += 8

    humidity = rng.uniform(60, 95) if is_raining else rng.uniform(40, 75)

    # Flood / storm code
    weather_code = 502 if rainfall_mm_hr > 20 else (500 if is_raining else 800)
    weather_desc = {
        502: "heavy intensity rain",
        500: "light rain",
        800: "clear sky",
    }.get(weather_code, "scattered clouds")

    lat, lon = ZONE_COORDINATES.get(zone, (13.0827, 80.2707))

    return {
        "zone": zone,
        "city": city,
        "lat": lat,
        "lon": lon,
        "temperature": round(base_temp, 1),
        "humidity": round(humidity, 1),
        "rainfall_mm_hr": round(rainfall_mm_hr, 2),
        "weather_code": weather_code,
        "weather_description": weather_desc,
        "wind_speed": round(rng.uniform(5, 45), 1),
        "visibility_km": round(rng.uniform(0.5, 10), 1) if is_raining else round(rng.uniform(8, 20), 1),
        "source": "Mock-WeatherAPI",
        "timestamp": datetime.utcnow().isoformat(),
        # Trigger flags
        "triggers": {
            "heavy_rain": rainfall_mm_hr > 10.0,
            "extreme_heat": base_temp > 42.0,
            "flood_alert": weather_code in [502, 503, 504, 511, 901, 902],
        },
    }


def get_aqi_data(zone: str, city: str = "Chennai") -> Dict[str, Any]:
    """
    Mock WAQI-style AQI data.
    """
    seed = _get_time_seed() + hash(zone + "aqi") % 1000
    rng = random.Random(seed)

    month = datetime.utcnow().month
    # Delhi-style winter pollution spike
    base_aqi = 120 + rng.uniform(-30, 80)
    if month in [11, 12, 1]:
        base_aqi += 120

    aqi = int(min(500, max(20, base_aqi)))

    if aqi <= 50:
        category = "Good"
    elif aqi <= 100:
        category = "Satisfactory"
    elif aqi <= 200:
        category = "Moderate"
    elif aqi <= 300:
        category = "Poor"
    elif aqi <= 400:
        category = "Very Poor"
    else:
        category = "Hazardous"

    return {
        "zone": zone,
        "aqi": aqi,
        "category": category,
        "dominant_pollutant": rng.choice(["PM2.5", "PM10", "NO2", "O3"]),
        "pm25": round(rng.uniform(20, 200), 1),
        "pm10": round(rng.uniform(40, 350), 1),
        "source": "Mock-WAQI",
        "timestamp": datetime.utcnow().isoformat(),
        # Trigger flag
        "triggers": {
            "hazardous_aqi": aqi > 300,
        },
    }


def get_hub_status(zone: str) -> Dict[str, Any]:
    """
    Mock warehouse/delivery hub status API.
    """
    seed = _get_time_seed() + hash(zone + "hub") % 1000
    rng = random.Random(seed)

    # 10% chance of hub being down at any given time
    is_down = rng.random() < 0.10
    status = "DOWN" if is_down else "OPERATIONAL"

    issues = []
    if is_down:
        issues = rng.sample([
            "Structural inspection ordered",
            "Power outage",
            "Flooding in warehouse",
            "Fire safety protocol",
            "System maintenance",
        ], k=1)

    return {
        "zone": zone,
        "hub_name": f"{zone} Fulfillment Hub",
        "status": status,
        "capacity_percent": 0 if is_down else round(rng.uniform(60, 100), 0),
        "active_deliveries": 0 if is_down else rng.randint(50, 300),
        "issues": issues,
        "source": "Mock-HubStatusAPI",
        "timestamp": datetime.utcnow().isoformat(),
        "triggers": {
            "hub_shutdown": is_down,
        },
    }


def get_civic_alerts(zone: str, city: str = "Chennai") -> Dict[str, Any]:
    """
    Mock civic alert API (curfews, strikes, Section 144).
    """
    seed = _get_time_seed() + hash(zone + "civic") % 1000
    rng = random.Random(seed)

    # 5% chance of civic alert
    has_alert = rng.random() < 0.05
    alert_type = None
    description = None

    if has_alert:
        alert_type = rng.choice(["Section 144", "General Strike", "Local Bandh", "Safety Advisory"])
        description = {
            "Section 144": f"Section 144 CrPC imposed in {zone}. Gatherings of 4+ restricted.",
            "General Strike": f"General transport strike affecting {zone} area. Limited mobility.",
            "Local Bandh": f"Local trade union bandh declared in {zone}. Commercial activity halted.",
            "Safety Advisory": f"Police safety advisory for {zone}. Outdoor activity discouraged.",
        }[alert_type]

    return {
        "zone": zone,
        "city": city,
        "has_active_alert": has_alert,
        "alert_type": alert_type,
        "description": description,
        "severity": "HIGH" if has_alert else "NONE",
        "source": "Mock-CivicAlertAPI",
        "timestamp": datetime.utcnow().isoformat(),
        "triggers": {
            "curfew_or_strike": has_alert,
        },
    }


def get_traffic_data(zone: str) -> Dict[str, Any]:
    """
    Mock traffic/road closure API.
    """
    seed = _get_time_seed() + hash(zone + "traffic") % 1000
    rng = random.Random(seed)

    # 8% chance of road closure
    has_closure = rng.random() < 0.08
    closure_reason = None

    if has_closure:
        closure_reason = rng.choice([
            "Flooding on main arterial road",
            "Infrastructure collapse",
            "Police barricade",
            "VIP movement restriction",
            "Road repair emergency",
        ])

    congestion_score = rng.uniform(0.7, 1.0) if has_closure else rng.uniform(0.2, 0.7)

    return {
        "zone": zone,
        "has_road_closure": has_closure,
        "closure_reason": closure_reason,
        "affected_routes": [f"{zone} Main Road", f"{zone} Ring Road"] if has_closure else [],
        "congestion_score": round(congestion_score, 2),
        "average_delay_minutes": round(rng.uniform(30, 120)) if has_closure else round(rng.uniform(5, 20)),
        "source": "Mock-TrafficAPI",
        "timestamp": datetime.utcnow().isoformat(),
        "triggers": {
            "road_closure": has_closure,
        },
    }


def check_all_triggers(zone: str, city: str = "Chennai") -> Dict[str, Any]:
    """
    Aggregate all mock API data for a zone.
    Returns consolidated trigger check result.
    """
    weather = get_weather_data(zone, city)
    aqi = get_aqi_data(zone, city)
    hub = get_hub_status(zone)
    civic = get_civic_alerts(zone, city)
    traffic = get_traffic_data(zone)

    active_triggers = []

    if weather["triggers"]["heavy_rain"]:
        active_triggers.append({
            "type": "RAIN",
            "measured": weather["rainfall_mm_hr"],
            "threshold": 10.0,
            "unit": "mm/hr",
            "severity": "HIGH" if weather["rainfall_mm_hr"] > 25 else "MEDIUM",
            "description": f"Heavy rainfall {weather['rainfall_mm_hr']} mm/hr in {zone}",
        })

    if weather["triggers"]["extreme_heat"]:
        active_triggers.append({
            "type": "EXTREME_HEAT",
            "measured": weather["temperature"],
            "threshold": 42.0,
            "unit": "°C",
            "severity": "HIGH",
            "description": f"Extreme heat {weather['temperature']}°C in {zone}",
        })

    if weather["triggers"]["flood_alert"]:
        active_triggers.append({
            "type": "FLOOD",
            "measured": float(weather["weather_code"]),
            "threshold": 500.0,
            "unit": "code",
            "severity": "CRITICAL",
            "description": f"Flood/storm alert: {weather['weather_description']} in {zone}",
        })

    if aqi["triggers"]["hazardous_aqi"]:
        active_triggers.append({
            "type": "HAZARDOUS_AQI",
            "measured": float(aqi["aqi"]),
            "threshold": 300.0,
            "unit": "AQI",
            "severity": "CRITICAL",
            "description": f"Hazardous AQI {aqi['aqi']} ({aqi['category']}) in {zone}",
        })

    if hub["triggers"]["hub_shutdown"]:
        active_triggers.append({
            "type": "HUB_SHUTDOWN",
            "measured": 0.0,
            "threshold": 1.0,
            "unit": "status",
            "severity": "HIGH",
            "description": f"{hub['hub_name']} is DOWN: {hub['issues']}",
        })

    if civic["triggers"]["curfew_or_strike"]:
        active_triggers.append({
            "type": "CURFEW",
            "measured": 1.0,
            "threshold": 1.0,
            "unit": "alert",
            "severity": "HIGH",
            "description": civic["description"],
        })

    if traffic["triggers"]["road_closure"]:
        active_triggers.append({
            "type": "ROAD_CLOSURE",
            "measured": traffic["congestion_score"],
            "threshold": 0.8,
            "unit": "score",
            "severity": "MEDIUM",
            "description": f"Road closure: {traffic['closure_reason']} in {zone}",
        })

    return {
        "zone": zone,
        "city": city,
        "active_triggers": active_triggers,
        "has_triggers": len(active_triggers) > 0,
        "weather": weather,
        "aqi": aqi,
        "hub": hub,
        "civic": civic,
        "traffic": traffic,
        "checked_at": datetime.utcnow().isoformat(),
    }


# Baseline frequency of each trigger type in a "typical" Indian metro (for fraud / analytics mocks)
_TRIGGER_BASE_RATE = {
    "RAIN": 0.28,
    "EXTREME_HEAT": 0.22,
    "HAZARDOUS_AQI": 0.18,
    "FLOOD": 0.08,
    "HUB_SHUTDOWN": 0.05,
    "CURFEW": 0.04,
    "ROAD_CLOSURE": 0.12,
}


def weather_history_consistency_score(zone: str, city: str, trigger_type: str) -> float:
    """
    Synthetic 14-day-style lookback: how well the current trigger type aligns with
    mocked historical patterns for the zone. Low values flag possible manipulated
    or implausible parametric signals (fake-weather style claims).
    """
    seed = _get_time_seed() + abs(hash(f"{zone}|{city}|{trigger_type}")) % 100000
    rng = random.Random(seed)
    base = _TRIGGER_BASE_RATE.get(trigger_type, 0.2)
    # Zone hash nudges some areas as more flood-prone / rain-prone
    zone_skew = (abs(hash(zone)) % 40) / 100.0 - 0.2
    # Simulate "days hit in last 14d" vs expectation
    expected_hits = max(0.05, min(0.9, base + zone_skew))
    simulated_hits = sum(1 for _ in range(14) if rng.random() < expected_hits)
    ratio = simulated_hits / 14.0
    # Consistency: high when observed pattern matches what we'd expect for this trigger family
    noise = rng.uniform(-0.08, 0.08)
    consistency = min(1.0, max(0.0, 0.35 + ratio * 1.2 + base * 0.5 + noise))
    return round(consistency, 4)
