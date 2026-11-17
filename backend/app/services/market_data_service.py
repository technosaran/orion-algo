import asyncio
import time
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Tuple
import httpx

logger = logging.getLogger("market_data")

# Complete Symbol mappings for external APIs matching Indian and Global markets
SYMBOL_MAPPINGS: Dict[str, Dict[str, str]] = {
    # Crypto via Binance
    "BTC/USDT": {"source": "binance", "ticker": "BTCUSDT", "name": "Bitcoin / Tether", "category": "crypto"},
    "ETH/USDT": {"source": "binance", "ticker": "ETHUSDT", "name": "Ethereum / Tether", "category": "crypto"},
    "SOL/USDT": {"source": "binance", "ticker": "SOLUSDT", "name": "Solana / Tether", "category": "crypto"},
    
    # Indian Indices via Yahoo Finance
    "NIFTY50": {"source": "yahoo", "ticker": "^NSEI", "name": "NIFTY 50 Index", "category": "index"},
    "BANKNIFTY": {"source": "yahoo", "ticker": "^NSEBANK", "name": "Bank Nifty Index", "category": "index"},
    "SENSEX": {"source": "yahoo", "ticker": "^BSESN", "name": "BSE SENSEX", "category": "index"},
    
    # Indian Bluechip Equities (NSE .NS suffix)
    "RELIANCE": {"source": "yahoo", "ticker": "RELIANCE.NS", "name": "Reliance Industries", "category": "stock"},
    "HDFCBANK": {"source": "yahoo", "ticker": "HDFCBANK.NS", "name": "HDFC Bank Ltd.", "category": "stock"},
    "TCS": {"source": "yahoo", "ticker": "TCS.NS", "name": "Tata Consultancy Services", "category": "stock"},
    "INFY": {"source": "yahoo", "ticker": "INFY.NS", "name": "Infosys Ltd.", "category": "stock"},
    "ICICIBANK": {"source": "yahoo", "ticker": "ICICIBANK.NS", "name": "ICICI Bank Ltd.", "category": "stock"},
    "SBIN": {"source": "yahoo", "ticker": "SBIN.NS", "name": "State Bank of India", "category": "stock"},
    "TATAMOTORS": {"source": "yahoo", "ticker": "TMPV.NS", "name": "Tata Motors Ltd.", "category": "stock"},
    
    # Commodities (MCX / International Proxies)
    "CRUDEOIL": {"source": "yahoo", "ticker": "CL=F", "name": "Crude Oil (MCX/NYMEX)", "category": "commodity"},
    "GOLD": {"source": "yahoo", "ticker": "GC=F", "name": "Gold Spot (MCX/COMEX)", "category": "commodity"},
    "XAU/USD": {"source": "yahoo", "ticker": "GC=F", "name": "Gold Spot", "category": "commodity"},
    
    # US Equities
    "NVDA": {"source": "yahoo", "ticker": "NVDA", "name": "NVIDIA Corporation", "category": "stock"},
    "AAPL": {"source": "yahoo", "ticker": "AAPL", "name": "Apple Inc.", "category": "stock"},
    "TSLA": {"source": "yahoo", "ticker": "TSLA", "name": "Tesla, Inc.", "category": "stock"},
    "MSFT": {"source": "yahoo", "ticker": "MSFT", "name": "Microsoft Corporation", "category": "stock"},
    "SPY": {"source": "yahoo", "ticker": "SPY", "name": "SPDR S&P 500 ETF", "category": "index"},
    "QQQ": {"source": "yahoo", "ticker": "QQQ", "name": "Invesco QQQ Trust", "category": "index"},
}

# Fallback prices if Yahoo or Binance are temporarily unreachable
FALLBACK_PRICES: Dict[str, float] = {
    "BTC/USDT": 67450.0,
    "ETH/USDT": 1898.0,
    "SOL/USDT": 75.3,
    "NIFTY50": 25144.3,
    "BANKNIFTY": 61034.0,
    "SENSEX": 81590.0,
    "RELIANCE": 1339.7,
    "HDFCBANK": 804.0,
    "TCS": 2407.5,
    "INFY": 1141.5,
    "ICICIBANK": 1583.6,
    "SBIN": 1080.0,
    "TATAMOTORS": 810.0,
    "CRUDEOIL": 5820.0,
    "GOLD": 77600.0,
    "XAU/USD": 3886.3,
    "NVDA": 162.85,
    "AAPL": 356.27,
    "TSLA": 390.22,
    "MSFT": 523.88,
    "SPY": 754.37,
    "QQQ": 679.89,
}

# Cache storage with timestamp
_QUOTES_CACHE: Dict[str, Any] = {}
_LAST_QUOTES_FETCH: float = 0
_CANDLES_CACHE: Dict[str, Any] = {}
CACHE_TTL_QUOTES = 3.0  # 3 seconds cache
CACHE_TTL_CANDLES = 15.0  # 15 seconds cache

YAHOO_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
}


def get_indian_market_status() -> Dict[str, Any]:
    """
    Evaluates current IST time against NSE market trading hours:
    - Pre-open: 09:00 - 09:08 IST
    - Regular Trading: 09:15 - 15:30 IST (Mon-Fri)
    - Post-close: 15:40 - 16:00 IST
    """
    ist = timezone(timedelta(hours=5, minutes=30))
    now_ist = datetime.now(ist)
    weekday = now_ist.weekday()  # 0=Mon, 4=Fri, 5=Sat, 6=Sun
    time_minutes = now_ist.hour * 60 + now_ist.minute

    is_weekend = weekday >= 5
    is_open = False
    session = "CLOSED"
    next_event = ""

    if is_weekend:
        session = "WEEKEND_CLOSED"
        next_event = "Opens Monday at 09:15 AM IST"
    elif 9 * 60 <= time_minutes < 9 * 60 + 8:
        session = "PRE_OPEN"
        is_open = False
        next_event = "Regular trading starts at 09:15 AM IST"
    elif 9 * 60 + 15 <= time_minutes <= 15 * 60 + 30:
        session = "OPEN"
        is_open = True
        next_event = "Intraday square-off at 15:15 PM, Close at 15:30 PM IST"
    elif 15 * 60 + 30 < time_minutes <= 16 * 60:
        session = "POST_CLOSE"
        is_open = False
        next_event = "Opens tomorrow at 09:15 AM IST"
    else:
        session = "CLOSED"
        is_open = False
        next_event = "Opens at 09:15 AM IST"

    return {
        "isOpen": is_open,
        "session": session,
        "timeIST": now_ist.strftime("%Y-%m-%d %H:%M:%S IST"),
        "nextEvent": next_event,
        "weekday": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][weekday],
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
    """Fetches real-time quotes for all symbols concurrently with caching and fallback."""
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

    # If some symbols failed, populate with fallbacks/cached
    for symbol, conf in SYMBOL_MAPPINGS.items():
        if symbol not in _QUOTES_CACHE:
            fb_price = FALLBACK_PRICES.get(symbol, 1000.0)
            fallback_quote = {
                "symbol": symbol,
                "name": conf.get("name", symbol),
                "category": conf.get("category", "stock"),
                "price": fb_price,
                "change24h": 0.45,
                "high24h": round(fb_price * 1.01, 2),
                "low24h": round(fb_price * 0.99, 2),
                "volume": "1.2M",
                "basePrice": fb_price,
                "spread": round(fb_price * 0.0002, 2),
                "source": "Fallback Cache",
                "timestamp": int(now * 1000),
            }
            quotes.append(fallback_quote)
            _QUOTES_CACHE[symbol] = fallback_quote

    _LAST_QUOTES_FETCH = now
    return list(_QUOTES_CACHE.values())


async def fetch_binance_candles(
    client: httpx.AsyncClient, ticker: str, timeframe: str, limit: int = 60
) -> List[Dict[str, Any]]:
    """Fetches historical OHLCV klines from Binance."""
    interval_map = {"1m": "1m", "3m": "3m", "5m": "5m", "15m": "15m", "1h": "1h", "1D": "1d"}
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
    client: httpx.AsyncClient, ticker: str, timeframe: str, limit: int = 100
) -> List[Dict[str, Any]]:
    """Fetches historical OHLCV candles from Yahoo Finance."""
    interval_map = {
        "1m": ("1m", "5d"),
        "3m": ("5m", "5d"),
        "5m": ("5m", "5d"),
        "15m": ("15m", "1mo"),
        "1h": ("1h", "3mo"),
        "1D": ("1d", "1y"),
    }
    interval, range_param = interval_map.get(timeframe, ("15m", "1mo"))
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


async def get_real_historical_candles(symbol: str, timeframe: str = "15m", limit: int = 100) -> List[Dict[str, Any]]:
    """Retrieves real historical OHLCV candles for any supported asset."""
    conf = SYMBOL_MAPPINGS.get(symbol.upper()) or SYMBOL_MAPPINGS.get(symbol)
    if not conf:
        # Check if it needs .NS suffix for Indian equities
        raw = symbol.upper()
        if raw in ["RELIANCE", "HDFCBANK", "TCS", "INFY", "ICICIBANK", "SBIN", "TATAMOTORS"]:
            conf = {"source": "yahoo", "ticker": f"{raw}.NS", "category": "stock"}
        elif raw in ["CRUDEOIL"]:
            conf = {"source": "yahoo", "ticker": "CL=F", "category": "commodity"}
        elif raw in ["GOLD"]:
            conf = {"source": "yahoo", "ticker": "GC=F", "category": "commodity"}
        else:
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
