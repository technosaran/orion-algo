import { AssetQuote, CandleData, ChartTimeframe } from "@/types/paperTrading";
import { getInstrumentLotSize } from "@/lib/formatters";

const RAW_INITIAL_ASSETS: AssetQuote[] = [
  {
    symbol: "NIFTY50",
    name: "NIFTY 50 Index",
    category: "index",
    price: 25144.3,
    change24h: 0.46,
    high24h: 25210.0,
    low24h: 25080.0,
    volume: "18.4M",
    basePrice: 25144.3,
    spread: 0.5,
    sparkline: [25080, 25110, 25144.3],
  },
  {
    symbol: "BANKNIFTY",
    name: "Bank Nifty Index",
    category: "index",
    price: 61034.1,
    change24h: 3.3,
    high24h: 61250.0,
    low24h: 60800.0,
    volume: "12.8M",
    basePrice: 61034.1,
    spread: 1.0,
    sparkline: [60800, 60950, 61034.1],
  },
  {
    symbol: "SENSEX",
    name: "BSE SENSEX",
    category: "index",
    price: 81592.4,
    change24h: 0.54,
    high24h: 81800.0,
    low24h: 81300.0,
    volume: "9.5M",
    basePrice: 81592.4,
    spread: 2.0,
    sparkline: [81300, 81450, 81592.4],
  },
  {
    symbol: "RELIANCE",
    name: "Reliance Industries Ltd.",
    category: "stock",
    price: 1339.7,
    change24h: 1.49,
    high24h: 1350.7,
    low24h: 1324.0,
    volume: "8.4M",
    basePrice: 1320.0,
    spread: 0.1,
    sparkline: [1324, 1335, 1339.7],
  },
  {
    symbol: "HDFCBANK",
    name: "HDFC Bank Ltd.",
    category: "stock",
    price: 804.0,
    change24h: 0.92,
    high24h: 815.0,
    low24h: 798.0,
    volume: "14.2M",
    basePrice: 796.0,
    spread: 0.15,
    sparkline: [798, 801, 804],
  },
  {
    symbol: "TCS",
    name: "Tata Consultancy Services",
    category: "stock",
    price: 2407.5,
    change24h: -0.42,
    high24h: 2425.0,
    low24h: 2390.0,
    volume: "2.8M",
    basePrice: 2415.0,
    spread: 0.25,
    sparkline: [2390, 2400, 2407.5],
  },
  {
    symbol: "INFY",
    name: "Infosys Ltd.",
    category: "stock",
    price: 1141.5,
    change24h: 1.12,
    high24h: 1155.0,
    low24h: 1130.0,
    volume: "5.6M",
    basePrice: 1130.0,
    spread: 0.15,
    sparkline: [1130, 1138, 1141.5],
  },
  {
    symbol: "ICICIBANK",
    name: "ICICI Bank Ltd.",
    category: "stock",
    price: 1583.6,
    change24h: 1.65,
    high24h: 1595.0,
    low24h: 1565.0,
    volume: "11.1M",
    basePrice: 1560.0,
    spread: 0.1,
    sparkline: [1565, 1575, 1583.6],
  },
  {
    symbol: "SBIN",
    name: "State Bank of India",
    category: "stock",
    price: 1080.0,
    change24h: 0.78,
    high24h: 1092.0,
    low24h: 1070.0,
    volume: "9.8M",
    basePrice: 1072.0,
    spread: 0.1,
    sparkline: [1070, 1076, 1080],
  },
  {
    symbol: "BTC/USDT",
    name: "Bitcoin / Tether",
    category: "crypto",
    price: 67023.0,
    change24h: -2.59,
    high24h: 68500.0,
    low24h: 66800.0,
    volume: "42.5K",
    basePrice: 68800.0,
    spread: 1.0,
    sparkline: [68800, 67500, 67023],
  },
  {
    symbol: "ETH/USDT",
    name: "Ethereum / Tether",
    category: "crypto",
    price: 1892.7,
    change24h: -2.54,
    high24h: 1960.0,
    low24h: 1875.0,
    volume: "125.0K",
    basePrice: 1942.0,
    spread: 0.2,
    sparkline: [1942, 1910, 1892.7],
  },
  {
    symbol: "CRUDEOIL",
    name: "Crude Oil (NYMEX/MCX)",
    category: "commodity",
    price: 88.56,
    change24h: -1.25,
    high24h: 90.10,
    low24h: 87.80,
    volume: "45.0K",
    basePrice: 89.68,
    spread: 0.05,
    sparkline: [87.8, 88.2, 88.56],
  },
  {
    symbol: "GOLD",
    name: "Gold Spot",
    category: "commodity",
    price: 3886.3,
    change24h: -5.55,
    high24h: 3950.0,
    low24h: 3870.0,
    volume: "18.2K",
    basePrice: 4114.0,
    spread: 0.5,
    sparkline: [3870, 3875, 3886.3],
  },
];

export const INITIAL_ASSETS: AssetQuote[] = RAW_INITIAL_ASSETS.map((asset) => ({
  ...asset,
  lotSize: asset.lotSize || getInstrumentLotSize(asset.symbol),
}));

/**
 * Creates clean price-anchored historical bars from real price reference
 */
export function generateCandlesForSymbol(
  symbol: string,
  currentPrice: number,
  timeframe: ChartTimeframe,
  count: number = 30,
  baseTime: number = Date.now()
): CandleData[] {
  const intervalMinutes: Record<ChartTimeframe, number> = {
    "1m": 1,
    "5m": 5,
    "15m": 15,
    "1h": 60,
    "1D": 1440,
  };

  const stepMs = intervalMinutes[timeframe] * 60 * 1000;
  const candles: CandleData[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = baseTime - i * stepMs;
    const date = new Date(timestamp);
    const timeStr =
      timeframe === "1D"
        ? date.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
        : date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    // Anchor strictly to current real price with minimal tick drift
    const close = Number(currentPrice.toFixed(2));
    candles.push({
      time: timeStr,
      timestamp,
      open: close,
      high: close,
      low: close,
      close: close,
      volume: 1000,
    });
  }

  return candles;
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

/**
 * Calculates MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
  candles: CandleData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): {
  macdLine: (number | null)[];
  signalLine: (number | null)[];
  histogram: (number | null)[];
} {
  const fastEma = calculateEMA(candles, fastPeriod);
  const slowEma = calculateEMA(candles, slowPeriod);

  const macdLine: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    const f = fastEma[i];
    const s = slowEma[i];
    if (f !== null && s !== null) {
      macdLine.push(Number((f - s).toFixed(2)));
    } else {
      macdLine.push(null);
    }
  }

  // Calculate signal line as EMA of macdLine
  const validMacdValues = macdLine.filter((v): v is number => v !== null);
  const signalLine: (number | null)[] = [];
  const histogram: (number | null)[] = [];

  const k = 2 / (signalPeriod + 1);
  let prevSignal: number | null = null;
  let validIdx = 0;

  for (let i = 0; i < candles.length; i++) {
    const m = macdLine[i];
    if (m === null) {
      signalLine.push(null);
      histogram.push(null);
    } else {
      if (validIdx < signalPeriod - 1) {
        signalLine.push(null);
        histogram.push(null);
      } else if (validIdx === signalPeriod - 1) {
        let sum = 0;
        for (let j = 0; j < signalPeriod; j++) {
          sum += validMacdValues[validIdx - j];
        }
        prevSignal = sum / signalPeriod;
        signalLine.push(Number(prevSignal.toFixed(2)));
        histogram.push(Number((m - prevSignal).toFixed(2)));
      } else {
        const curSignal: number = (m as number) * k + (prevSignal as number) * (1 - k);
        prevSignal = curSignal;
        signalLine.push(Number(curSignal.toFixed(2)));
        histogram.push(Number(((m as number) - curSignal).toFixed(2)));
      }
      validIdx++;
    }
  }

  return { macdLine, signalLine, histogram };
}
