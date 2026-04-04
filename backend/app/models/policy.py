from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from app.core.database import Base


class Policy(Base):
    __tablename__ = "policies"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False, index=True)

    # Plan details
    plan_type = Column(String(20), nullable=False)  # Basic, Standard, Premium
    weekly_premium = Column(Float, nullable=False)  # INR
    max_weekly_payout = Column(Float, nullable=False)  # INR

    # Coverage window
    start_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=False)  # start + 7 days
    renewal_date = Column(DateTime, nullable=True)

    # Financial tracking
    total_paid_premium = Column(Float, default=0.0)
    total_payout_received = Column(Float, default=0.0)
    remaining_weekly_payout = Column(Float, default=0.0)

    # Status
    status = Column(String(20), default="ACTIVE")  # ACTIVE, EXPIRED, CANCELLED, PAUSED
    auto_renew = Column(Boolean, default=True)

    # Risk snapshot at policy creation
    zone_risk_score = Column(Float, default=0.0)
    covered_zones = Column(Text, nullable=True)  # JSON string of zones

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    worker = relationship("Worker", back_populates="policies")
    claims = relationship("Claim", back_populates="policy", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Policy id={self.id} plan='{self.plan_type}' status='{self.status}'>"
