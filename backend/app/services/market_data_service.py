import asyncio
import time
import logging
from typing import Dict, List, Optional, Any
import httpx

logger = logging.getLogger("market_data")

# Symbol mappings for external APIs
SYMBOL_MAPPINGS: Dict[str, Dict[str, str]] = {
    "BTC/USDT": {"source": "binance", "ticker": "BTCUSDT", "name": "Bitcoin", "category": "crypto"},
    "ETH/USDT": {"source": "binance", "ticker": "ETHUSDT", "name": "Ethereum", "category": "crypto"},
    "SOL/USDT": {"source": "binance", "ticker": "SOLUSDT", "name": "Solana", "category": "crypto"},
    "NVDA": {"source": "yahoo", "ticker": "NVDA", "name": "NVIDIA Corporation", "category": "stock"},
    "AAPL": {"source": "yahoo", "ticker": "AAPL", "name": "Apple Inc.", "category": "stock"},
    "TSLA": {"source": "yahoo", "ticker": "TSLA", "name": "Tesla, Inc.", "category": "stock"},
    "MSFT": {"source": "yahoo", "ticker": "MSFT", "name": "Microsoft Corporation", "category": "stock"},
    "SPY": {"source": "yahoo", "ticker": "SPY", "name": "SPDR S&P 500 ETF", "category": "index"},
    "QQQ": {"source": "yahoo", "ticker": "QQQ", "name": "Invesco QQQ Trust", "category": "index"},
    "NIFTY50": {"source": "yahoo", "ticker": "^NSEI", "name": "NIFTY 50 Index", "category": "index"},
    "BANKNIFTY": {"source": "yahoo", "ticker": "^NSEBANK", "name": "Bank Nifty Index", "category": "index"},
    "XAU/USD": {"source": "yahoo", "ticker": "GC=F", "name": "Gold Spot", "category": "commodity"},
}

# Cache storage with timestamp
_QUOTES_CACHE: Dict[str, Any] = {}
_LAST_QUOTES_FETCH: float = 0
_CANDLES_CACHE: Dict[str, Any] = {}
CACHE_TTL_QUOTES = 3.0  # 3 seconds cache
CACHE_TTL_CANDLES = 15.0  # 15 seconds cache

YAHOO_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


async def fetch_binance_quote(client: httpx.AsyncClient, canonical_symbol: str, ticker: str) -> Optional[Dict[str, Any]]:
    """Fetches real-time 24hr ticker from Binance Public API."""
    url = f"https://api.binance.com/api/v3/ticker/24hr?symbol={ticker}"
    try:
        res = await client.get(url, timeout=6.0)
        if res.status_code == 200:
            data = res.json()
            price = float(data.get("lastPrice", 0))
            change_24h = float(data.get("priceChangePercent", 0))
            high_24h = float(data.get("highPrice", 0))
            low_24h = float(data.get("lowPrice", 0))
            volume_num = float(data.get("volume", 0))
            volume_str = f"{volume_num / 1000:.1f}K" if volume_num < 1000000 else f"{volume_num / 1000000:.1f}M"

            meta = SYMBOL_MAPPINGS.get(canonical_symbol, {})
            return {
                "symbol": canonical_symbol,
                "name": meta.get("name", canonical_symbol),
                "category": meta.get("category", "crypto"),
                "price": round(price, 2 if price > 100 else 4),
                "change24h": round(change_24h, 2),
                "high24h": round(high_24h, 2 if high_24h > 100 else 4),
                "low24h": round(low_24h, 2 if low_24h > 100 else 4),
                "volume": volume_str,
                "basePrice": round(price - (price * (change_24h / 100)), 2),
                "spread": round(price * 0.0001, 2 if price > 100 else 4),
                "source": "Binance API",
                "timestamp": int(time.time() * 1000),
            }
    except Exception as e:
        logger.warning(f"Error fetching Binance quote for {ticker}: {e}")
    return None


async def fetch_yahoo_quote(client: httpx.AsyncClient, canonical_symbol: str, ticker: str) -> Optional[Dict[str, Any]]:
    """Fetches real-time market quote from Yahoo Finance API."""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=5d"
    try:
        res = await client.get(url, headers=YAHOO_HEADERS, timeout=6.0)
        if res.status_code == 200:
            data = res.json()
            result = data.get("chart", {}).get("result", [])
            if result:
                meta = result[0].get("meta", {})
                price = float(meta.get("regularMarketPrice", 0))
                prev_close = float(meta.get("chartPreviousClose") or meta.get("previousClose") or price)
                change_24h = ((price - prev_close) / prev_close) * 100 if prev_close > 0 else 0
                high_24h = float(meta.get("regularMarketDayHigh") or price)
                low_24h = float(meta.get("regularMarketDayLow") or price)
                vol = meta.get("regularMarketVolume", 0)
                vol_str = f"{vol / 1000000:.1f}M" if vol > 1000000 else f"{vol / 1000:.1f}K"

                symbol_meta = SYMBOL_MAPPINGS.get(canonical_symbol, {})
                return {
                    "symbol": canonical_symbol,
                    "name": symbol_meta.get("name", canonical_symbol),
                    "category": symbol_meta.get("category", "stock"),
                    "price": round(price, 2),
                    "change24h": round(change_24h, 2),
                    "high24h": round(high_24h, 2),
                    "low24h": round(low_24h, 2),
                    "volume": vol_str,
                    "basePrice": round(prev_close, 2),
                    "spread": round(price * 0.0002, 2),
                    "source": "Yahoo Finance API",
                    "timestamp": int(time.time() * 1000),
                }
    except Exception as e:
        logger.warning(f"Error fetching Yahoo quote for {ticker}: {e}")
    return None


async def get_all_real_quotes() -> List[Dict[str, Any]]:
    """Fetches real-time quotes for all symbols concurrently with caching."""
    global _QUOTES_CACHE, _LAST_QUOTES_FETCH

    now = time.time()
    if _QUOTES_CACHE and (now - _LAST_QUOTES_FETCH) < CACHE_TTL_QUOTES:
        return list(_QUOTES_CACHE.values())

    async with httpx.AsyncClient(timeout=8.0) as client:
        tasks = []
        for symbol, conf in SYMBOL_MAPPINGS.items():
            if conf["source"] == "binance":
                tasks.append(fetch_binance_quote(client, symbol, conf["ticker"]))
            else:
                tasks.append(fetch_yahoo_quote(client, symbol, conf["ticker"]))

        results = await asyncio.gather(*tasks, return_exceptions=True)

    quotes = []
    for r in results:
        if isinstance(r, dict) and r.get("price"):
            quotes.append(r)
            _QUOTES_CACHE[r["symbol"]] = r

    _LAST_QUOTES_FETCH = now
    return quotes if quotes else list(_QUOTES_CACHE.values())


async def fetch_binance_candles(
    client: httpx.AsyncClient, ticker: str, timeframe: str, limit: int = 60
) -> List[Dict[str, Any]]:
    """Fetches historical OHLCV klines from Binance."""
    interval_map = {"1m": "1m", "5m": "5m", "15m": "15m", "1h": "1h", "1D": "1d"}
    interval = interval_map.get(timeframe, "15m")
    url = f"https://api.binance.com/api/v3/klines?symbol={ticker}&interval={interval}&limit={limit}"

    res = await client.get(url, timeout=8.0)
    if res.status_code != 200:
        return []

    data = res.json()
    candles = []
    for item in data:
        timestamp = int(item[0])
        dt = time.strftime("%H:%M" if timeframe != "1D" else "%b %d", time.gmtime(timestamp / 1000))
        candles.append({
            "time": dt,
            "timestamp": timestamp,
            "open": round(float(item[1]), 2),
            "high": round(float(item[2]), 2),
            "low": round(float(item[3]), 2),
            "close": round(float(item[4]), 2),
            "volume": round(float(item[5]), 2),
        })
    return candles


async def fetch_yahoo_candles(
    client: httpx.AsyncClient, ticker: str, timeframe: str, limit: int = 60
) -> List[Dict[str, Any]]:
    """Fetches historical OHLCV candles from Yahoo Finance."""
    interval_map = {
        "1m": ("1m", "1d"),
        "5m": ("5m", "1d"),
        "15m": ("15m", "5d"),
        "1h": ("1h", "1mo"),
        "1D": ("1d", "3mo"),
    }
    interval, range_param = interval_map.get(timeframe, ("15m", "5d"))
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval={interval}&range={range_param}"

    res = await client.get(url, headers=YAHOO_HEADERS, timeout=8.0)
    if res.status_code != 200:
        return []

    data = res.json()
    results = data.get("chart", {}).get("result", [])
    if not results:
        return []

    result = results[0]
    timestamps = result.get("timestamp", [])
    indicators = result.get("indicators", {}).get("quote", [{}])[0]

    opens = indicators.get("open", [])
    highs = indicators.get("high", [])
    lows = indicators.get("low", [])
    closes = indicators.get("close", [])
    volumes = indicators.get("volume", [])

    candles = []
    for t, o, h, l, c, v in zip(timestamps, opens, highs, lows, closes, volumes):
        if c is not None and o is not None:
            dt = time.strftime("%H:%M" if timeframe != "1D" else "%b %d", time.gmtime(t))
            candles.append({
                "time": dt,
                "timestamp": t * 1000,
                "open": round(float(o), 2),
                "high": round(float(h or o), 2),
                "low": round(float(l or o), 2),
                "close": round(float(c), 2),
                "volume": int(v or 0),
            })

    return candles[-limit:]


async def get_real_historical_candles(symbol: str, timeframe: str = "15m", limit: int = 60) -> List[Dict[str, Any]]:
    """Retrieves real historical OHLCV candles for any supported asset."""
    conf = SYMBOL_MAPPINGS.get(symbol.upper()) or SYMBOL_MAPPINGS.get(symbol)
    if not conf:
        # Fallback to direct symbol lookup on Yahoo Finance
        conf = {"source": "yahoo", "ticker": symbol, "category": "stock"}

    cache_key = f"{symbol}_{timeframe}_{limit}"
    now = time.time()
    if cache_key in _CANDLES_CACHE:
        cached_data, cached_time = _CANDLES_CACHE[cache_key]
        if now - cached_time < CACHE_TTL_CANDLES:
            return cached_data

    async with httpx.AsyncClient(timeout=10.0) as client:
        if conf["source"] == "binance":
            candles = await fetch_binance_candles(client, conf["ticker"], timeframe, limit)
        else:
            candles = await fetch_yahoo_candles(client, conf["ticker"], timeframe, limit)

    if candles:
        _CANDLES_CACHE[cache_key] = (candles, now)
    return candles
