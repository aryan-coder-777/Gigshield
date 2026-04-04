from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class ClaimResponse(BaseModel):
    id: int
    claim_type: str
    disruption_description: Optional[str]
    zone: str
    payout_amount: float
    status: str
    fraud_score: float
    fraud_tier: str
    fraud_signals: Optional[Dict[str, Any]]
    advance_paid: float
    appeal_submitted: bool
    trigger_timestamp: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class ClaimListResponse(BaseModel):
    claims: List[ClaimResponse]
    total: int
    total_payout_received: float


class AppealRequest(BaseModel):
    appeal_note: Optional[str] = None


class AppealResponse(BaseModel):
    message: str
    claim_id: int
    status: str


class PayoutResponse(BaseModel):
    id: int
    amount: float
    payout_type: str
    payment_method: str
    payment_rail: Optional[str] = None
    razorpay_payout_id: Optional[str]
    stripe_payment_intent_id: Optional[str] = None
    upi_transaction_id: Optional[str]
    status: str
    initiated_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class TriggerEventResponse(BaseModel):
    id: int
    trigger_type: str
    trigger_source: str
    zone: str
    city: str
    measured_value: Optional[float]
    threshold_value: Optional[float]
    unit: Optional[str]
    description: Optional[str]
    severity: str
    is_active: bool
    claims_generated: int
    total_payout_triggered: float
    detected_at: datetime

    class Config:
        from_attributes = True


class TriggerSimulateRequest(BaseModel):
    trigger_type: str
    zone: str
    measured_value: Optional[float] = None
    description: Optional[str] = None
    simulate_gps_spoof: Optional[bool] = False
    # Demo: force historical weather inconsistency to exercise fraud (fake-weather pattern)
    simulate_low_weather_history: Optional[bool] = False
    # Real device GPS — validated server-side vs zone center (optional)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
