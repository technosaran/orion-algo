"use client";

import React from "react";
import { RotateCcw, Activity, ShieldCheck, Play, Pause, Cpu, RefreshCw, Globe } from "lucide-react";

interface PaperTradingHeaderProps {
  isSimulating: boolean;
  onToggleSimulating: () => void;
  onOpenResetModal: () => void;
  botActive: boolean;
  onToggleBot: () => void;
  initialBalance: number;
  isRealDataConnected: boolean;
  onRefreshRealData: () => void;
  isRefreshing: boolean;
}

export function PaperTradingHeader({
  isSimulating,
  onToggleSimulating,
  onOpenResetModal,
  botActive,
  onToggleBot,
  initialBalance,
  isRealDataConnected,
  onRefreshRealData,
  isRefreshing,
}: PaperTradingHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1a2333]">
      {/* Title & Badge */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Paper Trading Cockpit
          </h1>

          {/* Real Market Data Connection Badge */}
          {isRealDataConnected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-xs shadow-emerald-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>REAL DATA FEED</span>
              <span className="text-[10px] text-[#94a3b8] font-normal border-l border-emerald-500/30 pl-1.5">
                Binance & Yahoo
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              SIMULATED PRICES
            </span>
          )}

          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-[#64748b] bg-[#0f141f] border border-[#1e293b] px-2 py-0.5 rounded">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Zero Risk
          </span>
        </div>
        <p className="text-xs text-[#94a3b8]">
          Real-time quotes & historical OHLCV data fetched from external APIs. Practice execution and algorithmic strategies with live market pricing.
        </p>
      </div>

      {/* Controls & Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Sync / Refresh Real Market Data */}
        <button
          onClick={onRefreshRealData}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0f172a] text-cyan-300 border border-cyan-500/30 hover:bg-[#13253d] hover:border-cyan-500/50 transition-all disabled:opacity-50"
          title="Fetch latest live prices and historical candles from external market APIs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-cyan-400" : "text-cyan-400"}`} />
          <span>{isRefreshing ? "Syncing..." : "Sync Real Data"}</span>
        </button>

        {/* Market Feed Ticker Toggle */}
        <button
          onClick={onToggleSimulating}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            isSimulating
              ? "bg-[#0f172a] text-emerald-400 border-emerald-500/30 hover:bg-[#132238]"
              : "bg-[#0f172a] text-[#94a3b8] border-[#1e293b] hover:bg-[#161f30]"
          }`}
          title={isSimulating ? "Pause live tick updates" : "Resume live tick updates"}
        >
          {isSimulating ? (
            <>
              <Pause className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ticks: Live</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-[#94a3b8]" />
              <span>Ticks: Paused</span>
            </>
          )}
        </button>

        {/* Algo Bot Toggle */}
        <button
          onClick={onToggleBot}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            botActive
              ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20 animate-pulse"
              : "bg-[#0f172a] text-[#94a3b8] border-[#1e293b] hover:text-white hover:bg-[#161f30]"
          }`}
        >
          <Cpu className={`w-3.5 h-3.5 ${botActive ? "text-cyan-400" : "text-[#64748b]"}`} />
          <span>Algo Bot: {botActive ? "ON" : "OFF"}</span>
        </button>

        {/* Reset Balance */}
        <button
          onClick={onOpenResetModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0f172a] text-[#94a3b8] border border-[#1e293b] hover:text-white hover:border-[#334155] transition-colors"
          title="Reset paper trading account balance & wipe simulated trades"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
}
