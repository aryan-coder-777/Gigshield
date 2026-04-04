"""
Haversine distance vs zone center (from mock zone catalog).
Used to validate device GPS against the zone tied to a parametric trigger.
"""
from math import asin, cos, radians, sin, sqrt

from app.services.mock_apis import ZONE_COORDINATES

DEFAULT_ZONE_RADIUS_KM = 10.0


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in kilometers."""
    rlat1, rlon1, rlat2, rlon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlon = rlon2 - rlon1
    dlat = rlat2 - rlat1
    a = sin(dlat / 2) ** 2 + cos(rlat1) * cos(rlat2) * sin(dlon / 2) ** 2
    c = 2 * asin(sqrt(min(1.0, a)))
    return 6371.0 * c


def is_within_zone_coverage(
    lat: float,
    lon: float,
    zone: str,
    radius_km: float = DEFAULT_ZONE_RADIUS_KM,
) -> tuple[bool, float]:
    """
    Returns (within_radius, distance_km_from_zone_center).
    Unknown zone name -> not within (fail closed for validation).
    """
    center = ZONE_COORDINATES.get(zone)
    if center is None:
        return False, float("inf")
    plat, plon = center
    dist = haversine_km(lat, lon, plat, plon)
    return dist <= radius_km, dist


def zone_centers_public() -> list[dict]:
    """For mobile map rendering."""
    return [
        {"name": name, "latitude": lat, "longitude": lon, "radius_km": DEFAULT_ZONE_RADIUS_KM}
        for name, (lat, lon) in ZONE_COORDINATES.items()
    ]
