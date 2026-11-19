/**
 * Formats a number in Indian Rupee format (e.g. ₹1,00,000 or -₹25,400)
 * Uses Indian numbering system: 1,00,000 (Lakh) / 1,00,00,000 (Crore)
 */
export function formatINR(val: number, options?: { showSign?: boolean; decimals?: number }): string {
  const isNeg = val < 0;
  const absVal = Math.abs(val);
  const decimals = options?.decimals ?? (absVal >= 1000 ? 0 : 2);

  const formatted = absVal.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (options?.showSign && val > 0) {
    return `+₹${formatted}`;
  }
  return `${isNeg ? "-" : ""}₹${formatted}`;
}

/**
 * Formats large Indian Rupee figures compactly in Lakhs (L) and Crores (Cr)
 * e.g. ₹15,72,500 -> ₹15.73 L, ₹1,25,00,000 -> ₹1.25 Cr
 */
export function formatLakhs(val: number): string {
  const isNeg = val < 0;
  const abs = Math.abs(val);
  let str = "";
  if (abs >= 10000000) {
    str = `₹${(abs / 10000000).toFixed(2)} Cr`;
  } else if (abs >= 100000) {
    str = `₹${(abs / 100000).toFixed(2)} L`;
  } else {
    str = formatINR(abs, { decimals: 2 });
  }
  return isNeg ? `-${str}` : str;
}

/**
 * Returns official NSE / SEBI standard lot size for Indian instruments
 */
export function getInstrumentLotSize(symbol: string): number {
  const s = symbol.toUpperCase();
  if (s.includes("BANKNIFTY")) return 30;
  if (s.includes("NIFTY 50") || s.includes("NIFTY50")) return 65;
  if (s.includes("FINNIFTY")) return 65;
  if (s.includes("MIDCPNIFTY")) return 50;
  if (s.includes("SENSEX")) return 10;
  if (s.includes("CRUDEOIL")) return 100;
  if (s.includes("GOLD")) return 10;
  if (s === "HDFCBANK") return 550;
  if (s === "RELIANCE") return 250;
  if (s === "ICICIBANK") return 700;
  if (s === "TCS") return 175;
  if (s === "INFY") return 400;
  if (s === "TATAMOTORS") return 1425;
  if (s === "SBIN") return 1500;
  return 1;
}

/**
 * Returns official minimum tick size (₹0.05 on NSE F&O)
 */
export function getInstrumentTickSize(symbol: string): number {
  return 0.05;
}

/**
 * Formats quantity with lot units for Indian instruments
 * Incorporates latest NSE India / SEBI revised index lot sizes
 */
export function formatLotOrQty(symbol: string, quantity: number): string {
  const lotSize = getInstrumentLotSize(symbol);
  if (lotSize > 1) {
    const lots = Math.max(1, Math.round(quantity / lotSize));
    return `${lots} Lot${lots > 1 ? "s" : ""} (${lots * lotSize} Qty)`;
  }
  return `${Math.round(quantity)} Shares`;
}

/**
 * Determines whether an asset is priced in USD vs INR
 */
export function isUsdAsset(symbol: string, category?: string): boolean {
  const s = symbol.toUpperCase();
  if (category === "crypto" || s.includes("USDT") || s.includes("BTC") || s.includes("ETH") || s.includes("SOL")) {
    return true;
  }
  // US Equities or global futures/commodities (Yahoo Gold/Crude/Silver are COMEX/WTI in USD)
  if (["AAPL", "TSLA", "NVDA", "MSFT", "SPY", "QQQ", "GOLD", "CRUDEOIL", "SILVER"].includes(s)) {
    return true;
  }
  return false;
}

/**
 * Returns currency symbol for instrument ('$' or '₹')
 */
export function getCurrencySymbol(symbol: string, category?: string): string {
  return isUsdAsset(symbol, category) ? "$" : "₹";
}

/**
 * Formats asset price with appropriate currency symbol and decimals
 */
export function formatAssetPrice(val: number, symbol: string, category?: string): string {
  if (val === undefined || val === null || isNaN(val)) return "—";
  const curr = getCurrencySymbol(symbol, category);
  const isUsd = isUsdAsset(symbol, category);
  const abs = Math.abs(val);
  const decimals = abs >= 10000 ? 1 : (abs >= 100 ? 2 : 2);

  const numStr = isUsd
    ? abs.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : abs.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return `${val < 0 ? "-" : ""}${curr}${numStr}`;
}
