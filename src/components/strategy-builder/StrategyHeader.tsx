"use client";

import React, { useState } from "react";
import {
  Play,
  Save,
  Code2,
  RotateCcw,
  Sparkles,
  Check,
  TrendingUp,
  Database,
  FolderOpen,
  Plus,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { StrategyConfig } from "@/types/strategy";

interface StrategyHeaderProps {
  strategy: StrategyConfig;
  savedStrategies: StrategyConfig[];
  onUpdateStrategy: (updated: Partial<StrategyConfig>) => void;
  onSelectStrategy: (strat: StrategyConfig) => void;
  onNewBlankStrategy: () => void;
  onDeleteStrategy: (id: string) => void;
  onRunBacktest: () => void;
  onOpenTemplates: () => void;
  onOpenCodeExport: () => void;
  onSave: () => void;
  onReset: () => void;
  isBacktesting: boolean;
  saveStatus: string | null;
  dbSource: "database" | "local";
}

export function StrategyHeader({
  strategy,
  savedStrategies,
  onUpdateStrategy,
  onSelectStrategy,
  onNewBlankStrategy,
  onDeleteStrategy,
  onRunBacktest,
  onOpenTemplates,
  onOpenCodeExport,
  onSave,
  onReset,
  isBacktesting,
  saveStatus,
  dbSource,
}: StrategyHeaderProps) {
  const [isSavedOpen, setIsSavedOpen] = useState(false);

  const segmentLabel =
    strategy.assetClass === "nse_fno"
      ? "NSE F&O"
      : strategy.assetClass === "nse_equity"
      ? "NSE CASH"
      : strategy.assetClass === "mcx_commodity"
      ? "MCX"
      : strategy.assetClass === "bse_equity"
      ? "BSE"
      : strategy.assetClass.toUpperCase();

  return (
    <div className="bg-[#0b0e14] border-b border-[#1a2230] px-6 py-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title & Metadata */}
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0 mt-0.5">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                type="text"
                value={strategy.name}
                onChange={(e) => onUpdateStrategy({ name: e.target.value })}
                className="text-xl font-bold text-white bg-transparent border-b border-transparent hover:border-[#2a374a] focus:border-emerald-500/50 focus:outline-none transition-colors px-1 py-0.5 rounded"
                placeholder="Strategy Name..."
              />
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 capitalize">
                {strategy.status}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                {strategy.productType || "MIS"}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#161f30] text-[#94a3b8] uppercase tracking-wider font-mono">
                {segmentLabel} • {strategy.symbol} • {strategy.timeframe} • INR (₹)
              </span>

              {/* DB Status Badge */}
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border bg-[#121926] border-[#222e42] text-[#94a3b8]"
                title={
                  dbSource === "database"
                    ? "Connected to Supabase PostgreSQL Database"
                    : "Operating in Local Cache Mode"
                }
              >
                <Database className={`w-3 h-3 ${dbSource === "database" ? "text-emerald-400" : "text-amber-400"}`} />
                <span className={dbSource === "database" ? "text-emerald-400 font-semibold" : "text-amber-300"}>
                  {dbSource === "database" ? "Supabase DB" : "Local Sync"}
                </span>
              </div>
            </div>
            <p className="text-xs text-[#94a3b8] mt-1 line-clamp-1 max-w-2xl">
              {strategy.description || "Configure Indian market rules below to engineer automated quantitative trading logic."}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Saved Strategies Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsSavedOpen(!isSavedOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#131b2a] hover:bg-[#1a2538] border border-[#222e42] text-xs font-medium text-[#cbd5e1] hover:text-white transition-all shadow-sm"
            >
              <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Saved ({savedStrategies.length})</span>
              <ChevronDown className="w-3 h-3 text-[#64748b]" />
            </button>

            {isSavedOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-[#0e1624] border border-[#222e42] rounded-xl shadow-2xl p-2 z-50 space-y-2">
                <div className="flex items-center justify-between px-2 py-1 border-b border-[#1c293c]">
                  <span className="text-[11px] font-bold text-[#94a3b8] uppercase">
                    Your Database Strategies
                  </span>
                  <button
                    onClick={() => {
                      onNewBlankStrategy();
                      setIsSavedOpen(false);
                    }}
                    className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Blank</span>
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1">
                  {savedStrategies.map((s) => (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors group ${
                        strategy.id === s.id
                          ? "bg-emerald-500/15 border border-emerald-500/30 text-white"
                          : "hover:bg-[#162233] text-[#cbd5e1]"
                      }`}
                    >
                      <button
                        onClick={() => {
                          onSelectStrategy(s);
                          setIsSavedOpen(false);
                        }}
                        className="flex-1 text-left truncate mr-2"
                      >
                        <div className="font-semibold truncate">{s.name}</div>
                        <div className="text-[10px] font-mono text-[#64748b]">
                          {s.symbol} • {s.timeframe} • {s.productType}
                        </div>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete "${s.name}" from database?`)) {
                            onDeleteStrategy(s.id);
                          }
                        }}
                        className="p-1 rounded text-[#64748b] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Strategy"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {savedStrategies.length === 0 && (
                    <div className="py-4 text-center text-xs text-[#64748b]">
                      No strategies saved yet. Click Save to store in database.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onOpenTemplates}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#131b2a] hover:bg-[#1a2538] border border-[#222e42] text-xs font-medium text-[#cbd5e1] hover:text-white transition-all shadow-sm"
            title="Choose from battle-tested Indian market templates (Nifty, BankNifty, Reliance)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Templates</span>
          </button>

          <button
            onClick={onOpenCodeExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#131b2a] hover:bg-[#1a2538] border border-[#222e42] text-xs font-medium text-[#cbd5e1] hover:text-white transition-all shadow-sm"
            title="Inspect generated Python broker code (KiteConnect / Dhan / Angel)"
          >
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Code</span>
          </button>

          <button
            onClick={onReset}
            className="p-2 rounded-lg bg-[#131b2a] hover:bg-[#1a2538] border border-[#222e42] text-[#94a3b8] hover:text-rose-400 transition-all shadow-sm"
            title="Reset strategy canvas"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onSave}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#131b2a] hover:bg-[#1a2538] border border-emerald-500/30 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-all shadow-sm"
            title="Save strategy to database"
          >
            {saveStatus ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{saveStatus}</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save to DB</span>
              </>
            )}
          </button>

          <button
            onClick={onRunBacktest}
            disabled={isBacktesting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isBacktesting ? "animate-spin" : ""}`} />
            <span>{isBacktesting ? "Simulating..." : "Run Indian Backtest"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
