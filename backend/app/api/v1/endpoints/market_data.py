from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException
from app.services.market_data_service import (
    get_all_real_quotes,
    get_real_historical_candles,
    SYMBOL_MAPPINGS,
)

router = APIRouter(prefix="/market-data", tags=["market-data"])


@router.get("/quotes")
async def get_quotes():
    """Retrieves live real-time market quotes for all tracked assets from Binance & Yahoo Finance."""
    quotes = await get_all_real_quotes()
    return {
        "quotes": quotes,
        "count": len(quotes),
        "status": "success",
        "providers": ["Binance Public API", "Yahoo Finance API"],
    }


@router.get("/quote/{symbol}")
async def get_single_quote(symbol: str):
    """Retrieves a single live quote for a specific ticker symbol."""
    quotes = await get_all_real_quotes()
    found = next((q for q in quotes if q["symbol"].upper() == symbol.upper()), None)
    if not found:
        # Check if user passed symbol without slash e.g. BTCUSDT
        found = next((q for q in quotes if q["symbol"].replace("/", "").upper() == symbol.upper()), None)

    if not found:
        raise HTTPException(status_code=404, detail=f"Quote for symbol '{symbol}' not found.")
    return found


@router.get("/history/{symbol}")
async def get_historical_candles(
    symbol: str,
    timeframe: str = Query(default="15m", pattern="^(1m|5m|15m|1h|1D)$"),
    limit: int = Query(default=60, ge=10, le=300),
):
    """Retrieves real historical OHLCV candlestick data from external providers."""
    # Handle URL encoded slashes e.g. BTC/USDT or BTC%2FUSDT
    clean_symbol = symbol.replace("%2F", "/").upper()
    candles = await get_real_historical_candles(clean_symbol, timeframe, limit)

    if not candles:
        raise HTTPException(
            status_code=404,
            detail=f"Historical candle data for symbol '{clean_symbol}' unavailable.",
        )

    return {
        "symbol": clean_symbol,
        "timeframe": timeframe,
        "count": len(candles),
        "candles": candles,
        "provider": "Binance" if "USDT" in clean_symbol else "Yahoo Finance",
    }


@router.get("/supported-symbols")
def get_supported_symbols():
    """Returns the dictionary of all symbols mapped to real external API data sources."""
    return {
        "symbols": [
            {
                "symbol": sym,
                "name": data["name"],
                "category": data["category"],
                "provider": "Binance API" if data["source"] == "binance" else "Yahoo Finance API",
                "feed_type": "24/7 Live Stream" if data["category"] == "crypto" else "Real-time Equities / Indices",
            }
            for sym, data in SYMBOL_MAPPINGS.items()
        ]
    }
