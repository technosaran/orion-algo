"use client";

import React, { useState } from "react";
import {
  BarChart3,
  Calendar,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Plus,
  Tag,
  Star,
  Award,
  ShieldAlert,
  Sliders,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { formatINR } from "@/lib/formatters";

interface JournalEntry {
  id: string;
  date: string;
  symbol: string;
  strategy: string;
  pnl: number;
  setupQuality: number; // 1 to 5
  tags: string[];
  notes: string;
}

const SAMPLE_JOURNAL: JournalEntry[] = [
  {
    id: "j1",
    date: "20-Nov-2026",
    symbol: "NIFTY50",
    strategy: "VWAP + Supertrend Intraday",
    pnl: 14250,
    setupQuality: 5,
    tags: ["Disciplined", "Trend Day", "No FOMO"],
    notes: "Perfect pullback entry near 20 EMA right after pre-market gap fill. Trailed SL diligently into 3:15 PM.",
  },
  {
    id: "j2",
    date: "19-Nov-2026",
    symbol: "BANKNIFTY",
    strategy: "9/21 EMA Scalper",
    pnl: -4800,
    setupQuality: 3,
    tags: ["Choppy", "Stoploss Hit"],
    notes: "Rangebound morning expiry session. Cut loss strictly per RMS rule ceiling without averaging down.",
  },
  {
    id: "j3",
    date: "18-Nov-2026",
    symbol: "RELIANCE",
    strategy: "20-Period High Breakout",
    pnl: 8900,
    setupQuality: 4,
    tags: ["Breakout", "High Volume"],
    notes: "Heavy institutional buying in Reliance post-AGM. Target reached at 1:2.5 risk-reward.",
  },
  {
    id: "j4",
    date: "15-Nov-2026",
    symbol: "NIFTY50",
    strategy: "9:20 AM Theta Scalp",
    pnl: 6500,
    setupQuality: 5,
    tags: ["Theta Harvest", "Options"],
    notes: "Fast premium decay on weekly expiry. Both legs squared off with 45% premium captured.",
  },
];

// 2026 Monthly returns calendar sample data
const MONTHLY_P_N_L = [
  { month: "Jan", pnl: 45200, returnPct: 4.5, trades: 38, winRate: 68 },
  { month: "Feb", pnl: 38400, returnPct: 3.8, trades: 32, winRate: 62 },
  { month: "Mar", pnl: -12500, returnPct: -1.2, trades: 44, winRate: 50 },
  { month: "Apr", pnl: 56100, returnPct: 5.6, trades: 36, winRate: 72 },
  { month: "May", pnl: 72400, returnPct: 7.2, trades: 40, winRate: 75 },
  { month: "Jun", pnl: -8200, returnPct: -0.8, trades: 30, winRate: 53 },
  { month: "Jul", pnl: 61800, returnPct: 6.1, trades: 42, winRate: 71 },
  { month: "Aug", pnl: 48900, returnPct: 4.8, trades: 35, winRate: 65 },
  { month: "Sep", pnl: 81200, returnPct: 8.1, trades: 46, winRate: 78 },
  { month: "Oct", pnl: 52400, returnPct: 5.2, trades: 39, winRate: 69 },
  { month: "Nov", pnl: 34850, returnPct: 3.4, trades: 24, winRate: 70 },
];

export default function AnalyticsPage() {
  const [journal, setJournal] = useState<JournalEntry[]>(SAMPLE_JOURNAL);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    symbol: "NIFTY50",
    strategy: "VWAP Intraday",
    pnl: 5000,
    setupQuality: 5,
    tags: "Disciplined",
    notes: "",
  });

  const totalRealizedPnl = journal.reduce((sum, j) => sum + j.pnl, 0) + 470000;
  const winCount = journal.filter((j) => j.pnl > 0).length;
  const winRate = Math.round((winCount / journal.length) * 100);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const entry: JournalEntry = {
      id: String(Date.now()),
      date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      symbol: newEntry.symbol,
      strategy: newEntry.strategy,
      pnl: Number(newEntry.pnl) || 0,
      setupQuality: newEntry.setupQuality,
      tags: newEntry.tags.split(",").map((t) => t.trim()).filter(Boolean),
      notes: newEntry.notes,
    };
    setJournal([entry, ...journal]);
    setShowAddModal(false);
    setNewEntry({ symbol: "NIFTY50", strategy: "VWAP Intraday", pnl: 5000, setupQuality: 5, tags: "Disciplined", notes: "" });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#0b0e14] text-[#cbd5e1] space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1a2230]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Institutional Quantitative Analytics & Psychological Journal</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Performance Analytics & Trade Journal
          </h1>
          <p className="text-xs md:text-sm text-[#94a3b8] mt-1">
            Track monthly returns, drawdown recovery curves, risk-adjusted Sharpe/Sortino ratios, and maintain a disciplined trader diary.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-98"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Journal Entry</span>
        </button>
      </div>

      {/* 4 Quantitative Scorecards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0e1422] border border-[#1b263b]">
          <span className="text-xs text-[#94a3b8] font-medium block">Net Realized P&L</span>
          <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
            +{formatINR(totalRealizedPnl)}
          </div>
          <span className="text-[10px] text-[#64748b]">Total Capital Growth</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0e1422] border border-[#1b263b]">
          <span className="text-xs text-[#94a3b8] font-medium block">Profit Factor</span>
          <div className="text-xl font-mono font-bold text-white mt-1">
            2.38
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold">Institutional Grade (&gt; 2.0)</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0e1422] border border-[#1b263b]">
          <span className="text-xs text-[#94a3b8] font-medium block">Sharpe / Sortino</span>
          <div className="text-xl font-mono font-bold text-cyan-400 mt-1">
            2.45 / 3.12
          </div>
          <span className="text-[10px] text-[#64748b]">Risk-Adjusted Return</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0e1422] border border-[#1b263b]">
          <span className="text-xs text-[#94a3b8] font-medium block">Max Drawdown</span>
          <div className="text-xl font-mono font-bold text-rose-400 mt-1">
            -4.8%
          </div>
          <span className="text-[10px] text-[#64748b]">Peak-to-Trough Dip</span>
        </div>
      </div>

      {/* Monthly Returns Calendar Heatmap */}
      <div className="p-5 rounded-2xl bg-[#0e1422] border border-[#1b263b] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#182338]">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            2026 Monthly Returns Heatmap
          </h3>
          <span className="text-xs font-mono text-emerald-400 font-bold">
            YTD Cumulative: +47.1%
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {MONTHLY_P_N_L.map((m) => {
            const isProfit = m.pnl >= 0;
            return (
              <div
                key={m.month}
                className={`p-3 rounded-xl border text-center transition-all ${
                  isProfit
                    ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-950/20 border-rose-500/30 text-rose-300"
                }`}
              >
                <span className="text-xs font-bold block">{m.month} 2026</span>
                <span className="text-base font-mono font-extrabold block my-1">
                  {isProfit ? "+" : ""}{m.returnPct}%
                </span>
                <span className="text-[10px] text-[#94a3b8] block font-mono">
                  {formatINR(m.pnl)} ({m.winRate}% win)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trade Journal & Reflection Section */}
      <div className="p-5 rounded-2xl bg-[#0e1422] border border-[#1b263b] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#182338]">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            Trader Diary & Psychology Log
          </h3>
          <span className="text-xs text-[#64748b]">Review past executions & emotional discipline</span>
        </div>

        <div className="space-y-3">
          {journal.map((entry) => (
            <div
              key={entry.id}
              className="p-4 rounded-xl bg-[#080b12] border border-[#182338] hover:border-[#22314a] transition-all space-y-2"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-bold text-white">{entry.symbol}</span>
                  <span className="text-xs text-[#94a3b8]">{entry.strategy}</span>
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {Array.from({ length: entry.setupQuality }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-current" />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-sm font-mono font-bold ${entry.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {entry.pnl > 0 ? "+" : ""}{formatINR(entry.pnl)}
                  </span>
                  <span className="text-[11px] font-mono text-[#64748b]">{entry.date}</span>
                </div>
              </div>

              <p className="text-xs text-[#cbd5e1] leading-relaxed font-sans">{entry.notes}</p>

              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                {entry.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#141b2c] border border-[#22314a] text-cyan-300"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Journal Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0e1422] border border-[#1b263b] rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Add Trade Journal Entry</h3>
            <form onSubmit={handleAddEntry} className="space-y-3 text-xs">
              <div>
                <label className="text-[#94a3b8] block mb-1">Trading Symbol</label>
                <input
                  type="text"
                  value={newEntry.symbol}
                  onChange={(e) => setNewEntry({ ...newEntry, symbol: e.target.value })}
                  className="w-full px-3 py-2 bg-[#080b12] border border-[#182338] rounded-lg text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#94a3b8] block mb-1">Strategy Used</label>
                  <input
                    type="text"
                    value={newEntry.strategy}
                    onChange={(e) => setNewEntry({ ...newEntry, strategy: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080b12] border border-[#182338] rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-[#94a3b8] block mb-1">P&L (₹)</label>
                  <input
                    type="number"
                    value={newEntry.pnl}
                    onChange={(e) => setNewEntry({ ...newEntry, pnl: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#080b12] border border-[#182338] rounded-lg text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-[#94a3b8] block mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={newEntry.tags}
                  onChange={(e) => setNewEntry({ ...newEntry, tags: e.target.value })}
                  placeholder="Disciplined, Trend Day, Pre-market"
                  className="w-full px-3 py-2 bg-[#080b12] border border-[#182338] rounded-lg text-white"
                />
              </div>
              <div>
                <label className="text-[#94a3b8] block mb-1">Trade Reflection & Execution Notes</label>
                <textarea
                  rows={3}
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                  placeholder="How was emotional discipline? Did you follow your stops? What could be improved?"
                  className="w-full px-3 py-2 bg-[#080b12] border border-[#182338] rounded-lg text-white"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#141b2c] text-[#94a3b8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
