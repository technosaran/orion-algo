import { describe, it, expect } from "vitest";
import {
  isNSEHoliday,
  isNSETradingDay,
  isNSEMarketHours,
  formatIST,
  validateCandles,
  getNSEHolidayDetails,
  getNSEHolidays,
} from "../nseValidation";

describe("NSE Holiday Calendar & Trading Days", () => {
  it("holiday check correctly identifies NSE holidays in 2024, 2025, and 2026", () => {
    // 2024 Holidays
    expect(isNSEHoliday("2024-01-26")).toBe(true); // Republic Day
    expect(isNSEHoliday("2024-03-08")).toBe(true); // Mahashivratri
    expect(isNSEHoliday("2024-03-25")).toBe(true); // Holi
    expect(isNSEHoliday("2024-03-29")).toBe(true); // Good Friday
    expect(isNSEHoliday("2024-04-11")).toBe(true); // Id-Ul-Fitr
    expect(isNSEHoliday("2024-04-17")).toBe(true); // Ram Navami
    expect(isNSEHoliday("2024-05-01")).toBe(true); // Maharashtra Day
    expect(isNSEHoliday("2024-06-17")).toBe(true); // Bakri Id
    expect(isNSEHoliday("2024-07-17")).toBe(true); // Moharram
    expect(isNSEHoliday("2024-08-15")).toBe(true); // Independence Day
    expect(isNSEHoliday("2024-10-02")).toBe(true); // Mahatma Gandhi Jayanti
    expect(isNSEHoliday("2024-11-01")).toBe(true); // Diwali Laxmi Pujan (Muhurat Trading)
    expect(isNSEHoliday("2024-11-15")).toBe(true); // Gurunanak Jayanti
    expect(isNSEHoliday("2024-12-25")).toBe(true); // Christmas

    // 2025 Holidays
    expect(isNSEHoliday("2025-02-26")).toBe(true); // Mahashivratri
    expect(isNSEHoliday("2025-03-14")).toBe(true); // Holi
    expect(isNSEHoliday("2025-03-31")).toBe(true); // Id-Ul-Fitr
    expect(isNSEHoliday("2025-04-10")).toBe(true); // Mahavir Jayanti
    expect(isNSEHoliday("2025-04-14")).toBe(true); // Ambedkar Jayanti
    expect(isNSEHoliday("2025-04-18")).toBe(true); // Good Friday
    expect(isNSEHoliday("2025-05-01")).toBe(true); // Maharashtra Day
    expect(isNSEHoliday("2025-08-15")).toBe(true); // Independence Day
    expect(isNSEHoliday("2025-10-02")).toBe(true); // Gandhi Jayanti / Dussehra
    expect(isNSEHoliday("2025-10-21")).toBe(true); // Diwali Laxmi Pujan
    expect(isNSEHoliday("2025-11-05")).toBe(true); // Gurunanak Jayanti
    expect(isNSEHoliday("2025-12-25")).toBe(true); // Christmas

    // 2026 Holidays
    expect(isNSEHoliday("2026-01-26")).toBe(true); // Republic Day
    expect(isNSEHoliday("2026-03-03")).toBe(true); // Holi
    expect(isNSEHoliday("2026-03-20")).toBe(true); // Id-Ul-Fitr
    expect(isNSEHoliday("2026-03-26")).toBe(true); // Ram Navami
    expect(isNSEHoliday("2026-03-31")).toBe(true); // Mahavir Jayanti
    expect(isNSEHoliday("2026-04-03")).toBe(true); // Good Friday
    expect(isNSEHoliday("2026-05-01")).toBe(true); // Maharashtra Day
    expect(isNSEHoliday("2026-05-28")).toBe(true); // Bakri Id
    expect(isNSEHoliday("2026-06-26")).toBe(true); // Muharram
    expect(isNSEHoliday("2026-10-02")).toBe(true); // Gandhi Jayanti
    expect(isNSEHoliday("2026-10-20")).toBe(true); // Dussehra
    expect(isNSEHoliday("2026-11-08")).toBe(true); // Diwali Laxmi Pujan (Sunday Muhurat)
    expect(isNSEHoliday("2026-11-24")).toBe(true); // Gurunanak Jayanti
    expect(isNSEHoliday("2026-12-25")).toBe(true); // Christmas
  });

  it("correctly identifies non-holidays as normal trading days", () => {
    // Normal weekdays (Wednesdays / Thursdays)
    expect(isNSEHoliday("2024-01-25")).toBe(false);
    expect(isNSEHoliday("2024-05-15")).toBe(false);
    expect(isNSEHoliday("2025-06-11")).toBe(false);
    expect(isNSEHoliday("2026-02-18")).toBe(false);
  });

  it("handles Date objects and UTC timestamps accurately in IST timezone", () => {
    // Republic Day 2024: Jan 26 09:15 IST = Jan 26 03:45 UTC
    const repDayDate = new Date("2024-01-26T03:45:00.000Z");
    expect(isNSEHoliday(repDayDate)).toBe(true);

    // Jan 25 at 23:00 UTC is Jan 26 04:30 IST -> Jan 26 Republic Day in India!
    const eveningUtcDate = new Date("2024-01-25T23:00:00.000Z");
    expect(isNSEHoliday(eveningUtcDate)).toBe(true);

    // Jan 24 at 12:00 UTC -> Jan 24 17:30 IST (normal day)
    expect(isNSEHoliday(new Date("2024-01-24T12:00:00.000Z"))).toBe(false);
  });

  it("checks trading days (Mon-Fri, not an NSE holiday)", () => {
    // Regular trading day: Thursday 2024-01-25
    expect(isNSETradingDay("2024-01-25")).toBe(true);

    // Holiday on Friday: 2024-01-26 (Republic Day)
    expect(isNSETradingDay("2024-01-26")).toBe(false);

    // Saturday: 2024-01-27
    expect(isNSETradingDay("2024-01-27")).toBe(false);

    // Sunday: 2024-01-28
    expect(isNSETradingDay("2024-01-28")).toBe(false);

    // Monday trading day: 2024-01-29
    expect(isNSETradingDay("2024-01-29")).toBe(true);
  });

  it("includes Muhurat Trading metadata for Diwali Laxmi Pujan", () => {
    const diwali2024 = getNSEHolidayDetails("2024-11-01");
    expect(diwali2024).toBeDefined();
    expect(diwali2024?.isMuhuratTrading).toBe(true);
    expect(diwali2024?.description?.toLowerCase()).toContain("muhurat trading");

    const diwali2025 = getNSEHolidayDetails("2025-10-21");
    expect(diwali2025).toBeDefined();
    expect(diwali2025?.isMuhuratTrading).toBe(true);

    const diwali2026 = getNSEHolidayDetails("2026-11-08");
    expect(diwali2026).toBeDefined();
    expect(diwali2026?.isMuhuratTrading).toBe(true);
  });

  it("returns all holidays list via getNSEHolidays", () => {
    const list = getNSEHolidays();
    expect(list.length).toBeGreaterThan(40);
  });
});

describe("NSE Market Hours & IST Formatting", () => {
  it("formats date with +05:30 offset e.g. YYYY-MM-DDTHH:mm:ss+05:30", () => {
    // 03:45 UTC = 09:15 IST
    const formatted = formatIST("2024-05-15T03:45:00.000Z");
    expect(formatted).toBe("2024-05-15T09:15:00+05:30");

    // Check with explicit IST string
    const istString = formatIST("2024-05-15T15:30:00+05:30");
    expect(istString).toBe("2024-05-15T15:30:00+05:30");
  });

  it("identifies timestamps within NSE market hours (09:15:00 to 15:30:00 IST)", () => {
    // Market open: 09:15:00 IST
    expect(isNSEMarketHours("2024-05-15T09:15:00+05:30")).toBe(true);

    // Midday: 12:30:00 IST
    expect(isNSEMarketHours("2024-05-15T12:30:00+05:30")).toBe(true);

    // Market close: 15:30:00 IST
    expect(isNSEMarketHours("2024-05-15T15:30:00+05:30")).toBe(true);
  });

  it("timestamps at 11:50 PM or 2:50 AM fail market hours check", () => {
    // 11:50 PM IST = 23:50:00
    expect(isNSEMarketHours("2024-05-15T23:50:00+05:30")).toBe(false);

    // 2:50 AM IST = 02:50:00
    expect(isNSEMarketHours("2024-05-15T02:50:00+05:30")).toBe(false);

    // Edge boundaries: 09:14:59 IST (before open) and 15:30:01 IST (after close)
    expect(isNSEMarketHours("2024-05-15T09:14:59+05:30")).toBe(false);
    expect(isNSEMarketHours("2024-05-15T15:30:01+05:30")).toBe(false);
  });
});

describe("Candle Validation", () => {
  it("valid NSE candles pass validation", () => {
    const validCandles = [
      {
        time: "2024-05-15T09:15:00+05:30",
        timestamp: new Date("2024-05-15T09:15:00+05:30").getTime(),
        open: 100.0,
        high: 105.0,
        low: 99.5,
        close: 103.0,
        volume: 5000,
      },
      {
        time: "2024-05-15T09:20:00+05:30",
        timestamp: new Date("2024-05-15T09:20:00+05:30").getTime(),
        open: 103.0,
        high: 106.0,
        low: 102.0,
        close: 104.5,
        volume: 4200,
      },
      {
        time: "2024-05-15T09:25:00+05:30",
        timestamp: new Date("2024-05-15T09:25:00+05:30").getTime(),
        open: 104.5,
        high: 107.0,
        low: 103.8,
        close: 106.2,
        volume: 6100,
      },
    ];

    const result = validateCandles(validCandles);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.sanitizedCandles).toHaveLength(3);
    expect(result.sanitizedCandles[0].close).toBe(103.0);
  });

  it("weekend candles fail with specific error", () => {
    // 2024-05-18 is a Saturday
    const saturdayCandle = {
      timestamp: new Date("2024-05-18T10:00:00+05:30").getTime(),
      open: 100,
      high: 102,
      low: 99,
      close: 101,
      volume: 1000,
    };

    // 2024-05-19 is a Sunday
    const sundayCandle = {
      timestamp: new Date("2024-05-19T11:00:00+05:30").getTime(),
      open: 101,
      high: 103,
      low: 100,
      close: 102,
      volume: 1200,
    };

    const result = validateCandles([saturdayCandle, sundayCandle]);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);

    const hasWeekendError = result.errors.some((err) =>
      /weekend|saturday|sunday/i.test(err)
    );
    expect(hasWeekendError).toBe(true);

    // When allowWeekend flag is enabled, weekend error is bypassed
    const allowedResult = validateCandles([saturdayCandle], { allowWeekend: true });
    const hasWeekendErrorAllowed = allowedResult.errors.some((err) =>
      /weekend|saturday|sunday/i.test(err)
    );
    expect(hasWeekendErrorAllowed).toBe(false);
  });

  it("timestamps at 11:50 PM or 2:50 AM fail validation", () => {
    // 11:50 PM IST (23:50:00) on a Wednesday
    const candle1150PM = {
      timestamp: new Date("2024-05-15T23:50:00+05:30").getTime(),
      open: 100,
      high: 105,
      low: 98,
      close: 102,
      volume: 1000,
    };

    // 2:50 AM IST (02:50:00) on a Wednesday
    const candle250AM = {
      timestamp: new Date("2024-05-15T02:50:00+05:30").getTime(),
      open: 102,
      high: 104,
      low: 101,
      close: 103,
      volume: 1000,
    };

    const result = validateCandles([candle1150PM, candle250AM]);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);

    const hasMarketHoursError = result.errors.some((err) =>
      /market hours/i.test(err)
    );
    expect(hasMarketHoursError).toBe(true);
  });

  it("corrupted OHLC (High < Low or High < Open) fails validation", () => {
    // Case 1: High < Low
    const highLessThanLow = {
      timestamp: new Date("2024-05-15T10:00:00+05:30").getTime(),
      open: 100,
      high: 95,
      low: 105,
      close: 100,
      volume: 1000,
    };

    // Case 2: High < Open
    const highLessThanOpen = {
      timestamp: new Date("2024-05-15T10:05:00+05:30").getTime(),
      open: 100,
      high: 98,
      low: 90,
      close: 95,
      volume: 1000,
    };

    // Case 3: Low > Close
    const lowGreaterThanClose = {
      timestamp: new Date("2024-05-15T10:10:00+05:30").getTime(),
      open: 100,
      high: 105,
      low: 98,
      close: 95, // close is 95, lower than low 98
      volume: 1000,
    };

    const result = validateCandles([
      highLessThanLow,
      highLessThanOpen,
      lowGreaterThanClose,
    ]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);

    const hasHighLessThanLow = result.errors.some((err) =>
      /High.*less than Low|High < Low/i.test(err)
    );
    const hasHighLessThanOpen = result.errors.some((err) =>
      /High.*less than max|High < Open/i.test(err)
    );
    const hasLowGreaterThanClose = result.errors.some((err) =>
      /Low.*greater than min|Low > Open\/Close/i.test(err)
    );

    expect(hasHighLessThanLow).toBe(true);
    expect(hasHighLessThanOpen).toBe(true);
    expect(hasLowGreaterThanClose).toBe(true);
  });

  it("rejects non-positive prices and negative volumes", () => {
    const invalidPriceCandle = {
      timestamp: new Date("2024-05-15T10:00:00+05:30").getTime(),
      open: 0,
      high: 10,
      low: 0,
      close: 10,
      volume: 100,
    };

    const negativeVolCandle = {
      timestamp: new Date("2024-05-15T10:05:00+05:30").getTime(),
      open: 100,
      high: 105,
      low: 95,
      close: 100,
      volume: -50,
    };

    const result = validateCandles([invalidPriceCandle, negativeVolCandle]);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((err) => /strictly greater than 0/i.test(err))).toBe(true);
    expect(result.errors.some((err) => /non-negative|greater than or equal to 0/i.test(err))).toBe(true);
  });

  it("duplicate candles are deduplicated, keeping the latest", () => {
    const ts1 = new Date("2024-05-15T10:00:00+05:30").getTime();
    const ts2 = new Date("2024-05-15T10:05:00+05:30").getTime();

    const candles = [
      {
        timestamp: ts1,
        open: 100,
        high: 105,
        low: 98,
        close: 102, // initial close
        volume: 1000,
        version: "v1",
      },
      {
        timestamp: ts1, // duplicate timestamp!
        open: 100,
        high: 106,
        low: 98,
        close: 105.5, // latest updated close
        volume: 1500,
        version: "v2",
      },
      {
        timestamp: ts2,
        open: 105.5,
        high: 108,
        low: 104,
        close: 107,
        volume: 2000,
      },
    ];

    const result = validateCandles(candles);
    expect(result.isValid).toBe(true);
    // 3 input candles with 1 duplicate -> 2 sanitized candles
    expect(result.sanitizedCandles).toHaveLength(2);

    // Latest duplicate kept
    const deduplicatedCandle = result.sanitizedCandles.find((c) => c.timestamp === ts1);
    expect(deduplicatedCandle).toBeDefined();
    expect(deduplicatedCandle.close).toBe(105.5);
    expect(deduplicatedCandle.version).toBe("v2");

    // Warnings record the deduplication
    expect(result.warnings.some((w) => /deduplicated/i.test(w))).toBe(true);
  });

  it("sorts candles chronologically in strictly ascending order", () => {
    const ts1 = new Date("2024-05-15T09:20:00+05:30").getTime();
    const ts2 = new Date("2024-05-15T09:25:00+05:30").getTime();
    const ts3 = new Date("2024-05-15T09:30:00+05:30").getTime();

    // Out of order: ts3, ts1, ts2
    const candles = [
      { timestamp: ts3, open: 104, high: 106, low: 103, close: 105, volume: 100 },
      { timestamp: ts1, open: 100, high: 102, low: 99, close: 101, volume: 100 },
      { timestamp: ts2, open: 101, high: 104, low: 100, close: 104, volume: 100 },
    ];

    const result = validateCandles(candles);
    expect(result.isValid).toBe(true);
    expect(result.sanitizedCandles[0].timestamp).toBe(ts1);
    expect(result.sanitizedCandles[1].timestamp).toBe(ts2);
    expect(result.sanitizedCandles[2].timestamp).toBe(ts3);
  });

  it("flags gaps during market hours that do not cross overnight or holidays", () => {
    // Candle at 10:00 IST and next at 11:30 IST on the same trading day (90 min gap)
    const sameDayGapCandles = [
      {
        timestamp: new Date("2024-05-15T10:00:00+05:30").getTime(),
        open: 100,
        high: 105,
        low: 98,
        close: 102,
        volume: 1000,
      },
      {
        timestamp: new Date("2024-05-15T11:30:00+05:30").getTime(), // 90 mins gap!
        open: 102,
        high: 106,
        low: 101,
        close: 104,
        volume: 1200,
      },
    ];

    const resultSameDay = validateCandles(sameDayGapCandles);
    expect(resultSameDay.warnings.some((w) => /gap detected/i.test(w))).toBe(true);

    // Gaps that cross overnight (e.g. 15:30 on Wednesday to 09:15 on Thursday) should NOT be flagged as intraday gaps
    const overnightCandles = [
      {
        timestamp: new Date("2024-05-15T15:30:00+05:30").getTime(),
        open: 100,
        high: 102,
        low: 99,
        close: 101,
        volume: 1000,
      },
      {
        timestamp: new Date("2024-05-16T09:15:00+05:30").getTime(),
        open: 101,
        high: 103,
        low: 100,
        close: 102,
        volume: 1000,
      },
    ];

    const resultOvernight = validateCandles(overnightCandles);
    expect(resultOvernight.warnings.some((w) => /intraday market hours gap detected/i.test(w))).toBe(false);
  });

  it("tags synthetic candles as isSynthetic: true and source: 'SYNTHETIC DATA'", () => {
    const rawCandles = [
      {
        timestamp: new Date("2024-05-15T09:15:00+05:30").getTime(),
        open: 100,
        high: 102,
        low: 98,
        close: 101,
        volume: 1000,
        source: "synthetic",
      },
    ];

    const result = validateCandles(rawCandles, { isSynthetic: true });
    expect(result.isValid).toBe(true);
    expect(result.sanitizedCandles[0].isSynthetic).toBe(true);
    expect(result.sanitizedCandles[0].source).toBe("SYNTHETIC DATA");
  });
});
