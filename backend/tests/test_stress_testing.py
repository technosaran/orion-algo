import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.stress_testing import run_monte_carlo_drawdown_simulation, run_walk_forward_split

def test_monte_carlo_drawdown_simulation():
    sample_trades = [
        {"pnl": 1200.0, "pnl_pct": 1.2},
        {"pnl": -600.0, "pnl_pct": -0.6},
        {"pnl": 1800.0, "pnl_pct": 1.8},
        {"pnl": -800.0, "pnl_pct": -0.8},
        {"pnl": 2100.0, "pnl_pct": 2.1},
        {"pnl": -500.0, "pnl_pct": -0.5},
        {"pnl": 1500.0, "pnl_pct": 1.5},
        {"pnl": -1200.0, "pnl_pct": -1.2},
    ]
    res = run_monte_carlo_drawdown_simulation(sample_trades, initial_capital=100000.0, iterations=500, seed=42)
    assert res["iterations"] == 500
    assert "max_drawdown_p50" in res
    assert "max_drawdown_p95" in res
    assert "max_drawdown_p99" in res
    assert "probability_of_ruin" in res
    assert "var_95" in res
    assert res["max_drawdown_p95"] >= res["max_drawdown_p50"]
    assert res["max_drawdown_p99"] >= res["max_drawdown_p95"]

def test_walk_forward_split():
    candles = [{"close": 100 + i} for i in range(100)]
    splits = run_walk_forward_split(candles, train_ratio=0.7)
    assert len(splits["train"]) == 70
    assert len(splits["test"]) == 30
    assert splits["train"][0]["close"] == 100
    assert splits["test"][0]["close"] == 170
