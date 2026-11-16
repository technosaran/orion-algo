import { describe, it, expect } from "vitest";
import {
  calculateOrderCost,
  calculateRoundTripCosts,
  calculateLotSize,
  calculatePositionQuantity,
  INDIAN_MARKET_TARIFFS,
  INDEX_LOT_SIZES,
  roundTo,
} from "../costConfig";

describe("Indian Market Statutory Cost & Position Sizing Configuration", () => {
  // =========================================================================
  // 1. Brokerage: Flat ₹20 vs 0.03% Cap
  // =========================================================================
  describe("Brokerage Tariff Calculation", () => {
    it("should charge 0.03% when turnover is low (less than ₹20 cap)", () => {
      // Turnover = ₹10,000. 0.03% = ₹3.00, which is < ₹20 cap
      const cost = calculateOrderCost({
        price: 100,
        quantity: 100,
        side: "BUY",
        segment: "EQUITY",
        productType: "MIS",
      });

      expect(cost.turnover).toBe(10000);
      expect(cost.brokerage).toBe(3); // ₹3.00
    });

    it("should cap brokerage at flat ₹20 when turnover is high", () => {
      // Turnover = ₹100,000. 0.03% = ₹30.00, which is > ₹20 cap -> ₹20
      const cost = calculateOrderCost({
        price: 1000,
        quantity: 100,
        side: "BUY",
        segment: "EQUITY",
        productType: "MIS",
      });

      expect(cost.turnover).toBe(100000);
      expect(cost.brokerage).toBe(20); // Flat ₹20 cap
    });

    it("should charge ₹20 at exact crossover turnover threshold", () => {
      // Turnover of ₹66,666.67 * 0.03% = ₹20.00
      const costBelow = calculateOrderCost({
        price: 500,
        quantity: 100, // Turnover ₹50,000 -> 0.03% = ₹15.00
        side: "BUY",
        segment: "EQUITY",
        productType: "MIS",
      });
      expect(costBelow.brokerage).toBe(15);

      const costAbove = calculateOrderCost({
        price: 800,
        quantity: 100, // Turnover ₹80,000 -> 0.03% = ₹24.00 -> ₹20
        side: "BUY",
        segment: "EQUITY",
        productType: "MIS",
      });
      expect(costAbove.brokerage).toBe(20);
    });

    it("should charge ₹0 brokerage for Equity Delivery (CNC)", () => {
      const cost = calculateOrderCost({
        price: 2500,
        quantity: 100, // Turnover ₹250,000
        side: "BUY",
        segment: "EQUITY",
        productType: "CNC",
      });

      expect(cost.turnover).toBe(250000);
      expect(cost.brokerage).toBe(0); // Zerodha zero brokerage for delivery
    });

    it("should charge flat ₹20 for Futures (NFO) orders", () => {
      const cost = calculateOrderCost({
        price: 24000,
        quantity: 65, // Turnover ₹1,560,000
        side: "BUY",
        segment: "FUTURES",
        productType: "NRML",
      });

      expect(cost.brokerage).toBe(20);
    });

    it("should charge flat ₹20 for Options (NFO) orders", () => {
      const cost = calculateOrderCost({
        price: 150,
        quantity: 65, // Premium turnover ₹9,750
        side: "BUY",
        segment: "OPTIONS",
        productType: "MIS",
      });

      expect(cost.brokerage).toBe(20);
    });

    it("should support custom brokerage override and feePct", () => {
      const overrideCost = calculateOrderCost({
        price: 1000,
        quantity: 100,
        side: "BUY",
        brokerageOverride: 15,
      });
      expect(overrideCost.brokerage).toBe(15);

      const customFeePctCost = calculateOrderCost({
        price: 1000,
        quantity: 100, // Turnover ₹100,000
        side: "BUY",
        feePct: 0.05, // 0.05% = ₹50
      });
      expect(customFeePctCost.brokerage).toBe(50);
    });
  });

  // =========================================================================
  // 2. STT (Securities Transaction Tax)
  // =========================================================================
  describe("STT (Securities Transaction Tax) Rules", () => {
    it("should apply 0.025% STT only to SELL side for Equity Intraday (MIS)", () => {
      const buyCost = calculateOrderCost({
        price: 1000,
        quantity: 100, // Turnover ₹100,000
        side: "BUY",
        segment: "EQUITY",
        productType: "MIS",
      });
      expect(buyCost.stt).toBe(0); // 0% on Buy side for intraday

      const sellCost = calculateOrderCost({
        price: 1000,
        quantity: 100, // Turnover ₹100,000
        side: "SELL",
        segment: "EQUITY",
        productType: "MIS",
      });
      // 0.025% of ₹100,000 = ₹25.00
      expect(sellCost.stt).toBe(25);
    });

    it("should apply 0.1% STT to BOTH BUY and SELL sides for Equity Delivery (CNC)", () => {
      const buyCost = calculateOrderCost({
        price: 1000,
        quantity: 100, // Turnover ₹100,000
        side: "BUY",
        segment: "EQUITY",
        productType: "CNC",
      });
      // 0.1% of ₹100,000 = ₹100.00
      expect(buyCost.stt).toBe(100);

      const sellCost = calculateOrderCost({
        price: 1000,
        quantity: 100, // Turnover ₹100,000
        side: "SELL",
        segment: "EQUITY",
        productType: "CNC",
      });
      // 0.1% of ₹100,000 = ₹100.00
      expect(sellCost.stt).toBe(100);
    });

    it("should apply 0.02% STT only to SELL side for Futures", () => {
      const buyCost = calculateOrderCost({
        price: 24000,
        quantity: 65, // Turnover ₹1,560,000
        side: "BUY",
        segment: "FUTURES",
      });
      expect(buyCost.stt).toBe(0); // 0% on Buy side

      const sellCost = calculateOrderCost({
        price: 24000,
        quantity: 65, // Turnover ₹1,560,000
        side: "SELL",
        segment: "FUTURES",
      });
      // 0.02% of ₹1,560,000 = ₹312.00
      expect(sellCost.stt).toBe(312);
    });

    it("should apply 0.0625% STT only to SELL side on Options premium turnover", () => {
      const buyCost = calculateOrderCost({
        price: 200,
        quantity: 65, // Premium Turnover ₹13,000
        side: "BUY",
        segment: "OPTIONS",
      });
      expect(buyCost.stt).toBe(0);

      const sellCost = calculateOrderCost({
        price: 200,
        quantity: 65, // Premium Turnover ₹13,000
        side: "SELL",
        segment: "OPTIONS",
      });
      // 0.0625% of ₹13,000 = ₹8.125 -> ₹8.13 rounded
      expect(sellCost.stt).toBe(8.13);
    });

    it("should apply 0.125% STT when an option is exercised", () => {
      const exercisedCost = calculateOrderCost({
        price: 500, // Intrinsic value
        quantity: 65, // Turnover ₹32,500
        side: "SELL",
        segment: "OPTIONS",
        isExercisedOption: true,
      });
      // 0.125% of ₹32,500 = ₹40.625 -> ₹40.63
      expect(exercisedCost.stt).toBe(40.63);
    });
  });

  // =========================================================================
  // 3. Stamp Duty (Indian Stamp Act, 2019 - Buy side only)
  // =========================================================================
  describe("Stamp Duty Rules (Buy Side Only)", () => {
    it("should apply 0.003% Stamp Duty only on BUY side for Equity Intraday (MIS)", () => {
      const buyCost = calculateOrderCost({
        price: 1000,
        quantity: 100, // Turnover ₹100,000
        side: "BUY",
        segment: "EQUITY",
        productType: "MIS",
      });
      // 0.003% of ₹100,000 = ₹3.00
      expect(buyCost.stampDuty).toBe(3);

      const sellCost = calculateOrderCost({
        price: 1000,
        quantity: 100,
        side: "SELL",
        segment: "EQUITY",
        productType: "MIS",
      });
      expect(sellCost.stampDuty).toBe(0); // Always 0 on Sell
    });

    it("should apply 0.015% Stamp Duty only on BUY side for Equity Delivery (CNC)", () => {
      const buyCost = calculateOrderCost({
        price: 1000,
        quantity: 100, // Turnover ₹100,000
        side: "BUY",
        segment: "EQUITY",
        productType: "CNC",
      });
      // 0.015% of ₹100,000 = ₹15.00
      expect(buyCost.stampDuty).toBe(15);

      const sellCost = calculateOrderCost({
        price: 1000,
        quantity: 100,
        side: "SELL",
        segment: "EQUITY",
        productType: "CNC",
      });
      expect(sellCost.stampDuty).toBe(0);
    });

    it("should apply 0.002% Stamp Duty only on BUY side for Futures", () => {
      const buyCost = calculateOrderCost({
        price: 24000,
        quantity: 65, // Turnover ₹1,560,000
        side: "BUY",
        segment: "FUTURES",
      });
      // 0.002% of ₹1,560,000 = ₹31.20
      expect(buyCost.stampDuty).toBe(31.2);

      const sellCost = calculateOrderCost({
        price: 24000,
        quantity: 65,
        side: "SELL",
        segment: "FUTURES",
      });
      expect(sellCost.stampDuty).toBe(0);
    });

    it("should apply 0.003% Stamp Duty only on BUY side for Options", () => {
      const buyCost = calculateOrderCost({
        price: 200,
        quantity: 65, // Premium turnover ₹13,000
        side: "BUY",
        segment: "OPTIONS",
      });
      // 0.003% of ₹13,000 = ₹0.39
      expect(buyCost.stampDuty).toBe(0.39);

      const sellCost = calculateOrderCost({
        price: 200,
        quantity: 65,
        side: "SELL",
        segment: "OPTIONS",
      });
      expect(sellCost.stampDuty).toBe(0);
    });
  });

  // =========================================================================
  // 4. GST: 18% of (Brokerage + Exchange + SEBI Charges)
  // =========================================================================
  describe("GST Calculation Rules", () => {
    it("should calculate GST as exactly 18% of (Brokerage + Exchange + SEBI)", () => {
      const cost = calculateOrderCost({
        price: 1000,
        quantity: 100, // Turnover ₹100,000
        side: "BUY",
        segment: "EQUITY",
        productType: "MIS",
      });

      expect(cost.brokerage).toBe(20); // ₹20
      expect(cost.exchangeCharges).toBe(2.97); // 0.00297% of 100,000 = ₹2.97
      expect(cost.sebiCharges).toBe(0.1); // 0.0001% of 100,000 = ₹0.10

      const taxableBase = cost.brokerage + cost.exchangeCharges + cost.sebiCharges;
      expect(taxableBase).toBe(23.07);

      // 18% of 23.07 = 4.1526 -> ₹4.15
      expect(cost.gst).toBe(4.15);
      expect(cost.gst).toBe(roundTo(taxableBase * 0.18, 2));
    });

    it("should never include STT or Stamp Duty in GST taxable base", () => {
      const cncBuyCost = calculateOrderCost({
        price: 1000,
        quantity: 100, // Turnover ₹100,000
        side: "BUY",
        segment: "EQUITY",
        productType: "CNC",
      });

      // CNC Brokerage = 0, STT = 100, Stamp = 15, Exchange = 2.97, SEBI = 0.10
      expect(cncBuyCost.brokerage).toBe(0);
      expect(cncBuyCost.stt).toBe(100);
      expect(cncBuyCost.stampDuty).toBe(15);
      expect(cncBuyCost.exchangeCharges).toBe(2.97);
      expect(cncBuyCost.sebiCharges).toBe(0.1);

      // Taxable base should ONLY be exchange + SEBI = 3.07 (NOT including 100 STT or 15 Stamp)
      const expectedTaxableBase = roundTo(
        cncBuyCost.brokerage + cncBuyCost.exchangeCharges + cncBuyCost.sebiCharges,
        2
      );
      expect(expectedTaxableBase).toBe(3.07);
      // 18% of 3.07 = 0.5526 -> ₹0.55
      expect(cncBuyCost.gst).toBe(0.55);
    });

    it("should calculate GST on Futures with flat ₹20 brokerage", () => {
      const futCost = calculateOrderCost({
        price: 24000,
        quantity: 65, // Turnover ₹1,560,000
        side: "SELL",
        segment: "FUTURES",
      });

      // Brokerage = 20
      // Exchange = 1,560,000 * 0.0000173 = 26.988 -> 26.99
      // SEBI = 1,560,000 * 0.000001 = 1.56
      // Base = 20 + 26.99 + 1.56 = 48.55
      // GST = 48.55 * 0.18 = 8.739 -> 8.74
      expect(futCost.brokerage).toBe(20);
      expect(futCost.exchangeCharges).toBe(26.99);
      expect(futCost.sebiCharges).toBe(1.56);
      expect(futCost.gst).toBe(8.74);
    });
  });

  // =========================================================================
  // 5. Slippage and Total Cost
  // =========================================================================
  describe("Slippage and Total Cost Breakdown", () => {
    it("should default slippage to 0.05% of turnover", () => {
      const cost = calculateOrderCost({
        price: 1000,
        quantity: 100, // Turnover ₹100,000
        side: "BUY",
      });

      // 0.05% of 100,000 = ₹50.00
      expect(cost.slippage).toBe(50);
      expect(cost.totalCost).toBe(roundTo(cost.totalCharges + cost.slippage, 2));
    });

    it("should allow configurable slippagePct or 0% slippage", () => {
      const zeroSlippage = calculateOrderCost({
        price: 1000,
        quantity: 100,
        side: "BUY",
        slippagePct: 0,
      });
      expect(zeroSlippage.slippage).toBe(0);
      expect(zeroSlippage.totalCost).toBe(zeroSlippage.totalCharges);

      const highSlippage = calculateOrderCost({
        price: 1000,
        quantity: 100,
        side: "BUY",
        slippagePct: 0.1, // 0.1% = ₹100
      });
      expect(highSlippage.slippage).toBe(100);
    });

    it("should sum statutoryCharges and totalCharges accurately", () => {
      const cost = calculateOrderCost({
        price: 1000,
        quantity: 100,
        side: "BUY",
        segment: "EQUITY",
        productType: "MIS",
      });

      const calculatedStatutory = roundTo(
        cost.stt + cost.exchangeCharges + cost.sebiCharges + cost.stampDuty + cost.gst,
        2
      );
      expect(cost.statutoryCharges).toBe(calculatedStatutory);
      expect(cost.totalCharges).toBe(roundTo(cost.brokerage + cost.statutoryCharges, 2));
      expect(cost.totalCost).toBe(roundTo(cost.totalCharges + cost.slippage, 2));
    });
  });

  // =========================================================================
  // 6. Round-Trip Cost Calculations
  // =========================================================================
  describe("Round-Trip Cost Calculations", () => {
    it("should calculate complete round-trip costs for Long Intraday equity trade", () => {
      // Enter BUY 100 shares @ ₹1,000, Exit SELL 100 shares @ ₹1,050
      const rt = calculateRoundTripCosts(1000, 1050, 100, "EQUITY", "MIS");

      expect(rt.totalTurnover).toBe(205000); // 100,000 + 105,000

      // Entry: Buy side Stamp Duty applies (₹3.00), STT = 0
      expect(rt.entryCost.stampDuty).toBe(3);
      expect(rt.entryCost.stt).toBe(0);

      // Exit: Sell side STT applies (0.025% of 105,000 = ₹26.25), Stamp Duty = 0
      expect(rt.exitCost.stampDuty).toBe(0);
      expect(rt.exitCost.stt).toBe(26.25);

      // Brokerage: ₹20 + ₹20 = ₹40
      expect(rt.totalBrokerage).toBe(40);
      expect(rt.totalStt).toBe(26.25);
      expect(rt.totalStampDuty).toBe(3);

      // Slippage: 0.05% on 100,000 (50) + 0.05% on 105,000 (52.50) = 102.50
      expect(rt.totalSlippage).toBe(102.5);

      // Gross P&L: (1,050 - 1,000) * 100 = ₹5,000
      expect(rt.grossPnl).toBe(5000);

      // Net P&L: Gross P&L - totalCost
      expect(rt.netPnl).toBe(roundTo(5000 - rt.totalCost, 2));

      // Breakeven points: totalCost / 100
      expect(rt.breakevenPoints).toBe(roundTo(rt.totalCost / 100, 2));
      expect(rt.breakevenPoints).toBeGreaterThan(1); // Usually ~₹1.80 to ₹2.00 per share
    });

    it("should calculate round-trip for Delivery (CNC) with STT on both legs and ₹0 brokerage", () => {
      const rt = calculateRoundTripCosts(2000, 2100, 50, "EQUITY", "CNC");

      expect(rt.totalBrokerage).toBe(0); // ₹0 Zerodha delivery brokerage
      // Entry STT: 0.1% on 100,000 = ₹100
      // Exit STT: 0.1% on 105,000 = ₹105
      expect(rt.totalStt).toBe(205);
      // Entry Stamp: 0.015% on 100,000 = ₹15, Exit Stamp = 0
      expect(rt.totalStampDuty).toBe(15);
    });

    it("should calculate Short trade round-trip (Sell entry, Buy exit)", () => {
      // Short entry @ 1,050, cover exit @ 1,000 (profitable short)
      const rt = calculateRoundTripCosts(
        1050,
        1000,
        100,
        "EQUITY",
        "MIS",
        undefined,
        undefined,
        { isShort: true }
      );

      // Entry side was SELL -> STT charged on entry, Stamp duty 0
      expect(rt.entryCost.stt).toBe(26.25);
      expect(rt.entryCost.stampDuty).toBe(0);

      // Exit side was BUY -> Stamp duty charged on exit, STT 0
      expect(rt.exitCost.stt).toBe(0);
      expect(rt.exitCost.stampDuty).toBe(3);

      // Gross P&L for short: (1,050 - 1,000) * 100 = ₹5,000
      expect(rt.grossPnl).toBe(5000);
      expect(rt.netPnl).toBe(roundTo(5000 - rt.totalCost, 2));
    });
  });

  // =========================================================================
  // 7. Lot Size Lookup
  // =========================================================================
  describe("Lot Size Lookup (calculateLotSize)", () => {
    it("should return correct lot size for NIFTY (65)", () => {
      expect(calculateLotSize("NIFTY")).toBe(65);
      expect(calculateLotSize("NIFTY 50")).toBe(65);
      expect(calculateLotSize("NIFTY50")).toBe(65);
      expect(calculateLotSize("NSE:NIFTY")).toBe(65);
      expect(calculateLotSize("NIFTY24NOV24000CE")).toBe(65);
      expect(calculateLotSize("NIFTYFUT")).toBe(65);
    });

    it("should return correct lot size for BANKNIFTY (30)", () => {
      expect(calculateLotSize("BANKNIFTY")).toBe(30);
      expect(calculateLotSize("BANK NIFTY")).toBe(30);
      expect(calculateLotSize("NIFTY BANK")).toBe(30);
      expect(calculateLotSize("NSE:BANKNIFTY")).toBe(30);
      expect(calculateLotSize("BANKNIFTY24DEC50000PE")).toBe(30);
    });

    it("should return correct lot size for SENSEX (10)", () => {
      expect(calculateLotSize("SENSEX")).toBe(10);
      expect(calculateLotSize("BSE:SENSEX")).toBe(10);
      expect(calculateLotSize("BSESENSEX")).toBe(10);
      expect(calculateLotSize("SENSEXFUT")).toBe(10);
    });

    it("should return correct lot size for FINNIFTY (65)", () => {
      expect(calculateLotSize("FINNIFTY")).toBe(65);
      expect(calculateLotSize("NIFTY FIN SERVICE")).toBe(65);
      expect(calculateLotSize("FIN NIFTY")).toBe(65);
    });

    it("should return correct lot size for MIDCPNIFTY (120)", () => {
      expect(calculateLotSize("MIDCPNIFTY")).toBe(120);
      expect(calculateLotSize("NIFTY MIDCAP")).toBe(120);
    });

    it("should default to 1 for individual cash equities and unknown symbols", () => {
      expect(calculateLotSize("RELIANCE")).toBe(1);
      expect(calculateLotSize("TCS")).toBe(1);
      expect(calculateLotSize("INFY")).toBe(1);
      expect(calculateLotSize("HDFCBANK")).toBe(1);
      expect(calculateLotSize("NSE:SBIN")).toBe(1);
      expect(calculateLotSize("")).toBe(1);
    });
  });

  // =========================================================================
  // 8. Position Sizing with Leverage & Integer Lot Quantization
  // =========================================================================
  describe("Position Sizing with Leverage and Lot Quantization", () => {
    it("should size equity positions with percentage of capital and leverage", () => {
      // Capital: ₹100,000, Price: ₹2,500, Lot size: 1, 50% allocation, Leverage: 1
      const size1 = calculatePositionQuantity(
        100000,
        2500,
        1,
        "PERCENT_OF_CAPITAL",
        50,
        1
      );
      // 50% of 100,000 = 50,000 -> 50,000 / 2,500 = 20 shares
      expect(size1.quantity).toBe(20);
      expect(size1.lots).toBe(20);
      expect(size1.allocatedCapital).toBe(50000);

      // Now with 5x Intraday Leverage
      const size5x = calculatePositionQuantity(
        100000,
        2500,
        1,
        "PERCENT_OF_CAPITAL",
        50,
        5
      );
      // Margin 50,000 * 5x = 250,000 purchasing power -> 250,000 / 2,500 = 100 shares
      expect(size5x.quantity).toBe(100);
      expect(size5x.lots).toBe(100);
      expect(size5x.allocatedCapital).toBe(50000); // Actual margin used = (100 * 2500) / 5 = 50,000
    });

    it("should quantize positions to integer lots for NIFTY derivatives (lot size = 65)", () => {
      // Price = 24,000, Lot size = 65 -> 1 lot exposure = 65 * 24,000 = 1,560,000
      // With leverage = 5: Margin per lot = 1,560,000 / 5 = 312,000
      // Capital = 500,000. 100% allocation -> can afford floor(500,000 / 312,000) = 1 lot!
      const pos = calculatePositionQuantity(
        500000,
        24000,
        65,
        "PERCENT_OF_CAPITAL",
        100,
        5
      );

      expect(pos.lots).toBe(1);
      expect(pos.quantity).toBe(65);
      expect(pos.allocatedCapital).toBe(312000); // (65 * 24000) / 5 = 312,000
    });

    it("should return 0 lots if capital is insufficient for even 1 lot", () => {
      // Capital = 200,000, Margin per lot = 312,000
      const pos = calculatePositionQuantity(
        200000,
        24000,
        65,
        "PERCENT_OF_CAPITAL",
        100,
        5
      );

      expect(pos.lots).toBe(0);
      expect(pos.quantity).toBe(0);
      expect(pos.allocatedCapital).toBe(0);
    });

    it("should size SENSEX with lot size 10 accurately", () => {
      // Price = 80,000, Lot size = 10 -> Exposure per lot = 800,000
      // Leverage = 5 -> Margin per lot = 160,000
      // Capital = 500,000 -> floor(500,000 / 160,000) = 3 lots
      const pos = calculatePositionQuantity(
        500000,
        80000,
        10,
        "PERCENT_OF_CAPITAL",
        100,
        5
      );

      expect(pos.lots).toBe(3);
      expect(pos.quantity).toBe(30);
      expect(pos.allocatedCapital).toBe(480000); // 3 * 160,000
    });

    it("should support FIXED_LOTS sizing capped by capital", () => {
      // Capital allows 2 lots (margin per lot = 312,000; 2 lots = 624,000 <= 700,000)
      const allowedPos = calculatePositionQuantity(
        700000,
        24000,
        65,
        "FIXED_LOTS",
        2,
        5
      );
      expect(allowedPos.lots).toBe(2);
      expect(allowedPos.quantity).toBe(130);
      expect(allowedPos.allocatedCapital).toBe(624000);

      // User requests 5 lots, but capital only allows 2 lots
      const cappedPos = calculatePositionQuantity(
        700000,
        24000,
        65,
        "FIXED_LOTS",
        5,
        5
      );
      expect(cappedPos.lots).toBe(2); // Capped by capital
      expect(cappedPos.quantity).toBe(130);
      expect(cappedPos.allocatedCapital).toBe(624000);
    });

    it("should support FIXED_QUANTITY sizing quantized to lot size", () => {
      // Request 150 shares of Nifty (lot size = 65) -> quantized to 2 lots = 130 shares
      const pos = calculatePositionQuantity(
        1000000,
        24000,
        65,
        "FIXED_QUANTITY",
        150,
        5
      );
      expect(pos.lots).toBe(2);
      expect(pos.quantity).toBe(130);
    });

    it("should handle edge cases (0 capital, 0 price, negative values) gracefully", () => {
      expect(calculatePositionQuantity(0, 100, 1, "PERCENT_OF_CAPITAL", 50, 1)).toEqual({
        quantity: 0,
        lots: 0,
        allocatedCapital: 0,
      });

      expect(calculatePositionQuantity(100000, 0, 1, "PERCENT_OF_CAPITAL", 50, 1)).toEqual({
        quantity: 0,
        lots: 0,
        allocatedCapital: 0,
      });

      expect(calculatePositionQuantity(-10000, 100, 1, "PERCENT_OF_CAPITAL", 50, 1)).toEqual({
        quantity: 0,
        lots: 0,
        allocatedCapital: 0,
      });
    });
  });
});
