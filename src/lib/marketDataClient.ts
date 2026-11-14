import { AssetQuote, CandleData, ChartTimeframe } from "@/types/paperTrading";

export interface MarketDataFeedStatus {
  connected: boolean;
  lastUpdated: number;
  providers: string[];
  activeFeed: "LIVE_API" | "SIMULATION";
}

/**
 * Fetches real-time quotes from our Next.js API or FastAPI backend
 */
export async function fetchLiveQuotesFromAPI(): Promise<AssetQuote[] | null> {
  try {
    const res = await fetch("/api/market-data/quotes", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.quotes && Array.isArray(data.quotes) ? data.quotes : null;
  } catch (err) {
    console.warn("Could not reach /api/market-data/quotes:", err);
    return null;
  }
}

/**
 * Fetches real historical OHLCV candles from our API
 */
export async function fetchHistoricalCandlesFromAPI(
  symbol: string,
  timeframe: ChartTimeframe,
  limit: number = 60
): Promise<CandleData[] | null> {
  try {
    const encoded = encodeURIComponent(symbol);
    const res = await fetch(
      `/api/market-data/history?symbol=${encoded}&timeframe=${timeframe}&limit=${limit}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.candles && Array.isArray(data.candles) && data.candles.length > 0) {
      return data.candles;
    }
    return null;
  } catch (err) {
    console.warn(`Could not reach /api/market-data/history for ${symbol}:`, err);
    return null;
  }
}
