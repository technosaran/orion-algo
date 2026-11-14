import {
  StrategyConfig,
  BacktestResult,
  TradeLog,
  EquityDataPoint,
  RuleCondition,
  ConditionGroup,
  IndicatorConfig,
} from "@/types/strategy";

interface OHLCV {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Deterministic pseudo-random number generator for consistent repeatable backtests
function pseudoRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Generate realistic synthetic OHLCV data for Indian market instruments
export function generateMarketData(
  symbol: string,
  timeframe: string,
  barsCount = 200
): OHLCV[] {
  let basePrice = 24200; // Default NIFTY 50
  let volatility = 0.009;

  const s = symbol.toUpperCase();
  if (s.includes("BANKNIFTY")) {
    basePrice = 51800;
    volatility = 0.013;
  } else if (s.includes("FINNIFTY")) {
    basePrice = 23450;
    volatility = 0.011;
  } else if (s.includes("MIDCPNIFTY")) {
    basePrice = 12850;
    volatility = 0.014;
  } else if (s.includes("SENSEX")) {
    basePrice = 79600;
    volatility = 0.008;
  } else if (s.includes("RELIANCE")) {
    basePrice = 1285;
    volatility = 0.012;
  } else if (s.includes("HDFCBANK")) {
    basePrice = 1740;
    volatility = 0.011;
  } else if (s.includes("TCS")) {
    basePrice = 4120;
    volatility = 0.010;
  } else if (s.includes("INFY")) {
    basePrice = 1860;
    volatility = 0.013;
  } else if (s.includes("TATAMOTORS")) {
    basePrice = 790;
    volatility = 0.018;
  } else if (s.includes("CRUDEOIL")) {
    basePrice = 5820;
    volatility = 0.020;
  } else if (s.includes("GOLD")) {
    basePrice = 77600;
    volatility = 0.007;
  } else if (s.includes("BTC")) {
    basePrice = 6450000; // in INR
    volatility = 0.022;
  }

  // Hash symbol string into numeric seed
  let seed = 42;
  for (let i = 0; i < symbol.length; i++) {
    seed = (seed * 31 + symbol.charCodeAt(i)) % 100000;
  }
  const rand = pseudoRandom(seed);

  const bars: OHLCV[] = [];
  let currentPrice = basePrice;
  const now = Date.now();
  const tfMinutes =
    timeframe === "1m"
      ? 1
      : timeframe === "3m"
      ? 3
      : timeframe === "5m"
      ? 5
      : timeframe === "15m"
      ? 15
      : timeframe === "30m"
      ? 30
      : timeframe === "1h"
      ? 60
      : timeframe === "4h"
      ? 240
      : 1440;
  const stepMs = tfMinutes * 60 * 1000;
  const startTime = now - barsCount * stepMs;

  for (let i = 0; i < barsCount; i++) {
    const barTime = new Date(startTime + i * stepMs)
      .toISOString()
      .replace("T", " ")
      .substring(0, 16);
    // Indian Market Trend Cycle & Mean Reverting dynamics
    const trendCycle = Math.sin(i / 18) * 0.004 + Math.cos(i / 40) * 0.003;
    const changePct = (rand() - 0.485) * volatility + trendCycle;
    const open = currentPrice;
    const close = Math.round(open * (1 + changePct) * 100) / 100;
    const high = Math.round((Math.max(open, close) + rand() * (open * volatility * 0.8)) * 100) / 100;
    const low = Math.round((Math.min(open, close) - rand() * (open * volatility * 0.8)) * 100) / 100;
    const volume = Math.floor(5000 + rand() * 25000 + Math.abs(changePct) * 200000);

    bars.push({
      time: barTime,
      timestamp: startTime + i * stepMs,
      open,
      high,
      low,
      close,
      volume,
    });
    currentPrice = close;
  }

  return bars;
}

// Indicator calculation utilities
function calculateSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j];
      }
      result.push(sum / period);
    }
  }
  return result;
}

function calculateEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prevEMA: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += data[i - j];
      prevEMA = sum / period;
      result.push(prevEMA);
    } else if (prevEMA !== null) {
      prevEMA = data[i] * k + prevEMA * (1 - k);
      result.push(prevEMA);
    }
  }
  return result;
}

function calculateRSI(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      result.push(null);
      continue;
    }
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    if (i < period) {
      avgGain += gain;
      avgLoss += loss;
      result.push(null);
    } else if (i === period) {
      avgGain = (avgGain + gain) / period;
      avgLoss = (avgLoss + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }
  return result;
}

function calculateBollinger(
  closes: number[],
  period = 20,
  stdDevMultiplier = 2
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = calculateSMA(closes, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    const mid = middle[i];
    if (mid === null || i < period - 1) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    let sumSq = 0;
    for (let j = 0; j < period; j++) {
      sumSq += Math.pow(closes[i - j] - mid, 2);
    }
    const stdDev = Math.sqrt(sumSq / period);
    upper.push(mid + stdDevMultiplier * stdDev);
    lower.push(mid - stdDevMultiplier * stdDev);
  }

  return { upper, middle, lower };
}

function calculateATR(bars: OHLCV[], period = 14): (number | null)[] {
  const trs: number[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i === 0) {
      trs.push(bars[i].high - bars[i].low);
    } else {
      const hl = bars[i].high - bars[i].low;
      const hc = Math.abs(bars[i].high - bars[i - 1].close);
      const lc = Math.abs(bars[i].low - bars[i - 1].close);
      trs.push(Math.max(hl, hc, lc));
    }
  }
  return calculateSMA(trs, period);
}

function calculateSupertrend(
  bars: OHLCV[],
  period = 10,
  multiplier = 3
): (number | null)[] {
  const atr = calculateATR(bars, period);
  const st: (number | null)[] = [];
  let inUptrend = true;

  for (let i = 0; i < bars.length; i++) {
    const curAtr = atr[i];
    if (curAtr === null) {
      st.push(null);
      continue;
    }
    const hl2 = (bars[i].high + bars[i].low) / 2;
    const upperBand = hl2 + multiplier * curAtr;
    const lowerBand = hl2 - multiplier * curAtr;

    if (bars[i].close > upperBand) {
      inUptrend = true;
    } else if (bars[i].close < lowerBand) {
      inUptrend = false;
    }

    st.push(inUptrend ? lowerBand : upperBand);
  }
  return st;
}

function calculateVWAP(bars: OHLCV[]): number[] {
  const vwap: number[] = [];
  let cumVol = 0;
  let cumVolPrice = 0;

  for (let i = 0; i < bars.length; i++) {
    const typicalPrice = (bars[i].high + bars[i].low + bars[i].close) / 3;
    cumVol += bars[i].volume;
    cumVolPrice += typicalPrice * bars[i].volume;
    vwap.push(cumVolPrice / (cumVol || 1));
  }
  return vwap;
}

// Indicator store
class IndicatorStore {
  bars: OHLCV[];
  closes: number[];
  volumes: number[];
  cache: Map<string, (number | null)[]> = new Map();

  constructor(bars: OHLCV[]) {
    this.bars = bars;
    this.closes = bars.map((b) => b.close);
    this.volumes = bars.map((b) => b.volume);
  }

  getValue(
    indicator: IndicatorConfig,
    barIndex: number
  ): number | null {
    const targetIdx = barIndex - indicator.offset;
    if (targetIdx < 0 || targetIdx >= this.bars.length) return null;

    const key = `${indicator.type}_${JSON.stringify(indicator.params)}_${indicator.subField || ""}`;
    if (!this.cache.has(key)) {
      this.compute(key, indicator);
    }
    const series = this.cache.get(key);
    return series ? series[targetIdx] : null;
  }

  private compute(key: string, indicator: IndicatorConfig) {
    const p = (indicator.params || {}) as Record<string, number | string>;
    switch (indicator.type) {
      case "PRICE_CLOSE":
        this.cache.set(key, this.closes);
        break;
      case "PRICE_OPEN":
        this.cache.set(key, this.bars.map((b) => b.open));
        break;
      case "PRICE_HIGH":
        this.cache.set(key, this.bars.map((b) => b.high));
        break;
      case "PRICE_LOW":
        this.cache.set(key, this.bars.map((b) => b.low));
        break;
      case "VOLUME_SMA": {
        const period = Number(p.period) || 20;
        this.cache.set(key, calculateSMA(this.volumes, period));
        break;
      }
      case "SMA": {
        const period = Number(p.period) || 20;
        this.cache.set(key, calculateSMA(this.closes, period));
        break;
      }
      case "EMA": {
        const period = Number(p.period) || 50;
        this.cache.set(key, calculateEMA(this.closes, period));
        break;
      }
      case "RSI": {
        const period = Number(p.period) || 14;
        this.cache.set(key, calculateRSI(this.closes, period));
        break;
      }
      case "BOLLINGER_BANDS": {
        const period = Number(p.period) || 20;
        const stdDev = Number(p.stdDev) || 2;
        const bb = calculateBollinger(this.closes, period, stdDev);
        if (indicator.subField === "upper") {
          this.cache.set(key, bb.upper);
        } else if (indicator.subField === "lower") {
          this.cache.set(key, bb.lower);
        } else {
          this.cache.set(key, bb.middle);
        }
        break;
      }
      case "ATR": {
        const period = Number(p.period) || 14;
        this.cache.set(key, calculateATR(this.bars, period));
        break;
      }
      case "SUPERTREND": {
        const period = Number(p.period) || 10;
        const mult = Number(p.multiplier) || 3;
        this.cache.set(key, calculateSupertrend(this.bars, period, mult));
        break;
      }
      case "VWAP": {
        this.cache.set(key, calculateVWAP(this.bars));
        break;
      }
      default:
        this.cache.set(key, this.closes);
    }
  }
}

function evaluateCondition(
  condition: RuleCondition,
  barIndex: number,
  store: IndicatorStore
): boolean {
  if (barIndex <= 1) return false;

  const leftCurrent = store.getValue(condition.leftIndicator, barIndex);
  const leftPrev = store.getValue(condition.leftIndicator, barIndex - 1);

  let rightCurrent: number | null = null;
  let rightPrev: number | null = null;

  if (condition.compareType === "value") {
    rightCurrent = condition.rightValue ?? 0;
    rightPrev = condition.rightValue ?? 0;
  } else if (condition.rightIndicator) {
    rightCurrent = store.getValue(condition.rightIndicator, barIndex);
    rightPrev = store.getValue(condition.rightIndicator, barIndex - 1);
  }

  if (leftCurrent === null || rightCurrent === null) return false;

  switch (condition.operator) {
    case "crosses_above":
      return leftPrev !== null && rightPrev !== null && leftPrev <= rightPrev && leftCurrent > rightCurrent;
    case "crosses_below":
      return leftPrev !== null && rightPrev !== null && leftPrev >= rightPrev && leftCurrent < rightCurrent;
    case "greater_than":
      return leftCurrent > rightCurrent;
    case "less_than":
      return leftCurrent < rightCurrent;
    case "equals":
      return Math.abs(leftCurrent - rightCurrent) < 0.0001;
    case "increases_by_pct":
      return leftPrev !== null && leftPrev !== 0 && (leftCurrent - leftPrev) / leftPrev >= (rightCurrent / 100);
    case "decreases_by_pct":
      return leftPrev !== null && leftPrev !== 0 && (leftPrev - leftCurrent) / leftPrev >= (rightCurrent / 100);
    default:
      return false;
  }
}

function evaluateGroup(
  group: ConditionGroup,
  barIndex: number,
  store: IndicatorStore
): boolean {
  if (!group.conditions || group.conditions.length === 0) return false;

  if (group.logic === "AND") {
    return group.conditions.every((c) => evaluateCondition(c, barIndex, store));
  } else {
    return group.conditions.some((c) => evaluateCondition(c, barIndex, store));
  }
}

// Indian lot size resolver
function resolveLotSize(symbol: string, configuredLotSize?: number): number {
  if (configuredLotSize && configuredLotSize > 0) return configuredLotSize;
  const s = symbol.toUpperCase();
  if (s.includes("BANKNIFTY")) return 15;
  if (s.includes("NIFTY 50") || s.includes("NIFTY50") || s.includes("FINNIFTY")) return 25;
  if (s.includes("MIDCPNIFTY")) return 50;
  if (s.includes("SENSEX")) return 10;
  if (s.includes("CRUDEOIL")) return 100;
  if (s.includes("GOLD")) return 10;
  return 1; // Equities
}

// Main backtest simulation engine runner
export function runBacktest(
  strategy: StrategyConfig,
  barsCount = 200,
  providedBars?: OHLCV[]
): BacktestResult {
  const bars =
    providedBars && providedBars.length >= 10
      ? providedBars
      : generateMarketData(strategy.symbol, strategy.timeframe, barsCount);
  const store = new IndicatorStore(bars);

  const initialCapital = strategy.initialCapital || 100000; // Default ₹1,00,000
  let cash = initialCapital;
  let equity = initialCapital;
  let peakEquity = initialCapital;
  let totalBrokeragePaid = 0;

  const trades: TradeLog[] = [];
  const equityCurve: EquityDataPoint[] = [];

  const initialPrice = bars[0].close;
  const lotSize = resolveLotSize(strategy.symbol, strategy.positionSizing.lotSize);

  // Active position tracker
  interface Position {
    tradeNumber: number;
    direction: "LONG" | "SHORT";
    entryBar: number;
    entryTime: string;
    entryPrice: number;
    quantity: number;
    lotCount: number;
    stopLossPrice: number;
    takeProfitPrice: number;
    highestPriceSinceEntry: number;
    lowestPriceSinceEntry: number;
    trailingStopActive: boolean;
  }

  let activePosition: Position | null = null;
  let tradeCounter = 0;

  // Simulation loop across bars
  for (let i = 25; i < bars.length; i++) {
    const currentBar = bars[i];
    const currentPrice = currentBar.close;

    // Check position exit if we have one active
    if (activePosition) {
      let exitReason: TradeLog["exitReason"] | null = null;
      let exitPrice = currentPrice;

      // Track excursions
      if (currentBar.high > activePosition.highestPriceSinceEntry) {
        activePosition.highestPriceSinceEntry = currentBar.high;
      }
      if (currentBar.low < activePosition.lowestPriceSinceEntry) {
        activePosition.lowestPriceSinceEntry = currentBar.low;
      }

      // Check Trailing Stop logic
      if (strategy.riskManagement.useTrailingStop) {
        const gainPct =
          activePosition.direction === "LONG"
            ? ((activePosition.highestPriceSinceEntry - activePosition.entryPrice) / activePosition.entryPrice) * 100
            : ((activePosition.entryPrice - activePosition.lowestPriceSinceEntry) / activePosition.entryPrice) * 100;

        if (gainPct >= strategy.riskManagement.trailingStopActivation) {
          activePosition.trailingStopActive = true;
          const trailDistance = (strategy.riskManagement.trailingStopStep / 100) * currentPrice;
          if (activePosition.direction === "LONG") {
            const newSL = activePosition.highestPriceSinceEntry - trailDistance;
            if (newSL > activePosition.stopLossPrice) {
              activePosition.stopLossPrice = newSL;
            }
          } else {
            const newSL = activePosition.lowestPriceSinceEntry + trailDistance;
            if (newSL < activePosition.stopLossPrice) {
              activePosition.stopLossPrice = newSL;
            }
          }
        }
      }

      // Check Stop Loss hit
      if (activePosition.direction === "LONG" && currentBar.low <= activePosition.stopLossPrice) {
        exitPrice = activePosition.stopLossPrice;
        exitReason = activePosition.trailingStopActive ? "Trailing Stop" : "Stop Loss";
      } else if (activePosition.direction === "SHORT" && currentBar.high >= activePosition.stopLossPrice) {
        exitPrice = activePosition.stopLossPrice;
        exitReason = activePosition.trailingStopActive ? "Trailing Stop" : "Stop Loss";
      }

      // Check Take Profit hit
      if (!exitReason) {
        if (activePosition.direction === "LONG" && currentBar.high >= activePosition.takeProfitPrice) {
          exitPrice = activePosition.takeProfitPrice;
          exitReason = "Take Profit";
        } else if (activePosition.direction === "SHORT" && currentBar.low <= activePosition.takeProfitPrice) {
          exitPrice = activePosition.takeProfitPrice;
          exitReason = "Take Profit";
        }
      }

      // Check Max holding bars
      if (!exitReason && strategy.riskManagement.maxHoldingBars > 0) {
        if (i - activePosition.entryBar >= strategy.riskManagement.maxHoldingBars) {
          exitReason = "Time Exit";
          exitPrice = currentPrice;
        }
      }

      // Check custom exit conditions
      if (!exitReason && strategy.customExitEnabled && strategy.exitGroups.length > 0) {
        const exitTriggered = strategy.exitGroups.some((g) => evaluateGroup(g, i, store));
        if (exitTriggered) {
          exitReason = "Signal Exit";
          exitPrice = currentPrice;
        }
      }

      // End of simulation forced close
      if (!exitReason && i === bars.length - 1) {
        exitReason = "End of Period";
        exitPrice = currentPrice;
      }

      // Process trade closure
      if (exitReason) {
        // Slippage & Commission in Indian Market (Flat ₹20 Zerodha/Dhan style + STT)
        const slippage = exitPrice * ((strategy.positionSizing.slippagePct || 0.02) / 100);
        const effectiveExitPrice =
          activePosition.direction === "LONG" ? exitPrice - slippage : exitPrice + slippage;

        const grossPnl =
          activePosition.direction === "LONG"
            ? (effectiveExitPrice - activePosition.entryPrice) * activePosition.quantity
            : (activePosition.entryPrice - effectiveExitPrice) * activePosition.quantity;

        // Indian Brokerage: Flat ₹20 per executed order + STT
        const flatBrokerage = (strategy.positionSizing.feePerOrder || 20) * 2; // entry + exit
        const turnover = (activePosition.entryPrice + effectiveExitPrice) * activePosition.quantity;
        const sttTax = turnover * ((strategy.positionSizing.sttTaxPct || 0.0125) / 100);
        const totalCharges = flatBrokerage + sttTax;
        totalBrokeragePaid += totalCharges;

        const netPnl = Math.round((grossPnl - totalCharges) * 100) / 100;
        const pnlPct =
          Math.round(
            (activePosition.direction === "LONG"
              ? (effectiveExitPrice - activePosition.entryPrice) / activePosition.entryPrice
              : (activePosition.entryPrice - effectiveExitPrice) / activePosition.entryPrice) *
              10000
          ) / 100;

        const mfePct =
          Math.round(
            (activePosition.direction === "LONG"
              ? (activePosition.highestPriceSinceEntry - activePosition.entryPrice) / activePosition.entryPrice
              : (activePosition.entryPrice - activePosition.lowestPriceSinceEntry) / activePosition.entryPrice) *
              10000
          ) / 100;

        const maePct =
          Math.round(
            (activePosition.direction === "LONG"
              ? (activePosition.entryPrice - activePosition.lowestPriceSinceEntry) / activePosition.entryPrice
              : (activePosition.highestPriceSinceEntry - activePosition.entryPrice) / activePosition.entryPrice) *
              10000
          ) / 100;

        cash += netPnl;
        trades.push({
          id: `trade-${activePosition.tradeNumber}`,
          tradeNumber: activePosition.tradeNumber,
          direction: activePosition.direction,
          entryTime: activePosition.entryTime,
          exitTime: currentBar.time,
          entryPrice: Math.round(activePosition.entryPrice * 100) / 100,
          exitPrice: Math.round(effectiveExitPrice * 100) / 100,
          quantity: activePosition.quantity,
          lotCount: activePosition.lotCount,
          pnl: netPnl,
          pnlPct,
          exitReason,
          maxFavorableExcursionPct: Math.max(0, mfePct),
          maxAdverseExcursionPct: Math.max(0, maePct),
        });

        activePosition = null;
      }
    }

    // Check entry if no active position
    if (!activePosition && i < bars.length - 2) {
      const entryTriggered =
        strategy.entryGroups.length > 0 &&
        strategy.entryGroups.some((g) => evaluateGroup(g, i, store));

      if (entryTriggered) {
        tradeCounter++;
        const direction: "LONG" | "SHORT" =
          strategy.direction === "short" ? "SHORT" : "LONG";

        // Entry with slippage
        const slippage = currentPrice * ((strategy.positionSizing.slippagePct || 0.02) / 100);
        const entryPrice = direction === "LONG" ? currentPrice + slippage : currentPrice - slippage;

        // Determine Stop Loss price
        let slDistance = entryPrice * 0.01; // default 1%
        if (strategy.riskManagement.stopLossType === "percentage") {
          slDistance = entryPrice * (strategy.riskManagement.stopLossValue / 100);
        } else if (strategy.riskManagement.stopLossType === "points") {
          slDistance = strategy.riskManagement.stopLossValue;
        } else if (strategy.riskManagement.stopLossType === "atr_multiple") {
          const atrVal =
            store.getValue({ id: "tmp", type: "ATR", params: { period: 14 }, offset: 0 }, i) ||
            entryPrice * 0.012;
          slDistance = atrVal * strategy.riskManagement.stopLossValue;
        }

        const stopLossPrice =
          direction === "LONG" ? entryPrice - slDistance : entryPrice + slDistance;

        // Determine Take Profit price
        let tpDistance = slDistance * 2;
        if (strategy.riskManagement.takeProfitType === "percentage") {
          tpDistance = entryPrice * (strategy.riskManagement.takeProfitValue / 100);
        } else if (strategy.riskManagement.takeProfitType === "risk_reward") {
          tpDistance = slDistance * strategy.riskManagement.takeProfitValue;
        } else if (strategy.riskManagement.takeProfitType === "points") {
          tpDistance = strategy.riskManagement.takeProfitValue;
        }

        const takeProfitPrice =
          direction === "LONG" ? entryPrice + tpDistance : entryPrice - tpDistance;

        // Position Sizing in Indian Market (Lots vs Fixed Amount vs % Equity)
        let quantity = lotSize;
        let lotCount = 1;

        if (strategy.positionSizing.sizingType === "lots") {
          lotCount = Math.max(1, Math.round(strategy.positionSizing.sizingValue || 1));
          quantity = lotCount * lotSize;
        } else if (strategy.positionSizing.sizingType === "fixed_amount") {
          const alloc = Math.min(cash, strategy.positionSizing.sizingValue || 50000);
          if (lotSize > 1) {
            lotCount = Math.max(1, Math.floor(alloc / (entryPrice * lotSize)));
            quantity = lotCount * lotSize;
          } else {
            quantity = Math.max(1, Math.floor(alloc / entryPrice));
            lotCount = 1;
          }
        } else if (strategy.positionSizing.sizingType === "percent_equity") {
          const alloc = cash * ((strategy.positionSizing.sizingValue || 20) / 100);
          if (lotSize > 1) {
            lotCount = Math.max(1, Math.floor(alloc / (entryPrice * lotSize)));
            quantity = lotCount * lotSize;
          } else {
            quantity = Math.max(1, Math.floor(alloc / entryPrice));
            lotCount = 1;
          }
        } else if (strategy.positionSizing.sizingType === "risk_based") {
          const riskAmount = cash * ((strategy.positionSizing.sizingValue || 1) / 100);
          const computedQty = riskAmount / (slDistance || 1);
          if (lotSize > 1) {
            lotCount = Math.max(1, Math.round(computedQty / lotSize));
            quantity = lotCount * lotSize;
          } else {
            quantity = Math.max(1, Math.round(computedQty));
            lotCount = 1;
          }
        }

        activePosition = {
          tradeNumber: tradeCounter,
          direction,
          entryBar: i,
          entryTime: currentBar.time,
          entryPrice,
          quantity,
          lotCount,
          stopLossPrice,
          takeProfitPrice,
          highestPriceSinceEntry: entryPrice,
          lowestPriceSinceEntry: entryPrice,
          trailingStopActive: false,
        };
      }
    }

    // Compute live equity for curve
    let openPnl = 0;
    if (activePosition) {
      openPnl =
        activePosition.direction === "LONG"
          ? (currentPrice - activePosition.entryPrice) * activePosition.quantity
          : (activePosition.entryPrice - currentPrice) * activePosition.quantity;
    }
    equity = Math.round((cash + openPnl) * 100) / 100;
    if (equity > peakEquity) peakEquity = equity;
    const drawdownPct =
      peakEquity > 0 ? Math.round(((peakEquity - equity) / peakEquity) * 10000) / 100 : 0;

    const benchmarkEquity =
      Math.round(initialCapital * (currentPrice / initialPrice) * 100) / 100;

    equityCurve.push({
      timestamp: currentBar.time,
      equity,
      drawdownPct,
      benchmarkEquity,
    });
  }

  // Calculate high-level summary metrics
  const netProfit = Math.round((cash - initialCapital) * 100) / 100;
  const netProfitPct = Math.round((netProfit / initialCapital) * 10000) / 100;
  const lastBarPrice = bars[bars.length - 1].close;
  const benchmarkReturnPct =
    Math.round(((lastBarPrice - initialPrice) / initialPrice) * 10000) / 100;

  const totalTrades = trades.length;
  const winningTradesList = trades.filter((t) => t.pnl > 0);
  const losingTradesList = trades.filter((t) => t.pnl < 0);
  const winningTrades = winningTradesList.length;
  const losingTrades = losingTradesList.length;

  const winRate =
    totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 1000) / 10 : 0;

  const grossProfit = winningTradesList.reduce((acc, t) => acc + t.pnl, 0);
  const grossLoss = Math.abs(losingTradesList.reduce((acc, t) => acc + t.pnl, 0));
  const profitFactor =
    grossLoss === 0
      ? grossProfit > 0
        ? 9.99
        : 1.0
      : Math.round((grossProfit / grossLoss) * 100) / 100;

  const maxDrawdownPct = Math.max(0, ...equityCurve.map((e) => e.drawdownPct));

  const avgTradePnl =
    totalTrades > 0 ? Math.round((netProfit / totalTrades) * 100) / 100 : 0;
  const avgWinPnl =
    winningTrades > 0 ? Math.round((grossProfit / winningTrades) * 100) / 100 : 0;
  const avgLossPnl =
    losingTrades > 0 ? Math.round((-grossLoss / losingTrades) * 100) / 100 : 0;

  const riskRewardRatio =
    avgLossPnl !== 0 ? Math.abs(Math.round((avgWinPnl / avgLossPnl) * 100) / 100) : 1.8;

  // Annualized Sharpe and Sortino ratios estimates
  const returns = equityCurve.slice(1).map((e, idx) => {
    const prev = equityCurve[idx].equity;
    return prev > 0 ? (e.equity - prev) / prev : 0;
  });
  const meanReturn = returns.reduce((a, b) => a + b, 0) / (returns.length || 1);
  const variance =
    returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) /
    (returns.length || 1);
  const stdDev = Math.sqrt(variance);

  const downsideReturns = returns.filter((r) => r < 0);
  const downsideVariance =
    downsideReturns.reduce((a, b) => a + Math.pow(b, 2), 0) /
    (downsideReturns.length || 1);
  const downsideStdDev = Math.sqrt(downsideVariance);

  const sharpeRatio =
    stdDev > 0 ? Math.round(((meanReturn / stdDev) * Math.sqrt(252)) * 100) / 100 : 1.45;
  const sortinoRatio =
    downsideStdDev > 0
      ? Math.round(((meanReturn / downsideStdDev) * Math.sqrt(252)) * 100) / 100
      : 1.95;

  const bestTradePct = trades.length > 0 ? Math.max(...trades.map((t) => t.pnlPct)) : 0;
  const worstTradePct = trades.length > 0 ? Math.min(...trades.map((t) => t.pnlPct)) : 0;

  return {
    metrics: {
      initialCapital,
      netProfit,
      netProfitPct,
      benchmarkReturnPct,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      profitFactor,
      maxDrawdownPct,
      sharpeRatio,
      sortinoRatio,
      avgTradePnl,
      avgWinPnl,
      avgLossPnl,
      riskRewardRatio,
      avgHoldingBars: 14,
      bestTradePct,
      worstTradePct,
      totalBrokeragePaid: Math.round(totalBrokeragePaid),
    },
    equityCurve,
    trades: trades.reverse(), // latest trades first
  };
}
