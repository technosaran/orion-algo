"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Database,
  Download,
  Trash2,
  Eye,
  RefreshCw,
  Plus,
  Play,
  FileCode,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Layers,
  Clock,
  TrendingUp,
  Search,
  X,
  Sparkles,
  Upload,
  Calendar,
  Filter,
  BarChart2,
  Tag,
  ShieldCheck,
  Globe,
} from "lucide-react";
import { StoredDataset } from "@/types/dataset";
import { ChartTimeframe } from "@/types/paperTrading";
import {
  getStoredDatasets,
  getDatasetById,
  deleteStoredDataset,
  downloadDatasetCSV,
  downloadDatasetJSON,
} from "@/lib/datasetStorage";
import { formatAssetPrice, getCurrencySymbol } from "@/lib/formatters";
import { clampYahooRange } from "@/lib/marketDataService";
import { DatasetSparkline } from "@/components/data/DatasetSparkline";
import { DatasetInspectorModal } from "@/components/data/DatasetInspectorModal";
import { CsvDatasetUploaderModal } from "@/components/data/CsvDatasetUploaderModal";

interface AvailableSymbol {
  symbol: string;
  name: string;
  category: "stock" | "index" | "crypto" | "commodity";
  group: "Indian Indices" | "Indian Equities" | "Commodities" | "Crypto" | "Custom";
}

const DEFAULT_AVAILABLE_SYMBOLS: AvailableSymbol[] = [
  // Indian Indices
  { symbol: "NIFTY50", name: "NIFTY 50 Index", category: "index", group: "Indian Indices" },
  { symbol: "BANKNIFTY", name: "Bank Nifty Index", category: "index", group: "Indian Indices" },
  { symbol: "SENSEX", name: "BSE SENSEX", category: "index", group: "Indian Indices" },

  // Indian Stocks
  { symbol: "RELIANCE", name: "Reliance Industries", category: "stock", group: "Indian Equities" },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd.", category: "stock", group: "Indian Equities" },
  { symbol: "TCS", name: "Tata Consultancy Services", category: "stock", group: "Indian Equities" },
  { symbol: "INFY", name: "Infosys Ltd.", category: "stock", group: "Indian Equities" },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd.", category: "stock", group: "Indian Equities" },
  { symbol: "SBIN", name: "State Bank of India", category: "stock", group: "Indian Equities" },
  { symbol: "TATAMOTORS", name: "Tata Motors PV", category: "stock", group: "Indian Equities" },

  // Commodities
  { symbol: "GOLD", name: "Gold Spot (COMEX/MCX)", category: "commodity", group: "Commodities" },
  { symbol: "CRUDEOIL", name: "Crude Oil (WTI/MCX)", category: "commodity", group: "Commodities" },
  { symbol: "SILVER", name: "Silver Futures (MCX)", category: "commodity", group: "Commodities" },

  // Crypto
  { symbol: "BTC/USDT", name: "Bitcoin / Tether", category: "crypto", group: "Crypto" },
  { symbol: "ETH/USDT", name: "Ethereum / Tether", category: "crypto", group: "Crypto" },
  { symbol: "SOL/USDT", name: "Solana / Tether", category: "crypto", group: "Crypto" },
];

export default function MarketDataHubPage() {
  const [datasets, setDatasets] = useState<StoredDataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Available symbols list (including user custom added symbols)
  const [availableSymbols, setAvailableSymbols] = useState<AvailableSymbol[]>(DEFAULT_AVAILABLE_SYMBOLS);
  const [customTickerInput, setCustomTickerInput] = useState("");
  const [symbolGroupFilter, setSymbolGroupFilter] = useState<string>("All");

  // Fetch Form State
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(["NIFTY50", "RELIANCE"]);
  const [timeframe, setTimeframe] = useState<ChartTimeframe>("15m");
  const [range, setRange] = useState<string>("1mo");
  const [isFetching, setIsFetching] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<{
    type: "info" | "success" | "error";
    message: string;
  } | null>(null);

  // Modals State
  const [inspectingDataset, setInspectingDataset] = useState<StoredDataset | null>(null);
  const [isLoadingInspection, setIsLoadingInspection] = useState(false);
  const [isCsvUploaderOpen, setIsCsvUploaderOpen] = useState(false);

  // Library Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [libraryCategoryFilter, setLibraryCategoryFilter] = useState<string>("all");

  const loadDatasets = async () => {
    setIsLoading(true);
    try {
      const list = await getStoredDatasets();
      setDatasets(list);
    } catch (err) {
      console.warn("Failed to load datasets:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  const handleToggleSymbol = (sym: string) => {
    setSelectedSymbols((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const handleSelectGroup = (groupName: string) => {
    const groupSyms = availableSymbols.filter((s) => s.group === groupName).map((s) => s.symbol);
    const allSelected = groupSyms.every((s) => selectedSymbols.includes(s));
    if (allSelected) {
      setSelectedSymbols((prev) => prev.filter((s) => !groupSyms.includes(s)));
    } else {
      setSelectedSymbols((prev) => Array.from(new Set([...prev, ...groupSyms])));
    }
  };

  const handleAddCustomTicker = (e: React.FormEvent) => {
    e.preventDefault();
    const tick = customTickerInput.trim().toUpperCase();
    if (!tick) return;

    if (!availableSymbols.some((s) => s.symbol === tick)) {
      const isCrypto = tick.includes("USDT") || tick.includes("BTC") || tick.includes("ETH");
      const newSymbol: AvailableSymbol = {
        symbol: tick,
        name: `${tick} Custom Asset`,
        category: isCrypto ? "crypto" : "stock",
        group: "Custom",
      };
      setAvailableSymbols((prev) => [newSymbol, ...prev]);
    }

    if (!selectedSymbols.includes(tick)) {
      setSelectedSymbols((prev) => [...prev, tick]);
    }
    setCustomTickerInput("");
  };

  const handleBatchFetchAndSave = async () => {
    if (selectedSymbols.length === 0) return;
    setIsFetching(true);
    setFetchStatus({
      type: "info",
      message: `Fetching real market data for ${selectedSymbols.length} instrument(s)...`,
    });

    try {
      const res = await fetch("/api/market-data/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbols: selectedSymbols,
          timeframe,
          range,
          limit: 500,
          saveToStorage: true,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFetchStatus({
          type: "success",
          message: `Successfully fetched & stored ${data.count} of ${data.totalRequested} dataset(s)!`,
        });
        await loadDatasets();
        setTimeout(() => setFetchStatus(null), 6000);
      } else {
        setFetchStatus({
          type: "error",
          message: `Fetch failed: ${data.message || "Unknown exchange error"}`,
        });
      }
    } catch (err: any) {
      setFetchStatus({
        type: "error",
        message: `Network error: ${err.message}`,
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleInspect = async (dataset: StoredDataset) => {
    setIsLoadingInspection(true);
    setInspectingDataset(dataset);
    try {
      const full = await getDatasetById(dataset.id);
      if (full) {
        setInspectingDataset(full);
      }
    } catch (err) {
      console.warn("Failed to load full dataset candles:", err);
    } finally {
      setIsLoadingInspection(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete dataset "${name}"?`)) return;
    await deleteStoredDataset(id);
    setDatasets((prev) => prev.filter((d) => d.id !== id));
    if (inspectingDataset?.id === id) setInspectingDataset(null);
  };

  const totalCandles = useMemo(
    () => datasets.reduce((sum, d) => sum + (d.candleCount || 0), 0),
    [datasets]
  );

  // Filter available symbols by group tab
  const filteredAvailableSymbols = useMemo(() => {
    if (symbolGroupFilter === "All") return availableSymbols;
    return availableSymbols.filter((s) => s.group === symbolGroupFilter);
  }, [availableSymbols, symbolGroupFilter]);

  // Filter stored datasets by search query and category tab
  const filteredDatasets = useMemo(() => {
    return datasets.filter((d) => {
      const matchesSearch =
        d.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.timeframe.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (libraryCategoryFilter === "all") return true;
      if (libraryCategoryFilter === "csv") return d.source === "custom_csv";
      return d.category === libraryCategoryFilter;
    });
  }, [datasets, searchQuery, libraryCategoryFilter]);

  // Check if lookback range was auto-clamped
  const effectiveRange = clampYahooRange(timeframe, range);
  const isRangeAdjusted = effectiveRange !== range;

  return (
    <div className="flex-1 overflow-y-auto bg-[#12141a] text-[#e0e0e0] p-4 md:p-6 lg:p-8 space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1a2333]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-sm shadow-cyan-500/10">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  Market Data & Model Hub
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold uppercase">
                  Institutional v2.0
                </span>
              </div>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                Fetch historical market data across exchanges, inspect candlestick bars, and export for model training and backtesting.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats & Top Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="px-3.5 py-1.5 rounded-xl bg-[#0e1422] border border-[#1b263b] text-center shadow-xs">
            <span className="text-[10px] text-[#64748b] uppercase font-semibold block">Stored Datasets</span>
            <span className="text-sm font-mono font-bold text-white">{datasets.length}</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-[#0e1422] border border-[#1b263b] text-center shadow-xs">
            <span className="text-[10px] text-[#64748b] uppercase font-semibold block">Total Data Points</span>
            <span className="text-sm font-mono font-bold text-cyan-400">
              {totalCandles.toLocaleString()}
            </span>
          </div>

          <button
            onClick={() => setIsCsvUploaderOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#121a2c] hover:bg-[#1a263e] border border-[#22314a] text-xs font-semibold text-emerald-400 transition-colors shadow-xs"
            title="Import custom CSV dataset from TradingView or Python"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload CSV</span>
          </button>

          <button
            onClick={loadDatasets}
            disabled={isLoading}
            className="p-2 rounded-xl bg-[#121824] border border-[#1e293b] text-[#94a3b8] hover:text-white transition-colors"
            title="Refresh library"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Fetch & Save Panel */}
      <div className="bg-[#0b0f19] border border-[#1a2333] rounded-2xl p-5 md:p-6 space-y-5 shadow-xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1a2333] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
              <Plus className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Fetch New Market Datasets
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#64748b]">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              Live Feeds: <strong className="text-[#cbd5e1]">NSE (Yahoo Finance)</strong> &{" "}
              <strong className="text-[#cbd5e1]">Binance Public API</strong>
            </span>
          </div>
        </div>

        {/* Symbol Selection Groups & Custom Input */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {["All", "Indian Indices", "Indian Equities", "Commodities", "Crypto", "Custom"].map(
                (grp) => (
                  <button
                    key={grp}
                    onClick={() => setSymbolGroupFilter(grp)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      symbolGroupFilter === grp
                        ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                        : "bg-[#121824] border-[#1e293b] text-[#94a3b8] hover:text-white hover:bg-[#162032]"
                    }`}
                  >
                    {grp}
                  </button>
                )
              )}

              {symbolGroupFilter !== "All" && symbolGroupFilter !== "Custom" && (
                <button
                  onClick={() => handleSelectGroup(symbolGroupFilter)}
                  className="px-2 py-1 rounded-lg bg-[#151e2f] hover:bg-[#1c2940] text-[11px] text-cyan-400 border border-cyan-500/30 transition-colors ml-1"
                >
                  Toggle All in {symbolGroupFilter}
                </button>
              )}
            </div>

            {/* Custom Ticker Input */}
            <form onSubmit={handleAddCustomTicker} className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Add custom ticker (e.g. AAPL, ZOMATO)"
                value={customTickerInput}
                onChange={(e) => setCustomTickerInput(e.target.value)}
                className="px-2.5 py-1 bg-[#121824] border border-[#1e293b] rounded-lg text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-cyan-500 font-mono w-56"
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-semibold transition-colors"
              >
                + Add
              </button>
            </form>
          </div>

          {/* Symbol Chips Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {filteredAvailableSymbols.map((item) => {
              const isSelected = selectedSymbols.includes(item.symbol);
              return (
                <button
                  key={item.symbol}
                  onClick={() => handleToggleSymbol(item.symbol)}
                  className={`p-2.5 rounded-xl text-left border transition-all relative ${
                    isSelected
                      ? "bg-emerald-500/15 border-emerald-500/50 text-white font-semibold shadow-xs shadow-emerald-500/10 ring-1 ring-emerald-500/30"
                      : "bg-[#121824] border-[#1e293b] text-[#94a3b8] hover:text-white hover:bg-[#162032]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-mono text-xs font-bold tracking-tight">{item.symbol}</span>
                    {isSelected && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    )}
                  </div>
                  <div className="text-[10px] text-[#64748b] truncate">{item.name}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls: Timeframe & Lookback Range */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-[#1a2333]">
          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">
              Candle Interval (Timeframe)
            </label>
            <div className="grid grid-cols-5 gap-1 bg-[#121824] p-1 rounded-xl border border-[#1e293b]">
              {(["1m", "5m", "15m", "1h", "1D"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`py-1.5 text-xs font-mono font-bold rounded-lg transition-all ${
                    timeframe === tf
                      ? "bg-cyan-500 text-black shadow-xs shadow-cyan-500/30"
                      : "text-[#64748b] hover:text-white"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#94a3b8]">Historical Lookback Range</label>
              {isRangeAdjusted && (
                <span className="text-[10px] text-amber-400 font-mono">
                  Auto-clamped to {effectiveRange}
                </span>
              )}
            </div>
            <div className="grid grid-cols-5 gap-1 bg-[#121824] p-1 rounded-xl border border-[#1e293b]">
              {[
                { id: "1d", label: "1D" },
                { id: "5d", label: "5D" },
                { id: "1mo", label: "1M" },
                { id: "3mo", label: "3M" },
                { id: "1y", label: "1Y" },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRange(r.id)}
                  className={`py-1.5 text-xs font-mono font-bold rounded-lg transition-all ${
                    range === r.id
                      ? "bg-cyan-500 text-black shadow-xs shadow-cyan-500/30"
                      : "text-[#64748b] hover:text-white"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-end">
            <button
              onClick={handleBatchFetchAndSave}
              disabled={isFetching || selectedSymbols.length === 0}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-[0.98]"
            >
              {isFetching ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Fetching & Storing Datasets...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Fetch & Store ({selectedSymbols.length}) Datasets</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Status / Feedback Alert */}
        {fetchStatus && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in duration-150 ${
              fetchStatus.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : fetchStatus.type === "error"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
            }`}
          >
            {fetchStatus.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : fetchStatus.type === "error" ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
            )}
            <span>{fetchStatus.message}</span>
          </div>
        )}
      </div>

      {/* Dataset Library Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Stored Datasets Library</h2>
            <p className="text-xs text-[#94a3b8]">
              Ready to inspect with interactive candlestick charts, export as CSV (for Python / ML), or test in the backtest terminal.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Category Filter Tabs */}
            <div className="hidden md:flex items-center gap-1 bg-[#121824] p-1 rounded-lg border border-[#1e293b] text-xs">
              {[
                { id: "all", label: "All" },
                { id: "stock", label: "Equities" },
                { id: "index", label: "Indices" },
                { id: "crypto", label: "Crypto" },
                { id: "commodity", label: "Commodities" },
                { id: "csv", label: "CSV Imports" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setLibraryCategoryFilter(tab.id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                    libraryCategoryFilter === tab.id
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "text-[#64748b] hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
              <input
                type="text"
                placeholder="Search datasets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#121824] border border-[#1e293b] rounded-lg text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-cyan-500/50 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Dataset Table / Cards Grid */}
        {filteredDatasets.length === 0 ? (
          <div className="bg-[#0b0f19] border border-[#1a2333] rounded-2xl p-12 text-center space-y-3">
            <Database className="w-9 h-9 text-[#64748b] mx-auto opacity-50" />
            <h3 className="text-sm font-semibold text-white">No Stored Datasets Found</h3>
            <p className="text-xs text-[#94a3b8] max-w-sm mx-auto">
              Select one or more instruments above and click &quot;Fetch & Store Datasets&quot; or upload a custom CSV file to start building your library.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDatasets.map((ds) => {
              // Extract preview close prices for sparkline
              const sparklinePoints =
                ds.candles && ds.candles.length > 0
                  ? ds.candles.map((c) => c.close)
                  : ds.stats?.high && ds.stats?.low && ds.stats?.avgClose
                  ? [ds.stats.low, ds.stats.avgClose, ds.stats.high]
                  : [100, 102, 101, 104];

              const isBullish =
                sparklinePoints[sparklinePoints.length - 1] >= sparklinePoints[0];

              return (
                <div
                  key={ds.id}
                  className="bg-[#0b0f19] border border-[#1a2333] hover:border-[#283852] rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/5 group"
                >
                  <div className="space-y-2.5">
                    {/* Card Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-white tracking-tight">
                          {ds.symbol}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#162030] text-[#94a3b8] uppercase font-semibold">
                          {ds.category}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
                        {ds.timeframe} • {ds.range}
                      </span>
                    </div>

                    <p className="text-xs text-[#94a3b8] truncate font-medium">{ds.name}</p>

                    {/* Sparkline Visual Trend */}
                    <div className="pt-1 pb-1">
                      <DatasetSparkline data={sparklinePoints} height={40} />
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#162030] text-[11px] font-mono">
                      <div className="text-[#64748b]">
                        Candles: <strong className="text-white">{ds.candleCount}</strong>
                      </div>
                      <div className="text-[#64748b]">
                        Volatility:{" "}
                        <strong className="text-cyan-400">{ds.stats?.volatilityPct ?? 0}%</strong>
                      </div>
                      {ds.stats?.avgClose !== undefined && (
                        <div className="text-[#64748b] truncate">
                          Avg:{" "}
                          <strong className="text-white">
                            {formatAssetPrice(ds.stats.avgClose, ds.symbol, ds.category)}
                          </strong>
                        </div>
                      )}
                      {ds.stats?.high !== undefined && ds.stats?.low !== undefined && (
                        <div className="text-[#64748b] truncate">
                          Range:{" "}
                          <span className="text-white">
                            {formatAssetPrice(ds.stats.low, ds.symbol, ds.category)} –{" "}
                            {formatAssetPrice(ds.stats.high, ds.symbol, ds.category)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Date Span */}
                    {ds.startDate && ds.endDate && (
                      <div className="text-[10px] text-[#64748b] font-mono flex items-center gap-1.5 pt-0.5">
                        <Calendar className="w-3 h-3 text-[#475569]" />
                        <span className="truncate">
                          {ds.startDate} – {ds.endDate}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-[#162030] text-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleInspect(ds)}
                        className="p-1.5 rounded-lg bg-[#131b2a] hover:bg-[#1a2538] text-cyan-400 hover:text-cyan-300 transition-colors"
                        title="Inspect interactive candlestick chart"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => downloadDatasetCSV(ds)}
                        className="p-1.5 rounded-lg bg-[#131b2a] hover:bg-[#1a2538] text-emerald-400 hover:text-emerald-300 transition-colors"
                        title="Download clean CSV for Python / Pandas / ML"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => downloadDatasetJSON(ds)}
                        className="p-1.5 rounded-lg bg-[#131b2a] hover:bg-[#1a2538] text-indigo-400 hover:text-indigo-300 transition-colors"
                        title="Download JSON format"
                      >
                        <FileCode className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDelete(ds.id, ds.name)}
                        className="p-1.5 rounded-lg bg-[#131b2a] hover:bg-rose-500/20 text-[#64748b] hover:text-rose-400 transition-colors"
                        title="Delete dataset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <Link
                      href={`/backtesting?symbol=${encodeURIComponent(ds.symbol)}&timeframe=${ds.timeframe}`}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all shadow-xs"
                      title="Run algorithmic backtest on this symbol"
                    >
                      <span>Backtest</span>
                      <Play className="w-3 h-3 fill-current" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dataset Inspector Modal */}
      {inspectingDataset && (
        <DatasetInspectorModal
          dataset={inspectingDataset}
          onClose={() => setInspectingDataset(null)}
          isLoading={isLoadingInspection}
        />
      )}

      {/* Custom CSV Dataset Uploader Modal */}
      {isCsvUploaderOpen && (
        <CsvDatasetUploaderModal
          onClose={() => setIsCsvUploaderOpen(false)}
          onSuccess={() => {
            loadDatasets();
            setFetchStatus({
              type: "success",
              message: "Custom CSV dataset successfully imported to your library!",
            });
            setTimeout(() => setFetchStatus(null), 5000);
          }}
        />
      )}
    </div>
  );
}
