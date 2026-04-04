"""
GigShield — Mock payout service simulating Razorpay/Stripe Test Mode.
Generates realistic UPI transaction IDs and processes payouts with logging.
"""
import random
import string
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.payout import Payout
from app.models.claim import Claim
from app.models.policy import Policy
from app.core.logger import payout_logger
import asyncio


def _generate_razorpay_payout_id() -> str:
    chars = string.ascii_letters + string.digits
    return "pout_" + "".join(random.choices(chars, k=14))


def _generate_upi_txn_id() -> str:
    return "UPI" + "".join(random.choices(string.digits, k=12))


def _generate_stripe_pi() -> str:
    return "pi_test_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=24))


async def initiate_payout(
    db: AsyncSession,
    worker_id: int,
    claim_id: int,
    policy_id: int,
    amount: float,
    upi_id: str = None,
    payout_type: str = "CLAIM",
) -> Payout:
    """
    Simulate initiating a Razorpay/Stripe payout.
    Creates payout record, processes (mock), marks COMPLETED.
    75% UPI (Razorpay) + 25% Stripe instant card path.
    """
    if upi_id is None:
        upi_id = f"worker{worker_id}@upi"

    use_stripe = random.random() < 0.25
    payment_rail = "STRIPE" if use_stripe else "UPI"
    stripe_pi    = _generate_stripe_pi()        if use_stripe else None
    razorpay_id  = None                         if use_stripe else _generate_razorpay_payout_id()
    upi_txn      = None                         if use_stripe else _generate_upi_txn_id()

    payout_logger.info(
        "Payout initiated",
        extra={
            "worker_id": worker_id,
            "claim_id": claim_id,
            "amount": amount,
            "rail": payment_rail,
            "type": payout_type,
        }
    )

    payout = Payout(
        worker_id=worker_id,
        claim_id=claim_id,
        policy_id=policy_id,
        amount=amount,
        payout_type=payout_type,
        payment_method="UPI" if not use_stripe else "CARD",
        payment_rail=payment_rail,
        razorpay_payout_id=razorpay_id,
        stripe_payment_intent_id=stripe_pi,
        upi_transaction_id=upi_txn,
        upi_id=upi_id if not use_stripe else None,
        status="INITIATED",
        initiated_at=datetime.utcnow(),
    )
    db.add(payout)
    await db.commit()
    await db.refresh(payout)

    # Simulate Razorpay/Stripe processing delay (mock)
    await asyncio.sleep(0.3)

    payout.status = "COMPLETED"
    payout.completed_at = datetime.utcnow()
    await db.commit()
    await db.refresh(payout)

    payout_logger.info(
        "Payout completed",
        extra={
            "payout_id": payout.id,
            "worker_id": worker_id,
            "amount": amount,
            "rail": payment_rail,
            "txn_ref": razorpay_id or stripe_pi or upi_txn,
        }
    )

    return payout


async def get_worker_payouts(db: AsyncSession, worker_id: int) -> list:
    result = await db.execute(
        select(Payout)
        .where(Payout.worker_id == worker_id)
        .order_by(Payout.initiated_at.desc())
    )
    return result.scalars().all()


async def get_total_payout_this_week(db: AsyncSession, worker_id: int) -> float:
    from sqlalchemy import func
    from datetime import timedelta
    week_ago = datetime.utcnow() - timedelta(days=7)
    result = await db.execute(
        select(func.sum(Payout.amount))
        .where(Payout.worker_id == worker_id)
        .where(Payout.status == "COMPLETED")
        .where(Payout.initiated_at >= week_ago)
    )
    total = result.scalar()
    return float(total or 0.0)
