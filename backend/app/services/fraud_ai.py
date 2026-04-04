"""
GigShield — AI Fraud Detection (v2)
=====================================
Hybrid engine: Isolation Forest anomaly detection + rule-based overlay.

Features (8 total):
  1. claims_last_7d          — velocity check
  2. zone_match_score        — did worker operate in claimed zone?
  3. hours_since_disruption  — timing plausibility
  4. account_age_days        — new accounts more risky
  5. claim_latency_seconds   — too instant = suspicious
  6. policy_age_days         — brand-new policies flagged
  7. weather_history_consistency — historical pattern match
  8. km_from_zone_center     — GPS proximity (0 = at center, >15 = suspicious)

Decision pipeline:
  GPS_SPOOFED / DEVICE_OUTSIDE_ZONE → immediate BLOCKED (hard rule)
  IsolationForest anomaly score → base fraud_score
  Rule overlay (weather history, velocity) → adjusts score
  fraud_score < 0.40 → TRUSTED → AUTO_APPROVED
  fraud_score 0.40–0.70 → REVIEW → FLAGGED + ₹100 advance
  fraud_score > 0.70 → BLOCKED → REJECTED
"""
import math
import numpy as np
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from pathlib import Path
from app.core.config import settings
from app.core.logger import fraud_logger

MODELS_DIR = Path(__file__).parent.parent.parent / "models_pkl"
MODELS_DIR.mkdir(exist_ok=True)

MODEL_PATH  = MODELS_DIR / "fraud_model_v2.pkl"
SCALER_PATH = MODELS_DIR / "fraud_scaler_v2.pkl"

N_FEATURES = 8  # v2 has 8 features (added km_from_zone_center)

# Zone center coordinates for GPS proximity computation
ZONE_CENTERS = {
    "Tambaram":         (12.9249, 80.1000),
    "Anna Nagar":       (13.0850, 80.2101),
    "T. Nagar":         (13.0418, 80.2341),
    "Velachery":        (12.9815, 80.2209),
    "Perambur":         (13.1143, 80.2329),
    "Porur":            (13.0358, 80.1572),
    "Sholinganallur":   (12.9010, 80.2279),
    "Chromepet":        (12.9516, 80.1462),
    "Adyar":            (13.0012, 80.2565),
    "Mylapore":         (13.0368, 80.2676),
    "Andheri":          (19.1136, 72.8697),
    "Koramangala":      (12.9279, 77.6271),
    "Hitech City":      (17.4474, 78.3762),
    "Connaught Place":  (28.6315, 77.2167),
    "Zone A":           (12.9716, 77.5946),
    "Zone B":           (19.0760, 72.8777),
    "Zone C":           (28.7041, 77.1025),
}

COVERAGE_RADIUS_KM = 10.0  # Claims valid within 10 km of zone center


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine great-circle distance in km."""
    R = 6371.0
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    dφ = math.radians(lat2 - lat1)
    dλ = math.radians(lon2 - lon1)
    a = math.sin(dφ / 2) ** 2 + math.cos(φ1) * math.cos(φ2) * math.sin(dλ / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def get_km_from_zone(device_lat: float | None, device_lon: float | None, zone: str) -> float:
    """
    Returns km distance from device to zone center.
    Returns 0.0 if no GPS supplied (trust-by-default for demo).
    Returns 20.0 sentinel if zone center unknown.
    """
    if device_lat is None or device_lon is None:
        return 0.0  # No GPS = can't penalise
    center = ZONE_CENTERS.get(zone)
    if center is None:
        return 5.0  # Unknown zone → neutral distance
    return round(_haversine_km(device_lat, device_lon, center[0], center[1]), 2)


def train_fraud_model():
    """Generate synthetic claim data and train IsolationForest (8 features)."""
    fraud_logger.info("Training Isolation Forest fraud model (v2, 8 features)...")
    np.random.seed(42)
    n_clean = 4800
    n_fraud = 500

    # Clean claims — normal behavior
    clean = np.column_stack([
        np.random.uniform(0, 3, n_clean),        # claims_last_7d
        np.random.uniform(0.7, 1.0, n_clean),    # zone_match_score
        np.random.uniform(5, 120, n_clean),      # hours_since_disruption
        np.random.uniform(30, 1000, n_clean),    # account_age_days
        np.random.uniform(30, 300, n_clean),     # claim_latency_seconds
        np.random.uniform(1, 5, n_clean),        # policy_age_days
        np.random.uniform(0.45, 1.0, n_clean),  # weather_history_consistency
        np.random.uniform(0, 8, n_clean),        # km_from_zone_center (within zone)
    ])

    # Fraudulent claims — anomalous behavior
    fraud = np.column_stack([
        np.random.uniform(4, 15, n_fraud),       # many claims last 7d
        np.random.uniform(0.0, 0.4, n_fraud),    # zone mismatch
        np.random.uniform(0, 10, n_fraud),       # filed too fast
        np.random.uniform(0, 7, n_fraud),        # new account
        np.random.uniform(1, 25, n_fraud),       # < 25 second latency
        np.random.uniform(0, 2, n_fraud),        # brand new policy
        np.random.uniform(0.0, 0.35, n_fraud),  # weather inconsistent
        np.random.uniform(15, 50, n_fraud),      # far from zone center
    ])

    X = np.vstack([clean, fraud])
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = IsolationForest(
        n_estimators=250,
        contamination=0.095,
        random_state=42,
        max_samples="auto",
        max_features=0.85,
    )
    model.fit(X_scaled)

    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    fraud_logger.info("Fraud model trained and saved", extra={"n_features": N_FEATURES})
    return model, scaler


def load_or_train_fraud_model():
    from app.core.config import settings as _s
    if not _s.FORCE_RETRAIN_MODELS and MODEL_PATH.exists() and SCALER_PATH.exists():
        try:
            model  = joblib.load(MODEL_PATH)
            scaler = joblib.load(SCALER_PATH)
            n_in   = getattr(scaler, "n_features_in_", N_FEATURES)
            if n_in == N_FEATURES:
                fraud_logger.info("Loaded cached fraud model (IsolationForest v2)")
                return model, scaler
        except Exception as e:
            fraud_logger.warning("Cached fraud model load failed, retraining", extra={"error": str(e)})
    return train_fraud_model()


_fraud_model, _fraud_scaler = load_or_train_fraud_model()

FRAUD_THRESHOLD = settings.FRAUD_THRESHOLD


def compute_fraud_score(
    claims_last_7d: int,
    zone_match_score: float,
    hours_since_disruption: float,
    account_age_days: int,
    claim_latency_seconds: float,
    policy_age_days: int,
    weather_history_consistency: float,
    is_gps_spoofed: bool = False,
    device_outside_claim_zone: bool = False,
    km_from_zone_center: float = 0.0,
) -> dict:
    """
    Returns full fraud analysis dict.
    {
      "fraud_score": 0.0-1.0,
      "fraud_tier": "TRUSTED" | "REVIEW" | "BLOCKED",
      "anomaly_score": raw Isolation Forest decision score,
      "signals": { readable signal breakdown },
      "explanation": human-readable summary string
    }
    """
    wh  = max(0.0, min(1.0, float(weather_history_consistency)))
    km  = max(0.0, float(km_from_zone_center))

    features = np.array([[
        claims_last_7d,
        zone_match_score,
        hours_since_disruption,
        account_age_days,
        claim_latency_seconds,
        policy_age_days,
        wh,
        km,
    ]])

    features_scaled = _fraud_scaler.transform(features)
    anomaly_score   = float(_fraud_model.decision_function(features_scaled)[0])

    # ── Build readable signals ──────────────────────────────────────────────
    signals = {
        "claims_frequency": "HIGH_VELOCITY" if claims_last_7d >= 4 else "NORMAL",
        "zone_match":       "MISMATCH"   if zone_match_score < 0.5   else "OK",
        "timing":           "TOO_FAST"   if hours_since_disruption < 1 else "NORMAL",
        "account_age":      "NEW_ACCOUNT"   if account_age_days < 7    else "ESTABLISHED",
        "claim_latency":    "INSTANT"    if claim_latency_seconds < 30   else "NORMAL",
        "policy_age":       "NEW_POLICY" if policy_age_days < 2      else "ESTABLISHED",
        "weather_history":  (
            "SEVERE_ANOMALY" if wh < 0.25 else
            "ANOMALY"        if wh < 0.35 else
            "WEAK"           if wh < 0.55 else "CONSISTENT"
        ),
        "weather_history_score": round(wh, 4),
        "gps_km_from_zone":     round(km, 2),
        "gps_proximity":        (
            "CRITICAL_OUTSIDE_ZONE" if km > 20 else
            "OUTSIDE_COVERAGE_AREA" if km > COVERAGE_RADIUS_KM else
            "WITHIN_ZONE"
        ),
        "raw_anomaly_score": round(anomaly_score, 4),
    }

    # ── Hard GPS rules ──────────────────────────────────────────────────────
    if is_gps_spoofed:
        signals["gps_integrity"] = "SPOOFED_SIMULATOR_DETECTED"
        fraud_logger.warning(
            "FRAUD BLOCKED: GPS spoof detected",
            extra={"claims_7d": claims_last_7d, "account_age": account_age_days}
        )
        return {
            "fraud_score": 1.0,
            "fraud_tier": "BLOCKED",
            "anomaly_score": -1.0,
            "signals": signals,
            "explanation": "Claim BLOCKED: device reported as GPS simulator/rooted.",
        }

    if device_outside_claim_zone:
        signals["gps_integrity"] = "DEVICE_OUTSIDE_INSURED_ZONE"
        fraud_logger.warning(
            "FRAUD BLOCKED: device outside insured zone",
            extra={"km": km, "threshold": COVERAGE_RADIUS_KM}
        )
        return {
            "fraud_score": 1.0,
            "fraud_tier": "BLOCKED",
            "anomaly_score": -1.0,
            "signals": signals,
            "explanation": f"Claim BLOCKED: device is {km:.1f} km from zone center (limit {COVERAGE_RADIUS_KM} km).",
        }

    # ── Score computation ───────────────────────────────────────────────────
    fraud_score = max(0.0, min(1.0, (-anomaly_score + 0.3) / 0.6))

    # Weather history rule overlay
    if wh < 0.25:
        fraud_score = min(1.0, fraud_score + 0.30)
    elif wh < 0.35:
        fraud_score = min(1.0, fraud_score + 0.16)

    # GPS distance rule overlay (soft penalty)
    if km > COVERAGE_RADIUS_KM:
        gps_penalty = min(0.25, (km - COVERAGE_RADIUS_KM) / 40.0)
        fraud_score = min(1.0, fraud_score + gps_penalty)
        signals["gps_integrity"] = "SOFT_OUTSIDE_ZONE"
    else:
        signals["gps_integrity"] = "OK"

    # Determine tier
    if fraud_score < 0.40:
        fraud_tier = "TRUSTED"
    elif fraud_score < 0.70:
        fraud_tier = "REVIEW"
    else:
        fraud_tier = "BLOCKED"

    # Human-readable explanation
    risk_factors = []
    if signals["claims_frequency"] != "NORMAL": risk_factors.append("high claim velocity")
    if signals["zone_match"] != "OK":           risk_factors.append("zone mismatch")
    if signals["timing"] != "NORMAL":           risk_factors.append("suspiciously fast filing")
    if signals["weather_history"] in ("ANOMALY", "SEVERE_ANOMALY"): risk_factors.append("weather inconsistency")
    if km > COVERAGE_RADIUS_KM:                 risk_factors.append(f"device {km:.1f}km from zone")

    if fraud_tier == "TRUSTED":
        explanation = "All signals nominal. Claim auto-approved."
    elif fraud_tier == "REVIEW":
        explanation = f"Flagged for review due to: {', '.join(risk_factors) or 'borderline anomaly score'}."
    else:
        explanation = f"Claim BLOCKED. High-risk indicators: {', '.join(risk_factors)}."

    fraud_logger.info(
        "Fraud score computed",
        extra={
            "tier": fraud_tier,
            "score": round(fraud_score, 3),
            "km_from_zone": km,
            "weather_wh": round(wh, 3),
        }
    )

    return {
        "fraud_score":    round(fraud_score, 4),
        "fraud_tier":     fraud_tier,
        "anomaly_score":  round(anomaly_score, 4),
        "signals":        signals,
        "explanation":    explanation,
    }


def classify_claim_status(fraud_tier: str) -> str:
    """Map fraud tier → claim status string."""
    return {
        "TRUSTED": "AUTO_APPROVED",
        "REVIEW":  "FLAGGED_FOR_REVIEW",
        "BLOCKED": "REJECTED",
    }.get(fraud_tier, "FLAGGED_FOR_REVIEW")
