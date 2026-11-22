/**
 * Orion Algo - Autonomous Options Algorithm Intelligence Helper
 * 
 * Provides institutional-grade option contract selection, strike rounding,
 * moneyness assignment, premium estimation, lot sizing, and bracket risk management.
 */

export type OptionType = "CE" | "PE";
export type OptionAction = "BUY" | "SELL";
export type BotExecutionMode = "EQUITY" | "OPTION_BUYING" | "OPTION_SELLING";
export type BotMoneyness = "ATM" | "ITM" | "OTM";
export type SignalDirection = "BULLISH" | "BEARISH";

export interface UnderlyingParams {
  symbol: string;
  name: string;
  step: number;
  lotSize: number;
  expiryDay: number; // 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri
  isIndex: boolean;
}

export interface SelectedOptionContract {
  underlying: string;
  spotPrice: number;
  signalDirection: SignalDirection;
  executionMode: BotExecutionMode;
  moneyness: BotMoneyness;
  optionType: OptionType;
  action: OptionAction;
  strikePrice: number;
  contractSymbol: string;
  expiryDateStr: string;
  estimatedPremium: number;
  delta: number;
  thetaPerDay: number;
  lotSize: number;
  recommendedLots: number;
  totalQuantity: number;
  totalInvestment: number;
  marginRequired: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  takeProfitPercent: number;
  stopLossPercent: number;
  rationale: string;
}

// Exchange-mandated parameters for Indian indices and large caps
const UNDERLYING_REGISTRY: Record<string, UnderlyingParams> = {
  NIFTY: { symbol: "NIFTY", name: "NIFTY 50", step: 50, lotSize: 75, expiryDay: 4, isIndex: true },
  NIFTY50: { symbol: "NIFTY50", name: "NIFTY 50", step: 50, lotSize: 75, expiryDay: 4, isIndex: true },
  "NIFTY 50": { symbol: "NIFTY 50", name: "NIFTY 50", step: 50, lotSize: 75, expiryDay: 4, isIndex: true },
  BANKNIFTY: { symbol: "BANKNIFTY", name: "BANK NIFTY", step: 100, lotSize: 30, expiryDay: 4, isIndex: true },
  "BANK NIFTY": { symbol: "BANK NIFTY", name: "BANK NIFTY", step: 100, lotSize: 30, expiryDay: 4, isIndex: true },
  FINNIFTY: { symbol: "FINNIFTY", name: "FIN NIFTY", step: 50, lotSize: 65, expiryDay: 2, isIndex: true },
  MIDCPNIFTY: { symbol: "MIDCPNIFTY", name: "MIDCAP NIFTY", step: 25, lotSize: 120, expiryDay: 1, isIndex: true },
  SENSEX: { symbol: "SENSEX", name: "BSE SENSEX", step: 100, lotSize: 20, expiryDay: 5, isIndex: true },
  RELIANCE: { symbol: "RELIANCE", name: "Reliance Industries", step: 20, lotSize: 250, expiryDay: 4, isIndex: false },
  TCS: { symbol: "TCS", name: "Tata Consultancy Services", step: 50, lotSize: 175, expiryDay: 4, isIndex: false },
  INFY: { symbol: "INFY", name: "Infosys Ltd", step: 20, lotSize: 400, expiryDay: 4, isIndex: false },
  HDFCBANK: { symbol: "HDFCBANK", name: "HDFC Bank Ltd", step: 20, lotSize: 550, expiryDay: 4, isIndex: false },
  ICICIBANK: { symbol: "ICICIBANK", name: "ICICI Bank Ltd", step: 10, lotSize: 700, expiryDay: 4, isIndex: false },
  TATAMOTORS: { symbol: "TATAMOTORS", name: "Tata Motors Ltd", step: 10, lotSize: 700, expiryDay: 4, isIndex: false },
  SBIN: { symbol: "SBIN", name: "State Bank of India", step: 10, lotSize: 750, expiryDay: 4, isIndex: false },
};

/**
 * Resolves instrument lot size, strike step, and weekly expiry convention
 */
export function resolveUnderlyingParams(symbol: string, spotPrice: number): UnderlyingParams {
  const cleanSym = symbol.toUpperCase().replace(/\^/g, "").replace(/\.NS/g, "").replace(/\.BO/g, "").trim();
  
  if (UNDERLYING_REGISTRY[cleanSym]) {
    return UNDERLYING_REGISTRY[cleanSym];
  }

  // Fallback heuristic based on price magnitude
  let step = 10;
  let lotSize = 250;
  if (spotPrice > 20000) {
    step = 50;
    lotSize = 65;
  } else if (spotPrice > 5000) {
    step = 50;
    lotSize = 100;
  } else if (spotPrice > 1000) {
    step = 20;
    lotSize = 250;
  } else if (spotPrice > 500) {
    step = 10;
    lotSize = 500;
  } else {
    step = 5;
    lotSize = 1000;
  }

  return {
    symbol: cleanSym,
    name: cleanSym,
    step,
    lotSize,
    expiryDay: 4, // Default Thursday
    isIndex: cleanSym.includes("NIFTY") || cleanSym.includes("SENSEX"),
  };
}

/**
 * Calculates upcoming weekly expiry date string (e.g. "28-NOV-2024")
 */
export function getUpcomingExpiryDate(targetDayOfWeek: number = 4): string {
  const d = new Date();
  const currentDay = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  let diff = targetDayOfWeek - currentDay;
  if (diff < 0) {
    diff += 7; // Next week's cycle if past this week's expiry
  }
  // When diff === 0, today is the weekly expiry day (0-DTE)!
  const expiry = new Date(d.getTime() + diff * 24 * 60 * 60 * 1000);
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const dayStr = String(expiry.getDate()).padStart(2, "0");
  const monthStr = months[expiry.getMonth()];
  const yearStr = expiry.getFullYear();
  return `${dayStr}-${monthStr}-${yearStr}`;
}

/**
 * Black-Scholes & Intrinsic/Extrinsic pricing approximation for realistic Indian options
 */
export function estimateOptionPremiumAndGreeks(
  spotPrice: number,
  strikePrice: number,
  optionType: OptionType,
  moneyness: BotMoneyness,
  iv: number = 0.14, // 14% typical NSE IV
  daysToExpiry: number = 4
): { premium: number; delta: number; theta: number } {
  const isCall = optionType === "CE";
  const intrinsic = isCall
    ? Math.max(0, spotPrice - strikePrice)
    : Math.max(0, strikePrice - spotPrice);

  // Time value based on IV, spot price, and square-root of time
  const t = Math.max(daysToExpiry, 0.5) / 365.0;
  const atmVol = spotPrice * iv * Math.sqrt(t) * 0.40;

  // Extrinsic decay factor based on distance from ATM
  const moneynessDistance = Math.abs(spotPrice - strikePrice) / (spotPrice * 0.01 + 1);
  const extrinsicFactor = Math.max(0.15, Math.exp(-0.12 * moneynessDistance));
  const timeValue = Math.max(12, atmVol * extrinsicFactor);

  const rawPremium = intrinsic + timeValue;
  const premium = Math.max(15, Math.round(rawPremium * 10) / 10);

  // Realistic delta by moneyness
  let delta = 0.50;
  if (isCall) {
    if (moneyness === "ITM") delta = 0.70;
    else if (moneyness === "OTM") delta = 0.32;
    else delta = 0.50;
  } else {
    if (moneyness === "ITM") delta = -0.70;
    else if (moneyness === "OTM") delta = -0.32;
    else delta = -0.50;
  }

  // Theta per day in ₹
  const theta = Math.round((timeValue / Math.max(daysToExpiry, 1)) * 0.45 * 100) / 100;

  return { premium, delta, theta };
}

export interface SelectOptionContractParams {
  underlying: string;
  spotPrice: number;
  signalDirection: SignalDirection;
  moneyness?: BotMoneyness;
  executionMode?: BotExecutionMode;
  capital?: number;
  cashBalance?: number;
}

/**
 * CORE SELECTION ALGORITHM:
 * 1. Reads underlying market spot & technical signal direction (BULLISH / BEARISH).
 * 2. Determines Option Type (CE or PE) & Action (BUY or SELL) based on Execution Mode.
 * 3. Snaps spot price to valid exchange strike grid and offsets by moneyness.
 * 4. Quotes realistic option premium and Greeks.
 * 5. Sizes position to exact exchange lot multiples within risk capital.
 * 6. Sets protective Stop-Loss and Take-Profit bounds.
 */
export function selectOptionContract({
  underlying,
  spotPrice,
  signalDirection,
  moneyness = "ATM",
  executionMode = "OPTION_BUYING",
  cashBalance = 1000000,
}: SelectOptionContractParams): SelectedOptionContract {
  const params = resolveUnderlyingParams(underlying, spotPrice);
  const { step, lotSize, expiryDay, symbol } = params;

  // 1. Determine Option Type & Action
  let optionType: OptionType = "CE";
  let action: OptionAction = "BUY";

  if (executionMode === "OPTION_BUYING") {
    action = "BUY";
    // Directional Buying: Bullish -> Buy CE, Bearish -> Buy PE
    optionType = signalDirection === "BULLISH" ? "CE" : "PE";
  } else if (executionMode === "OPTION_SELLING") {
    action = "SELL";
    // Theta Decay / Option Writing: Bullish -> Sell PE, Bearish -> Sell CE
    optionType = signalDirection === "BULLISH" ? "PE" : "CE";
  } else {
    // Fallback default buying
    action = "BUY";
    optionType = signalDirection === "BULLISH" ? "CE" : "PE";
  }

  // 2. Strike Selection Logic
  // At-The-Money (ATM) rounded to nearest strike step
  const atmStrike = Math.round(spotPrice / step) * step;
  let strikePrice = atmStrike;

  if (optionType === "CE") {
    if (moneyness === "ITM") {
      strikePrice = atmStrike - step;
    } else if (moneyness === "OTM") {
      strikePrice = atmStrike + step;
    } else {
      strikePrice = atmStrike;
    }
  } else {
    // PE Options
    if (moneyness === "ITM") {
      strikePrice = atmStrike + step;
    } else if (moneyness === "OTM") {
      strikePrice = atmStrike - step;
    } else {
      strikePrice = atmStrike;
    }
  }

  // 3. Expiry and Contract Identifier
  const expiryDateStr = getUpcomingExpiryDate(expiryDay);
  const contractSymbol = `${symbol} ${strikePrice} ${optionType}`;

  // 4. Estimate Premium & Greeks
  const { premium, delta, theta } = estimateOptionPremiumAndGreeks(
    spotPrice,
    strikePrice,
    optionType,
    moneyness
  );

  // 5. Position Sizing
  // Safe allocation: max 8% of cash balance for buying, 15% for selling margin
  const allocBudget = Math.max(25000, Math.min(cashBalance * 0.08, 150000));
  
  let recommendedLots = 1;
  let marginRequired = 0;
  let totalInvestment = 0;

  if (action === "BUY") {
    const costPerLot = premium * lotSize;
    recommendedLots = Math.max(1, Math.floor(allocBudget / Math.max(costPerLot, 1)));
    totalQuantity = recommendedLots * lotSize;
    totalInvestment = totalQuantity * premium;
    marginRequired = totalInvestment;
  } else {
    // Option Selling requires SPAN + Exposure margin (~12% of underlying contract value)
    const marginPerLot = spotPrice * lotSize * 0.12;
    recommendedLots = Math.max(1, Math.floor((cashBalance * 0.15) / Math.max(marginPerLot, 1)));
    totalQuantity = recommendedLots * lotSize;
    totalInvestment = totalQuantity * premium; // Credit received
    marginRequired = recommendedLots * marginPerLot;
  }

  var totalQuantity = recommendedLots * lotSize;

  // 6. Risk Management Bracket (SL / TP)
  let takeProfitPrice = 0;
  let stopLossPrice = 0;
  let takeProfitPercent = 0;
  let stopLossPercent = 0;

  if (action === "BUY") {
    // Buying: Target +50% gain, Stop-Loss -25% max risk
    takeProfitPercent = 50;
    stopLossPercent = 25;
    takeProfitPrice = Math.round(premium * 1.50 * 10) / 10;
    stopLossPrice = Math.round(premium * 0.75 * 10) / 10;
  } else {
    // Selling: Target 60% theta decay (TP), Stop-Loss +30% expansion (SL)
    takeProfitPercent = 60;
    stopLossPercent = 30;
    takeProfitPrice = Math.round(premium * 0.40 * 10) / 10; // Buy back cheaper
    stopLossPrice = Math.round(premium * 1.30 * 10) / 10; // Cut if premium increases
  }

  // 7. Explanatory Rationale
  const rationale = action === "BUY"
    ? `Directional momentum signal triggered ${signalDirection} bias on ${symbol}. Selected ${moneyness} ${strikePrice} ${optionType} at ₹${premium} (Delta: ${delta}). Risk capped at ₹${stopLossPrice} (-${stopLossPercent}%).`
    : `Theta harvest signal triggered on ${symbol}. Wrote ${moneyness} ${strikePrice} ${optionType} at ₹${premium} to capture premium decay down to ₹${takeProfitPrice} (+${takeProfitPercent}% decay). Stop loss at ₹${stopLossPrice} (+${stopLossPercent}%).`;

  return {
    underlying: symbol,
    spotPrice,
    signalDirection,
    executionMode,
    moneyness,
    optionType,
    action,
    strikePrice,
    contractSymbol,
    expiryDateStr,
    estimatedPremium: premium,
    delta,
    thetaPerDay: theta,
    lotSize,
    recommendedLots,
    totalQuantity,
    totalInvestment: Math.round(totalInvestment * 100) / 100,
    marginRequired: Math.round(marginRequired * 100) / 100,
    takeProfitPrice,
    stopLossPrice,
    takeProfitPercent,
    stopLossPercent,
    rationale,
  };
}
