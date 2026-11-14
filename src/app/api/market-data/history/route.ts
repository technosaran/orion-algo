import { NextRequest, NextResponse } from "next/server";
import { getHistoricalCandles } from "@/lib/marketDataService";
import { ChartTimeframe } from "@/types/paperTrading";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol") || "NVDA";
    const timeframe = (searchParams.get("timeframe") || "15m") as ChartTimeframe;
    const limit = parseInt(searchParams.get("limit") || "60", 10);

    const candles = await getHistoricalCandles(symbol, timeframe, limit);

    return NextResponse.json({
      status: "success",
      symbol,
      timeframe,
      count: candles.length,
      candles,
      provider: symbol.includes("USDT") ? "Binance API" : "Yahoo Finance API",
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message || "Failed to fetch historical candles" },
      { status: 500 }
    );
  }
}
