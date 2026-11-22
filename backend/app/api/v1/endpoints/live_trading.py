"""
Orion Algo - Live Trading API Endpoints
Connects Indian brokers (Angel One, Zerodha), monitors RMS, and controls the Emergency Kill Switch.
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from app.brokers.risk_manager import risk_manager
from app.brokers.angel_one import AngelOneAdapter
from app.brokers.zerodha import ZerodhaAdapter
from app.brokers.base import BrokerOrderRequest

router = APIRouter(prefix="/live", tags=["live-trading"])

# Active broker session singleton in memory
_active_broker: Optional[Any] = None
_broker_name: Optional[str] = None


class BrokerConnectRequest(BaseModel):
    broker: str = Field(..., description="'angel_one' or 'zerodha'")
    api_key: str
    client_id: Optional[str] = None
    pin: Optional[str] = None
    totp_secret: Optional[str] = None
    access_token: Optional[str] = None


class LiveOrderRequest(BaseModel):
    symbol: str
    exchange: str = "NSE"
    transaction_type: str  # BUY or SELL
    order_type: str = "MARKET"
    quantity: int
    price: float = 0.0
    product_type: str = "INTRADAY"


@router.post("/connect")
async def connect_broker(req: BrokerConnectRequest):
    """Authenticates with the selected Indian broker."""
    global _active_broker, _broker_name

    if req.broker.lower() == "angel_one":
        if not (req.api_key and req.client_id and req.pin and req.totp_secret):
            raise HTTPException(status_code=400, detail="Angel One requires api_key, client_id, pin, and totp_secret.")
        adapter = AngelOneAdapter(
            api_key=req.api_key,
            client_id=req.client_id,
            pin=req.pin,
            totp_secret=req.totp_secret,
        )
        auth_res = await adapter.authenticate()
        if auth_res.get("success"):
            _active_broker = adapter
            _broker_name = "Angel One"
            return {"status": "success", "broker": "Angel One", "connected": True}
        else:
            raise HTTPException(status_code=401, detail=auth_res.get("message", "Authentication failed."))

    elif req.broker.lower() == "zerodha":
        if not (req.api_key and req.access_token):
            raise HTTPException(status_code=400, detail="Zerodha requires api_key and access_token.")
        adapter = ZerodhaAdapter(api_key=req.api_key, access_token=req.access_token)
        auth_res = await adapter.authenticate()
        if auth_res.get("success"):
            _active_broker = adapter
            _broker_name = "Zerodha Kite"
            return {"status": "success", "broker": "Zerodha Kite", "connected": True}
        else:
            raise HTTPException(status_code=401, detail=auth_res.get("message", "Authentication failed."))
    else:
        raise HTTPException(status_code=400, detail="Unsupported broker. Choose 'angel_one' or 'zerodha'.")


@router.get("/status")
def get_live_status():
    """Returns active broker connection status and RMS state."""
    return {
        "connected": _active_broker is not None and getattr(_active_broker, "authenticated", False),
        "broker": _broker_name,
        "killSwitchTripped": risk_manager.kill_switch_tripped,
        "isSquareOffTime": risk_manager.is_intraday_square_off_time(),
        "dailyRealizedLoss": risk_manager.daily_realized_loss,
        "maxDailyLossLimit": risk_manager.max_daily_loss,
    }


@router.get("/funds")
async def get_live_funds():
    """Returns live broker margins and balance."""
    if not _active_broker:
        return {"connected": False, "netCash": 0.0, "availableMargin": 0.0}
    return await _active_broker.get_funds()


@router.get("/positions")
async def get_live_positions():
    """Returns live open positions from the broker."""
    if not _active_broker:
        return {"connected": False, "positions": []}
    positions = await _active_broker.get_positions()
    return {"connected": True, "positions": positions}


@router.post("/orders")
async def place_live_order(order: LiveOrderRequest):
    """Places a live order subject to pre-trade RMS validation."""
    if not _active_broker:
        raise HTTPException(status_code=400, detail="No broker connected for live execution.")

    # 1. Fetch available funds for RMS
    funds = await _active_broker.get_funds()
    avail_cash = float(funds.get("availableMargin") or funds.get("netCash") or 50000.0)
    positions = await _active_broker.get_positions()
    open_pos_count = len([p for p in positions if int(p.get("quantity") or p.get("netqty") or 0) != 0])

    # Estimate realistic order value from live quotes if MARKET order
    est_price = order.price
    if est_price <= 0:
        quotes = await get_all_real_quotes()
        price_map = {q["symbol"].upper(): q["price"] for q in quotes}
        est_price = price_map.get(order.symbol.upper(), 24500.0 if "NIFTY" in order.symbol.upper() else 1000.0)

    est_cost = est_price * order.quantity

    # 2. RMS Pre-Trade Validation
    rms_check = risk_manager.validate_pre_trade(est_cost, avail_cash, open_pos_count)
    if not rms_check["allowed"]:
        raise HTTPException(status_code=403, detail=f"RMS Rejected: {rms_check['reason']}")

    # 3. Submit Order
    req = BrokerOrderRequest(
        symbol=order.symbol,
        exchange=order.exchange,
        transaction_type=order.transaction_type,
        order_type=order.order_type,
        product_type=order.product_type,
        quantity=order.quantity,
        price=order.price,
    )
    res = await _active_broker.place_order(req)
    return res


@router.post("/kill-switch")
async def emergency_kill_switch():
    """Emergency Kill Switch: Trips RMS and squares off all positions on live broker."""
    risk_manager.trip_kill_switch("EMERGENCY KILL SWITCH TRIGGERED VIA API")
    if _active_broker:
        res = await _active_broker.square_off_all()
        return {"status": "success", "kill_switch": "ACTIVATED", "broker_action": res}
    return {"status": "success", "kill_switch": "ACTIVATED", "broker_action": "No live broker connected"}


class RMSConfigRequest(BaseModel):
    max_daily_loss: Optional[float] = None
    max_capital_per_trade_pct: Optional[float] = None
    max_open_positions: Optional[int] = None
    auto_square_off_time: Optional[str] = None


@router.post("/disconnect")
async def disconnect_broker():
    """Disconnects the current active broker."""
    global _active_broker, _broker_name
    _active_broker = None
    _broker_name = None
    return {"status": "success", "connected": False}


@router.get("/orders")
async def get_live_orders():
    """Returns today's order book from the connected broker."""
    if not _active_broker:
        return {"connected": False, "orders": []}
    orders = await _active_broker.get_orders()
    return {"connected": True, "orders": orders}


@router.post("/square-off-all")
async def square_off_all_positions():
    """Closes all live positions across the connected broker."""
    if _active_broker:
        res = await _active_broker.square_off_all()
        return {"status": "success", "broker_action": res}
    return {"status": "success", "broker_action": "No active broker connected"}


@router.post("/rms/config")
def update_rms_config(req: RMSConfigRequest):
    """Updates live risk management system limits dynamically."""
    if req.max_daily_loss is not None:
        risk_manager.max_daily_loss = req.max_daily_loss
    if req.max_capital_per_trade_pct is not None:
        risk_manager.max_capital_per_trade_pct = req.max_capital_per_trade_pct
    if req.max_open_positions is not None:
        risk_manager.max_open_positions = req.max_open_positions
    if req.auto_square_off_time is not None:
        risk_manager.auto_square_off_time = req.auto_square_off_time

    return {
        "status": "success",
        "rms": {
            "maxDailyLoss": risk_manager.max_daily_loss,
            "maxCapitalPerTradePct": risk_manager.max_capital_per_trade_pct,
            "maxOpenPositions": risk_manager.max_open_positions,
            "autoSquareOffTime": risk_manager.auto_square_off_time,
        },
    }


@router.post("/kill-switch/reset")
def reset_kill_switch():
    """Resets the RMS kill switch to standby."""
    risk_manager.reset_kill_switch()
    return {"status": "success", "kill_switch": "STANDBY"}
