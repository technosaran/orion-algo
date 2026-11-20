"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Layers,
  BarChart3,
  Users,
  Activity,
  Calendar,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  ExternalLink,
  ShieldAlert,
  Info,
} from "lucide-react";
import { formatINR } from "@/lib/formatters";

export default function NSETerminalPage() {
  const [activeTab, setActiveTab] = useState<"option-chain" | "fii-dii" | "gainers-losers" | "deals" | "corporate">("option-chain");
  const [selectedSymbol, setSelectedSymbol] = useState("NIFTY");
  const [loading, setLoading] = useState(false);
  const [indices, setIndices] = useState<any[]>([]);
  const [fiiDii, setFiiDii] = useState<any>(null);
  const [optionChain, setOptionChain] = useState<any>(null);
  const [gainersLosers, setGainersLosers] = useState<any>({ gainers: [], losers: [] });
  const [bulkDeals, setBulkDeals] = useState<any[]>([]);
  const [corpActions, setCorpActions] = useState<any[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [idxRes, fiiRes, ocRes, glRes, dealsRes, corpRes] = await Promise.all([
        fetch("/api/nse/indices").then((r) => r.json()).catch(() => ({ data: [] })),
        fetch("/api/nse/fii-dii").then((r) => r.json()).catch(() => null),
        fetch(`/api/nse/option-chain/${selectedSymbol}`).then((r) => r.json()).catch(() => null),
        fetch("/api/nse/gainers-losers").then((r) => r.json()).catch(() => ({ gainers: [], losers: [] })),
        fetch("/api/nse/bulk-deals").then((r) => r.json()).catch(() => []),
        fetch("/api/nse/corporate-actions").then((r) => r.json()).catch(() => []),
      ]);

      if (idxRes?.data) setIndices(idxRes.data);
      if (fiiRes) setFiiDii(fiiRes);
      if (ocRes?.records) setOptionChain(ocRes.records);
      if (glRes) setGainersLosers(glRes);
      if (Array.isArray(dealsRes)) setBulkDeals(dealsRes);
      if (Array.isArray(corpRes)) setCorpActions(corpRes);
      setLastRefreshed(new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [selectedSymbol]);

  const niftyIndex = indices.find((i) => i.index === "NIFTY 50") || { last: 24350.25, variation: 112.5, percentChange: 0.46 };
  const bankNifty = indices.find((i) => i.index === "NIFTY BANK") || { last: 52180.6, variation: 245.8, percentChange: 0.47 };
  const vix = indices.find((i) => i.index === "INDIA VIX") || { last: 12.85, variation: -0.42, percentChange: -3.16 };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#0b0e14] text-[#cbd5e1] space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1a2230]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
            <Zap className="w-3.5 h-3.5" />
            <span>Direct NSE India Exchange Gateway & Options Feed</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            NSE Live Data Terminal
          </h1>
          <p className="text-xs md:text-sm text-[#94a3b8] mt-1">
            Real-time Indian market feeds, live derivatives options chain, institutional FII/DII net flows, bulk deals, and corporate announcements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-[#64748b] block font-mono">Last Update (IST)</span>
            <span className="text-xs font-mono font-bold text-white">{lastRefreshed || "--:--:--"}</span>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-[#101726] hover:bg-[#162034] border border-[#1b263b] text-[#94a3b8] hover:text-white transition-colors"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Live Index Tickers (Zerodha Kite / NSE Style) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {indices.slice(0, 6).map((idx) => {
          const isUp = idx.percentChange >= 0;
          return (
            <div
              key={idx.index}
              className="p-3 rounded-xl bg-[#0e1422] border border-[#1b263b] hover:border-[#2d3f5e] transition-all"
            >
              <div className="text-[11px] text-[#94a3b8] font-semibold truncate">{idx.index}</div>
              <div className="text-base font-bold font-mono text-white mt-1">
                {idx.last?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className={`text-[11px] font-mono font-semibold flex items-center gap-0.5 mt-0.5 ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                <span>{isUp ? "+" : ""}{idx.percentChange}%</span>
                <span className="text-[#64748b] text-[10px]">({idx.variation > 0 ? "+" : ""}{idx.variation})</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1a2230] pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: "option-chain", label: "Option Chain & Greeks", icon: Layers },
          { id: "fii-dii", label: "Institutional FII / DII Flows", icon: Users },
          { id: "gainers-losers", label: "Market Movers & VIX", icon: Activity },
          { id: "deals", label: "Bulk & Block Deals", icon: BarChart3 },
          { id: "corporate", label: "Corporate Actions", icon: Calendar },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "text-[#94a3b8] hover:text-white hover:bg-[#121824]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Option Chain */}
      {activeTab === "option-chain" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0e1422] p-4 rounded-xl border border-[#1b263b]">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#94a3b8] font-medium">Underlying Instrument:</span>
              <div className="flex items-center gap-1.5">
                {["NIFTY", "BANKNIFTY", "FINNIFTY", "RELIANCE"].map((sym) => (
                  <button
                    key={sym}
                    onClick={() => setSelectedSymbol(sym)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                      selectedSymbol === sym
                        ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                        : "bg-[#141d2f] text-[#94a3b8] hover:text-white"
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-[#64748b]">Spot: </span>
                <span className="text-white font-bold">₹{optionChain?.underlyingValue?.toLocaleString("en-IN") || "--"}</span>
              </div>
              <div>
                <span className="text-[#64748b]">Max Pain: </span>
                <span className="text-cyan-400 font-bold">₹{optionChain?.maxPain?.toLocaleString("en-IN") || "--"}</span>
              </div>
              <div>
                <span className="text-[#64748b]">PCR: </span>
                <span className={`font-bold ${Number(optionChain?.pcr || 1) >= 1 ? "text-emerald-400" : "text-rose-400"}`}>
                  {optionChain?.pcr || "1.00"}
                </span>
              </div>
            </div>
          </div>

          {/* Option Chain Table */}
          <div className="overflow-x-auto rounded-xl border border-[#1b263b] bg-[#0c101a]">
            <table className="w-full text-xs text-left font-mono">
              <thead className="bg-[#121826] text-[#94a3b8] uppercase text-[10px] tracking-wider border-b border-[#1b263b]">
                <tr>
                  <th colSpan={5} className="py-2 px-3 text-center bg-emerald-950/20 text-emerald-400 border-r border-[#1b263b]">
                    CALLS (CE)
                  </th>
                  <th className="py-2 px-4 text-center bg-[#172033] text-white font-bold border-r border-[#1b263b]">
                    STRIKE
                  </th>
                  <th colSpan={5} className="py-2 px-3 text-center bg-rose-950/20 text-rose-400">
                    PUTS (PE)
                  </th>
                </tr>
                <tr className="border-b border-[#1b263b] text-[10px] text-[#64748b]">
                  <th className="py-2 px-2 text-right">OI</th>
                  <th className="py-2 px-2 text-right">Chg OI</th>
                  <th className="py-2 px-2 text-right">Volume</th>
                  <th className="py-2 px-2 text-right">IV%</th>
                  <th className="py-2 px-3 text-right font-bold text-white border-r border-[#1b263b]">LTP</th>
                  <th className="py-2 px-4 text-center bg-[#172033] text-white border-r border-[#1b263b]">Price</th>
                  <th className="py-2 px-3 text-left font-bold text-white">LTP</th>
                  <th className="py-2 px-2 text-left">IV%</th>
                  <th className="py-2 px-2 text-left">Volume</th>
                  <th className="py-2 px-2 text-left">Chg OI</th>
                  <th className="py-2 px-2 text-left">OI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#162033]">
                {optionChain?.data?.map((row: any) => {
                  const strike = row.strikePrice;
                  const isAtm = Math.abs(strike - (optionChain?.underlyingValue || 0)) < 30;
                  const ce = row.CE || {};
                  const pe = row.PE || {};

                  return (
                    <tr
                      key={strike}
                      className={`hover:bg-[#141b2c] transition-colors ${
                        isAtm ? "bg-cyan-950/30 font-semibold" : ""
                      }`}
                    >
                      <td className="py-2 px-2 text-right text-[#94a3b8]">{ce.openInterest?.toLocaleString("en-IN") || "--"}</td>
                      <td className={`py-2 px-2 text-right ${ce.changeinOpenInterest >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {ce.changeinOpenInterest > 0 ? "+" : ""}{ce.changeinOpenInterest?.toLocaleString("en-IN") || "--"}
                      </td>
                      <td className="py-2 px-2 text-right text-[#64748b]">{ce.totalTradedVolume?.toLocaleString("en-IN") || "--"}</td>
                      <td className="py-2 px-2 text-right text-cyan-400">{ce.impliedVolatility || "--"}%</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-400 border-r border-[#1b263b]">
                        ₹{ce.lastPrice?.toFixed(2) || "--"}
                      </td>
                      <td className={`py-2 px-4 text-center font-bold border-r border-[#1b263b] ${isAtm ? "bg-cyan-500/20 text-cyan-300" : "bg-[#101726] text-white"}`}>
                        {strike}
                      </td>
                      <td className="py-2 px-3 text-left font-bold text-rose-400">
                        ₹{pe.lastPrice?.toFixed(2) || "--"}
                      </td>
                      <td className="py-2 px-2 text-left text-cyan-400">{pe.impliedVolatility || "--"}%</td>
                      <td className="py-2 px-2 text-left text-[#64748b]">{pe.totalTradedVolume?.toLocaleString("en-IN") || "--"}</td>
                      <td className={`py-2 px-2 text-left ${pe.changeinOpenInterest >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {pe.changeinOpenInterest > 0 ? "+" : ""}{pe.changeinOpenInterest?.toLocaleString("en-IN") || "--"}
                      </td>
                      <td className="py-2 px-2 text-left text-[#94a3b8]">{pe.openInterest?.toLocaleString("en-IN") || "--"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: FII / DII Activity */}
      {activeTab === "fii-dii" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* FII Card */}
            <div className="p-5 rounded-2xl bg-[#0e1422] border border-[#1b263b] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1a2333]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  Foreign Institutional Investors (FII / FPI)
                </h3>
                <span className="text-[10px] font-mono text-[#64748b]">{fiiDii?.date}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2.5 rounded-xl bg-[#080b12] border border-[#162033]">
                  <span className="text-[10px] text-[#64748b] block">Gross Buy</span>
                  <span className="text-sm font-bold text-white">₹{fiiDii?.fii?.buyValue?.toLocaleString("en-IN")} Cr</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#080b12] border border-[#162033]">
                  <span className="text-[10px] text-[#64748b] block">Gross Sell</span>
                  <span className="text-sm font-bold text-white">₹{fiiDii?.fii?.sellValue?.toLocaleString("en-IN")} Cr</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#080b12] border border-[#162033]">
                  <span className="text-[10px] text-[#64748b] block">Net Inflow</span>
                  <span className={`text-sm font-bold ${fiiDii?.fii?.netValue >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {fiiDii?.fii?.netValue > 0 ? "+" : ""}₹{fiiDii?.fii?.netValue?.toLocaleString("en-IN")} Cr
                  </span>
                </div>
              </div>
            </div>

            {/* DII Card */}
            <div className="p-5 rounded-2xl bg-[#0e1422] border border-[#1b263b] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1a2333]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Domestic Institutional Investors (DII)
                </h3>
                <span className="text-[10px] font-mono text-[#64748b]">{fiiDii?.date}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2.5 rounded-xl bg-[#080b12] border border-[#162033]">
                  <span className="text-[10px] text-[#64748b] block">Gross Buy</span>
                  <span className="text-sm font-bold text-white">₹{fiiDii?.dii?.buyValue?.toLocaleString("en-IN")} Cr</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#080b12] border border-[#162033]">
                  <span className="text-[10px] text-[#64748b] block">Gross Sell</span>
                  <span className="text-sm font-bold text-white">₹{fiiDii?.dii?.sellValue?.toLocaleString("en-IN")} Cr</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#080b12] border border-[#162033]">
                  <span className="text-[10px] text-[#64748b] block">Net Inflow</span>
                  <span className={`text-sm font-bold ${fiiDii?.dii?.netValue >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {fiiDii?.dii?.netValue > 0 ? "+" : ""}₹{fiiDii?.dii?.netValue?.toLocaleString("en-IN")} Cr
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Derivatives Segment Stats */}
          <div className="p-5 rounded-2xl bg-[#0e1422] border border-[#1b263b] space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Institutional F&O Position Build-Up (Net Contracts / Contracts Value)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-[#080b12] border border-[#162033]">
                <span className="text-[#64748b] block text-[11px] mb-1">Index Futures Net</span>
                <div className="flex justify-between items-center">
                  <span className="text-cyan-300">FII: +₹{fiiDii?.fno?.indexFutures?.fiiNet} Cr</span>
                  <span className="text-[#94a3b8]">DII: ₹{fiiDii?.fno?.indexFutures?.diiNet} Cr</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#080b12] border border-[#162033]">
                <span className="text-[#64748b] block text-[11px] mb-1">Stock Futures Net</span>
                <div className="flex justify-between items-center">
                  <span className="text-cyan-300">FII: +₹{fiiDii?.fno?.stockFutures?.fiiNet} Cr</span>
                  <span className="text-emerald-400">DII: +₹{fiiDii?.fno?.stockFutures?.diiNet} Cr</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#080b12] border border-[#162033]">
                <span className="text-[#64748b] block text-[11px] mb-1">Index Options Net</span>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-400 font-bold">FII: +₹{fiiDii?.fno?.indexOptions?.fiiNet} Cr</span>
                  <span className="text-rose-400">DII: ₹{fiiDii?.fno?.indexOptions?.diiNet} Cr</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Gainers & Losers */}
      {activeTab === "gainers-losers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Gainers */}
          <div className="p-4 rounded-xl bg-[#0e1422] border border-emerald-500/30 space-y-3">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Top Nifty 50 Gainers
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left font-mono">
                <thead className="text-[10px] text-[#64748b] border-b border-[#1b263b]">
                  <tr>
                    <th className="py-2">Symbol</th>
                    <th className="py-2 text-right">LTP (₹)</th>
                    <th className="py-2 text-right">% Change</th>
                    <th className="py-2 text-right">Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#162033]">
                  {gainersLosers.gainers.map((g: any) => (
                    <tr key={g.symbol} className="hover:bg-[#121929]">
                      <td className="py-2 font-bold text-white">{g.symbol}</td>
                      <td className="py-2 text-right text-[#cbd5e1]">{g.ltp?.toFixed(2)}</td>
                      <td className="py-2 text-right text-emerald-400 font-bold">+{g.pChange}%</td>
                      <td className="py-2 text-right text-[#64748b]">{g.volume?.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Losers */}
          <div className="p-4 rounded-xl bg-[#0e1422] border border-rose-500/30 space-y-3">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Top Nifty 50 Losers
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left font-mono">
                <thead className="text-[10px] text-[#64748b] border-b border-[#1b263b]">
                  <tr>
                    <th className="py-2">Symbol</th>
                    <th className="py-2 text-right">LTP (₹)</th>
                    <th className="py-2 text-right">% Change</th>
                    <th className="py-2 text-right">Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#162033]">
                  {gainersLosers.losers.map((l: any) => (
                    <tr key={l.symbol} className="hover:bg-[#121929]">
                      <td className="py-2 font-bold text-white">{l.symbol}</td>
                      <td className="py-2 text-right text-[#cbd5e1]">{l.ltp?.toFixed(2)}</td>
                      <td className="py-2 text-right text-rose-400 font-bold">{l.pChange}%</td>
                      <td className="py-2 text-right text-[#64748b]">{l.volume?.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Bulk Deals */}
      {activeTab === "deals" && (
        <div className="p-4 rounded-xl bg-[#0e1422] border border-[#1b263b] space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Live Institutional Bulk Deals Scanner
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono">
              <thead className="text-[10px] text-[#64748b] border-b border-[#1b263b]">
                <tr>
                  <th className="py-2">Date</th>
                  <th className="py-2">Symbol</th>
                  <th className="py-2">Client Name</th>
                  <th className="py-2">Action</th>
                  <th className="py-2 text-right">Quantity</th>
                  <th className="py-2 text-right">Trade Price (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#162033]">
                {bulkDeals.map((d: any, idx: number) => (
                  <tr key={idx} className="hover:bg-[#121929]">
                    <td className="py-2.5 text-[#94a3b8]">{d.date}</td>
                    <td className="py-2.5 font-bold text-white">{d.symbol}</td>
                    <td className="py-2.5 text-[#cbd5e1]">{d.clientName}</td>
                    <td className="py-2.5 font-bold">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${d.dealType === "BUY" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
                        {d.dealType}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-white font-bold">{d.quantity?.toLocaleString("en-IN")}</td>
                    <td className="py-2.5 text-right text-cyan-400 font-bold">₹{d.tradePrice?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Corporate Actions */}
      {activeTab === "corporate" && (
        <div className="p-4 rounded-xl bg-[#0e1422] border border-[#1b263b] space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            Upcoming Corporate Actions & Dividend Calendar
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono">
              <thead className="text-[10px] text-[#64748b] border-b border-[#1b263b]">
                <tr>
                  <th className="py-2">Symbol</th>
                  <th className="py-2">Purpose / Event</th>
                  <th className="py-2">Ex-Date</th>
                  <th className="py-2">Record Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#162033]">
                {corpActions.map((c: any, idx: number) => (
                  <tr key={idx} className="hover:bg-[#121929]">
                    <td className="py-2.5 font-bold text-white">{c.symbol}</td>
                    <td className="py-2.5 text-emerald-400 font-medium">{c.purpose}</td>
                    <td className="py-2.5 text-[#cbd5e1]">{c.exDate}</td>
                    <td className="py-2.5 text-[#94a3b8]">{c.recordDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
