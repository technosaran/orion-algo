"use client";

import React from "react";
import {
  ShieldAlert,
  Target,
  TrendingUp,
  Clock,
  Flame,
} from "lucide-react";
import {
  RiskManagementConfig,
  StopLossType,
  TakeProfitType,
} from "@/types/strategy";

interface ExitConditionsSectionProps {
  riskConfig: RiskManagementConfig;
  onChange: (updated: Partial<RiskManagementConfig>) => void;
}

export function ExitConditionsSection({
  riskConfig,
  onChange,
}: ExitConditionsSectionProps) {
  return (
    <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-5 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1a2230] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold">
            03
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Exit Rules & Risk Management</h2>
            <p className="text-xs text-[#94a3b8]">
              Set stop loss, take-profit targets, trailing stops, and intraday square-off.
            </p>
          </div>
        </div>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#131b2a] text-emerald-400 border border-[#222e42]">
          Section 3 of 5
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Stop Loss Card */}
        <div className="bg-[#0d121c] border border-[#1d2738] rounded-xl p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
              <ShieldAlert className="w-4 h-4" />
              <span>Stop Loss</span>
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30">
              Required
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-[#94a3b8]">Stop Loss Type</label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: "percentage" as StopLossType, label: "Percent (%)" },
                { id: "atr_multiple" as StopLossType, label: "ATR Multiple" },
                { id: "points" as StopLossType, label: "Points" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onChange({ stopLossType: m.id })}
                  className={`py-1.5 rounded-lg text-xs font-medium border text-center transition-colors ${
                    riskConfig.stopLossType === m.id
                      ? "bg-rose-500/15 border-rose-500/40 text-rose-300 font-bold"
                      : "bg-[#131b2a] border-[#222e42] text-[#94a3b8] hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#94a3b8]">
              {riskConfig.stopLossType === "percentage"
                ? "Stop Loss Distance (% from entry)"
                : riskConfig.stopLossType === "atr_multiple"
                ? "ATR Multiplier (x ATR-14)"
                : "Points / Ticks"}
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={riskConfig.stopLossValue}
                onChange={(e) =>
                  onChange({ stopLossValue: Number(e.target.value) || 1.5 })
                }
                className="w-full bg-[#131b2a] border border-[#222e42] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-rose-500/50"
              />
              <span className="absolute right-3 top-2 text-xs font-mono text-[#64748b]">
                {riskConfig.stopLossType === "percentage"
                  ? "%"
                  : riskConfig.stopLossType === "atr_multiple"
                  ? "x ATR"
                  : "pts"}
              </span>
            </div>
          </div>
        </div>

        {/* Take Profit Card */}
        <div className="bg-[#0d121c] border border-[#1d2738] rounded-xl p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <Target className="w-4 h-4" />
              <span>Take Profit / Target</span>
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              Required
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-[#94a3b8]">Target Calculation Model</label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: "percentage" as TakeProfitType, label: "Percent (%)" },
                { id: "risk_reward" as TakeProfitType, label: "Risk:Reward" },
                { id: "points" as TakeProfitType, label: "Points" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onChange({ takeProfitType: m.id })}
                  className={`py-1.5 rounded-lg text-xs font-medium border text-center transition-colors ${
                    riskConfig.takeProfitType === m.id
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold"
                      : "bg-[#131b2a] border-[#222e42] text-[#94a3b8] hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#94a3b8]">
              {riskConfig.takeProfitType === "percentage"
                ? "Target Distance (% gain)"
                : riskConfig.takeProfitType === "risk_reward"
                ? "Reward Ratio (e.g. 2.0 = 1:2 R:R)"
                : "Points / Ticks"}
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={riskConfig.takeProfitValue}
                onChange={(e) =>
                  onChange({ takeProfitValue: Number(e.target.value) || 3.0 })
                }
                className="w-full bg-[#131b2a] border border-[#222e42] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50"
              />
              <span className="absolute right-3 top-2 text-xs font-mono text-[#64748b]">
                {riskConfig.takeProfitType === "percentage"
                  ? "%"
                  : riskConfig.takeProfitType === "risk_reward"
                  ? "R"
                  : "pts"}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Trailing Stop Loss */}
        <div className="bg-[#0d121c] border border-[#1d2738] rounded-xl p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>Trailing Stop Loss (TSL)</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={riskConfig.useTrailingStop}
                onChange={(e) => onChange({ useTrailingStop: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#1e2a3c] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          {riskConfig.useTrailingStop ? (
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-xs text-[#94a3b8] flex justify-between">
                  <span>Activation Gain Threshold</span>
                  <span className="text-cyan-400 font-mono">+{riskConfig.trailingStopActivation}%</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={riskConfig.trailingStopActivation}
                  onChange={(e) =>
                    onChange({ trailingStopActivation: Number(e.target.value) })
                  }
                  className="w-full h-1.5 bg-[#1b2535] rounded-lg appearance-none cursor-pointer accent-cyan-400 mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-[#94a3b8] flex justify-between">
                  <span>Trailing Step Distance</span>
                  <span className="text-cyan-400 font-mono">{riskConfig.trailingStopStep}%</span>
                </label>
                <input
                  type="range"
                  min="0.25"
                  max="5"
                  step="0.25"
                  value={riskConfig.trailingStopStep}
                  onChange={(e) =>
                    onChange({ trailingStopStep: Number(e.target.value) })
                  }
                  className="w-full h-1.5 bg-[#1b2535] rounded-lg appearance-none cursor-pointer accent-cyan-400 mt-1"
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#64748b] pt-2">
              Trailing stop is currently disabled. Toggle to automatically lock in profits as trade moves in your favor.
            </p>
          )}
        </div>

        {/* Intraday Square-off & Time Exit */}
        <div className="bg-[#0d121c] border border-[#1d2738] rounded-xl p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
              <Clock className="w-4 h-4" />
              <span>Time-Based Square-Off</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={riskConfig.intradaySquareOff}
                onChange={(e) => onChange({ intradaySquareOff: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#1e2a3c] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs text-[#94a3b8]">MIS Square-off (IST)</label>
              <input
                type="time"
                disabled={!riskConfig.intradaySquareOff}
                value={riskConfig.squareOffTime}
                onChange={(e) => onChange({ squareOffTime: e.target.value })}
                className="bg-[#131b2a] border border-[#222e42] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none disabled:opacity-40"
              />
            </div>

            {riskConfig.intradaySquareOff && (
              <div className="flex gap-1.5 pt-0.5">
                {[
                  { label: "15:15 (NSE/BSE)", val: "15:15" },
                  { label: "15:20 (Broker Auto)", val: "15:20" },
                  { label: "23:20 (MCX)", val: "23:20" },
                ].map((t) => (
                  <button
                    key={t.val}
                    type="button"
                    onClick={() => onChange({ squareOffTime: t.val })}
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      riskConfig.squareOffTime === t.val
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-[#131b2a] text-[#64748b] border-[#1e293b]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <label className="text-xs text-[#94a3b8]">Max Holding Bars (0 = inf)</label>
              <input
                type="number"
                min="0"
                max="500"
                value={riskConfig.maxHoldingBars}
                onChange={(e) =>
                  onChange({ maxHoldingBars: Number(e.target.value) || 0 })
                }
                className="w-20 bg-[#131b2a] border border-[#222e42] rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Account Safety */}
        <div className="bg-[#0d121c] border border-[#1d2738] rounded-xl p-4 space-y-3.5 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
              <Flame className="w-4 h-4" />
              <span>Daily Loss & Risk Limits</span>
            </div>
            <span className="text-[11px] text-[#64748b]">Account Risk</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-[#94a3b8] flex justify-between">
                <span>Max Daily Loss Limit</span>
                <span className="text-rose-400 font-mono">{riskConfig.maxDailyDrawdownPct}%</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={riskConfig.maxDailyDrawdownPct}
                onChange={(e) =>
                  onChange({ maxDailyDrawdownPct: Number(e.target.value) })
                }
                className="w-full h-1.5 bg-[#1b2535] rounded-lg appearance-none cursor-pointer accent-rose-400 mt-1"
              />
              <p className="text-[11px] text-[#64748b]">Halts execution if portfolio daily loss exceeds this threshold.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-[#94a3b8] flex justify-between">
                <span>Max Consecutive Losses</span>
                <span className="text-amber-400 font-mono">{riskConfig.maxConsecutiveLosses} Trades</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={riskConfig.maxConsecutiveLosses}
                onChange={(e) =>
                  onChange({ maxConsecutiveLosses: Number(e.target.value) })
                }
                className="w-full h-1.5 bg-[#1b2535] rounded-lg appearance-none cursor-pointer accent-amber-400 mt-1"
              />
              <p className="text-[11px] text-[#64748b]">Pauses strategy after consecutive stop-loss hits to preserve capital.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
