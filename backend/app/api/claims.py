from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_worker
from app.models.worker import Worker
from app.models.claim import Claim
from app.models.payout import Payout
from app.schemas.claim import ClaimListResponse, ClaimResponse, AppealRequest, AppealResponse, PayoutResponse

router = APIRouter(prefix="/api/v1/claims", tags=["Claims"])


@router.get("/", response_model=ClaimListResponse)
async def get_my_claims(
    worker: Worker = Depends(get_current_worker),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Claim)
        .where(Claim.worker_id == worker.id)
        .order_by(Claim.created_at.desc())
    )
    claims = result.scalars().all()

    total_payout = sum(
        c.payout_amount for c in claims if c.status in ["AUTO_APPROVED", "PAID"]
    )
    return ClaimListResponse(
        claims=[ClaimResponse.model_validate(c) for c in claims],
        total=len(claims),
        total_payout_received=total_payout,
    )


@router.get("/{claim_id}", response_model=ClaimResponse)
async def get_claim_detail(
    claim_id: int,
    worker: Worker = Depends(get_current_worker),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Claim).where(Claim.id == claim_id, Claim.worker_id == worker.id)
    )
    claim = result.scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    return claim


@router.post("/{claim_id}/appeal", response_model=AppealResponse)
async def submit_appeal(
    claim_id: int,
    data: AppealRequest,
    worker: Worker = Depends(get_current_worker),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Claim).where(Claim.id == claim_id, Claim.worker_id == worker.id)
    )
    claim = result.scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    if claim.status not in ["REJECTED", "FLAGGED_FOR_REVIEW"]:
        raise HTTPException(status_code=400, detail="Only rejected or flagged claims can be appealed")
    if claim.appeal_submitted:
        raise HTTPException(status_code=400, detail="Appeal already submitted")

    claim.appeal_submitted = True
    claim.appeal_note = data.appeal_note
    claim.appeal_submitted_at = datetime.utcnow()
    claim.status = "APPEAL_PENDING"
    await db.commit()

    return AppealResponse(
        message="Appeal submitted. Our team will review within 2 hours.",
        claim_id=claim_id,
        status="APPEAL_PENDING",
    )


@router.get("/payouts/history")
async def get_payout_history(
    worker: Worker = Depends(get_current_worker),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Payout)
        .where(Payout.worker_id == worker.id)
        .order_by(Payout.initiated_at.desc())
    )
    payouts = result.scalars().all()
    total = sum(p.amount for p in payouts if p.status == "COMPLETED")
    return {
        "payouts": [PayoutResponse.model_validate(p) for p in payouts],
        "total": len(payouts),
        "total_received": total,
    }
