import math
import time
import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.db.supabase import get_supabase_client
from app.services.market_data_service import get_real_historical_candles

router = APIRouter()
logger = logging.getLogger("strategies_api")


class IndicatorModel(BaseModel):
    id: str
    type: str
    params: Dict[str, Any] = Field(default_factory=dict)
    subField: Optional[str] = None
    offset: int = 1


class ConditionModel(BaseModel):
    id: str
    leftIndicator: IndicatorModel
    operator: str
    compareType: str
    rightIndicator: Optional[IndicatorModel] = None
    rightValue: Optional[float] = None


class ConditionGroupModel(BaseModel):
    id: str
    logic: str = "AND"
    conditions: List[ConditionModel] = Field(default_factory=list)


class RiskManagementModel(BaseModel):
    stopLossType: str = "percentage"
    stopLossValue: float = 1.0
    takeProfitType: str = "percentage"
    takeProfitValue: float = 2.0
    useTrailingStop: bool = True
    trailingStopActivation: float = 1.0
    trailingStopStep: float = 0.5
    intradaySquareOff: bool = True
    squareOffTime: str = "15:15"
    maxHoldingBars: int = 36
    maxDailyDrawdownPct: float = 3.0
    maxConsecutiveLosses: int = 3


class PositionSizingModel(BaseModel):
    sizingType: str = "lots"
    sizingValue: float = 2.0
    lotSize: int = 25
    maxOpenPositions: int = 2
    maxLeverage: int = 1
    slippagePct: float = 0.02
    feePerOrder: float = 20.0  # ₹20 flat brokerage
    sttTaxPct: float = 0.0125


class StrategyConfigModel(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    category: str = "momentum"
    assetClass: str = "nse_fno"
    symbol: str = "NIFTY 50"
    productType: str = "MIS"
    currency: str = "INR"
    timeframe: str = "5m"
    direction: str = "long"
    orderType: str = "market"
    initialCapital: float = 100000.0  # ₹1,00,000 INR
    entryGroups: List[ConditionGroupModel] = Field(default_factory=list)
    customExitEnabled: bool = False
    exitGroups: List[ConditionGroupModel] = Field(default_factory=list)
    riskManagement: RiskManagementModel
    positionSizing: PositionSizingModel


@router.get("/")
def list_strategies():
    """Lists saved strategies from the Supabase database."""
    try:
        supabase = get_supabase_client()
        res = supabase.table("strategies").select("*").order("updated_at", desc=True).execute()
        return {"status": "success", "source": "database", "data": res.data or []}
    except Exception as e:
        logger.warning(f"Database query warning: {e}")
        return {"status": "fallback", "source": "local", "data": [], "message": str(e)}


@router.post("/")
def save_strategy(strategy: StrategyConfigModel):
    """Saves or updates a strategy in the Supabase database."""
    try:
        supabase = get_supabase_client()
        row = {
            "id": strategy.id,
            "name": strategy.name,
            "description": strategy.description,
            "category": strategy.category,
            "asset_class": strategy.assetClass,
            "symbol": strategy.symbol,
            "product_type": strategy.productType,
            "currency": strategy.currency,
            "timeframe": strategy.timeframe,
            "direction": strategy.direction,
            "order_type": strategy.orderType,
            "initial_capital": strategy.initialCapital,
            "entry_groups": [g.model_dump() for g in strategy.entryGroups],
            "custom_exit_enabled": strategy.customExitEnabled,
            "exit_groups": [g.model_dump() for g in strategy.exitGroups],
            "risk_management": strategy.riskManagement.model_dump(),
            "position_sizing": strategy.positionSizing.model_dump(),
        }
        res = supabase.table("strategies").upsert(row).execute()
        return {"status": "success", "source": "database", "data": res.data}
    except Exception as e:
        logger.warning(f"Database upsert warning: {e}")
        return {"status": "error", "message": str(e)}


@router.delete("/{strategy_id}")
def delete_strategy(strategy_id: str):
    """Deletes a strategy from the Supabase database."""
    try:
        supabase = get_supabase_client()
        res = supabase.table("strategies").delete().eq("id", strategy_id).execute()
        return {"status": "success", "deleted_id": strategy_id, "data": res.data}
    except Exception as e:
        logger.warning(f"Database delete warning: {e}")
        return {"status": "error", "message": str(e)}


@router.get("/templates")
def get_strategy_templates():
    """Returns curated Indian market strategy template configurations."""
    return [
        {
            "id": "template-nifty-vwap-supertrend",
            "name": "NIFTY 50 Intraday VWAP + Supertrend (MIS)",
            "category": "momentum",
            "segment": "NSE F&O",
            "symbol": "NIFTY 50",
            "timeframe": "5m",
            "direction": "long",
            "currency": "INR",
            "initialCapital": 100000,
        },
        {
            "id": "template-banknifty-scalper",
            "name": "BANKNIFTY 9/21 EMA Momentum Scalper (MIS)",
            "category": "scalping",
            "segment": "NSE F&O",
            "symbol": "BANKNIFTY",
            "timeframe": "3m",
            "direction": "long",
            "currency": "INR",
            "initialCapital": 200000,
        },
        {
            "id": "template-reliance-breakout",
            "name": "RELIANCE 20-Period High Breakout (CNC/MIS)",
            "category": "breakout",
            "segment": "NSE Cash",
            "symbol": "RELIANCE",
            "timeframe": "15m",
            "direction": "long",
            "currency": "INR",
            "initialCapital": 150000,
        },
    ]


@router.post("/validate")
def validate_strategy(strategy: StrategyConfigModel):
    """Validates structural soundness of the Indian market strategy configuration."""
    issues = []
    if not strategy.name.strip():
        issues.append("Strategy name cannot be empty.")
    if not strategy.entryGroups:
        issues.append("At least one entry condition block is required.")
    if strategy.riskManagement.stopLossValue <= 0:
        issues.append("Stop loss value must be greater than zero.")
    if strategy.riskManagement.takeProfitValue <= 0:
        issues.append("Take profit value must be greater than zero.")

    return {
        "valid": len(issues) == 0,
        "issues": issues,
    }


@router.post("/backtest")
async def run_strategy_backtest(strategy: StrategyConfigModel):
    """
    Executes algorithmic strategy backtest on real historical Indian market price series.
    Returns calculated metrics in INR (₹) factoring in flat ₹20 brokerage & STT taxes.
    """
    candles = await get_real_historical_candles(
        strategy.symbol, timeframe=strategy.timeframe, limit=120
    )

    initial_capital = strategy.initialCapital
    cash = initial_capital
    peak = initial_capital
    total_brokerage = 0.0

    s = strategy.symbol.upper()
    if "BANKNIFTY" in s:
        lot_size = 30
    elif "NIFTY" in s:
        lot_size = 65
    elif "RELIANCE" in s:
        lot_size = 250
    elif "CRUDEOIL" in s:
        lot_size = 100
    else:
        lot_size = strategy.positionSizing.lotSize or 1

    lots = int(strategy.positionSizing.sizingValue or 1)
    quantity = lots * lot_size

    trades = []
    equity_curve = []
    current_equity = initial_capital

    if len(candles) >= 15:
        closes = [c["close"] for c in candles]
        
        # Calculate moving averages for signal generation
        period = 9
        sma = []
        for i in range(len(closes)):
            if i < period - 1:
                sma.append(None)
            else:
                sma.append(sum(closes[i - period + 1 : i + 1]) / period)

        in_pos = False
        entry_price = 0.0
        entry_step = 0

        for i in range(period, len(candles) - 1):
            cur_close = closes[i]
            prev_close = closes[i - 1]
            cur_sma = sma[i]
            prev_sma = sma[i - 1]

            if not in_pos and cur_sma is not None and prev_sma is not None:
                # Signal on bar i, enter on bar i + 1 open (prevents look-ahead bias)
                if prev_close <= prev_sma and cur_close > cur_sma:
                    in_pos = True
                    entry_price = candles[i + 1]["open"]
                    entry_step = i + 1

            elif in_pos:
                high_p = candles[i]["high"]
                low_p = candles[i]["low"]
                sl_price = entry_price * (1.0 - (strategy.riskManagement.stopLossValue / 100.0))
                tp_price = entry_price * (1.0 + (strategy.riskManagement.takeProfitValue / 100.0))

                exit_reason = None
                exit_price = cur_close

                if low_p <= sl_price:
                    exit_reason = "Stop Loss"
                    exit_price = sl_price
                elif high_p >= tp_price:
                    exit_reason = "Take Profit"
                    exit_price = tp_price
                elif prev_close >= prev_sma and cur_close < cur_sma:
                    exit_reason = "Signal Exit"
                    exit_price = cur_close
                elif (i - entry_step) >= max(1, strategy.riskManagement.maxHoldingBars):
                    exit_reason = "Time Exit"
                    exit_price = cur_close

                if exit_reason:
                    in_pos = False
                    pnl_gross = (exit_price - entry_price) * quantity if strategy.direction.lower() != "short" else (entry_price - exit_price) * quantity
                    flat_brokerage = (strategy.positionSizing.feePerOrder or 20.0) * 2
                    turnover = (entry_price + exit_price) * quantity
                    stt = turnover * (strategy.positionSizing.sttTaxPct / 100.0)
                    total_fee = flat_brokerage + stt
                    total_brokerage += total_fee

                    pnl_net = round(pnl_gross - total_fee, 2)
                    pnl_pct = round(((exit_price - entry_price) / entry_price) * 100.0, 2)
                    current_equity = round(current_equity + pnl_net, 2)
                    if current_equity > peak:
                        peak = current_equity

                    dd_pct = round(((peak - current_equity) / peak) * 100.0, 2) if peak > 0 else 0.0

                    trades.append({
                        "id": f"trade-{len(trades)+1}",
                        "tradeNumber": len(trades) + 1,
                        "direction": strategy.direction.upper() if strategy.direction != "both" else "LONG",
                        "entryPrice": round(entry_price, 2),
                        "exitPrice": round(exit_price, 2),
                        "quantity": quantity,
                        "lotCount": lots if lot_size > 1 else None,
                        "pnl": pnl_net,
                        "pnlPct": pnl_pct,
                        "exitReason": exit_reason,
                        "durationBars": i - entry_step,
                    })

                    equity_curve.append({
                        "step": len(equity_curve) + 1,
                        "equity": current_equity,
                        "drawdownPct": dd_pct,
                    })

    if not equity_curve:
        equity_curve.append({"step": 1, "equity": initial_capital, "drawdownPct": 0.0})

    net_profit = round(current_equity - initial_capital, 2)
    net_profit_pct = round((net_profit / initial_capital) * 100, 2)
    wins = [t for t in trades if t["pnl"] > 0]
    losses = [t for t in trades if t["pnl"] < 0]

    gross_profit = sum(t["pnl"] for t in wins)
    gross_loss = abs(sum(t["pnl"] for t in losses))
    profit_factor = round(gross_profit / max(gross_loss, 1.0), 2) if gross_loss > 0 else (9.99 if gross_profit > 0 else 0.0)

    # Calculate actual return variance for Sharpe ratio
    returns = []
    for k in range(1, len(equity_curve)):
        prev_eq = equity_curve[k - 1]["equity"]
        cur_eq = equity_curve[k]["equity"]
        if prev_eq > 0:
            returns.append((cur_eq - prev_eq) / prev_eq)

    if len(returns) > 1:
        mean_ret = sum(returns) / len(returns)
        var = sum((r - mean_ret) ** 2 for r in returns) / (len(returns) - 1)
        std_ret = math.sqrt(var)
        sharpe = round((mean_ret / std_ret) * math.sqrt(252), 2) if std_ret > 0 else 0.0
    else:
        sharpe = 0.0

    result_payload = {
        "status": "success",
        "currency": "INR",
        "metrics": {
            "initialCapital": initial_capital,
            "netProfit": net_profit,
            "netProfitPct": net_profit_pct,
            "winRate": round((len(wins) / len(trades)) * 100, 1) if trades else 0.0,
            "profitFactor": profit_factor,
            "totalTrades": len(trades),
            "winningTrades": len(wins),
            "losingTrades": len(losses),
            "maxDrawdownPct": max(d["drawdownPct"] for d in equity_curve) if equity_curve else 0.0,
            "sharpeRatio": sharpe,
            "totalBrokeragePaid": round(total_brokerage, 2),
        },
        "equityCurve": equity_curve,
        "trades": trades,
    }

    # Persist backtest to Supabase if database is available
    try:
        supabase = get_supabase_client()
        supabase.table("backtest_results").insert({
            "id": f"bt-{int(time.time()*1000)}",
            "strategy_id": strategy.id,
            "strategy_name": strategy.name,
            "symbol": strategy.symbol,
            "currency": "INR",
            "timeframe": strategy.timeframe,
            "metrics": result_payload["metrics"],
            "equity_curve": result_payload["equityCurve"],
            "trades": result_payload["trades"],
        }).execute()
    except Exception as e:
        logger.info(f"Backtest DB logging skipped: {e}")

    return result_payload
