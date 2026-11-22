import os
import sys
import pytest
import math

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.agents.base_agent import BaseAgent, AgentVote
from app.services.agents.regime_scanner import RegimeScannerAgent

def test_base_agent_contract():
    class DummyAgent(BaseAgent):
        def analyze(self, market_data):
            return AgentVote(
                agent_name=self.name,
                signal="BUY",
                conviction=0.85,
                reasoning="Testing dummy agent contract",
                metadata={"test_key": "test_val"}
            )
    agent = DummyAgent(name="TestAgent", category="Alpha")
    vote = agent.analyze({})
    assert vote.agent_name == "TestAgent"
    assert vote.signal == "BUY"
    assert vote.conviction == 0.85
    assert vote.reasoning == "Testing dummy agent contract"
    assert vote.metadata["test_key"] == "test_val"

def test_regime_scanner_bull_trend_detection():
    scanner = RegimeScannerAgent()
    candles = []
    base = 24000.0
    for i in range(50):
        c = base + i * 12.0
        candles.append({
            "open": c - 5.0,
            "high": c + 15.0,
            "low": c - 15.0,
            "close": c,
            "volume": 5000.0
        })
    vote = scanner.analyze({"candles": candles, "symbol": "NIFTY50"})
    assert vote.agent_name == "RegimeScannerAgent"
    assert vote.signal in ["BUY", "HOLD"]
    assert vote.metadata["regime"] == "BULL_TREND"
    assert vote.conviction >= 0.60
    assert "trend" in vote.reasoning.lower()

def test_regime_scanner_compressed_range_detection():
    scanner = RegimeScannerAgent()
    candles = []
    base = 24000.0
    for i in range(50):
        c = base + math.sin(i * 0.5) * 5.0
        candles.append({
            "open": c,
            "high": c + 3.0,
            "low": c - 3.0,
            "close": c,
            "volume": 1000.0
        })
    vote = scanner.analyze({"candles": candles, "symbol": "NIFTY50"})
    assert vote.agent_name == "RegimeScannerAgent"
    assert vote.metadata["regime"] == "COMPRESSED_RANGE"
    assert vote.signal == "HOLD"
