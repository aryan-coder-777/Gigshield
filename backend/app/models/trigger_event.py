from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class TriggerEvent(Base):
    __tablename__ = "trigger_events"

    id = Column(Integer, primary_key=True, index=True)

    # Trigger classification
    trigger_type = Column(String(50), nullable=False)
    # RAIN, EXTREME_HEAT, HAZARDOUS_AQI, FLOOD, CURFEW, HUB_SHUTDOWN, ROAD_CLOSURE

    trigger_source = Column(String(50), nullable=False)
    # WEATHER_API, AQI_API, MOCK_HUB_API, MOCK_CIVIC_API, MOCK_TRAFFIC_API, MANUAL

    # Location
    zone = Column(String(100), nullable=False)
    city = Column(String(50), default="Chennai")
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)

    # Measured values
    measured_value = Column(Float, nullable=True)   # e.g., rainfall in mm/hr
    threshold_value = Column(Float, nullable=True)  # e.g., 10.0 mm/hr
    unit = Column(String(20), nullable=True)        # e.g., mm/hr, °C, AQI

    # Description
    description = Column(Text, nullable=True)
    severity = Column(String(20), default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL

    # Status
    is_active = Column(Boolean, default=True)
    claims_generated = Column(Integer, default=0)
    total_payout_triggered = Column(Float, default=0.0)

    # Raw API response (for audit)
    raw_data = Column(JSON, nullable=True)

    # Timestamps
    detected_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    claims = relationship("Claim", back_populates="trigger_event")

    def __repr__(self):
        return f"<TriggerEvent id={self.id} type='{self.trigger_type}' zone='{self.zone}'>"
