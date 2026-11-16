"use client";

import React from "react";
import {
  PieChart,
  Scale,
  Percent,
  Layers,
  Coins,
  Receipt,
} from "lucide-react";
import { PositionSizingConfig, SizingType } from "@/types/strategy";
import { formatINR } from "@/lib/formatters";

interface PositionSizingSectionProps {
  config: PositionSizingConfig;
  onChange: (updated: Partial<PositionSizingConfig>) => void;
  initialCapital: number;
  symbol?: string;
}

export function PositionSizingSection({
  config,
  onChange,
  initialCapital,
}: PositionSizingSectionProps) {

  const sizingOptions: {
    id: SizingType;
    label: string;
    description: string;
    unit: string;
  }[] = [
    {
      id: "lots",
      label: "F&O Lots (Standard)",
      description: "Trades fixed exchange lots (e.g. 1-5 lots based on instrument lot size).",
      unit: "Lots",
    },
    {
      id: "fixed_amount",
      label: "Fixed INR (₹)",
      description: "Allocates a fixed rupee capital budget per trade execution.",
      unit: "₹",
    },
    {
      id: "percent_equity",
      label: "% of Account Equity",
      description: "Allocates a dynamic percentage of your total available margin balance.",
      unit: "%",
    },
    {
      id: "risk_based",
      label: "Risk-Based (% Risk)",
      description: "Calculates lot quantity so hitting Stop-Loss risks strictly X% of capital.",
      unit: "% Risk",
    },
  ];

  return (
    <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-5 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1a2230] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold font-mono">
            04
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Position Sizing & Fees</h2>
            <p className="text-xs text-[#94a3b8]">
              Configure lot sizing, capital allocation, brokerage fees, and taxes.
            </p>
          </div>
        </div>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#131b2a] text-emerald-400 border border-[#222e42]">
          Section 4 of 5
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sizing Method Picker */}
        <div className="space-y-2 lg:col-span-2">
          <label className="text-xs font-medium text-[#94a3b8] flex items-center gap-1.5">
            <PieChart className="w-3.5 h-3.5 text-emerald-400" />
            Sizing Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            {sizingOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ sizingType: opt.id })}
                className={`p-2.5 rounded-lg text-left border transition-all ${
                  config.sizingType === opt.id
                    ? "bg-emerald-500/10 border-emerald-500/40 text-white"
                    : "bg-[#131b2a] border-[#222e42] text-[#94a3b8] hover:text-white hover:bg-[#182338]"
                }`}
              >
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>{opt.label}</span>
                  <span className="text-[10px] font-mono text-emerald-400">{opt.unit}</span>
                </div>
                <p className="text-[11px] text-[#64748b] mt-1 line-clamp-1">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Sizing Value */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#94a3b8] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              Allocation Size
            </span>
            <span className="text-xs font-mono text-emerald-400">
              {config.sizingType === "percent_equity"
                ? `~${formatINR(initialCapital * ((config.sizingValue || 20) / 100))}`
                : config.sizingType === "lots"
                ? `${config.sizingValue} Lot${config.sizingValue > 1 ? "s" : ""}`
                : ""}
            </span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              min="1"
              value={config.sizingValue}
              onChange={(e) => onChange({ sizingValue: Number(e.target.value) || 1 })}
              className="w-full bg-[#131b2a] border border-[#222e42] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50"
            />
            <span className="absolute right-3 top-2 text-xs font-mono text-[#64748b]">
              {config.sizingType === "lots"
                ? "Lots"
                : config.sizingType === "fixed_amount"
                ? "₹"
                : config.sizingType === "risk_based"
                ? "% Risk"
                : "%"}
            </span>
          </div>
          <p className="text-[11px] text-[#64748b]">
            {config.sizingType === "lots"
              ? `Executes ${config.sizingValue} lot(s) per order.`
              : config.sizingType === "fixed_amount"
              ? "Fixed rupee capital allocated per position."
              : "Base position allocation per triggered signal."}
          </p>
        </div>

        {/* Lot Size Config (F&O Contracts) */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#94a3b8] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Contract Lot Size
            </span>
            <span className="text-[11px] text-[#64748b]">Shares/Units</span>
          </label>
          <input
            type="number"
            min="1"
            value={config.lotSize || 25}
            onChange={(e) => onChange({ lotSize: Number(e.target.value) || 25 })}
            className="w-full bg-[#131b2a] border border-[#222e42] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50"
          />
          <div className="flex gap-1 pt-1">
            {[
              { sym: "Nifty", sz: 25 },
              { sym: "BankNifty", sz: 15 },
              { sym: "FinNifty", sz: 25 },
              { sym: "Equity", sz: 1 },
            ].map((p) => (
              <button
                key={p.sym}
                type="button"
                onClick={() => onChange({ lotSize: p.sz })}
                className="text-[10px] px-1.5 py-0.5 rounded bg-[#131b2a] border border-[#1e2a3c] text-[#94a3b8] hover:text-white"
              >
                {p.sym} ({p.sz})
              </button>
            ))}
          </div>
        </div>

        {/* Max Concurrent Positions */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#94a3b8] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            Max Concurrent Trades
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => onChange({ maxOpenPositions: num })}
                className={`flex-1 py-2 rounded-lg text-xs font-mono font-medium border text-center transition-colors ${
                  config.maxOpenPositions === num
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold"
                    : "bg-[#131b2a] border-[#222e42] text-[#94a3b8] hover:text-white"
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Leverage */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#94a3b8] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-emerald-400" />
              Margin Leverage
            </span>
            <span className="text-xs font-mono text-white font-bold">{config.maxLeverage}x</span>
          </label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 5].map((lev) => (
              <button
                key={lev}
                type="button"
                onClick={() => onChange({ maxLeverage: lev })}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono border text-center transition-colors ${
                  config.maxLeverage === lev
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold"
                    : "bg-[#131b2a] border-[#222e42] text-[#94a3b8] hover:text-white"
                }`}
              >
                {lev}x
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#64748b]">Intraday margin multiplier.</p>
        </div>

        {/* Brokerage Model */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#94a3b8] flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-emerald-400" />
            Brokerage per Executed Order
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-xs font-bold text-[#64748b]">₹</span>
            <input
              type="number"
              min="0"
              value={config.feePerOrder ?? 20}
              onChange={(e) => onChange({ feePerOrder: Number(e.target.value) || 0 })}
              className="w-full bg-[#131b2a] border border-[#222e42] rounded-lg pl-7 pr-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <p className="text-[10px] text-[#64748b]">Flat ₹20 per executed order.</p>
        </div>

        {/* Slippage & Taxes */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#94a3b8] flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-emerald-400" />
            STT & Turnover Charges (%)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.005"
              min="0"
              value={config.sttTaxPct ?? 0.0125}
              onChange={(e) => onChange({ sttTaxPct: Number(e.target.value) || 0 })}
              className="w-full bg-[#131b2a] border border-[#222e42] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50"
            />
            <span className="absolute right-3 top-2 text-xs font-mono text-[#64748b]">%</span>
          </div>
          <p className="text-[10px] text-[#64748b]">Securities transaction tax and turnover charges.</p>
        </div>
      </div>
    </div>
  );
}
