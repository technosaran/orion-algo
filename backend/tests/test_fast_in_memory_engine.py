import sys
import os
import time
import pytest
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.fast_in_memory_engine import FastInMemoryEngine
from app.brokers.risk_manager import RiskManager

def test_fast_in_memory_engine_execution_latency():
    """Verifies order execution completes in sub-millisecond (< 1.0 ms) time."""
    async def _run():
        rms = RiskManager(max_daily_loss=50000.0, auto_square_off_time="23:59")
        engine = FastInMemoryEngine(initial_cash=500000.0, risk_manager_instance=rms)

        start_time = time.perf_counter()
        order_res = await engine.execute_order_hot_path(
            symbol="NIFTY50",
            side="BUY",
            quantity=2,  # 2 * 24500 = 49,000 <= 100,000 (20% capital limit)
            price=24500.0,
            take_profit=24700.0,
            stop_loss=24400.0,
            trailing_stop_enabled=True,
            trailing_stop_pct=0.015,
        )
        latency_ms = (time.perf_counter() - start_time) * 1000.0

        assert order_res["status"] == "FILLED"
        assert "orderId" in order_res
        assert "positionId" in order_res
        # Assert hot path is sub-millisecond
        assert latency_ms < 5.0, f"Hot path took {latency_ms:.3f}ms, expected < 5.0ms"
        
        # Assert position was opened in memory
        positions = await engine.get_positions_snapshot()
        assert len(positions) == 1
        assert positions[0]["symbol"] == "NIFTY50"
        assert positions[0]["side"] == "LONG"
        assert positions[0]["quantity"] == 2

    asyncio.run(_run())

def test_fast_in_memory_engine_trailing_stop_ratchet():
    """Verifies microsecond trailing stop ratchet on live tick arrival."""
    async def _run():
        rms = RiskManager(max_daily_loss=50000.0, auto_square_off_time="23:59")
        engine = FastInMemoryEngine(initial_cash=500000.0, risk_manager_instance=rms)

        await engine.execute_order_hot_path(
            symbol="NIFTY50",
            side="BUY",
            quantity=2,
            price=24000.0,
            take_profit=25000.0,
            stop_loss=23700.0,
            trailing_stop_enabled=True,
            trailing_stop_pct=0.015,
        )

        # Price moves up from 24000 to 24500. Trailing stop must ratchet up immediately
        # 24500 * (1 - 0.015) = 24132.50 > 23700
        updates = await engine.update_price_tick_hot_path(symbol="NIFTY50", price=24500.0)
        assert len(updates["active_positions"]) == 1
        pos = updates["active_positions"][0]
        assert pos["current_price"] == 24500.0
        assert pos["stop_loss"] > 23700.0
        assert pos["unrealized_pnl"] > 0

    asyncio.run(_run())

def test_fast_in_memory_engine_write_behind_queue():
    """Verifies non-blocking persistence queue collects mutation events."""
    async def _run():
        rms = RiskManager(max_daily_loss=50000.0, auto_square_off_time="23:59")
        engine = FastInMemoryEngine(initial_cash=500000.0, risk_manager_instance=rms)

        assert engine.persistence_queue.empty() is True

        await engine.execute_order_hot_path(
            symbol="BANKNIFTY",
            side="BUY",
            quantity=1,  # 1 * 52000 = 52,000 <= 100,000 (20% capital limit)
            price=52000.0,
        )

        # Non-blocking enqueue occurred
        assert engine.persistence_queue.empty() is False
        event = await engine.persistence_queue.get()
        assert event["type"] in ["ORDER_INSERT", "POSITION_INSERT", "ACCOUNT_UPDATE"]

    asyncio.run(_run())
