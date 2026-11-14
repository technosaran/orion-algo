"use client";

import React, { useState } from "react";
import {
  PaperPosition,
  PaperOrder,
  ClosedTrade,
  AssetQuote,
} from "@/types/paperTrading";
import {
  Layers,
  Clock,
  History,
  TrendingUp,
  TrendingDown,
  X,
  Download,
  AlertCircle,
  CheckCircle2,
  Trash2,
} from "lucide-react";

interface PositionsAndOrdersTabsProps {
  positions: PaperPosition[];
  orders: PaperOrder[];
  history: ClosedTrade[];
  quotes: AssetQuote[];
  onClosePosition: (id: string) => void;
  onCloseAllPositions: () => void;
  onCancelOrder: (id: string) => void;
  onClearHistory: () => void;
}

export function PositionsAndOrdersTabs({
  positions,
  orders,
  history,
  quotes,
  onClosePosition,
  onCloseAllPositions,
  onCancelOrder,
  onClearHistory,
}: PositionsAndOrdersTabsProps) {
  const [activeTab, setActiveTab] = useState<"positions" | "orders" | "history">("positions");

  const quoteMap = new Map(quotes.map((q) => [q.symbol, q.price]));

  const pendingOrders = orders.filter((o) => o.status === "PENDING");

  // Export CSV handler
  const handleExportCSV = () => {
    if (history.length === 0) return;
    const headers = [
      "ID",
      "Symbol",
      "Side",
      "Quantity",
      "Entry Price",
      "Exit Price",
      "Realized P&L (₹)",
      "Return (%)",
      "Close Reason",
      "Closed At",
    ];
    const rows = history.map((h) => [
      h.id,
      h.symbol,
      h.side,
      h.quantity,
      h.entryPrice,
      h.exitPrice,
      h.realizedPnl,
      h.realizedPnlPercent,
      h.closeReason,
      new Date(h.closedAt).toISOString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `orion_paper_trades_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col bg-[#0b0f19] border border-[#1a2333] rounded-xl overflow-hidden">
      {/* Header Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1a2333] px-3.5 pt-2 bg-[#080b12]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("positions")}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "positions"
                ? "border-emerald-400 text-white"
                : "border-transparent text-[#64748b] hover:text-[#94a3b8]"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Open Positions</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#162032] text-[#94a3b8]">
              {positions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "orders"
                ? "border-amber-400 text-white"
                : "border-transparent text-[#64748b] hover:text-[#94a3b8]"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Pending Orders</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#162032] text-[#94a3b8]">
              {pendingOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "history"
                ? "border-purple-400 text-white"
                : "border-transparent text-[#64748b] hover:text-[#94a3b8]"
            }`}
          >
            <History className="w-3.5 h-3.5 text-purple-400" />
            <span>Closed Trades History</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#162032] text-[#94a3b8]">
              {history.length}
            </span>
          </button>
        </div>

        {/* Action Buttons for active tab */}
        <div className="flex items-center gap-2 pb-1.5">
          {activeTab === "positions" && positions.length > 0 && (
            <button
              onClick={onCloseAllPositions}
              className="px-2.5 py-1 text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-500/20 transition-colors"
            >
              Close All Positions
            </button>
          )}

          {activeTab === "history" && history.length > 0 && (
            <>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-[#121824] text-[#94a3b8] border border-[#1e293b] rounded-lg hover:text-white transition-colors"
              >
                <Download className="w-3 h-3" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={onClearHistory}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-[#121824] text-[#64748b] border border-[#1e293b] rounded-lg hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab 1: Open Positions */}
      {activeTab === "positions" && (
        <div className="overflow-x-auto min-h-[180px]">
          {positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-[#64748b] space-y-2">
              <Layers className="w-8 h-8 stroke-1 text-[#334155]" />
              <p className="text-xs">No active positions open.</p>
              <p className="text-[11px] text-[#475569]">
                Execute a paper order or toggle the Algo Bot to enter the market.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#080b12] text-[#64748b] text-[10px] font-mono uppercase border-b border-[#1a2333]">
                <tr>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Side</th>
                  <th className="py-2.5 px-3">Quantity</th>
                  <th className="py-2.5 px-3">Entry Price</th>
                  <th className="py-2.5 px-3">Mark Price</th>
                  <th className="py-2.5 px-3">Position Value</th>
                  <th className="py-2.5 px-3">TP / SL</th>
                  <th className="py-2.5 px-3">Unrealized P&L</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#131b2c] font-mono">
                {positions.map((pos) => {
                  const livePrice = quoteMap.get(pos.symbol) ?? pos.currentPrice;
                  const isLong = pos.side === "LONG";
                  const pnl = isLong
                    ? (livePrice - pos.entryPrice) * pos.quantity
                    : (pos.entryPrice - livePrice) * pos.quantity;
                  const pnlPct = (pnl / (pos.entryPrice * pos.quantity)) * 100;
                  const isPos = pnl >= 0;
                  const posValue = livePrice * pos.quantity;

                  return (
                    <tr key={pos.id} className="hover:bg-[#111724] transition-colors">
                      <td className="py-2.5 px-3 font-bold text-white">
                        {pos.symbol}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isLong
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {pos.side}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#cbd5e1]">{pos.quantity}</td>
                      <td className="py-2.5 px-3 text-[#94a3b8]">₹{pos.entryPrice.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-white font-bold">₹{livePrice.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-[#cbd5e1]">₹{posValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td className="py-2.5 px-3 text-[10px]">
                        {pos.takeProfit ? (
                          <span className="text-emerald-400 block">TP: ₹{pos.takeProfit}</span>
                        ) : null}
                        {pos.stopLoss ? (
                          <span className="text-rose-400 block">SL: ₹{pos.stopLoss}</span>
                        ) : null}
                        {!pos.takeProfit && !pos.stopLoss && (
                          <span className="text-[#475569]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-bold flex items-center gap-1 ${
                            isPos ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {isPos ? (
                            <TrendingUp className="w-3 h-3 inline" />
                          ) : (
                            <TrendingDown className="w-3 h-3 inline" />
                          )}
                          {isPos ? "+" : ""}₹{pnl.toFixed(2)} ({isPos ? "+" : ""}{pnlPct.toFixed(2)}%)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => onClosePosition(pos.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-500 hover:text-white transition-all shadow-xs"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 2: Pending Orders */}
      {activeTab === "orders" && (
        <div className="overflow-x-auto min-h-[180px]">
          {pendingOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-[#64748b] space-y-2">
              <Clock className="w-8 h-8 stroke-1 text-[#334155]" />
              <p className="text-xs">No pending limit or stop orders.</p>
              <p className="text-[11px] text-[#475569]">
                Place a Limit or Stop order in the Execution Ticket above.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#080b12] text-[#64748b] text-[10px] font-mono uppercase border-b border-[#1a2333]">
                <tr>
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Side</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Target Price</th>
                  <th className="py-2.5 px-3">Current Market</th>
                  <th className="py-2.5 px-3">Quantity</th>
                  <th className="py-2.5 px-3">Total Value</th>
                  <th className="py-2.5 px-3">Distance</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#131b2c] font-mono">
                {pendingOrders.map((ord) => {
                  const livePrice = quoteMap.get(ord.symbol) ?? ord.price;
                  const distancePct = Math.abs(((ord.price - livePrice) / livePrice) * 100);

                  return (
                    <tr key={ord.id} className="hover:bg-[#111724] transition-colors">
                      <td className="py-2.5 px-3 text-[#64748b] text-[11px]">{ord.id}</td>
                      <td className="py-2.5 px-3 font-bold text-white">{ord.symbol}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            ord.side === "BUY"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {ord.side}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#94a3b8]">{ord.type}</td>
                      <td className="py-2.5 px-3 text-white font-bold">₹{ord.price.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-[#cbd5e1]">₹{livePrice.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-[#cbd5e1]">{ord.quantity}</td>
                      <td className="py-2.5 px-3 text-[#cbd5e1]">₹{ord.totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td className="py-2.5 px-3 text-amber-400 text-[11px]">
                        {distancePct.toFixed(2)}% away
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => onCancelOrder(ord.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-[#162032] text-[#94a3b8] border border-[#2b3a55] rounded-lg hover:text-rose-400 hover:border-rose-500/40 transition-colors"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 3: Closed Trades History */}
      {activeTab === "history" && (
        <div className="overflow-x-auto min-h-[180px]">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-[#64748b] space-y-2">
              <History className="w-8 h-8 stroke-1 text-[#334155]" />
              <p className="text-xs">No closed trades yet.</p>
              <p className="text-[11px] text-[#475569]">
                Closed positions will automatically generate performance records here.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#080b12] text-[#64748b] text-[10px] font-mono uppercase border-b border-[#1a2333]">
                <tr>
                  <th className="py-2.5 px-3">Closed Time</th>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Side</th>
                  <th className="py-2.5 px-3">Quantity</th>
                  <th className="py-2.5 px-3">Entry Price</th>
                  <th className="py-2.5 px-3">Exit Price</th>
                  <th className="py-2.5 px-3">Realized P&L</th>
                  <th className="py-2.5 px-3">Return</th>
                  <th className="py-2.5 px-3 text-right">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#131b2c] font-mono">
                {history.map((trd) => {
                  const isPos = trd.realizedPnl >= 0;
                  return (
                    <tr key={trd.id} className="hover:bg-[#111724] transition-colors">
                      <td className="py-2.5 px-3 text-[#64748b] text-[11px]">
                        {new Date(trd.closedAt).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">{trd.symbol}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            trd.side === "LONG"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          {trd.side}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#cbd5e1]">{trd.quantity}</td>
                      <td className="py-2.5 px-3 text-[#94a3b8]">₹{trd.entryPrice.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-white font-bold">₹{trd.exitPrice.toFixed(2)}</td>
                      <td className="py-2.5 px-3 font-bold">
                        <span className={isPos ? "text-emerald-400" : "text-rose-400"}>
                          {isPos ? "+" : ""}₹{trd.realizedPnl.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`font-semibold ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
                          {isPos ? "+" : ""}{trd.realizedPnlPercent.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#162032] text-[#94a3b8] border border-[#1e293b]">
                          {trd.closeReason}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
