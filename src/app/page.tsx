"use client";

import React from "react";
import Link from "next/link";
import {
  Sliders,
  FlaskConical,
  Sparkles,
  ArrowRight,
  Zap,
  Activity,
  Layers,
  Code2,
  CandlestickChart,
} from "lucide-react";
import { STRATEGY_TEMPLATES } from "@/lib/strategy-templates";

export default function DashboardPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#080a0f] text-[#cbd5e1] space-y-8">
      {/* Top Banner / Welcome Cockpit */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0d1624] via-[#0b1019] to-[#0d1624] border border-[#1d293d] p-6 md:p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Orion Algo • Indian Markets Algorithmic Suite</span>
          </div>

          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Indian Markets Strategy Cockpit
          </h1>

          <p className="text-sm text-[#94a3b8] leading-relaxed">
            Design, backtest, and simulate rule-based algorithmic trading strategies across NSE F&O (NIFTY & BANKNIFTY), NSE Cash, and MCX Commodities in Indian Rupees (₹) with Zerodha/Dhan flat brokerage models.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/strategy-builder"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
            >
              <Sliders className="w-4 h-4" />
              <span>Launch Section Strategy Builder</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/backtesting"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#131b2a] hover:bg-[#1a2538] border border-[#222e42] text-[#cbd5e1] hover:text-white font-medium text-sm transition-all shadow-sm"
            >
              <FlaskConical className="w-4 h-4 text-cyan-400" />
              <span>Backtest Lab</span>
            </Link>

            <Link
              href="/paper-trading"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:text-amber-300 font-semibold text-sm transition-all shadow-sm"
            >
              <CandlestickChart className="w-4 h-4 text-amber-400" />
              <span>Paper Trading</span>
            </Link>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none blur-2xl"></div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-[#94a3b8]">
            <span className="text-xs font-medium">Modular Sections</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">5 Sections</div>
          <p className="text-[11px] text-[#64748b]">Setup • Signals • Risk • Sizing • Verification</p>
        </div>

        <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-[#94a3b8]">
            <span className="text-xs font-medium">Active Indicators</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">12+ Types</div>
          <p className="text-[11px] text-[#64748b]">EMA, SMA, RSI, Bollinger, Supertrend, VWAP</p>
        </div>

        <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-[#94a3b8]">
            <span className="text-xs font-medium">Simulation Engine</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">Sub-50ms</div>
          <p className="text-[11px] text-[#64748b]">Deterministic tick/candle simulation</p>
        </div>

        <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-[#94a3b8]">
            <span className="text-xs font-medium">Code Generation</span>
            <Code2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">Python + JSON</div>
          <p className="text-[11px] text-[#64748b]">100% Exportable algorithmic scripts</p>
        </div>
      </div>

      {/* Featured Strategy Templates */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Ready-to-Deploy Strategy Templates
            </h2>
            <p className="text-xs text-[#94a3b8]">
              Load pre-configured quantitative strategies directly into the Section Strategy Builder.
            </p>
          </div>
          <Link
            href="/strategy-builder"
            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>Open Builder</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STRATEGY_TEMPLATES.map((tmpl) => (
            <Link
              key={tmpl.id}
              href="/strategy-builder"
              className="bg-[#0b0e14] border border-[#1a2230] hover:border-emerald-500/40 rounded-xl p-4 flex flex-col justify-between space-y-3 transition-all hover:shadow-lg hover:shadow-emerald-500/5 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {tmpl.category.replace("_", " ")}
                  </span>
                  <span className="text-xs font-mono text-[#94a3b8]">
                    {tmpl.timeframe}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {tmpl.name}
                </h3>

                <p className="text-xs text-[#64748b] line-clamp-2 leading-relaxed">
                  {tmpl.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#162030] text-[11px]">
                <span className="font-mono text-[#cbd5e1] font-semibold">
                  {tmpl.symbol}
                </span>
                <span className="text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  <span>Build</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
