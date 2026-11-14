"use client";

import React, { useState } from "react";
import {
  BacktestConfig,
  StrategyDefinition,
  SymbolDefinition,
} from "@/lib/backtest/types";
import {
  Sliders,
  Settings2,
  DollarSign,
  Shield,
  Layers,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface StrategyConfigPanelProps {
  config: BacktestConfig;
  onChange: (newConfig: BacktestConfig) => void;
  strategies: StrategyDefinition[];
  symbols: SymbolDefinition[];
  onRun: () => void;
  isRunning: boolean;
}

export function StrategyConfigPanel({
  config,
  onChange,
  strategies,
  symbols,
  onRun,
  isRunning,
}: StrategyConfigPanelProps) {
  const [showAdvancedRisk, setShowAdvancedRisk] = useState(false);

  const currentStrategy =
    strategies.find((s) => s.id === config.strategy) || strategies[0];

  const updateParam = (key: string, value: any) => {
    onChange({
      ...config,
      strategyParams: {
        ...config.strategyParams,
        [key]: value,
      },
    });
  };

  const handleStrategyChange = (stratId: string) => {
    const strat = strategies.find((s) => s.id === stratId);
    if (!strat) return;
    const defaultParams: Record<string, any> = {};
    strat.params.forEach((p) => {
      defaultParams[p.key] = p.default;
    });
    onChange({
      ...config,
      strategy: stratId,
      strategyParams: defaultParams,
    });
  };

  return (
    <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-5 shadow-lg flex flex-col gap-5">
      {/* Panel Title */}
      <div className="flex items-center justify-between pb-3.5 border-b border-[#1a2230]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide">
              Strategy & Simulation Parameters
            </h3>
            <p className="text-xs text-[#64748b]">
              Configure model rules, capital sizing, and risk boundaries
            </p>
          </div>
        </div>
      </div>

      {/* Row 1: Strategy & Asset Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Strategy Selector */}
        <div>
          <label className="block text-xs font-medium text-[#94a3b8] mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Algorithm Strategy</span>
          </label>
          <select
            value={config.strategy}
            onChange={(e) => handleStrategyChange(e.target.value)}
            className="w-full bg-[#131b2a] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer"
          >
            {strategies.map((strat) => (
              <option key={strat.id} value={strat.id} className="bg-[#0b0e14]">
                {strat.name} ({strat.category})
              </option>
            ))}
          </select>
        </div>

        {/* Symbol / Asset */}
        <div>
          <label className="block text-xs font-medium text-[#94a3b8] mb-1.5 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Market / Symbol</span>
          </label>
          <select
            value={config.symbol}
            onChange={(e) => onChange({ ...config, symbol: e.target.value })}
            className="w-full bg-[#131b2a] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer"
          >
            {symbols.map((s) => (
              <option key={s.symbol} value={s.symbol} className="bg-[#0b0e14]">
                {s.symbol} - {s.name} ({s.category})
              </option>
            ))}
          </select>
        </div>

        {/* Timeframe */}
        <div>
          <label className="block text-xs font-medium text-[#94a3b8] mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Candle Interval</span>
          </label>
          <div className="grid grid-cols-6 gap-1 bg-[#131b2a] p-1 rounded-lg border border-[#1e293b]">
            {(["1m", "5m", "15m", "1h", "4h", "1d"] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => onChange({ ...config, timeframe: tf })}
                className={`text-xs py-1.5 rounded font-mono font-medium transition-all ${
                  config.timeframe === tf
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                    : "text-[#64748b] hover:text-[#cbd5e1]"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Lookback Range */}
        <div>
          <label className="block text-xs font-medium text-[#94a3b8] mb-1.5 flex items-center justify-between">
            <span>Lookback Horizon</span>
            <span className="font-mono text-cyan-400">{config.dateRangeDays} Days</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={14}
              max={365}
              step={7}
              value={config.dateRangeDays}
              onChange={(e) =>
                onChange({ ...config, dateRangeDays: Number(e.target.value) })
              }
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#1e293b] rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Row 2: Dynamic Strategy Specific Parameters */}
      <div className="bg-[#131b2a]/60 border border-[#1e293b] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Settings2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-semibold text-white uppercase tracking-wider">
              {currentStrategy.name} Variables
            </span>
          </div>
          <span className="text-[11px] text-[#64748b]">
            {currentStrategy.description}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
          {currentStrategy.params.map((param) => {
            const currentVal =
              config.strategyParams[param.key] !== undefined
                ? config.strategyParams[param.key]
                : param.default;

            return (
              <div key={param.key} className="bg-[#0b0e14] p-2.5 rounded-lg border border-[#1a2230]">
                <label className="block text-[11px] text-[#94a3b8] mb-1 font-medium">
                  {param.label}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={param.min}
                    max={param.max}
                    step={param.step || 1}
                    value={currentVal}
                    onChange={(e) =>
                      updateParam(param.key, Number(e.target.value))
                    }
                    className="w-full bg-[#131b2a] border border-[#1e293b] rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 3: Capital & Risk Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Initial Capital */}
        <div>
          <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
            Initial Capital ($)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-xs text-[#64748b] font-mono">$</span>
            <input
              type="number"
              min={100}
              max={1000000}
              step={500}
              value={config.initialCapital}
              onChange={(e) =>
                onChange({ ...config, initialCapital: Math.max(100, Number(e.target.value)) })
              }
              className="w-full bg-[#131b2a] border border-[#1e293b] rounded-lg pl-7 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Leverage */}
        <div>
          <label className="block text-xs font-medium text-[#94a3b8] mb-1.5 flex items-center justify-between">
            <span>Leverage Multiplier</span>
            <span className="font-mono text-amber-400 font-semibold">{config.leverage}x</span>
          </label>
          <div className="grid grid-cols-5 gap-1 bg-[#131b2a] p-1 rounded-lg border border-[#1e293b]">
            {[1, 2, 3, 5, 10].map((lev) => (
              <button
                key={lev}
                type="button"
                onClick={() => onChange({ ...config, leverage: lev })}
                className={`text-xs py-1.5 rounded font-mono font-medium transition-all ${
                  config.leverage === lev
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "text-[#64748b] hover:text-[#cbd5e1]"
                }`}
              >
                {lev}x
              </button>
            ))}
          </div>
        </div>

        {/* Stop Loss % */}
        <div>
          <label className="block text-xs font-medium text-[#94a3b8] mb-1.5 flex items-center justify-between">
            <span className="text-rose-400">Stop Loss (%)</span>
            <span className="font-mono text-rose-400 font-medium">
              {config.stopLossPct ? `${config.stopLossPct}%` : "Off"}
            </span>
          </label>
          <div className="relative">
            <input
              type="number"
              min={0.5}
              max={25}
              step={0.5}
              value={config.stopLossPct || ""}
              placeholder="e.g. 2.5"
              onChange={(e) =>
                onChange({
                  ...config,
                  stopLossPct: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full bg-[#131b2a] border border-[#1e293b] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-rose-500/50"
            />
          </div>
        </div>

        {/* Take Profit % */}
        <div>
          <label className="block text-xs font-medium text-[#94a3b8] mb-1.5 flex items-center justify-between">
            <span className="text-emerald-400">Take Profit (%)</span>
            <span className="font-mono text-emerald-400 font-medium">
              {config.takeProfitPct ? `${config.takeProfitPct}%` : "Off"}
            </span>
          </label>
          <div className="relative">
            <input
              type="number"
              min={1.0}
              max={50}
              step={0.5}
              value={config.takeProfitPct || ""}
              placeholder="e.g. 6.0"
              onChange={(e) =>
                onChange({
                  ...config,
                  takeProfitPct: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full bg-[#131b2a] border border-[#1e293b] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>
      </div>

      {/* Advanced Execution Settings Toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvancedRisk(!showAdvancedRisk)}
          className="flex items-center gap-1.5 text-xs text-[#64748b] hover:text-white transition-colors"
        >
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span>Friction & Advanced Execution (Slippage, Fees, Trailing Stop)</span>
          {showAdvancedRisk ? (
            <ChevronUp className="w-3.5 h-3.5 ml-1" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 ml-1" />
          )}
        </button>

        {showAdvancedRisk && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-3 pt-3 border-t border-[#1a2230]">
            <div>
              <label className="block text-[11px] text-[#94a3b8] mb-1">
                Trailing Stop Loss (%)
              </label>
              <input
                type="number"
                min={0.5}
                max={15}
                step={0.5}
                value={config.trailingStopPct || ""}
                placeholder="Optional, e.g. 1.5"
                onChange={(e) =>
                  onChange({
                    ...config,
                    trailingStopPct: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full bg-[#131b2a] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#94a3b8] mb-1">
                Slippage Model (%)
              </label>
              <input
                type="number"
                min={0}
                max={2}
                step={0.01}
                value={config.slippagePct}
                onChange={(e) =>
                  onChange({ ...config, slippagePct: Number(e.target.value) })
                }
                className="w-full bg-[#131b2a] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#94a3b8] mb-1">
                Brokerage Fee per Trade (%)
              </label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={config.feePct}
                onChange={(e) =>
                  onChange({ ...config, feePct: Number(e.target.value) })
                }
                className="w-full bg-[#131b2a] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
