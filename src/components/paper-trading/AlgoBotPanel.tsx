"use client";

import React, { useState } from "react";
import {
  Cpu,
  Play,
  Pause,
  Trash2,
  Terminal,
  Activity,
  Sliders,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { BotLog, AssetQuote } from "@/types/paperTrading";

interface AlgoBotPanelProps {
  botActive: boolean;
  onToggleBot: () => void;
  strategyId: string;
  onChangeStrategy: (id: string) => void;
  speedSec: number;
  onChangeSpeed: (sec: number) => void;
  logs: BotLog[];
  onClearLogs: () => void;
  currentAsset: AssetQuote;
}

const STRATEGIES = [
  {
    id: "rsi_mean_reversion",
    name: "RSI Mean Reversion",
    desc: "Buys when RSI < 30 (oversold), closes when RSI > 65.",
  },
  {
    id: "ema_crossover",
    name: "Dual EMA Momentum Cross",
    desc: "Enters on EMA(20) crossing EMA(50) with trend confirmation.",
  },
  {
    id: "bb_volatility_scalper",
    name: "Bollinger Volatility Scalp",
    desc: "Buys 2.0 std lower band bounces, targets SMA(20) mean.",
  },
];

export function AlgoBotPanel({
  botActive,
  onToggleBot,
  strategyId,
  onChangeStrategy,
  speedSec,
  onChangeSpeed,
  logs,
  onClearLogs,
  currentAsset,
}: AlgoBotPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex flex-col bg-[#0b0f19] border border-[#1a2333] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-[#1a2333]">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-1.5 rounded-lg border transition-colors ${
              botActive
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                : "bg-[#121824] border-[#1e293b] text-[#64748b]"
            }`}
          >
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">
                Orion Algo Bot
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  botActive
                    ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30 font-bold"
                    : "bg-[#121824] text-[#64748b] border-[#1e293b]"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    botActive ? "bg-cyan-400 animate-ping" : "bg-[#64748b]"
                  }`}
                />
                {botActive ? "RUNNING" : "STANDBY"}
              </span>
            </div>
            <p className="text-[10px] text-[#64748b]">
              Target: <strong className="text-white">{currentAsset.symbol}</strong>
            </p>
          </div>
        </div>

        {/* Master Run/Pause Switch */}
        <button
          onClick={onToggleBot}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            botActive
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30"
              : "bg-cyan-500 hover:bg-cyan-400 text-black shadow-md shadow-cyan-500/20"
          }`}
        >
          {botActive ? (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span>PAUSE BOT</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>START BOT</span>
            </>
          )}
        </button>
      </div>

      {/* Controls: Strategy & Speed */}
      <div className="p-3 bg-[#080b12] border-b border-[#1a2333] space-y-2.5 text-xs">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-[#64748b]">
            Active Strategy
          </label>
          <div className="flex items-center gap-1 text-[10px] text-[#64748b]">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Auto-signal</span>
          </div>
        </div>

        <select
          value={strategyId}
          onChange={(e) => onChangeStrategy(e.target.value)}
          className="w-full px-2.5 py-1.5 bg-[#121824] border border-[#1e293b] rounded-lg text-white text-xs focus:outline-none focus:border-cyan-500/50"
        >
          {STRATEGIES.map((st) => (
            <option key={st.id} value={st.id}>
              {st.name}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-[#64748b] italic">
          {STRATEGIES.find((s) => s.id === strategyId)?.desc}
        </p>

        {/* Speed / Frequency selector */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-[#64748b]">Scan Cadence</span>
          <div className="flex items-center gap-1">
            {[2, 5, 10].map((sec) => (
              <button
                key={sec}
                onClick={() => onChangeSpeed(sec)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                  speedSec === sec
                    ? "bg-[#1f2b42] text-cyan-300 border-cyan-500/40 font-bold"
                    : "bg-[#121824] text-[#64748b] border-[#1e293b] hover:text-[#94a3b8]"
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Terminal / Strategy Logs */}
      <div className="flex flex-col flex-1 min-h-[160px] max-h-[220px] bg-[#06080e] overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#121824] text-[10px] text-[#64748b]">
          <span className="flex items-center gap-1 font-mono">
            <Terminal className="w-3 h-3 text-cyan-400" />
            BOT EXECUTION AUDIT LOG
          </span>
          {logs.length > 0 && (
            <button
              onClick={onClearLogs}
              className="hover:text-white transition-colors"
              title="Clear terminal logs"
            >
              <Trash2 className="w-3 h-3 text-[#64748b] hover:text-rose-400" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 font-mono text-[11px]">
          {logs.length === 0 ? (
            <div className="text-center py-6 text-[10px] text-[#475569]">
              Engine idle. Start bot or wait for next technical trigger.
            </div>
          ) : (
            logs.map((log) => {
              const badgeColor =
                log.type === "SIGNAL"
                  ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
                  : log.type === "ORDER"
                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                  : log.type === "RISK"
                  ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
                  : "text-[#94a3b8] bg-[#121824] border-[#1e293b]";

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-2 text-[10.5px] leading-relaxed border-b border-[#0f1420]/50 pb-1"
                >
                  <span className="text-[#475569] shrink-0">{log.timestamp}</span>
                  <span
                    className={`text-[9px] uppercase px-1 py-0.2 rounded border font-semibold shrink-0 ${badgeColor}`}
                  >
                    {log.type}
                  </span>
                  <span className="text-[#cbd5e1] break-words">{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
