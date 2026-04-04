from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings


BASE_DIR = Path(__file__).resolve().parents[2]
DEFAULT_DATABASE_URL = f"sqlite+aiosqlite:///{(BASE_DIR / 'gigshield.db').as_posix()}"


class Settings(BaseSettings):
    APP_NAME: str = "GigShield"
    DEBUG: bool = True
    SECRET_KEY: str = "gigshield-super-secret-jwt-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # ── DATABASE ──────────────────────────────────────────────────────────────
    # Default: SQLite (zero-config, stored in backend/ dir)
    # For PostgreSQL: DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/gigshield
    DATABASE_URL: str = DEFAULT_DATABASE_URL

    # ── EXTERNAL APIs ─────────────────────────────────────────────────────────
    # OpenWeatherMap — live weather data (leave blank = mock data)
    OWM_API_KEY: str = ""
    # WAQI World Air Quality Index — live AQI data (leave blank = mock)
    WAQI_TOKEN: str = ""

    # ── PAYMENT RAILS ─────────────────────────────────────────────────────────
    # Razorpay test keys (leave blank = mock payouts simulated locally)
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    # Stripe test secret (leave blank = mock Stripe payment intent IDs)
    STRIPE_SECRET_KEY: str = ""

    # ── AI MODEL THRESHOLDS ───────────────────────────────────────────────────
    # Isolation Forest anomaly threshold: -0.10 = strict, -0.30 = lenient
    FRAUD_THRESHOLD: float = -0.15
    # Force retrain ML models on startup (useful after feature changes)
    FORCE_RETRAIN_MODELS: bool = False

    # ── SCHEDULER ─────────────────────────────────────────────────────────────
    # How often to poll all active zones for trigger events (seconds)
    TRIGGER_POLL_INTERVAL: int = 900  # 15 minutes

    # ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:19006",
        "http://127.0.0.1:19006",
        "http://10.0.2.2:8001",
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def is_postgres(self) -> bool:
        return "postgresql" in self.DATABASE_URL or "postgres" in self.DATABASE_URL

    @property
    def is_sqlite(self) -> bool:
        return "sqlite" in self.DATABASE_URL


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
