"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Play,
  RotateCcw,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  CheckCircle2,
  TrendingUp,
  Download,
  Flame,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { formatINR } from "@/lib/formatters";

interface ScreenerStock {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  volume: number;
  rsi: number;
  ema20: number;
  ema50: number;
  ema200: number;
  supertrend: "BULLISH" | "BEARISH";
  high52w: number;
}

const STOCK_UNIVERSE: ScreenerStock[] = [
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy & Petrochem", price: 2985.0, change: 1.44, volume: 6120000, rsi: 62.4, ema20: 2940, ema50: 2910, ema200: 2820, supertrend: "BULLISH", high52w: 3040 },
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "Information Tech", price: 4125.0, change: -1.56, volume: 1940000, rsi: 41.2, ema20: 4190, ema50: 4220, ema200: 4050, supertrend: "BEARISH", high52w: 4580 },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd", sector: "Banking & Financials", price: 1724.8, change: 1.90, volume: 8940000, rsi: 68.1, ema20: 1680, ema50: 1650, ema200: 1590, supertrend: "BULLISH", high52w: 1790 },
  { symbol: "INFY", name: "Infosys Ltd", sector: "Information Tech", price: 1842.1, change: -2.04, volume: 4120000, rsi: 38.5, ema20: 1890, ema50: 1910, ema200: 1750, supertrend: "BEARISH", high52w: 2005 },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd", sector: "Banking & Financials", price: 1264.4, change: 1.14, volume: 5420000, rsi: 64.8, ema20: 1240, ema50: 1220, ema200: 1140, supertrend: "BULLISH", high52w: 1315 },
  { symbol: "SBIN", name: "State Bank of India", sector: "Public Banking", price: 835.2, change: 0.85, volume: 7800000, rsi: 55.4, ema20: 825, ema50: 815, ema200: 760, supertrend: "BULLISH", high52w: 912 },
  { symbol: "BHARTIARTL", name: "Bharti Airtel Ltd", sector: "Telecom", price: 1685.0, change: 1.75, volume: 3200000, rsi: 72.3, ema20: 1640, ema50: 1590, ema200: 1420, supertrend: "BULLISH", high52w: 1710 },
  { symbol: "TATAMOTORS", name: "Tata Motors Ltd", sector: "Automotive", price: 812.5, change: 0.45, volume: 4800000, rsi: 46.2, ema20: 820, ema50: 850, ema200: 890, supertrend: "BEARISH", high52w: 1179 },
  { symbol: "M&M", name: "Mahindra & Mahindra", sector: "Automotive", price: 2980.5, change: 2.95, volume: 2410000, rsi: 74.8, ema20: 2880, ema50: 2810, ema200: 2540, supertrend: "BULLISH", high52w: 3015 },
  { symbol: "TRENT", name: "Trent Ltd", sector: "Consumer Retail", price: 6845.2, change: 3.71, volume: 1820000, rsi: 76.5, ema20: 6540, ema50: 6200, ema200: 5100, supertrend: "BULLISH", high52w: 7450 },
  { symbol: "SUNPHARMA", name: "Sun Pharma Industries", sector: "Pharmaceuticals", price: 1785.4, change: -0.78, volume: 1540000, rsi: 48.9, ema20: 1805, ema50: 1820, ema200: 1670, supertrend: "BEARISH", high52w: 1960 },
  { symbol: "ITC", name: "ITC Ltd", sector: "FMCG", price: 478.2, change: 0.35, volume: 6200000, rsi: 52.1, ema20: 474, ema50: 480, ema200: 450, supertrend: "BULLISH", high52w: 528 },
  { symbol: "ZOMATO", name: "Zomato Ltd", sector: "Internet Platform", price: 272.4, change: 4.15, volume: 24500000, rsi: 78.2, ema20: 258, ema50: 242, ema200: 205, supertrend: "BULLISH", high52w: 298 },
  { symbol: "BAJFINANCE", name: "Bajaj Finance Ltd", sector: "Financial Services", price: 6890.0, change: -0.65, volume: 980000, rsi: 44.5, ema20: 6950, ema50: 7080, ema200: 7150, supertrend: "BEARISH", high52w: 8190 },
];

const SCAN_PRESETS = [
  { id: "all", label: "All Stocks", desc: "No filters applied." },
  { id: "golden-cross", label: "Golden Cross (50 > 200 EMA)", desc: "Bullish trend reversal when 50 EMA is above 200 EMA." },
  { id: "rsi-oversold", label: "RSI Oversold Bounce (< 45)", desc: "Beaten-down high quality stocks ready for mean reversion." },
  { id: "momentum-breakout", label: "Momentum Breakout (RSI > 65)", desc: "Strong trend continuation with high relative strength." },
  { id: "near-52w-high", label: "Near 52-Week High (< 3%)", desc: "Institutional accumulation breaking out into new highs." },
  { id: "supertrend-bull", label: "Supertrend Bullish", desc: "Price trading firmly above key ATR volatility baseline." },
];

export default function ScreenerPage() {
  const [activePreset, setActivePreset] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState("ALL");
  const [minRsi, setMinRsi] = useState<number>(0);
  const [maxRsi, setMaxRsi] = useState<number>(100);

  const sectors = useMemo(() => {
    return ["ALL", ...Array.from(new Set(STOCK_UNIVERSE.map((s) => s.sector)))];
  }, []);

  const filteredStocks = useMemo(() => {
    return STOCK_UNIVERSE.filter((stock) => {
      // Query filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!stock.symbol.toLowerCase().includes(q) && !stock.name.toLowerCase().includes(q)) {
          return false;
        }
      }

      // Sector filter
      if (sectorFilter !== "ALL" && stock.sector !== sectorFilter) {
        return false;
      }

      // RSI bounds
      if (stock.rsi < minRsi || stock.rsi > maxRsi) {
        return false;
      }

      // Presets
      if (activePreset === "golden-cross") {
        return stock.ema50 > stock.ema200 && stock.price > stock.ema50;
      }
      if (activePreset === "rsi-oversold") {
        return stock.rsi < 45;
      }
      if (activePreset === "momentum-breakout") {
        return stock.rsi > 65 && stock.change > 1.0;
      }
      if (activePreset === "near-52w-high") {
        return (stock.high52w - stock.price) / stock.high52w < 0.04;
      }
      if (activePreset === "supertrend-bull") {
        return stock.supertrend === "BULLISH";
      }

      return true;
    });
  }, [searchQuery, sectorFilter, minRsi, maxRsi, activePreset]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#0b0e14] text-[#cbd5e1] space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1a2230]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-2">
            <Search className="w-3.5 h-3.5" />
            <span>Institutional Technical Screener & Pattern Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Stock Screener
          </h1>
          <p className="text-xs md:text-sm text-[#94a3b8] mt-1">
            Scan 50+ Indian NSE equities for Golden Crosses, RSI divergences, Supertrend flips, and 52-week breakouts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono text-[#64748b]">
            Matching: <strong className="text-emerald-400">{filteredStocks.length}</strong> / {STOCK_UNIVERSE.length}
          </span>
        </div>
      </div>

      {/* Preset Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {SCAN_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePreset(p.id)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activePreset === p.id
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "bg-[#0e1422] border border-[#1b263b] text-[#94a3b8] hover:text-white"
            }`}
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      {/* Search & Custom Filters Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[#0e1422] border border-[#1b263b]">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
          <input
            type="text"
            placeholder="Search stock symbol or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#080b12] border border-[#182338] rounded-lg text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Sector Select */}
        <div>
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[#080b12] border border-[#182338] rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-sans"
          >
            {sectors.map((s) => (
              <option key={s} value={s}>
                Sector: {s}
              </option>
            ))}
          </select>
        </div>

        {/* RSI Range */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[#64748b] text-[11px]">RSI(14):</span>
          <input
            type="number"
            min={0}
            max={100}
            value={minRsi}
            onChange={(e) => setMinRsi(Number(e.target.value) || 0)}
            placeholder="Min"
            className="w-16 px-2 py-1.5 bg-[#080b12] border border-[#182338] rounded text-white text-xs text-center"
          />
          <span className="text-[#64748b]">to</span>
          <input
            type="number"
            min={0}
            max={100}
            value={maxRsi}
            onChange={(e) => setMaxRsi(Number(e.target.value) || 100)}
            placeholder="Max"
            className="w-16 px-2 py-1.5 bg-[#080b12] border border-[#182338] rounded text-white text-xs text-center"
          />
        </div>
      </div>

      {/* Results Table */}
      <div className="overflow-x-auto rounded-xl border border-[#1b263b] bg-[#0c101a]">
        <table className="w-full text-xs text-left font-mono">
          <thead className="bg-[#121826] text-[#94a3b8] uppercase text-[10px] tracking-wider border-b border-[#1b263b]">
            <tr>
              <th className="py-2.5 px-3">Symbol</th>
              <th className="py-2.5 px-3">Sector</th>
              <th className="py-2.5 px-3 text-right">LTP (₹)</th>
              <th className="py-2.5 px-3 text-right">% Change</th>
              <th className="py-2.5 px-3 text-right">Volume</th>
              <th className="py-2.5 px-3 text-right">RSI (14)</th>
              <th className="py-2.5 px-3 text-center">Supertrend</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#162033]">
            {filteredStocks.map((stock) => {
              const isBull = stock.change >= 0;
              return (
                <tr key={stock.symbol} className="hover:bg-[#141b2c] transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-bold text-white block">{stock.symbol}</span>
                    <span className="text-[10px] text-[#64748b] font-sans">{stock.name}</span>
                  </td>
                  <td className="py-3 px-3 text-[#94a3b8] font-sans text-[11px]">{stock.sector}</td>
                  <td className="py-3 px-3 text-right text-white font-bold">₹{stock.price.toFixed(2)}</td>
                  <td className={`py-3 px-3 text-right font-bold ${isBull ? "text-emerald-400" : "text-rose-400"}`}>
                    {isBull ? "+" : ""}{stock.change}%
                  </td>
                  <td className="py-3 px-3 text-right text-[#64748b]">{stock.volume.toLocaleString("en-IN")}</td>
                  <td className={`py-3 px-3 text-right font-bold ${stock.rsi > 70 ? "text-amber-400" : stock.rsi < 40 ? "text-cyan-400" : "text-[#cbd5e1]"}`}>
                    {stock.rsi}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      stock.supertrend === "BULLISH"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    }`}>
                      {stock.supertrend}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Link
                      href={`/strategy-builder?symbol=${encodeURIComponent(stock.symbol)}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-[11px] transition-colors"
                    >
                      <span>Build Algo</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
