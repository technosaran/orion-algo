"use client";

import React from "react";
import { STRATEGY_PRESETS, PresetStrategy } from "@/lib/backtest/engine";
import {
  FlaskConical,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface BacktestHeaderProps {
  onRun: () => void;
  isRunning: boolean;
  activePresetId: string | null;
  onSelectPreset: (preset: PresetStrategy) => void;
}

export function BacktestHeader({
  onRun,
  isRunning,
  activePresetId,
  onSelectPreset,
}: BacktestHeaderProps) {
  return (
    <div className="flex flex-col gap-4 pb-2">
      {/* Top Bar: Title & Primary Action */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                Backtesting
              </h1>
            </div>
            <p className="text-xs md:text-sm text-[#94a3b8] mt-0.5">
              Test strategies against historical price data with realistic slippage, leverage, and fees
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={onRun}
            disabled={isRunning}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#080a0f] font-semibold text-sm shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.98]"
          >
            {isRunning ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Simulating...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Backtest</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preset Strategy Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
        <span className="text-xs text-[#64748b] font-medium flex items-center gap-1 shrink-0">
          <Sparkles className="w-3 h-3 text-amber-400" />
          Presets:
        </span>
        {STRATEGY_PRESETS.map((preset) => {
          const isActive = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all shrink-0 border ${
                isActive
                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-semibold shadow-sm"
                  : "bg-[#0b0e14] border-[#1a2230] text-[#94a3b8] hover:text-white hover:border-[#2a384e]"
              }`}
            >
              <span>{preset.title}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#131b2a] text-[#64748b] border border-[#1e293b]">
                {preset.tag}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
