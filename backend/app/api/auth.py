from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, get_current_worker
from app.models.worker import Worker
from app.schemas.auth import WorkerRegisterRequest, WorkerLoginRequest, TokenResponse, KYCUpdateRequest, WorkerProfileResponse
from app.services.premium_ai import calculate_premium, get_zone_risk_score

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register_worker(data: WorkerRegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check unique phone
    result = await db.execute(select(Worker).where(Worker.phone == data.phone))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Phone number already registered")

    # Compute AI risk score
    premium_data = calculate_premium(data.zones, data.weekly_hours, data.platform)
    zone_risk = premium_data["zone_risk_score"]
    risk_tier = premium_data["risk_tier"]

    worker = Worker(
        phone=data.phone,
        name=data.name,
        email=data.email,
        hashed_password=get_password_hash(data.password),
        platform=data.platform,
        partner_id=data.partner_id,
        city=data.city,
        zones=data.zones,
        weekly_hours=data.weekly_hours,
        zone_risk_score=zone_risk,
        risk_tier=risk_tier,
        kyc_status="PENDING",
        onboarding_complete=False,
    )
    db.add(worker)
    await db.commit()
    await db.refresh(worker)

    token = create_access_token({"sub": str(worker.id), "role": worker.role})
    return TokenResponse(
        access_token=token,
        worker_id=worker.id,
        name=worker.name,
        role=worker.role,
        onboarding_complete=worker.onboarding_complete,
    )


@router.post("/login", response_model=TokenResponse)
async def login_worker(data: WorkerLoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Worker).where(Worker.phone == data.phone))
    worker = result.scalar_one_or_none()
    if not worker or not verify_password(data.password, worker.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid phone or password")
    if not worker.is_active:
        raise HTTPException(status_code=403, detail="Account suspended")

    token = create_access_token({"sub": str(worker.id), "role": worker.role})
    return TokenResponse(
        access_token=token,
        worker_id=worker.id,
        name=worker.name,
        role=worker.role,
        onboarding_complete=worker.onboarding_complete,
    )


@router.get("/me", response_model=WorkerProfileResponse)
async def get_my_profile(worker: Worker = Depends(get_current_worker)):
    return worker


@router.put("/kyc", response_model=WorkerProfileResponse)
async def update_kyc(
    data: KYCUpdateRequest,
    db: AsyncSession = Depends(get_db),
    worker: Worker = Depends(get_current_worker),
):
    worker.aadhaar_last4 = data.aadhaar_last4
    worker.kyc_status = "VERIFIED"
    worker.onboarding_complete = True
    await db.commit()
    await db.refresh(worker)
    return worker


@router.put("/profile")
async def update_profile(
    zones: list = None,
    weekly_hours: float = None,
    db: AsyncSession = Depends(get_db),
    worker: Worker = Depends(get_current_worker),
):
    if zones:
        worker.zones = zones
    if weekly_hours:
        worker.weekly_hours = weekly_hours
        # Recompute risk score
        premium_data = calculate_premium(worker.zones, worker.weekly_hours, worker.platform)
        worker.zone_risk_score = premium_data["zone_risk_score"]
        worker.risk_tier = premium_data["risk_tier"]
    await db.commit()
    return {"message": "Profile updated", "zone_risk_score": worker.zone_risk_score}
