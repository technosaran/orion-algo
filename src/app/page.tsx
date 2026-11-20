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
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#12141a] text-[#e0e0e0] space-y-6 font-sans">
      {/* Real-Time Ticker Strip (Zerodha Kite Style) */}
      {topTickers.length > 0 && (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden text-xs">
          {topTickers.map((t) => (
            <div
              key={t.symbol}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#191c24] border border-[#232733] shrink-0"
            >
              <span className="font-semibold text-white">{t.symbol}</span>
              <span className="font-mono tabular-nums text-[#e0e0e0]">
                ₹{t.price?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className={`font-mono tabular-nums text-[11px] font-semibold ${
                  t.change24h >= 0 ? "text-[#4caf50]" : "text-[#df514c]"
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#191c24] via-[#161922] to-[#191c24] border border-[#232733] p-6 md:p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4184f3]/10 border border-[#4184f3]/30 text-[#4184f3] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AlgoX • Quantitative Trading Platform</span>
          </div>

          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Strategy & Trading Dashboard
          </h1>

          <p className="text-sm text-[#9b9b9b] leading-relaxed">
            Create rule-based trading strategies, test against historical market data, and practice simulated trading in real time with Zerodha-level execution precision.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/nse-terminal"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-md shadow-emerald-500/25 active:scale-[0.98]"
            >
              <TrendingUp className="w-4 h-4" />
              <span>NSE Terminal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/options-lab"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14171f] hover:bg-[#202430] border border-[#232733] text-[#e0e0e0] hover:text-white font-medium text-sm transition-all"
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Options Lab</span>
            </Link>

            <Link
              href="/screener"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14171f] hover:bg-[#202430] border border-[#232733] text-[#e0e0e0] hover:text-white font-medium text-sm transition-all"
            >
              <Sliders className="w-4 h-4 text-[#4184f3]" />
              <span>Screener</span>
            </Link>

            <Link
              href="/strategy-builder"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14171f] hover:bg-[#202430] border border-[#232733] text-[#e0e0e0] hover:text-white font-medium text-sm transition-all"
            >
              <Sliders className="w-4 h-4 text-[#4184f3]" />
              <span>Strategy Builder</span>
            </Link>

            <Link
              href="/backtesting"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14171f] hover:bg-[#202430] border border-[#232733] text-[#e0e0e0] hover:text-white font-medium text-sm transition-all"
            >
              <FlaskConical className="w-4 h-4 text-[#4184f3]" />
              <span>Backtesting</span>
            </Link>

            <Link
              href="/paper-trading"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14171f] hover:bg-[#202430] border border-[#232733] text-[#e0e0e0] hover:text-white font-medium text-sm transition-all"
            >
              <CandlestickChart className="w-4 h-4 text-[#ff5722]" />
              <span>Paper Trading</span>
            </Link>

            <Link
              href="/live-trading"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14171f] hover:bg-[#202430] border border-[#232733] text-[#e0e0e0] hover:text-white font-medium text-sm transition-all"
            >
              <ShieldAlert className="w-4 h-4 text-[#df514c]" />
              <span>Live Trading</span>
            </Link>

            <Link
              href="/analytics"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14171f] hover:bg-[#202430] border border-[#232733] text-[#e0e0e0] hover:text-white font-medium text-sm transition-all"
            >
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Journal & Analytics</span>
            </Link>
          </div>
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#4184f3]/10 to-transparent pointer-events-none blur-2xl" />
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Market Hours */}
        <div className="bg-[#191c24] border border-[#232733] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#9b9b9b]">Market Hours (IST)</span>
            <Clock className="w-4 h-4 text-[#4184f3]" />
          </div>
          <div className="my-2">
            <div className="text-xl font-bold font-mono tabular-nums text-white flex items-center gap-2">
              <span>{marketClock.timeIST || "09:15:00"}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  marketClock.isOpen ? "bg-[#4caf50]/20 text-[#4caf50] border border-[#4caf50]/30" : "bg-[#df514c]/20 text-[#df514c] border border-[#df514c]/30"
                }`}
              >
                {marketClock.session}
              </span>
            </div>
            <p className="text-[11px] text-[#666666] mt-0.5">Regular Session: 09:15 - 15:30 IST</p>
          </div>
          <div className="text-[11px] text-[#9b9b9b] pt-2 border-t border-[#232733] flex items-center justify-between">
            <span>Trading Days: Mon – Fri</span>
            <span className="text-[#4caf50] font-mono tabular-nums font-semibold">NSE / BSE</span>
          </div>
        </div>

        {/* Paper Portfolio */}
        <div className="bg-[#191c24] border border-[#232733] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#9b9b9b]">Paper Trading Capital</span>
            <Wallet className="w-4 h-4 text-[#4caf50]" />
          </div>
          <div className="my-2">
            <div className="text-xl font-bold font-mono tabular-nums text-white">
              {formatINR(paperBalance, { decimals: 2 })}
            </div>
            <p className="text-[11px] text-[#666666] mt-0.5">Available virtual buying power</p>
          </div>
          <div className="text-[11px] text-[#9b9b9b] pt-2 border-t border-[#232733] flex items-center justify-between">
            <span>Automated Bot:</span>
            <span
              className={`font-mono tabular-nums text-[10px] px-2 py-0.5 rounded font-semibold ${
                botActive ? "bg-[#4caf50]/10 text-[#4caf50] border border-[#4caf50]/30" : "bg-[#14171f] text-[#666666] border border-[#232733]"
              }`}
            >
              {botActive ? "ACTIVE" : "STANDBY"}
            </span>
          </div>
        </div>

        {/* Strategy Templates count */}
        <div className="bg-[#191c24] border border-[#232733] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#9b9b9b]">Strategy Library</span>
            <Layers className="w-4 h-4 text-[#4184f3]" />
          </div>
          <div className="my-2">
            <div className="text-xl font-bold font-mono tabular-nums text-white">
              {STRATEGY_TEMPLATES.length} Templates
            </div>
            <p className="text-[11px] text-[#666666] mt-0.5">Ready to load into strategy builder</p>
          </div>
          <div className="text-[11px] text-[#9b9b9b] pt-2 border-t border-[#232733] flex items-center justify-between">
            <span>Formats:</span>
            <span className="text-[#4184f3] font-medium">Python & JSON</span>
          </div>
        </div>
      </div>

      {/* Featured Strategy Templates */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Strategy Templates</h2>
            <p className="text-xs text-[#9b9b9b]">
              Select a pre-built strategy to customize and backtest.
            </p>
          </div>
          <Link
            href="/strategy-builder"
            className="text-xs font-medium text-[#4184f3] hover:text-[#3874d8] flex items-center gap-1 font-semibold"
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
              className="bg-[#191c24] border border-[#232733] hover:border-[#4184f3]/40 rounded-xl p-4 flex flex-col justify-between space-y-3 transition-all hover:shadow-lg hover:shadow-[#4184f3]/5 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#4184f3]/10 text-[#4184f3] border border-[#4184f3]/25">
                    {tmpl.category.replace("_", " ")}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-[#9b9b9b]">{tmpl.timeframe}</span>
                </div>

                <h3 className="text-sm font-semibold text-white group-hover:text-[#4184f3] transition-colors">
                  {tmpl.name}
                </h3>

                <p className="text-xs text-[#666666] line-clamp-2 leading-relaxed">{tmpl.description}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#232733] text-[11px]">
                <span className="font-mono tabular-nums text-[#e0e0e0] font-semibold">{tmpl.symbol}</span>
                <span className="text-[#4184f3] font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
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
