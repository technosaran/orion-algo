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
    <div className="bg-[#191c24] border border-[#232733] rounded-xl p-5 shadow-lg flex flex-col font-sans">
      {/* Table Header & Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-[#232733] gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#4184f3]/10 text-[#4184f3] border border-[#4184f3]/20">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white tracking-wide">
                Trade History
              </h3>
              <span className="text-xs font-mono tabular-nums px-2 py-0.5 rounded-full bg-[#14171f] text-[#9b9b9b] border border-[#232733]">
                {trades.length} Executed
              </span>
            </div>
            <p className="text-xs text-[#666666]">
              Trade entries, exits, fees, and realized P&L
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#666666]" />
            <input
              type="text"
              placeholder="Search trades..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#14171f] border border-[#232733] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#666666] focus:outline-none focus:border-[#4184f3]"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center bg-[#14171f] p-1 rounded-lg border border-[#232733] text-xs">
            <button
              onClick={() => {
                setFilter("ALL");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                filter === "ALL"
                  ? "bg-[#202430] text-[#4184f3] font-semibold border border-[#2a2f3e]"
                  : "text-[#9b9b9b] hover:text-white"
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
                  ? "bg-[#4caf50]/20 text-[#4caf50] font-semibold border border-[#4caf50]/30"
                  : "text-[#9b9b9b] hover:text-white"
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
                  ? "bg-[#df514c]/20 text-[#df514c] font-semibold border border-[#df514c]/30"
                  : "text-[#9b9b9b] hover:text-white"
              }`}
            >
              Losses
            </button>
          </div>

          {/* CSV Export Button */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#14171f] hover:bg-[#202430] text-xs text-[#9b9b9b] hover:text-white border border-[#232733] rounded-lg transition-all"
            title="Download CSV report"
          >
            <Download className="w-3.5 h-3.5 text-[#4184f3]" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto mt-4 -mx-5 px-5">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#232733] text-[#9b9b9b] font-medium uppercase tracking-wider text-[11px]">
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
          <tbody className="divide-y divide-[#232733]">
            {pageTrades.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-[#666666]">
                  No trades match the current filter criteria.
                </td>
              </tr>
            ) : (
              pageTrades.map((trade) => {
                const isWin = trade.pnl > 0;

                return (
                  <tr
                    key={trade.id}
                    className="hover:bg-[#202430] transition-colors font-mono tabular-nums"
                  >
                    <td className="py-2.5 px-3 text-[#666666]">{trade.id}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#4184f3]/10 text-[#4184f3] border border-[#4184f3]/25 font-sans">
                        <ArrowUpRight className="w-3 h-3" />
                        {trade.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#9b9b9b] text-[11px]">
                      {new Date(trade.entryTime).toLocaleDateString(undefined, {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5 px-3 text-[#9b9b9b] text-[11px]">
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
                    <td className="py-2.5 px-3 text-right text-[#9b9b9b]">
                      {trade.size}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        isWin ? "text-[#4caf50]" : "text-[#df514c]"
                      }`}
                    >
                      {isWin ? "+" : ""}
                      ₹{trade.pnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        isWin ? "text-[#4caf50]" : "text-[#df514c]"
                      }`}
                    >
                      {isWin ? "+" : ""}
                      {trade.pnlPct.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans ${
                          trade.exitReason === "Take Profit"
                            ? "bg-[#4caf50]/10 text-[#4caf50] border border-[#4caf50]/30"
                            : trade.exitReason === "Stop Loss"
                            ? "bg-[#df514c]/10 text-[#df514c] border border-[#df514c]/30"
                            : trade.exitReason === "Trailing Stop"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : "bg-[#202430] text-[#9b9b9b] border border-[#2a2f3e]"
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
