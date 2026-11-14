from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from app.services.backtest_engine import (
    BacktestRequest,
    BacktestResponse,
    run_backtest_simulation,
    ASSET_PROFILES,
)

router = APIRouter(prefix="/backtest", tags=["backtest"])

STRATEGY_DEFINITIONS = [
    {
        "id": "sma_crossover",
        "name": "SMA Crossover (Golden/Death Cross)",
        "description": "Trend-following strategy based on Fast vs Slow Simple Moving Average crossover.",
        "category": "Trend Following",
        "params": [
            {"key": "fast_period", "label": "Fast SMA Period", "type": "number", "default": 20, "min": 2, "max": 100},
            {"key": "slow_period", "label": "Slow SMA Period", "type": "number", "default": 50, "min": 5, "max": 300},
        ],
    },
    {
        "id": "ema_crossover",
        "name": "EMA Momentum Scalper",
        "description": "High-responsiveness exponential moving average crossover for trend continuation.",
        "category": "Trend Following",
        "params": [
            {"key": "fast_period", "label": "Fast EMA Period", "type": "number", "default": 9, "min": 2, "max": 50},
            {"key": "slow_period", "label": "Slow EMA Period", "type": "number", "default": 21, "min": 5, "max": 200},
        ],
    },
    {
        "id": "rsi_momentum",
        "name": "RSI Mean Reversion",
        "description": "Counter-trend strategy buying deeply oversold dips and selling at overbought exhaustion.",
        "category": "Mean Reversion",
        "params": [
            {"key": "rsi_period", "label": "RSI Period", "type": "number", "default": 14, "min": 2, "max": 50},
            {"key": "oversold", "label": "Oversold Level", "type": "number", "default": 30, "min": 10, "max": 45},
            {"key": "overbought", "label": "Overbought Level", "type": "number", "default": 70, "min": 55, "max": 90},
        ],
    },
    {
        "id": "macd_trend",
        "name": "MACD Histogram Divergence",
        "description": "Captures momentum shifts and trend reversals through MACD line and signal crossovers.",
        "category": "Momentum",
        "params": [
            {"key": "fast_period", "label": "Fast Period", "type": "number", "default": 12, "min": 2, "max": 50},
            {"key": "slow_period", "label": "Slow Period", "type": "number", "default": 26, "min": 10, "max": 100},
            {"key": "signal_period", "label": "Signal Period", "type": "number", "default": 9, "min": 2, "max": 50},
        ],
    },
    {
        "id": "bollinger_bands",
        "name": "Bollinger Bands Volatility Bounce",
        "description": "Statistical volatility band envelope trading buying bottom standard deviation touches.",
        "category": "Volatility",
        "params": [
            {"key": "bb_period", "label": "Period", "type": "number", "default": 20, "min": 5, "max": 100},
            {"key": "bb_std", "label": "Standard Deviation", "type": "number", "default": 2.0, "min": 1.0, "max": 4.0},
        ],
    },
]

AVAILABLE_SYMBOLS = [
    {"symbol": "BTC/USDT", "name": "Bitcoin", "category": "Crypto", "asset_class": "Crypto"},
    {"symbol": "ETH/USDT", "name": "Ethereum", "category": "Crypto", "asset_class": "Crypto"},
    {"symbol": "SOL/USDT", "name": "Solana", "category": "Crypto", "asset_class": "Crypto"},
    {"symbol": "NIFTY50", "name": "Nifty 50 Index", "category": "Indices", "asset_class": "Equities"},
    {"symbol": "BANKNIFTY", "name": "Bank Nifty Index", "category": "Indices", "asset_class": "Equities"},
    {"symbol": "AAPL", "name": "Apple Inc.", "category": "US Equities", "asset_class": "Equities"},
    {"symbol": "TSLA", "name": "Tesla Inc.", "category": "US Equities", "asset_class": "Equities"},
    {"symbol": "NVDA", "name": "NVIDIA Corp.", "category": "US Equities", "asset_class": "Equities"},
    {"symbol": "XAU/USD", "name": "Gold Spot", "category": "Commodities", "asset_class": "Commodities"},
]


@router.get("/strategies")
def get_strategies():
    """Returns all available algorithmic strategies with their parameter schemas."""
    return {"strategies": STRATEGY_DEFINITIONS}


@router.get("/symbols")
def get_symbols():
    """Returns supported assets and symbols for backtesting."""
    return {"symbols": AVAILABLE_SYMBOLS}


@router.post("/run", response_model=BacktestResponse)
def run_backtest(req: BacktestRequest):
    """Executes a backtest on the specified asset with custom risk and strategy parameters."""
    try:
        result = run_backtest_simulation(req)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backtesting simulation failed: {str(e)}")
