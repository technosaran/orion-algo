import { StoredDataset, DatasetStats } from "@/types/dataset";
import { CandleData, ChartTimeframe } from "@/types/paperTrading";

const LOCAL_STORAGE_KEY = "algox_stored_datasets_v1";

/**
 * Loads list of stored dataset summaries from server API with local storage fallback
 */
export async function getStoredDatasets(): Promise<StoredDataset[]> {
  try {
    const res = await fetch("/api/market-data/datasets");
    if (res.ok) {
      const data = await res.json();
      if (data && data.datasets) {
        // Cache to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.datasets));
        }
        return data.datasets;
      }
    }
  } catch (err) {
    console.warn("Could not fetch datasets from server API, checking localStorage fallback:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
  }

  return [];
}

/**
 * Loads full dataset including all candle bars by ID
 */
export async function getDatasetById(id: string): Promise<StoredDataset | null> {
  try {
    const res = await fetch(`/api/market-data/datasets?id=${encodeURIComponent(id)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.dataset) return data.dataset;
    }
  } catch (err) {
    console.warn("Failed to fetch dataset by ID:", err);
  }

  // Fallback from localStorage
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(`algox_ds_full_${id}`);
      if (cached) return JSON.parse(cached);
    } catch {}
  }

  return null;
}

/**
 * Fetches real historical market data from API and permanently saves it as a dataset
 */
export async function fetchAndStoreDataset(params: {
  symbol: string;
  name?: string;
  category?: "stock" | "index" | "crypto" | "commodity";
  timeframe: ChartTimeframe;
  range?: string;
  limit?: number;
}): Promise<StoredDataset> {
  const { symbol, name, category, timeframe, range = "1mo", limit = 300 } = params;

  // 1. Fetch raw candles from history route
  const historyUrl = `/api/market-data/history?symbol=${encodeURIComponent(
    symbol
  )}&timeframe=${timeframe}&range=${range}&limit=${limit}`;

  const res = await fetch(historyUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch historical market data for ${symbol}`);
  }
  const historyData = await res.json();
  const candles: CandleData[] = historyData.candles || [];

  if (candles.length === 0) {
    throw new Error(`No candle data returned from exchange for ${symbol} on ${timeframe}`);
  }

  // 2. Post to datasets API to save permanently
  const payload = {
    symbol,
    name: name || `${symbol} (${timeframe.toUpperCase()})`,
    category: category || (symbol.includes("USDT") ? "crypto" : "stock"),
    source: symbol.includes("USDT") ? "binance" : "yahoo",
    timeframe,
    range,
    candles,
  };

  const saveRes = await fetch("/api/market-data/datasets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!saveRes.ok) {
    const errData = await saveRes.json().catch(() => ({}));
    throw new Error(errData.message || "Failed to persist dataset to storage");
  }

  const result = await saveRes.json();

  // Cache full dataset in local storage for instant offline access
  const fullDataset: StoredDataset = {
    id: result.dataset.id,
    symbol: result.dataset.symbol,
    name: result.dataset.name,
    category: payload.category as any,
    source: payload.source as any,
    timeframe: result.dataset.timeframe,
    range,
    candleCount: result.dataset.candleCount,
    startDate: candles[0].time,
    endDate: candles[candles.length - 1].time,
    candles,
    stats: result.dataset.stats,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`algox_ds_full_${fullDataset.id}`, JSON.stringify(fullDataset));
    } catch {}
  }

  return fullDataset;
}

/**
 * Deletes a stored dataset
 */
export async function deleteStoredDataset(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/market-data/datasets?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      if (typeof window !== "undefined") {
        localStorage.removeItem(`algox_ds_full_${id}`);
      }
      return true;
    }
  } catch (err) {
    console.warn("Failed to delete dataset:", err);
  }
  return false;
}

/**
 * Converts dataset candles into standard ML/Pandas CSV string
 * Header: Timestamp,Date,Open,High,Low,Close,Volume
 */
export function exportDatasetToCSV(dataset: StoredDataset): string {
  const headers = ["Timestamp", "Date", "Open", "High", "Low", "Close", "Volume"];
  const rows = dataset.candles.map((c) => [
    c.timestamp,
    `"${c.time}"`,
    c.open,
    c.high,
    c.low,
    c.close,
    c.volume,
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Triggers a browser file download of the dataset in CSV format
 */
export function downloadDatasetCSV(dataset: StoredDataset): void {
  const csv = exportDatasetToCSV(dataset);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${dataset.symbol.toLowerCase()}_${dataset.timeframe}_dataset.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Triggers a browser file download of the dataset in JSON format
 */
export function downloadDatasetJSON(dataset: StoredDataset): void {
  const json = JSON.stringify(dataset, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${dataset.symbol.toLowerCase()}_${dataset.timeframe}_dataset.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
