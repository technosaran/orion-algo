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

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 font-sans">
      {/* 1. Total Portfolio Equity */}
      <div className="p-3 rounded-xl bg-[#191c24] border border-[#232733] hover:border-[#2a2f3e] transition-colors relative overflow-hidden group">
        <div className="flex items-center justify-between text-xs text-[#9b9b9b] mb-1">
          <span className="font-medium text-[11px]">Total Equity</span>
          <div className="p-1 rounded bg-[#14171f] text-[#4caf50] border border-[#232733]">
            <Wallet className="w-3 h-3" />
          </div>
        </div>
        <div className="text-lg font-bold font-mono tabular-nums text-white tracking-tight">
          {formatINR(summary.totalEquity, { decimals: 2 })}
        </div>
        <div className="flex items-center gap-1 mt-1 text-[11px]">
          <span
            className={`flex items-center font-mono tabular-nums font-semibold ${
              isPositiveEquity ? "text-[#4caf50]" : "text-[#df514c]"
            }`}
          >
            {isPositiveEquity ? (
              <TrendingUp className="w-3 h-3 mr-0.5 inline" />
            ) : (
              <TrendingDown className="w-3 h-3 mr-0.5 inline" />
            )}
            {isPositiveEquity ? "+" : ""}
            {returnPercent.toFixed(2)}%
          </span>
          <span className="text-[#666666] font-mono tabular-nums text-[10px]">
            ({formatINR(returnDollar, { showSign: true, decimals: 0 })})
          </span>
        </div>
      </div>

      {/* 2. Free Buying Power */}
      <div className="p-3 rounded-xl bg-[#191c24] border border-[#232733] hover:border-[#2a2f3e] transition-colors relative overflow-hidden group">
        <div className="flex items-center justify-between text-xs text-[#9b9b9b] mb-1">
          <span className="font-medium text-[11px]">Buying Power</span>
          <div className="p-1 rounded bg-[#14171f] text-[#4184f3] border border-[#232733]">
            <IndianRupee className="w-3 h-3" />
          </div>
        </div>
        <div className="text-lg font-bold font-mono tabular-nums text-white tracking-tight">
          {formatINR(summary.cashBalance, { decimals: 2 })}
        </div>
        <div className="flex items-center justify-between mt-1 text-[11px] text-[#666666]">
          <span>Cash Available</span>
          <span className="text-[#4caf50] font-mono tabular-nums text-[10px] font-semibold">100% Free</span>
        </div>
      </div>

      {/* 3. Allocated Margin */}
      <div className="p-3 rounded-xl bg-[#191c24] border border-[#232733] hover:border-[#2a2f3e] transition-colors relative overflow-hidden group">
        <div className="flex items-center justify-between text-xs text-[#9b9b9b] mb-1">
          <span className="font-medium text-[11px]">Allocated Margin</span>
          <div className="p-1 rounded bg-[#14171f] text-amber-400 border border-[#232733]">
            <Layers className="w-3 h-3" />
          </div>
        </div>
        <div className="text-lg font-bold font-mono tabular-nums text-white tracking-tight">
          {formatINR(summary.marginUsed, { decimals: 2 })}
        </div>
        <div className="flex items-center justify-between mt-1 text-[11px] text-[#666666]">
          <span>Positions:</span>
          <span className="font-semibold text-white font-mono tabular-nums">{openPositionsCount} active</span>
        </div>
      </div>

      {/* 4. Unrealized P&L */}
      <div className="p-3 rounded-xl bg-[#191c24] border border-[#232733] hover:border-[#2a2f3e] transition-colors relative overflow-hidden group">
        <div className="flex items-center justify-between text-xs text-[#9b9b9b] mb-1">
          <span className="font-medium text-[11px]">Unrealized P&L</span>
          <div
            className={`p-1 rounded border border-[#232733] ${
              isPositiveUnrealized
                ? "bg-[#14171f] text-[#4caf50]"
                : "bg-[#14171f] text-[#df514c]"
            }`}
          >
            <Activity className="w-3 h-3" />
          </div>
        </div>
        <div
          className={`text-lg font-bold font-mono tabular-nums tracking-tight ${
            isPositiveUnrealized ? "text-[#4caf50]" : "text-[#df514c]"
          }`}
        >
          {formatINR(summary.unrealizedPnl, { showSign: true, decimals: 2 })}
        </div>
        <div className="flex items-center justify-between mt-1 text-[11px] text-[#666666]">
          <span>Open Return:</span>
          <span
            className={`font-semibold font-mono tabular-nums ${
              isPositiveUnrealized ? "text-[#4caf50]" : "text-[#df514c]"
            }`}
          >
            {summary.marginUsed > 0
              ? `${isPositiveUnrealized ? "+" : ""}${((summary.unrealizedPnl / summary.marginUsed) * 100).toFixed(2)}%`
              : "0.00%"}
          </span>
        </div>
      </div>

      {/* 5. Realized P&L & Win Rate */}
      <div className="p-3 rounded-xl bg-[#191c24] border border-[#232733] hover:border-[#2a2f3e] transition-colors relative overflow-hidden group col-span-2 sm:col-span-1">
        <div className="flex items-center justify-between text-xs text-[#9b9b9b] mb-1">
          <span className="font-medium text-[11px]">Realized P&L</span>
          <div className="p-1 rounded bg-[#14171f] text-[#4184f3] border border-[#232733]">
            <Award className="w-3 h-3" />
          </div>
        </div>
        <div
          className={`text-lg font-bold font-mono tabular-nums tracking-tight ${
            isPositiveRealized ? "text-[#4caf50]" : "text-[#df514c]"
          }`}
        >
          {formatINR(summary.realizedPnl, { showSign: true, decimals: 2 })}
        </div>
        <div className="flex items-center justify-between mt-1 text-[11px] text-[#666666]">
          <span>Win Rate:</span>
          <span className="font-semibold text-white font-mono tabular-nums">
            {summary.winRate}% ({summary.winningTrades}/{summary.totalTrades})
          </span>
        </div>
      </div>
    </div>
  );
}
