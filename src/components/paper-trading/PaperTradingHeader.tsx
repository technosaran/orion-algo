"use client";

import React from "react";
import { RotateCcw, Play, Pause, RefreshCw } from "lucide-react";

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
            Paper Trading
          </h1>

          {/* Market Data Status Badge */}
          {isRealDataConnected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Live Market Feed</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Simulated Feed</span>
            </span>
          )}
        </div>
        <p className="text-xs text-[#94a3b8]">
          Practice simulated trading with real-time market quotes and virtual capital.
        </p>
      </div>

      {/* Controls & Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Sync / Refresh Market Data */}
        <button
          onClick={onRefreshRealData}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#131b2a] text-[#cbd5e1] border border-[#222e42] hover:bg-[#1a2538] hover:text-white transition-all disabled:opacity-50"
          title="Fetch latest market quotes"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-cyan-400" : "text-cyan-400"}`} />
          <span>{isRefreshing ? "Syncing..." : "Sync Market Data"}</span>
        </button>

        {/* Ticker Updates Toggle */}
        <button
          onClick={onToggleSimulating}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            isSimulating
              ? "bg-[#131b2a] text-emerald-400 border-emerald-500/30 hover:bg-[#1a2538]"
              : "bg-[#131b2a] text-[#94a3b8] border-[#222e42] hover:bg-[#1a2538]"
          }`}
          title={isSimulating ? "Pause live tick updates" : "Resume live tick updates"}
        >
          {isSimulating ? (
            <>
              <Pause className="w-3.5 h-3.5 text-emerald-400" />
              <span>Updates: Live</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-[#94a3b8]" />
              <span>Updates: Paused</span>
            </>
          )}
        </button>

        {/* Reset Balance */}
        <button
          onClick={onOpenResetModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#131b2a] text-[#94a3b8] border border-[#222e42] hover:text-white hover:border-[#334155] transition-colors"
          title="Reset paper trading portfolio"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span>Reset Portfolio</span>
        </button>
      </div>
    </div>
  );
}
