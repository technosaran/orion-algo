import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

// Fallback generator for NSE data in Next.js standalone mode
function getMockIndices() {
  return {
    data: [
      { index: "NIFTY 50", last: 24350.25, variation: 112.50, percentChange: 0.46, open: 24260.10, high: 24385.00, low: 24240.50, previousClose: 24237.75, yearHigh: 26277.35, yearLow: 18837.85 },
      { index: "NIFTY BANK", last: 52180.60, variation: 245.80, percentChange: 0.47, open: 51980.00, high: 52310.00, low: 51950.00, previousClose: 51934.80, yearHigh: 54467.35, yearLow: 43578.40 },
      { index: "NIFTY FINANCIAL SERVICES", last: 23410.15, variation: 88.20, percentChange: 0.38, open: 23340.00, high: 23450.00, low: 23310.00, previousClose: 23321.95, yearHigh: 24890.00, yearLow: 19420.00 },
      { index: "NIFTY IT", last: 41850.30, variation: -180.40, percentChange: -0.43, open: 42100.00, high: 42150.00, low: 41720.00, previousClose: 42030.70, yearHigh: 44120.00, yearLow: 31200.00 },
      { index: "NIFTY NEXT 50", last: 71890.45, variation: 320.10, percentChange: 0.45, open: 71600.00, high: 72050.00, low: 71550.00, previousClose: 71570.35, yearHigh: 76500.00, yearLow: 44800.00 },
      { index: "NIFTY MIDCAP 100", last: 58450.20, variation: 410.50, percentChange: 0.71, open: 58100.00, high: 58520.00, low: 58050.00, previousClose: 58039.70, yearHigh: 60200.00, yearLow: 38900.00 },
      { index: "INDIA VIX", last: 12.85, variation: -0.42, percentChange: -3.16, open: 13.25, high: 13.40, low: 12.70, previousClose: 13.27, yearHigh: 23.15, yearLow: 10.20 },
    ]
  };
}

function getMockFiiDii() {
  return {
    date: "20-Nov-2026",
    fii: { buyValue: 12450.35, sellValue: 11120.10, netValue: 1330.25 },
    dii: { buyValue: 9840.20, sellValue: 9120.45, netValue: 719.75 },
    fno: {
      indexFutures: { fiiNet: 420.50, diiNet: -180.20 },
      stockFutures: { fiiNet: 890.15, diiNet: 310.40 },
      indexOptions: { fiiNet: 2450.00, diiNet: -980.00 }
    }
  };
}

function getMockOptionChain(symbol: string) {
  const cleanSym = (symbol || "NIFTY").toUpperCase();
  const spot = cleanSym.includes("BANK") ? 52180.0 : cleanSym.includes("FIN") ? 23410.0 : 24350.0;
  const step = cleanSym.includes("BANK") ? 100 : cleanSym.includes("FIN") ? 50 : 50;
  const atm = Math.round(spot / step) * step;
  const strikes: number[] = [];
  for (let i = -8; i <= 8; i++) strikes.push(atm + i * step);

  let totCallOI = 0;
  let totPutOI = 0;

  const data = strikes.map((strike) => {
    const diff = strike - spot;
    const callDist = Math.max(0, -diff);
    const putDist = Math.max(0, diff);
    const callLtp = Number((Math.max(5.0, callDist + 120 - Math.abs(diff) * 0.4)).toFixed(2));
    const putLtp = Number((Math.max(5.0, putDist + 115 - Math.abs(diff) * 0.4)).toFixed(2));
    const callOi = Math.floor(Math.max(10000, 150000 - Math.abs(diff) * 120 + (strike % 500 === 0 ? 80000 : 0)));
    const putOi = Math.floor(Math.max(10000, 140000 - Math.abs(diff) * 110 + (strike % 500 === 0 ? 85000 : 0)));

    totCallOI += callOi;
    totPutOI += putOi;

    return {
      strikePrice: strike,
      expiryDate: "27-Nov-2026",
      CE: {
        strikePrice: strike,
        openInterest: callOi,
        changeinOpenInterest: Math.floor(callOi * 0.08 * (diff > 0 ? 1 : -0.5)),
        totalTradedVolume: Math.floor(callOi * 0.65),
        impliedVolatility: Number((12.5 + Math.abs(diff) * 0.005).toFixed(2)),
        lastPrice: callLtp,
        change: Number((callLtp * 0.04).toFixed(2)),
      },
      PE: {
        strikePrice: strike,
        openInterest: putOi,
        changeinOpenInterest: Math.floor(putOi * 0.12 * (diff < 0 ? 1 : -0.3)),
        totalTradedVolume: Math.floor(putOi * 0.72),
        impliedVolatility: Number((13.2 + Math.abs(diff) * 0.006).toFixed(2)),
        lastPrice: putLtp,
        change: Number((-putLtp * 0.03).toFixed(2)),
      }
    };
  });

  return {
    records: {
      underlyingValue: spot,
      timestamp: "20-Nov-2026 15:30:00",
      expiryDates: ["27-Nov-2026", "04-Dec-2026", "31-Dec-2026"],
      data,
      pcr: Number((totPutOI / Math.max(1, totCallOI)).toFixed(2)),
      totalCallOI: totCallOI,
      totalPutOI: totPutOI,
      maxPain: atm,
    }
  };
}

function getMockGainersLosers() {
  return {
    gainers: [
      { symbol: "TRENT", name: "Trent Ltd", ltp: 6845.20, change: 245.10, pChange: 3.71, volume: 1824500 },
      { symbol: "M&M", name: "Mahindra & Mahindra", ltp: 2980.50, change: 85.30, pChange: 2.95, volume: 2410200 },
      { symbol: "HDFCBANK", name: "HDFC Bank Ltd", ltp: 1724.80, change: 32.10, pChange: 1.90, volume: 8940100 },
      { symbol: "RELIANCE", name: "Reliance Industries", ltp: 2985.00, change: 42.50, pChange: 1.44, volume: 6120400 },
      { symbol: "ICICIBANK", name: "ICICI Bank Ltd", ltp: 1264.40, change: 14.20, pChange: 1.14, volume: 5420100 },
    ],
    losers: [
      { symbol: "INFY", name: "Infosys Ltd", ltp: 1842.10, change: -38.40, pChange: -2.04, volume: 4120300 },
      { symbol: "TCS", name: "Tata Consultancy Services", ltp: 4125.00, change: -65.20, pChange: -1.56, volume: 1940500 },
      { symbol: "WIPRO", name: "Wipro Ltd", ltp: 548.60, change: -7.80, pChange: -1.40, volume: 3240100 },
      { symbol: "TECHM", name: "Tech Mahindra", ltp: 1682.00, change: -18.50, pChange: -1.09, volume: 1240000 },
      { symbol: "SUNPHARMA", name: "Sun Pharma Industries", ltp: 1785.40, change: -14.10, pChange: -0.78, volume: 1540800 },
    ]
  };
}

function getMockBulkDeals() {
  return [
    { date: "20-Nov-2026", symbol: "ZOMATO", clientName: "MORGAN STANLEY ASIA SINGAPORE", dealType: "BUY", quantity: 12500000, tradePrice: 272.40 },
    { date: "20-Nov-2026", symbol: "KOTAKBANK", clientName: "CANADA PENSION PLAN INVESTMENT BOARD", dealType: "BUY", quantity: 4500000, tradePrice: 1785.20 },
    { date: "20-Nov-2026", symbol: "PAYTM", clientName: "SOFTBANK SVF INDIA HOLDINGS", dealType: "SELL", quantity: 3800000, tradePrice: 845.10 },
    { date: "20-Nov-2026", symbol: "TATAMOTORS", clientName: "SOCIETE GENERALE", dealType: "BUY", quantity: 2100000, tradePrice: 812.50 },
    { date: "20-Nov-2026", symbol: "JIOFIN", clientName: "BLACKROCK INSTITUTIONAL TRUST", dealType: "BUY", quantity: 5600000, tradePrice: 318.90 },
  ];
}

function getMockCorporateActions() {
  return [
    { symbol: "TCS", series: "EQ", purpose: "Interim Dividend - Rs 10 Per Share", recordDate: "25-Nov-2026", exDate: "24-Nov-2026" },
    { symbol: "INFY", series: "EQ", purpose: "Interim Dividend - Rs 21 Per Share", recordDate: "28-Nov-2026", exDate: "27-Nov-2026" },
    { symbol: "RELIANCE", series: "EQ", purpose: "Bonus Issue 1:1", recordDate: "02-Dec-2026", exDate: "01-Dec-2026" },
    { symbol: "HDFCBANK", series: "EQ", purpose: "Special Dividend - Rs 19.50 Per Share", recordDate: "05-Dec-2026", exDate: "04-Dec-2026" },
    { symbol: "NESTLEIND", series: "EQ", purpose: "Stock Split From Rs 10 to Rs 1", recordDate: "10-Dec-2026", exDate: "09-Dec-2026" },
  ];
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const subpath = path.join("/");

  // Try forwarding to FastAPI backend first
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);
    const res = await fetch(`${BACKEND_URL}/api/v1/nse/${subpath}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Graceful fallback
  }

  // Standalone fallback matching subpath
  if (subpath === "indices") return NextResponse.json(getMockIndices());
  if (subpath === "fii-dii") return NextResponse.json(getMockFiiDii());
  if (subpath.startsWith("option-chain/")) {
    const sym = subpath.replace("option-chain/", "");
    return NextResponse.json(getMockOptionChain(sym));
  }
  if (subpath === "gainers-losers") return NextResponse.json(getMockGainersLosers());
  if (subpath === "bulk-deals") return NextResponse.json(getMockBulkDeals());
  if (subpath === "corporate-actions") return NextResponse.json(getMockCorporateActions());
  if (subpath === "market-status") {
    return NextResponse.json({
      marketState: [
        { market: "Capital Market", marketStatus: "Open", tradeDate: "20-Nov-2026", index: "NIFTY 50", last: 24350.25, variation: 112.50, percentChange: 0.46 },
        { market: "Currency", marketStatus: "Open", tradeDate: "20-Nov-2026", index: "USDINR", last: 84.42, variation: -0.04, percentChange: -0.05 },
        { market: "Commodity", marketStatus: "Open", tradeDate: "20-Nov-2026", index: "CRUDEOIL", last: 6245.0, variation: 38.0, percentChange: 0.61 },
      ]
    });
  }

  return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
}
