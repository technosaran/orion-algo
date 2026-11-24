"""
Orion Algo - Technical Momentum & Trend Quant Agent
Analyzes multi-indicator technical signals: VWAP, EMA crosses, and RSI momentum.
"""

from typing import Dict, Any, List
from app.services.agents.base_agent import BaseAgent, AgentVote


class TechnicalQuantAgent(BaseAgent):
    """
    Agent 2: Quantitative Technical Momentum specialist.
    Evaluates intraday VWAP, Exponential Moving Averages (9 & 21), and 14-period RSI.
    """

    def __init__(self):
        super().__init__(
            name="TechnicalQuantAgent",
            category="Alpha & Intelligence",
            description="Multi-timeframe technical momentum quant: VWAP deviation, 9/21 EMA crossovers, and RSI momentum.",
            weight=1.5,
        )

    def analyze(self, market_data: Dict[str, Any]) -> AgentVote:
        candles: List[Dict[str, float]] = market_data.get("candles", [])
        symbol: str = market_data.get("symbol", "NIFTY50")

        if not candles or len(candles) < 14:
            vote = AgentVote(
                agent_name=self.name,
                signal="HOLD",
                conviction=0.30,
                category=self.category,
                reasoning=f"Insufficient candles for {symbol} to calculate VWAP and technical momentum.",
                metadata={"bias": "NEUTRAL", "rsi": 50.0},
            )
            self.last_vote = vote
            return vote

        closes = [float(c["close"]) for c in candles]
        highs = [float(c["high"]) for c in candles]
        lows = [float(c["low"]) for c in candles]
        volumes = [float(c.get("volume", 1000.0)) for c in candles]

        # 1. Calculate Intraday VWAP
        cum_tp_vol = 0.0
        cum_vol = 0.0
        for i in range(len(candles)):
            tp = (highs[i] + lows[i] + closes[i]) / 3.0
            v = max(volumes[i], 1.0)
            cum_tp_vol += tp * v
            cum_vol += v
        vwap = cum_tp_vol / cum_vol if cum_vol > 0 else closes[-1]

        # 2. Calculate Exponential Moving Average (EMA)
        def calc_ema(values: List[float], span: int) -> float:
            if not values:
                return 0.0
            multiplier = 2.0 / (span + 1.0)
            ema = values[0]
            for val in values[1:]:
                ema = (val - ema) * multiplier + ema
            return ema

        ema9 = calc_ema(closes, 9)
        ema21 = calc_ema(closes, 21)

        # 3. Calculate 14-period RSI
        gains = []
        losses = []
        for i in range(1, len(closes)):
            change = closes[i] - closes[i - 1]
            if change > 0:
                gains.append(change)
                losses.append(0.0)
            else:
                gains.append(0.0)
                losses.append(abs(change))

        period = min(14, len(gains))
        avg_gain = sum(gains[-period:]) / period if period > 0 else 0.0
        avg_loss = sum(losses[-period:]) / period if period > 0 else 0.0

        if avg_loss == 0.0:
            rsi = 100.0 if avg_gain > 0 else 50.0
        else:
            rs = avg_gain / avg_loss
            rsi = 100.0 - (100.0 / (1.0 + rs))

        current_price = closes[-1]
        vwap_diff_pct = ((current_price - vwap) / vwap) * 100.0

        # 4. Generate Signal & Conviction
        if current_price > vwap and ema9 > ema21 and rsi > 52.0:
            signal = "BUY"
            bias = "BULLISH"
            conviction = min(0.95, 0.65 + (rsi - 50.0) / 100.0 + min(0.15, abs(vwap_diff_pct) / 10.0))
            reasoning = (
                f"{symbol} is strongly bullish: Price (₹{current_price:.2f}) > VWAP (₹{vwap:.2f}, +{vwap_diff_pct:.2f}%), "
                f"EMA 9 > 21 golden alignment, RSI at {rsi:.1f}. High upward momentum."
            )
        elif current_price < vwap and ema9 < ema21 and rsi < 48.0:
            signal = "SELL"
            bias = "BEARISH"
            conviction = min(0.95, 0.65 + (50.0 - rsi) / 100.0 + min(0.15, abs(vwap_diff_pct) / 10.0))
            reasoning = (
                f"{symbol} is in a bearish breakdown: Price (₹{current_price:.2f}) < VWAP (₹{vwap:.2f}, {vwap_diff_pct:.2f}%), "
                f"EMA 9 < 21 death cross, RSI at {rsi:.1f}. Downward pressure dominating."
            )
        else:
            signal = "HOLD"
            bias = "NEUTRAL"
            conviction = 0.45
            reasoning = (
                f"{symbol} indicators are mixed: Price ₹{current_price:.2f} vs VWAP ₹{vwap:.2f}, "
                f"RSI at {rsi:.1f}. Awaiting directional confirmation."
            )

        vote = AgentVote(
            agent_name=self.name,
            signal=signal,
            conviction=round(conviction, 2),
            category=self.category,
            reasoning=reasoning,
            metadata={
                "bias": bias,
                "current_price": round(current_price, 2),
                "vwap": round(vwap, 2),
                "ema9": round(ema9, 2),
                "ema21": round(ema21, 2),
                "rsi": round(rsi, 1),
            },
        )
        self.last_vote = vote
        return vote
