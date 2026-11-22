"""
Orion Algo - Deterministic Simulated Market Session Runner
Enables 24/7 off-hours autonomous testing, replay simulations, and emotion-free RMS stress verification.
"""

import math
import random
from typing import Dict, Any, List, Optional
from app.brokers.risk_manager import RiskManager
from app.services.condition_evaluator import IndicatorStore


def simulate_trading_session(
    symbol: str = "NIFTY50",
    strategy_id: str = "ema_crossover",
    ticks_count: int = 60,
    initial_balance: float = 500000.0,
    base_price: float = 24500.0,
    volatility: float = 0.002,  # 0.2% per tick standard deviation
    max_daily_loss: float = 10000.0,
    seed: Optional[int] = 42,
) -> Dict[str, Any]:
    """
    Simulates an entire intraday algorithmic trading session tick-by-tick.
    Enforces strict emotion-free RMS controls:
    - Pre-trade capital allocation limit
    - Anti-revenge trading cooldown
    - Max daily loss circuit breaker
    - Dynamic trailing stop-loss advancement
    - 15:15 IST auto MIS square-off
    """
    rng = random.Random(seed)
    rms = RiskManager(
        max_daily_loss=max_daily_loss,
        max_capital_per_trade_pct=0.20,
        max_open_positions=2,
        auto_square_off_time="23:59",  # Permissive cutoff for 24/7 off-hours simulation; tick-based cutoff used below
        max_consecutive_losses=2,
        cooldown_minutes=10,
    )

    cash_balance = initial_balance
    peak_balance = initial_balance
    max_drawdown = 0.0

    current_price = base_price
    candles: List[Dict[str, Any]] = []
    trades: List[Dict[str, Any]] = []
    rms_events: List[Dict[str, Any]] = []

    active_position: Optional[Dict[str, Any]] = None

    # Pre-populate 20 warm-up candles so indicators have baseline history
    for i in range(25):
        drift = rng.uniform(-0.001, 0.0012)
        c_open = current_price
        c_close = c_open * (1.0 + drift)
        c_high = max(c_open, c_close) * (1.0 + rng.uniform(0.0002, 0.001))
        c_low = min(c_open, c_close) * (1.0 - rng.uniform(0.0002, 0.001))
        candles.append({
            "timestamp": f"10:{i:02d}",
            "open": round(c_open, 2),
            "high": round(c_high, 2),
            "low": round(c_low, 2),
            "close": round(c_close, 2),
            "volume": rng.randint(2000, 8000),
        })
        current_price = c_close

    # Run the main trading session ticks
    for tick_idx in range(ticks_count):
        # 1. Price walk
        step_drift = rng.gauss(0.0001, volatility)
        current_price = round(current_price * (1.0 + step_drift), 2)

        # Update last candle or push new candle every 3 ticks
        if tick_idx % 3 == 0:
            candles.append({
                "timestamp": f"11:{tick_idx:02d}",
                "open": current_price,
                "high": current_price,
                "low": current_price,
                "close": current_price,
                "volume": rng.randint(1000, 5000),
            })
        else:
            candles[-1]["high"] = max(candles[-1]["high"], current_price)
            candles[-1]["low"] = min(candles[-1]["low"], current_price)
            candles[-1]["close"] = current_price
            candles[-1]["volume"] += rng.randint(500, 2000)

        # 2. Check 15:15 Cutoff at 90% of session
        is_square_off = tick_idx >= int(ticks_count * 0.90)

        # 3. Position Management & Trailing SL
        if active_position:
            side = active_position["side"]
            entry_p = active_position["entry_price"]
            qty = active_position["quantity"]
            cur_sl = active_position["stop_loss"]
            cur_tp = active_position["take_profit"]

            # Ratchet trailing stop
            new_sl = rms.calculate_trailing_stop(
                side=side,
                entry_price=entry_p,
                current_price=current_price,
                current_sl=cur_sl,
                trail_pct=0.015,
            )
            if new_sl != cur_sl:
                active_position["stop_loss"] = new_sl

            # Calculate floating MTM
            if side == "LONG":
                unrealized = (current_price - entry_p) * qty
            else:
                unrealized = (entry_p - current_price) * qty

            rms.update_floating_drawdown(unrealized)

            # Check Exit triggers
            exit_reason = None
            if is_square_off:
                exit_reason = "AUTO_MIS_SQUARE_OFF"
            elif side == "LONG":
                if current_price <= active_position["stop_loss"]:
                    exit_reason = "STOP_LOSS"
                elif current_price >= cur_tp:
                    exit_reason = "TAKE_PROFIT"
            else:  # SHORT
                if current_price >= active_position["stop_loss"]:
                    exit_reason = "STOP_LOSS"
                elif current_price <= cur_tp:
                    exit_reason = "TAKE_PROFIT"

            if exit_reason:
                if side == "LONG":
                    realized_pnl = (current_price - entry_p) * qty - 40.0
                else:
                    realized_pnl = (entry_p - current_price) * qty - 40.0

                pnl_pct = ((current_price - entry_p) / entry_p) * 100.0 if side == "LONG" else ((entry_p - current_price) / entry_p) * 100.0

                cash_balance += active_position["margin_used"] + realized_pnl
                rms.record_trade_outcome(realized_pnl)

                trades.append({
                    "id": f"sim-trade-{len(trades)+1}",
                    "side": side,
                    "entry_price": entry_p,
                    "exit_price": current_price,
                    "quantity": qty,
                    "pnl": round(realized_pnl, 2),
                    "pnl_pct": round(pnl_pct, 2),
                    "exit_reason": exit_reason,
                    "tick": tick_idx,
                })
                rms_events.append({
                    "tick": tick_idx,
                    "event": f"POSITION_CLOSED_{exit_reason}",
                    "pnl": round(realized_pnl, 2),
                })
                active_position = None

        # Track Drawdown
        total_equity = cash_balance + (active_position["margin_used"] + unrealized if active_position else 0.0)
        peak_balance = max(peak_balance, total_equity)
        current_dd = (peak_balance - total_equity) / peak_balance if peak_balance > 0 else 0.0
        max_drawdown = max(max_drawdown, current_dd)

        # 4. Strategy Signal Generation (if no position and before square-off)
        if not active_position and not is_square_off and not rms.kill_switch_tripped:
            store = IndicatorStore(candles)
            last_idx = len(candles) - 1
            signal_side = None

            if strategy_id == "ema_crossover":
                e9 = store.get_value({"type": "EMA", "params": {"period": 9}, "offset": 1}, last_idx)
                e21 = store.get_value({"type": "EMA", "params": {"period": 21}, "offset": 1}, last_idx)
                if e9 and e21:
                    if e9 > e21:
                        signal_side = "LONG"
                    elif e9 < e21:
                        signal_side = "SHORT"

            elif strategy_id == "rsi_mean_reversion":
                rsi_val = store.get_value({"type": "RSI", "params": {"period": 14}, "offset": 1}, last_idx)
                if rsi_val:
                    if rsi_val < 32.0:
                        signal_side = "LONG"
                    elif rsi_val > 68.0:
                        signal_side = "SHORT"

            elif strategy_id == "donchian_breakout":
                recent_highs = [c["high"] for c in candles[-20:-1]]
                recent_lows = [c["low"] for c in candles[-20:-1]]
                if recent_highs and current_price >= max(recent_highs):
                    signal_side = "LONG"
                elif recent_lows and current_price <= min(recent_lows):
                    signal_side = "SHORT"

            if signal_side:
                alloc = cash_balance * 0.15
                qty = max(1, int(alloc / current_price))
                order_cost = current_price * qty

                # Pre-trade RMS check
                check = rms.validate_pre_trade(
                    order_cost=order_cost,
                    available_cash=cash_balance,
                    current_open_positions_count=0,
                )
                if check["allowed"]:
                    if signal_side == "LONG":
                        sl_p = round(current_price * 0.985, 2)
                        tp_p = round(current_price * 1.030, 2)
                    else:
                        sl_p = round(current_price * 1.015, 2)
                        tp_p = round(current_price * 0.970, 2)

                    cash_balance -= order_cost
                    active_position = {
                        "side": signal_side,
                        "quantity": qty,
                        "entry_price": current_price,
                        "margin_used": order_cost,
                        "stop_loss": sl_p,
                        "take_profit": tp_p,
                    }
                    rms_events.append({
                        "tick": tick_idx,
                        "event": f"ORDER_FILLED_{signal_side}",
                        "price": current_price,
                        "qty": qty,
                    })
                else:
                    rms_events.append({
                        "tick": tick_idx,
                        "event": "ORDER_REJECTED_BY_RMS",
                        "reason": check["reason"],
                    })

    # Close any leftover position at end of session
    if active_position:
        side = active_position["side"]
        entry_p = active_position["entry_price"]
        qty = active_position["quantity"]
        if side == "LONG":
            final_pnl = (current_price - entry_p) * qty - 40.0
        else:
            final_pnl = (entry_p - current_price) * qty - 40.0
        cash_balance += active_position["margin_used"] + final_pnl
        trades.append({
            "id": f"sim-trade-{len(trades)+1}",
            "side": side,
            "entry_price": entry_p,
            "exit_price": current_price,
            "quantity": qty,
            "pnl": round(final_pnl, 2),
            "pnl_pct": round((final_pnl / active_position["margin_used"]) * 100.0, 2),
            "exit_reason": "SESSION_END_FORCE_EXIT",
            "tick": ticks_count,
        })

    winning_trades = [t for t in trades if t["pnl"] > 0]
    win_rate = (len(winning_trades) / len(trades) * 100.0) if trades else 0.0
    net_pnl = cash_balance - initial_balance

    return {
        "status": "completed",
        "symbol": symbol,
        "strategy_id": strategy_id,
        "total_ticks": ticks_count,
        "trades_executed": len(trades),
        "initial_balance": initial_balance,
        "final_balance": round(cash_balance, 2),
        "realized_pnl": round(net_pnl, 2),
        "win_rate_pct": round(win_rate, 2),
        "max_drawdown_pct": round(max_drawdown * 100.0, 2),
        "kill_switch_tripped": rms.kill_switch_tripped,
        "rms_events": rms_events,
        "trades": trades,
    }
