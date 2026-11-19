"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import {
  X,
  Download,
  FileSpreadsheet,
  FileCode,
  Play,
  Calendar,
  Layers,
  TrendingUp,
  BarChart2,
  Table,
  Search,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Info,
} from "lucide-react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  UTCTimestamp,
  IChartApi,
} from "lightweight-charts";
import { StoredDataset } from "@/types/dataset";
import { CandleData } from "@/types/paperTrading";
import { formatAssetPrice, getCurrencySymbol } from "@/lib/formatters";
import { downloadDatasetCSV, downloadDatasetJSON } from "@/lib/datasetStorage";

interface DatasetInspectorModalProps {
  dataset: StoredDataset;
  onClose: () => void;
  isLoading?: boolean;
}

export function DatasetInspectorModal({
  dataset,
  onClose,
  isLoading = false,
}: DatasetInspectorModalProps) {
  const [activeTab, setActiveTab] = useState<"chart" | "table">("chart");
  const [tableSearch, setTableSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Hover data state
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);

  // Sanitize and sort candles ascending by timestamp for Lightweight Charts
  const sortedCandles = useMemo(() => {
    if (!dataset.candles || dataset.candles.length === 0) return [];
    const sorted = [...dataset.candles].sort((a, b) => a.timestamp - b.timestamp);
    const result: CandleData[] = [];
    let lastSec = -Infinity;

    for (const c of sorted) {
      let sec = Math.floor(c.timestamp / 1000);
      if (sec <= lastSec) {
        sec = lastSec + 1;
      }
      lastSec = sec;
      result.push({
        ...c,
        timestamp: sec * 1000,
      });
    }
    return result;
  }, [dataset.candles]);

  // Initialize or re-render Lightweight Chart
  useEffect(() => {
    if (activeTab !== "chart" || !chartContainerRef.current || sortedCandles.length === 0) {
      return;
    }

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 380,
      layout: {
        background: { type: ColorType.Solid, color: "#080b12" },
        textColor: "#94a3b8",
        fontSize: 11,
        fontFamily: "'Geist Mono', monospace, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(30, 41, 59, 0.4)" },
        horzLines: { color: "rgba(30, 41, 59, 0.4)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "#475569",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1e293b",
        },
        horzLine: {
          color: "#475569",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1e293b",
        },
      },
      timeScale: {
        borderColor: "#1e293b",
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 10,
        minBarSpacing: 3,
      },
      localization: {
        priceFormatter: (p: number) => formatAssetPrice(p, dataset.symbol, dataset.category),
      },
      rightPriceScale: {
        borderColor: "#1e293b",
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
    });

    chartRef.current = chart;

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderUpColor: "#10b981",
      borderDownColor: "#f43f5e",
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
    });

    const candleData = sortedCandles.map((c) => ({
      time: Math.floor(c.timestamp / 1000) as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeries.setData(candleData);

    // Volume series (histogram)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume_scale",
    });

    chart.priceScale("volume_scale").applyOptions({
      scaleMargins: {
        top: 0.82,
        bottom: 0,
      },
    });

    const volumeData = sortedCandles.map((c) => ({
      time: Math.floor(c.timestamp / 1000) as UTCTimestamp,
      value: c.volume || 0,
      color: c.close >= c.open ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)",
    }));
    volumeSeries.setData(volumeData);

    // Crosshair move subscription
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setHoveredCandle(null);
        return;
      }
      const data = param.seriesData.get(candleSeries) as any;
      if (data) {
        const found = sortedCandles.find(
          (c) => Math.floor(c.timestamp / 1000) === (param.time as number)
        );
        if (found) {
          setHoveredCandle(found);
        } else {
          setHoveredCandle({
            time: new Date((param.time as number) * 1000).toLocaleString(),
            timestamp: (param.time as number) * 1000,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
            volume: 0,
          });
        }
      }
    });

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [activeTab, sortedCandles, dataset.symbol, dataset.category]);

  // Filtered table rows
  const filteredTableCandles = useMemo(() => {
    if (!sortedCandles) return [];
    if (!tableSearch.trim()) return sortedCandles;
    const q = tableSearch.toLowerCase();
    return sortedCandles.filter(
      (c) =>
        c.time.toLowerCase().includes(q) ||
        c.close.toString().includes(q) ||
        c.open.toString().includes(q)
    );
  }, [sortedCandles, tableSearch]);

  const totalPages = Math.ceil(filteredTableCandles.length / pageSize) || 1;
  const currentTablePageCandles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTableCandles.slice(start, start + pageSize);
  }, [filteredTableCandles, currentPage]);

  const stats = dataset.stats || {
    high: sortedCandles.length > 0 ? Math.max(...sortedCandles.map((c) => c.high)) : 0,
    low: sortedCandles.length > 0 ? Math.min(...sortedCandles.map((c) => c.low)) : 0,
    avgClose:
      sortedCandles.length > 0
        ? Number((sortedCandles.reduce((s, c) => s + c.close, 0) / sortedCandles.length).toFixed(2))
        : 0,
    volatilityPct: 0,
    atr: 0,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0b0f19] border border-[#1e293b] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-[#1a2333] bg-[#0d1322]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">{dataset.symbol}</h3>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  {dataset.timeframe}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1e293b] text-[#94a3b8] uppercase">
                  {dataset.category || "Dataset"}
                </span>
              </div>
              <p className="text-xs text-[#94a3b8] mt-0.5 flex items-center gap-2">
                <span>{dataset.name}</span>
                <span>•</span>
                <span>{dataset.candleCount || sortedCandles.length} candles stored</span>
                {dataset.startDate && dataset.endDate && (
                  <>
                    <span>•</span>
                    <span className="text-cyan-400">
                      {dataset.startDate} – {dataset.endDate}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <Link
              href={`/backtesting?symbol=${encodeURIComponent(dataset.symbol)}&timeframe=${dataset.timeframe}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition-all shadow-sm"
              title="Launch instant strategy backtest with this dataset"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Backtest Strategy</span>
            </Link>

            <button
              onClick={() => downloadDatasetCSV(dataset)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#131b2a] hover:bg-[#1a2538] text-emerald-400 border border-emerald-500/30 transition-colors"
              title="Download clean CSV for Python / Pandas / ML"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            <button
              onClick={() => downloadDatasetJSON(dataset)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#131b2a] hover:bg-[#1a2538] text-indigo-400 border border-indigo-500/30 transition-colors"
              title="Download JSON format"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">JSON</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#64748b] hover:text-white hover:bg-[#162032] transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-4 border-b border-[#162030] bg-[#090d16] text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-[#0e1422] border border-[#1a2333]">
            <span className="text-[10px] text-[#64748b] block uppercase">Highest High</span>
            <span className="text-sm font-bold text-emerald-400">
              {formatAssetPrice(stats.high, dataset.symbol, dataset.category)}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0e1422] border border-[#1a2333]">
            <span className="text-[10px] text-[#64748b] block uppercase">Lowest Low</span>
            <span className="text-sm font-bold text-rose-400">
              {formatAssetPrice(stats.low, dataset.symbol, dataset.category)}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0e1422] border border-[#1a2333]">
            <span className="text-[10px] text-[#64748b] block uppercase">Average Close</span>
            <span className="text-sm font-bold text-white">
              {formatAssetPrice(stats.avgClose, dataset.symbol, dataset.category)}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0e1422] border border-[#1a2333]">
            <span className="text-[10px] text-[#64748b] block uppercase">Volatility (StdDev)</span>
            <span className="text-sm font-bold text-cyan-400">{stats.volatilityPct ?? 0}%</span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0e1422] border border-[#1a2333]">
            <span className="text-[10px] text-[#64748b] block uppercase">ATR Estimate</span>
            <span className="text-sm font-bold text-amber-400">
              {stats.atr ? formatAssetPrice(stats.atr, dataset.symbol, dataset.category) : "—"}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0e1422] border border-[#1a2333]">
            <span className="text-[10px] text-[#64748b] block uppercase">Total Candles</span>
            <span className="text-sm font-bold text-white">
              {(dataset.candleCount || sortedCandles.length).toLocaleString()}
            </span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center justify-between px-6 pt-3 pb-1 border-b border-[#162030] bg-[#0a0e18]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("chart")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "chart"
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40"
                  : "text-[#64748b] hover:text-white"
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Interactive Candlestick Chart</span>
            </button>

            <button
              onClick={() => setActiveTab("table")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "table"
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40"
                  : "text-[#64748b] hover:text-white"
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Candle Records Ledger</span>
            </button>
          </div>

          {activeTab === "chart" && hoveredCandle && (
            <div className="hidden md:flex items-center gap-3 text-[11px] font-mono bg-[#111726] px-3 py-1 rounded-lg border border-[#1b263b]">
              <span className="text-[#64748b]">{hoveredCandle.time}</span>
              <span>
                O:{" "}
                <strong className="text-white">
                  {formatAssetPrice(hoveredCandle.open, dataset.symbol, dataset.category)}
                </strong>
              </span>
              <span>
                H:{" "}
                <strong className="text-emerald-400">
                  {formatAssetPrice(hoveredCandle.high, dataset.symbol, dataset.category)}
                </strong>
              </span>
              <span>
                L:{" "}
                <strong className="text-rose-400">
                  {formatAssetPrice(hoveredCandle.low, dataset.symbol, dataset.category)}
                </strong>
              </span>
              <span>
                C:{" "}
                <strong className="text-cyan-400">
                  {formatAssetPrice(hoveredCandle.close, dataset.symbol, dataset.category)}
                </strong>
              </span>
              <span>
                Vol: <strong className="text-[#94a3b8]">{hoveredCandle.volume?.toLocaleString()}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#080b12]">
          {isLoading ? (
            <div className="h-80 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-[#94a3b8] font-mono">Loading dataset bars from storage...</p>
            </div>
          ) : sortedCandles.length === 0 ? (
            <div className="h-80 flex flex-col items-center justify-center text-center text-[#64748b] space-y-2">
              <Info className="w-8 h-8 mx-auto" />
              <p className="text-sm font-semibold text-white">No Candle Data Found</p>
              <p className="text-xs max-w-sm">
                This dataset file might only contain summary metadata or has expired from cache.
              </p>
            </div>
          ) : activeTab === "chart" ? (
            <div className="space-y-2">
              <div
                ref={chartContainerRef}
                className="w-full rounded-xl border border-[#1a2333] overflow-hidden bg-[#080b12]"
                style={{ height: 380 }}
              />
              <div className="flex items-center justify-between text-[10px] text-[#64748b] px-1 font-mono">
                <span>Hover or drag crosshair across chart to inspect OHLCV bars. Scroll wheel to zoom.</span>
                <span>Powered by Lightweight Charts v5</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Table search & pagination header */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
                  <input
                    type="text"
                    placeholder="Search candle date or price..."
                    value={tableSearch}
                    onChange={(e) => {
                      setTableSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-8 pr-3 py-1.5 bg-[#101624] border border-[#1e293b] rounded-lg text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-cyan-500/50 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-[#64748b]">
                    Page {currentPage} of {totalPages} ({filteredTableCandles.length} rows)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1 rounded bg-[#101624] border border-[#1e293b] text-[#94a3b8] hover:text-white disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1 rounded bg-[#101624] border border-[#1e293b] text-[#94a3b8] hover:text-white disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="border border-[#1a2333] rounded-xl overflow-hidden bg-[#090d16]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0f1728] border-b border-[#1a2333] text-[#64748b]">
                    <tr>
                      <th className="py-2.5 px-3">Date / Time</th>
                      <th className="py-2.5 px-3 text-right">Open</th>
                      <th className="py-2.5 px-3 text-right">High</th>
                      <th className="py-2.5 px-3 text-right">Low</th>
                      <th className="py-2.5 px-3 text-right">Close</th>
                      <th className="py-2.5 px-3 text-right">Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#131b2c]">
                    {currentTablePageCandles.map((c, i) => (
                      <tr key={i} className="hover:bg-[#121a2c] transition-colors">
                        <td className="py-2 px-3 text-[#cbd5e1] font-semibold">{c.time}</td>
                        <td className="py-2 px-3 text-right text-[#94a3b8]">
                          {formatAssetPrice(c.open, dataset.symbol, dataset.category)}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-400 font-semibold">
                          {formatAssetPrice(c.high, dataset.symbol, dataset.category)}
                        </td>
                        <td className="py-2 px-3 text-right text-rose-400 font-semibold">
                          {formatAssetPrice(c.low, dataset.symbol, dataset.category)}
                        </td>
                        <td className="py-2 px-3 text-right text-white font-bold">
                          {formatAssetPrice(c.close, dataset.symbol, dataset.category)}
                        </td>
                        <td className="py-2 px-3 text-right text-[#64748b]">
                          {c.volume ? c.volume.toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
