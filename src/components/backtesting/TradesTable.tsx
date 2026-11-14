"use client";

import React, { useState, useMemo } from "react";
import { TradeRecord } from "@/lib/backtest/types";
import {
  History,
  Download,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  Filter,
} from "lucide-react";

interface TradesTableProps {
  trades: TradeRecord[];
  symbol: string;
}

export function TradesTable({ trades, symbol }: TradesTableProps) {
  const [filter, setFilter] = useState<"ALL" | "WIN" | "LOSS">("ALL");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"id" | "pnl" | "pnlPct">("id");
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Filtered & Sorted Trades
  const filteredTrades = useMemo(() => {
    let list = trades;
    if (filter === "WIN") {
      list = list.filter((t) => t.pnl > 0);
    } else if (filter === "LOSS") {
      list = list.filter((t) => t.pnl <= 0);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.symbol.toLowerCase().includes(q) ||
          t.exitReason.toLowerCase().includes(q) ||
          t.type.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [trades, filter, search, sortField, sortAsc]);

  const totalPages = Math.ceil(filteredTrades.length / pageSize) || 1;
  const pageTrades = filteredTrades.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const exportCSV = () => {
    if (trades.length === 0) return;
    const headers = [
      "ID",
      "Symbol",
      "Type",
      "Entry Time",
      "Exit Time",
      "Entry Price",
      "Exit Price",
      "Size",
      "Invested",
      "PnL (₹)",
      "PnL (%)",
      "Exit Reason",
      "Fees (₹)",
      "Duration (Bars)",
    ];
    const rows = trades.map((t) => [
      t.id,
      t.symbol,
      t.type,
      t.entryTime,
      t.exitTime,
      t.entryPrice,
      t.exitPrice,
      t.size,
      t.investedAmount,
      t.pnl,
      t.pnlPct,
      t.exitReason,
      t.feePaid,
      t.durationBars,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `backtest_trades_${symbol.replace("/", "_")}_${new Date().toISOString().substring(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-5 shadow-lg flex flex-col">
      {/* Table Header & Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-[#1a2230] gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white tracking-wide">
                Trade Log & Execution Ledger
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#131b2a] text-[#94a3b8] border border-[#1e293b]">
                {trades.length} Executed
              </span>
            </div>
            <p className="text-xs text-[#64748b]">
              Audited trade entry, exit targets, slippage, and net realized P&L
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#64748b]" />
            <input
              type="text"
              placeholder="Search trades..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#131b2a] border border-[#1e293b] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center bg-[#131b2a] p-1 rounded-lg border border-[#1e293b] text-xs">
            <button
              onClick={() => {
                setFilter("ALL");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                filter === "ALL"
                  ? "bg-indigo-500/20 text-indigo-400 font-semibold"
                  : "text-[#64748b] hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => {
                setFilter("WIN");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                filter === "WIN"
                  ? "bg-emerald-500/20 text-emerald-400 font-semibold"
                  : "text-[#64748b] hover:text-white"
              }`}
            >
              Wins
            </button>
            <button
              onClick={() => {
                setFilter("LOSS");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                filter === "LOSS"
                  ? "bg-rose-500/20 text-rose-400 font-semibold"
                  : "text-[#64748b] hover:text-white"
              }`}
            >
              Losses
            </button>
          </div>

          {/* CSV Export Button */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#131b2a] hover:bg-[#1a253a] text-xs text-[#cbd5e1] hover:text-white border border-[#1e293b] rounded-lg transition-all"
            title="Download CSV report"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto mt-4 -mx-5 px-5">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#1a2230] text-[#64748b] font-medium">
              <th className="py-2.5 px-3">#</th>
              <th className="py-2.5 px-3">Direction</th>
              <th className="py-2.5 px-3">Entry Time</th>
              <th className="py-2.5 px-3">Exit Time</th>
              <th className="py-2.5 px-3 text-right">Entry Price</th>
              <th className="py-2.5 px-3 text-right">Exit Price</th>
              <th className="py-2.5 px-3 text-right">Size</th>
              <th className="py-2.5 px-3 text-right cursor-pointer hover:text-white" onClick={() => {
                if (sortField === "pnl") setSortAsc(!sortAsc);
                else { setSortField("pnl"); setSortAsc(false); }
              }}>
                Realized P&L {sortField === "pnl" ? (sortAsc ? "↑" : "↓") : ""}
              </th>
              <th className="py-2.5 px-3 text-right cursor-pointer hover:text-white" onClick={() => {
                if (sortField === "pnlPct") setSortAsc(!sortAsc);
                else { setSortField("pnlPct"); setSortAsc(false); }
              }}>
                Return {sortField === "pnlPct" ? (sortAsc ? "↑" : "↓") : ""}
              </th>
              <th className="py-2.5 px-3">Exit Reason</th>
              <th className="py-2.5 px-3 text-right">Fees</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#131b2a]">
            {pageTrades.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-[#64748b]">
                  No trades match the current filter criteria.
                </td>
              </tr>
            ) : (
              pageTrades.map((trade) => {
                const isWin = trade.pnl > 0;

                return (
                  <tr
                    key={trade.id}
                    className="hover:bg-[#131b2a]/50 transition-colors font-mono"
                  >
                    <td className="py-2.5 px-3 text-[#64748b]">{trade.id}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <ArrowUpRight className="w-3 h-3" />
                        {trade.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#94a3b8] text-[11px]">
                      {new Date(trade.entryTime).toLocaleDateString(undefined, {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5 px-3 text-[#94a3b8] text-[11px]">
                      {new Date(trade.exitTime).toLocaleDateString(undefined, {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5 px-3 text-right text-white font-medium">
                      ₹{trade.entryPrice.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3 text-right text-white font-medium">
                      ₹{trade.exitPrice.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#94a3b8]">
                      {trade.size}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        isWin ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {isWin ? "+" : ""}
                      ₹{trade.pnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        isWin ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {isWin ? "+" : ""}
                      {trade.pnlPct.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans ${
                          trade.exitReason === "Take Profit"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : trade.exitReason === "Stop Loss"
                            ? "bg-rose-500/10 text-rose-400"
                            : trade.exitReason === "Trailing Stop"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-[#1e293b] text-[#94a3b8]"
                        }`}
                      >
                        {trade.exitReason === "Take Profit" && (
                          <CheckCircle2 className="w-2.5 h-2.5" />
                        )}
                        {trade.exitReason === "Stop Loss" && (
                          <XCircle className="w-2.5 h-2.5" />
                        )}
                        {trade.exitReason}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#64748b]">
                      ₹{trade.feePaid.toFixed(2)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-[#1a2230] text-xs text-[#64748b]">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, filteredTrades.length)} of{" "}
            {filteredTrades.length} trades
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded bg-[#131b2a] border border-[#1e293b] text-[#cbd5e1] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1a253a]"
            >
              Prev
            </button>
            <span className="font-mono text-white px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded bg-[#131b2a] border border-[#1e293b] text-[#cbd5e1] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1a253a]"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
