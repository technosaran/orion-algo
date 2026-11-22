import { describe, it, expect } from "vitest";
import {
  resolveUnderlyingParams,
  getUpcomingExpiryDate,
  selectOptionContract,
} from "@/lib/optionsAlgoHelper";

describe("optionsAlgoHelper", () => {
  it("resolves updated SEBI lot sizes for NIFTY 50 and SENSEX", () => {
    const nifty = resolveUnderlyingParams("NIFTY50", 24500);
    expect(nifty.lotSize).toBe(75);
    expect(nifty.step).toBe(50);

    const sensex = resolveUnderlyingParams("SENSEX", 80000);
    expect(sensex.lotSize).toBe(20);
    expect(sensex.step).toBe(100);
  });

  it("selects correct ATM Call option contract for NIFTY bullish signal", () => {
    const contract = selectOptionContract({
      underlying: "NIFTY50",
      spotPrice: 24520,
      signalDirection: "BULLISH",
      executionMode: "OPTION_BUYING",
      moneyness: "ATM",
      cashBalance: 200000,
    });

    expect(contract.strikePrice).toBe(24500); // 50-point step
    expect(contract.optionType).toBe("CE");
    expect(contract.action).toBe("BUY");
    expect(contract.lotSize).toBe(75);
    expect(contract.stopLossPrice).toBeLessThan(contract.estimatedPremium);
    expect(contract.takeProfitPrice).toBeGreaterThan(contract.estimatedPremium);
  });

  it("selects correct ATM Put option contract for BANKNIFTY bearish signal", () => {
    const contract = selectOptionContract({
      underlying: "BANKNIFTY",
      spotPrice: 51240,
      signalDirection: "BEARISH",
      executionMode: "OPTION_BUYING",
      moneyness: "ATM",
      cashBalance: 300000,
    });

    expect(contract.strikePrice).toBe(51200); // 100-point step
    expect(contract.optionType).toBe("PE");
    expect(contract.action).toBe("BUY");
    expect(contract.lotSize).toBe(30);
  });

  it("calculates 0-DTE expiry date when target day matches current day", () => {
    const d = new Date();
    const todayDay = d.getDay();
    const expiryStr = getUpcomingExpiryDate(todayDay);
    const dayNum = String(d.getDate()).padStart(2, "0");
    expect(expiryStr.startsWith(dayNum)).toBe(true);
  });
});
