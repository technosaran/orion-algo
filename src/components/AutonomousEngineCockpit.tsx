"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Zap,
  Play,
  Square,
  RefreshCw,
  Flame,
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { formatINR } from "@/lib/formatters";

interface SimulationResult {
  status: string;
  symbol: string;
  strategy_id: string;
  total_ticks: number;
  trades_executed: number;
  initial_balance: number;
  final_balance: number;
  realized_pnl: number;
  win_rate_pct: number;
  max_drawdown_pct: number;
  kill_switch_tripped: boolean;
  trades: any[];
  rms_events: any[];
}

export function AutonomousEngineCockpit() {
  const [botActive, setBotActive] = useState<boolean>(false);
  const [strategyId, setStrategyId] = useState<string>("vwap_supertrend");
  const [killSwitchTripped, setKillSwitchTripped] = useState<boolean>(false);
  const [dailyLoss, setDailyLoss] = useState<number>(0);
  const [maxDailyLoss, setMaxDailyLoss] = useState<number>(10000);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [logs, setLogs] = useState<any[]>([]);

  // 1. Fetch live status
  const fetchStatus = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/live/status").catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setKillSwitchTripped(data.killSwitchTripped || false);
        setMaxDailyLoss(data.maxDailyLossLimit || 10000);
        setDailyLoss(data.dailyRealizedLoss || 0);
        setCooldownRemaining(data.cooldownRemainingMinutes || 0);
      }

      const accRes = await fetch("http://localhost:8000/api/v1/paper-trading/account").catch(() => null);
      if (accRes && accRes.ok) {
        const acc = await accRes.json();
        setBotActive(acc.bot_active || false);
        if (acc.bot_strategy_id) setStrategyId(acc.bot_strategy_id);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  // 2. Toggle Bot
  const toggleBot = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/paper-trading/bot/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !botActive, strategy_id: strategyId }),
      });
      if (res.ok) {
        const data = await res.json();
        setBotActive(data.bot_active);
      }
    } catch {
      setBotActive(!botActive);
    } finally {
      setLoading(false);
    }
  };

  // 3. Run Simulated 24/7 Session
  const runSimulation = async () => {
    setSimulating(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/paper-trading/simulate-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: "NIFTY50",
          strategy_id: strategyId,
          ticks_count: 60,
          initial_balance: 500000.0,
          base_price: 24500.0,
          max_daily_loss: maxDailyLoss,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSimResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  };

  const lossPct = Math.min(100, Math.max(0, (dailyLoss / maxDailyLoss) * 100));

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      {/* Background Glow */}
      <div className={`absolute top-0 right-0 w-96 h-96 blur-3xl rounded-full pointer-events-none -mr-20 -mt-20 opacity-20 ${
        botActive ? "bg-emerald-500" : "bg-indigo-500"
      }`} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full animate-ping ${botActive ? "bg-emerald-400" : "bg-slate-500"}`} />
            <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              Autonomous Execution Engine
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                killSwitchTripped
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                  : botActive
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}>
                {killSwitchTripped ? "CIRCUIT BREAKER TRIPPED" : botActive ? "AUTONOMOUS TRADING LIVE" : "STANDBY"}
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Institutional zero-emotion algorithmic trading. Pre-trade RMS circuit breakers, dynamic trailing SL, and 15:15 IST MIS liquidation.
          </p>
        </div>

        {/* Master Control Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleBot}
            disabled={loading || killSwitchTripped}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shadow-lg ${
              botActive
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {botActive ? <Square className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
            {botActive ? "Deactivate Autonomous Bot" : "Engage Autonomous Trading"}
          </button>

          <button
            onClick={runSimulation}
            disabled={simulating}
            className="px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-medium text-sm flex items-center gap-2 transition-all"
            title="Execute a deterministic 60-tick simulated trading session to stress test the autonomous engine off-hours."
          >
            <RefreshCw className={`w-4 h-4 ${simulating ? "animate-spin" : ""}`} />
            {simulating ? "Simulating..." : "Test 24/7 Session"}
          </button>
        </div>
      </div>

      {/* Grid: Emotion-Free RMS Monitors */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        {/* Strategy Selector */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Calibrated Strategy
          </label>
          <select
            value={strategyId}
            onChange={(e) => setStrategyId(e.target.value)}
            disabled={botActive}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60"
          >
            <option value="vwap_supertrend">NIFTY Intraday VWAP + Supertrend</option>
            <option value="ema_crossover">BANKNIFTY 9/21 EMA Scalper</option>
            <option value="rsi_mean_reversion">RSI Volatility Mean Reversion</option>
            <option value="donchian_breakout">RELIANCE 20-Period Breakout</option>
          </select>
          <span className="text-[11px] text-slate-500 block mt-2">
            Evaluates 5-minute ticks with LONG & SHORT bracket SL/TP.
          </span>
        </div>

        {/* Daily Loss Circuit Breaker */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
              Daily Loss Ceiling
            </span>
            <span className="text-xs font-medium text-slate-300">
              {formatINR(dailyLoss)} / {formatINR(maxDailyLoss)}
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                lossPct > 75 ? "bg-rose-500" : lossPct > 40 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.max(5, lossPct)}%` }}
            />
          </div>
          <span className="text-[11px] text-slate-500 block mt-2">
            Auto Kill Switch trips if daily loss reaches ceiling.
          </span>
        </div>

        {/* Anti-Revenge Trading Cooldown */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Anti-Tilt Cooldown
            </span>
            <span className={`text-xs font-bold ${cooldownRemaining > 0 ? "text-amber-400" : "text-emerald-400"}`}>
              {cooldownRemaining > 0 ? `${cooldownRemaining}m COOLING` : "DISCIPLINE READY"}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>2 consecutive losses = 30 min entry freeze</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            Zero revenge trading during choppy whipsaws.
          </span>
        </div>

        {/* 3:15 PM MIS Cutoff Guard */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              MIS Intraday Cutoff
            </span>
            <span className="text-xs font-bold text-emerald-400">15:15 IST</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Auto Square-Off Active</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            Zero overnight gap exposure on intraday positions.
          </span>
        </div>
      </div>

      {/* Simulation Results Drawer */}
      {simResult && (
        <div className="mt-6 bg-slate-950 border border-indigo-500/40 rounded-xl p-5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                24/7 Off-Hours Simulation Session Audit Result ({simResult.symbol})
              </h3>
            </div>
            <button
              onClick={() => setSimResult(null)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Total Ticks</span>
              <span className="text-lg font-bold text-white">{simResult.total_ticks}</span>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Trades Executed</span>
              <span className="text-lg font-bold text-white">{simResult.trades_executed}</span>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Win Rate</span>
              <span className="text-lg font-bold text-emerald-400">{simResult.win_rate_pct}%</span>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Realized Net P&L</span>
              <span className={`text-lg font-bold ${simResult.realized_pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {simResult.realized_pnl >= 0 ? "+" : ""}{formatINR(simResult.realized_pnl)}
              </span>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Max Drawdown</span>
              <span className="text-lg font-bold text-slate-200">{simResult.max_drawdown_pct}%</span>
            </div>
          </div>

          {/* Trade Ledger */}
          {simResult.trades && simResult.trades.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Simulated Trade Ledger (Roundtrip Brokerage Included)
              </h4>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {simResult.trades.map((t, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs bg-slate-900/40 px-3 py-1.5 rounded border border-slate-800/60"
                  >
                    <span className="font-mono text-slate-300">
                      {t.side} {t.quantity} Qty @ ₹{t.entry_price} → ₹{t.exit_price}
                    </span>
                    <span className="text-slate-500">[{t.exit_reason}]</span>
                    <span className={`font-semibold ${t.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {t.pnl >= 0 ? "+" : ""}{formatINR(t.pnl)} ({t.pnl_pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
