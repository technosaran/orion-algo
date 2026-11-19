import { CandleData, ChartTimeframe } from "./paperTrading";

export type DatasetCategory = "stock" | "index" | "crypto" | "commodity";
export type DatasetSource = "yahoo" | "binance" | "custom_csv" | "kite";

export interface DatasetStats {
  high: number;
  low: number;
  avgClose: number;
  avgVolume: number;
  volatilityPct: number;
  atr?: number;
}

export interface StoredDataset {
  id: string;
  symbol: string;
  name: string;
  category: DatasetCategory;
  source: DatasetSource;
  timeframe: ChartTimeframe;
  range: string; // e.g. "1d", "5d", "1mo", "3mo", "6mo", "1y"
  candleCount: number;
  startDate: string;
  endDate: string;
  candles: CandleData[];
  stats: DatasetStats;
  createdAt: number;
  updatedAt: number;
  sizeBytes?: number;
}

export interface BatchFetchRequest {
  symbols: string[];
  timeframe: ChartTimeframe;
  range?: string;
  limit?: number;
  saveToStorage?: boolean;
}
