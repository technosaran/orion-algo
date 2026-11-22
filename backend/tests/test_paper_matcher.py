import sys
import os
import pytest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.brokers.risk_manager import risk_manager
from app.services.paper_matcher import (
    execute_paper_market_order,
    close_position,
    process_paper_engine_tick,
)

def test_execute_paper_market_order_blocked_by_kill_switch():
    risk_manager.trip_kill_switch("Test Kill Switch Trip")
    try:
        res = execute_paper_market_order(
            symbol="NIFTY50",
            side="BUY",
            quantity=50,
            price=24500.0,
            stop_loss=24300.0,
            take_profit=24800.0,
        )
        assert res.get("status") == "rejected"
        assert "kill switch" in res.get("reason", "").lower()
    finally:
        risk_manager.reset_kill_switch()

def test_execute_paper_market_order_blocked_by_cooldown():
    risk_manager.reset_kill_switch()
    # Force 2 consecutive losses to trigger cooldown
    risk_manager.record_trade_outcome(-1000.0)
    risk_manager.record_trade_outcome(-1500.0)
    assert risk_manager.is_in_cooldown()[0] is True

    try:
        res = execute_paper_market_order(
            symbol="NIFTY50",
            side="BUY",
            quantity=50,
            price=24500.0,
            stop_loss=24300.0,
            take_profit=24800.0,
        )
        assert res.get("status") == "rejected"
        assert "cooldown" in res.get("reason", "").lower()
    finally:
        risk_manager.reset_kill_switch()

def test_paper_engine_intraday_square_off():
    risk_manager.reset_kill_switch()
    # Mock square off time returning True
    with patch("app.brokers.risk_manager.risk_manager.is_intraday_square_off_time", return_value=True):
        with patch("app.services.paper_matcher.get_open_positions", return_value=[{
            "id": "pos-test-mis-1",
            "symbol": "NIFTY50",
            "side": "LONG",
            "quantity": 50,
            "entry_price": 24000.0,
            "current_price": 24200.0,
            "product_type": "MIS",
        }]):
            with patch("app.services.paper_matcher.close_position") as mock_close:
                with patch("app.services.paper_matcher.get_all_real_quotes", return_value=[{"symbol": "NIFTY50", "price": 24200.0}]):
                    import asyncio
                    res = asyncio.run(process_paper_engine_tick())
                    assert mock_close.called
                    args = mock_close.call_args[0]
                    assert args[0] == "pos-test-mis-1"
                    assert "MIS_SQUARE_OFF" in args[1]
                    assert res["status"] == "success"

def test_paper_engine_trailing_stop_advancement():
    risk_manager.reset_kill_switch()
    # Position entered at 24000 with initial SL 23800. Price is now 24500.
    # Trailing SL should ratchet up to ~24500 * 0.97 = 23765 (if trail_pct=0.01 -> 24500 * 0.99 = 24255)
    with patch("app.brokers.risk_manager.risk_manager.is_intraday_square_off_time", return_value=False):
        with patch("app.services.paper_matcher.get_open_positions", return_value=[{
            "id": "pos-test-trail-1",
            "symbol": "NIFTY50",
            "side": "LONG",
            "quantity": 50,
            "entry_price": 24000.0,
            "current_price": 24000.0,
            "stop_loss": 23800.0,
            "take_profit": 25000.0,
            "trailing_stop_enabled": True,
            "trailing_stop_pct": 0.01,
        }]):
            with patch("app.services.paper_matcher.get_all_real_quotes", return_value=[{"symbol": "NIFTY50", "price": 24500.0}]):
                with patch("app.services.paper_matcher.get_supabase_client") as mock_sb:
                    mock_table = MagicMock()
                    mock_sb.return_value.table.return_value = mock_table
                    import asyncio
                    res = asyncio.run(process_paper_engine_tick())
                    assert res["status"] == "success"
                    # Table update should have been called with new ratcheted stop_loss
                    update_calls = mock_table.update.call_args_list
                    sl_updated = any(
                        call[0][0].get("stop_loss") and call[0][0]["stop_loss"] > 23800.0
                        for call in update_calls
                    )
                    assert sl_updated is True
