from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class Payout(Base):
    __tablename__ = "payouts"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False, index=True)
    claim_id = Column(Integer, ForeignKey("claims.id"), nullable=True, unique=True)
    policy_id = Column(Integer, ForeignKey("policies.id"), nullable=False)

    # Payment details
    amount = Column(Float, nullable=False)  # INR
    payout_type = Column(String(30), default="CLAIM")  # CLAIM, ADVANCE, REFUND
    payment_method = Column(String(30), default="UPI")  # UPI, BANK, WALLET

    # Instant settlement rails (mock Razorpay test + Stripe test pattern)
    payment_rail = Column(String(30), default="UPI")  # UPI | STRIPE
    razorpay_payout_id = Column(String(100), nullable=True)
    stripe_payment_intent_id = Column(String(100), nullable=True)
    upi_transaction_id = Column(String(100), nullable=True)
    upi_id = Column(String(100), nullable=True)  # Worker's UPI ID

    # Status
    status = Column(String(30), default="INITIATED")  # INITIATED, PROCESSING, COMPLETED, FAILED
    failure_reason = Column(Text, nullable=True)

    # Timing
    initiated_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    worker = relationship("Worker", back_populates="payouts")
    claim = relationship("Claim", back_populates="payout")

    def __repr__(self):
        return f"<Payout id={self.id} amount={self.amount} status='{self.status}'>"
