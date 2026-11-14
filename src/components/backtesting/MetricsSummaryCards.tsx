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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {/* 1. Net Profit */}
      <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-[#2a384e] transition-all">
        <div className="flex items-center justify-between text-xs text-[#94a3b8]">
          <span className="font-medium">Net Profit (INR)</span>
          <div
            className={`p-1.5 rounded-md ${
              isNetProfitPositive
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-rose-500/10 text-rose-400"
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
            className={`text-xl font-bold font-mono tracking-tight ${
              isNetProfitPositive ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {formatINR(summary.netProfit, { showSign: true, decimals: 2 })}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs">
            <span
              className={`font-mono font-semibold ${
                isNetProfitPositive ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {isNetProfitPositive ? "+" : ""}
              {summary.netProfitPct.toFixed(2)}%
            </span>
            <span className="text-[#64748b]">|</span>
            <span
              className={`font-mono text-[11px] ${
                isAlphaPositive ? "text-cyan-400" : "text-[#94a3b8]"
              }`}
              title="Alpha over buy & hold benchmark"
            >
              α {isAlphaPositive ? "+" : ""}
              {summary.alpha.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* 2. Win Rate */}
      <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-[#2a384e] transition-all">
        <div className="flex items-center justify-between text-xs text-[#94a3b8]">
          <span className="font-medium">Win Rate</span>
          <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400">
            <Percent className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-xl font-bold font-mono text-white tracking-tight">
            {summary.winRatePct.toFixed(1)}%
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-[#64748b]">
            <span>Trades:</span>
            <span className="font-mono text-[#cbd5e1]">
              <strong className="text-emerald-400">{summary.winningTrades}W</strong> /{" "}
              <strong className="text-rose-400">{summary.losingTrades}L</strong> ({summary.totalTrades})
            </span>
          </div>
        </div>
      </div>

      {/* 3. Profit Factor */}
      <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-[#2a384e] transition-all">
        <div className="flex items-center justify-between text-xs text-[#94a3b8]">
          <span className="font-medium">Profit Factor</span>
          <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400">
            <Zap className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-xl font-bold font-mono text-white tracking-tight">
            {summary.profitFactor.toFixed(2)}
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-[#64748b]">
            <span>Exp / trade:</span>
            <span
              className={`font-mono font-medium ${
                summary.expectancy >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {formatINR(summary.expectancy, { showSign: true, decimals: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Max Drawdown */}
      <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-[#2a384e] transition-all">
        <div className="flex items-center justify-between text-xs text-[#94a3b8]">
          <span className="font-medium">Max Drawdown</span>
          <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-400">
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-xl font-bold font-mono text-rose-400 tracking-tight">
            -{summary.maxDrawdownPct.toFixed(2)}%
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-[#64748b]">
            <span>Peak-to-Trough:</span>
            <span className="font-mono text-rose-400/90 font-medium">
              -{formatINR(summary.maxDrawdownAmount, { decimals: 0 })}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Sharpe Ratio */}
      <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-[#2a384e] transition-all">
        <div className="flex items-center justify-between text-xs text-[#94a3b8]">
          <span className="font-medium">Sharpe / Sortino</span>
          <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400">
            <Award className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-xl font-bold font-mono text-white tracking-tight">
            {summary.sharpeRatio.toFixed(2)}
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-[#64748b]">
            <span>Sortino:</span>
            <span className="font-mono text-indigo-400 font-medium">
              {summary.sortinoRatio.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* 6. Win/Loss & Streaks */}
      <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-[#2a384e] transition-all">
        <div className="flex items-center justify-between text-xs text-[#94a3b8]">
          <span className="font-medium">Avg Win / Loss</span>
          <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
            <IndianRupee className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-xl font-bold font-mono text-white tracking-tight">
            {summary.winLossRatio.toFixed(2)}x
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-[#64748b]">
            <span title="Max consecutive winning streak">
              Streak: <span className="text-emerald-400 font-mono">{summary.maxConsecutiveWins}W</span>
            </span>
            <span className="text-[#475569]">/</span>
            <span title="Max consecutive losing streak">
              <span className="text-rose-400 font-mono">{summary.maxConsecutiveLosses}L</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
