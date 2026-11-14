"use client";

import React from "react";
import {
  Globe,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Coins,
  Layers,
  IndianRupee,
  Briefcase,
} from "lucide-react";
import {
  StrategyConfig,
  AssetClass,
  ProductType,
  Timeframe,
  OrderDirection,
  OrderType,
} from "@/types/strategy";
import { formatINR } from "@/lib/formatters";

interface GeneralInfoSectionProps {
  strategy: StrategyConfig;
  onChange: (updated: Partial<StrategyConfig>) => void;
}

const INDIAN_SYMBOLS: Record<string, string[]> = {
  nse_fno: ["NIFTY 50", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "SENSEX"],
  nse_equity: ["RELIANCE", "HDFCBANK", "ICICIBANK", "TCS", "INFY", "TATAMOTORS", "SBIN"],
  mcx_commodity: ["CRUDEOIL", "GOLD", "SILVER", "NATURALGAS"],
  bse_equity: ["SENSEX", "BANKEX"],
  equities: ["RELIANCE", "TCS", "INFY", "HDFCBANK"],
  crypto: ["BTC/INR", "ETH/INR", "USDT/INR"],
  forex: ["USD/INR", "EUR/INR", "GBP/INR", "JPY/INR"],
  commodities: ["CRUDEOIL", "GOLD", "SILVER"],
};

export function GeneralInfoSection({ strategy, onChange }: GeneralInfoSectionProps) {
  const assetClasses: { id: AssetClass; label: string; badge: string }[] = [
    { id: "nse_fno", label: "NSE F&O (Futures & Options)", badge: "NSE" },
    { id: "nse_equity", label: "NSE Equity / Cash", badge: "NSE" },
    { id: "mcx_commodity", label: "MCX Commodities", badge: "MCX" },
    { id: "bse_equity", label: "BSE Cash / Indices", badge: "BSE" },
  ];

  const productTypes: { id: ProductType; label: string; desc: string }[] = [
    { id: "MIS", label: "MIS (Intraday)", desc: "Margin Intraday Square-off (Auto exit at 15:15 IST)" },
    { id: "CNC", label: "CNC (Delivery)", desc: "Cash & Carry for 100% equity delivery trades" },
    { id: "NRML", label: "NRML (Overnight F&O)", desc: "Normal margin for carrying F&O contracts till expiry" },
  ];

  const timeframes: Timeframe[] = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1D"];

  const categories: { id: StrategyConfig["category"]; label: string; desc: string }[] = [
    { id: "momentum", label: "Momentum", desc: "Exploit high-velocity directional surges" },
    { id: "scalping", label: "Intraday Scalping", desc: "Rapid short-duration micro trades (3m/5m)" },
    { id: "trend", label: "Trend Following", desc: "Ride dominant market trend (Supertrend/EMA)" },
    { id: "breakout", label: "Range Breakout", desc: "Enter on opening range or 20-period breakout" },
    { id: "mean_reversion", label: "Mean Reversion", desc: "Fade extremes back to VWAP / 20-SMA" },
  ];

  const popularSymbols = INDIAN_SYMBOLS[strategy.assetClass] || INDIAN_SYMBOLS.nse_fno;

  return (
    <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-5 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1a2230] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold font-mono">
            01
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Indian Market Segment & Instrument Setup</h2>
            <p className="text-xs text-[#94a3b8]">
              Configure NSE / BSE / MCX exchange segment, product type (MIS / CNC / NRML), and trading parameters.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            INR (₹) Base
          </span>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#131b2a] text-[#94a3b8] border border-[#222e42]">
            Section 1 of 5
          </span>
        </div>
      </div>

      {/* Grid Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Strategy Archetype */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#94a3b8] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            Strategy Archetype
          </label>
          <select
            value={strategy.category}
            onChange={(e) => onChange({ category: e.target.value as StrategyConfig["category"] })}
            className="w-full bg-[#131b2a] border border-[#222e42] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} ({c.desc})
              </option>
            ))}
          </select>
        </div>

        {/* Indian Exchange Segment */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#94a3b8] flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            Exchange Segment
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {assetClasses.map((ac) => (
              <button
                key={ac.id}
                type="button"
                onClick={() => {
                  const defaultSymbol = INDIAN_SYMBOLS[ac.id]?.[0] || "NIFTY 50";
                  onChange({ assetClass: ac.id, symbol: defaultSymbol });
                }}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  strategy.assetClass === ac.id
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-semibold"
                    : "bg-[#131b2a] border-[#222e42] text-[#94a3b8] hover:text-white hover:bg-[#182338]"
                }`}
              >
                <span className="truncate">{ac.label}</span>
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-[#1e2a3c] text-[#cbd5e1] ml-1">
                  {ac.badge}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Symbol / Instrument */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#94a3b8] flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-emerald-400" />
            Trading Symbol / Contract
          </label>
          <input
            type="text"
            value={strategy.symbol}
            onChange={(e) => onChange({ symbol: e.target.value.toUpperCase() })}
            className="w-full bg-[#131b2a] border border-[#222e42] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50 uppercase"
            placeholder="e.g. NIFTY 50, BANKNIFTY, RELIANCE, CRUDEOIL"
          />
          {/* Quick symbol presets */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {popularSymbols.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => onChange({ symbol: sym })}
                className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors ${
                  strategy.symbol === sym
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold"
                    : "bg-[#131b2a] text-[#64748b] border-[#1e293b] hover:text-white"
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        {/* Indian Broker Product Type (MIS, CNC, NRML) */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#94a3b8] flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
            Product Type (Order Mode)
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {productTypes.map((pt) => (
              <button
                key={pt.id}
                type="button"
                onClick={() => onChange({ productType: pt.id })}
                className={`py-2 px-2 rounded-lg text-xs font-medium border text-center transition-colors flex flex-col items-center ${
                  (strategy.productType || "MIS") === pt.id
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold"
                    : "bg-[#131b2a] border-[#222e42] text-[#94a3b8] hover:text-white"
                }`}
                title={pt.desc}
              >
                <span className="font-mono text-sm">{pt.id}</span>
                <span className="text-[10px] text-[#64748b] mt-0.5">{pt.label.split(" ")[1] || pt.id}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Timeframe */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#94a3b8] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            Candle Timeframe
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {timeframes.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => onChange({ timeframe: tf })}
                className={`py-1.5 rounded-lg text-xs font-medium border text-center transition-colors ${
                  strategy.timeframe === tf
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-semibold"
                    : "bg-[#131b2a] border-[#222e42] text-[#94a3b8] hover:text-white hover:bg-[#182338]"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Direction */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#94a3b8] flex items-center gap-1.5">
            <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
            Execution Direction
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: "long" as OrderDirection, label: "Long (Buy)", icon: ArrowUpRight, color: "text-emerald-400" },
              { id: "short" as OrderDirection, label: "Short (Sell)", icon: ArrowDownRight, color: "text-rose-400" },
              { id: "both" as OrderDirection, label: "Both (Bi-Dir)", icon: ArrowLeftRight, color: "text-cyan-400" },
            ].map((dir) => {
              const Icon = dir.icon;
              return (
                <button
                  key={dir.id}
                  type="button"
                  onClick={() => onChange({ direction: dir.id })}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg text-xs font-medium border transition-colors ${
                    strategy.direction === dir.id
                      ? "bg-emerald-500/10 border-emerald-500/40 text-white font-semibold"
                      : "bg-[#131b2a] border-[#222e42] text-[#94a3b8] hover:text-white hover:bg-[#182338]"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${dir.color} mb-0.5`} />
                  <span>{dir.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Initial Capital in INR (₹) */}
        <div className="space-y-2 lg:col-span-3">
          <label className="text-xs font-medium text-[#94a3b8] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
              Trading Capital (INR)
            </span>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              {formatINR(strategy.initialCapital || 100000)}
            </span>
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2 text-sm text-[#64748b] font-bold">₹</span>
              <input
                type="number"
                min="10000"
                step="10000"
                value={strategy.initialCapital}
                onChange={(e) => onChange({ initialCapital: Number(e.target.value) || 100000 })}
                className="w-full bg-[#131b2a] border border-[#222e42] rounded-lg pl-8 pr-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 items-center">
              {[
                { label: "₹50K", val: 50000 },
                { label: "₹1 Lakh", val: 100000 },
                { label: "₹2 Lakhs", val: 200000 },
                { label: "₹5 Lakhs", val: 500000 },
                { label: "₹10 Lakhs", val: 1000000 },
              ].map((c) => (
                <button
                  key={c.val}
                  type="button"
                  onClick={() => onChange({ initialCapital: c.val })}
                  className={`px-2.5 py-1.5 text-xs font-mono font-medium rounded-lg border transition-colors ${
                    strategy.initialCapital === c.val
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold"
                      : "bg-[#131b2a] text-[#94a3b8] border-[#222e42] hover:text-white"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <select
              value={strategy.orderType}
              onChange={(e) => onChange({ orderType: e.target.value as OrderType })}
              className="bg-[#131b2a] border border-[#222e42] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50 shrink-0"
            >
              <option value="market">MARKET Order</option>
              <option value="limit">LIMIT Order</option>
              <option value="stop_market">SL-M (Stop-Loss Market)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
