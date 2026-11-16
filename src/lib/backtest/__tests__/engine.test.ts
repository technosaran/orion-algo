import { describe, it, expect } from "vitest";
import { runClientBacktest, Candle } from "../engine";
import { BacktestConfig } from "../types";

describe("Backtest Execution Engine (Phase 2)", () => {
  const baseConfig: BacktestConfig = {
    strategy: "sma_crossover",
    symbol: "NIFTY50",
    timeframe: "15m",
    initialCapital: 100000,
    dateRangeDays: 30,
    slippagePct: 0,
    feePct: 0,
    leverage: 1.0,
    stopLossPct: null,
    takeProfitPct: null,
    trailingStopPct: null,
    strategyParams: {
      fast_period: 2,
      slow_period: 3,
      pctAlloc: 0.95,
    },
  };

  // ---------------------------------------------------------------------------
  // 1. No Lookahead Bias Test
  // ---------------------------------------------------------------------------
  it("eliminates lookahead bias: signal triggered on bar N fills on bar N+1 OPEN with slippage", () => {
    // Construct series where fast SMA crosses slow SMA on bar 3
    // Bar 0: 100, Bar 1: 100, Bar 2: 100 => SMA(2)=100, SMA(3)=100
    // Bar 3: 120 => SMA(2)=(100+120)/2 = 110, SMA(3)=(100+100+120)/3 = 106.67 => Signal triggers at bar 3 close!
    // Bar 4: Open=130, High=135, Low=125, Close=130 => Trade must enter at Bar 4 Open!
    // Bar 5: Open=130, High=135, Low=125, Close=130
    const candles: Candle[] = [
      { timestamp: "2026-01-01T09:15:00.000Z", open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { timestamp: "2026-01-01T09:30:00.000Z", open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { timestamp: "2026-01-01T09:45:00.000Z", open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { timestamp: "2026-01-01T10:00:00.000Z", open: 100, high: 120, low: 100, close: 120, volume: 1000 },
      { timestamp: "2026-01-01T10:15:00.000Z", open: 130, high: 135, low: 125, close: 130, volume: 1000 },
      { timestamp: "2026-01-01T10:30:00.000Z", open: 130, high: 135, low: 125, close: 130, volume: 1000 },
    ];

    const config: BacktestConfig = {
      ...baseConfig,
      slippagePct: 0.1, // 0.1% slippage
    };

    const result = runClientBacktest(config, candles);

    expect(result.trades.length).toBeGreaterThanOrEqual(1);
    const trade = result.trades[0];

    // Must fill at bar 4's timestamp and open price + slippage
    expect(trade.entryTime).toBe("2026-01-01T10:15:00.000Z");
    const expectedFillPrice = 130 * (1 + 0.001); // 130.13
    expect(trade.entryPrice).toBeCloseTo(expectedFillPrice, 2);

    // At bar 3 close (index 3), no trade was active yet, so equity equals initial capital
    expect(result.equityCurve[3].equity).toBe(config.initialCapital);
    // At bar 4 close (index 4), the trade is active and marked to market
    expect(result.equityCurve[4].equity).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 2. Intrabar SL/TP Tie Resolution Test
  // ---------------------------------------------------------------------------
  it("resolves intrabar SL/TP tie conservatively by executing Stop Loss first", () => {
    // Setup trade entering at 100
    // SL = 2% (98), TP = 5% (105)
    // Bar 5 has Low=90 (hits SL 98) AND High=110 (hits TP 105) in the SAME bar
    const candles: Candle[] = [
      { timestamp: "2026-01-01T09:15:00.000Z", open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { timestamp: "2026-01-01T09:30:00.000Z", open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { timestamp: "2026-01-01T09:45:00.000Z", open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { timestamp: "2026-01-01T10:00:00.000Z", open: 100, high: 110, low: 100, close: 110, volume: 1000 }, // Signal on bar 3
      { timestamp: "2026-01-01T10:15:00.000Z", open: 100, high: 102, low: 99, close: 101, volume: 1000 },   // Enter bar 4 at 100
      { timestamp: "2026-01-01T10:30:00.000Z", open: 101, high: 110, low: 90, close: 102, volume: 1000 },   // Bar 5 hits SL & TP!
      { timestamp: "2026-01-01T10:45:00.000Z", open: 102, high: 103, low: 101, close: 102, volume: 1000 },
    ];

    const config: BacktestConfig = {
      ...baseConfig,
      stopLossPct: 2.0, // SL at 98
      takeProfitPct: 5.0, // TP at 105
      slippagePct: 0,
      feePct: 0,
    };

    const result = runClientBacktest(config, candles);

    expect(result.trades.length).toBe(1);
    const trade = result.trades[0];

    // Must resolve to Stop Loss!
    expect(trade.exitReason).toBe("Stop Loss");
    expect(trade.exitPrice).toBeCloseTo(98, 2);
    expect(trade.exitTime).toBe("2026-01-01T10:30:00.000Z");
  });

  it("triggers Take Profit when only TP is hit", () => {
    const candles: Candle[] = [
      { timestamp: "2026-01-01T09:15:00.000Z", open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { timestamp: "2026-01-01T09:30:00.000Z", open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { timestamp: "2026-01-01T09:45:00.000Z", open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { timestamp: "2026-01-01T10:00:00.000Z", open: 100, high: 110, low: 100, close: 110, volume: 1000 },
      { timestamp: "2026-01-01T10:15:00.000Z", open: 100, high: 102, low: 99, close: 101, volume: 1000 },
      { timestamp: "2026-01-01T10:30:00.000Z", open: 101, high: 108, low: 100, close: 107, volume: 1000 }, // High 108 >= 105, Low 100 > 98
      { timestamp: "2026-01-01T10:45:00.000Z", open: 107, high: 108, low: 106, close: 107, volume: 1000 },
    ];

    const config: BacktestConfig = {
      ...baseConfig,
      stopLossPct: 2.0,
      takeProfitPct: 5.0,
      slippagePct: 0,
      feePct: 0,
    };

    const result = runClientBacktest(config, candles);
    expect(result.trades.length).toBe(1);
    expect(result.trades[0].exitReason).toBe("Take Profit");
    expect(result.trades[0].exitPrice).toBeCloseTo(105, 2);
  });

  // ---------------------------------------------------------------------------
  // 3. ONE Source of Truth for P&L (Mathematical Identity)
  // ---------------------------------------------------------------------------
  it("enforces mathematical identity: sum(trades.pnl) === finalEquity - initialCapital === netProfit with fees", () => {
    // Run full simulation with realistic fees and slippage
    const config: BacktestConfig = {
      ...baseConfig,
      dateRangeDays: 45,
      feePct: 0.075, // 0.075% fee per side
      slippagePct: 0.05, // 0.05% slippage
      stopLossPct: 2.0,
      takeProfitPct: 4.0,
    };

    const result = runClientBacktest(config);

    expect(result.success).toBe(true);
    expect(result.trades.length).toBeGreaterThan(0);

    const sumTradePnl = Number(
      result.trades.reduce((acc, t) => acc + t.pnl, 0).toFixed(2)
    );
    const calculatedEquityDiff = Number(
      (result.summary.finalEquity - result.summary.initialCapital).toFixed(2)
    );

    // Crucial Identity Check: no double deduction of entry fees!
    expect(sumTradePnl).toBe(calculatedEquityDiff);
    expect(result.summary.netProfit).toBe(calculatedEquityDiff);
  });

  // ---------------------------------------------------------------------------
  // 4. Zero Fees & Zero Slippage Math Test
  // ---------------------------------------------------------------------------
  it("verifies trade P&L equals size * (exit - entry) with zero fees and zero slippage", () => {
    const candles: Candle[] = [
      { timestamp: "2026-01-01T09:15:00.000Z", open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { timestamp: "2026-01-01T09:30:00.000Z", open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { timestamp: "2026-01-01T09:45:00.000Z", open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { timestamp: "2026-01-01T10:00:00.000Z", open: 100, high: 110, low: 100, close: 110, volume: 1000 },
      { timestamp: "2026-01-01T10:15:00.000Z", open: 100, high: 105, low: 99, close: 105, volume: 1000 }, // Enter at 100
      { timestamp: "2026-01-01T10:30:00.000Z", open: 105, high: 115, low: 104, close: 110, volume: 1000 }, // Take profit at 110
    ];

    const config: BacktestConfig = {
      ...baseConfig,
      feePct: 0,
      slippagePct: 0,
      leverage: 1.0,
      takeProfitPct: 10.0, // TP at 110
      stopLossPct: null,
      trailingStopPct: null,
    };

    const result = runClientBacktest(config, candles);
    expect(result.trades.length).toBe(1);

    const trade = result.trades[0];
    expect(trade.entryPrice).toBe(100);
    expect(trade.exitPrice).toBe(110);
    expect(trade.feePaid).toBe(0);

    const expectedPnl = Number((trade.size * (trade.exitPrice - trade.entryPrice)).toFixed(2));
    expect(trade.pnl).toBeCloseTo(expectedPnl, 2);
  });

  // ---------------------------------------------------------------------------
  // 5. Opposite Crossover Signal Exit Test
  // ---------------------------------------------------------------------------
  it("executes opposite crossover Signal Exit when trailing stop is off", () => {
    // Candles:
    // Bar 0-2: flat at 100
    // Bar 3: rises to 120 (Fast MA crosses above Slow MA => BUY signal)
    // Bar 4: enters at Open 120
    // Bar 5: flat at 120
    // Bar 6: drops to 80 (Fast MA crosses below Slow MA => EXIT signal on bar 6 close!)
    // Bar 7: flat at 80
    const candles: Candle[] = [
      { timestamp: "2026-01-01T09:15:00.000Z", open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { timestamp: "2026-01-01T09:30:00.000Z", open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { timestamp: "2026-01-01T09:45:00.000Z", open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { timestamp: "2026-01-01T10:00:00.000Z", open: 100, high: 120, low: 100, close: 120, volume: 1000 }, // Buy signal bar 3
      { timestamp: "2026-01-01T10:15:00.000Z", open: 120, high: 125, low: 118, close: 120, volume: 1000 }, // Enter bar 4
      { timestamp: "2026-01-01T10:30:00.000Z", open: 120, high: 125, low: 118, close: 120, volume: 1000 },
      { timestamp: "2026-01-01T10:45:00.000Z", open: 120, high: 120, low: 80, close: 80, volume: 1000 },   // Opposite crossover!
      { timestamp: "2026-01-01T11:00:00.000Z", open: 80, high: 82, low: 78, close: 80, volume: 1000 },
    ];

    const config: BacktestConfig = {
      ...baseConfig,
      stopLossPct: null, // Wide or off
      takeProfitPct: null,
      trailingStopPct: null, // Trailing stop is OFF
      slippagePct: 0,
      feePct: 0,
    };

    const result = runClientBacktest(config, candles);

    expect(result.trades.length).toBeGreaterThanOrEqual(1);
    const trade = result.trades[0];
    expect(trade.exitReason).toBe("Signal Exit");
    expect(trade.exitTime).toBe("2026-01-01T10:45:00.000Z");
    expect(trade.exitPrice).toBe(80);
  });

  // ---------------------------------------------------------------------------
  // 6. Trailing Stop Behavior (Configurable & OFF by default)
  // ---------------------------------------------------------------------------
  it("executes Trailing Stop when enabled and price pulls back from peak", () => {
    // Bar 4 enters at 100
    // Bar 5 reaches peak High 120 (trail price at 2% = 120 * 0.98 = 117.6)
    // Bar 6 drops with Low 115 <= 117.6 => Trailing stop hits!
    const candles: Candle[] = [
      { timestamp: "2026-01-01T09:15:00.000Z", open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { timestamp: "2026-01-01T09:30:00.000Z", open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { timestamp: "2026-01-01T09:45:00.000Z", open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { timestamp: "2026-01-01T10:00:00.000Z", open: 100, high: 110, low: 100, close: 110, volume: 1000 }, // Buy signal
      { timestamp: "2026-01-01T10:15:00.000Z", open: 100, high: 101, low: 100, close: 101, volume: 1000 },   // Enter bar 4 cleanly
      { timestamp: "2026-01-01T10:30:00.000Z", open: 101, high: 120, low: 101, close: 120, volume: 1000 },  // Peak 120
      { timestamp: "2026-01-01T10:45:00.000Z", open: 120, high: 120, low: 115, close: 116, volume: 1000 },  // Pullback to 115 <= 117.6
      { timestamp: "2026-01-01T11:00:00.000Z", open: 116, high: 117, low: 115, close: 116, volume: 1000 },
    ];

    const config: BacktestConfig = {
      ...baseConfig,
      stopLossPct: null,
      takeProfitPct: null,
      trailingStopPct: 2.0, // Enabled trailing stop at 2%
      slippagePct: 0,
      feePct: 0,
    };

    const result = runClientBacktest(config, candles);
    expect(result.trades.length).toBe(1);
    expect(result.trades[0].exitReason).toBe("Trailing Stop");
    expect(result.trades[0].exitPrice).toBeCloseTo(120 * (1 - 0.02), 2);
  });

  // ---------------------------------------------------------------------------
  // 7. Mark-to-Market Continuous Equity Curve Test
  // ---------------------------------------------------------------------------
  it("tracks open trade mark-to-market fluctuations on the equity curve", () => {
    // Enter trade at bar 4 open = 100
    // Bar 4 close = 105 (positive unrealized)
    // Bar 5 close = 120 (higher unrealized)
    // Bar 6 close = 95 (negative unrealized)
    // Bar 7 close = 100 (End of backtest)
    const candles: Candle[] = [
      { timestamp: "2026-01-01T09:15:00.000Z", open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { timestamp: "2026-01-01T09:30:00.000Z", open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { timestamp: "2026-01-01T09:45:00.000Z", open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { timestamp: "2026-01-01T10:00:00.000Z", open: 100, high: 110, low: 100, close: 110, volume: 1000 },
      { timestamp: "2026-01-01T10:15:00.000Z", open: 100, high: 106, low: 99, close: 105, volume: 1000 }, // Enter bar 4
      { timestamp: "2026-01-01T10:30:00.000Z", open: 105, high: 122, low: 104, close: 120, volume: 1000 }, // Rises to 120
      { timestamp: "2026-01-01T10:45:00.000Z", open: 120, high: 121, low: 94, close: 95, volume: 1000 },   // Drops to 95
      { timestamp: "2026-01-01T11:00:00.000Z", open: 95, high: 101, low: 94, close: 100, volume: 1000 },   // Last bar
    ];

    const config: BacktestConfig = {
      ...baseConfig,
      feePct: 0,
      slippagePct: 0,
      stopLossPct: null,
      takeProfitPct: null,
      trailingStopPct: null,
    };

    const result = runClientBacktest(config, candles);

    // Bar 3: Flat cash equity
    expect(result.equityCurve[3].equity).toBe(100000);

    // Bar 4: Trade open, price rises from 100 to 105 => Equity rises
    expect(result.equityCurve[4].equity).toBeGreaterThan(100000);

    // Bar 5: Price rises further to 120 => Equity reaches peak
    expect(result.equityCurve[5].equity).toBeGreaterThan(result.equityCurve[4].equity);

    // Bar 6: Price drops to 95 => Equity falls below initial capital (unrealized loss)
    expect(result.equityCurve[6].equity).toBeLessThan(100000);

    // Max drawdown must be non-zero and calculated from peak at Bar 5 to trough at Bar 6
    expect(result.summary.maxDrawdownPct).toBeGreaterThan(0);
    expect(result.summary.maxDrawdownAmount).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 8. Phase 1 Data Layer Integration & Tagging Test
  // ---------------------------------------------------------------------------
  it("tags synthetic source metadata when synthetic candles are generated", () => {
    const result = runClientBacktest(baseConfig);
    expect(result.isSynthetic).toBe(true);
    expect(result.dataSource).toBe("SYNTHETIC");
    expect(result.summary.isSynthetic).toBe(true);
    expect(result.summary.dataSource).toBe("SYNTHETIC");
  });

  it("preserves real market data source when valid real candles are provided", () => {
    const realCandles: Candle[] = [
      { timestamp: "2026-01-01T09:15:00.000Z", open: 100, high: 105, low: 99, close: 102, volume: 5000, source: "KITE", isSynthetic: false },
      { timestamp: "2026-01-01T09:30:00.000Z", open: 102, high: 107, low: 101, close: 106, volume: 6000, source: "KITE", isSynthetic: false },
      { timestamp: "2026-01-01T09:45:00.000Z", open: 106, high: 108, low: 104, close: 105, volume: 5500, source: "KITE", isSynthetic: false },
    ];

    const result = runClientBacktest(baseConfig, realCandles);
    expect(result.isSynthetic).toBe(false);
    expect(result.dataSource).toBe("KITE");
    expect(result.summary.isSynthetic).toBe(false);
    expect(result.summary.dataSource).toBe("KITE");
  });

  it("closes any open position on the final bar with 'End of Backtest'", () => {
    // Trade entered at bar 4, no SL/TP triggered, price stays high so no exit crossover, ends at bar 5
    const candles: Candle[] = [
      { timestamp: "2026-01-01T09:15:00.000Z", open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { timestamp: "2026-01-01T09:30:00.000Z", open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { timestamp: "2026-01-01T09:45:00.000Z", open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { timestamp: "2026-01-01T10:00:00.000Z", open: 100, high: 110, low: 100, close: 110, volume: 1000 },
      { timestamp: "2026-01-01T10:15:00.000Z", open: 100, high: 115, low: 99, close: 112, volume: 1000 }, // Enter bar 4
      { timestamp: "2026-01-01T10:30:00.000Z", open: 112, high: 125, low: 110, close: 120, volume: 1000 }, // Final bar (price strong, stays above MA)
    ];

    const config: BacktestConfig = {
      ...baseConfig,
      stopLossPct: null,
      takeProfitPct: null,
      trailingStopPct: null,
    };

    const result = runClientBacktest(config, candles);
    expect(result.trades.length).toBe(1);
    expect(result.trades[0].exitReason).toBe("End of Backtest");
    expect(result.trades[0].exitTime).toBe("2026-01-01T10:30:00.000Z");
  });
});
