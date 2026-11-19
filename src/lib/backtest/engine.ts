import {
  BacktestConfig,
  BacktestResult,
  BacktestSummary,
  EquityPoint,
  StrategyDefinition,
  SymbolDefinition,
  TradeRecord,
} from "./types";
import { validateCandles } from "./nseValidation";

async function persistBacktestResult(config: BacktestConfig, result: BacktestResult) {
  try {
    const { saveLabBacktestToDb } = await import("@/lib/strategies-service");
    await saveLabBacktestToDb(config, result);
  } catch {
    // Graceful fallback if database is unavailable or during headless testing
  }
}

export const AVAILABLE_STRATEGIES: StrategyDefinition[] = [
  {
    id: "sma_crossover",
    name: "SMA Crossover (Golden Cross)",
    description: "Classic trend-following strategy that generates signals when Fast SMA crosses Slow SMA.",
    category: "Trend Following",
    params: [
      { key: "fast_period", label: "Fast SMA Period", type: "number", default: 20, min: 2, max: 100, step: 1 },
      { key: "slow_period", label: "Slow SMA Period", type: "number", default: 50, min: 5, max: 300, step: 1 },
    ],
  },
  {
    id: "ema_crossover",
    name: "EMA Momentum Scalper",
    description: "Exponential moving average crossover strategy using fast and slow periods.",
    category: "Trend Following",
    params: [
      { key: "fast_period", label: "Fast EMA Period", type: "number", default: 9, min: 2, max: 50, step: 1 },
      { key: "slow_period", label: "Slow EMA Period", type: "number", default: 21, min: 5, max: 200, step: 1 },
    ],
  },
  {
    id: "rsi_momentum",
    name: "RSI Mean Reversion",
    description: "Momentum oscillator strategy buying when oversold and exiting when overbought.",
    category: "Mean Reversion",
    params: [
      { key: "rsi_period", label: "RSI Period", type: "number", default: 14, min: 2, max: 50, step: 1 },
      { key: "oversold", label: "Oversold Threshold", type: "number", default: 30, min: 10, max: 45, step: 1 },
      { key: "overbought", label: "Overbought Threshold", type: "number", default: 70, min: 55, max: 90, step: 1 },
    ],
  },
  {
    id: "macd_trend",
    name: "MACD Trend Divergence",
    description: "Moving average convergence-divergence strategy using MACD line and signal crossovers.",
    category: "Momentum",
    params: [
      { key: "fast_period", label: "Fast EMA", type: "number", default: 12, min: 2, max: 50, step: 1 },
      { key: "slow_period", label: "Slow EMA", type: "number", default: 26, min: 10, max: 100, step: 1 },
      { key: "signal_period", label: "Signal EMA", type: "number", default: 9, min: 2, max: 50, step: 1 },
    ],
  },
  {
    id: "bollinger_bands",
    name: "Bollinger Bands Volatility Bounce",
    description: "Trades price bounces from upper and lower standard deviation bands.",
    category: "Volatility",
    params: [
      { key: "bb_period", label: "Period", type: "number", default: 20, min: 5, max: 100, step: 1 },
      { key: "bb_std", label: "Std Deviation Multiplier", type: "number", default: 2.0, min: 1.0, max: 4.0, step: 0.1 },
    ],
  },
];

export const AVAILABLE_SYMBOLS: SymbolDefinition[] = [
  { symbol: "NIFTY50", name: "Nifty 50 Index", category: "Indian Benchmark", assetClass: "Equities", basePrice: 24200 },
  { symbol: "BANKNIFTY", name: "Nifty Bank Index", category: "Indian Banking", assetClass: "Equities", basePrice: 51500 },
  { symbol: "FINNIFTY", name: "Nifty Fin Services", category: "Indian Financials", assetClass: "Equities", basePrice: 23890 },
  { symbol: "SENSEX", name: "BSE SENSEX", category: "BSE Benchmark", assetClass: "Equities", basePrice: 79480 },
  { symbol: "RELIANCE", name: "Reliance Industries", category: "Energy / Telecom", assetClass: "Equities", basePrice: 1265 },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd.", category: "Private Banking", assetClass: "Equities", basePrice: 1742 },
  { symbol: "TCS", name: "Tata Consultancy Services", category: "IT Services", assetClass: "Equities", basePrice: 4120 },
  { symbol: "INFY", name: "Infosys Ltd.", category: "IT Services", assetClass: "Equities", basePrice: 1865 },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd.", category: "Private Banking", assetClass: "Equities", basePrice: 1278 },
  { symbol: "TATAMOTORS", name: "Tata Motors Ltd.", category: "Automotive / EV", assetClass: "Equities", basePrice: 785 },
  { symbol: "SBIN", name: "State Bank of India", category: "PSU Banking", assetClass: "Equities", basePrice: 812 },
  { symbol: "CRUDEOIL", name: "Crude Oil (MCX)", category: "Energy Commodity", assetClass: "Commodities", basePrice: 5840 },
  { symbol: "GOLD", name: "Gold Mini (MCX)", category: "Precious Metals", assetClass: "Commodities", basePrice: 76250 },
];

export interface PresetStrategy {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  config: Partial<BacktestConfig>;
}

export const STRATEGY_PRESETS: PresetStrategy[] = [
  {
    id: "preset_golden_cross",
    title: "Nifty Golden Cross (50/200)",
    subtitle: "Long-term trend following",
    tag: "High Win Rate",
    config: {
      strategy: "sma_crossover",
      symbol: "NIFTY50",
      timeframe: "1d",
      dateRangeDays: 180,
      initialCapital: 500000,
      leverage: 1.0,
      stopLossPct: 2.5,
      takeProfitPct: 8.0,
      trailingStopPct: null, // Trailing stop is OFF by default
      strategyParams: { fast_period: 20, slow_period: 50 },
    },
  },
  {
    id: "preset_rsi_dip",
    title: "BankNifty RSI Dip Reversal",
    subtitle: "Oversold bounce signals",
    tag: "Mean Reversion",
    config: {
      strategy: "rsi_momentum",
      symbol: "BANKNIFTY",
      timeframe: "1h",
      dateRangeDays: 90,
      initialCapital: 500000,
      leverage: 1.0,
      stopLossPct: 1.5,
      takeProfitPct: 4.5,
      trailingStopPct: null, // Trailing stop is OFF by default
      strategyParams: { rsi_period: 14, oversold: 30, overbought: 70 },
    },
  },
  {
    id: "preset_ema_scalp",
    title: "Reliance EMA 9/21 Scalper",
    subtitle: "Intraday trend continuation",
    tag: "Day Trading",
    config: {
      strategy: "ema_crossover",
      symbol: "RELIANCE",
      timeframe: "15m",
      dateRangeDays: 30,
      initialCapital: 250000,
      leverage: 1.0,
      stopLossPct: 1.2,
      takeProfitPct: 3.2,
      trailingStopPct: null, // Trailing stop is OFF by default
      strategyParams: { fast_period: 9, slow_period: 21 },
    },
  },
  {
    id: "preset_nifty_macd",
    title: "Nifty 50 MACD Wave",
    subtitle: "Trend following with momentum",
    tag: "Index Momentum",
    config: {
      strategy: "macd_trend",
      symbol: "NIFTY50",
      timeframe: "1h",
      dateRangeDays: 120,
      initialCapital: 1000000,
      leverage: 1.0,
      stopLossPct: 1.5,
      takeProfitPct: 4.0,
      trailingStopPct: null, // Trailing stop is OFF by default
      strategyParams: { fast_period: 12, slow_period: 26, signal_period: 9 },
    },
  },
];

// Seeded pseudorandom generator for deterministic reproducible simulations
function pseudoRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function gaussianRandom(rng: () => number): number {
  let u = 0,
    v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Indicator math functions (Strictly backward-looking up to bar i)
function calculateSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period) return result;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  result[period - 1] = sum / period;
  for (let i = period; i < data.length; i++) {
    sum += data[i] - data[i - period];
    result[i] = sum / period;
  }
  return result;
}

function calculateEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period) return result;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  let prev = sum / period;
  result[period - 1] = prev;
  for (let i = period; i < data.length; i++) {
    const val = data[i] * k + prev * (1 - k);
    result[i] = val;
    prev = val;
  }
  return result;
}

function calculateRSI(data: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length <= period) return result;

  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    gains.push(Math.max(0, diff));
    losses.push(Math.max(0, -diff));
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  if (avgLoss === 0) {
    result[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    result[period] = 100 - 100 / (1 + rs);
  }

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    if (avgLoss === 0) {
      result[i + 1] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i + 1] = 100 - 100 / (1 + rs);
    }
  }
  return result;
}

function calculateBollinger(data: number[], period = 20, stdDevMult = 2.0) {
  const sma = calculateSMA(data, period);
  const upper: (number | null)[] = new Array(data.length).fill(null);
  const lower: (number | null)[] = new Array(data.length).fill(null);

  for (let i = period - 1; i < data.length; i++) {
    const window = data.slice(i - period + 1, i + 1);
    const mean = sma[i]!;
    const variance =
      window.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    upper[i] = mean + stdDevMult * stdDev;
    lower[i] = mean - stdDevMult * stdDev;
  }
  return { sma, upper, lower };
}

function calculateMACD(data: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = calculateEMA(data, fast);
  const emaSlow = calculateEMA(data, slow);
  const macdLine: (number | null)[] = new Array(data.length).fill(null);

  for (let i = 0; i < data.length; i++) {
    if (emaFast[i] !== null && emaSlow[i] !== null) {
      macdLine[i] = emaFast[i]! - emaSlow[i]!;
    }
  }

  const validMacd: number[] = [];
  const indexMap: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (macdLine[i] !== null) {
      validMacd.push(macdLine[i]!);
      indexMap.push(i);
    }
  }

  const signalLineValid = calculateEMA(validMacd, signal);
  const signalLine: (number | null)[] = new Array(data.length).fill(null);
  const hist: (number | null)[] = new Array(data.length).fill(null);

  for (let k = 0; k < signalLineValid.length; k++) {
    const originalIndex = indexMap[k];
    signalLine[originalIndex] = signalLineValid[k];
    if (signalLineValid[k] !== null && macdLine[originalIndex] !== null) {
      hist[originalIndex] = macdLine[originalIndex]! - signalLineValid[k]!;
    }
  }

  return { macdLine, signalLine, hist };
}

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isSynthetic?: boolean;
  source?: string;
}

const TF_MINUTES: Record<string, number> = {
  "1m": 1,
  "3m": 3,
  "5m": 5,
  "10m": 10,
  "15m": 15,
  "30m": 30,
  "1h": 60,
  "4h": 240,
  "1d": 1440,
};

function generateSyntheticCandles(
  symbol: string,
  timeframe: string,
  days: number
): Candle[] {
  const symDef =
    AVAILABLE_SYMBOLS.find((s) => s.symbol === symbol) ||
    AVAILABLE_SYMBOLS[0];
  const basePrice = symDef.basePrice;
  const tfMin = TF_MINUTES[timeframe] || 60;
  const totalMin = days * 1440;
  const count = Math.min(1500, Math.max(80, Math.floor(totalMin / tfMin)));

  // Consistent seed for identical backtest params
  const seed =
    symbol.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) +
    days * 79 +
    tfMin * 17;
  const rng = pseudoRandom(seed);

  const vol = symDef.assetClass === "Crypto" ? 0.55 : 0.22;
  const drift = 0.2;
  const dt = (tfMin / 1440) / 365.0;
  const driftStep = (drift - 0.5 * vol * vol) * dt;
  const volStep = vol * Math.sqrt(dt);

  const now = new Date();
  const startTime = new Date(now.getTime() - count * tfMin * 60 * 1000);

  let curClose = basePrice * (1.0 + (rng() * 0.1 - 0.05));
  const candles: Candle[] = [];
  const trendPeriod = 25 + Math.floor(rng() * 40);

  for (let i = 0; i < count; i++) {
    const candleTime = new Date(startTime.getTime() + i * tfMin * 60 * 1000);
    const wave = Math.sin(i / trendPeriod) * 0.0035;
    const shock = gaussianRandom(rng) * volStep + driftStep + wave;

    const openP = curClose;
    const closeP = openP * Math.exp(shock);
    const spread = Math.abs(shock) + rng() * 0.006 + 0.002;
    const highP = Math.max(openP, closeP) * (1.0 + rng() * spread);
    const lowP = Math.min(openP, closeP) * (1.0 - rng() * spread);
    const volAmt = (500 + rng() * 5000) * (1.0 + Math.abs(shock) * 12);

    candles.push({
      timestamp: candleTime.toISOString(),
      open: Number(openP.toFixed(2)),
      high: Number(highP.toFixed(2)),
      low: Number(lowP.toFixed(2)),
      close: Number(closeP.toFixed(2)),
      volume: Number(volAmt.toFixed(1)),
      isSynthetic: true,
      source: "SYNTHETIC",
    });
    curClose = closeP;
  }
  return candles;
}

/**
 * Runs the deterministic client-side backtesting simulation engine.
 * Incorporates:
 * 1. Strict No-Lookahead Bias: Signals generated at bar i close execute at bar i+1 open.
 * 2. Conservative Intrabar SL/TP Tie Resolution: Stop Loss assumed first when both hit.
 * 3. Exit Hierarchy: SL/TP -> Trailing Stop (configurable & off by default) -> Signal Exit -> End of Backtest.
 * 4. ONE Source of Truth for P&L: sum(trades.pnl) === finalEquity - initialCapital === netProfit.
 * 5. Mark-to-Market continuous equity curve tracking with unrealized P&L and fees.
 * 6. NSE validation integration and synthetic source tagging.
 */
export function runClientBacktest(
  config: BacktestConfig,
  providedCandles?: Candle[] | any[]
): BacktestResult {
  let candles: Candle[];
  let isSynthetic = false;
  let dataSource = "REAL_MARKET_DATA";

  if (providedCandles && providedCandles.length >= 2) {
    // Validate through Phase 1 NSE validation
    const validation = validateCandles(providedCandles, {
      allowWeekend: true,
      allowOutsideMarketHours: true,
      allowHolidays: true,
    });
    candles =
      validation.sanitizedCandles && validation.sanitizedCandles.length >= 2
        ? validation.sanitizedCandles
        : providedCandles;

    // Detect whether candles are synthetic
    const first: any = providedCandles[0];
    if (
      first?.isSynthetic === true ||
      first?.synthetic === true ||
      (typeof first?.source === "string" &&
        first.source.toUpperCase().includes("SYNTHETIC")) ||
      (candles.length >= 2 &&
        candles[0].open === candles[0].close &&
        candles[0].high === candles[0].low)
    ) {
      isSynthetic = true;
      dataSource = "SYNTHETIC";
    } else {
      isSynthetic = false;
      dataSource = first?.source || "REAL_MARKET_DATA";
    }
  } else {
    // Generate synthetic candles and validate
    candles = generateSyntheticCandles(
      config.symbol,
      config.timeframe,
      config.dateRangeDays
    );
    isSynthetic = true;
    dataSource = "SYNTHETIC";

    const validation = validateCandles(candles, {
      allowWeekend: true,
      allowOutsideMarketHours: true,
      allowHolidays: true,
      isSynthetic: true,
      tagSynthetic: true,
    });
    if (validation.sanitizedCandles && validation.sanitizedCandles.length >= 2) {
      candles = validation.sanitizedCandles;
    }
  }

  const opens = candles.map((c) => Number(c.open));
  const closes = candles.map((c) => Number(c.close));
  const highs = candles.map((c) => Number(c.high));
  const lows = candles.map((c) => Number(c.low));
  const timestamps = candles.map((c) =>
    typeof c.timestamp === "number"
      ? new Date(c.timestamp).toISOString()
      : String(c.timestamp)
  );

  // Generate strategy signals strictly using information up to closed bar i
  const signals: number[] = new Array(candles.length).fill(0);
  const p = config.strategyParams || {};

  if (config.strategy === "sma_crossover") {
    const fastP = Number(p.fast_period || 20);
    const slowP = Number(p.slow_period || 50);
    const fastMA = calculateSMA(closes, fastP);
    const slowMA = calculateSMA(closes, slowP);

    for (let i = 1; i < candles.length; i++) {
      if (
        fastMA[i] !== null &&
        slowMA[i] !== null &&
        fastMA[i - 1] !== null &&
        slowMA[i - 1] !== null
      ) {
        if (fastMA[i - 1]! <= slowMA[i - 1]! && fastMA[i]! > slowMA[i]!) {
          signals[i] = 1; // Long Entry Signal
        } else if (fastMA[i - 1]! >= slowMA[i - 1]! && fastMA[i]! < slowMA[i]!) {
          signals[i] = -1; // Exit Signal
        }
      }
    }
  } else if (config.strategy === "ema_crossover") {
    const fastP = Number(p.fast_period || 9);
    const slowP = Number(p.slow_period || 21);
    const fastEMA = calculateEMA(closes, fastP);
    const slowEMA = calculateEMA(closes, slowP);

    for (let i = 1; i < candles.length; i++) {
      if (
        fastEMA[i] !== null &&
        slowEMA[i] !== null &&
        fastEMA[i - 1] !== null &&
        slowEMA[i - 1] !== null
      ) {
        if (fastEMA[i - 1]! <= slowEMA[i - 1]! && fastEMA[i]! > slowEMA[i]!) {
          signals[i] = 1;
        } else if (fastEMA[i - 1]! >= slowEMA[i - 1]! && fastEMA[i]! < slowEMA[i]!) {
          signals[i] = -1;
        }
      }
    }
  } else if (config.strategy === "rsi_momentum") {
    const rsiP = Number(p.rsi_period || 14);
    const oversold = Number(p.oversold || 30);
    const overbought = Number(p.overbought || 70);
    const rsi = calculateRSI(closes, rsiP);

    for (let i = 1; i < candles.length; i++) {
      if (rsi[i] !== null && rsi[i - 1] !== null) {
        if (rsi[i - 1]! <= oversold && rsi[i]! > oversold) {
          signals[i] = 1;
        } else if (rsi[i - 1]! >= overbought && rsi[i]! < overbought) {
          signals[i] = -1;
        }
      }
    }
  } else if (config.strategy === "macd_trend") {
    const fast = Number(p.fast_period || 12);
    const slow = Number(p.slow_period || 26);
    const sig = Number(p.signal_period || 9);
    const { hist } = calculateMACD(closes, fast, slow, sig);

    for (let i = 1; i < candles.length; i++) {
      if (hist[i] !== null && hist[i - 1] !== null) {
        if (hist[i - 1]! <= 0 && hist[i]! > 0) {
          signals[i] = 1;
        } else if (hist[i - 1]! >= 0 && hist[i]! < 0) {
          signals[i] = -1;
        }
      }
    }
  } else if (config.strategy === "bollinger_bands") {
    const bbP = Number(p.bb_period || 20);
    const bbStd = Number(p.bb_std || 2.0);
    const { upper, lower } = calculateBollinger(closes, bbP, bbStd);

    for (let i = 1; i < candles.length; i++) {
      if (
        lower[i] !== null &&
        upper[i] !== null &&
        lower[i - 1] !== null &&
        upper[i - 1] !== null
      ) {
        if (closes[i - 1] <= lower[i - 1]! && closes[i] > lower[i]!) {
          signals[i] = 1;
        } else if (closes[i - 1] >= upper[i - 1]! && closes[i] < upper[i]!) {
          signals[i] = -1;
        }
      }
    }
  }

  // Account & Execution State
  const initialCap = config.initialCapital;
  let currentCash = initialCap;
  let peakEquity = initialCap;

  const slippageRate = (config.slippagePct || 0) / 100;
  const feeRate = (config.feePct || 0) / 100;
  const leverage = Math.max(1.0, config.leverage || 1.0);
  const pctAlloc =
    typeof p.pctAlloc === "number"
      ? Math.min(1.0, Math.max(0.1, Number(p.pctAlloc)))
      : 0.95;

  // Trailing stop is configurable and OFF by default (null or <= 0)
  const isTrailingStopEnabled =
    config.trailingStopPct !== null &&
    config.trailingStopPct !== undefined &&
    !isNaN(Number(config.trailingStopPct)) &&
    Number(config.trailingStopPct) > 0;
  const trailingStopPct = isTrailingStopEnabled
    ? Number(config.trailingStopPct)
    : null;

  const isStopLossEnabled =
    config.stopLossPct !== null &&
    config.stopLossPct !== undefined &&
    !isNaN(Number(config.stopLossPct)) &&
    Number(config.stopLossPct) > 0;
  const stopLossPct = isStopLossEnabled ? Number(config.stopLossPct) : null;

  const isTakeProfitEnabled =
    config.takeProfitPct !== null &&
    config.takeProfitPct !== undefined &&
    !isNaN(Number(config.takeProfitPct)) &&
    Number(config.takeProfitPct) > 0;
  const takeProfitPct = isTakeProfitEnabled
    ? Number(config.takeProfitPct)
    : null;

  interface OpenPosition {
    id: number;
    symbol: string;
    type: "LONG" | "SHORT";
    entryTime: string;
    entryPrice: number;
    size: number;
    invested: number;
    entryFee: number;
    entryBar: number;
    highestPrice: number;
    lowestPrice: number;
  }

  let activePos: OpenPosition | null = null;
  let pendingSignal: { type: "LONG"; barIndex: number } | null = null;
  let tradeId = 1;

  const trades: TradeRecord[] = [];
  const equityCurve: EquityPoint[] = [];
  const benchmarkBase = closes[0] || 1;

  // Bar-by-bar Execution Engine Loop
  for (let i = 0; i < candles.length; i++) {
    const openP = opens[i];
    const highP = highs[i];
    const lowP = lows[i];
    const closeP = closes[i];
    const timeStr = timestamps[i];

    // -------------------------------------------------------------------------
    // 1. NO LOOKAHEAD BIAS: Execute Pending Entry at Bar i OPEN with Slippage
    // -------------------------------------------------------------------------
    if (!activePos && pendingSignal && pendingSignal.type === "LONG") {
      const effEntry = openP * (1.0 + slippageRate);
      const alloc = currentCash * pctAlloc;

      if (alloc > 50) {
        const invested = alloc;
        const size = (invested * leverage) / effEntry;
        const entryFee = size * effEntry * feeRate;

        // Deduct invested capital from cash.
        // Entry fee is deducted in trade.pnl on exit to prevent double deduction.
        currentCash -= invested;

        activePos = {
          id: tradeId++,
          symbol: config.symbol,
          type: "LONG",
          entryTime: timeStr,
          entryPrice: effEntry,
          size,
          invested,
          entryFee,
          entryBar: i,
          highestPrice: Math.max(effEntry, highP),
          lowestPrice: Math.min(effEntry, lowP),
        };
      }
      pendingSignal = null;
    }

    // -------------------------------------------------------------------------
    // 2. INTRABAR EXITS & EXIT HIERARCHY EVALUATION
    // -------------------------------------------------------------------------
    if (activePos) {
      activePos.highestPrice = Math.max(activePos.highestPrice, highP);
      activePos.lowestPrice = Math.min(activePos.lowestPrice, lowP);

      let exitReason: TradeRecord["exitReason"] | null = null;
      let rawExitPrice: number | null = null;

      // 2a. Stop Loss & Take Profit Price Levels
      const slPrice =
        stopLossPct !== null
          ? activePos.entryPrice * (1.0 - (stopLossPct / 100) / leverage)
          : null;
      const tpPrice =
        takeProfitPct !== null
          ? activePos.entryPrice * (1.0 + (takeProfitPct / 100) / leverage)
          : null;

      const hitSL = slPrice !== null && lowP <= slPrice;
      const hitTP = tpPrice !== null && highP >= tpPrice;

      // Conservative Tie-Resolution Rule:
      // If both SL and TP fall within the same bar's High-Low range, assume Stop Loss hit first
      if (hitSL && hitTP) {
        exitReason = "Stop Loss";
        rawExitPrice = slPrice;
      } else if (hitSL) {
        exitReason = "Stop Loss";
        rawExitPrice = slPrice;
      } else if (hitTP) {
        exitReason = "Take Profit";
        rawExitPrice = tpPrice;
      }

      // 2b. Trailing Stop (Configurable & OFF by default)
      if (!exitReason && trailingStopPct !== null && trailingStopPct > 0) {
        const trailPrice =
          activePos.highestPrice * (1.0 - trailingStopPct / 100);
        if (
          lowP <= trailPrice &&
          (stopLossPct === null || trailPrice > activePos.entryPrice)
        ) {
          exitReason = "Trailing Stop";
          rawExitPrice = trailPrice;
        }
      }

      // 2c. Signal Exit (Opposite crossover or strategy exit condition on closed bar i)
      if (!exitReason && signals[i] === -1) {
        exitReason = "Signal Exit";
        rawExitPrice = closeP;
      }

      // 2d. End of Backtest (close any open trade at the final bar close)
      if (!exitReason && i === candles.length - 1) {
        exitReason = "End of Backtest";
        rawExitPrice = closeP;
      }

      // -----------------------------------------------------------------------
      // 2e. ONE SOURCE OF TRUTH FOR P&L (Cash & Trade Realization)
      // -----------------------------------------------------------------------
      if (exitReason && rawExitPrice !== null) {
        const exitPrice = rawExitPrice * (1.0 - slippageRate);
        const grossExit = activePos.size * exitPrice;
        const exitFee = grossExit * feeRate;
        const totalFees = activePos.entryFee + exitFee;

        // Gross PnL
        const grossPnl =
          (exitPrice - activePos.entryPrice) * activePos.size;
        const pnl = grossPnl - totalFees;
        const pnlPct = (pnl / activePos.invested) * 100;

        const roundedPnl = Number(pnl.toFixed(2));
        const roundedFees = Number(totalFees.toFixed(2));

        // Restore invested capital and add net trade P&L to account cash
        currentCash += activePos.invested + roundedPnl;

        trades.push({
          id: activePos.id,
          symbol: config.symbol,
          type: activePos.type,
          entryTime: activePos.entryTime,
          exitTime: timeStr,
          entryPrice: Number(activePos.entryPrice.toFixed(4)),
          exitPrice: Number(exitPrice.toFixed(4)),
          size: Number(activePos.size.toFixed(4)),
          investedAmount: Number(activePos.invested.toFixed(2)),
          pnl: roundedPnl,
          pnlPct: Number(pnlPct.toFixed(2)),
          exitReason,
          feePaid: roundedFees,
          durationBars: Math.max(0, i - activePos.entryBar),
        });

        activePos = null;
      }
    }

    // -------------------------------------------------------------------------
    // 3. NO LOOKAHEAD BIAS: Record Signal on Closed Bar i for Execution on Bar i+1
    // -------------------------------------------------------------------------
    if (!activePos && signals[i] === 1 && i < candles.length - 1) {
      pendingSignal = { type: "LONG", barIndex: i };
    }

    // -------------------------------------------------------------------------
    // 4. MARK-TO-MARKET CONTINUOUS EQUITY CURVE
    // -------------------------------------------------------------------------
    let currentEquity: number;
    if (activePos) {
      // Position is active: compute unrealized P&L against bar close minus estimated exit costs
      const estExitPrice = closeP * (1.0 - slippageRate);
      const grossUnrealized =
        (estExitPrice - activePos.entryPrice) * activePos.size;
      const estExitFee = activePos.size * estExitPrice * feeRate;
      const unrealizedPnl =
        grossUnrealized - activePos.entryFee - estExitFee;

      currentEquity = currentCash + activePos.invested + unrealizedPnl;
    } else {
      currentEquity = currentCash;
    }

    peakEquity = Math.max(peakEquity, currentEquity);
    const ddPct =
      peakEquity > 0 ? ((peakEquity - currentEquity) / peakEquity) * 100 : 0;
    const benchmarkVal = initialCap * (closeP / benchmarkBase);

    equityCurve.push({
      timestamp: timeStr,
      equity: Number(currentEquity.toFixed(2)),
      benchmark: Number(benchmarkVal.toFixed(2)),
      drawdownPct: Number(ddPct.toFixed(2)),
    });
  }

  // ---------------------------------------------------------------------------
  // 5. SUMMARY METRICS & STATISTICAL AUDIT
  // ---------------------------------------------------------------------------
  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.pnl > 0);
  const losingTrades = trades.filter((t) => t.pnl <= 0);
  const winCount = winningTrades.length;
  const lossCount = losingTrades.length;
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;

  const grossProfit = winningTrades.reduce((acc, t) => acc + t.pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + t.pnl, 0));
  const profitFactor =
    grossLoss > 0
      ? grossProfit / grossLoss
      : grossProfit > 0
      ? 99.0
      : 0;

  // Single source of truth: finalEquity is currentCash (all trades exited)
  const finalEquity = Number(currentCash.toFixed(2));
  const netProfit = Number((finalEquity - initialCap).toFixed(2));
  const netProfitPct = Number(((netProfit / initialCap) * 100).toFixed(2));
  const benchmarkReturnPct = Number(
    (((closes[closes.length - 1] - closes[0]) / closes[0]) * 100).toFixed(2)
  );
  const alpha = Number((netProfitPct - benchmarkReturnPct).toFixed(2));

  // Max Drawdown calculation from the continuous mark-to-market equity curve
  let maxDdPct = 0;
  let maxDdAmt = 0;
  let runningPeak = initialCap;

  for (const pt of equityCurve) {
    if (pt.equity > runningPeak) {
      runningPeak = pt.equity;
    }
    const curDdAmt = runningPeak - pt.equity;
    const curDdPct = runningPeak > 0 ? (curDdAmt / runningPeak) * 100 : 0;
    if (curDdPct > maxDdPct) maxDdPct = curDdPct;
    if (curDdAmt > maxDdAmt) maxDdAmt = curDdAmt;
  }

  // Risk-adjusted metrics (Sharpe & Sortino)
  const dailyReturns: number[] = [];
  for (let k = 1; k < equityCurve.length; k++) {
    const prev = equityCurve[k - 1].equity;
    const cur = equityCurve[k].equity;
    if (prev > 0) dailyReturns.push((cur - prev) / prev);
  }

  let sharpe = 0;
  let sortino = 0;
  if (dailyReturns.length > 1) {
    const avgR =
      dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance =
      dailyReturns.reduce((acc, r) => acc + Math.pow(r - avgR, 2), 0) /
      (dailyReturns.length - 1);
    const stdDev = Math.sqrt(variance);

    const downside = dailyReturns.filter((r) => r < 0);
    const downVariance =
      downside.length > 0
        ? downside.reduce((acc, r) => acc + r * r, 0) / downside.length
        : 0.0001;
    const downStdDev = Math.sqrt(downVariance);

    const tfMin = TF_MINUTES[config.timeframe] || 60;
    const factor = Math.sqrt(252 * (1440 / tfMin));
    sharpe = stdDev > 0 ? (avgR / stdDev) * factor : 0;
    sortino = downStdDev > 0 ? (avgR / downStdDev) * factor : 0;
  }

  const avgWin = winCount > 0 ? grossProfit / winCount : 0;
  const avgLoss = lossCount > 0 ? grossLoss / lossCount : 0;
  const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : 0;
  const avgTradePnl = totalTrades > 0 ? netProfit / totalTrades : 0;

  let curWinStreak = 0;
  let curLossStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  for (const t of trades) {
    if (t.pnl > 0) {
      curWinStreak++;
      curLossStreak = 0;
      maxWinStreak = Math.max(maxWinStreak, curWinStreak);
    } else {
      curLossStreak++;
      curWinStreak = 0;
      maxLossStreak = Math.max(maxLossStreak, curLossStreak);
    }
  }

  const totalFeesPaid = Number(
    trades.reduce((acc, t) => acc + t.feePaid, 0).toFixed(2)
  );
  const expectancy =
    totalTrades > 0
      ? (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss
      : 0;

  // Monthly breakdown
  const monthlyBuckets: Record<string, number[]> = {};
  for (const pt of equityCurve) {
    const ym = String(pt.timestamp).substring(0, 7);
    if (!monthlyBuckets[ym]) monthlyBuckets[ym] = [];
    monthlyBuckets[ym].push(pt.equity);
  }

  const monthlyReturns: Record<string, number> = {};
  for (const [ym, arr] of Object.entries(monthlyBuckets)) {
    if (arr.length >= 2) {
      monthlyReturns[ym] = Number(
        (((arr[arr.length - 1] - arr[0]) / arr[0]) * 100).toFixed(2)
      );
    } else {
      monthlyReturns[ym] = 0;
    }
  }

  const summary: BacktestSummary = {
    initialCapital: Number(initialCap.toFixed(2)),
    finalEquity,
    netProfit,
    netProfitPct,
    benchmarkReturnPct,
    alpha,
    totalTrades,
    winningTrades: winCount,
    losingTrades: lossCount,
    winRatePct: Number(winRate.toFixed(2)),
    profitFactor: Number(Math.min(profitFactor, 99.9).toFixed(2)),
    maxDrawdownPct: Number(maxDdPct.toFixed(2)),
    maxDrawdownAmount: Number(maxDdAmt.toFixed(2)),
    sharpeRatio: Number(sharpe.toFixed(2)),
    sortinoRatio: Number(sortino.toFixed(2)),
    avgTradePnl: Number(avgTradePnl.toFixed(2)),
    avgWinPnl: Number(avgWin.toFixed(2)),
    avgLossPnl: Number(avgLoss.toFixed(2)),
    winLossRatio: Number(winLossRatio.toFixed(2)),
    maxConsecutiveWins: maxWinStreak,
    maxConsecutiveLosses: maxLossStreak,
    totalFeesPaid,
    expectancy: Number(expectancy.toFixed(2)),
    dataSource,
    isSynthetic,
  };

  return {
    success: true,
    strategy: config.strategy,
    symbol: config.symbol,
    timeframe: config.timeframe,
    summary,
    equityCurve,
    trades,
    monthlyReturns,
    source: isSynthetic ? "client" : "real_market_data",
    dataSource,
    isSynthetic,
  };
}

/**
 * Top-level backtest orchestrator with Kite connect and real market data integration.
 */
export async function runServerOrClientBacktest(
  config: BacktestConfig,
  preferServer = false
): Promise<BacktestResult> {
  // Option 1: Fast API / Orion Python Backend (only when preferServer is requested)
  if (preferServer) {
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${apiUrl}/api/v1/backtest/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          strategy: config.strategy,
          symbol: config.symbol,
          timeframe: config.timeframe,
          initial_capital: config.initialCapital,
          date_range_days: config.dateRangeDays,
          slippage_pct: config.slippagePct,
          fee_pct: config.feePct,
          leverage: config.leverage,
          stop_loss_pct: config.stopLossPct,
          take_profit_pct: config.takeProfitPct,
          trailing_stop_pct: config.trailingStopPct,
          strategy_params: config.strategyParams,
        }),
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const serverResult: BacktestResult = {
          ...data,
          summary: {
            initialCapital: data.summary.initial_capital,
            finalEquity: data.summary.final_equity,
            netProfit: data.summary.net_profit,
            netProfitPct: data.summary.net_profit_pct,
            benchmarkReturnPct: data.summary.benchmark_return_pct,
            alpha: data.summary.alpha,
            totalTrades: data.summary.total_trades,
            winningTrades: data.summary.winning_trades,
            losingTrades: data.summary.losing_trades,
            winRatePct: data.summary.win_rate_pct,
            profitFactor: data.summary.profit_factor,
            maxDrawdownPct: data.summary.max_drawdown_pct,
            maxDrawdownAmount: data.summary.max_drawdown_amount,
            sharpeRatio: data.summary.sharpe_ratio,
            sortinoRatio: data.summary.sortino_ratio,
            avgTradePnl: data.summary.avg_trade_pnl,
            avgWinPnl: data.summary.avg_win_pnl,
            avgLossPnl: data.summary.avg_loss_pnl,
            winLossRatio: data.summary.win_loss_ratio,
            maxConsecutiveWins: data.summary.max_consecutive_wins,
            maxConsecutiveLosses: data.summary.max_consecutive_losses,
            totalFeesPaid: data.summary.total_fees_paid,
            expectancy: data.summary.expectancy,
            dataSource: data.summary.data_source || "SERVER",
            isSynthetic: Boolean(data.summary.is_synthetic),
          },
          equityCurve: data.equity_curve.map((pt: any) => ({
            timestamp: pt.timestamp,
            equity: pt.equity,
            benchmark: pt.benchmark,
            drawdownPct: pt.drawdown_pct,
          })),
          trades: data.trades.map((t: any) => ({
            id: t.id,
            symbol: t.symbol,
            type: t.type,
            entryTime: t.entry_time,
            exitTime: t.exit_time,
            entryPrice: t.entry_price,
            exitPrice: t.exit_price,
            size: t.size,
            investedAmount: t.invested_amount,
            pnl: t.pnl,
            pnlPct: t.pnl_pct,
            exitReason: t.exit_reason,
            feePaid: t.fee_paid,
            durationBars: t.duration_bars,
          })),
          monthlyReturns: data.monthly_returns || {},
          source: "server",
          dataSource: data.data_source || "SERVER",
          isSynthetic: Boolean(data.is_synthetic),
        };

        // Persist to Supabase Database
        await persistBacktestResult(config, serverResult);
        return serverResult;
      }
    } catch {
      // Fallback to local execution
    }
  }

  // Option 2: Kite Connect historical market data / NSE simulated candle service
  try {
    const { kiteDataService } = await import("./kiteDataService");
    const toDate = new Date();
    const days = config.dateRangeDays && config.dateRangeDays > 0 ? config.dateRangeDays : 90;
    const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);

    const kiteCandles = await kiteDataService.getCandles(
      config.symbol,
      config.timeframe as any,
      fromDate,
      toDate
    );
    if (kiteCandles && Array.isArray(kiteCandles) && kiteCandles.length >= 10) {
      const result = runClientBacktest(config, kiteCandles);
      const hasKiteKeys = Boolean(
        process.env.KITE_API_KEY ||
        process.env.NEXT_PUBLIC_KITE_API_KEY ||
        process.env.KITE_ACCESS_TOKEN ||
        process.env.NEXT_PUBLIC_KITE_ACCESS_TOKEN
      );
      const isSynth = !hasKiteKeys || kiteCandles[0]?.source === "SYNTHETIC";
      const sourceName = isSynth ? "SIMULATED (NSE)" : "ZERODHA KITE";
      result.source = isSynth ? "synthetic" : "kite";
      result.dataSource = sourceName;
      result.isSynthetic = isSynth;
      result.summary.dataSource = sourceName;
      result.summary.isSynthetic = isSynth;

      await persistBacktestResult(config, result);
      return result;
    }
  } catch {
    // Fallback to market data API route
  }

  // Option 3: Real historical candles from Next.js API route
  try {
    const encSymbol = encodeURIComponent(config.symbol);
    const res = await fetch(
      `/api/market-data/history?symbol=${encSymbol}&timeframe=${config.timeframe}&limit=120`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.candles && Array.isArray(data.candles) && data.candles.length >= 10) {
        const realCandles: Candle[] = data.candles.map((c: any) => ({
          timestamp: new Date(c.timestamp).toISOString(),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
          isSynthetic: false,
          source: "REAL_MARKET_DATA",
        }));

        const result = runClientBacktest(config, realCandles);
        result.source = "real_market_data";
        result.dataSource = "REAL_MARKET_DATA";
        result.isSynthetic = false;
        result.summary.dataSource = "REAL_MARKET_DATA";
        result.summary.isSynthetic = false;

        await persistBacktestResult(config, result);
        return result;
      }
    }
  } catch (err) {
    console.warn("Could not fetch real historical candles for backtest, using baseline:", err);
  }

  // Option 4: Client deterministic synthetic backtest
  const fallbackResult = runClientBacktest(config);
  await persistBacktestResult(config, fallbackResult);
  return fallbackResult;
}
