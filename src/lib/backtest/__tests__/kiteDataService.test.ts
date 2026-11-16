import { describe, it, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import {
  getInstrumentToken,
  normalizeSymbol,
  mapToKiteInterval,
  getMaxDaysForInterval,
  generateDateChunks,
  getISTDayOfWeek,
  parseDateInput,
  getCacheFilePath,
  generateNSEHistoricalCandles,
  fetchKiteHistoricalData,
  clearHistoricalCache,
  kiteDataService,
} from "../kiteDataService";

describe("KiteDataService", () => {
  const testCacheDir = ".cache/test_historical";

  beforeEach(async () => {
    await clearHistoricalCache(undefined, testCacheDir);
  });

  afterEach(async () => {
    await clearHistoricalCache(undefined, testCacheDir);
    try {
      await fs.promises.rm(path.resolve(process.cwd(), testCacheDir), {
        recursive: true,
        force: true,
      });
    } catch {
      // Ignore
    }
  });

  describe("Requirement 1 & 2: Symbol Normalization & Instrument Token Mapping", () => {
    it("should resolve correct instrument tokens for all required symbols", () => {
      const expectedTokens: Record<string, number> = {
        "NIFTY 50": 256265,
        NIFTY50: 256265,
        BANKNIFTY: 260105,
        FINNIFTY: 257801,
        SENSEX: 265,
        RELIANCE: 738561,
        HDFCBANK: 341249,
        TCS: 295321,
        INFY: 408065,
        ICICIBANK: 1270529,
        SBIN: 779521,
        TATAMOTORS: 884737,
      };

      for (const [sym, expectedToken] of Object.entries(expectedTokens)) {
        assert.equal(getInstrumentToken(sym), expectedToken, `Token mismatch for ${sym}`);
      }
    });

    it("should handle symbol aliases and lowercase variants", () => {
      assert.equal(getInstrumentToken("nifty50"), 256265);
      assert.equal(getInstrumentToken("Nifty 50"), 256265);
      assert.equal(getInstrumentToken("reliance.ns"), 738561);
      assert.equal(getInstrumentToken("INFY.NS"), 408065);
      assert.equal(getInstrumentToken("TMPV.NS"), 884737);
      assert.equal(getInstrumentToken("BSE SENSEX"), 265);
    });

    it("should normalize symbols reliably", () => {
      assert.equal(normalizeSymbol("NIFTY 50"), "NIFTY50");
      assert.equal(normalizeSymbol("  reliance.ns "), "RELIANCE");
      assert.equal(normalizeSymbol("^NSEI"), "NIFTY50");
      assert.equal(normalizeSymbol("^NSEBANK"), "BANKNIFTY");
    });
  });

  describe("Requirement 3: Interval Mapping", () => {
    it("should map standard timeframe strings to Kite historical intervals", () => {
      assert.equal(mapToKiteInterval("1m"), "minute");
      assert.equal(mapToKiteInterval("5m"), "5minute");
      assert.equal(mapToKiteInterval("15m"), "15minute");
      assert.equal(mapToKiteInterval("1h"), "60minute");
      assert.equal(mapToKiteInterval("1d"), "day");
    });

    it("should accept direct Kite intervals and additional standard timeframes", () => {
      assert.equal(mapToKiteInterval("minute"), "minute");
      assert.equal(mapToKiteInterval("3m"), "3minute");
      assert.equal(mapToKiteInterval("10m"), "10minute");
      assert.equal(mapToKiteInterval("30m"), "30minute");
      assert.equal(mapToKiteInterval("60m"), "60minute");
      assert.equal(mapToKiteInterval("day"), "day");
    });

    it("should throw an error for unsupported intervals", () => {
      assert.throws(() => mapToKiteInterval("invalid_interval"));
    });
  });

  describe("Requirement 4: Chunking Logic & Limits", () => {
    it("should enforce the correct max days per interval", () => {
      assert.equal(getMaxDaysForInterval("minute"), 60);
      assert.equal(getMaxDaysForInterval("5minute"), 100);
      assert.equal(getMaxDaysForInterval("15minute"), 100);
      assert.equal(getMaxDaysForInterval("60minute"), 100);
      assert.equal(getMaxDaysForInterval("day"), 2000);
    });

    it("should correctly partition date ranges into chunks", () => {
      // 180 days on 'minute' (60 days max) -> 3+ chunks of <= 60 days
      const from = new Date("2023-01-01T03:45:00.000Z"); // 09:15 IST
      const to = new Date("2023-07-01T03:45:00.000Z"); // ~181 days later
      const chunks = generateDateChunks(from, to, 60);

      assert.ok(chunks.length >= 3);
      assert.equal(chunks[0].from.getTime(), from.getTime());
      assert.equal(chunks[chunks.length - 1].to.getTime(), to.getTime());

      // Ensure no chunk exceeds 60 days
      for (const chunk of chunks) {
        const diffDays =
          (chunk.to.getTime() - chunk.from.getTime()) / (24 * 60 * 60 * 1000);
        assert.ok(diffDays <= 60.0001, `Chunk diffDays ${diffDays} exceeds 60`);
      }
    });
  });

  describe("Requirement 6: Offline Fallback & NSE Structure Constraints", () => {
    it("should generate weekdays only (no Saturday or Sunday)", () => {
      // Generate across 14 calendar days (contains two weekends)
      const from = parseDateInput("2024-01-01", false); // Monday
      const to = parseDateInput("2024-01-14", true); // Sunday

      const candles = generateNSEHistoricalCandles({
        symbol: "NIFTY50",
        interval: "day",
        from,
        to,
      });

      // Exactly 10 trading days in a 14-day 2-week period
      assert.equal(candles.length, 10);

      for (const candle of candles) {
        const d = new Date(candle.timestamp);
        const weekday = getISTDayOfWeek(d);
        assert.ok(["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday));
        assert.ok(!["Sat", "Sun"].includes(weekday));
      }
    });

    it("should strictly adhere to 09:15 to 15:30 IST session hours and :15 alignment", () => {
      // 1-day 15m test
      const from = parseDateInput("2024-01-01", false);
      const to = parseDateInput("2024-01-01", true);

      const candles15m = generateNSEHistoricalCandles({
        symbol: "RELIANCE",
        interval: "15minute",
        from,
        to,
      });

      // Exactly 25 bars per day for 15-minute timeframe
      assert.equal(candles15m.length, 25);
      assert.equal(candles15m[0].timestamp, "2024-01-01T09:15:00+05:30");
      assert.equal(
        candles15m[candles15m.length - 1].timestamp,
        "2024-01-01T15:15:00+05:30"
      );

      // Verify all timestamps end in :00+05:30 and minutes are 00, 15, 30, or 45
      for (const c of candles15m) {
        assert.match(c.timestamp, /\+05:30$/);
        const timePart = c.timestamp.split("T")[1].substring(0, 5); // HH:MM
        const [hh, mm] = timePart.split(":").map(Number);
        assert.ok(hh >= 9 && hh <= 15);
        assert.ok([0, 15, 30, 45].includes(mm));
      }
    });

    it("should produce 7 strictly :15 aligned bars per day for 60minute timeframe", () => {
      const from = parseDateInput("2024-01-02", false);
      const to = parseDateInput("2024-01-02", true);

      const candles1h = generateNSEHistoricalCandles({
        symbol: "BANKNIFTY",
        interval: "60minute",
        from,
        to,
      });

      assert.equal(candles1h.length, 7);
      const expectedTimestamps = [
        "2024-01-02T09:15:00+05:30",
        "2024-01-02T10:15:00+05:30",
        "2024-01-02T11:15:00+05:30",
        "2024-01-02T12:15:00+05:30",
        "2024-01-02T13:15:00+05:30",
        "2024-01-02T14:15:00+05:30",
        "2024-01-02T15:15:00+05:30",
      ];
      assert.deepEqual(
        candles1h.map((c) => c.timestamp),
        expectedTimestamps
      );
    });

    it("should produce valid OHLC relationships (high >= open, close; low <= open, close)", () => {
      const from = parseDateInput("2024-01-01", false);
      const to = parseDateInput("2024-01-03", true);

      const candles = generateNSEHistoricalCandles({
        symbol: "TCS",
        interval: "5minute",
        from,
        to,
      });

      assert.equal(candles.length, 75 * 3); // 3 days * 75 bars

      for (const c of candles) {
        assert.ok(c.high >= c.open, "high should be >= open");
        assert.ok(c.high >= c.close, "high should be >= close");
        assert.ok(c.low <= c.open, "low should be <= open");
        assert.ok(c.low <= c.close, "low should be <= close");
        assert.ok(c.volume > 0, "volume should be > 0");
        assert.equal(c.source, "SYNTHETIC");
      }
    });
  });

  describe("Requirement 5: Local Caching Layer & Integration Flow", () => {
    it("should generate fixtures, cache to disk, and return CACHED on subsequent calls", async () => {
      const symbol = "HDFCBANK";
      const interval = "15m";
      const from = "2024-01-01";
      const to = "2024-01-02";

      // 1. First fetch (no API key -> offline fallback creates SYNTHETIC candles and writes to cache)
      const firstResult = await fetchKiteHistoricalData({
        symbol,
        interval,
        from,
        to,
        cacheDir: testCacheDir,
      });

      assert.equal(firstResult.length, 50); // 2 days * 25 bars
      assert.equal(firstResult[0].source, "SYNTHETIC");

      // Verify cache file was written to disk
      const expectedPath = getCacheFilePath(
        symbol,
        "15minute",
        from,
        to,
        testCacheDir
      );
      assert.ok(fs.existsSync(expectedPath), "Cache file should exist on disk");

      // Verify file content has metadata and candles
      const fileData = JSON.parse(await fs.promises.readFile(expectedPath, "utf8"));
      assert.equal(fileData.symbol, "HDFCBANK");
      assert.equal(fileData.count, 50);
      assert.equal(fileData.candles.length, 50);

      // 2. Second fetch should hit cache and return candles with source CACHED
      const secondResult = await fetchKiteHistoricalData({
        symbol,
        interval,
        from,
        to,
        cacheDir: testCacheDir,
      });

      assert.equal(secondResult.length, 50);
      assert.equal(secondResult[0].source, "CACHED");
      assert.equal(secondResult[0].timestamp, firstResult[0].timestamp);
      assert.equal(secondResult[0].open, firstResult[0].open);
      assert.equal(secondResult[0].close, firstResult[0].close);
    });

    it("should bypass cache when forceRefresh is true", async () => {
      const symbol = "INFY";
      const interval = "day";
      const from = "2024-01-01";
      const to = "2024-01-05";

      const r1 = await fetchKiteHistoricalData({
        symbol,
        interval,
        from,
        to,
        cacheDir: testCacheDir,
      });
      assert.equal(r1[0].source, "SYNTHETIC");

      // With forceRefresh: true, source will be regenerated (SYNTHETIC) instead of CACHED
      const r2 = await fetchKiteHistoricalData({
        symbol,
        interval,
        from,
        to,
        forceRefresh: true,
        cacheDir: testCacheDir,
      });
      assert.equal(r2[0].source, "SYNTHETIC");
    });
  });

  describe("Polymorphic Helper & Service Instance", () => {
    it("should work via kiteDataService singleton methods", async () => {
      const candles = await kiteDataService.getCandles(
        "ICICIBANK",
        "15m",
        "2024-01-01",
        "2024-01-01"
      );
      assert.equal(candles.length, 25);
      assert.equal(candles[0].timestamp, "2024-01-01T09:15:00+05:30");
      assert.ok(["SYNTHETIC", "CACHED"].includes(candles[0].source));
    });

    it("should get token via kiteDataService", () => {
      assert.equal(kiteDataService.getInstrumentToken("SBIN"), 779521);
      assert.equal(kiteDataService.getInstrumentToken("TATAMOTORS"), 884737);
    });
  });
});
