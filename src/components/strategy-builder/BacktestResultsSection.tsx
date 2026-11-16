"use client";

import React, { useState } from "react";
import {
  BarChart3,
  Activity,
  Receipt,
} from "lucide-react";
import { BacktestResult } from "@/types/strategy";
import { formatINR } from "@/lib/formatters";

interface BacktestResultsSectionProps {
  result: BacktestResult | null;
  isBacktesting: boolean;
  onRunBacktest: () => void;
  strategyName: string;
}

export function BacktestResultsSection({
  result,
  isBacktesting,
  onRunBacktest,
  strategyName,
}: BacktestResultsSectionProps) {
  const [chartView, setChartView] = useState<"equity" | "drawdown">("equity");
  const [tradeFilter, setTradeFilter] = useState<"all" | "win" | "loss">("all");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!result) {
    return (
      <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
          <Activity className="w-6 h-6 animate-pulse" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-white">Simulation Ready</h3>
          <p className="text-xs text-[#94a3b8] max-w-md mx-auto">
            Click &quot;Run Backtest&quot; to test this strategy against historical market data with brokerage and tax fees included.
          </p>
        </div>
        <button
          onClick={onRunBacktest}
          disabled={isBacktesting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-all shadow-md shadow-emerald-500/20"
        >
          <BarChart3 className="w-4 h-4" />
          <span>{isBacktesting ? "Running Backtest..." : "Run Backtest"}</span>
        </button>
      </div>
    );
  }

  const { metrics, equityCurve, trades } = result;

  // Filter trades
  const filteredTrades = trades.filter((t) => {
    if (tradeFilter === "win") return t.pnl > 0;
    if (tradeFilter === "loss") return t.pnl < 0;
    return true;
  });

  // Calculate SVG Chart dimensions and paths
  const chartWidth = 800;
  const chartHeight = 220;
  const padding = { top: 20, right: 30, bottom: 30, left: 75 };

  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Find min and max values for scaling
  let minY = 0;
  let maxY = 100;

  if (chartView === "equity") {
    const values = equityCurve.flatMap((d) => [d.equity, d.benchmarkEquity]);
    minY = Math.min(...values) * 0.98;
    maxY = Math.max(...values) * 1.02;
  } else {
    // Drawdown
    minY = 0;
    maxY = Math.max(5, ...equityCurve.map((d) => d.drawdownPct)) * 1.1;
  }

  const getX = (idx: number) =>
    padding.left + (idx / Math.max(1, equityCurve.length - 1)) * innerWidth;

  const getY = (val: number) => {
    if (chartView === "drawdown") {
      return padding.top + (val / (maxY || 1)) * innerHeight;
    }
    return (
      chartHeight -
      padding.bottom -
      ((val - minY) / (maxY - minY || 1)) * innerHeight
    );
  };

  // Generate SVG path strings
  const equityPoints = equityCurve.map((d, i) => `${getX(i)},${getY(d.equity)}`).join(" ");
  const benchmarkPoints = equityCurve.map((d, i) => `${getX(i)},${getY(d.benchmarkEquity)}`).join(" ");
  const drawdownPoints = equityCurve.map((d, i) => `${getX(i)},${getY(d.drawdownPct)}`).join(" ");

  const equityAreaPath =
    equityCurve.length > 0
      ? `M ${getX(0)},${chartHeight - padding.bottom} ` +
        equityCurve.map((d, i) => `L ${getX(i)},${getY(d.equity)}`).join(" ") +
        ` L ${getX(equityCurve.length - 1)},${chartHeight - padding.bottom} Z`
      : "";

  const drawdownAreaPath =
    equityCurve.length > 0
      ? `M ${getX(0)},${padding.top} ` +
        equityCurve.map((d, i) => `L ${getX(i)},${getY(d.drawdownPct)}`).join(" ") +
        ` L ${getX(equityCurve.length - 1)},${padding.top} Z`
      : "";

  return (
    <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-5 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1a2230] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold font-mono">
            05
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Backtest Results</h2>
            <p className="text-xs text-[#94a3b8]">
              Performance metrics, equity curve vs benchmark, and trade history for {strategyName}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
            {metrics.totalTrades} Trades
          </span>
          <button
            onClick={onRunBacktest}
            disabled={isBacktesting}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#131b2a] hover:bg-[#1a2538] border border-[#222e42] text-xs font-medium text-emerald-400 transition-colors"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Re-Run</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Net Profit in INR */}
        <div className="bg-[#0d121c] border border-[#1d2738] rounded-xl p-3 space-y-1">
          <span className="text-[11px] text-[#94a3b8]">Net Realized P&L</span>
          <div
            className={`text-lg font-bold font-mono flex items-center gap-1 ${
              metrics.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {formatINR(metrics.netProfit, { showSign: true })}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono">
            <span
              className={`font-semibold ${
                metrics.netProfitPct >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {metrics.netProfitPct >= 0 ? "+" : ""}{metrics.netProfitPct}%
            </span>
            <span className="text-[#64748b]">vs {metrics.benchmarkReturnPct}% Nifty</span>
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-[#0d121c] border border-[#1d2738] rounded-xl p-3 space-y-1">
          <span className="text-[11px] text-[#94a3b8]">Win Rate</span>
          <div className="text-lg font-bold font-mono text-white">
            {metrics.winRate}%
          </div>
          <div className="text-[11px] text-[#94a3b8] flex items-center gap-1.5">
            <span className="text-emerald-400 font-bold">{metrics.winningTrades}W</span>
            <span className="text-[#475569]">/</span>
            <span className="text-rose-400 font-bold">{metrics.losingTrades}L</span>
          </div>
        </div>

        {/* Profit Factor */}
        <div className="bg-[#0d121c] border border-[#1d2738] rounded-xl p-3 space-y-1">
          <span className="text-[11px] text-[#94a3b8]">Profit Factor</span>
          <div className="text-lg font-bold font-mono text-cyan-400">
            {metrics.profitFactor}
          </div>
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
              metrics.profitFactor >= 2.0
                ? "bg-emerald-500/20 text-emerald-300"
                : metrics.profitFactor >= 1.4
                ? "bg-cyan-500/20 text-cyan-300"
                : "bg-amber-500/20 text-amber-300"
            }`}
          >
            {metrics.profitFactor >= 2.0
              ? "Profitable"
              : metrics.profitFactor >= 1.4
              ? "Good"
              : "Moderate"}
          </span>
        </div>

        {/* Max Drawdown */}
        <div className="bg-[#0d121c] border border-[#1d2738] rounded-xl p-3 space-y-1">
          <span className="text-[11px] text-[#94a3b8]">Max Drawdown</span>
          <div className="text-lg font-bold font-mono text-rose-400">
            -{metrics.maxDrawdownPct}%
          </div>
          <span className="text-[11px] text-[#64748b]">Peak-to-trough</span>
        </div>

        {/* Sharpe Ratio */}
        <div className="bg-[#0d121c] border border-[#1d2738] rounded-xl p-3 space-y-1">
          <span className="text-[11px] text-[#94a3b8]">Sharpe Ratio</span>
          <div className="text-lg font-bold font-mono text-white">
            {metrics.sharpeRatio}
          </div>
          <span className="text-[11px] text-[#64748b]">Sortino: {metrics.sortinoRatio}</span>
        </div>

        {/* Realized Risk:Reward */}
        <div className="bg-[#0d121c] border border-[#1d2738] rounded-xl p-3 space-y-1">
          <span className="text-[11px] text-[#94a3b8]">Realized R : R</span>
          <div className="text-lg font-bold font-mono text-emerald-400">
            1 : {metrics.riskRewardRatio}
          </div>
          <span className="text-[11px] text-[#64748b]">
            Avg W: {formatINR(metrics.avgWinPnl, { showSign: true })}
          </span>
        </div>

        {/* Brokerage & Taxes Paid */}
        <div className="bg-[#0d121c] border border-[#1d2738] rounded-xl p-3 space-y-1">
          <span className="text-[11px] text-[#94a3b8] flex items-center gap-1">
            <Receipt className="w-3 h-3 text-amber-400" />
            Brokerage & STT
          </span>
          <div className="text-xs font-mono text-amber-400 font-bold">
            {formatINR(metrics.totalBrokeragePaid || 0)}
          </div>
          <div className="text-[10px] text-[#64748b]">
            Deducted from gross
          </div>
        </div>
      </div>

      {/* Interactive SVG Equity Curve Chart */}
      <div className="bg-[#0d121c] border border-[#1d2738] rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1a2436] pb-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {chartView === "equity" ? "Portfolio Equity Curve (INR) vs NIFTY Benchmark" : "Underwater Drawdown Curve (%)"}
            </span>
            <div className="flex items-center gap-3 text-xs text-[#94a3b8]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span>Strategy</span>
              </span>
              {chartView === "equity" && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-[#64748b]"></span>
                  <span>Nifty Benchmark</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex bg-[#131b2a] border border-[#222e42] rounded-lg p-0.5">
            <button
              onClick={() => setChartView("equity")}
              className={`px-2.5 py-1 text-xs font-semibold rounded ${
                chartView === "equity"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "text-[#64748b] hover:text-white"
              }`}
            >
              Equity (₹)
            </button>
            <button
              onClick={() => setChartView("drawdown")}
              className={`px-2.5 py-1 text-xs font-semibold rounded ${
                chartView === "drawdown"
                  ? "bg-rose-500/20 text-rose-300"
                  : "text-[#64748b] hover:text-white"
              }`}
            >
              Drawdown (%)
            </button>
          </div>
        </div>

        {/* SVG Container */}
        <div className="relative w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto overflow-visible select-none"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.0" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.3" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = padding.top + pct * innerHeight;
              const val =
                chartView === "drawdown"
                  ? Math.round(pct * maxY * 10) / 10
                  : Math.round(maxY - pct * (maxY - minY));
              return (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={chartWidth - padding.right}
                    y2={y}
                    stroke="#1e2a3c"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 4}
                    fill="#64748b"
                    fontSize="10"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {chartView === "drawdown" ? `-${val}%` : formatINR(val)}
                  </text>
                </g>
              );
            })}

            {chartView === "equity" ? (
              <>
                {/* Area under equity */}
                <path d={equityAreaPath} fill="url(#equityGradient)" />
                {/* Benchmark line */}
                <polyline
                  points={benchmarkPoints}
                  fill="none"
                  stroke="#475569"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                {/* Strategy line */}
                <polyline
                  points={equityPoints}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            ) : (
              <>
                <path d={drawdownAreaPath} fill="url(#drawdownGradient)" />
                <polyline
                  points={drawdownPoints}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* Hover Tracker */}
            {hoveredIndex !== null && hoveredIndex < equityCurve.length && (
              <g>
                <line
                  x1={getX(hoveredIndex)}
                  y1={padding.top}
                  x2={getX(hoveredIndex)}
                  y2={chartHeight - padding.bottom}
                  stroke="#38bdf8"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={getX(hoveredIndex)}
                  cy={
                    chartView === "equity"
                      ? getY(equityCurve[hoveredIndex].equity)
                      : getY(equityCurve[hoveredIndex].drawdownPct)
                  }
                  r="4"
                  fill="#38bdf8"
                  stroke="#0b0e14"
                  strokeWidth="2"
                />
              </g>
            )}

            {/* Interactive invisible hover rectangles */}
            {equityCurve.map((_, i) => (
              <rect
                key={i}
                x={getX(i) - innerWidth / equityCurve.length / 2}
                y={padding.top}
                width={innerWidth / equityCurve.length}
                height={innerHeight}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(i)}
              />
            ))}
          </svg>

          {/* Hover Tooltip Box */}
          {hoveredIndex !== null && hoveredIndex < equityCurve.length && (
            <div className="absolute top-2 right-4 bg-[#121926] border border-[#2a3a52] rounded-lg p-2.5 text-xs shadow-lg space-y-1 z-10 pointer-events-none">
              <div className="text-[10px] text-[#64748b] font-mono">
                {equityCurve[hoveredIndex].timestamp}
              </div>
              <div className="text-emerald-400 font-mono font-bold">
                Balance: {formatINR(equityCurve[hoveredIndex].equity)}
              </div>
              <div className="text-[#94a3b8] font-mono text-[11px]">
                Drawdown: -{equityCurve[hoveredIndex].drawdownPct}%
              </div>
              <div className="text-[#64748b] font-mono text-[11px]">
                Nifty Benchmark: {formatINR(equityCurve[hoveredIndex].benchmarkEquity)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trade Journal & Logs */}
      <div className="bg-[#0d121c] border border-[#1d2738] rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1a2436] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Trade Execution Journal (NSE/BSE/MCX)
            </span>
            <span className="text-xs text-[#64748b]">({filteredTrades.length} displayed)</span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-[#131b2a] border border-[#222e42] rounded-lg p-0.5">
            <button
              onClick={() => setTradeFilter("all")}
              className={`px-2.5 py-1 text-xs font-semibold rounded ${
                tradeFilter === "all"
                  ? "bg-[#1e2a3c] text-white"
                  : "text-[#64748b] hover:text-white"
              }`}
            >
              All Trades
            </button>
            <button
              onClick={() => setTradeFilter("win")}
              className={`px-2.5 py-1 text-xs font-semibold rounded ${
                tradeFilter === "win"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "text-[#64748b] hover:text-white"
              }`}
            >
              Winners ({trades.filter((t) => t.pnl > 0).length})
            </button>
            <button
              onClick={() => setTradeFilter("loss")}
              className={`px-2.5 py-1 text-xs font-semibold rounded ${
                tradeFilter === "loss"
                  ? "bg-rose-500/20 text-rose-300"
                  : "text-[#64748b] hover:text-white"
              }`}
            >
              Losses ({trades.filter((t) => t.pnl < 0).length})
            </button>
          </div>
        </div>

        {/* Trades Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#1a2436] text-[#64748b] font-medium">
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">Direction</th>
                <th className="py-2 px-3">Entry Time</th>
                <th className="py-2 px-3">Exit Time</th>
                <th className="py-2 px-3 text-right">Entry (₹)</th>
                <th className="py-2 px-3 text-right">Exit (₹)</th>
                <th className="py-2 px-3 text-right">Lots / Qty</th>
                <th className="py-2 px-3 text-right">Net P&L (₹)</th>
                <th className="py-2 px-3 text-right">Return (%)</th>
                <th className="py-2 px-3">Exit Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#162030] font-mono">
              {filteredTrades.slice(0, 15).map((trade) => {
                const isWin = trade.pnl > 0;
                return (
                  <tr
                    key={trade.id}
                    className="hover:bg-[#121926] transition-colors"
                  >
                    <td className="py-2 px-3 text-[#64748b]">
                      #{trade.tradeNumber}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          trade.direction === "LONG"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {trade.direction}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[#94a3b8]">{trade.entryTime}</td>
                    <td className="py-2 px-3 text-[#94a3b8]">{trade.exitTime}</td>
                    <td className="py-2 px-3 text-right text-white">
                      ₹{trade.entryPrice.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2 px-3 text-right text-white">
                      ₹{trade.exitPrice.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2 px-3 text-right text-[#cbd5e1]">
                      {trade.lotCount && trade.lotCount > 0 ? (
                        <span>
                          {trade.lotCount} Lot{trade.lotCount > 1 ? "s" : ""} ({trade.quantity})
                        </span>
                      ) : (
                        <span>{trade.quantity} Qty</span>
                      )}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-bold ${
                        isWin ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {formatINR(trade.pnl, { showSign: true })}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-bold ${
                        isWin ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {isWin ? "+" : ""}{trade.pnlPct}%
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-sans font-medium ${
                          trade.exitReason === "Take Profit"
                            ? "bg-emerald-500/10 text-emerald-300"
                            : trade.exitReason === "Trailing Stop"
                            ? "bg-cyan-500/10 text-cyan-300"
                            : trade.exitReason === "Stop Loss"
                            ? "bg-rose-500/10 text-rose-300"
                            : "bg-[#162030] text-[#94a3b8]"
                        }`}
                      >
                        {trade.exitReason}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredTrades.length === 0 && (
            <div className="py-8 text-center text-xs text-[#64748b]">
              No trades matched the current filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
