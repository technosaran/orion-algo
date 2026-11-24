import os
import sys
import pytest
import math

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.agents.technical_quant import TechnicalQuantAgent
from app.services.agents.options_greek import OptionsGreekAgent

def test_technical_quant_bullish_vwap_and_ema():
    agent = TechnicalQuantAgent()
    # 40 rising candles above VWAP with high volume
    candles = []
    base = 100.0
    for i in range(40):
        c = base + i * 1.5
        candles.append({
            "open": c - 0.5,
            "high": c + 2.0,
            "low": c - 2.0,
            "close": c,
            "volume": 5000.0
        })
    vote = agent.analyze({"candles": candles, "symbol": "RELIANCE"})
    assert vote.agent_name == "TechnicalQuantAgent"
    assert vote.signal == "BUY"
    assert vote.conviction >= 0.70
    assert "VWAP" in vote.reasoning or "EMA" in vote.reasoning or "Momentum" in vote.reasoning
    assert "rsi" in vote.metadata

def test_technical_quant_bearish_breakdown():
    agent = TechnicalQuantAgent()
    # 40 declining candles below VWAP
    candles = []
    base = 200.0
    for i in range(40):
        c = base - i * 1.5
        candles.append({
            "open": c + 0.5,
            "high": c + 1.0,
            "low": c - 2.0,
            "close": c,
            "volume": 6000.0
        })
    vote = agent.analyze({"candles": candles, "symbol": "INFY"})
    assert vote.agent_name == "TechnicalQuantAgent"
    assert vote.signal == "SELL"
    assert vote.conviction >= 0.65
    assert vote.metadata["bias"] == "BEARISH"

def test_options_greek_agent_bullish_pcr_and_greeks():
    agent = OptionsGreekAgent()
    option_chain = {
        "underlying_price": 24500.0,
        "total_ce_oi": 1500000,
        "total_pe_oi": 2100000,  # PCR = 1.4 (Bullish Put writing)
        "max_pain": 24450.0,
        "atm_iv": 14.5,
        "days_to_expiry": 3
    }
    vote = agent.analyze({"option_chain": option_chain, "symbol": "NIFTY50"})
    assert vote.agent_name == "OptionsGreekAgent"
    assert vote.metadata["pcr"] == pytest.approx(1.4, 0.05)
    assert vote.signal == "BUY"
    assert "BULL" in vote.metadata["recommended_structure"]
    assert "theta_per_day" in vote.metadata

def test_options_greek_agent_bearish_pcr():
    agent = OptionsGreekAgent()
    option_chain = {
        "underlying_price": 24500.0,
        "total_ce_oi": 2500000,
        "total_pe_oi": 1500000,  # PCR = 0.6 (Bearish Call writing)
        "max_pain": 24300.0,
        "atm_iv": 18.0,
        "days_to_expiry": 2
    }
    vote = agent.analyze({"option_chain": option_chain, "symbol": "NIFTY50"})
    assert vote.agent_name == "OptionsGreekAgent"
    assert vote.metadata["pcr"] == pytest.approx(0.6, 0.05)
    assert vote.signal == "SELL"
    assert "BEAR" in vote.metadata["recommended_structure"]
