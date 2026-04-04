from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class Worker(Base):
    __tablename__ = "workers"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(15), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=True)
    hashed_password = Column(String(200), nullable=False)

    # Platform details
    platform = Column(String(50), default="Amazon")  # Amazon, Flipkart, Zepto, etc.
    partner_id = Column(String(50), nullable=True)  # Platform employee ID
    city = Column(String(50), default="Chennai")

    # Operating zones (stored as JSON array of zone names)
    zones = Column(JSON, default=["Tambaram"])
    weekly_hours = Column(Float, default=60.0)

    # KYC status
    kyc_status = Column(String(20), default="PENDING")  # PENDING, VERIFIED, REJECTED
    aadhaar_last4 = Column(String(4), nullable=True)

    # Risk profile
    zone_risk_score = Column(Float, default=0.0)  # 0-100
    risk_tier = Column(String(20), default="Standard")  # Basic, Standard, Premium

    # Account meta
    role = Column(String(20), default="worker")  # worker, admin
    is_active = Column(Boolean, default=True)
    onboarding_complete = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    policies = relationship("Policy", back_populates="worker", cascade="all, delete-orphan")
    claims = relationship("Claim", back_populates="worker", cascade="all, delete-orphan")
    payouts = relationship("Payout", back_populates="worker", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Worker id={self.id} name='{self.name}' phone='{self.phone}'>"
