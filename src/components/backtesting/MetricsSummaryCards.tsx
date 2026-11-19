"use client";

import React from "react";
import { BacktestSummary } from "@/lib/backtest/types";
import {
  TrendingUp,
  TrendingDown,
  Percent,
  Zap,
  ShieldAlert,
  Award,
  IndianRupee,
} from "lucide-react";
import { formatINR } from "@/lib/formatters";

interface MetricsSummaryCardsProps {
  summary: BacktestSummary;
}

export function MetricsSummaryCards({ summary }: MetricsSummaryCardsProps) {
  const isNetProfitPositive = summary.netProfit >= 0;
  const isAlphaPositive = summary.alpha >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 font-sans">
      {/* 1. Net Profit */}
      <div className="bg-[#191c24] border border-[#232733] rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-[#2a2f3e] transition-all">
        <div className="flex items-center justify-between text-xs text-[#9b9b9b]">
          <span className="font-medium text-[11px]">Net Profit (INR)</span>
          <div
            className={`p-1.5 rounded-md border border-[#232733] ${
              isNetProfitPositive
                ? "bg-[#14171f] text-[#4caf50]"
                : "bg-[#14171f] text-[#df514c]"
            }`}
          >
            {isNetProfitPositive ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
          </div>
        </div>
        <div className="mt-2.5">
          <div
            className={`text-xl font-bold font-mono tabular-nums tracking-tight ${
              isNetProfitPositive ? "text-[#4caf50]" : "text-[#df514c]"
            }`}
          >
            {formatINR(summary.netProfit, { showSign: true, decimals: 2 })}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs">
            <span
              className={`font-mono tabular-nums font-semibold ${
                isNetProfitPositive ? "text-[#4caf50]" : "text-[#df514c]"
              }`}
            >
              {isNetProfitPositive ? "+" : ""}
              {summary.netProfitPct.toFixed(2)}%
            </span>
            <span className="text-[#666666]">|</span>
            <span
              className={`font-mono tabular-nums text-[11px] font-semibold ${
                isAlphaPositive ? "text-[#4184f3]" : "text-[#9b9b9b]"
              }`}
              title="Alpha over benchmark"
            >
              α {isAlphaPositive ? "+" : ""}
              {summary.alpha.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* 2. Win Rate */}
      <div className="bg-[#191c24] border border-[#232733] rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-[#2a2f3e] transition-all">
        <div className="flex items-center justify-between text-xs text-[#9b9b9b]">
          <span className="font-medium text-[11px]">Win Rate</span>
          <div className="p-1.5 rounded-md bg-[#14171f] text-[#4184f3] border border-[#232733]">
            <Percent className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-xl font-bold font-mono tabular-nums text-white tracking-tight">
            {summary.winRatePct.toFixed(1)}%
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-[#666666]">
            <span>Trades:</span>
            <span className="font-mono tabular-nums text-[#e0e0e0]">
              <strong className="text-[#4caf50]">{summary.winningTrades}W</strong> /{" "}
              <strong className="text-[#df514c]">{summary.losingTrades}L</strong> ({summary.totalTrades})
            </span>
          </div>
        </div>
      </div>

      {/* 3. Profit Factor */}
      <div className="bg-[#191c24] border border-[#232733] rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-[#2a2f3e] transition-all">
        <div className="flex items-center justify-between text-xs text-[#9b9b9b]">
          <span className="font-medium text-[11px]">Profit Factor</span>
          <div className="p-1.5 rounded-md bg-[#14171f] text-amber-400 border border-[#232733]">
            <Zap className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-xl font-bold font-mono tabular-nums text-white tracking-tight">
            {summary.profitFactor.toFixed(2)}
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-[#666666]">
            <span>Exp / trade:</span>
            <span
              className={`font-mono tabular-nums font-medium ${
                summary.expectancy >= 0 ? "text-[#4caf50]" : "text-[#df514c]"
              }`}
            >
              {formatINR(summary.expectancy, { showSign: true, decimals: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Max Drawdown */}
      <div className="bg-[#191c24] border border-[#232733] rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-[#2a2f3e] transition-all">
        <div className="flex items-center justify-between text-xs text-[#9b9b9b]">
          <span className="font-medium text-[11px]">Max Drawdown</span>
          <div className="p-1.5 rounded-md bg-[#14171f] text-[#df514c] border border-[#232733]">
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-xl font-bold font-mono tabular-nums text-[#df514c] tracking-tight">
            -{summary.maxDrawdownPct.toFixed(2)}%
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-[#666666]">
            <span>Peak-to-Trough:</span>
            <span className="font-mono tabular-nums text-[#df514c]/90 font-medium">
              -{formatINR(summary.maxDrawdownAmount, { decimals: 0 })}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Sharpe Ratio */}
      <div className="bg-[#191c24] border border-[#232733] rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-[#2a2f3e] transition-all">
        <div className="flex items-center justify-between text-xs text-[#9b9b9b]">
          <span className="font-medium text-[11px]">Sharpe / Sortino</span>
          <div className="p-1.5 rounded-md bg-[#14171f] text-[#4184f3] border border-[#232733]">
            <Award className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-xl font-bold font-mono tabular-nums text-white tracking-tight">
            {summary.sharpeRatio.toFixed(2)}
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-[#666666]">
            <span>Sortino:</span>
            <span className="font-mono tabular-nums text-[#4184f3] font-medium">
              {summary.sortinoRatio.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* 6. Win/Loss & Streaks */}
      <div className="bg-[#191c24] border border-[#232733] rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-[#2a2f3e] transition-all">
        <div className="flex items-center justify-between text-xs text-[#9b9b9b]">
          <span className="font-medium text-[11px]">Avg Win / Loss</span>
          <div className="p-1.5 rounded-md bg-[#14171f] text-[#4caf50] border border-[#232733]">
            <IndianRupee className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-xl font-bold font-mono tabular-nums text-white tracking-tight">
            {summary.winLossRatio.toFixed(2)}x
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-[#666666]">
            <span title="Max consecutive winning streak">
              Streak: <span className="text-[#4caf50] font-mono tabular-nums">{summary.maxConsecutiveWins}W</span>
            </span>
            <span className="text-[#666666]">/</span>
            <span title="Max consecutive losing streak">
              <span className="text-[#df514c] font-mono tabular-nums">{summary.maxConsecutiveLosses}L</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
