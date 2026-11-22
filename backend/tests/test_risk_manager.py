import sys
import os
import pytest

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.brokers.risk_manager import RiskManager

def test_risk_manager_consecutive_loss_cooldown():
    rms = RiskManager(max_daily_loss=10000.0, max_consecutive_losses=2, cooldown_minutes=30)
    assert rms.is_in_cooldown()[0] is False
    
    # First loss - no cooldown yet
    rms.record_trade_outcome(-500.0)
    assert rms.is_in_cooldown()[0] is False
    assert rms.consecutive_losses == 1
    
    # Second loss - triggers cooldown!
    rms.record_trade_outcome(-800.0)
    in_cooldown, remaining = rms.is_in_cooldown()
    assert in_cooldown is True
    assert remaining > 0
    assert rms.consecutive_losses == 2
    
    # Validation should reject due to cooldown
    check = rms.validate_pre_trade(order_cost=5000, available_cash=100000, current_open_positions_count=0)
    assert check["allowed"] is False
    assert "cooldown" in check["reason"].lower()

    # Winning trade resets consecutive losses counter
    rms.record_trade_outcome(1200.0)
    assert rms.consecutive_losses == 0

def test_risk_manager_daily_loss_circuit_breaker():
    rms = RiskManager(max_daily_loss=5000.0)
    # Realized loss exceeding limit
    rms.record_trade_outcome(-5500.0)
    assert rms.kill_switch_tripped is True
    check = rms.validate_pre_trade(order_cost=1000, available_cash=100000, current_open_positions_count=0)
    assert check["allowed"] is False
    assert "kill switch" in check["reason"].lower() or "breached" in check["reason"].lower()

def test_risk_manager_floating_drawdown_breaker():
    rms = RiskManager(max_daily_loss=5000.0)
    assert rms.kill_switch_tripped is False
    
    # Floating drawdown within limits
    rms.update_floating_drawdown(-2000.0)
    assert rms.kill_switch_tripped is False
    
    # Severe floating drawdown exceeding max_daily_loss
    rms.update_floating_drawdown(-6000.0)
    assert rms.kill_switch_tripped is True
    check = rms.validate_pre_trade(order_cost=1000, available_cash=100000, current_open_positions_count=0)
    assert check["allowed"] is False

def test_risk_manager_trailing_stop_calculation():
    rms = RiskManager()
    # LONG: Entry 100, initial SL 95. Price moves to 110. Trailing SL should ratchet up.
    # trail_pct = 0.03 (3% below peak) -> 110 * 0.97 = 106.7
    new_sl = rms.calculate_trailing_stop(side="LONG", entry_price=100.0, current_price=110.0, current_sl=95.0, trail_pct=0.03)
    assert new_sl > 95.0
    assert new_sl == pytest.approx(106.7, 0.1)

    # LONG: Price drops to 108. Trailing SL must NEVER move down!
    ratchet_sl = rms.calculate_trailing_stop(side="LONG", entry_price=100.0, current_price=108.0, current_sl=new_sl, trail_pct=0.03)
    assert ratchet_sl == new_sl

    # SHORT: Entry 100, initial SL 105. Price drops to 90. Trailing SL should ratchet down.
    # trail_pct = 0.03 (3% above trough) -> 90 * 1.03 = 92.7
    short_sl = rms.calculate_trailing_stop(side="SHORT", entry_price=100.0, current_price=90.0, current_sl=105.0, trail_pct=0.03)
    assert short_sl < 105.0
    assert short_sl == pytest.approx(92.7, 0.1)

    # SHORT: Price rises to 92. Trailing SL must NEVER move up!
    short_ratchet = rms.calculate_trailing_stop(side="SHORT", entry_price=100.0, current_price=92.0, current_sl=short_sl, trail_pct=0.03)
    assert short_ratchet == short_sl
