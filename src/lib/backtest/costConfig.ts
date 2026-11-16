/**
 * Indian Market Statutory Cost & Position Sizing Configuration for AlgoX
 * Single Source of Truth for Brokerage, Taxes, Regulatory Levies & Lot Sizing
 *
 * Statutory References & Published Sources:
 * 1. Brokerage Tariff:
 *    - Source: Zerodha Securities Pvt. Ltd. Official Tariff Sheet
 *      (Reference: https://zerodha.com/charges/#tab-equities)
 *    - Equity Intraday (MIS): Flat ₹20 per executed order or 0.03% of turnover, whichever is lower.
 *    - Equity Delivery (CNC): ₹0 brokerage.
 *    - Equity Futures (NFO): Flat ₹20 per executed order.
 *    - Equity Options (NFO): Flat ₹20 per executed order.
 *
 * 2. Securities Transaction Tax (STT):
 *    - Source: Chapter VII of Finance (No. 2) Act, 2004; amended via Finance (No. 2) Act, 2024
 *      (effective from October 1, 2024, Gazette Notification).
 *    - Equity Intraday (MIS): 0.025% on SELL side only.
 *    - Equity Delivery (CNC): 0.1% on both BUY and SELL sides.
 *    - Futures: 0.02% on SELL side only (revised Oct 2024).
 *    - Options: 0.0625% on SELL side on premium turnover (0.125% on intrinsic value when exercised).
 *
 * 3. Exchange Transaction Charges (NSE):
 *    - Source: NSE Circular NSE/INSP/49727 and revised transaction fee schedule circulars.
 *    - Equity Cash: 0.00297% of turnover.
 *    - Equity Futures: 0.00173% of turnover.
 *    - Equity Options: 0.03503% of premium turnover.
 *
 * 4. SEBI Turnover Charges:
 *    - Source: SEBI (Payment of Fees) (Amendment) Regulations, 2021 (Gazette SEBI/LAD-NRO/GN/2021/04).
 *    - Standard: ₹10 per crore (0.0001% of turnover) across all segments on both BUY and SELL.
 *
 * 5. Stamp Duty:
 *    - Source: Indian Stamp Act, 1899 amended via Finance Act, 2019 & Indian Stamp Rules (effective July 1, 2020).
 *    - Standard: Applied strictly on BUY side only (0% on Sell side across all segments).
 *    - Equity Intraday (MIS): 0.003% on BUY side.
 *    - Equity Delivery (CNC): 0.015% on BUY side.
 *    - Futures: 0.002% on BUY side.
 *    - Options: 0.003% on BUY side.
 *
 * 6. Goods & Services Tax (GST):
 *    - Source: Central Goods & Services Tax (CGST) Act, 2017 & IGST Act, 2017 (SAC 997152).
 *    - Rate: 18% on (Brokerage + Exchange Transaction Charges + SEBI Turnover Charges).
 *    - Note: STT and Stamp Duty are sovereign taxes and do NOT attract GST.
 *
 * 7. Default Slippage:
 *    - 0.05% of order value (configurable per backtest run).
 */

// ==========================================
// Types and Interfaces
// ==========================================

export type MarketSegment = "EQUITY" | "FUTURES" | "OPTIONS";
export type ProductType = "MIS" | "CNC" | "NRML";
export type OrderSide = "BUY" | "SELL";

export type PositionSizingType =
  | "PERCENT_OF_CAPITAL"
  | "PERCENT_OF_EQUITY"
  | "PERCENT"
  | "PERCENTAGE"
  | "FIXED_CAPITAL"
  | "FIXED_AMOUNT"
  | "CAPITAL"
  | "AMOUNT"
  | "FIXED_LOTS"
  | "LOTS"
  | "FIXED_QUANTITY"
  | "FIXED_UNITS"
  | "QUANTITY"
  | "UNITS";

export interface OrderCostParams {
  price: number;
  quantity: number;
  side: OrderSide;
  segment?: MarketSegment;
  productType?: ProductType;
  feePct?: number; // Custom percentage fee override if specified
  slippagePct?: number; // Default 0.05%
  isExercisedOption?: boolean; // For options STT on intrinsic value
  brokerageOverride?: number; // Custom flat brokerage override
  round?: boolean; // Default true (rounds financial line items to 2 decimal places)
}

export interface OrderCostBreakdown {
  turnover: number;
  brokerage: number;
  stt: number;
  exchangeCharges: number;
  sebiCharges: number;
  stampDuty: number;
  gst: number;
  slippage: number;
  statutoryCharges: number; // stt + exchangeCharges + sebiCharges + stampDuty + gst
  totalCharges: number; // brokerage + statutoryCharges
  totalCost: number; // totalCharges + slippage
  effectiveRatePct: number; // (totalCost / turnover) * 100
}

export interface RoundTripCostBreakdown {
  entryCost: OrderCostBreakdown;
  exitCost: OrderCostBreakdown;
  totalTurnover: number;
  totalBrokerage: number;
  totalStt: number;
  totalExchangeCharges: number;
  totalSebiCharges: number;
  totalStampDuty: number;
  totalGst: number;
  totalSlippage: number;
  totalStatutoryCharges: number;
  totalCharges: number;
  totalCost: number;
  breakevenPoints: number; // Price difference needed per unit to cover total costs
  breakevenPct: number; // Breakeven points as percentage of entry price
  grossPnl: number;
  netPnl: number;
}

export interface PositionQuantityResult {
  quantity: number;
  lots: number;
  allocatedCapital: number;
}

// ==========================================
// Statutory Statutory & Tariff Constants
// ==========================================

export const INDIAN_MARKET_TARIFFS = {
  // Brokerage rates
  BROKERAGE: {
    EQUITY_MIS_FLAT: 20,
    EQUITY_MIS_RATE: 0.0003, // 0.03%
    EQUITY_CNC: 0,
    FUTURES_FLAT: 20,
    OPTIONS_FLAT: 20,
  },
  // STT rates
  STT: {
    EQUITY_MIS_SELL: 0.00025, // 0.025% on sell side only
    EQUITY_CNC_BUY: 0.001, // 0.1% on buy side
    EQUITY_CNC_SELL: 0.001, // 0.1% on sell side
    FUTURES_SELL: 0.0002, // 0.02% on sell side
    OPTIONS_SELL_PREMIUM: 0.000625, // 0.0625% on sell premium
    OPTIONS_EXERCISED_INTRINSIC: 0.00125, // 0.125% on intrinsic value
  },
  // Exchange transaction charges (NSE)
  EXCHANGE: {
    EQUITY: 0.0000297, // 0.00297%
    FUTURES: 0.0000173, // 0.00173%
    OPTIONS: 0.0003503, // 0.03503% on premium
  },
  // SEBI turnover charges across all segments (₹10 per crore)
  SEBI: {
    TURNOVER_RATE: 0.000001, // 0.0001%
  },
  // Stamp duty (Indian Stamp Act, 2019 - Buy side only)
  STAMP_DUTY: {
    EQUITY_MIS_BUY: 0.00003, // 0.003%
    EQUITY_CNC_BUY: 0.00015, // 0.015%
    FUTURES_BUY: 0.00002, // 0.002%
    OPTIONS_BUY: 0.00003, // 0.003%
  },
  // GST rate
  GST_RATE: 0.18, // 18%
  // Default slippage rate
  DEFAULT_SLIPPAGE_PCT: 0.05, // 0.05%
} as const;

/**
 * Standard Lot Sizes for Indian Indices and Derivatives
 * Reflects November 2024 SEBI / Exchange revised contract sizes:
 * NIFTY: 65 (revised from 50/25)
 * BANKNIFTY: 30 (revised from 15)
 * SENSEX: 10 (revised from 10)
 * FINNIFTY: 65 (revised from 25/40)
 * MIDCPNIFTY: 120
 * Stocks: 1 (Cash equity)
 */
export const INDEX_LOT_SIZES: Record<string, number> = {
  NIFTY: 65,
  BANKNIFTY: 30,
  SENSEX: 10,
  FINNIFTY: 65,
  MIDCPNIFTY: 120,
  BANKEX: 15,
};

// ==========================================
// Helper Utility Functions
// ==========================================

/**
 * Cleanly rounds a number to a specified number of decimal places
 * Default 2 decimals for currency paise representation
 */
export function roundTo(value: number, decimals: number = 2): number {
  if (isNaN(value) || !isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

// ==========================================
// Core Cost Calculation Functions
// ==========================================

/**
 * Calculates complete order costs including brokerage, STT, exchange charges,
 * SEBI charges, stamp duty, GST, and slippage for a single order.
 */
export function calculateOrderCost(params: OrderCostParams): OrderCostBreakdown {
  const {
    price,
    quantity,
    side,
    segment = "EQUITY",
    productType = "MIS",
    feePct,
    slippagePct = INDIAN_MARKET_TARIFFS.DEFAULT_SLIPPAGE_PCT,
    isExercisedOption = false,
    brokerageOverride,
    round = true,
  } = params;

  if (price <= 0 || quantity <= 0) {
    return {
      turnover: 0,
      brokerage: 0,
      stt: 0,
      exchangeCharges: 0,
      sebiCharges: 0,
      stampDuty: 0,
      gst: 0,
      slippage: 0,
      statutoryCharges: 0,
      totalCharges: 0,
      totalCost: 0,
      effectiveRatePct: 0,
    };
  }

  const rawTurnover = price * quantity;
  const normalizedSide = side.toUpperCase() as OrderSide;
  const normalizedSegment = segment.toUpperCase() as MarketSegment;
  const normalizedProduct = productType.toUpperCase() as ProductType;

  // 1. Brokerage calculation
  let rawBrokerage = 0;
  if (brokerageOverride !== undefined && brokerageOverride >= 0) {
    rawBrokerage = brokerageOverride;
  } else if (feePct !== undefined && feePct >= 0) {
    rawBrokerage = rawTurnover * (feePct / 100);
  } else {
    switch (normalizedSegment) {
      case "EQUITY":
        if (normalizedProduct === "CNC") {
          rawBrokerage = INDIAN_MARKET_TARIFFS.BROKERAGE.EQUITY_CNC; // ₹0
        } else {
          // MIS: Flat ₹20 or 0.03% of turnover, whichever is lower
          rawBrokerage = Math.min(
            INDIAN_MARKET_TARIFFS.BROKERAGE.EQUITY_MIS_FLAT,
            rawTurnover * INDIAN_MARKET_TARIFFS.BROKERAGE.EQUITY_MIS_RATE
          );
        }
        break;
      case "FUTURES":
        // Flat ₹20 per executed order
        rawBrokerage = INDIAN_MARKET_TARIFFS.BROKERAGE.FUTURES_FLAT;
        break;
      case "OPTIONS":
        // Flat ₹20 per executed order
        rawBrokerage = INDIAN_MARKET_TARIFFS.BROKERAGE.OPTIONS_FLAT;
        break;
      default:
        rawBrokerage = Math.min(
          INDIAN_MARKET_TARIFFS.BROKERAGE.EQUITY_MIS_FLAT,
          rawTurnover * INDIAN_MARKET_TARIFFS.BROKERAGE.EQUITY_MIS_RATE
        );
    }
  }

  // 2. STT (Securities Transaction Tax)
  let rawStt = 0;
  switch (normalizedSegment) {
    case "EQUITY":
      if (normalizedProduct === "CNC") {
        // Delivery: 0.1% on both Buy and Sell sides
        rawStt = rawTurnover * INDIAN_MARKET_TARIFFS.STT.EQUITY_CNC_BUY;
      } else {
        // Intraday (MIS): 0.025% on Sell side only
        rawStt =
          normalizedSide === "SELL"
            ? rawTurnover * INDIAN_MARKET_TARIFFS.STT.EQUITY_MIS_SELL
            : 0;
      }
      break;
    case "FUTURES":
      // Futures: 0.02% on Sell side only
      rawStt =
        normalizedSide === "SELL"
          ? rawTurnover * INDIAN_MARKET_TARIFFS.STT.FUTURES_SELL
          : 0;
      break;
    case "OPTIONS":
      // Options: 0.0625% on sell premium (or 0.125% on intrinsic if exercised)
      if (normalizedSide === "SELL") {
        rawStt = isExercisedOption
          ? rawTurnover * INDIAN_MARKET_TARIFFS.STT.OPTIONS_EXERCISED_INTRINSIC
          : rawTurnover * INDIAN_MARKET_TARIFFS.STT.OPTIONS_SELL_PREMIUM;
      } else {
        rawStt = 0;
      }
      break;
  }

  // 3. Exchange Transaction Charges (NSE)
  let rawExchangeCharges = 0;
  switch (normalizedSegment) {
    case "EQUITY":
      rawExchangeCharges = rawTurnover * INDIAN_MARKET_TARIFFS.EXCHANGE.EQUITY;
      break;
    case "FUTURES":
      rawExchangeCharges = rawTurnover * INDIAN_MARKET_TARIFFS.EXCHANGE.FUTURES;
      break;
    case "OPTIONS":
      rawExchangeCharges = rawTurnover * INDIAN_MARKET_TARIFFS.EXCHANGE.OPTIONS;
      break;
  }

  // 4. SEBI Turnover Charges (₹10 per crore across all segments)
  const rawSebiCharges = rawTurnover * INDIAN_MARKET_TARIFFS.SEBI.TURNOVER_RATE;

  // 5. Stamp Duty (Indian Stamp Act, 2019 - Buy side only)
  let rawStampDuty = 0;
  if (normalizedSide === "BUY") {
    switch (normalizedSegment) {
      case "EQUITY":
        rawStampDuty =
          normalizedProduct === "CNC"
            ? rawTurnover * INDIAN_MARKET_TARIFFS.STAMP_DUTY.EQUITY_CNC_BUY
            : rawTurnover * INDIAN_MARKET_TARIFFS.STAMP_DUTY.EQUITY_MIS_BUY;
        break;
      case "FUTURES":
        rawStampDuty = rawTurnover * INDIAN_MARKET_TARIFFS.STAMP_DUTY.FUTURES_BUY;
        break;
      case "OPTIONS":
        rawStampDuty = rawTurnover * INDIAN_MARKET_TARIFFS.STAMP_DUTY.OPTIONS_BUY;
        break;
    }
  } else {
    rawStampDuty = 0; // Stamp duty is strictly 0 on Sell orders
  }

  // 6. GST (18% on Brokerage + Exchange Charges + SEBI Charges)
  const gstTaxableBase = rawBrokerage + rawExchangeCharges + rawSebiCharges;
  const rawGst = gstTaxableBase * INDIAN_MARKET_TARIFFS.GST_RATE;

  // 7. Slippage
  const effectiveSlippagePct = slippagePct ?? INDIAN_MARKET_TARIFFS.DEFAULT_SLIPPAGE_PCT;
  const rawSlippage = rawTurnover * (effectiveSlippagePct / 100);

  // Formatting and rounding
  if (round) {
    const turnover = roundTo(rawTurnover, 2);
    const brokerage = roundTo(rawBrokerage, 2);
    const stt = roundTo(rawStt, 2);
    const exchangeCharges = roundTo(rawExchangeCharges, 2);
    const sebiCharges = roundTo(rawSebiCharges, 2);
    const stampDuty = roundTo(rawStampDuty, 2);
    const gst = roundTo(rawGst, 2);
    const slippage = roundTo(rawSlippage, 2);

    const statutoryCharges = roundTo(
      stt + exchangeCharges + sebiCharges + stampDuty + gst,
      2
    );
    const totalCharges = roundTo(brokerage + statutoryCharges, 2);
    const totalCost = roundTo(totalCharges + slippage, 2);
    const effectiveRatePct =
      turnover > 0 ? roundTo((totalCost / turnover) * 100, 4) : 0;

    return {
      turnover,
      brokerage,
      stt,
      exchangeCharges,
      sebiCharges,
      stampDuty,
      gst,
      slippage,
      statutoryCharges,
      totalCharges,
      totalCost,
      effectiveRatePct,
    };
  }

  const statutoryCharges =
    rawStt + rawExchangeCharges + rawSebiCharges + rawStampDuty + rawGst;
  const totalCharges = rawBrokerage + statutoryCharges;
  const totalCost = totalCharges + rawSlippage;
  const effectiveRatePct =
    rawTurnover > 0 ? (totalCost / rawTurnover) * 100 : 0;

  return {
    turnover: rawTurnover,
    brokerage: rawBrokerage,
    stt: rawStt,
    exchangeCharges: rawExchangeCharges,
    sebiCharges: rawSebiCharges,
    stampDuty: rawStampDuty,
    gst: rawGst,
    slippage: rawSlippage,
    statutoryCharges,
    totalCharges,
    totalCost,
    effectiveRatePct,
  };
}

/**
 * Calculates the complete round-trip costs (entry + exit) for a trade.
 * Standard round-trip enters LONG via BUY and exits via SELL, or if isShort is true,
 * enters SHORT via SELL and exits via BUY.
 */
export function calculateRoundTripCosts(
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  segment: MarketSegment = "EQUITY",
  productType: ProductType = "MIS",
  feePct?: number,
  slippagePct?: number,
  options?: { isShort?: boolean; round?: boolean }
): RoundTripCostBreakdown {
  const isShort = options?.isShort ?? false;
  const round = options?.round ?? true;

  const entrySide: OrderSide = isShort ? "SELL" : "BUY";
  const exitSide: OrderSide = isShort ? "BUY" : "SELL";

  const entryCost = calculateOrderCost({
    price: entryPrice,
    quantity,
    side: entrySide,
    segment,
    productType,
    feePct,
    slippagePct,
    round,
  });

  const exitCost = calculateOrderCost({
    price: exitPrice,
    quantity,
    side: exitSide,
    segment,
    productType,
    feePct,
    slippagePct,
    round,
  });

  const totalTurnover = roundTo(entryCost.turnover + exitCost.turnover, 2);
  const totalBrokerage = roundTo(entryCost.brokerage + exitCost.brokerage, 2);
  const totalStt = roundTo(entryCost.stt + exitCost.stt, 2);
  const totalExchangeCharges = roundTo(
    entryCost.exchangeCharges + exitCost.exchangeCharges,
    2
  );
  const totalSebiCharges = roundTo(
    entryCost.sebiCharges + exitCost.sebiCharges,
    2
  );
  const totalStampDuty = roundTo(
    entryCost.stampDuty + exitCost.stampDuty,
    2
  );
  const totalGst = roundTo(entryCost.gst + exitCost.gst, 2);
  const totalSlippage = roundTo(entryCost.slippage + exitCost.slippage, 2);
  const totalStatutoryCharges = roundTo(
    entryCost.statutoryCharges + exitCost.statutoryCharges,
    2
  );
  const totalCharges = roundTo(entryCost.totalCharges + exitCost.totalCharges, 2);
  const totalCost = roundTo(entryCost.totalCost + exitCost.totalCost, 2);

  // Points needed to break even per unit
  const breakevenPoints =
    quantity > 0 ? roundTo(totalCost / quantity, 2) : 0;
  const breakevenPct =
    entryPrice > 0 ? roundTo((breakevenPoints / entryPrice) * 100, 4) : 0;

  // Gross and Net PnL
  const grossPnl = isShort
    ? roundTo((entryPrice - exitPrice) * quantity, 2)
    : roundTo((exitPrice - entryPrice) * quantity, 2);
  const netPnl = roundTo(grossPnl - totalCost, 2);

  return {
    entryCost,
    exitCost,
    totalTurnover,
    totalBrokerage,
    totalStt,
    totalExchangeCharges,
    totalSebiCharges,
    totalStampDuty,
    totalGst,
    totalSlippage,
    totalStatutoryCharges,
    totalCharges,
    totalCost,
    breakevenPoints,
    breakevenPct,
    grossPnl,
    netPnl,
  };
}

// ==========================================
// Lot Sizing Functions
// ==========================================

/**
 * Returns the standard market lot size for an instrument symbol.
 * Supports NIFTY (65), BANKNIFTY (30), SENSEX (10), FINNIFTY (65), MIDCPNIFTY (120), BANKEX (15),
 * and defaults to 1 for individual stocks or equities.
 */
export function calculateLotSize(symbol: string): number {
  if (!symbol || typeof symbol !== "string") {
    return 1;
  }

  // Normalize symbol: strip exchange prefixes like NSE:, BSE:, and trim whitespace
  const clean = symbol
    .trim()
    .toUpperCase()
    .replace(/^(NSE|BSE):/, "")
    .replace(/[^A-Z0-9]/g, "");

  // Match derivative or index patterns:
  // Must check compound index names before prefix 'NIFTY'
  if (clean.startsWith("BANKNIFTY") || clean.includes("BANKNIFTY") || clean.startsWith("NIFTYBANK")) {
    return INDEX_LOT_SIZES.BANKNIFTY; // 30
  }
  if (clean.startsWith("FINNIFTY") || clean.includes("FINNIFTY") || clean.includes("NIFTYFIN")) {
    return INDEX_LOT_SIZES.FINNIFTY; // 65
  }
  if (clean.startsWith("MIDCPNIFTY") || clean.includes("MIDCAP")) {
    return INDEX_LOT_SIZES.MIDCPNIFTY; // 120
  }
  if (clean.startsWith("BANKEX")) {
    return INDEX_LOT_SIZES.BANKEX; // 15
  }
  if (clean.startsWith("SENSEX") || clean.includes("SENSEX")) {
    return INDEX_LOT_SIZES.SENSEX; // 10
  }
  if (clean.startsWith("NIFTY") || clean.includes("NIFTY50") || clean === "NIFTY") {
    return INDEX_LOT_SIZES.NIFTY; // 65
  }

  // Individual stock equities have a default lot size of 1
  return 1;
}

// ==========================================
// Position Sizing with Leverage & Lots
// ==========================================

/**
 * Calculates position quantity quantized to integer lots based on available capital,
 * price, lot size, sizing method, and leverage.
 *
 * @param capital Total portfolio capital or available cash
 * @param price Single unit price of the asset
 * @param lotSize Minimum tradable unit block (e.g. 1 for stocks, 65 for Nifty)
 * @param sizingType Position sizing mode ('PERCENT_OF_CAPITAL', 'FIXED_CAPITAL', 'FIXED_LOTS', etc.)
 * @param sizingValue Amount, percentage, or number of lots depending on sizingType
 * @param leverage Trading leverage multiplier (e.g. 1 for CNC, 5 for MIS)
 */
export function calculatePositionQuantity(
  capital: number,
  price: number,
  lotSize: number,
  sizingType: PositionSizingType | string,
  sizingValue: number,
  leverage: number = 1
): PositionQuantityResult {
  const effectiveLeverage = Math.max(1, leverage || 1);
  const effectiveLotSize = Math.max(1, Math.floor(lotSize || 1));

  if (capital <= 0 || price <= 0 || sizingValue <= 0) {
    return { quantity: 0, lots: 0, allocatedCapital: 0 };
  }

  // Value of one full lot in terms of exposure
  const lotExposure = effectiveLotSize * price;
  // Margin required for one lot
  const marginPerLot = lotExposure / effectiveLeverage;

  // Maximum lots affordable with total portfolio capital
  const maxAffordableLots = Math.floor(capital / marginPerLot);
  if (maxAffordableLots <= 0) {
    return { quantity: 0, lots: 0, allocatedCapital: 0 };
  }

  const normalizedType = sizingType.trim().toUpperCase();
  let targetLots = 0;

  switch (normalizedType) {
    case "PERCENT_OF_CAPITAL":
    case "PERCENT_OF_EQUITY":
    case "PERCENT":
    case "PERCENTAGE": {
      // If sizingValue is provided as percentage e.g. 50 (50%) or fraction 0.5 (50%)
      const pct = sizingValue > 1 ? sizingValue / 100 : sizingValue;
      const targetMargin = Math.min(capital, capital * Math.max(0, pct));
      targetLots = Math.floor(targetMargin / marginPerLot);
      break;
    }

    case "FIXED_CAPITAL":
    case "FIXED_AMOUNT":
    case "CAPITAL":
    case "AMOUNT": {
      const targetMargin = Math.min(capital, sizingValue);
      targetLots = Math.floor(targetMargin / marginPerLot);
      break;
    }

    case "FIXED_LOTS":
    case "LOTS": {
      const requestedLots = Math.max(0, Math.floor(sizingValue));
      targetLots = Math.min(requestedLots, maxAffordableLots);
      break;
    }

    case "FIXED_QUANTITY":
    case "FIXED_UNITS":
    case "QUANTITY":
    case "UNITS": {
      const requestedLots = Math.floor(sizingValue / effectiveLotSize);
      targetLots = Math.min(requestedLots, maxAffordableLots);
      break;
    }

    default: {
      // Default to percentage of capital
      const pct = sizingValue > 1 ? sizingValue / 100 : sizingValue;
      const targetMargin = Math.min(capital, capital * Math.max(0, pct));
      targetLots = Math.floor(targetMargin / marginPerLot);
      break;
    }
  }

  // Ensure lots cannot exceed maximum capital constraint
  const lots = Math.max(0, Math.min(targetLots, maxAffordableLots));
  const quantity = lots * effectiveLotSize;
  const allocatedCapital = roundTo((quantity * price) / effectiveLeverage, 2);

  return {
    quantity,
    lots,
    allocatedCapital,
  };
}
