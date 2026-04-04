from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime


class WorkerRegisterRequest(BaseModel):
    phone: str
    name: str
    email: Optional[str] = None
    password: str
    platform: str = "Amazon"
    partner_id: Optional[str] = None
    city: str = "Chennai"
    zones: List[str] = ["Tambaram"]
    weekly_hours: float = 60.0

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        v = v.strip()
        if not v.isdigit() or len(v) != 10:
            raise ValueError("Phone must be 10 digits")
        return v


class WorkerLoginRequest(BaseModel):
    phone: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    worker_id: int
    name: str
    role: str
    onboarding_complete: bool


class KYCUpdateRequest(BaseModel):
    aadhaar_last4: str
    kyc_status: str = "VERIFIED"


class WorkerProfileResponse(BaseModel):
    id: int
    phone: str
    name: str
    email: Optional[str]
    platform: str
    partner_id: Optional[str]
    city: str
    zones: List[str]
    weekly_hours: float
    kyc_status: str
    zone_risk_score: float
    risk_tier: str
    role: str
    onboarding_complete: bool
    created_at: datetime

    class Config:
        from_attributes = True
