"use client";

import React from "react";
import {
  Wallet,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Layers,
  Activity,
  Award,
} from "lucide-react";
import { PortfolioSummary } from "@/types/paperTrading";
import { formatINR } from "@/lib/formatters";

interface PortfolioCardsProps {
  summary: PortfolioSummary;
  openPositionsCount: number;
}

export function PortfolioCards({ summary, openPositionsCount }: PortfolioCardsProps) {
  const returnDollar = summary.totalEquity - summary.initialBalance;
  const returnPercent = (returnDollar / summary.initialBalance) * 100;
  const isPositiveEquity = returnDollar >= 0;
  const isPositiveUnrealized = summary.unrealizedPnl >= 0;
  const isPositiveRealized = summary.realizedPnl >= 0;

  const marginPct =
    summary.totalEquity > 0
      ? Math.min(Math.round((summary.marginUsed / summary.totalEquity) * 100), 100)
      : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
      {/* 1. Total Portfolio Equity */}
      <div className="p-4 rounded-xl bg-[#0b0f19] border border-[#1a2333] hover:border-[#24324a] transition-colors relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
        <div className="flex items-center justify-between text-xs text-[#94a3b8] mb-1.5">
          <span className="font-medium">Total Equity</span>
          <div className="p-1 rounded bg-[#131b2c] text-emerald-400">
            <Wallet className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl font-bold text-white tracking-tight">
          {formatINR(summary.totalEquity, { decimals: 2 })}
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-xs">
          <span
            className={`flex items-center font-semibold ${
              isPositiveEquity ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {isPositiveEquity ? (
              <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 mr-0.5 inline" />
            )}
            {isPositiveEquity ? "+" : ""}
            {returnPercent.toFixed(2)}%
          </span>
          <span className="text-[#64748b]">
            ({formatINR(returnDollar, { showSign: true, decimals: 2 })})
          </span>
        </div>
      </div>

      {/* 2. Free Buying Power */}
      <div className="p-4 rounded-xl bg-[#0b0f19] border border-[#1a2333] hover:border-[#24324a] transition-colors relative overflow-hidden group">
        <div className="flex items-center justify-between text-xs text-[#94a3b8] mb-1.5">
          <span className="font-medium">Buying Power</span>
          <div className="p-1 rounded bg-[#131b2c] text-cyan-400">
            <IndianRupee className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl font-bold text-white tracking-tight">
          {formatINR(summary.cashBalance, { decimals: 2 })}
        </div>
        <div className="mt-2.5">
          <div className="flex justify-between text-[11px] text-[#64748b] mb-1">
            <span>Free Cash</span>
            <span className="text-[#cbd5e1]">{100 - marginPct}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#162032] overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-300"
              style={{ width: `${Math.max(100 - marginPct, 5)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Allocated Margin */}
      <div className="p-4 rounded-xl bg-[#0b0f19] border border-[#1a2333] hover:border-[#24324a] transition-colors relative overflow-hidden group">
        <div className="flex items-center justify-between text-xs text-[#94a3b8] mb-1.5">
          <span className="font-medium">Allocated Margin</span>
          <div className="p-1 rounded bg-[#131b2c] text-amber-400">
            <Layers className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl font-bold text-white tracking-tight">
          {formatINR(summary.marginUsed, { decimals: 2 })}
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-[#64748b]">
          <span>Open Positions:</span>
          <span className="font-semibold text-[#cbd5e1]">{openPositionsCount}</span>
        </div>
      </div>

      {/* 4. Unrealized P&L */}
      <div className="p-4 rounded-xl bg-[#0b0f19] border border-[#1a2333] hover:border-[#24324a] transition-colors relative overflow-hidden group">
        <div className="flex items-center justify-between text-xs text-[#94a3b8] mb-1.5">
          <span className="font-medium">Unrealized P&L</span>
          <div
            className={`p-1 rounded ${
              isPositiveUnrealized
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-rose-500/10 text-rose-400"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
          </div>
        </div>
        <div
          className={`text-xl font-bold tracking-tight ${
            isPositiveUnrealized ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {formatINR(summary.unrealizedPnl, { showSign: true, decimals: 2 })}
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-xs text-[#64748b]">
          <span>Margin Return:</span>
          <span
            className={`font-semibold ${
              isPositiveUnrealized ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {summary.marginUsed > 0
              ? `${isPositiveUnrealized ? "+" : ""}${((summary.unrealizedPnl / summary.marginUsed) * 100).toFixed(2)}%`
              : "0.00%"}
          </span>
        </div>
      </div>

      {/* 5. Realized P&L & Win Rate */}
      <div className="p-4 rounded-xl bg-[#0b0f19] border border-[#1a2333] hover:border-[#24324a] transition-colors relative overflow-hidden group">
        <div className="flex items-center justify-between text-xs text-[#94a3b8] mb-1.5">
          <span className="font-medium">Realized P&L</span>
          <div className="p-1 rounded bg-[#131b2c] text-purple-400">
            <Award className="w-3.5 h-3.5" />
          </div>
        </div>
        <div
          className={`text-xl font-bold tracking-tight ${
            isPositiveRealized ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {formatINR(summary.realizedPnl, { showSign: true, decimals: 2 })}
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-[#64748b]">
          <span>Win Rate:</span>
          <span className="font-semibold text-white">
            {summary.winRate}% <span className="text-[10px] text-[#64748b]">({summary.winningTrades}/{summary.totalTrades})</span>
          </span>
        </div>
      </div>
    </div>
  );
}
