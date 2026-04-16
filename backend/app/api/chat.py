import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.logger import get_logger
from app.api.auth import get_current_worker
from app.models.worker import Worker
from app.models.policy import Policy
from app.models.claim import Claim
from app.services.llm import get_chat_response

router = APIRouter(tags=["AI Chat"])
logger = get_logger("app.chat")

class ChatRequest(BaseModel):
    message: str
    deep_research: bool = False

class ChatResponse(BaseModel):
    reply: str
    research_mode: bool = False

@router.post("/", response_model=ChatResponse)
async def chat_with_bot(
    req: ChatRequest,
    current_worker: Worker = Depends(get_current_worker),
    db: AsyncSession = Depends(get_db)
):
    """Secure endpoint for AI chat assistant with optional deep research mode."""
    
    try:
        logger.info(f"Chat request from worker {current_worker.id}: {req.message[:100]}")
        
        # 1. Gather context from DB
        context = {
            "name": current_worker.name,
            "worker_id": current_worker.id
        }
        
        # Find active policy to attach context (get the most recent one)
        res = await db.execute(
            select(Policy)
            .where(
                Policy.worker_id == current_worker.id, 
                Policy.status == "ACTIVE"
            )
            .order_by(Policy.created_at.desc())
            .limit(1)
        )
        policy = res.scalars().first()
        
        if policy:
            context["remaining_limit"] = policy.remaining_weekly_payout
            try:
                zones = json.loads(policy.covered_zones)
                context["covered_zones"] = ", ".join(zones)
            except:
                context["covered_zones"] = "Registered Zones"
        
        # Count active claims for deep research context
        claims_res = await db.execute(
            select(Claim).filter(
                Claim.worker_id == current_worker.id,
                Claim.status.in_(["PENDING", "APPROVED"])
            )
        )
        claims = claims_res.scalars().all()
        context["active_claims"] = len(claims)
        
        # 2. Call the LLM service with research mode flag
        reply = get_chat_response(
            req.message, 
            context,
            enable_research=req.deep_research
        )
        
        logger.info(f"Chat response generated successfully")
        return ChatResponse(
            reply=reply,
            research_mode=req.deep_research
        )
        
    except Exception as e:
        logger.error(f"Chat endpoint error: {str(e)}", extra={"error_type": type(e).__name__})
        raise HTTPException(status_code=500, detail="Failed to process chat request")

