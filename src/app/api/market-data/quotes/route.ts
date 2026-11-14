import { NextResponse } from "next/server";
import { getLiveMarketQuotes } from "@/lib/marketDataService";

export async function GET() {
  try {
    const quotes = await getLiveMarketQuotes();
    return NextResponse.json({
      status: "success",
      count: quotes.length,
      quotes,
      timestamp: Date.now(),
      providers: ["Binance Public API (Crypto)", "Yahoo Finance API (Equities & Indices)"],
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message || "Failed to fetch live quotes" },
      { status: 500 }
    );
  }
}
