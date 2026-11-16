import random
import time
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from app.db.supabase import get_supabase_client
from app.services.market_data_service import get_all_real_quotes
from app.services.paper_matcher import (
    get_paper_account,
    get_open_positions,
    get_orders,
    get_trades_history,
    process_paper_engine_tick,
    execute_paper_market_order,
    close_position,
)

router = APIRouter()

ALGO_STRATEGIES = [
    {
        "id": "rsi_mean_reversion",
        "name": "RSI Mean Reversion",
        "description": "Exploits short-term overbought/oversold levels. Buys when RSI < 32 and takes profit when RSI > 68.",
        "risk_level": "Moderate",
        "default_timeframe": "1m",
        "win_rate_target": "68%",
    },
    {
        "id": "ema_crossover",
        "name": "Dual EMA Trend Cross (9/21)",
        "description": "Follows momentum trends using Golden Cross (9 EMA crossing above 21 EMA) for quick continuation entries.",
        "risk_level": "Aggressive",
        "default_timeframe": "5m",
        "win_rate_target": "64%",
    },
    {
        "id": "bb_volatility_scalper",
        "name": "Bollinger Bands Volatility Scalper",
        "description": "Scalps small swings between 2.0 standard deviation bands during consolidation channels.",
        "risk_level": "Conservative",
        "default_timeframe": "1m",
        "win_rate_target": "74%",
    },
]


class PaperOrderRequest(BaseModel):
    symbol: str = Field(..., description="Ticker symbol e.g. NIFTY50, RELIANCE, BTC/USDT")
    side: str = Field(..., description="'BUY' or 'SELL'")
    order_type: str = Field(default="MARKET", description="'MARKET', 'LIMIT', or 'STOP'")
    quantity: float = Field(..., gt=0, description="Number of shares or units")
    price: Optional[float] = Field(None, gt=0, description="Target limit or stop price")
    tp: Optional[float] = Field(None, description="Take profit target price")
    sl: Optional[float] = Field(None, description="Stop loss protection price")


class PaperOrderResponse(BaseModel):
    order_id: str
    symbol: str
    side: str
    order_type: str
    quantity: float
    executed_price: float
    total_value: float
    slippage: float
    commission: float
    status: str
    timestamp: str
    message: str


@router.get("/symbols")
async def get_symbols():
    """Returns real-time paper trading assets with live market prices from Binance & Yahoo Finance."""
    quotes = await get_all_real_quotes()
    return {"symbols": quotes}


@router.get("/strategies")
def get_strategies():
    """Returns supported algorithmic paper trading strategies."""
    return {"strategies": ALGO_STRATEGIES}


@router.get("/account")
def get_account():
    """Returns current paper trading account state from Cloud Database."""
    return get_paper_account()


@router.get("/positions")
def get_positions():
    """Returns all active open positions."""
    return {"positions": get_open_positions()}


@router.get("/orders")
def get_orders_list():
    """Returns recent paper orders."""
    return {"orders": get_orders()}


@router.get("/history")
def get_history():
    """Returns closed trade history and realized P&L."""
    return {"history": get_trades_history()}


@router.post("/execute", response_model=PaperOrderResponse)
async def execute_paper_order(order: PaperOrderRequest):
    """Executes paper order against real-time market data and persists to Supabase."""
    side_normalized = order.side.upper()
    if side_normalized not in ["BUY", "SELL"]:
        raise HTTPException(status_code=400, detail="Invalid order side. Must be BUY or SELL.")

    type_normalized = order.order_type.upper()
    if type_normalized not in ["MARKET", "LIMIT", "STOP"]:
        raise HTTPException(status_code=400, detail="Invalid order type. Must be MARKET, LIMIT, or STOP.")

    quotes = await get_all_real_quotes()
    symbol_match = next((q for q in quotes if q["symbol"].upper() == order.symbol.upper()), None)
    base_price = symbol_match["price"] if symbol_match else (order.price or 1000.0)

    # Realistic micro-slippage for market orders
    slippage_pct = random.uniform(0.0001, 0.0004) if type_normalized == "MARKET" else 0.0
    slippage_cost = round(base_price * slippage_pct, 4)
    executed_price = round(base_price + slippage_cost if side_normalized == "BUY" else base_price - slippage_cost, 2)
    total_value = round(executed_price * order.quantity, 2)

    order_id = f"ord-{int(time.time() * 1000)}"
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

    if type_normalized == "MARKET":
        res = execute_paper_market_order(
            symbol=order.symbol.upper(),
            side=side_normalized,
            quantity=order.quantity,
            price=executed_price,
            take_profit=order.tp,
            stop_loss=order.sl,
            is_algo=False,
            note="Manual Ticket Order",
        )
        status = "FILLED"
    else:
        # Save LIMIT or STOP order as PENDING
        supabase = get_supabase_client()
        supabase.table("paper_orders").insert({
            "id": order_id,
            "symbol": order.symbol.upper(),
            "side": side_normalized,
            "type": type_normalized,
            "price": order.price or executed_price,
            "target_price": order.price or executed_price,
            "quantity": order.quantity,
            "total_value": total_value,
            "status": "PENDING",
            "take_profit": order.tp,
            "stop_loss": order.sl,
            "is_algo_trade": False,
            "note": f"{type_normalized} Order placed at ₹{order.price}",
        }).execute()
        status = "PENDING"

    return PaperOrderResponse(
        order_id=order_id,
        symbol=order.symbol.upper(),
        side=side_normalized,
        order_type=type_normalized,
        quantity=order.quantity,
        executed_price=executed_price,
        total_value=total_value,
        slippage=slippage_cost,
        commission=20.0,
        status=status,
        timestamp=timestamp,
        message=f"Paper {type_normalized} {side_normalized} order for {order.quantity} {order.symbol.upper()} placed successfully.",
    )


@router.post("/close-position/{position_id}")
async def close_paper_position(position_id: str):
    """Closes an open position at current market price."""
    quotes = await get_all_real_quotes()
    price_map = {q["symbol"].upper(): q["price"] for q in quotes}

    positions = get_open_positions()
    target_pos = next((p for p in positions if p["id"] == position_id), None)
    if not target_pos:
        raise HTTPException(status_code=404, detail="Position not found.")

    cur_p = price_map.get(target_pos["symbol"].upper(), float(target_pos.get("current_price", 1000.0)))
    result = close_position(position_id, reason="MANUAL_CLOSE", exit_price=cur_p)
    return {"status": "success", "closed_trade": result}


@router.post("/cancel-order/{order_id}")
def cancel_paper_order(order_id: str):
    """Cancels a pending limit or stop order."""
    supabase = get_supabase_client()
    try:
        supabase.table("paper_orders").update({"status": "CANCELLED"}).eq("id", order_id).execute()
        return {"status": "success", "order_id": order_id, "status_text": "CANCELLED"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tick")
async def trigger_engine_tick():
    """Runs a matching engine tick cycle against live prices and active algo strategies."""
    res = await process_paper_engine_tick()
    return res


@router.post("/bot/toggle")
def toggle_algo_bot(active: Optional[bool] = None, strategy_id: Optional[str] = None):
    """Turns the server-side autonomous paper bot on or off."""
    supabase = get_supabase_client()
    account = get_paper_account()
    next_active = not account.get("bot_active", False) if active is None else active
    update_data: Dict[str, Any] = {"bot_active": next_active}
    if strategy_id:
        update_data["bot_strategy_id"] = strategy_id

    supabase.table("paper_account").update(update_data).eq("id", "default").execute()
    return {
        "status": "success",
        "bot_active": next_active,
        "bot_strategy_id": strategy_id or account.get("bot_strategy_id"),
    }
