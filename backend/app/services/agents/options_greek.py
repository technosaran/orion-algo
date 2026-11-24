"""
Orion Algo - Options Greeks & Derivatives Arbitrage Agent
Analyzes NSE Live Option Chain, Greeks (Delta, Gamma, Theta, Vega), PCR, and Max Pain.
"""

import math
from typing import Dict, Any, Optional
from app.services.agents.base_agent import BaseAgent, AgentVote


class OptionsGreekAgent(BaseAgent):
    """
    Agent 3: Derivatives & Options Strategy Specialist.
    Calculates PCR (Put-Call Ratio), Max Pain, Black-Scholes Greeks,
    and structures risk-defined option spreads (Bull Call Spread, Iron Condor, etc.).
    """

    def __init__(self):
        super().__init__(
            name="OptionsGreekAgent",
            category="Derivatives & Sizing",
            description="Analyzes option chain OI distribution, PCR, Max Pain, and Black-Scholes Greeks to select optimal structures.",
            weight=1.3,
        )

    def analyze(self, market_data: Dict[str, Any]) -> AgentVote:
        chain: Optional[Dict[str, Any]] = market_data.get("option_chain")
        symbol: str = market_data.get("symbol", "NIFTY50")

        if not chain:
            vote = AgentVote(
                agent_name=self.name,
                signal="HOLD",
                conviction=0.35,
                category=self.category,
                reasoning=f"No live option chain data available for {symbol}. Recommending equity/futures execution.",
                metadata={"recommended_structure": "EQUITY_SPOT", "pcr": 1.0},
            )
            self.last_vote = vote
            return vote

        underlying = float(chain.get("underlying_price", 24500.0))
        ce_oi = float(chain.get("total_ce_oi", 1000000.0))
        pe_oi = float(chain.get("total_pe_oi", 1000000.0))
        max_pain = float(chain.get("max_pain", underlying))
        iv = float(chain.get("atm_iv", 15.0)) / 100.0
        days_to_expiry = max(float(chain.get("days_to_expiry", 4.0)), 0.5)

        # 1. Put-Call Ratio (PCR)
        pcr = (pe_oi / ce_oi) if ce_oi > 0 else 1.0

        # 2. Greeks Approximations for ATM
        t = days_to_expiry / 365.0
        sqrt_t = math.sqrt(t)

        # ATM Call Delta approx 0.50
        delta = 0.50
        # Gamma approx: 1 / (S * sigma * sqrt(T)) * 0.3989
        gamma = 0.3989 / (underlying * iv * sqrt_t) if (underlying * iv * sqrt_t) > 0 else 0.001
        # Theta per day approx
        theta_per_day = - (underlying * iv * 0.3989) / (2.0 * sqrt_t * 365.0) if sqrt_t > 0 else -10.0
        # Vega per 1% change in IV
        vega = (underlying * sqrt_t * 0.3989) / 100.0

        # 3. Decision Logic & Strategy Recommendation
        if pcr >= 1.25:
            signal = "BUY"
            structure = "BULL_CALL_SPREAD"
            conviction = min(0.92, 0.65 + min(0.25, (pcr - 1.0) / 2.0))
            reasoning = (
                f"Bullish derivatives setup on {symbol}: PCR is {pcr:.2f} indicating heavy Put writing support. "
                f"Max Pain at ₹{max_pain:.0f}. Recommend {structure} to limit theta decay."
            )
        elif pcr <= 0.75:
            signal = "SELL"
            structure = "BEAR_PUT_SPREAD"
            conviction = min(0.92, 0.65 + min(0.25, (1.0 - pcr) / 2.0))
            reasoning = (
                f"Bearish derivatives setup on {symbol}: PCR is {pcr:.2f} signaling strong Call writing resistance. "
                f"Max Pain at ₹{max_pain:.0f}. Recommend {structure} with defined risk."
            )
        elif iv > 0.22:
            signal = "HOLD"
            structure = "IRON_CONDOR"
            conviction = 0.60
            reasoning = (
                f"Elevated IV on {symbol} (IV: {iv*100:.1f}%). High premium environment favors non-directional {structure}."
            )
        else:
            signal = "HOLD"
            structure = "DELTA_NEUTRAL_STRADDLE"
            conviction = 0.50
            reasoning = f"Balanced PCR ({pcr:.2f}) and moderate IV ({iv*100:.1f}%) on {symbol}. Neutral options bias."

        vote = AgentVote(
            agent_name=self.name,
            signal=signal,
            conviction=round(conviction, 2),
            category=self.category,
            reasoning=reasoning,
            metadata={
                "pcr": round(pcr, 2),
                "max_pain": round(max_pain, 1),
                "atm_iv_pct": round(iv * 100.0, 1),
                "recommended_structure": structure,
                "delta": round(delta, 2),
                "gamma": round(gamma, 5),
                "theta_per_day": round(theta_per_day, 2),
                "vega": round(vega, 2),
            },
        )
        self.last_vote = vote
        return vote
