from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class PlanOption(BaseModel):
    plan_type: str
    weekly_premium: float
    max_weekly_payout: float
    features: List[str]
    recommended: bool = False
    zone_risk_score: float
    risk_tier: str


class PlanListResponse(BaseModel):
    plans: List[PlanOption]
    ai_recommendation: str
    zone_risk_score: float
    risk_explanation: str


class PolicyCreateRequest(BaseModel):
    plan_type: str  # Basic, Standard, Premium


class PolicyResponse(BaseModel):
    id: int
    plan_type: str
    weekly_premium: float
    max_weekly_payout: float
    start_date: datetime
    end_date: datetime
    status: str
    total_paid_premium: float
    total_payout_received: float
    remaining_weekly_payout: float
    zone_risk_score: float
    covered_zones: Optional[str]
    auto_renew: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PolicyRenewResponse(BaseModel):
    message: str
    policy: PolicyResponse
