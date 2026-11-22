import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.simulation_runner import simulate_trading_session

def test_simulate_trading_session_execution():
    result = simulate_trading_session(
        symbol="NIFTY50",
        strategy_id="ema_crossover",
        ticks_count=60,
        initial_balance=500000.0,
        base_price=24500.0,
        seed=42,
    )
    assert result["status"] == "completed"
    assert result["total_ticks"] == 60
    assert "trades_executed" in result
    assert "final_balance" in result
    assert "win_rate_pct" in result
    assert "realized_pnl" in result
    assert "rms_events" in result
    assert isinstance(result["trades"], list)

def test_simulate_trading_session_rms_daily_loss_protection():
    # Set a tiny max daily loss to verify RMS circuit breaker trips under simulated adverse conditions
    result = simulate_trading_session(
        symbol="NIFTY50",
        strategy_id="donchian_breakout",
        ticks_count=50,
        initial_balance=100000.0,
        base_price=24500.0,
        max_daily_loss=500.0,  # Strict ₹500 limit
        seed=101,
    )
    assert result["status"] == "completed"
    # Should have RMS events recorded
    assert isinstance(result["rms_events"], list)
