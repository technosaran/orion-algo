import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { StoredDataset } from "@/types/dataset";
import { computeDatasetStats } from "@/lib/marketDataService";
import { supabase } from "@/lib/supabase";

const DATASETS_DIR = path.join(process.cwd(), "public", "datasets");
const CATALOG_FILE = path.join(DATASETS_DIR, "catalog.json");

async function ensureCatalog(): Promise<StoredDataset[]> {
  try {
    await fs.mkdir(DATASETS_DIR, { recursive: true });
    const content = await fs.readFile(CATALOG_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function saveCatalog(catalog: StoredDataset[]) {
  await fs.mkdir(DATASETS_DIR, { recursive: true });
  await fs.writeFile(CATALOG_FILE, JSON.stringify(catalog, null, 2), "utf-8");
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      // Return single full dataset
      const filePath = path.join(DATASETS_DIR, `${id}.json`);
      try {
        const fileContent = await fs.readFile(filePath, "utf-8");
        const dataset = JSON.parse(fileContent);
        return NextResponse.json({ status: "success", dataset });
      } catch {
        // Fallback to Supabase if not on disk
        if (supabase) {
          const { data, error } = await supabase
            .from("market_datasets")
            .select("*")
            .eq("id", id)
            .single();
          if (data && !error) {
            return NextResponse.json({ status: "success", dataset: data });
          }
        }
        return NextResponse.json({ status: "error", message: "Dataset not found" }, { status: 404 });
      }
    }

    // Return catalog list
    let catalog = await ensureCatalog();

    // In serverless production (e.g. Vercel), fall back to Supabase cloud catalog
    if (catalog.length === 0 && supabase) {
      try {
        const { data, error } = await supabase
          .from("market_datasets")
          .select("id, symbol, name, category, source, timeframe, candle_count, start_date, end_date, stats, created_at, updated_at")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          catalog = data.map((d: any) => ({
            id: d.id,
            symbol: d.symbol,
            name: d.name,
            category: d.category,
            source: d.source,
            timeframe: d.timeframe,
            range: d.stats?.range || "auto",
            candleCount: d.candle_count,
            startDate: d.start_date,
            endDate: d.end_date,
            candles: [],
            stats: d.stats,
            createdAt: new Date(d.created_at).getTime(),
            updatedAt: new Date(d.updated_at).getTime(),
          }));
        }
      } catch (dbErr) {
        console.warn("Could not load datasets catalog from Supabase:", dbErr);
      }
    }

    return NextResponse.json({
      status: "success",
      count: catalog.length,
      datasets: catalog.map(({ candles, ...meta }) => ({
        ...meta,
        candlesSample: (candles || []).slice(0, 3),
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", message: err.message || "Failed to load datasets" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { symbol, name, category, source, timeframe, range, candles } = body;

    if (!symbol || !candles || !Array.isArray(candles) || candles.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Invalid payload: symbol and non-empty candles array required." },
        { status: 400 }
      );
    }

    const cleanSymbol = symbol.toUpperCase().replace(/\s+/g, "");
    const cleanTf = timeframe || "15m";
    const timestampNow = Date.now();
    const id = body.id || `ds-${cleanSymbol.toLowerCase()}-${cleanTf}-${timestampNow}`;

    const stats = body.stats || computeDatasetStats(candles);
    const startDate = candles[0]?.time || new Date().toISOString();
    const endDate = candles[candles.length - 1]?.time || new Date().toISOString();

    const dataset: StoredDataset = {
      id,
      symbol: cleanSymbol,
      name: name || `${cleanSymbol} ${cleanTf} Dataset`,
      category: category || "stock",
      source: source || (cleanSymbol.includes("USDT") ? "binance" : "yahoo"),
      timeframe: cleanTf,
      range: range || "auto",
      candleCount: candles.length,
      startDate,
      endDate,
      candles,
      stats,
      createdAt: body.createdAt || timestampNow,
      updatedAt: timestampNow,
    };

    // 1. Write full dataset to disk (wrapped for serverless read-only filesystems like Vercel)
    try {
      await fs.mkdir(DATASETS_DIR, { recursive: true });
      const datasetPath = path.join(DATASETS_DIR, `${id}.json`);
      const datasetJson = JSON.stringify(dataset, null, 2);
      await fs.writeFile(datasetPath, datasetJson, "utf-8");
      dataset.sizeBytes = Buffer.byteLength(datasetJson);

      // 2. Update catalog
      const catalog = await ensureCatalog();
      const filteredCatalog = catalog.filter((d) => d.id !== id);
      const metadataOnly: StoredDataset = {
        ...dataset,
        candles: [], // keep catalog lean
      };
      await saveCatalog([metadataOnly, ...filteredCatalog]);
    } catch (fsErr) {
      console.warn("Local filesystem write skipped (serverless environment):", fsErr);
    }

    // 3. Sync to Supabase in background
    if (supabase) {
      try {
        await supabase
          .from("market_datasets")
          .upsert({
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
      } catch (err) {
        console.warn("Supabase dataset upsert note:", err);
      }
    }

    return NextResponse.json({
      status: "success",
      message: `Dataset "${dataset.name}" stored successfully (${dataset.candleCount} candles).`,
      dataset: {
        id: dataset.id,
        symbol: dataset.symbol,
        name: dataset.name,
        timeframe: dataset.timeframe,
        candleCount: dataset.candleCount,
        stats: dataset.stats,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", message: err.message || "Failed to save dataset" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ status: "error", message: "Dataset ID is required" }, { status: 400 });
    }

    // 1. Remove from disk
    const filePath = path.join(DATASETS_DIR, `${id}.json`);
    try {
      await fs.unlink(filePath);
    } catch {}

    // 2. Remove from catalog
    const catalog = await ensureCatalog();
    const updated = catalog.filter((d) => d.id !== id);
    await saveCatalog(updated);

    // 3. Remove from Supabase
    if (supabase) {
      try {
        await supabase.from("market_datasets").delete().eq("id", id);
      } catch {}
    }

    return NextResponse.json({ status: "success", message: `Dataset #${id} deleted.` });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", message: err.message || "Failed to delete dataset" },
      { status: 500 }
    );
  }
}
