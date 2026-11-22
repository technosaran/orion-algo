import { describe, it, expect } from "vitest";
import { calculateSummary, StoredPaperState, DEFAULT_INITIAL_BALANCE } from "../paperTradingStorage";
import { PaperPosition } from "@/types/paperTrading";

describe("Paper Trading Calculations & Summary", () => {
  it("calculates live unrealized P&L and total equity for LONG positions", () => {
    const longPos: PaperPosition = {
      id: "pos-1",
      symbol: "RELIANCE",
      side: "LONG",
      quantity: 10,
      entryPrice: 1300,
      currentPrice: 1300,
      marginUsed: 13000,
      entryTime: Date.now(),
      unrealizedPnl: 0,
      unrealizedPnlPercent: 0,
    };

    const state: StoredPaperState = {
      initialBalance: DEFAULT_INITIAL_BALANCE,
      cashBalance: DEFAULT_INITIAL_BALANCE - 13000,
      positions: [longPos],
      orders: [],
      history: [],
      botLogs: [],
      botActive: false,
      botStrategyId: "rsi_mean_reversion",
      botSpeedSec: 3,
      botExecutionMode: "EQUITY",
      botMoneyness: "ATM",
      lastUpdated: Date.now(),
    };

    // Live quotes: RELIANCE moved from 1300 to 1350 (+50 per share * 10 = +500)
    const quotes = [{ symbol: "RELIANCE", price: 1350 }];

    const summary = calculateSummary(state, quotes);

    expect(summary.unrealizedPnl).toBe(500);
    expect(summary.marginUsed).toBe(13000);
    expect(summary.cashBalance).toBe(DEFAULT_INITIAL_BALANCE - 13000);
    expect(summary.totalEquity).toBe(DEFAULT_INITIAL_BALANCE + 500);
  });

  it("calculates live unrealized P&L and total equity for SHORT positions", () => {
    const shortPos: PaperPosition = {
      id: "pos-2",
      symbol: "NIFTY50",
      side: "SHORT",
      quantity: 65,
      entryPrice: 25000,
      currentPrice: 25000,
      marginUsed: 162500, // 10% SPAN margin
      entryTime: Date.now(),
      unrealizedPnl: 0,
      unrealizedPnlPercent: 0,
    };

    const state: StoredPaperState = {
      initialBalance: DEFAULT_INITIAL_BALANCE,
      cashBalance: DEFAULT_INITIAL_BALANCE - 162500,
      positions: [shortPos],
      orders: [],
      history: [],
      botLogs: [],
      botActive: false,
      botStrategyId: "rsi_mean_reversion",
      botSpeedSec: 3,
      botExecutionMode: "EQUITY",
      botMoneyness: "ATM",
      lastUpdated: Date.now(),
    };

    // Live quotes: NIFTY dropped from 25000 to 24900 (SHORT gain: 100 * 65 = +6500)
    const quotes = [{ symbol: "NIFTY50", price: 24900 }];

    const summary = calculateSummary(state, quotes);

    expect(summary.unrealizedPnl).toBe(6500);
    expect(summary.marginUsed).toBe(162500);
    expect(summary.totalEquity).toBe(DEFAULT_INITIAL_BALANCE + 6500);
  });

  it("calculates live negative P&L when market moves against SHORT position", () => {
    const shortPos: PaperPosition = {
      id: "pos-3",
      symbol: "NIFTY50",
      side: "SHORT",
      quantity: 65,
      entryPrice: 25000,
      currentPrice: 25000,
      marginUsed: 162500,
      entryTime: Date.now(),
      unrealizedPnl: 0,
      unrealizedPnlPercent: 0,
    };

    const state: StoredPaperState = {
      initialBalance: DEFAULT_INITIAL_BALANCE,
      cashBalance: DEFAULT_INITIAL_BALANCE - 162500,
      positions: [shortPos],
      orders: [],
      history: [],
      botLogs: [],
      botActive: false,
      botStrategyId: "rsi_mean_reversion",
      botSpeedSec: 3,
      botExecutionMode: "EQUITY",
      botMoneyness: "ATM",
      lastUpdated: Date.now(),
    };

    // NIFTY rose to 25100 (SHORT loss: -100 * 65 = -6500)
    const quotes = [{ symbol: "NIFTY50", price: 25100 }];

    const summary = calculateSummary(state, quotes);

    expect(summary.unrealizedPnl).toBe(-6500);
    expect(summary.totalEquity).toBe(DEFAULT_INITIAL_BALANCE - 6500);
  });
});
