import nseHolidaysData from "@/data/nse_holidays.json";

export interface NSEHoliday {
  date: string; // YYYY-MM-DD format
  name: string;
  day?: string;
  year?: number;
  description?: string;
  isMuhuratTrading?: boolean;
  note?: string;
}

export interface CandleValidationResult<T = any> {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedCandles: T[];
}

export interface ValidateCandlesOptions {
  allowWeekend?: boolean;
  allowOutsideMarketHours?: boolean;
  allowHolidays?: boolean;
  allowMuhuratTrading?: boolean;
  isSynthetic?: boolean;
  expectedIntervalMinutes?: number;
  tagSynthetic?: boolean;
}

export interface ISTDateParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  hours: number; // 0-23
  minutes: number; // 0-59
  seconds: number; // 0-59
  milliseconds: number;
  dateString: string; // YYYY-MM-DD
  timeString: string; // HH:mm:ss
}

// 5 hours 30 minutes in milliseconds
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

export const NSE_HOLIDAYS: NSEHoliday[] = Array.isArray(nseHolidaysData)
  ? (nseHolidaysData as NSEHoliday[])
  : ((nseHolidaysData as any).holidays as NSEHoliday[]) || [];

// Fast O(1) lookup map for NSE holidays
const holidayMap: Map<string, NSEHoliday> = new Map(
  NSE_HOLIDAYS.map((h) => [h.date, h])
);

/**
 * Returns the list of all configured NSE holidays
 */
export function getNSEHolidays(): NSEHoliday[] {
  return [...NSE_HOLIDAYS];
}

/**
 * Returns detailed holiday information if the date is an NSE holiday, or undefined.
 */
export function getNSEHolidayDetails(date: Date | string | number): NSEHoliday | undefined {
  try {
    const parts = getISTDateParts(date);
    return holidayMap.get(parts.dateString);
  } catch {
    return undefined;
  }
}

/**
 * Parses any supported date/timestamp representation into milliseconds since Unix epoch
 */
export function parseDateToTimestamp(input: Date | string | number): number {
  if (input instanceof Date) {
    return input.getTime();
  }
  if (typeof input === "number") {
    // If in seconds (before year 2286, timestamp in seconds < 1e11), convert to ms
    return input < 1e11 ? input * 1000 : input;
  }
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return NaN;

    // Numeric timestamp string
    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      return num < 1e11 ? num * 1000 : num;
    }

    // Bare date string YYYY-MM-DD
    const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (ymd) {
      const year = parseInt(ymd[1], 10);
      const month = parseInt(ymd[2], 10);
      const day = parseInt(ymd[3], 10);
      // Map midnight IST: 00:00:00 IST is UTC (day - 5h 30m)
      return Date.UTC(year, month - 1, day, 0, 0, 0) - IST_OFFSET_MS;
    }

    // ISO or RFC date strings
    const parsed = new Date(trimmed).getTime();
    if (!isNaN(parsed)) return parsed;

    // Handle string format like 'YYYY-MM-DD HH:mm:ss'
    const withT = trimmed.replace(" ", "T");
    const parsedWithT = new Date(withT).getTime();
    if (!isNaN(parsedWithT)) return parsedWithT;
  }
  return NaN;
}

/**
 * Extracts date and time components strictly in Indian Standard Time (Asia/Kolkata, UTC+05:30)
 */
export function getISTDateParts(date: Date | string | number): ISTDateParts {
  // If bare YYYY-MM-DD string is passed directly
  if (typeof date === "string") {
    const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
    if (ymd) {
      const year = parseInt(ymd[1], 10);
      const month = parseInt(ymd[2], 10);
      const day = parseInt(ymd[3], 10);
      // Construct midday UTC to determine the accurate day of week
      const refDate = new Date(Date.UTC(year, month - 1, day, 6, 30, 0));
      const pad = (n: number) => String(n).padStart(2, "0");
      return {
        year,
        month,
        day,
        dayOfWeek: refDate.getUTCDay(),
        hours: 0,
        minutes: 0,
        seconds: 0,
        milliseconds: 0,
        dateString: `${year}-${pad(month)}-${pad(day)}`,
        timeString: "00:00:00",
      };
    }
  }

  const ms = parseDateToTimestamp(date);
  if (isNaN(ms)) {
    throw new Error(`Invalid date provided for IST conversion: ${date}`);
  }

  const istDate = new Date(ms + IST_OFFSET_MS);

  const year = istDate.getUTCFullYear();
  const month = istDate.getUTCMonth() + 1;
  const day = istDate.getUTCDate();
  const dayOfWeek = istDate.getUTCDay();
  const hours = istDate.getUTCHours();
  const minutes = istDate.getUTCMinutes();
  const seconds = istDate.getUTCSeconds();
  const milliseconds = istDate.getUTCMilliseconds();

  const pad = (n: number) => String(n).padStart(2, "0");
  const dateString = `${year}-${pad(month)}-${pad(day)}`;
  const timeString = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return {
    year,
    month,
    day,
    dayOfWeek,
    hours,
    minutes,
    seconds,
    milliseconds,
    dateString,
    timeString,
  };
}

/**
 * Formats a Date, ISO string, or timestamp into IST representation with +05:30 offset
 * Example: YYYY-MM-DDTHH:mm:ss+05:30
 */
export function formatIST(date: Date | string | number): string {
  const parts = getISTDateParts(date);
  return `${parts.dateString}T${parts.timeString}+05:30`;
}

/**
 * Checks whether a given date is an official NSE trading holiday.
 */
export function isNSEHoliday(date: Date | string | number): boolean {
  try {
    if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      return holidayMap.has(date.trim());
    }
    const parts = getISTDateParts(date);
    return holidayMap.has(parts.dateString);
  } catch {
    return false;
  }
}

/**
 * Checks whether a given date is an NSE trading day (Monday to Friday, and not an NSE holiday).
 */
export function isNSETradingDay(date: Date | string | number): boolean {
  try {
    const parts = getISTDateParts(date);
    // 0 = Sunday, 6 = Saturday
    if (parts.dayOfWeek === 0 || parts.dayOfWeek === 6) {
      return false;
    }
    return !isNSEHoliday(date);
  } catch {
    return false;
  }
}

/**
 * Checks whether the time (in Asia/Kolkata timezone) falls within normal NSE market hours:
 * 09:15:00 to 15:30:00 IST (inclusive).
 */
export function isNSEMarketHours(date: Date | string | number): boolean {
  try {
    const parts = getISTDateParts(date);
    const totalSeconds =
      parts.hours * 3600 +
      parts.minutes * 60 +
      parts.seconds +
      parts.milliseconds / 1000;

    // Market Open: 09:15:00 IST = 9 * 3600 + 15 * 60 = 33300 seconds
    // Market Close: 15:30:00 IST = 15 * 3600 + 30 * 60 = 55800 seconds
    return totalSeconds >= 33300 && totalSeconds <= 55800;
  } catch {
    return false;
  }
}

/**
 * Extracts a candle timestamp from common candle object formats
 */
function extractCandleTimestamp(candle: any): number {
  if (!candle || typeof candle !== "object") return NaN;

  if (candle.timestamp !== undefined && candle.timestamp !== null) {
    return parseDateToTimestamp(candle.timestamp);
  }
  if (candle.time !== undefined && candle.time !== null) {
    return parseDateToTimestamp(candle.time);
  }
  if (candle.date !== undefined && candle.date !== null) {
    return parseDateToTimestamp(candle.date);
  }
  if (candle.datetime !== undefined && candle.datetime !== null) {
    return parseDateToTimestamp(candle.datetime);
  }
  return NaN;
}

/**
 * Detects whether a candle exhibits synthetic data properties
 */
function detectSyntheticCandle(candle: any, options?: ValidateCandlesOptions): boolean {
  if (options?.isSynthetic || options?.tagSynthetic) return true;
  if (candle?.isSynthetic === true || candle?.synthetic === true) return true;
  if (typeof candle?.source === "string" && candle.source.toUpperCase().includes("SYNTHETIC")) {
    return true;
  }
  // Heuristic: completely flat OHLC with dummy volume (e.g., generated fallback bar)
  if (
    typeof candle?.open === "number" &&
    candle.open === candle.high &&
    candle.high === candle.low &&
    candle.low === candle.close &&
    (candle.volume === 1000 || candle.volume === 0)
  ) {
    return true;
  }
  return false;
}

/**
 * Validates a series of NSE candles against market rules:
 * - No timestamps on weekends (Saturdays, Sundays) unless allowWeekend flag is enabled.
 * - No timestamps outside 09:15 to 15:30 IST unless allowOutsideMarketHours flag is enabled.
 * - High >= max(open, close).
 * - Low <= min(open, close).
 * - High >= Low.
 * - Prices > 0, Volume >= 0.
 * - Deduplication: eliminate duplicate timestamps, keep latest.
 * - Chronological sorting: ensure strictly ascending order.
 * - Gaps check: flag gaps during market hours that do not cross overnight or an NSE holiday.
 * - Tag source: if synthetic candles are detected or passed, flag as isSynthetic: true and tag source: "SYNTHETIC DATA".
 */
export function validateCandles(
  candles: any[],
  options?: ValidateCandlesOptions
): CandleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(candles)) {
    return {
      isValid: false,
      errors: ["Candles input must be an array"],
      warnings,
      sanitizedCandles: [],
    };
  }

  if (candles.length === 0) {
    return {
      isValid: true,
      errors: [],
      warnings: ["Empty candle series provided"],
      sanitizedCandles: [],
    };
  }

  // Deduplication map: eliminates duplicate timestamps, keeps latest
  const dedupMap = new Map<number, { candle: any; originalIndex: number }>();
  let duplicateCount = 0;
  let hasSyntheticDetected = options?.isSynthetic ?? false;

  for (let i = 0; i < candles.length; i++) {
    const raw = candles[i];
    const ts = extractCandleTimestamp(raw);

    if (isNaN(ts)) {
      errors.push(`Invalid timestamp on candle at index ${i}: ${JSON.stringify(raw)}`);
      continue;
    }

    if (dedupMap.has(ts)) {
      duplicateCount++;
    }

    if (detectSyntheticCandle(raw, options)) {
      hasSyntheticDetected = true;
    }

    // Keep the latest candle occurrence
    dedupMap.set(ts, { candle: raw, originalIndex: i });
  }

  if (duplicateCount > 0) {
    warnings.push(
      `Deduplicated ${duplicateCount} candle(s) with duplicate timestamps (kept latest candle).`
    );
  }

  // Chronological sorting: ensure strictly ascending order
  const uniqueCandleEntries = Array.from(dedupMap.entries()).sort(
    ([tsA], [tsB]) => tsA - tsB
  );

  const sanitizedCandles: any[] = [];

  for (let i = 0; i < uniqueCandleEntries.length; i++) {
    const [ts, { candle }] = uniqueCandleEntries[i];
    const formattedIST = formatIST(ts);
    const parts = getISTDateParts(ts);

    // 1. Weekend validation (Saturdays, Sundays)
    const isWeekend = parts.dayOfWeek === 0 || parts.dayOfWeek === 6;
    if (isWeekend && !options?.allowWeekend) {
      const dayName = parts.dayOfWeek === 0 ? "Sunday" : "Saturday";
      errors.push(
        `Weekend candle rejected: Timestamp ${formattedIST} falls on a weekend (${dayName}). NSE is closed on weekends.`
      );
    }

    // 2. NSE Holiday validation
    const holiday = getNSEHolidayDetails(ts);
    if (holiday && !options?.allowHolidays) {
      const isMuhuratAllowed = holiday.isMuhuratTrading && options?.allowMuhuratTrading;
      if (!isMuhuratAllowed) {
        errors.push(
          `Holiday candle rejected: Timestamp ${formattedIST} falls on official NSE trading holiday "${holiday.name}".`
        );
      }
    }

    // 3. Market Hours validation (09:15:00 to 15:30:00 IST)
    const inMarketHours = isNSEMarketHours(ts);
    if (!inMarketHours && !options?.allowOutsideMarketHours) {
      errors.push(
        `Market hours violation: Candle timestamp ${formattedIST} (${parts.timeString} IST) is outside official NSE market hours (09:15:00 to 15:30:00 IST).`
      );
    }

    // 4. Numerical and OHLC integrity checks
    const open = Number(candle.open);
    const high = Number(candle.high);
    const low = Number(candle.low);
    const close = Number(candle.close);
    const volume =
      candle.volume !== undefined && candle.volume !== null ? Number(candle.volume) : 0;

    const hasInvalidNumber =
      isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close);

    if (hasInvalidNumber) {
      errors.push(
        `Corrupted OHLC at ${formattedIST}: Prices must be valid numbers (open=${candle.open}, high=${candle.high}, low=${candle.low}, close=${candle.close}).`
      );
    } else {
      // Prices > 0
      if (open <= 0 || high <= 0 || low <= 0 || close <= 0) {
        errors.push(
          `Invalid price at ${formattedIST}: OHLC prices must be strictly greater than 0 (got open=${open}, high=${high}, low=${low}, close=${close}).`
        );
      }

      // Volume >= 0
      if (isNaN(volume) || volume < 0) {
        errors.push(
          `Invalid volume at ${formattedIST}: Volume must be greater than or equal to 0 (got volume=${candle.volume}).`
        );
      }

      // High >= max(open, close)
      const maxOC = Math.max(open, close);
      if (high < maxOC) {
        errors.push(
          `Corrupted OHLC at ${formattedIST}: High (${high}) is less than max(open=${open}, close=${close}) [High < Open/Close].`
        );
      }

      // Low <= min(open, close)
      const minOC = Math.min(open, close);
      if (low > minOC) {
        errors.push(
          `Corrupted OHLC at ${formattedIST}: Low (${low}) is greater than min(open=${open}, close=${close}) [Low > Open/Close].`
        );
      }

      // High >= Low
      if (high < low) {
        errors.push(
          `Corrupted OHLC at ${formattedIST}: High (${high}) is less than Low (${low}) [High < Low].`
        );
      }
    }

    const isSynthetic = hasSyntheticDetected || detectSyntheticCandle(candle, options);

    sanitizedCandles.push({
      ...candle,
      timestamp: ts,
      time: candle.time ?? formattedIST,
      open,
      high,
      low,
      close,
      volume,
      ...(isSynthetic ? { isSynthetic: true, source: "SYNTHETIC DATA" } : {}),
    });
  }

  // 5. Gaps check: flag gaps during market hours that do not cross overnight or an NSE holiday
  for (let i = 1; i < sanitizedCandles.length; i++) {
    const prev = sanitizedCandles[i - 1];
    const curr = sanitizedCandles[i];
    const prevParts = getISTDateParts(prev.timestamp);
    const currParts = getISTDateParts(curr.timestamp);

    // Only inspect gaps occurring on the SAME trading day during market hours
    // (i.e. does not cross overnight, weekends, or holidays)
    if (prevParts.dateString === currParts.dateString) {
      const diffMs = curr.timestamp - prev.timestamp;
      const expectedIntervalMs = options?.expectedIntervalMinutes
        ? options.expectedIntervalMinutes * 60 * 1000
        : undefined;

      // Threshold: if expected interval given, gap is > 1.5x expected interval;
      // otherwise, flag gaps exceeding 15 minutes during the same trading session
      const thresholdMs = expectedIntervalMs ? expectedIntervalMs * 1.5 : 15 * 60 * 1000;

      if (diffMs > thresholdMs) {
        const gapMinutes = Math.round(diffMs / 60000);
        warnings.push(
          `Intraday market hours gap detected on ${prevParts.dateString} between ${formatIST(
            prev.timestamp
          )} and ${formatIST(curr.timestamp)} (${gapMinutes} minutes missing).`
        );
      }
    }
  }

  if (hasSyntheticDetected) {
    warnings.push("Synthetic data detected or flagged: tagged with isSynthetic=true and source='SYNTHETIC DATA'.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedCandles,
  };
}
