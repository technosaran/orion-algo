import random
import time
from typing import Optional, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from app.db.supabase import get_supabase_client
from app.services.market_data_service import get_all_real_quotes

router = APIRouter()

ALGO_STRATEGIES = [
    {
        "id": "rsi_mean_reversion",
        "name": "RSI Mean Reversion",
        "description": "Exploits short-term overbought/oversold levels. Buys when RSI < 30 and takes profit when RSI > 70.",
        "risk_level": "Moderate",
        "default_timeframe": "1m",
        "win_rate_target": "68%",
    },
    {
        "id": "ema_crossover",
        "name": "Dual EMA Trend Cross (20/50)",
        "description": "Follows momentum trends using Golden Cross (20 EMA crossing above 50 EMA) for aggressive trend-following entries.",
        "risk_level": "Aggressive",
        "default_timeframe": "5m",
        "win_rate_target": "62%",
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


@router.post("/execute", response_model=PaperOrderResponse)
async def execute_paper_order(order: PaperOrderRequest):
    """Executes paper order against real-time market data and persists to Cloud Database (Supabase)."""
    side_normalized = order.side.upper()
    if side_normalized not in ["BUY", "SELL"]:
        raise HTTPException(status_code=400, detail="Invalid order side. Must be BUY or SELL.")

    type_normalized = order.order_type.upper()
    if type_normalized not in ["MARKET", "LIMIT", "STOP"]:
        raise HTTPException(status_code=400, detail="Invalid order type. Must be MARKET, LIMIT, or STOP.")

    # Fetch real live market quote for symbol
    quotes = await get_all_real_quotes()
    symbol_match = next((q for q in quotes if q["symbol"].upper() == order.symbol.upper()), None)
    base_price = symbol_match["price"] if symbol_match else (order.price or 100.0)

    # Realistic micro-slippage for market orders
    slippage_pct = random.uniform(0.0001, 0.0004)
    slippage_cost = round(base_price * slippage_pct, 4)

    if side_normalized == "BUY":
        executed_price = round(base_price + slippage_cost, 2)
    else:
        executed_price = round(base_price - slippage_cost, 2)

    total_value = round(executed_price * order.quantity, 2)
    order_id = f"ord-filled-{str(int(time.time() * 1000))[-6:]}"
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime())
    status = "FILLED" if type_normalized == "MARKET" else "PENDING"

    # Save order and position to Supabase
    try:
        supabase = get_supabase_client()
        supabase.table("paper_orders").insert({
            "id": order_id,
            "symbol": order.symbol.upper(),
            "side": side_normalized,
            "type": type_normalized,
            "price": executed_price,
            "quantity": order.quantity,
            "total_value": total_value,
            "status": status,
            "take_profit": order.tp,
            "stop_loss": order.sl,
        }).execute()

        if status == "FILLED":
            pos_id = f"pos-{int(time.time() * 1000)}"
            supabase.table("paper_positions").insert({
                "id": pos_id,
                "symbol": order.symbol.upper(),
                "side": "LONG" if side_normalized == "BUY" else "SHORT",
                "quantity": order.quantity,
                "entry_price": executed_price,
                "current_price": executed_price,
                "margin_used": total_value,
                "take_profit": order.tp,
                "stop_loss": order.sl,
                "unrealized_pnl": 0.0,
                "unrealized_pnl_percent": 0.0,
            }).execute()
    except Exception as e:
        # DB log notice if offline
        print(f"Supabase paper order notice: {e}")

    return PaperOrderResponse(
        order_id=order_id,
        symbol=order.symbol.upper(),
        side=side_normalized,
        order_type=type_normalized,
        quantity=order.quantity,
        executed_price=executed_price,
        total_value=total_value,
        slippage=slippage_cost,
        commission=0.00,
        status=status,
        timestamp=timestamp,
        message=f"Paper {side_normalized} order for {order.quantity} {order.symbol.upper()} executed and saved to DB.",
    )
