"""
GigShield — AI-Powered Premium Calculation
============================================
Uses GradientBoostingRegressor trained on synthetic Indian gig-worker data.
Produces personalised weekly premiums based on zone risk, hours, platform,
seasonal index, congestion risk, and historical payout rate.

Upgrade from LinearRegression (v1) → GradientBoostingRegressor (v2):
- Better captures non-linear zone-risk ↔ premium relationships
- More robust to outliers in weekly_hours
- Ensemble of 200 trees prevents overfitting
"""
import numpy as np
import joblib
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from pathlib import Path
from app.core.logger import premium_logger

MODELS_DIR = Path(__file__).parent.parent.parent / "models_pkl"
MODELS_DIR.mkdir(exist_ok=True)

MODEL_PATH  = MODELS_DIR / "premium_model_v2.pkl"
SCALER_PATH = MODELS_DIR / "premium_scaler_v2.pkl"

# ── Zone Risk Database ──────────────────────────────────────────────────────
# Disruption index 0-100 based on historical flood/rain/AQI events
ZONE_RISK_DB = {
    # Chennai
    "Tambaram": 72, "Anna Nagar": 45, "T. Nagar": 55, "Velachery": 68,
    "Perambur": 50, "Porur": 62, "Sholinganallur": 58, "Chromepet": 70,
    "Adyar": 48, "Mylapore": 42, "Guindy": 60, "Kodambakkam": 52,
    # Mumbai
    "Andheri": 75, "Bandra": 60, "Dharavi": 80, "Kurla": 73,
    "Thane": 65, "Borivali": 55, "Dadar": 68, "Chembur": 70,
    "Malad": 62, "Kandivali": 58,
    # Bengaluru
    "Koramangala": 40, "Whitefield": 35, "Electronic City": 38,
    "Indira Nagar": 45, "HSR Layout": 42, "Marathahalli": 50,
    "Bellandur": 55, "Hebbal": 48,
    # Delhi / NCR
    "Connaught Place": 55, "Lajpat Nagar": 60, "Dwarka": 65,
    "Rohini": 58, "Saket": 50, "Noida Sector 18": 52, "Gurgaon": 55,
    # Hyderabad
    "Hitech City": 38, "Gachibowli": 42, "Secunderabad": 55,
    "Begumpet": 50, "Madhapur": 40,
    # Pune
    "Kothrud": 45, "Viman Nagar": 42, "Hinjewadi": 40, "Wakad": 48,
    # Ahmedabad
    "Navrangpura": 50, "Maninagar": 58, "Bapunagar": 65,
    # Surat
    "Adajan": 55, "Katargam": 62, "Udhna": 68,
    # Chennai generic zones
    "Zone A": 40, "Zone B": 60, "Zone C": 75,
    "Default": 55,
}

# ── Platform Risk Weights ───────────────────────────────────────────────────
# Higher weight = higher-risk platform (more time on roads, higher disruption exposure)
PLATFORM_WEIGHTS = {
    "Amazon": 1.0, "Flipkart": 0.95, "Zepto": 0.85,
    "Blinkit": 0.90, "Swiggy": 0.80, "Zomato": 0.75,
    "Dunzo": 0.85, "Rapido": 0.90, "Porter": 0.88,
    "Meesho": 0.70, "Other": 0.90,
}

# Platform historical payout rate (simulated — % of workers who filed claims)
PLATFORM_PAYOUT_RATE = {
    "Amazon": 0.18, "Flipkart": 0.16, "Zepto": 0.22, "Blinkit": 0.20,
    "Swiggy": 0.25, "Zomato": 0.24, "Dunzo": 0.21, "Rapido": 0.19,
    "Porter": 0.17, "Meesho": 0.12, "Other": 0.18,
}

# Zone congestion index (traffic-driven extra risk 0-1)
ZONE_CONGESTION = {
    "Tambaram": 0.72, "Anna Nagar": 0.50, "T. Nagar": 0.80,
    "Velachery": 0.68, "Sholinganallur": 0.75, "Chromepet": 0.65,
    "Andheri": 0.85, "Dharavi": 0.78, "Thane": 0.72,
    "Koramangala": 0.65, "Whitefield": 0.60, "Electronic City": 0.55,
    "Hitech City": 0.58, "Gachibowli": 0.52,
    "Default": 0.60,
}

# ── Seasonal Index (Tamil Nadu / Pan-India monsoon calendar) ────────────────
# June–October = peak monsoon; March–May = heatwave season
SEASONAL_INDEX = {
    1: 0.55, 2: 0.50, 3: 0.65, 4: 0.75, 5: 0.85,
    6: 1.0,  7: 1.0,  8: 0.98, 9: 0.92, 10: 0.85,
    11: 0.65, 12: 0.55,
}


def get_zone_risk_score(zones: list) -> float:
    scores = [ZONE_RISK_DB.get(z, ZONE_RISK_DB["Default"]) for z in zones]
    return float(np.mean(scores)) if scores else 55.0


def get_zone_congestion(zones: list) -> float:
    scores = [ZONE_CONGESTION.get(z, ZONE_CONGESTION["Default"]) for z in zones]
    return float(np.mean(scores)) if scores else 0.60


def compute_features(
    zone_risk_score: float,
    weekly_hours: float,
    seasonal_idx: float,
    platform_weight: float,
    payout_rate: float,
    congestion: float,
) -> np.ndarray:
    """Build feature vector (6 features) for the premium model."""
    return np.array([[
        zone_risk_score,
        weekly_hours,
        seasonal_idx,
        platform_weight,
        payout_rate,
        congestion,
    ]])


def train_premium_model() -> tuple:
    """
    Generate synthetic training data and train GradientBoostingRegressor.
    6 features: zone_risk, weekly_hours, seasonal_idx, platform_weight,
                payout_rate, congestion_index
    """
    premium_logger.info("Training GradientBoostingRegressor premium model...")
    np.random.seed(42)
    n = 8000

    zone_risks      = np.random.uniform(20, 95, n)
    weekly_hours    = np.random.uniform(20, 84, n)
    seasonal        = np.random.uniform(0.4, 1.0, n)
    platform_w      = np.random.uniform(0.7, 1.1, n)
    payout_rate     = np.random.uniform(0.10, 0.30, n)
    congestion      = np.random.uniform(0.30, 0.95, n)

    # Actuarially-inspired premium formula
    premium = (
        0.32 * zone_risks
        + 0.07 * weekly_hours
        + 11.0 * seasonal
        + 4.5  * platform_w
        + 18.0 * payout_rate
        + 6.0  * congestion
        + np.random.normal(0, 1.5, n)
    )
    premium = np.clip(premium, 15, 82)

    X = np.column_stack([zone_risks, weekly_hours, seasonal, platform_w, payout_rate, congestion])
    X_train, X_test, y_train, y_test = train_test_split(X, premium, test_size=0.15, random_state=42)

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s  = scaler.transform(X_test)

    model = GradientBoostingRegressor(
        n_estimators=200,
        learning_rate=0.08,
        max_depth=4,
        min_samples_leaf=10,
        subsample=0.85,
        random_state=42,
    )
    model.fit(X_train_s, y_train)

    test_score = model.score(X_test_s, y_test)
    premium_logger.info(
        "GradientBoostingRegressor trained",
        extra={"r2_score": round(test_score, 4), "n_samples": n}
    )

    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    return model, scaler


def load_or_train_model():
    from app.core.config import settings
    if not settings.FORCE_RETRAIN_MODELS and MODEL_PATH.exists() and SCALER_PATH.exists():
        try:
            model  = joblib.load(MODEL_PATH)
            scaler = joblib.load(SCALER_PATH)
            # Verify feature count matches
            n_in = getattr(scaler, "n_features_in_", 6)
            if n_in == 6:
                premium_logger.info("Loaded cached premium model (GradientBoosting v2)")
                return model, scaler
        except Exception as e:
            premium_logger.warning(f"Cached model load failed, retraining", extra={"error": str(e)})
    return train_premium_model()


# Load at import time
_model, _scaler = load_or_train_model()


def calculate_premium(zones: list, weekly_hours: float, platform: str,
                       month: int = None) -> dict:
    """
    Calculate AI-powered personalised weekly premium.
    Returns full dict with plans, recommendation, risk explanation.
    """
    import datetime
    if month is None:
        month = datetime.datetime.utcnow().month

    zone_risk       = get_zone_risk_score(zones)
    seasonal_idx    = SEASONAL_INDEX.get(month, 0.7)
    platform_weight = PLATFORM_WEIGHTS.get(platform, 0.9)
    payout_rate     = PLATFORM_PAYOUT_RATE.get(platform, 0.18)
    congestion      = get_zone_congestion(zones)

    features        = compute_features(zone_risk, weekly_hours, seasonal_idx,
                                       platform_weight, payout_rate, congestion)
    features_scaled = _scaler.transform(features)
    raw_premium     = float(_model.predict(features_scaled)[0])

    # Tier determination
    if zone_risk <= 42:
        risk_tier    = "Basic"
        base_premium = max(18.0, min(25.0, raw_premium * 0.60))
        max_payout   = 300.0
    elif zone_risk <= 68:
        risk_tier    = "Standard"
        base_premium = max(35.0, min(48.0, raw_premium * 0.82))
        max_payout   = 700.0
    else:
        risk_tier    = "Premium"
        base_premium = max(65.0, min(78.0, raw_premium))
        max_payout   = 1200.0

    ai_premium = round(base_premium)

    plans = [
        {
            "plan_type": "Basic",
            "weekly_premium": 20.0,
            "max_weekly_payout": 300.0,
            "recommended": risk_tier == "Basic",
            "features": [
                "3 disruption types covered",
                "Low-risk zones (score < 42)",
                "Max payout ₹300/week",
                "Standard claim processing",
                "Instant UPI credit on approval",
            ],
        },
        {
            "plan_type": "Standard",
            "weekly_premium": 40.0,
            "max_weekly_payout": 700.0,
            "recommended": risk_tier == "Standard",
            "features": [
                "5 disruption types covered",
                "Medium-risk zones (42–68)",
                "Max payout ₹700/week",
                "Priority claim processing",
                "₹100 advance on REVIEW claims",
                "Instant UPI + Stripe rails",
            ],
        },
        {
            "plan_type": "Premium",
            "weekly_premium": 70.0,
            "max_weekly_payout": 1200.0,
            "recommended": risk_tier == "Premium",
            "features": [
                "All 7 disruption types covered",
                "High-risk zones (score > 68)",
                "Max payout ₹1,200/week",
                "Instant auto-approval pipeline",
                "₹100 advance on REVIEW claims",
                "Priority appeal (2-hour SLA)",
                "Dual-rail: UPI + Stripe backup",
            ],
        },
    ]

    seasonal_label = "monsoon risk elevated" if seasonal_idx >= 0.9 else (
        "heatwave season active" if seasonal_idx >= 0.75 else "moderate conditions"
    )

    risk_explanation = (
        f"Your zone(s) {', '.join(zones)} carry a disruption score of {zone_risk:.0f}/100. "
        f"Congestion index: {congestion:.2f}. Platform payout rate: {payout_rate*100:.0f}%. "
        f"Seasonal factor: {seasonal_label}. "
        f"AI recommends the {risk_tier} plan at ₹{ai_premium}/week."
    )

    premium_logger.info(
        "Premium calculated",
        extra={
            "zones": ",".join(zones), "platform": platform,
            "zone_risk": zone_risk, "ai_premium": ai_premium,
            "risk_tier": risk_tier,
        }
    )

    return {
        "plans": plans,
        "ai_recommendation": risk_tier,
        "zone_risk_score": round(zone_risk, 1),
        "risk_tier": risk_tier,
        "ai_premium": ai_premium,
        "risk_explanation": risk_explanation,
        "seasonal_index": seasonal_idx,
        "congestion_index": round(congestion, 2),
        "platform_payout_rate": payout_rate,
    }
