from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.services.options_analytics import calculate_greeks, calculate_multi_leg_payoff, calculate_max_pain

router = APIRouter(prefix="/options", tags=["options-lab"])

class GreeksRequest(BaseModel):
    spot: float
    strike: float
    days_to_expiry: float = 7.0
    risk_free_rate: float = 0.07
    iv: float = 0.15
    option_type: str = "CE"

class PayoffLeg(BaseModel):
    strike: float
    type: str  # CE or PE
    action: str  # BUY or SELL
    premium: float
    lots: int = 1
    lot_size: int = 65

class PayoffRequest(BaseModel):
    spot: float
    legs: List[PayoffLeg]
    price_range_pct: float = 0.08
    steps: int = 50

class MaxPainRequest(BaseModel):
    strikes: List[float]
    call_ois: List[int]
    put_ois: List[int]

@router.post("/greeks")
def get_greeks(req: GreeksRequest):
    return calculate_greeks(
        spot=req.spot,
        strike=req.strike,
        days_to_expiry=req.days_to_expiry,
        risk_free_rate=req.risk_free_rate,
        iv=req.iv,
        option_type=req.option_type
    )

@router.post("/payoff")
def get_payoff(req: PayoffRequest):
    legs_dicts = [leg.model_dump() for leg in req.legs]
    return calculate_multi_leg_payoff(
        spot=req.spot,
        legs=legs_dicts,
        price_range_pct=req.price_range_pct,
        steps=req.steps
    )

@router.post("/max-pain")
def get_max_pain(req: MaxPainRequest):
    strike = calculate_max_pain(req.strikes, req.call_ois, req.put_ois)
    return {"maxPainStrike": strike}
