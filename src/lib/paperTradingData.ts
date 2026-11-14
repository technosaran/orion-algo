import { AssetQuote, CandleData, ChartTimeframe } from "@/types/paperTrading";

export const INITIAL_ASSETS: AssetQuote[] = [
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    category: "stock",
    price: 138.25,
    change24h: 3.42,
    high24h: 141.2,
    low24h: 135.5,
    volume: "48.2M",
    basePrice: 138.25,
    spread: 0.02,
    sparkline: [134.5, 135.2, 136.0, 135.8, 137.1, 136.9, 138.25],
  },
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    category: "stock",
    price: 228.4,
    change24h: 1.15,
    high24h: 230.1,
    low24h: 226.8,
    volume: "32.1M",
    basePrice: 228.4,
    spread: 0.03,
    sparkline: [226.1, 226.8, 227.4, 227.0, 228.1, 227.9, 228.4],
  },
  {
    symbol: "TSLA",
    name: "Tesla, Inc.",
    category: "stock",
    price: 245.8,
    change24h: -2.1,
    high24h: 254.2,
    low24h: 242.1,
    volume: "62.5M",
    basePrice: 245.8,
    spread: 0.05,
    sparkline: [251.0, 252.3, 249.5, 247.2, 246.0, 244.8, 245.8],
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    category: "stock",
    price: 425.6,
    change24h: 0.85,
    high24h: 429.0,
    low24h: 422.3,
    volume: "18.9M",
    basePrice: 425.6,
    spread: 0.04,
    sparkline: [422.0, 423.5, 424.1, 423.8, 424.9, 425.2, 425.6],
  },
  {
    symbol: "BTC/USDT",
    name: "Bitcoin / Tether",
    category: "crypto",
    price: 89450.0,
    change24h: 4.85,
    high24h: 91200.0,
    low24h: 86300.0,
    volume: "24.1B",
    basePrice: 89450.0,
    spread: 1.5,
    sparkline: [85500, 86200, 87400, 86900, 88300, 88900, 89450],
  },
  {
    symbol: "ETH/USDT",
    name: "Ethereum / Tether",
    category: "crypto",
    price: 3140.5,
    change24h: 3.2,
    high24h: 3210.0,
    low24h: 3020.0,
    volume: "14.8B",
    basePrice: 3140.5,
    spread: 0.25,
    sparkline: [3040, 3075, 3090, 3080, 3120, 3135, 3140.5],
  },
  {
    symbol: "SOL/USDT",
    name: "Solana / Tether",
    category: "crypto",
    price: 214.2,
    change24h: 6.45,
    high24h: 219.5,
    low24h: 198.8,
    volume: "6.8B",
    basePrice: 214.2,
    spread: 0.05,
    sparkline: [201, 204, 208, 206, 211, 212, 214.2],
  },
  {
    symbol: "SPY",
    name: "SPDR S&P 500 ETF",
    category: "index",
    price: 584.2,
    change24h: 0.62,
    high24h: 586.1,
    low24h: 582.4,
    volume: "54.0M",
    basePrice: 584.2,
    spread: 0.02,
    sparkline: [580.5, 581.4, 582.0, 582.8, 583.5, 583.9, 584.2],
  },
  {
    symbol: "QQQ",
    name: "Invesco QQQ Trust",
    category: "index",
    price: 492.15,
    change24h: 0.94,
    high24h: 494.5,
    low24h: 489.3,
    volume: "39.4M",
    basePrice: 492.15,
    spread: 0.03,
    sparkline: [488.2, 489.1, 490.5, 489.8, 491.2, 491.8, 492.15],
  },
  {
    symbol: "NIFTY50",
    name: "NIFTY 50 Index",
    category: "index",
    price: 24180.0,
    change24h: 0.48,
    high24h: 24290.0,
    low24h: 24095.0,
    volume: "12.4B",
    basePrice: 24180.0,
    spread: 1.0,
    sparkline: [24050, 24100, 24140, 24120, 24160, 24175, 24180],
  },
];

/**
 * Generates realistic historical candles leading up to current price
 */
export function generateCandlesForSymbol(
  symbol: string,
  currentPrice: number,
  timeframe: ChartTimeframe,
  count: number = 50,
  baseTime: number = 1731560000000
): CandleData[] {
  const candles: CandleData[] = [];
  const now = baseTime;

  const intervalMinutes: Record<ChartTimeframe, number> = {
    "1m": 1,
    "5m": 5,
    "15m": 15,
    "1h": 60,
    "1D": 1440,
  };

  const stepMs = intervalMinutes[timeframe] * 60 * 1000;
  const volatility = currentPrice > 1000 ? currentPrice * 0.003 : currentPrice * 0.005;

  let price = currentPrice;
  const tempCandles: CandleData[] = [];

  // Generate backward from current price
  for (let i = 0; i < count; i++) {
    const timestamp = now - i * stepMs;
    const date = new Date(timestamp);
    const timeStr =
      timeframe === "1D"
        ? date.toLocaleDateString([], { month: "short", day: "numeric" })
        : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Deterministic pseudo-random seed based on symbol, i, and timeframe
    const noise = Math.sin(i * 0.7 + symbol.length) * volatility * 0.8;
    const delta = (Math.cos(i * 1.3) * volatility * 0.5) + noise;

    const close = Math.max(price, 0.01);
    const open = Math.max(close - delta, 0.01);
    const high = Math.max(open, close) + Math.abs(Math.sin(i * 2.1)) * volatility * 0.4;
    const low = Math.min(open, close) - Math.abs(Math.cos(i * 1.9)) * volatility * 0.4;
    const volume = Math.floor(1000 + Math.abs(Math.sin(i * 3.7)) * 50000);

    tempCandles.push({
      time: timeStr,
      timestamp,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });

    price = open;
  }

  // Reverse so oldest is first
  tempCandles.reverse();

  // Ensure last candle close strictly matches currentPrice
  if (tempCandles.length > 0) {
    const last = tempCandles[tempCandles.length - 1];
    last.close = currentPrice;
    last.high = Math.max(last.high, currentPrice);
    last.low = Math.min(last.low, currentPrice);
  }

  return tempCandles;
}

/**
 * Calculates Simple Moving Average (SMA)
 */
export function calculateSMA(candles: CandleData[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += candles[i - j].close;
      }
      result.push(Number((sum / period).toFixed(2)));
    }
  }
  return result;
}

/**
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(candles: CandleData[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prevEma: number | null = null;

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += candles[j].close;
      }
      prevEma = sum / period;
      result.push(Number(prevEma.toFixed(2)));
    } else {
      const currentEma: number = candles[i].close * k + (prevEma as number) * (1 - k);
      prevEma = currentEma;
      result.push(Number(currentEma.toFixed(2)));
    }
  }
  return result;
}

/**
 * Calculates Relative Strength Index (RSI)
 */
export function calculateRSI(candles: CandleData[], period: number = 14): number {
  if (candles.length <= period) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = candles.length - period; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Number((100 - 100 / (1 + rs)).toFixed(1));
}

/**
 * Calculates Bollinger Bands (SMA 20, 2 std dev)
 */
export function calculateBollingerBands(
  candles: CandleData[],
  period: number = 20,
  multiplier: number = 2
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const sma = calculateSMA(candles, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    const mid = sma[i];
    if (mid === null || i < period - 1) {
      upper.push(null);
      lower.push(null);
    } else {
      let variance = 0;
      for (let j = 0; j < period; j++) {
        variance += Math.pow(candles[i - j].close - mid, 2);
      }
      const stdDev = Math.sqrt(variance / period);
      upper.push(Number((mid + multiplier * stdDev).toFixed(2)));
      lower.push(Number((mid - multiplier * stdDev).toFixed(2)));
    }
  }

  return { upper, middle: sma, lower };
}
