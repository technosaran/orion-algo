"""
Orion Algo - Server-Side Paper Trading Matching Engine
Matches LIMIT/STOP orders against live market ticks, monitors SL/TP,
executes trailing stops, enforces pre-trade RMS guards, and runs autonomous multi-strategy signals.
"""

import time
import uuid
import logging
from typing import Dict, Any, List, Optional
from app.db.supabase import get_supabase_client
from app.services.market_data_service import get_all_real_quotes, get_real_historical_candles
from app.services.condition_evaluator import IndicatorStore
from app.brokers.risk_manager import risk_manager

logger = logging.getLogger("paper_matcher")


def get_paper_account() -> Dict[str, Any]:
    """Retrieves or initializes the singleton paper account from Supabase."""
    supabase = get_supabase_client()
    try:
        res = supabase.table("paper_account").select("*").eq("id", "default").execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
        # Create default
        default_acc = {
            "id": "default",
            "initial_balance": 1000000.0,
            "cash_balance": 1000000.0,
            "bot_active": False,
            "bot_strategy_id": "rsi_mean_reversion",
            "bot_speed_sec": 3.0,
        }
        supabase.table("paper_account").insert(default_acc).execute()
        return default_acc
    except Exception as e:
        logger.error(f"Error fetching paper account: {e}")
        return {
            "id": "default",
            "initial_balance": 1000000.0,
            "cash_balance": 1000000.0,
            "bot_active": False,
            "bot_strategy_id": "rsi_mean_reversion",
            "bot_speed_sec": 3.0,
        }


def get_open_positions() -> List[Dict[str, Any]]:
    """Retrieves active positions from Supabase."""
    supabase = get_supabase_client()
    try:
        res = supabase.table("paper_positions").select("*").order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching paper positions: {e}")
        return []


def get_orders() -> List[Dict[str, Any]]:
    """Retrieves orders from Supabase."""
    supabase = get_supabase_client()
    try:
        res = supabase.table("paper_orders").select("*").order("created_at", desc=True).limit(50).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching paper orders: {e}")
        return []


def get_trades_history() -> List[Dict[str, Any]]:
    """Retrieves closed trade logs from Supabase."""
    supabase = get_supabase_client()
    try:
        res = supabase.table("paper_trades").select("*").order("closed_at", desc=True).limit(50).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching paper trades: {e}")
        return []


async def process_paper_engine_tick() -> Dict[str, Any]:
    """
    Core Autonomous Tick Worker:
    1. Fetches latest live quotes for all symbols.
    2. Enforces active 15:15 IST MIS square-off.
    3. Matches pending LIMIT / STOP orders if price condition is reached.
    4. Computes trailing stop-loss advancement and updates unrealized P&L.
    5. Checks Stop Loss and Take Profit exits on open positions.
    6. If bot_active, runs strategy signals on recent candles and executes paper orders with RMS guards.
    """
    supabase = get_supabase_client()
    account = get_paper_account()
    quotes = await get_all_real_quotes()
    price_map: Dict[str, float] = {q["symbol"].upper(): q["price"] for q in quotes}

    positions = get_open_positions()
    orders = get_orders()

    matched_orders = 0
    closed_positions = 0
    bot_signals_fired = 0

    # 1. Active 3:15 PM IST MIS Square-Off Check
    is_square_off_time = risk_manager.is_intraday_square_off_time()
    if is_square_off_time and positions:
        logger.warning("🚨 [RMS 15:15 Cutoff] Auto-squaring off all open intraday (MIS) positions.")
        for pos in list(positions):
            prod_type = str(pos.get("product_type", "MIS")).upper()
            if prod_type in ["MIS", "INTRADAY"]:
                cur_p = price_map.get(pos["symbol"].upper(), float(pos.get("current_price", pos["entry_price"])))
                close_position(pos["id"], "AUTO_MIS_SQUARE_OFF", cur_p)
                closed_positions += 1
        # Refresh positions after square-off
        positions = get_open_positions()

    # 2. Update Positions Unrealized P&L, Trailing Stop Ratchet, and check SL/TP
    total_unrealized_pnl = 0.0

    for pos in positions:
        sym = pos["symbol"].upper()
        current_price = price_map.get(sym, float(pos.get("current_price", pos["entry_price"])))
        entry_price = float(pos["entry_price"])
        qty = float(pos["quantity"])
        side = pos["side"].upper()

        if side in ["LONG", "BUY"]:
            unrealized = (current_price - entry_price) * qty
            unrealized_pct = ((current_price - entry_price) / entry_price) * 100.0
        else:
            unrealized = (entry_price - current_price) * qty
            unrealized_pct = ((entry_price - current_price) / entry_price) * 100.0

        total_unrealized_pnl += unrealized

        # Dynamic Trailing Stop Loss Ratchet
        sl = float(pos["stop_loss"]) if pos.get("stop_loss") else None
        tp = float(pos["take_profit"]) if pos.get("take_profit") else None
        trailing_enabled = pos.get("trailing_stop_enabled", True)
        trail_pct = float(pos.get("trailing_stop_pct", 0.015))

        if trailing_enabled and sl is not None:
            updated_sl = risk_manager.calculate_trailing_stop(
                side=side,
                entry_price=entry_price,
                current_price=current_price,
                current_sl=sl,
                trail_pct=trail_pct,
            )
            if updated_sl != sl:
                sl = updated_sl
                pos["stop_loss"] = sl

        # Check Stop Loss / Take Profit Hit
        exit_reason = None
        if side in ["LONG", "BUY"]:
            if sl and current_price <= sl:
                exit_reason = "STOP_LOSS"
            elif tp and current_price >= tp:
                exit_reason = "TAKE_PROFIT"
        else:  # SHORT
            if sl and current_price >= sl:
                exit_reason = "STOP_LOSS"
            elif tp and current_price <= tp:
                exit_reason = "TAKE_PROFIT"

        if exit_reason:
            # Auto-close position
            close_position(pos["id"], exit_reason, current_price)
            closed_positions += 1
        else:
            # Update position in DB
            try:
                update_payload = {
                    "current_price": current_price,
                    "unrealized_pnl": round(unrealized, 2),
                    "unrealized_pnl_percent": round(unrealized_pct, 2),
                }
                if sl is not None:
                    update_payload["stop_loss"] = sl
                supabase.table("paper_positions").update(update_payload).eq("id", pos["id"]).execute()
            except Exception as e:
                logger.error(f"Failed to update position {pos['id']}: {e}")

    # Update floating drawdown in RMS to protect against runaway floating losses
    risk_manager.update_floating_drawdown(total_unrealized_pnl)

    # 3. Match Pending LIMIT Orders
    pending_orders = [o for o in orders if o.get("status") == "PENDING"]
    for o in pending_orders:
        sym = o["symbol"].upper()
        cur_p = price_map.get(sym)
        if not cur_p:
            continue

        target_p = float(o.get("target_price") or o["price"])
        side = o["side"].upper()
        otype = o.get("type", "LIMIT").upper()
        filled = False

        if otype == "LIMIT":
            if side == "BUY" and cur_p <= target_p:
                filled = True
            elif side == "SELL" and cur_p >= target_p:
                filled = True
        elif otype in ["STOP", "SL-M"]:
            if side == "BUY" and cur_p >= target_p:
                filled = True
            elif side == "SELL" and cur_p <= target_p:
                filled = True

        if filled:
            fill_pending_order(o["id"], cur_p)
            matched_orders += 1

    # 4. If Algo Bot is Active, Evaluate Multi-Strategy Signals (LONG and SHORT)
    if account.get("bot_active") and not is_square_off_time and not risk_manager.kill_switch_tripped:
        strat_id = account.get("bot_strategy_id", "vwap_supertrend")
        strategy_symbols = {
            "vwap_supertrend": "NIFTY50",
            "ema_crossover": "BANKNIFTY",
            "rsi_mean_reversion": "NIFTY50",
            "donchian_breakout": "RELIANCE",
        }
        target_symbol = strategy_symbols.get(strat_id, "NIFTY50")
        cur_price = price_map.get(target_symbol, 24500.0)

        # Check if an open position already exists on target_symbol
        has_pos = any(p["symbol"].upper() == target_symbol for p in positions)

        if not has_pos:
            candles = await get_real_historical_candles(target_symbol, timeframe="5m", limit=35)
            if len(candles) >= 20:
                store = IndicatorStore(candles)
                last_idx = len(candles) - 1

                signal_side: Optional[str] = None
                trigger_note = ""

                if strat_id == "vwap_supertrend":
                    st = store.get_value({"type": "SUPERTREND", "params": {"period": 10, "multiplier": 3.0}}, last_idx)
                    vwap_val = store.get_value({"type": "VWAP"}, last_idx)
                    if st and vwap_val:
                        if cur_price > vwap_val and st.get("trend") == 1:
                            signal_side = "BUY"
                            trigger_note = "Price > VWAP & Supertrend Bullish"
                        elif cur_price < vwap_val and st.get("trend") == -1:
                            signal_side = "SELL"
                            trigger_note = "Price < VWAP & Supertrend Bearish"

                elif strat_id == "ema_crossover":
                    e9 = store.get_value({"type": "EMA", "params": {"period": 9}, "offset": 1}, last_idx)
                    e21 = store.get_value({"type": "EMA", "params": {"period": 21}, "offset": 1}, last_idx)
                    if e9 and e21:
                        if e9 > e21:
                            signal_side = "BUY"
                            trigger_note = "EMA(9) Bullish Cross EMA(21)"
                        elif e9 < e21:
                            signal_side = "SELL"
                            trigger_note = "EMA(9) Bearish Cross EMA(21)"

                elif strat_id == "rsi_mean_reversion":
                    rsi_val = store.get_value({"type": "RSI", "params": {"period": 14}, "offset": 1}, last_idx)
                    if rsi_val:
                        if rsi_val < 32.0:
                            signal_side = "BUY"
                            trigger_note = f"RSI Oversold ({round(rsi_val, 1)} < 32)"
                        elif rsi_val > 68.0:
                            signal_side = "SELL"
                            trigger_note = f"RSI Overbought ({round(rsi_val, 1)} > 68)"

                elif strat_id == "donchian_breakout":
                    highs = [c["high"] for c in candles[last_idx-20:last_idx]]
                    lows = [c["low"] for c in candles[last_idx-20:last_idx]]
                    highest_20 = max(highs) if highs else cur_price
                    lowest_20 = min(lows) if lows else cur_price
                    if cur_price >= highest_20:
                        signal_side = "BUY"
                        trigger_note = f"20-Period High Breakout (₹{cur_price:.2f} >= ₹{highest_20:.2f})"
                    elif cur_price <= lowest_20:
                        signal_side = "SELL"
                        trigger_note = f"20-Period Low Breakdown (₹{cur_price:.2f} <= ₹{lowest_20:.2f})"

                if signal_side and float(account.get("cash_balance", 0)) >= cur_price:
                    alloc = min(float(account["cash_balance"]) * 0.10, 50000.0)
                    qty = max(1, int(alloc / cur_price)) if cur_price > 0 else 1

                    # Mathematically computed initial Stop-Loss and Take-Profit
                    if signal_side == "BUY":
                        sl_price = round(cur_price * 0.985, 2)  # 1.5% SL
                        tp_price = round(cur_price * 1.030, 2)  # 3.0% TP (1:2 Risk/Reward)
                    else:
                        sl_price = round(cur_price * 1.015, 2)
                        tp_price = round(cur_price * 0.970, 2)

                    order_res = execute_paper_market_order(
                        symbol=target_symbol,
                        side=signal_side,
                        quantity=qty,
                        price=cur_price,
                        take_profit=tp_price,
                        stop_loss=sl_price,
                        is_algo=True,
                        note=f"Algo Bot [{strat_id}]: {trigger_note}",
                        trailing_stop_enabled=True,
                        trailing_stop_pct=0.015,
                    )
                    if order_res.get("status") == "FILLED":
                        bot_signals_fired += 1

    return {
        "status": "success",
        "matched_orders": matched_orders,
        "closed_positions": closed_positions,
        "bot_signals_fired": bot_signals_fired,
        "active_positions_count": len(positions),
    }


def execute_paper_market_order(
    symbol: str,
    side: str,
    quantity: float,
    price: float,
    take_profit: Optional[float] = None,
    stop_loss: Optional[float] = None,
    is_algo: bool = False,
    note: Optional[str] = None,
    product_type: str = "MIS",
    trailing_stop_enabled: bool = True,
    trailing_stop_pct: float = 0.015,
) -> Dict[str, Any]:
    """
    Places and fills a paper market order subject to strict pre-trade RMS guards:
    - Blocks orders if Kill Switch is active, consecutive loss cooldown is running, or risk ceiling is reached.
    - Accurately deducts initial margin without double-deducting brokerage on entry.
    """
    supabase = get_supabase_client()
    account = get_paper_account()
    cur_cash = float(account.get("cash_balance", 1000000.0))
    positions = get_open_positions()

    order_cost = price * quantity

    # PRE-TRADE RMS VALIDATION
    rms_check = risk_manager.validate_pre_trade(
        order_cost=order_cost,
        available_cash=cur_cash,
        current_open_positions_count=len(positions),
    )
    if not rms_check["allowed"]:
        logger.warning(f"🚨 [RMS Intercept] Order rejected for {symbol}: {rms_check['reason']}")
        return {"status": "rejected", "reason": rms_check["reason"]}

    order_id = f"ord-{int(time.time()*1000)}"

    # Update account cash: margin blocked (brokerage is deducted on roundtrip close)
    new_cash = max(0.0, cur_cash - order_cost)

    # 1. Insert Order
    order_row = {
        "id": order_id,
        "symbol": symbol,
        "side": side,
        "type": "MARKET",
        "price": price,
        "quantity": quantity,
        "total_value": round(order_cost, 2),
        "status": "FILLED",
        "take_profit": take_profit,
        "stop_loss": stop_loss,
        "is_algo_trade": is_algo,
        "note": note or "Market Order Executed",
    }
    supabase.table("paper_orders").insert(order_row).execute()

    # 2. Open Position
    pos_id = f"pos-{int(time.time()*1000)}"
    pos_row = {
        "id": pos_id,
        "symbol": symbol,
        "side": "LONG" if side == "BUY" else "SHORT",
        "quantity": quantity,
        "entry_price": price,
        "current_price": price,
        "margin_used": round(order_cost, 2),
        "take_profit": take_profit,
        "stop_loss": stop_loss,
        "product_type": product_type,
        "trailing_stop_enabled": trailing_stop_enabled,
        "trailing_stop_pct": trailing_stop_pct,
        "unrealized_pnl": 0.0,
        "unrealized_pnl_percent": 0.0,
    }
    supabase.table("paper_positions").insert(pos_row).execute()

    # 3. Update Account Cash
    supabase.table("paper_account").update({"cash_balance": round(new_cash, 2)}).eq("id", "default").execute()

    # 4. Log Bot Activity if algo
    if is_algo:
        log_row = {
            "id": f"log-{int(time.time()*1000)}",
            "type": "ORDER",
            "message": f"Algo Bot Auto-{side}: {quantity} {symbol} @ ₹{price} ({note})",
            "timestamp": time.strftime("%H:%M:%S"),
        }
        supabase.table("paper_bot_logs").insert(log_row).execute()

    return {"orderId": order_id, "positionId": pos_id, "status": "FILLED"}


def fill_pending_order(order_id: str, current_price: float):
    """Executes a previously PENDING limit or stop order."""
    supabase = get_supabase_client()
    try:
        res = supabase.table("paper_orders").select("*").eq("id", order_id).execute()
        if not res.data:
            return
        order = res.data[0]
        qty = float(order["quantity"])
        side = order["side"].upper()
        total_val = current_price * qty

        # Update order status to FILLED
        supabase.table("paper_orders").update({
            "status": "FILLED",
            "price": current_price,
            "total_value": round(total_val, 2),
            "executed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        }).eq("id", order_id).execute()

        # Create open position
        pos_id = f"pos-{int(time.time()*1000)}"
        supabase.table("paper_positions").insert({
            "id": pos_id,
            "symbol": order["symbol"],
            "side": "LONG" if side == "BUY" else "SHORT",
            "quantity": qty,
            "entry_price": current_price,
            "current_price": current_price,
            "margin_used": round(total_val, 2),
            "take_profit": order.get("take_profit"),
            "stop_loss": order.get("stop_loss"),
            "product_type": order.get("product_type", "MIS"),
            "trailing_stop_enabled": True,
            "trailing_stop_pct": 0.015,
            "unrealized_pnl": 0.0,
            "unrealized_pnl_percent": 0.0,
        }).execute()

        # Deduct margin from paper account
        acc = get_paper_account()
        cash = float(acc.get("cash_balance", 1000000.0))
        new_cash = max(0.0, cash - total_val)
        supabase.table("paper_account").update({"cash_balance": round(new_cash, 2)}).eq("id", "default").execute()
    except Exception as e:
        logger.error(f"Error filling pending order {order_id}: {e}")


def close_position(position_id: str, reason: str = "MANUAL_CLOSE", exit_price: Optional[float] = None):
    """
    Closes an open position, records realized P&L into paper_trades, updates cash,
    and reports trade outcome to RMS for emotion-free cooldown & daily loss tracking.
    """
    supabase = get_supabase_client()
    try:
        res = supabase.table("paper_positions").select("*").eq("id", position_id).execute()
        if not res.data:
            return None
        pos = res.data[0]
        entry_price = float(pos["entry_price"])
        p_exit = float(exit_price or pos.get("current_price") or entry_price)
        qty = float(pos["quantity"])
        side = pos["side"].upper()

        # Standard Indian ₹20 Buy + ₹20 Sell = ₹40 roundtrip flat brokerage
        if side in ["LONG", "BUY"]:
            realized_pnl = (p_exit - entry_price) * qty - 40.0
            pnl_pct = ((p_exit - entry_price) / entry_price) * 100.0
        else:
            realized_pnl = (entry_price - p_exit) * qty - 40.0
            pnl_pct = ((entry_price - p_exit) / entry_price) * 100.0

        # Inform RMS of trade outcome (updates daily loss, consecutive loss counter, anti-revenge cooldown)
        risk_manager.record_trade_outcome(realized_pnl)

        # 1. Insert into paper_trades
        trade_id = f"trade-{int(time.time()*1000)}"
        trade_row = {
            "id": trade_id,
            "symbol": pos["symbol"],
            "side": side,
            "quantity": qty,
            "entry_price": entry_price,
            "exit_price": p_exit,
            "realized_pnl": round(realized_pnl, 2),
            "realized_pnl_percent": round(pnl_pct, 2),
            "opened_at": pos.get("entry_time") or pos.get("created_at"),
            "close_reason": reason,
        }
        supabase.table("paper_trades").insert(trade_row).execute()

        # 2. Delete position from paper_positions
        supabase.table("paper_positions").delete().eq("id", position_id).execute()

        # 3. Update Account Cash
        account = get_paper_account()
        cash = float(account.get("cash_balance", 1000000.0))
        margin_used = float(pos.get("margin_used", entry_price * qty))
        new_cash = max(0.0, cash + margin_used + realized_pnl)
        supabase.table("paper_account").update({"cash_balance": round(new_cash, 2)}).eq("id", "default").execute()

        return trade_row
    except Exception as e:
        logger.error(f"Error closing position {position_id}: {e}")
        return None
