/**
 * Kite Connect Historical Market Data Service & Local Caching Layer
 * Phase 1 Integration for AlgoX Backtesting & Real-Time Analytics
 */

declare const __non_webpack_require__: any;

function getNodeModule(name: string): any {
  if (typeof window !== "undefined") return null;
  try {
    const proc = typeof process !== "undefined" ? (process as any) : null;
    if (proc?.getBuiltinModule) {
      const mod = proc.getBuiltinModule(name);
      if (mod) return mod;
    }
    if (typeof __non_webpack_require__ !== "undefined") {
      return __non_webpack_require__(name);
    }
  } catch {
    // continue
  }
  return null;
}

function getNodeFs(): any {
  return getNodeModule("fs");
}

function getNodePath(): any {
  return getNodeModule("path");
}

const memoryCache = new Map<string, CachePayload>();

// ---------------------------------------------------------------------------
// 1. Types & Interfaces
// ---------------------------------------------------------------------------

export type CandleSource = "KITE" | "CACHED" | "SYNTHETIC";

export interface KiteHistoricalCandle {
  timestamp: string; // ISO string in IST (+05:30)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  oi?: number;
  source: CandleSource;
}

export type SupportedTimeframe =
  | "1m"
  | "3m"
  | "5m"
  | "10m"
  | "15m"
  | "30m"
  | "1h"
  | "60m"
  | "1d"
  | "1D"
  | "minute"
  | "3minute"
  | "5minute"
  | "10minute"
  | "15minute"
  | "30minute"
  | "60minute"
  | "day";

export type KiteInterval =
  | "minute"
  | "3minute"
  | "5minute"
  | "10minute"
  | "15minute"
  | "30minute"
  | "60minute"
  | "day";

export interface FetchHistoricalParams {
  symbol: string;
  interval?: SupportedTimeframe | string;
  timeframe?: SupportedTimeframe | string; // Alias for interval
  from: string | Date | number;
  to: string | Date | number;
  apiKey?: string;
  accessToken?: string;
  forceRefresh?: boolean;
  skipCache?: boolean;
  cacheDir?: string;
  continuous?: boolean;
  oi?: boolean;
}

export interface DateChunk {
  from: Date;
  to: Date;
  fromKiteStr: string;
  toKiteStr: string;
}

interface CachePayload {
  symbol: string;
  interval: string;
  from: string;
  to: string;
  count: number;
  cachedAt: string;
  candles: KiteHistoricalCandle[];
}

// ---------------------------------------------------------------------------
// 2. Constants & Token Mappings
// ---------------------------------------------------------------------------

/**
 * Standard Zerodha Kite Instrument Token mappings for key NSE & BSE indices/equities
 */
export const DEFAULT_INSTRUMENT_TOKENS: Record<string, number> = {
  // Indices
  "NIFTY 50": 256265,
  NIFTY50: 256265,
  NIFTY: 256265,
  BANKNIFTY: 260105,
  "NIFTY BANK": 260105,
  FINNIFTY: 257801,
  "NIFTY FIN SERVICE": 257801,
  SENSEX: 265,
  "BSE SENSEX": 265,

  // Equities
  RELIANCE: 738561,
  HDFCBANK: 341249,
  TCS: 295321,
  INFY: 408065,
  ICICIBANK: 1270529,
  SBIN: 779521,
  TATAMOTORS: 884737,
};

/**
 * Base reference prices for realistic synthetic candle generation
 */
export const SYMBOL_BASE_PRICES: Record<string, number> = {
  NIFTY50: 25144.3,
  "NIFTY 50": 25144.3,
  NIFTY: 25144.3,
  BANKNIFTY: 61034.0,
  "NIFTY BANK": 61034.0,
  FINNIFTY: 24200.0,
  "NIFTY FIN SERVICE": 24200.0,
  SENSEX: 81590.0,
  RELIANCE: 1339.7,
  HDFCBANK: 804.0,
  TCS: 2407.5,
  INFY: 1141.5,
  ICICIBANK: 1583.6,
  SBIN: 1080.0,
  TATAMOTORS: 810.0,
};

/**
 * Maximum days per Kite historical API request per interval limit specification
 */
export const INTERVAL_MAX_DAYS: Record<KiteInterval, number> = {
  minute: 60,
  "3minute": 100,
  "5minute": 100,
  "10minute": 100,
  "15minute": 100,
  "30minute": 100,
  "60minute": 100,
  day: 2000,
};

// Dynamic in-memory instruments map (refreshed via dump if needed)
const dynamicInstrumentMap = new Map<string, number>();

// ---------------------------------------------------------------------------
// 3. Rate Limiter (Max 3 req/sec => >= 350ms interval)
// ---------------------------------------------------------------------------

class KiteRateLimiter {
  private lastRequestTime = 0;
  private readonly minIntervalMs = 350; // 350ms ensures <= 2.85 req/sec (strictly < 3/sec)

  async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minIntervalMs) {
      const waitTime = this.minIntervalMs - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();
  }
}

const rateLimiter = new KiteRateLimiter();

// ---------------------------------------------------------------------------
// 4. Time & String Formatting Utilities (IST +05:30)
// ---------------------------------------------------------------------------

/**
 * Normalizes symbol names (handles variants like "NIFTY 50", "NIFTY50", "RELIANCE.NS", etc.)
 */
export function normalizeSymbol(rawSymbol: string): string {
  const s = rawSymbol
    .trim()
    .toUpperCase()
    .replace(/\.NS$/, "")
    .replace(/\.BO$/, "")
    .replace(/^\^/, "");

  if (s === "NSEI" || s === "NIFTY 50" || s === "NIFTY-50" || s === "NIFTY") {
    return "NIFTY50";
  }
  if (s === "NSEBANK" || s === "NIFTY BANK" || s === "NIFTY-BANK") {
    return "BANKNIFTY";
  }
  if (s === "BSESN" || s === "BSE SENSEX") {
    return "SENSEX";
  }
  if (s === "NIFTY FIN SERVICE" || s === "CNXFINANCE") {
    return "FINNIFTY";
  }
  if (s === "TMPV") {
    return "TATAMOTORS";
  }
  return s.replace(/\s+/g, "");
}

/**
 * Resolves instrument token for a symbol, checking dynamic map and default mapping
 */
export function getInstrumentToken(symbol: string): number | undefined {
  const norm = normalizeSymbol(symbol);
  if (dynamicInstrumentMap.has(norm)) {
    return dynamicInstrumentMap.get(norm);
  }
  if (dynamicInstrumentMap.has(symbol)) {
    return dynamicInstrumentMap.get(symbol);
  }

  return (
    DEFAULT_INSTRUMENT_TOKENS[norm] ??
    DEFAULT_INSTRUMENT_TOKENS[symbol] ??
    DEFAULT_INSTRUMENT_TOKENS[norm.replace(/50$/, " 50")]
  );
}

/**
 * Maps timeframe strings to Kite Connect Historical API intervals
 */
export function mapToKiteInterval(timeframe: string): KiteInterval {
  const tf = timeframe.toLowerCase().trim();
  switch (tf) {
    case "1m":
    case "minute":
      return "minute";
    case "3m":
    case "3minute":
      return "3minute";
    case "5m":
    case "5minute":
      return "5minute";
    case "10m":
    case "10minute":
      return "10minute";
    case "15m":
    case "15minute":
      return "15minute";
    case "30m":
    case "30minute":
      return "30minute";
    case "1h":
    case "60m":
    case "60minute":
      return "60minute";
    case "1d":
    case "1d":
    case "day":
      return "day";
    default:
      throw new Error(`Unsupported interval for Kite Connect: "${timeframe}"`);
  }
}

/**
 * Formats a Date into ISO string with explicit IST (+05:30) offset
 * Example output: "2024-01-02T09:15:00+05:30"
 */
export function toISTString(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const p: Record<string, string> = {};
  for (const part of parts) {
    p[part.type] = part.value;
  }
  const hour = p.hour === "24" ? "00" : p.hour;
  return `${p.year}-${p.month}-${p.day}T${hour}:${p.minute}:${p.second}+05:30`;
}

/**
 * Formats a Date for Kite Connect Historical query parameter: "YYYY-MM-DD HH:mm:ss" in IST
 */
export function formatKiteDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const p: Record<string, string> = {};
  for (const part of parts) {
    p[part.type] = part.value;
  }
  const hour = p.hour === "24" ? "00" : p.hour;
  return `${p.year}-${p.month}-${p.day} ${hour}:${p.minute}:${p.second}`;
}

/**
 * Extracts "YYYY-MM-DD" in IST timezone
 */
export function getISTDateString(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const p: Record<string, string> = {};
  for (const part of parts) {
    p[part.type] = part.value;
  }
  return `${p.year}-${p.month}-${p.day}`;
}

/**
 * Returns short weekday abbreviation in IST ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
 */
export function getISTDayOfWeek(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  }).format(date);
}

/**
 * Parses diverse input formats (Date, timestamp ms, date strings) into UTC Date objects,
 * setting proper market session boundaries (09:15:00 for start, 15:30:00 for end) when hours are omitted.
 */
export function parseDateInput(
  input: string | Date | number,
  isEnd = false
): Date {
  if (input instanceof Date) return input;
  if (typeof input === "number") return new Date(input);
  if (typeof input === "string") {
    const trimmed = input.trim();
    // Bare date "YYYY-MM-DD"
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const timePart = isEnd ? "15:30:00+05:30" : "09:15:00+05:30";
      return new Date(`${trimmed}T${timePart}`);
    }
    // "YYYY-MM-DD HH:mm(:ss)"
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      const iso =
        trimmed.replace(" ", "T") +
        (trimmed.length === 16 ? ":00" : "") +
        "+05:30";
      return new Date(iso);
    }
    return new Date(trimmed);
  }
  return new Date();
}

/**
 * Formats a date cleanly for cache filenames, eliminating illegal Windows filesystem characters
 */
export function formatCacheDate(input: string | Date | number): string {
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    return trimmed
      .replace(/[:\\/*?"<>|]/g, "-")
      .replace(/\s+/g, "_")
      .replace(/\+05:?30/g, "");
  }
  const d = new Date(input);
  return getISTDateString(d);
}

/**
 * Generates local cache file path: `.cache/historical/{symbol}_{interval}_{from}_{to}.json`
 */
export function getCacheFilePath(
  symbol: string,
  interval: string,
  from: string | Date | number,
  to: string | Date | number,
  baseDir = ".cache/historical"
): string {
  const normSym = normalizeSymbol(symbol);
  const cleanFrom = formatCacheDate(from);
  const cleanTo = formatCacheDate(to);
  const fileName = `${normSym}_${interval}_${cleanFrom}_${cleanTo}.json`;
  const nodePath = getNodePath();
  const cwd = typeof process !== "undefined" && typeof process.cwd === "function" ? process.cwd() : ".";
  if (nodePath) {
    return nodePath.resolve(cwd, baseDir, fileName);
  }
  return `${baseDir}/${fileName}`;
}

// ---------------------------------------------------------------------------
// 5. Chunking & Rate Limiting Logic (Requirement 4)
// ---------------------------------------------------------------------------

export function getMaxDaysForInterval(interval: KiteInterval): number {
  return INTERVAL_MAX_DAYS[interval] ?? 60;
}

/**
 * Chunks date ranges by maximum allowed days per request for the specific interval
 */
export function generateDateChunks(
  from: Date,
  to: Date,
  maxDays: number
): DateChunk[] {
  const chunks: DateChunk[] = [];
  const maxMs = maxDays * 24 * 60 * 60 * 1000;

  let currentStart = new Date(from.getTime());
  const endTime = to.getTime();

  while (currentStart.getTime() < endTime) {
    let currentEnd = new Date(currentStart.getTime() + maxMs);
    if (currentEnd.getTime() > endTime) {
      currentEnd = new Date(endTime);
    }

    chunks.push({
      from: new Date(currentStart.getTime()),
      to: new Date(currentEnd.getTime()),
      fromKiteStr: formatKiteDate(currentStart),
      toKiteStr: formatKiteDate(currentEnd),
    });

    if (currentEnd.getTime() >= endTime) {
      break;
    }
    // Advance currentStart to currentEnd (overlapping boundary deduplicated on concatenate)
    currentStart = new Date(currentEnd.getTime());
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// 6. Local Caching Layer (Requirement 5)
// ---------------------------------------------------------------------------

/**
 * Checks and reads cached historical candles from disk using Node.js fs.promises
 */
export async function readCachedCandles(
  cachePath: string
): Promise<KiteHistoricalCandle[] | null> {
  const nodeFs = getNodeFs();
  if (!nodeFs) return null;
  try {
    const raw = await nodeFs.promises.readFile(cachePath, "utf8");
    const parsed = JSON.parse(raw);
    const rawCandles: KiteHistoricalCandle[] = Array.isArray(parsed)
      ? parsed
      : parsed.candles || [];

    if (rawCandles.length === 0) return null;

    // Return candles with source marked as CACHED
    return rawCandles.map((c: KiteHistoricalCandle) => ({
      ...c,
      source: "CACHED" as const,
    }));
  } catch {
    return null;
  }
}

/**
 * Writes historical candle results to local cache file
 */
export async function writeCachedCandles(
  cachePath: string,
  payload: {
    symbol: string;
    interval: string;
    from: string;
    to: string;
    candles: KiteHistoricalCandle[];
  }
): Promise<void> {
  const nodeFs = getNodeFs();
  const nodePath = getNodePath();
  if (!nodeFs || !nodePath) return;
  try {
    const dir = nodePath.dirname(cachePath);
    await nodeFs.promises.mkdir(dir, { recursive: true });

    const data: CachePayload = {
      symbol: payload.symbol,
      interval: payload.interval,
      from: payload.from,
      to: payload.to,
      count: payload.candles.length,
      cachedAt: new Date().toISOString(),
      candles: payload.candles,
    };

    await nodeFs.promises.writeFile(
      cachePath,
      JSON.stringify(data, null, 2),
      "utf8"
    );
  } catch (err) {
    console.warn(`[KiteDataService] Failed to write cache to ${cachePath}:`, err);
  }
}

/**
 * Clears historical data cache
 */
export async function clearHistoricalCache(
  symbol?: string,
  baseDir = ".cache/historical"
): Promise<number> {
  const nodeFs = getNodeFs();
  const nodePath = getNodePath();
  if (!nodeFs || !nodePath) return 0;
  try {
    const cwd = typeof process !== "undefined" && typeof process.cwd === "function" ? process.cwd() : ".";
    const targetDir = nodePath.resolve(cwd, baseDir);
    const files = await nodeFs.promises.readdir(targetDir);
    let deletedCount = 0;

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      if (symbol) {
        const norm = normalizeSymbol(symbol);
        if (!file.startsWith(`${norm}_`)) continue;
      }
      await nodeFs.promises.unlink(nodePath.join(targetDir, file));
      deletedCount++;
    }
    return deletedCount;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// 7. Offline Fallback / Fixture Generator (Requirement 6)
// ---------------------------------------------------------------------------

function createSeededRandom(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussianRandom(rng: () => number): number {
  let u = 0,
    v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Generates genuine NSE-structured candles:
 * - Weekdays only (Monday to Friday, no Saturday or Sunday)
 * - Strictly within 09:15 - 15:30 IST
 * - :15 aligned across all timeframes (09:15 open anchor, hourly bars 09:15, 10:15... 15:15)
 * - Deterministic, realistic OHLC dynamics & U-shaped intraday volume profile
 */
export function generateNSEHistoricalCandles(params: {
  symbol: string;
  interval: KiteInterval;
  from: Date;
  to: Date;
  basePrice?: number;
}): KiteHistoricalCandle[] {
  const normSym = normalizeSymbol(params.symbol);
  const basePrice =
    params.basePrice ??
    SYMBOL_BASE_PRICES[normSym] ??
    SYMBOL_BASE_PRICES[params.symbol] ??
    1000.0;

  // Build deterministic seed from symbol and date range
  let seedVal = 0;
  for (let i = 0; i < normSym.length; i++) {
    seedVal = (seedVal * 31 + normSym.charCodeAt(i)) >>> 0;
  }
  seedVal = (seedVal ^ params.from.getTime() ^ params.to.getTime()) >>> 0;
  const rng = createSeededRandom(seedVal || 123456);

  // Timeframe-specific volatility and step configuration
  let stepMinutes = 1;
  let barsPerDay = 375;
  let volPerBar = 0.0006; // ~0.06% per 1m

  switch (params.interval) {
    case "minute":
      stepMinutes = 1;
      barsPerDay = 375;
      volPerBar = 0.0006;
      break;
    case "3minute":
      stepMinutes = 3;
      barsPerDay = 125;
      volPerBar = 0.001;
      break;
    case "5minute":
      stepMinutes = 5;
      barsPerDay = 75;
      volPerBar = 0.0013;
      break;
    case "10minute":
      stepMinutes = 10;
      barsPerDay = 37;
      volPerBar = 0.0018;
      break;
    case "15minute":
      stepMinutes = 15;
      barsPerDay = 25;
      volPerBar = 0.0022;
      break;
    case "30minute":
      stepMinutes = 30;
      barsPerDay = 13;
      volPerBar = 0.0031;
      break;
    case "60minute":
      stepMinutes = 60;
      barsPerDay = 7; // 09:15, 10:15, 11:15, 12:15, 13:15, 14:15, 15:15
      volPerBar = 0.0045;
      break;
    case "day":
      stepMinutes = 375;
      barsPerDay = 1;
      volPerBar = 0.012;
      break;
  }

  // Iterate day-by-day in IST
  const startDayStr = getISTDateString(params.from);
  const endDayStr = getISTDateString(params.to);

  const [sy, sm, sd] = startDayStr.split("-").map(Number);
  const curDayDate = new Date(Date.UTC(sy, sm - 1, sd, 12, 0, 0));

  let currentClose = basePrice * (1.0 + (rng() * 0.04 - 0.02));
  const candles: KiteHistoricalCandle[] = [];

  const fromTime = params.from.getTime();
  const toTime = params.to.getTime();

  while (true) {
    const curDayStr = getISTDateString(curDayDate);
    if (curDayStr > endDayStr) break;

    // Check weekday in IST (Monday = 'Mon', ..., Friday = 'Fri')
    const weekday = getISTDayOfWeek(curDayDate);
    const isWeekend = weekday === "Sat" || weekday === "Sun";

    if (!isWeekend) {
      // Overnight gap between sessions (±0.35%)
      const overnightGap = gaussianRandom(rng) * 0.0035;
      currentClose = currentClose * Math.exp(overnightGap);

      // Generate session candles
      if (params.interval === "day") {
        const candleDate = new Date(`${curDayStr}T09:15:00+05:30`);
        const candleTime = candleDate.getTime();

        if (candleTime >= fromTime && candleTime <= toTime) {
          const openP = currentClose;
          const shock = gaussianRandom(rng) * volPerBar;
          const closeP = openP * Math.exp(shock);
          const wickRange = Math.abs(gaussianRandom(rng)) * openP * volPerBar * 0.6;
          const highP = Math.max(openP, closeP) + wickRange;
          const lowP = Math.max(0.1, Math.min(openP, closeP) - wickRange);
          const volAmt = Math.round(500000 + rng() * 2000000);

          candles.push({
            timestamp: toISTString(candleDate),
            open: Number(openP.toFixed(2)),
            high: Number(highP.toFixed(2)),
            low: Number(lowP.toFixed(2)),
            close: Number(closeP.toFixed(2)),
            volume: volAmt,
            oi: 0,
            source: "SYNTHETIC",
          });
          currentClose = closeP;
        }
      } else if (params.interval === "60minute") {
        // Hourly candles in NSE: strictly :15 aligned!
        // 09:15, 10:15, 11:15, 12:15, 13:15, 14:15, 15:15
        const hours = ["09", "10", "11", "12", "13", "14", "15"];
        for (let b = 0; b < hours.length; b++) {
          const hh = hours[b];
          const candleDate = new Date(`${curDayStr}T${hh}:15:00+05:30`);
          const candleTime = candleDate.getTime();

          if (candleTime >= fromTime && candleTime <= toTime) {
            const openP = currentClose;
            const shock = gaussianRandom(rng) * volPerBar;
            const closeP = openP * Math.exp(shock);
            const wickRange = Math.abs(gaussianRandom(rng)) * openP * volPerBar * 0.6;
            const highP = Math.max(openP, closeP) + wickRange;
            const lowP = Math.max(0.1, Math.min(openP, closeP) - wickRange);

            // Classic U-shaped volume curve
            const uFactor = 1.0 + 2.5 * Math.pow((b / (hours.length - 1) - 0.5) * 2, 2);
            const volAmt = Math.round((25000 + rng() * 50000) * uFactor);

            candles.push({
              timestamp: toISTString(candleDate),
              open: Number(openP.toFixed(2)),
              high: Number(highP.toFixed(2)),
              low: Number(lowP.toFixed(2)),
              close: Number(closeP.toFixed(2)),
              volume: volAmt,
              oi: 0,
              source: "SYNTHETIC",
            });
            currentClose = closeP;
          }
        }
      } else {
        // Sub-hourly intraday bars (1m, 3m, 5m, 10m, 15m, 30m)
        // All starting strictly at 09:15:00 IST and aligned up to 15:30:00
        for (let b = 0; b < barsPerDay; b++) {
          const totalMinutes = 15 + b * stepMinutes;
          const h = 9 + Math.floor(totalMinutes / 60);
          const m = totalMinutes % 60;
          const hh = String(h).padStart(2, "0");
          const mm = String(m).padStart(2, "0");

          const candleDate = new Date(`${curDayStr}T${hh}:${mm}:00+05:30`);
          const candleTime = candleDate.getTime();

          if (candleTime >= fromTime && candleTime <= toTime) {
            const openP = currentClose;
            const shock = gaussianRandom(rng) * volPerBar;
            const closeP = openP * Math.exp(shock);
            const wickRange = Math.abs(gaussianRandom(rng)) * openP * volPerBar * 0.5;
            const highP = Math.max(openP, closeP) + wickRange;
            const lowP = Math.max(0.1, Math.min(openP, closeP) - wickRange);

            // U-shaped intraday volume profile (higher at open & close)
            const uFactor = 1.0 + 2.2 * Math.pow((b / (barsPerDay - 1) - 0.5) * 2, 2);
            const volAmt = Math.round((1500 + rng() * 3000) * uFactor);

            candles.push({
              timestamp: toISTString(candleDate),
              open: Number(openP.toFixed(2)),
              high: Number(highP.toFixed(2)),
              low: Number(lowP.toFixed(2)),
              close: Number(closeP.toFixed(2)),
              volume: volAmt,
              oi: 0,
              source: "SYNTHETIC",
            });
            currentClose = closeP;
          }
        }
      }
    }

    // Step forward 1 day
    curDayDate.setUTCDate(curDayDate.getUTCDate() + 1);
  }

  return candles;
}

// ---------------------------------------------------------------------------
// 8. Kite Connect Historical Network API Client
// ---------------------------------------------------------------------------

interface KiteRawResponse {
  status: string;
  message?: string;
  error_type?: string;
  data?: {
    candles?: Array<[string, number, number, number, number, number, number?]>;
  };
}

/**
 * Fetches a single chunk from Zerodha Kite Historical API
 */
async function fetchKiteChunk(
  instrumentToken: number,
  interval: KiteInterval,
  fromKiteStr: string,
  toKiteStr: string,
  apiKey: string,
  accessToken: string,
  continuous = false,
  oi = false
): Promise<KiteHistoricalCandle[]> {
  // Apply rate limiter (max 3 req/sec)
  await rateLimiter.throttle();

  const encFrom = encodeURIComponent(fromKiteStr);
  const encTo = encodeURIComponent(toKiteStr);
  const url = `https://api.kite.trade/instruments/historical/${instrumentToken}/${interval}?from=${encFrom}&to=${encTo}&continuous=${continuous ? 1 : 0}&oi=${oi ? 1 : 0}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Kite-Version": "3",
      Authorization: `token ${apiKey}:${accessToken}`,
      Accept: "application/json",
      "User-Agent": "AlgoX/1.0",
    },
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(
      `Kite Historical API HTTP ${res.status}: ${res.statusText} - ${errorBody}`
    );
  }

  const json = (await res.json()) as KiteRawResponse;
  if (json.status !== "success" || !json.data || !Array.isArray(json.data.candles)) {
    throw new Error(
      `Kite API error: ${json.message || json.error_type || "Unexpected response structure"}`
    );
  }

  return json.data.candles.map((c) => ({
    timestamp: toISTString(new Date(c[0])),
    open: Number(c[1]),
    high: Number(c[2]),
    low: Number(c[3]),
    close: Number(c[4]),
    volume: Number(c[5]),
    oi: c[6] !== undefined ? Number(c[6]) : undefined,
    source: "KITE" as const,
  }));
}

// ---------------------------------------------------------------------------
// 9. Instruments Dump Refreshing (Requirement 2)
// ---------------------------------------------------------------------------

/**
 * Refreshes instrument dump from Zerodha Kite instruments endpoint and updates token mappings
 */
export async function refreshInstrumentsDump(options?: {
  exchange?: "NSE" | "BSE" | "NFO" | "ALL";
  force?: boolean;
}): Promise<Map<string, number>> {
  const exchange = options?.exchange || "NSE";
  const nodeFs = getNodeFs();
  const nodePath = getNodePath();
  const cwd = typeof process !== "undefined" && typeof process.cwd === "function" ? process.cwd() : ".";
  const cacheFile = nodePath
    ? nodePath.resolve(cwd, ".cache", `instruments_${exchange}.json`)
    : `.cache/instruments_${exchange}.json`;

  // Check cached dump unless forced
  if (!options?.force && nodeFs) {
    try {
      const cached = await nodeFs.promises.readFile(cacheFile, "utf8");
      const list: Array<[string, number]> = JSON.parse(cached);
      for (const [k, v] of list) {
        dynamicInstrumentMap.set(k, v);
      }
      return dynamicInstrumentMap;
    } catch {
      // Cache miss, proceed to fetch
    }
  }

  try {
    const endpoint =
      exchange === "ALL"
        ? "https://api.kite.trade/instruments"
        : `https://api.kite.trade/instruments/${exchange}`;

    const res = await fetch(endpoint, {
      headers: { "User-Agent": "AlgoX/1.0" },
    });

    if (!res.ok) {
      throw new Error(`Instruments dump failed HTTP ${res.status}`);
    }

    const csvText = await res.text();
    const lines = csvText.split("\n");
    const header = lines[0]?.split(",");

    const tokenIdx = header.indexOf("instrument_token");
    const symbolIdx = header.indexOf("tradingsymbol");
    const nameIdx = header.indexOf("name");

    if (tokenIdx === -1 || symbolIdx === -1) {
      throw new Error("Invalid instruments CSV format from Kite");
    }

    const mapEntries: Array<[string, number]> = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(",");
      const token = parseInt(cols[tokenIdx], 10);
      const symbol = cols[symbolIdx]?.replace(/"/g, "").trim();
      const name = nameIdx !== -1 ? cols[nameIdx]?.replace(/"/g, "").trim() : "";

      if (token && symbol) {
        const norm = normalizeSymbol(symbol);
        dynamicInstrumentMap.set(symbol, token);
        dynamicInstrumentMap.set(norm, token);
        mapEntries.push([symbol, token]);
        if (norm !== symbol) {
          mapEntries.push([norm, token]);
        }
        if (name) {
          const normName = normalizeSymbol(name);
          dynamicInstrumentMap.set(name, token);
          dynamicInstrumentMap.set(normName, token);
          mapEntries.push([name, token]);
          mapEntries.push([normName, token]);
        }
      }
    }

    // Persist cache
    if (nodeFs && nodePath) {
      await nodeFs.promises.mkdir(nodePath.dirname(cacheFile), { recursive: true });
      await nodeFs.promises.writeFile(
        cacheFile,
        JSON.stringify(mapEntries, null, 2),
        "utf8"
      );
    }

    return dynamicInstrumentMap;
  } catch (err) {
    console.warn("[KiteDataService] Instruments dump refresh failed:", err);
    // Populate with defaults
    for (const [k, v] of Object.entries(DEFAULT_INSTRUMENT_TOKENS)) {
      dynamicInstrumentMap.set(k, v);
    }
    return dynamicInstrumentMap;
  }
}

// ---------------------------------------------------------------------------
// 10. Main Integration Service API
// ---------------------------------------------------------------------------

/**
 * Primary Historical Data Fetcher:
 * 1. Checks local cache first
 * 2. If missing or forceRefresh, attempts chunked rate-limited Kite API calls
 * 3. If Kite API key missing or network fails, falls back seamlessly to offline fixture generator
 * 4. Writes results to cache and returns candles with proper source attribute
 */
export async function fetchKiteHistoricalData(
  params: FetchHistoricalParams
): Promise<KiteHistoricalCandle[]> {
  const normSymbol = normalizeSymbol(params.symbol);
  const rawInterval = params.interval || params.timeframe || "15m";
  const kiteInterval = mapToKiteInterval(rawInterval);

  const fromDate = parseDateInput(params.from, false);
  const toDate = parseDateInput(params.to, true);

  if (fromDate.getTime() > toDate.getTime()) {
    throw new Error(
      `Invalid date range: 'from' (${toISTString(fromDate)}) is after 'to' (${toISTString(toDate)})`
    );
  }

  // 1. Check local cache (check both mapped and raw interval names for maximum hit rate)
  const cachePathMapped = getCacheFilePath(
    normSymbol,
    kiteInterval,
    params.from,
    params.to,
    params.cacheDir
  );
  const cachePathRaw = getCacheFilePath(
    normSymbol,
    rawInterval,
    params.from,
    params.to,
    params.cacheDir
  );

  if (!params.forceRefresh && !params.skipCache) {
    const cachedCandles =
      (await readCachedCandles(cachePathMapped)) ||
      (cachePathRaw !== cachePathMapped
        ? await readCachedCandles(cachePathRaw)
        : null);

    if (cachedCandles && cachedCandles.length > 0) {
      return cachedCandles;
    }
  }

  // 2. Identify credentials
  const apiKey =
    params.apiKey ||
    process.env.KITE_API_KEY ||
    process.env.NEXT_PUBLIC_KITE_API_KEY;
  const accessToken =
    params.accessToken ||
    process.env.KITE_ACCESS_TOKEN ||
    process.env.NEXT_PUBLIC_KITE_ACCESS_TOKEN;

  let candles: KiteHistoricalCandle[] = [];

  // 3. Attempt Kite Historical API if credentials exist
  if (apiKey && accessToken) {
    const instrumentToken = getInstrumentToken(params.symbol);
    if (!instrumentToken) {
      console.warn(
        `[KiteDataService] No instrument token found for symbol "${params.symbol}". Falling back to synthetic fixtures.`
      );
    } else {
      try {
        const maxDays = getMaxDaysForInterval(kiteInterval);
        const chunks = generateDateChunks(fromDate, toDate, maxDays);

        const candleMap = new Map<string, KiteHistoricalCandle>();

        for (const chunk of chunks) {
          const chunkCandles = await fetchKiteChunk(
            instrumentToken,
            kiteInterval,
            chunk.fromKiteStr,
            chunk.toKiteStr,
            apiKey,
            accessToken,
            params.continuous,
            params.oi
          );

          for (const c of chunkCandles) {
            candleMap.set(c.timestamp, c);
          }
        }

        candles = Array.from(candleMap.values()).sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.warn(
          `[KiteDataService] Kite API request failed (${errorMsg}). Falling back to synthetic NSE fixture generator.`
        );
      }
    }
  }

  // 4. Fallback: Offline Fixture Generator (Requirement 6)
  if (candles.length === 0) {
    candles = generateNSEHistoricalCandles({
      symbol: normSymbol,
      interval: kiteInterval,
      from: fromDate,
      to: toDate,
    });
  }

  // 5. Save to local cache
  if (!params.skipCache && candles.length > 0) {
    await writeCachedCandles(cachePathMapped, {
      symbol: normSymbol,
      interval: kiteInterval,
      from: formatCacheDate(params.from),
      to: formatCacheDate(params.to),
      candles,
    });
  }

  return candles;
}

/**
 * Convenient polymorphic overload for getHistoricalCandles
 */
export async function getHistoricalCandles(
  symbolOrParams: string | FetchHistoricalParams,
  interval: SupportedTimeframe | string = "15m",
  from?: string | Date | number,
  to?: string | Date | number
): Promise<KiteHistoricalCandle[]> {
  if (typeof symbolOrParams === "object") {
    return fetchKiteHistoricalData(symbolOrParams);
  }

  const resolvedTo = to ?? new Date();
  const resolvedFrom =
    from ??
    new Date(
      (resolvedTo instanceof Date ? resolvedTo.getTime() : new Date(resolvedTo).getTime()) -
        7 * 24 * 60 * 60 * 1000
    );

  return fetchKiteHistoricalData({
    symbol: symbolOrParams,
    interval,
    from: resolvedFrom,
    to: resolvedTo,
  });
}

// ---------------------------------------------------------------------------
// 11. Service Class & Default Export
// ---------------------------------------------------------------------------

export class KiteDataService {
  async fetchHistorical(params: FetchHistoricalParams): Promise<KiteHistoricalCandle[]> {
    return fetchKiteHistoricalData(params);
  }

  async getCandles(
    symbol: string,
    timeframe: SupportedTimeframe = "15m",
    from?: string | Date | number,
    to?: string | Date | number
  ): Promise<KiteHistoricalCandle[]> {
    return getHistoricalCandles(symbol, timeframe, from, to);
  }

  generateSynthetic(params: {
    symbol: string;
    interval: KiteInterval;
    from: Date;
    to: Date;
    basePrice?: number;
  }): KiteHistoricalCandle[] {
    return generateNSEHistoricalCandles(params);
  }

  getInstrumentToken(symbol: string): number | undefined {
    return getInstrumentToken(symbol);
  }

  async refreshInstruments(options?: {
    exchange?: "NSE" | "BSE" | "NFO" | "ALL";
    force?: boolean;
  }): Promise<Map<string, number>> {
    return refreshInstrumentsDump(options);
  }

  async clearCache(symbol?: string): Promise<number> {
    return clearHistoricalCache(symbol);
  }
}

export const kiteDataService = new KiteDataService();
export default kiteDataService;
