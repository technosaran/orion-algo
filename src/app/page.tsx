"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sliders,
  FlaskConical,
  Sparkles,
  ArrowRight,
  Clock,
  TrendingUp,
  Wallet,
  Layers,
  CandlestickChart,
  Database,
  ShieldAlert,
} from "lucide-react";
import { STRATEGY_TEMPLATES } from "@/lib/strategy-templates";
import { loadPaperStateFromDb } from "@/lib/paperTradingStorage";
import { formatINR } from "@/lib/formatters";

export default function DashboardPage() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [marketClock, setMarketClock] = useState<{
    timeIST: string;
    isOpen: boolean;
    session: string;
  }>({
    timeIST: "",
    isOpen: false,
    session: "Market Closed",
  });
  const [paperBalance, setPaperBalance] = useState<number>(1000000);
  const [botActive, setBotActive] = useState<boolean>(false);

  useEffect(() => {
    // 1. Fetch live quotes from Next.js API
    fetch("/api/market-data/quotes")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.quotes) setQuotes(d.quotes);
      })
      .catch(() => {});

    // 2. Load paper trading state
    loadPaperStateFromDb().then(({ state }) => {
      setPaperBalance(state.cashBalance);
      setBotActive(state.botActive);
    });

    // 3. Simple IST market status
    const updateClock = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const istDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const day = istDate.getDay();
      const mins = istDate.getHours() * 60 + istDate.getMinutes();
      const isWeekday = day >= 1 && day <= 5;
      const isOpen = isWeekday && mins >= 555 && mins < 930; // 09:15 - 15:30

      setMarketClock({
        timeIST: timeStr,
        isOpen,
        session: isOpen ? "Market Open" : "Market Closed",
      });
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const topTickers = quotes.filter((q) =>
    ["NIFTY50", "BANKNIFTY", "SENSEX", "RELIANCE", "CRUDEOIL", "GOLD"].includes(q.symbol)
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#080a0f] text-[#cbd5e1] space-y-6">
      {/* Real-Time Ticker Strip */}
      {topTickers.length > 0 && (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {topTickers.map((t) => (
            <div
              key={t.symbol}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0e1422] border border-[#1b263b] shrink-0"
            >
              <span className="font-semibold text-white">{t.symbol}</span>
              <span className="font-mono text-[#cbd5e1]">
                ₹{t.price?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className={`font-mono text-[11px] font-semibold ${
                  t.change24h >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {t.change24h >= 0 ? "+" : ""}
                {t.change24h}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0d1624] via-[#0b1019] to-[#0d1624] border border-[#1d293d] p-6 md:p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AlgoX • Quantitative Trading Platform</span>
          </div>

          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Strategy & Trading Dashboard
          </h1>

          <p className="text-sm text-[#94a3b8] leading-relaxed">
            Create rule-based trading strategies, test against historical market data, and practice simulated trading in real time with zero capital risk.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/strategy-builder"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98]"
            >
              <Sliders className="w-4 h-4" />
              <span>Strategy Builder</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/backtesting"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#131b2a] hover:bg-[#1a2538] border border-[#222e42] text-[#cbd5e1] hover:text-white font-medium text-sm transition-all"
            >
              <FlaskConical className="w-4 h-4 text-cyan-400" />
              <span>Backtesting</span>
            </Link>

            <Link
              href="/paper-trading"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#131b2a] hover:bg-[#1a2538] border border-[#222e42] text-[#cbd5e1] hover:text-white font-medium text-sm transition-all"
            >
              <CandlestickChart className="w-4 h-4 text-amber-400" />
              <span>Paper Trading</span>
            </Link>

            <Link
              href="/live-trading"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#131b2a] hover:bg-[#1a2538] border border-[#222e42] text-[#cbd5e1] hover:text-white font-medium text-sm transition-all"
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Live Trading & RMS</span>
            </Link>

            <Link
              href="/data"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#131b2a] hover:bg-[#1a2538] border border-[#222e42] text-[#cbd5e1] hover:text-white font-medium text-sm transition-all"
            >
              <Database className="w-4 h-4 text-cyan-400" />
              <span>Data Hub</span>
            </Link>
          </div>
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none blur-2xl" />
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Market Hours */}
        <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94a3b8]">Market Hours (IST)</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-2">
            <div className="text-xl font-bold font-mono text-white flex items-center gap-2">
              <span>{marketClock.timeIST || "09:15:00"}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  marketClock.isOpen ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                }`}
              >
                {marketClock.session}
              </span>
            </div>
            <p className="text-[11px] text-[#64748b] mt-0.5">Regular Session: 09:15 - 15:30 IST</p>
          </div>
          <div className="text-[11px] text-[#94a3b8] pt-2 border-t border-[#162030] flex items-center justify-between">
            <span>Trading Days: Mon – Fri</span>
            <span className="text-emerald-400 font-mono">NSE / BSE</span>
          </div>
        </div>

        {/* Paper Portfolio */}
        <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94a3b8]">Paper Trading Capital</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2">
            <div className="text-xl font-bold font-mono text-white">
              {formatINR(paperBalance, { decimals: 2 })}
            </div>
            <p className="text-[11px] text-[#64748b] mt-0.5">Available virtual buying power</p>
          </div>
          <div className="text-[11px] text-[#94a3b8] pt-2 border-t border-[#162030] flex items-center justify-between">
            <span>Automated Bot:</span>
            <span
              className={`font-mono text-[10px] px-2 py-0.5 rounded font-semibold ${
                botActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-[#162030] text-[#64748b]"
              }`}
            >
              {botActive ? "ACTIVE" : "STANDBY"}
            </span>
          </div>
        </div>

        {/* Strategy Templates count */}
        <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94a3b8]">Strategy Library</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="my-2">
            <div className="text-xl font-bold font-mono text-white">
              {STRATEGY_TEMPLATES.length} Templates
            </div>
            <p className="text-[11px] text-[#64748b] mt-0.5">Ready to load into strategy builder</p>
          </div>
          <div className="text-[11px] text-[#94a3b8] pt-2 border-t border-[#162030] flex items-center justify-between">
            <span>Formats:</span>
            <span className="text-indigo-400 font-medium">Python & JSON</span>
          </div>
        </div>
      </div>

      {/* Featured Strategy Templates */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Strategy Templates</h2>
            <p className="text-xs text-[#94a3b8]">
              Select a pre-built strategy to customize and backtest.
            </p>
          </div>
          <Link
            href="/strategy-builder"
            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>Custom Strategy</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STRATEGY_TEMPLATES.map((tmpl) => (
            <Link
              key={tmpl.id}
              href={`/strategy-builder?template=${tmpl.id}`}
              className="bg-[#0b0e14] border border-[#1a2230] hover:border-emerald-500/40 rounded-xl p-4 flex flex-col justify-between space-y-3 transition-all hover:shadow-lg hover:shadow-emerald-500/5 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {tmpl.category.replace("_", " ")}
                  </span>
                  <span className="text-xs font-mono text-[#94a3b8]">{tmpl.timeframe}</span>
                </div>

                <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                  {tmpl.name}
                </h3>

                <p className="text-xs text-[#64748b] line-clamp-2 leading-relaxed">{tmpl.description}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#162030] text-[11px]">
                <span className="font-mono text-[#cbd5e1] font-semibold">{tmpl.symbol}</span>
                <span className="text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  <span>Open in Builder</span>
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
