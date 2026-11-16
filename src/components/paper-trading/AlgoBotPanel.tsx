"use client";

import React, { useState } from "react";
import {
  Cpu,
  Play,
  Pause,
  Trash2,
  Terminal,
  ShieldCheck,
  Globe,
  Sliders,
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
  scanAllAssets?: boolean;
  onToggleScanAll?: (val: boolean) => void;
}

const STRATEGIES = [
  {
    id: "rsi_mean_reversion",
    name: "RSI Mean Reversion",
    desc: "Buys when RSI < 30 (oversold) and exits when RSI > 65.",
  },
  {
    id: "ema_crossover",
    name: "Dual EMA Crossover",
    desc: "Enters when EMA(20) crosses above EMA(50).",
  },
  {
    id: "bb_volatility_scalper",
    name: "Bollinger Bands Reversion",
    desc: "Buys at lower Bollinger Band and exits at middle moving average.",
  },
  {
    id: "macd_trend",
    name: "MACD Momentum Trend",
    desc: "Buys when MACD line crosses above signal line with positive momentum.",
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
  scanAllAssets = false,
  onToggleScanAll,
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
                Automated Algo Bot
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
                    botActive ? "bg-cyan-400 animate-pulse" : "bg-[#64748b]"
                  }`}
                />
                {botActive ? "RUNNING" : "STANDBY"}
              </span>
            </div>
            <p className="text-[10px] text-[#64748b]">
              Target: <strong className="text-white">{scanAllAssets ? "All Watchlist Assets" : currentAsset.symbol}</strong>
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
              <span>Pause Bot</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>Start Bot</span>
            </>
          )}
        </button>
      </div>

      {/* Execution Architecture Badge */}
      <div className="px-3.5 py-1.5 bg-[#080d16] border-b border-[#1a2333] flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Execution: Paper Simulation (Zero Risk)</span>
        </div>
        <span className="text-[#64748b] font-mono">Broker Ready Architecture</span>
      </div>

      {/* Controls: Strategy & Scanning Target */}
      <div className="p-3 bg-[#080b12] border-b border-[#1a2333] space-y-2.5 text-xs">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-[#64748b]">
            Active Strategy
          </label>
          {onToggleScanAll && (
            <div className="flex items-center gap-1 bg-[#121824] p-0.5 rounded border border-[#1e293b]">
              <button
                type="button"
                onClick={() => onToggleScanAll(false)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  !scanAllAssets ? "bg-cyan-500/20 text-cyan-300" : "text-[#64748b]"
                }`}
              >
                {currentAsset.symbol}
              </button>
              <button
                type="button"
                onClick={() => onToggleScanAll(true)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  scanAllAssets ? "bg-cyan-500/20 text-cyan-300" : "text-[#64748b]"
                }`}
              >
                All Assets
              </button>
            </div>
          )}
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
        <p className="text-[10px] text-[#64748b]">
          {STRATEGIES.find((s) => s.id === strategyId)?.desc}
        </p>

        {/* Speed / Frequency selector */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-[#64748b]">Cycle Frequency</span>
          <div className="flex items-center gap-1">
            {[1, 3, 5, 10].map((sec) => (
              <button
                key={sec}
                onClick={() => onChangeSpeed(sec)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                  speedSec === sec
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-bold"
                    : "bg-[#121824] border-[#1e293b] text-[#64748b] hover:text-[#cbd5e1]"
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bot Logs Console */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#0e1422] border-b border-[#1a2333] text-[10px] text-[#64748b]">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-cyan-400" />
            <span className="font-mono font-semibold uppercase">Execution Signals & Orders</span>
            <span>({logs.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-[#64748b] hover:text-white"
            >
              {collapsed ? "Expand" : "Collapse"}
            </button>
            {logs.length > 0 && (
              <button
                onClick={onClearLogs}
                className="hover:text-rose-400 transition-colors"
                title="Clear Logs"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {!collapsed && (
          <div className="p-2.5 max-h-44 overflow-y-auto space-y-1.5 font-mono text-[10px] bg-[#06080e]">
            {logs.length === 0 ? (
              <div className="py-4 text-center text-[#475569]">
                Bot standby. Press &quot;Start Bot&quot; to begin automated signals on live market data.
              </div>
            ) : (
              logs.slice(0, 30).map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-1.5 leading-relaxed text-[#94a3b8]"
                >
                  <span className="text-[#475569] shrink-0 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  <span
                    className={`font-bold px-1 rounded text-[9px] ${
                      log.type === "ORDER"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : log.type === "SIGNAL"
                        ? "bg-cyan-500/20 text-cyan-400"
                        : log.type === "RISK"
                        ? "bg-rose-500/20 text-rose-400"
                        : "bg-[#1e293b] text-[#94a3b8]"
                    }`}
                  >
                    {log.type}
                  </span>
                  <span className="break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
