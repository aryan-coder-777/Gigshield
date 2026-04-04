from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class Claim(Base):
    __tablename__ = "claims"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False, index=True)
    policy_id = Column(Integer, ForeignKey("policies.id"), nullable=False, index=True)
    trigger_event_id = Column(Integer, ForeignKey("trigger_events.id"), nullable=True)

    # Claim details
    claim_type = Column(String(50), nullable=False)  # RAIN, HEAT, AQI, HUB_SHUTDOWN, CURFEW, TRAFFIC
    disruption_description = Column(Text, nullable=True)
    zone = Column(String(100), nullable=False)
    payout_amount = Column(Float, nullable=False)  # INR to be paid

    # Income loss estimation
    estimated_daily_loss = Column(Float, default=0.0)
    coverage_hours = Column(Float, default=8.0)

    # Status
    status = Column(String(30), default="PROCESSING")
    # PROCESSING, AUTO_APPROVED, FLAGGED_FOR_REVIEW, REJECTED, APPEAL_PENDING, PAID

    # Fraud detection
    fraud_score = Column(Float, default=0.0)  # 0.0=clean, 1.0=fraudulent
    fraud_signals = Column(JSON, nullable=True)  # dict of signal breakdown
    fraud_tier = Column(String(20), default="TRUSTED")  # TRUSTED, REVIEW, BLOCKED

    # Advance payout (for REVIEW tier)
    advance_paid = Column(Float, default=0.0)

    # Admin review
    reviewed_by = Column(Integer, nullable=True)
    review_note = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    # Appeal
    appeal_submitted = Column(Boolean, default=False)
    appeal_note = Column(Text, nullable=True)
    appeal_submitted_at = Column(DateTime, nullable=True)

    # Timestamps
    trigger_timestamp = Column(DateTime, nullable=True)  # When disruption was detected
    claim_latency_seconds = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    worker = relationship("Worker", back_populates="claims")
    policy = relationship("Policy", back_populates="claims")
    trigger_event = relationship("TriggerEvent", back_populates="claims")
    payout = relationship("Payout", back_populates="claim", uselist=False)

    def __repr__(self):
        return f"<Claim id={self.id} type='{self.claim_type}' status='{self.status}'>"
