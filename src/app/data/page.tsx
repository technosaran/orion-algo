"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { StoredDataset } from "@/types/dataset";
import { ChartTimeframe, CandleData } from "@/types/paperTrading";
import {
  getStoredDatasets,
  getDatasetById,
  deleteStoredDataset,
  downloadDatasetCSV,
  downloadDatasetJSON,
} from "@/lib/datasetStorage";
import { formatINR } from "@/lib/formatters";

const AVAILABLE_SYMBOLS = [
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
  { symbol: "GOLD", name: "Gold Spot (MCX/COMEX)", category: "commodity", group: "Commodities" },
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

  // Fetch Form State
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(["NIFTY50", "RELIANCE"]);
  const [timeframe, setTimeframe] = useState<ChartTimeframe>("15m");
  const [range, setRange] = useState<string>("1mo");
  const [isFetching, setIsFetching] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<string | null>(null);

  // Inspector Modal State
  const [inspectingDataset, setInspectingDataset] = useState<StoredDataset | null>(null);
  const [isLoadingInspection, setIsLoadingInspection] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
    const groupSyms = AVAILABLE_SYMBOLS.filter((s) => s.group === groupName).map((s) => s.symbol);
    const allSelected = groupSyms.every((s) => selectedSymbols.includes(s));
    if (allSelected) {
      setSelectedSymbols((prev) => prev.filter((s) => !groupSyms.includes(s)));
    } else {
      setSelectedSymbols((prev) => Array.from(new Set([...prev, ...groupSyms])));
    }
  };

  const handleBatchFetchAndSave = async () => {
    if (selectedSymbols.length === 0) return;
    setIsFetching(true);
    setFetchStatus(`Fetching market data for ${selectedSymbols.length} symbol(s)...`);

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
        setFetchStatus(`Successfully fetched and stored ${data.count} dataset(s)!`);
        await loadDatasets();
        setTimeout(() => setFetchStatus(null), 5000);
      } else {
        setFetchStatus(`Error: ${data.message || "Failed to fetch datasets"}`);
      }
    } catch (err: any) {
      setFetchStatus(`Network error: ${err.message}`);
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

  const totalCandles = datasets.reduce((sum, d) => sum + (d.candleCount || 0), 0);

  const filteredDatasets = datasets.filter(
    (d) =>
      d.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.timeframe.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto bg-[#080a0f] text-[#cbd5e1] p-4 md:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1a2333]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                Market Data & Training Hub
              </h1>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                Fetch historical market data across exchanges, store datasets, and export for model training and backtesting.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-[#0e1422] border border-[#1b263b] text-center">
            <span className="text-[10px] text-[#64748b] uppercase font-semibold block">Stored Datasets</span>
            <span className="text-sm font-mono font-bold text-white">{datasets.length}</span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-[#0e1422] border border-[#1b263b] text-center">
            <span className="text-[10px] text-[#64748b] uppercase font-semibold block">Total Data Points</span>
            <span className="text-sm font-mono font-bold text-cyan-400">{totalCandles.toLocaleString()}</span>
          </div>

          <button
            onClick={loadDatasets}
            disabled={isLoading}
            className="p-2 rounded-lg bg-[#121824] border border-[#1e293b] text-[#94a3b8] hover:text-white transition-colors"
            title="Refresh library"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Fetch & Save Panel */}
      <div className="bg-[#0b0f19] border border-[#1a2333] rounded-xl p-5 space-y-5 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1a2333] pb-3">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Fetch New Market Datasets
            </h2>
          </div>
          <span className="text-xs text-[#64748b]">
            Sources: <strong className="text-white">Yahoo Finance</strong> & <strong className="text-white">Binance</strong>
          </span>
        </div>

        {/* Symbol Selection Groups */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#94a3b8]">Select Instruments to Fetch & Store:</label>
            <div className="flex items-center gap-2 text-xs">
              {["Indian Indices", "Indian Equities", "Commodities", "Crypto"].map((grp) => (
                <button
                  key={grp}
                  onClick={() => handleSelectGroup(grp)}
                  className="px-2 py-0.5 rounded bg-[#121824] hover:bg-[#1a2538] text-[11px] text-[#cbd5e1] border border-[#1e293b] transition-colors"
                >
                  Toggle {grp}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {AVAILABLE_SYMBOLS.map((item) => {
              const isSelected = selectedSymbols.includes(item.symbol);
              return (
                <button
                  key={item.symbol}
                  onClick={() => handleToggleSymbol(item.symbol)}
                  className={`p-2 rounded-lg text-left text-xs border transition-all ${
                    isSelected
                      ? "bg-emerald-500/15 border-emerald-500/40 text-white font-semibold shadow-xs"
                      : "bg-[#121824] border-[#1e293b] text-[#94a3b8] hover:text-white hover:bg-[#162032]"
                  }`}
                >
                  <div className="font-mono text-xs">{item.symbol}</div>
                  <div className="text-[10px] text-[#64748b] truncate">{item.name}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls: Timeframe & Lookback Range */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#1a2333]">
          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">Candle Interval (Timeframe)</label>
            <div className="grid grid-cols-5 gap-1 bg-[#121824] p-1 rounded-lg border border-[#1e293b]">
              {(["1m", "5m", "15m", "1h", "1D"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`py-1 text-xs font-mono font-semibold rounded transition-colors ${
                    timeframe === tf ? "bg-cyan-500 text-black shadow-xs" : "text-[#64748b] hover:text-white"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">Historical Lookback Range</label>
            <div className="grid grid-cols-5 gap-1 bg-[#121824] p-1 rounded-lg border border-[#1e293b]">
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
                  className={`py-1 text-xs font-mono font-semibold rounded transition-colors ${
                    range === r.id ? "bg-cyan-500 text-black shadow-xs" : "text-[#64748b] hover:text-white"
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
              className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-[0.98]"
            >
              {isFetching ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Fetching & Storing Data...</span>
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

        {fetchStatus && (
          <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{fetchStatus}</span>
          </div>
        )}
      </div>

      {/* Dataset Library Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Stored Datasets Library</h2>
            <p className="text-xs text-[#94a3b8]">
              Datasets ready to export as CSV (for Python / ML models) or test in the backtest terminal.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input
              type="text"
              placeholder="Search datasets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#121824] border border-[#1e293b] rounded-lg text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Dataset Table / Cards */}
        {filteredDatasets.length === 0 ? (
          <div className="bg-[#0b0f19] border border-[#1a2333] rounded-xl p-12 text-center space-y-3">
            <Database className="w-8 h-8 text-[#64748b] mx-auto" />
            <h3 className="text-sm font-semibold text-white">No Stored Datasets Found</h3>
            <p className="text-xs text-[#94a3b8] max-w-sm mx-auto">
              Select one or more instruments above and click &quot;Fetch & Store Datasets&quot; to download and persist historical data.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDatasets.map((ds) => (
              <div
                key={ds.id}
                className="bg-[#0b0f19] border border-[#1a2333] hover:border-[#24324a] rounded-xl p-4 flex flex-col justify-between space-y-3 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-white">{ds.symbol}</span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {ds.timeframe} • {ds.range}
                    </span>
                  </div>

                  <p className="text-xs text-[#94a3b8] truncate">{ds.name}</p>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#162030] text-[11px] font-mono">
                    <div className="text-[#64748b]">
                      Candles: <strong className="text-white">{ds.candleCount}</strong>
                    </div>
                    <div className="text-[#64748b]">
                      Volatility: <strong className="text-cyan-400">{ds.stats?.volatilityPct ?? 0}%</strong>
                    </div>
                    {ds.stats?.avgClose && (
                      <div className="text-[#64748b]">
                        Avg Close: <strong className="text-white">₹{ds.stats.avgClose}</strong>
                      </div>
                    )}
                    {ds.stats?.high && (
                      <div className="text-[#64748b]">
                        Range: <span className="text-white">₹{ds.stats.low} - ₹{ds.stats.high}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Toolbar */}
                <div className="flex items-center justify-between pt-2 border-t border-[#162030] text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleInspect(ds)}
                      className="p-1.5 rounded bg-[#131b2a] hover:bg-[#1a2538] text-cyan-400 hover:text-cyan-300 transition-colors"
                      title="Inspect dataset"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={async () => {
                        const full = await getDatasetById(ds.id);
                        if (full) downloadDatasetCSV(full);
                        else downloadDatasetCSV(ds);
                      }}
                      className="p-1.5 rounded bg-[#131b2a] hover:bg-[#1a2538] text-emerald-400 hover:text-emerald-300 transition-colors"
                      title="Download CSV for Python / ML training"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={async () => {
                        const full = await getDatasetById(ds.id);
                        if (full) downloadDatasetJSON(full);
                        else downloadDatasetJSON(ds);
                      }}
                      className="p-1.5 rounded bg-[#131b2a] hover:bg-[#1a2538] text-indigo-400 hover:text-indigo-300 transition-colors"
                      title="Download JSON"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(ds.id, ds.name)}
                      className="p-1.5 rounded bg-[#131b2a] hover:bg-rose-500/20 text-[#64748b] hover:text-rose-400 transition-colors"
                      title="Delete dataset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <Link
                    href={`/backtesting?symbol=${ds.symbol}`}
                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
                  >
                    <span>Backtest</span>
                    <Play className="w-3 h-3 fill-current" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dataset Inspector Modal */}
      {inspectingDataset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0b0e14] border border-[#1e2a3c] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a2230]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{inspectingDataset.name}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {inspectingDataset.timeframe}
                    </span>
                  </h3>
                  <p className="text-xs text-[#94a3b8]">
                    {inspectingDataset.candleCount} candles stored • Source: {inspectingDataset.source}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadDatasetCSV(inspectingDataset)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
                <button
                  onClick={() => setInspectingDataset(null)}
                  className="p-1.5 rounded-lg text-[#64748b] hover:text-white hover:bg-[#161f30] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Stats & Candle Bars Table */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Stat Cards */}
              {inspectingDataset.stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-[#121824] border border-[#1e293b]">
                    <span className="text-[#64748b] block text-[10px]">High Price</span>
                    <span className="text-sm font-bold text-emerald-400">₹{inspectingDataset.stats.high}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#121824] border border-[#1e293b]">
                    <span className="text-[#64748b] block text-[10px]">Low Price</span>
                    <span className="text-sm font-bold text-rose-400">₹{inspectingDataset.stats.low}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#121824] border border-[#1e293b]">
                    <span className="text-[#64748b] block text-[10px]">Average Close</span>
                    <span className="text-sm font-bold text-white">₹{inspectingDataset.stats.avgClose}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#121824] border border-[#1e293b]">
                    <span className="text-[#64748b] block text-[10px]">Price Volatility</span>
                    <span className="text-sm font-bold text-cyan-400">{inspectingDataset.stats.volatilityPct}%</span>
                  </div>
                </div>
              )}

              {/* Candle Table */}
              <div className="border border-[#1a2333] rounded-xl overflow-hidden">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="sticky top-0 bg-[#0e1422] border-b border-[#1a2333] text-[#64748b]">
                      <tr>
                        <th className="py-2 px-3">Date / Time</th>
                        <th className="py-2 px-3 text-right">Open</th>
                        <th className="py-2 px-3 text-right">High</th>
                        <th className="py-2 px-3 text-right">Low</th>
                        <th className="py-2 px-3 text-right">Close</th>
                        <th className="py-2 px-3 text-right">Volume</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#131b2c] bg-[#070a10]">
                      {isLoadingInspection ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#64748b]">
                            Loading candle bars...
                          </td>
                        </tr>
                      ) : !inspectingDataset.candles || inspectingDataset.candles.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#64748b]">
                            No candles in preview.
                          </td>
                        </tr>
                      ) : (
                        inspectingDataset.candles.slice(-100).map((c, i) => (
                          <tr key={i} className="hover:bg-[#0f1728]">
                            <td className="py-1.5 px-3 text-[#cbd5e1]">{c.time}</td>
                            <td className="py-1.5 px-3 text-right text-[#94a3b8]">₹{c.open}</td>
                            <td className="py-1.5 px-3 text-right text-emerald-400">₹{c.high}</td>
                            <td className="py-1.5 px-3 text-right text-rose-400">₹{c.low}</td>
                            <td className="py-1.5 px-3 text-right text-white font-bold">₹{c.close}</td>
                            <td className="py-1.5 px-3 text-right text-[#64748b]">{c.volume?.toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
