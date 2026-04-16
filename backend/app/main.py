from contextlib import asynccontextmanager
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from apscheduler.schedulers.background import BackgroundScheduler
from app.core.config import settings
from app.core.database import create_tables
from app.core.logger import startup_logger, get_logger
from app.api import auth, policies, claims, admin, worker_insights, chat
from app.api import triggers_v2 as triggers
from app.services.trigger_monitor import run_monitor_sync

scheduler = BackgroundScheduler()
http_logger = get_logger("app.http")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ─────────────────────────────────────────────────────────────
    startup_logger.info("GigShield API starting up...")
    await create_tables()
    await seed_demo_data()

    scheduler.add_job(
        run_monitor_sync,
        "interval",
        seconds=settings.TRIGGER_POLL_INTERVAL,
        id="trigger_monitor",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.start()

    startup_logger.info(
        "GigShield API ready",
        extra={
            "db": "PostgreSQL" if settings.is_postgres else "SQLite",
            "trigger_poll_secs": settings.TRIGGER_POLL_INTERVAL,
            "fraud_threshold": settings.FRAUD_THRESHOLD,
            "docs": "http://localhost:8001/docs",
        }
    )
    startup_logger.info("Demo credentials: Worker=9876543210/ravi1234  Admin=0000000000/admin123")
    yield

    # ── Shutdown ─────────────────────────────────────────────────────────────
    scheduler.shutdown()
    startup_logger.info("GigShield API shut down cleanly")


app = FastAPI(
    title="GigShield API",
    description="AI-Powered Parametric Income Insurance for India's Gig Economy",
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS if "*" not in settings.ALLOWED_ORIGINS else [],
    allow_origin_regex=".*" if "*" in settings.ALLOWED_ORIGINS else None,
    allow_credentials="*" not in settings.ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request logging middleware ────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    try:
        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
        level = "WARNING" if response.status_code >= 400 else "INFO"
        log_fn = http_logger.warning if response.status_code >= 400 else http_logger.info
        log_fn(
            f"{request.method} {request.url.path}",
            extra={
                "status": response.status_code,
                "ms": elapsed_ms,
            }
        )
        return response
    except Exception as exc:
        elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
        http_logger.error(
            f"{request.method} {request.url.path} EXCEPTION",
            extra={"error": str(exc), "ms": elapsed_ms}
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error. Check backend logs."}
        )


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(policies.router)
app.include_router(claims.router)
app.include_router(triggers.router)
app.include_router(admin.router)
app.include_router(worker_insights.router)
app.include_router(chat.router, prefix="/api/chat")


@app.get("/")
async def root():
    return {
        "app": "GigShield",
        "version": "2.0.0",
        "status": "running",
        "db": "PostgreSQL" if settings.is_postgres else "SQLite",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "db": "PostgreSQL" if settings.is_postgres else "SQLite",
        "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
    }


async def seed_demo_data():
    """Seed demo admin + sample worker on first startup."""
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.core.security import get_password_hash
    from app.models.worker import Worker
    from app.models.policy import Policy
    from app.models.trigger_event import TriggerEvent
    from datetime import datetime, timedelta
    import json

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Worker).where(Worker.phone == "0000000000"))
        if result.scalar_one_or_none():
            startup_logger.info("Demo data already seeded — skipping")
            return

        startup_logger.info("Seeding demo data...")

        admin_user = Worker(
            phone="0000000000",
            name="GigShield Admin",
            email="admin@gigshield.in",
            hashed_password=get_password_hash("admin123"),
            platform="GigShield",
            city="Chennai",
            zones=["All Zones"],
            weekly_hours=40,
            zone_risk_score=0,
            risk_tier="Basic",
            kyc_status="VERIFIED",
            onboarding_complete=True,
            role="admin",
        )
        db.add(admin_user)

        ravi = Worker(
            phone="9876543210",
            name="Ravi Kumar",
            email="ravi@example.com",
            hashed_password=get_password_hash("ravi1234"),
            platform="Amazon",
            partner_id="AMZ-TBR-2847",
            city="Chennai",
            zones=["Tambaram", "Chromepet"],
            weekly_hours=60,
            zone_risk_score=71.0,
            risk_tier="Premium",
            kyc_status="VERIFIED",
            aadhaar_last4="4521",
            onboarding_complete=True,
            role="worker",
        )
        db.add(ravi)
        await db.flush()

        now = datetime.utcnow()
        policy = Policy(
            worker_id=ravi.id,
            plan_type="Premium",
            weekly_premium=70.0,
            max_weekly_payout=1200.0,
            start_date=now - timedelta(days=2),
            end_date=now + timedelta(days=5),
            renewal_date=now + timedelta(days=5),
            total_paid_premium=70.0,
            total_payout_received=300.0,
            remaining_weekly_payout=900.0,
            status="ACTIVE",
            auto_renew=True,
            zone_risk_score=71.0,
            covered_zones=json.dumps(["Tambaram", "Chromepet"]),
        )
        db.add(policy)
        await db.flush()

        past_trigger = TriggerEvent(
            trigger_type="RAIN",
            trigger_source="MOCK_API",
            zone="Tambaram",
            city="Chennai",
            measured_value=18.5,
            threshold_value=10.0,
            unit="mm/hr",
            description="Heavy rainfall 18.5 mm/hr exceeded threshold in Tambaram",
            severity="HIGH",
            is_active=False,
            claims_generated=1,
            total_payout_triggered=300.0,
            detected_at=now - timedelta(days=1),
            expires_at=now - timedelta(hours=18),
        )
        db.add(past_trigger)
        await db.flush()

        from app.models.claim import Claim
        from app.models.payout import Payout

        past_claim = Claim(
            worker_id=ravi.id,
            policy_id=policy.id,
            trigger_event_id=past_trigger.id,
            claim_type="RAIN",
            disruption_description="Heavy rainfall 18.5 mm/hr exceeded threshold in Tambaram",
            zone="Tambaram",
            payout_amount=300.0,
            estimated_daily_loss=480.0,
            coverage_hours=8.0,
            status="PAID",
            fraud_score=0.12,
            fraud_tier="TRUSTED",
            fraud_signals={
                "claims_frequency": "NORMAL",
                "zone_match": "OK",
                "timing": "NORMAL",
                "account_age": "ESTABLISHED",
                "claim_latency": "NORMAL",
                "policy_age": "ESTABLISHED",
                "weather_history": "CONSISTENT",
                "weather_history_score": 0.72,
                "gps_km_from_zone": 0.0,
                "gps_proximity": "WITHIN_ZONE",
                "gps_integrity": "OK",
                "raw_anomaly_score": 0.18,
            },
            trigger_timestamp=now - timedelta(days=1),
            claim_latency_seconds=67.0,
            created_at=now - timedelta(days=1),
        )
        db.add(past_claim)
        await db.flush()

        past_payout = Payout(
            worker_id=ravi.id,
            claim_id=past_claim.id,
            policy_id=policy.id,
            amount=300.0,
            payout_type="CLAIM",
            payment_method="UPI",
            payment_rail="UPI",
            razorpay_payout_id="pout_DemoRain300xyz",
            stripe_payment_intent_id=None,
            upi_transaction_id="UPI938271048362",
            upi_id="ravi@okicici",
            status="COMPLETED",
            initiated_at=now - timedelta(days=1),
            completed_at=now - timedelta(days=1, minutes=-2),
        )
        db.add(past_payout)

        await db.commit()
        startup_logger.info(
            "Demo data seeded",
            extra={"worker": "9876543210/ravi1234", "admin": "0000000000/admin123"}
        )
