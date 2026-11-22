"""
Orion Algo - Market Regime & Universe Scanner Agent
Classifies Indian market structure into Trend, Range, or Volatility regimes.
"""

import math
from typing import Dict, Any, List
from app.services.agents.base_agent import BaseAgent, AgentVote


class RegimeScannerAgent(BaseAgent):
    """
    Agent 1: Detects structural market regimes using multi-candle ATR,
    channel width, and moving average slope.
    """

    def __init__(self):
        super().__init__(
            name="RegimeScannerAgent",
            category="Alpha & Intelligence",
            description="Analyzes structural market regime (Trend, Range Squeeze, Volatility) across Indian indices.",
            weight=1.2,
        )

    def analyze(self, market_data: Dict[str, Any]) -> AgentVote:
        candles: List[Dict[str, float]] = market_data.get("candles", [])
        symbol: str = market_data.get("symbol", "NIFTY50")

        if not candles or len(candles) < 10:
            vote = AgentVote(
                agent_name=self.name,
                signal="HOLD",
                conviction=0.30,
                category=self.category,
                reasoning=f"Insufficient candle history for {symbol} to determine market regime.",
                metadata={"regime": "UNKNOWN", "trend_strength": 0.0},
            )
            self.last_vote = vote
            return vote

        closes = [c["close"] for c in candles]
        highs = [c["high"] for c in candles]
        lows = [c["low"] for c in candles]

        # 1. Calculate Simple Moving Average & Slope over available periods
        period = min(20, len(closes))
        recent_closes = closes[-period:]
        sma = sum(recent_closes) / period
        first_half = sum(recent_closes[: period // 2]) / (period // 2)
        second_half = sum(recent_closes[period // 2 :]) / (len(recent_closes) - period // 2)
        slope_pct = (second_half - first_half) / (first_half or 1.0) * 100.0

        # 2. Average True Range (ATR) approximation
        tr_list = []
        for i in range(1, len(candles)):
            h = highs[i]
            l = lows[i]
            prev_c = closes[i - 1]
            tr = max(h - l, abs(h - prev_c), abs(l - prev_c))
            tr_list.append(tr)
        atr = (sum(tr_list[-period:]) / period) if tr_list else (highs[-1] - lows[-1])
        atr_pct = (atr / closes[-1]) * 100.0 if closes[-1] > 0 else 0.0

        # 3. High-Low Channel Width
        highest = max(highs[-period:])
        lowest = min(lows[-period:])
        channel_width_pct = ((highest - lowest) / lowest) * 100.0 if lowest > 0 else 0.0

        # 4. Regime Classification
        if atr_pct > 1.8 or channel_width_pct > 3.5:
            regime = "EXPLOSIVE_VOLATILITY"
            signal = "HOLD"
            conviction = 0.50
            reasoning = (
                f"{symbol} is experiencing explosive volatility (ATR: {atr_pct:.2f}%). "
                f"Caution advised; wide stops required."
            )
        elif abs(slope_pct) < 0.25 and channel_width_pct < 0.8:
            regime = "COMPRESSED_RANGE"
            signal = "HOLD"
            conviction = 0.40
            reasoning = (
                f"{symbol} is in a tight compressed range (Channel width: {channel_width_pct:.2f}%). "
                f"Consolidation mode; waiting for volatility breakout."
            )
        elif slope_pct > 0.3:
            regime = "BULL_TREND"
            signal = "BUY"
            conviction = min(0.95, 0.60 + (slope_pct / 5.0))
            reasoning = (
                f"{symbol} is in a clear Bull Trend (Slope: +{slope_pct:.2f}%, ATR: {atr_pct:.2f}%). "
                f"Trend continuation favored."
            )
        elif slope_pct < -0.3:
            regime = "BEAR_TREND"
            signal = "SELL"
            conviction = min(0.95, 0.60 + (abs(slope_pct) / 5.0))
            reasoning = (
                f"{symbol} is in a Bear Trend (Slope: {slope_pct:.2f}%, ATR: {atr_pct:.2f}%). "
                f"Short momentum favored."
            )
        else:
            regime = "NEUTRAL"
            signal = "HOLD"
            conviction = 0.50
            reasoning = f"{symbol} exhibits neutral, balanced market dynamics."

        vote = AgentVote(
            agent_name=self.name,
            signal=signal,
            conviction=round(conviction, 2),
            category=self.category,
            reasoning=reasoning,
            metadata={
                "regime": regime,
                "slope_pct": round(slope_pct, 2),
                "atr_pct": round(atr_pct, 2),
                "channel_width_pct": round(channel_width_pct, 2),
            },
        )
        self.last_vote = vote
        return vote
