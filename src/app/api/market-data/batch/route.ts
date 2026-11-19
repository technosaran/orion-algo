import { NextRequest, NextResponse } from "next/server";
import { getHistoricalCandles, computeDatasetStats, SYMBOL_CONFIGS } from "@/lib/marketDataService";
import { ChartTimeframe } from "@/types/paperTrading";
import { StoredDataset } from "@/types/dataset";
import { supabase } from "@/lib/supabase";
import fs from "fs/promises";
import path from "path";

const DATASETS_DIR = path.join(process.cwd(), "public", "datasets");
const CATALOG_FILE = path.join(DATASETS_DIR, "catalog.json");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const symbols: string[] = body.symbols || ["NIFTY50", "BANKNIFTY", "RELIANCE"];
    const timeframe = (body.timeframe || "15m") as ChartTimeframe;
    const range = body.range || "1mo";
    const limit = body.limit || 300;
    const saveToStorage = body.saveToStorage !== false;

    const results: any[] = [];
    try {
      await fs.mkdir(DATASETS_DIR, { recursive: true });
    } catch {}

    let existingCatalog: StoredDataset[] = [];
    try {
      const catContent = await fs.readFile(CATALOG_FILE, "utf-8");
      existingCatalog = JSON.parse(catContent);
    } catch {}

    for (const sym of symbols) {
      try {
        const candles = await getHistoricalCandles(sym, timeframe, limit, range);
        if (candles && candles.length > 0) {
          const stats = computeDatasetStats(candles);
          const cleanSymbol = sym.toUpperCase().trim();
          const safeSymbolSlug = cleanSymbol.replace(/[\/\s:]+/g, "-").toLowerCase();
          const id = `ds-${safeSymbolSlug}-${timeframe.toLowerCase()}`;

          const conf = SYMBOL_CONFIGS[cleanSymbol] || {
            name: cleanSymbol,
            category: cleanSymbol.includes("USDT") || cleanSymbol.includes("BTC") ? "crypto" : "stock",
            source: cleanSymbol.includes("USDT") ? "binance" : "yahoo",
          };

          const timestampNow = Date.now();

          const dataset: StoredDataset = {
            id,
            symbol: cleanSymbol,
            name: conf.name,
            category: conf.category as any,
            source: conf.source as any,
            timeframe,
            range,
            candleCount: candles.length,
            startDate: candles[0].time,
            endDate: candles[candles.length - 1].time,
            candles,
            stats,
            createdAt: timestampNow,
            updatedAt: timestampNow,
          };

          if (saveToStorage) {
            // Write dataset file and catalog if filesystem is writable
            try {
              const filePath = path.join(DATASETS_DIR, `${id}.json`);
              await fs.writeFile(filePath, JSON.stringify(dataset, null, 2), "utf-8");

              const metaOnly = { ...dataset, candles: [] };
              existingCatalog = [
                metaOnly,
                ...existingCatalog.filter((d) => d.id !== id && !(d.symbol === cleanSymbol && d.timeframe === timeframe))
              ];
            } catch (fsErr) {
              console.warn("Local dataset write skipped (serverless environment):", fsErr);
            }

            // Sync to Supabase in background
            if (supabase) {
              try {
                await supabase.from("market_datasets").upsert({
                  id: dataset.id,
                  symbol: dataset.symbol,
                  name: dataset.name,
                  timeframe: dataset.timeframe,
                  category: dataset.category,
                  source: dataset.source,
                  candle_count: dataset.candleCount,
                  start_date: new Date(candles[0].timestamp || Date.now()).toISOString(),
                  end_date: new Date(candles[candles.length - 1].timestamp || Date.now()).toISOString(),
                  candles: dataset.candles,
                  stats: dataset.stats,
                  updated_at: new Date().toISOString(),
                });
              } catch (dbErr) {
                console.warn("Supabase batch dataset upsert note:", dbErr);
              }
            }
          }

          results.push({
            id,
            symbol: cleanSymbol,
            name: conf.name,
            candleCount: candles.length,
            stats,
            success: true,
          });
        } else {
          results.push({ symbol: sym, success: false, message: "No candles returned" });
        }
      } catch (err: any) {
        results.push({ symbol: sym, success: false, message: err.message });
      }
    }

    if (saveToStorage && existingCatalog.length > 0) {
      try {
        await fs.writeFile(CATALOG_FILE, JSON.stringify(existingCatalog, null, 2), "utf-8");
      } catch {}
    }

    return NextResponse.json({
      status: "success",
      count: results.filter((r) => r.success).length,
      totalRequested: symbols.length,
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", message: err.message || "Batch fetch failed" },
      { status: 500 }
    );
  }
}
