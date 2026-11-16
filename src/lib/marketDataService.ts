import { AssetQuote, CandleData, ChartTimeframe } from "@/types/paperTrading";
import { DatasetStats } from "@/types/dataset";

export interface SymbolMeta {
  source: "binance" | "yahoo";
  ticker: string;
  name: string;
  category: "stock" | "crypto" | "index" | "commodity";
  fallbackPrice: number;
}

export const SYMBOL_CONFIGS: Record<string, SymbolMeta> = {
  // Crypto (24/7 Live Data from Binance)
  "BTC/USDT": { source: "binance", ticker: "BTCUSDT", name: "Bitcoin / Tether", category: "crypto", fallbackPrice: 67450.0 },
  "ETH/USDT": { source: "binance", ticker: "ETHUSDT", name: "Ethereum / Tether", category: "crypto", fallbackPrice: 1898.0 },
  "SOL/USDT": { source: "binance", ticker: "SOLUSDT", name: "Solana / Tether", category: "crypto", fallbackPrice: 75.3 },
  "BNB/USDT": { source: "binance", ticker: "BNBUSDT", name: "BNB / Tether", category: "crypto", fallbackPrice: 590.0 },

  // Indian Indices (Yahoo Finance)
  "NIFTY50": { source: "yahoo", ticker: "^NSEI", name: "NIFTY 50 Index", category: "index", fallbackPrice: 25144.3 },
  "BANKNIFTY": { source: "yahoo", ticker: "^NSEBANK", name: "Bank Nifty Index", category: "index", fallbackPrice: 61034.0 },
  "SENSEX": { source: "yahoo", ticker: "^BSESN", name: "BSE SENSEX", category: "index", fallbackPrice: 81590.0 },

  // Indian Stocks (NSE)
  "RELIANCE": { source: "yahoo", ticker: "RELIANCE.NS", name: "Reliance Industries", category: "stock", fallbackPrice: 1339.7 },
  "HDFCBANK": { source: "yahoo", ticker: "HDFCBANK.NS", name: "HDFC Bank Ltd.", category: "stock", fallbackPrice: 804.0 },
  "TCS": { source: "yahoo", ticker: "TCS.NS", name: "Tata Consultancy Services", category: "stock", fallbackPrice: 2407.5 },
  "INFY": { source: "yahoo", ticker: "INFY.NS", name: "Infosys Ltd.", category: "stock", fallbackPrice: 1141.5 },
  "ICICIBANK": { source: "yahoo", ticker: "ICICIBANK.NS", name: "ICICI Bank Ltd.", category: "stock", fallbackPrice: 1583.6 },
  "SBIN": { source: "yahoo", ticker: "SBIN.NS", name: "State Bank of India", category: "stock", fallbackPrice: 1080.0 },
  "TATAMOTORS": { source: "yahoo", ticker: "TMPV.NS", name: "Tata Motors PV", category: "stock", fallbackPrice: 810.0 },
  "BHARTIARTL": { source: "yahoo", ticker: "BHARTIARTL.NS", name: "Bharti Airtel Ltd.", category: "stock", fallbackPrice: 1720.0 },
  "ITC": { source: "yahoo", ticker: "ITC.NS", name: "ITC Ltd.", category: "stock", fallbackPrice: 475.0 },
  "LT": { source: "yahoo", ticker: "LT.NS", name: "Larsen & Toubro", category: "stock", fallbackPrice: 3620.0 },

  // Commodities (Yahoo Finance)
  "CRUDEOIL": { source: "yahoo", ticker: "CL=F", name: "Crude Oil (WTI/MCX)", category: "commodity", fallbackPrice: 88.5 },
  "GOLD": { source: "yahoo", ticker: "GC=F", name: "Gold Spot (COMEX/MCX)", category: "commodity", fallbackPrice: 3886.3 },
  "SILVER": { source: "yahoo", ticker: "SI=F", name: "Silver Futures (MCX)", category: "commodity", fallbackPrice: 31.4 },

  // Global Equities & ETFs
  "NVDA": { source: "yahoo", ticker: "NVDA", name: "NVIDIA Corporation", category: "stock", fallbackPrice: 162.85 },
  "AAPL": { source: "yahoo", ticker: "AAPL", name: "Apple Inc.", category: "stock", fallbackPrice: 356.27 },
  "TSLA": { source: "yahoo", ticker: "TSLA", name: "Tesla, Inc.", category: "stock", fallbackPrice: 390.22 },
  "MSFT": { source: "yahoo", ticker: "MSFT", name: "Microsoft Corporation", category: "stock", fallbackPrice: 523.88 },
  "SPY": { source: "yahoo", ticker: "SPY", name: "SPDR S&P 500 ETF", category: "index", fallbackPrice: 754.37 },
  "QQQ": { source: "yahoo", ticker: "QQQ", name: "Invesco QQQ Trust", category: "index", fallbackPrice: 679.89 },
};

const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

/**
 * Fetches real 24hr quote from Binance Public API
 */
async function fetchBinanceQuote(symbol: string, ticker: string): Promise<AssetQuote | null> {
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${ticker}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const price = parseFloat(data.lastPrice);
    const change24h = parseFloat(data.priceChangePercent);
    const high24h = parseFloat(data.highPrice);
    const low24h = parseFloat(data.lowPrice);
    const volNum = parseFloat(data.volume);
    const volume = volNum > 1000000 ? `${(volNum / 1000000).toFixed(1)}M` : `${(volNum / 1000).toFixed(1)}K`;
    const conf = SYMBOL_CONFIGS[symbol];

    return {
      symbol,
      name: conf?.name ?? symbol,
      category: conf?.category ?? "crypto",
      price: Number(price.toFixed(price > 100 ? 2 : 4)),
      change24h: Number(change24h.toFixed(2)),
      high24h: Number(high24h.toFixed(price > 100 ? 2 : 4)),
      low24h: Number(low24h.toFixed(price > 100 ? 2 : 4)),
      volume,
      basePrice: Number((price / (1 + change24h / 100)).toFixed(2)),
      spread: Number((price * 0.0001).toFixed(price > 100 ? 2 : 4)),
      sparkline: [low24h, (low24h + price) / 2, price],
    };
  } catch (err) {
    console.warn(`Binance quote fetch failed for ${ticker}:`, err);
    return null;
  }
}

/**
 * Fetches real market quote from Yahoo Finance API
 */
async function fetchYahooQuote(symbol: string, ticker: string): Promise<AssetQuote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
    const res = await fetch(url, {
      headers: YAHOO_HEADERS,
      next: { revalidate: 5 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const price = parseFloat(meta.regularMarketPrice ?? 0);
    const prevClose = parseFloat(meta.chartPreviousClose ?? meta.previousClose ?? price);
    const change24h = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
    const high24h = parseFloat(meta.regularMarketDayHigh ?? price);
    const low24h = parseFloat(meta.regularMarketDayLow ?? price);
    const vol = meta.regularMarketVolume ?? 0;
    const volume = vol > 1000000 ? `${(vol / 1000000).toFixed(1)}M` : `${(vol / 1000).toFixed(1)}K`;
    const conf = SYMBOL_CONFIGS[symbol];

    return {
      symbol,
      name: conf?.name ?? symbol,
      category: conf?.category ?? "stock",
      price: Number(price.toFixed(2)),
      change24h: Number(change24h.toFixed(2)),
      high24h: Number(high24h.toFixed(2)),
      low24h: Number(low24h.toFixed(2)),
      volume,
      basePrice: Number(prevClose.toFixed(2)),
      spread: Number((price * 0.0002).toFixed(2)),
      sparkline: [low24h, (low24h + price) / 2, price],
    };
  } catch (err) {
    console.warn(`Yahoo Finance quote fetch failed for ${ticker}:`, err);
    return null;
  }
}

/**
 * Fetches all live real-market quotes concurrently
 */
export async function getLiveMarketQuotes(): Promise<AssetQuote[]> {
  const promises = Object.entries(SYMBOL_CONFIGS).map(async ([symbol, conf]) => {
    if (conf.source === "binance") {
      const q = await fetchBinanceQuote(symbol, conf.ticker);
      if (q) return q;
    } else {
      const q = await fetchYahooQuote(symbol, conf.ticker);
      if (q) return q;
    }

    return {
      symbol,
      name: conf.name,
      category: conf.category,
      price: conf.fallbackPrice,
      change24h: 0.0,
      high24h: conf.fallbackPrice * 1.01,
      low24h: conf.fallbackPrice * 0.99,
      volume: "10.0M",
      basePrice: conf.fallbackPrice,
      spread: conf.fallbackPrice * 0.0002,
      sparkline: [conf.fallbackPrice],
    };
  });

  return Promise.all(promises);
}

/**
 * Computes statistical properties of candle series for ML training / analysis
 */
export function computeDatasetStats(candles: CandleData[]): DatasetStats {
  if (candles.length === 0) {
    return { high: 0, low: 0, avgClose: 0, avgVolume: 0, volatilityPct: 0 };
  }

  let high = -Infinity;
  let low = Infinity;
  let sumClose = 0;
  let sumVol = 0;

  candles.forEach((c) => {
    if (c.high > high) high = c.high;
    if (c.low < low) low = c.low;
    sumClose += c.close;
    sumVol += c.volume;
  });

  const avgClose = sumClose / candles.length;
  const avgVolume = Math.round(sumVol / candles.length);

  // Compute sample standard deviation of close prices
  let variance = 0;
  candles.forEach((c) => {
    variance += Math.pow(c.close - avgClose, 2);
  });
  const stdDev = Math.sqrt(variance / candles.length);
  const volatilityPct = avgClose > 0 ? Number(((stdDev / avgClose) * 100).toFixed(2)) : 0;

  // Approximate ATR
  let totalTr = 0;
  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    totalTr += tr;
  }
  const atr = candles.length > 1 ? Number((totalTr / (candles.length - 1)).toFixed(2)) : 0;

  return {
    high: Number(high.toFixed(2)),
    low: Number(low.toFixed(2)),
    avgClose: Number(avgClose.toFixed(2)),
    avgVolume,
    volatilityPct,
    atr,
  };
}

/**
 * Fetches real historical OHLCV candles with optional custom range
 */
export async function getHistoricalCandles(
  symbol: string,
  timeframe: ChartTimeframe,
  limit: number = 60,
  customRange?: string
): Promise<CandleData[]> {
  const cleanSymbol = symbol.replace(" 50", "50").toUpperCase();
  const conf = SYMBOL_CONFIGS[cleanSymbol] || SYMBOL_CONFIGS[symbol] || {
    source: "yahoo" as const,
    ticker: cleanSymbol.includes("NIFTY") ? "^NSEI" : cleanSymbol,
    name: symbol,
    category: "stock" as const,
    fallbackPrice: 100,
  };

  if (conf.source === "binance") {
    try {
      const intervalMap: Record<ChartTimeframe, string> = {
        "1m": "1m",
        "5m": "5m",
        "15m": "15m",
        "1h": "1h",
        "1D": "1d",
      };
      const interval = intervalMap[timeframe] || "15m";
      const fetchLimit = Math.min(limit, 1000);
      const url = `https://api.binance.com/api/v3/klines?symbol=${conf.ticker}&interval=${interval}&limit=${fetchLimit}`;
      const res = await fetch(url, { next: { revalidate: 10 } });
      if (res.ok) {
        const rows = await res.json();
        return rows.map((r: any) => {
          const timestamp = Number(r[0]);
          const d = new Date(timestamp);
          const time =
            timeframe === "1D"
              ? d.toLocaleDateString([], { month: "short", day: "numeric" })
              : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          return {
            time,
            timestamp,
            open: Number(parseFloat(r[1]).toFixed(2)),
            high: Number(parseFloat(r[2]).toFixed(2)),
            low: Number(parseFloat(r[3]).toFixed(2)),
            close: Number(parseFloat(r[4]).toFixed(2)),
            volume: Number(parseFloat(r[5]).toFixed(2)),
          };
        });
      }
    } catch (e) {
      console.warn("Binance klines fetch failed:", e);
    }
  } else {
    try {
      const intervalMap: Record<ChartTimeframe, [string, string]> = {
        "1m": ["1m", customRange || "1d"],
        "5m": ["5m", customRange || "5d"],
        "15m": ["15m", customRange || "1mo"],
        "1h": ["1h", customRange || "3mo"],
        "1D": ["1d", customRange || "1y"],
      };
      const [interval, range] = intervalMap[timeframe] || ["15m", customRange || "1mo"];
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(conf.ticker)}?interval=${interval}&range=${range}`;
      const res = await fetch(url, { headers: YAHOO_HEADERS, next: { revalidate: 15 } });
      if (res.ok) {
        const data = await res.json();
        const result = data.chart?.result?.[0];
        if (result) {
          const timestamps: number[] = result.timestamp || [];
          const quote = result.indicators?.quote?.[0] || {};
          const opens: number[] = quote.open || [];
          const highs: number[] = quote.high || [];
          const lows: number[] = quote.low || [];
          const closes: number[] = quote.close || [];
          const volumes: number[] = quote.volume || [];

          const candles: CandleData[] = [];
          for (let i = 0; i < timestamps.length; i++) {
            const o = opens[i];
            const c = closes[i];
            if (o !== null && c !== null && !isNaN(o) && !isNaN(c)) {
              const timestamp = timestamps[i] * 1000;
              const d = new Date(timestamp);
              const time =
                timeframe === "1D"
                  ? d.toLocaleDateString([], { month: "short", day: "numeric" })
                  : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

              candles.push({
                time,
                timestamp,
                open: Number(o.toFixed(2)),
                high: Number((highs[i] ?? o).toFixed(2)),
                low: Number((lows[i] ?? o).toFixed(2)),
                close: Number(c.toFixed(2)),
                volume: volumes[i] || 0,
              });
            }
          }
          if (candles.length > 0) {
            return candles.slice(-limit);
          }
        }
      }
    } catch (e) {
      console.warn("Yahoo candles fetch failed:", e);
    }
  }

  return [];
}
