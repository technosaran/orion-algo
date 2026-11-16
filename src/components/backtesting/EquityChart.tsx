"use client";

import React, { useState, useMemo } from "react";
import { EquityPoint } from "@/lib/backtest/types";
import { TrendingUp, BarChart2, ShieldAlert, Calendar, Code2 } from "lucide-react";
import { TradingViewEquityChart } from "./TradingViewEquityChart";
import { formatINR } from "@/lib/formatters";

interface EquityChartProps {
  equityCurve: EquityPoint[];
  initialCapital: number;
  monthlyReturns: Record<string, number>;
}

export function EquityChart({
  equityCurve,
  initialCapital,
  monthlyReturns,
}: EquityChartProps) {
  const [activeTab, setActiveTab] = useState<"equity" | "drawdown" | "monthly">("equity");
  const [chartEngine, setChartEngine] = useState<"tradingview" | "classic">("tradingview");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tvHoverData, setTvHoverData] = useState<{
    timestamp: string;
    equity: number;
    benchmark: number;
    drawdownPct: number;
  } | null>(null);

  // Downsample if more than 400 points to keep SVG render hyper fast and crisp
  const data = useMemo(() => {
    if (!equityCurve || equityCurve.length === 0) return [];
    if (equityCurve.length <= 400) return equityCurve;
    const step = Math.ceil(equityCurve.length / 400);
    const sampled: EquityPoint[] = [];
    for (let i = 0; i < equityCurve.length; i += step) {
      sampled.push(equityCurve[i]);
    }
    // Always include the last point
    if (sampled[sampled.length - 1] !== equityCurve[equityCurve.length - 1]) {
      sampled.push(equityCurve[equityCurve.length - 1]);
    }
    return sampled;
  }, [equityCurve]);

  // Dimensions for Classic SVG
  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Min and Max for Equity
  const { minEq, maxEq, minDd, maxDd } = useMemo(() => {
    if (data.length === 0) {
      return { minEq: 0, maxEq: 100, minDd: 0, maxDd: 10 };
    }
    let minE = Math.min(...data.map((d) => Math.min(d.equity, d.benchmark)));
    let maxE = Math.max(...data.map((d) => Math.max(d.equity, d.benchmark)));
    // Add margin
    const rangeE = maxE - minE || 100;
    minE = Math.max(0, minE - rangeE * 0.05);
    maxE = maxE + rangeE * 0.05;

    const maxD = Math.max(...data.map((d) => d.drawdownPct), 1);
    return { minEq: minE, maxEq: maxE, minDd: 0, maxDd: maxD * 1.1 };
  }, [data]);

  // Equity SVG Path
  const { equityPath, benchmarkPath, equityAreaPath, xCoords } = useMemo(() => {
    if (data.length === 0) {
      return { equityPath: "", benchmarkPath: "", equityAreaPath: "", xCoords: [] };
    }
    const xStep = chartW / (data.length - 1 || 1);
    const coords: number[] = [];

    const eqPoints = data.map((d, i) => {
      const x = padding.left + i * xStep;
      coords.push(x);
      const y = padding.top + chartH - ((d.equity - minEq) / (maxEq - minEq || 1)) * chartH;
      return `${x},${y}`;
    });

    const bmPoints = data.map((d, i) => {
      const x = padding.left + i * xStep;
      const y = padding.top + chartH - ((d.benchmark - minEq) / (maxEq - minEq || 1)) * chartH;
      return `${x},${y}`;
    });

    const eqLine = `M ${eqPoints.join(" L ")}`;
    const bmLine = `M ${bmPoints.join(" L ")}`;
    const eqArea = `M ${padding.left},${padding.top + chartH} L ${eqPoints.join(" L ")} L ${padding.left + chartW},${padding.top + chartH} Z`;

    return { equityPath: eqLine, benchmarkPath: bmLine, equityAreaPath: eqArea, xCoords: coords };
  }, [data, minEq, maxEq, chartW, chartH, padding.left, padding.top]);

  // Drawdown SVG Path
  const { ddPath, ddAreaPath } = useMemo(() => {
    if (data.length === 0) return { ddPath: "", ddAreaPath: "" };
    const xStep = chartW / (data.length - 1 || 1);

    const points = data.map((d, i) => {
      const x = padding.left + i * xStep;
      const y = padding.top + (d.drawdownPct / (maxDd || 1)) * chartH;
      return `${x},${y}`;
    });

    const line = `M ${points.join(" L ")}`;
    const area = `M ${padding.left},${padding.top} L ${points.join(" L ")} L ${padding.left + chartW},${padding.top} Z`;

    return { ddPath: line, ddAreaPath: area };
  }, [data, maxDd, chartW, chartH, padding.left, padding.top]);

  const activePoint = chartEngine === "tradingview" && tvHoverData
    ? tvHoverData
    : (hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : null);

  return (
    <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-5 shadow-lg flex flex-col space-y-4">
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-[#1a2230] gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white tracking-wide">
                Equity & Performance Chart
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                TradingView
              </span>
            </div>
            <p className="text-xs text-[#64748b]">
              Equity curve, benchmark comparison, and drawdowns
            </p>
          </div>
        </div>

        {/* Right Header Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Engine Selector */}
          <div className="flex items-center bg-[#131b2a] p-0.5 rounded-lg border border-[#1e293b] text-xs">
            <button
              onClick={() => setChartEngine("tradingview")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                chartEngine === "tradingview"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "text-[#64748b] hover:text-white"
              }`}
            >
              TradingView
            </button>
            <button
              onClick={() => setChartEngine("classic")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                chartEngine === "classic"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "text-[#64748b] hover:text-white"
              }`}
            >
              Classic
            </button>
          </div>

          {/* Metric Tab switch */}
          <div className="flex items-center bg-[#131b2a] p-1 rounded-lg border border-[#1e293b] text-xs">
            <button
              onClick={() => setActiveTab("equity")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === "equity"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
                  : "text-[#94a3b8] hover:text-white"
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Equity Curve</span>
            </button>
            <button
              onClick={() => setActiveTab("drawdown")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === "drawdown"
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm"
                  : "text-[#94a3b8] hover:text-white"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Drawdown (%)</span>
            </button>
            <button
              onClick={() => setActiveTab("monthly")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === "monthly"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm"
                  : "text-[#94a3b8] hover:text-white"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Monthly P&L</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Chart Body */}
      {activeTab === "monthly" ? (
        <div className="py-6 px-2 min-h-[320px] flex flex-col justify-center">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(monthlyReturns).map(([month, ret]) => {
              const isPos = ret >= 0;
              return (
                <div
                  key={month}
                  className={`p-3.5 rounded-lg border flex flex-col justify-between transition-all hover:scale-[1.02] ${
                    isPos
                      ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400"
                      : "bg-rose-950/20 border-rose-500/30 text-rose-400"
                  }`}
                >
                  <span className="text-xs text-[#94a3b8] font-mono">{month}</span>
                  <div className="mt-2 text-lg font-bold font-mono">
                    {isPos ? `+${ret.toFixed(2)}%` : `${ret.toFixed(2)}%`}
                  </div>
                  <span className="text-[10px] text-[#64748b] mt-1">
                    {isPos ? "Profit" : "Drawdown"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="relative pt-1 flex-1 flex flex-col space-y-3">
          {/* Legend and Active Values */}
          <div className="flex flex-wrap items-center justify-between text-xs px-2">
            <div className="flex items-center gap-5">
              {activeTab === "equity" ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-1 rounded bg-emerald-400 inline-block shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                    <span className="text-[#94a3b8]">Strategy Equity</span>
                    <span className="font-mono font-semibold text-emerald-400">
                      {formatINR(activePoint ? activePoint.equity : data[data.length - 1]?.equity || initialCapital, { decimals: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 border-b border-dashed border-[#64748b] inline-block"></span>
                    <span className="text-[#64748b]">Benchmark (Buy & Hold)</span>
                    <span className="font-mono text-[#cbd5e1]">
                      {formatINR(activePoint ? activePoint.benchmark : data[data.length - 1]?.benchmark || initialCapital, { decimals: 2 })}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 rounded bg-rose-400 inline-block"></span>
                  <span className="text-[#94a3b8]">Current Drawdown</span>
                  <span className="font-mono font-semibold text-rose-400">
                    -{activePoint ? activePoint.drawdownPct.toFixed(2) : data[data.length - 1]?.drawdownPct.toFixed(2) || "0.00"}%
                  </span>
                </div>
              )}
            </div>

            {activePoint && (
              <div className="text-[#94a3b8] font-mono text-[11px] bg-[#131b2a] px-2.5 py-1 rounded border border-[#1e293b]">
                {new Date(activePoint.timestamp).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}
          </div>

          {/* Render TradingView or Classic SVG */}
          {chartEngine === "tradingview" ? (
            <TradingViewEquityChart
              equityCurve={equityCurve}
              initialCapital={initialCapital}
              activeTab={activeTab}
              onHoverData={setTvHoverData}
            />
          ) : (
            <div className="w-full overflow-hidden select-none bg-[#080b12] rounded-lg p-2 border border-[#1a2333]/80">
              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-auto overflow-visible"
                onMouseLeave={() => setHoverIndex(null)}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const mouseX = ((e.clientX - rect.left) / rect.width) * width;
                  if (mouseX >= padding.left && mouseX <= padding.left + chartW && data.length > 0) {
                    const relX = (mouseX - padding.left) / chartW;
                    const idx = Math.min(
                      data.length - 1,
                      Math.max(0, Math.round(relX * (data.length - 1)))
                    );
                    setHoverIndex(idx);
                  }
                }}
              >
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
                  const y = padding.top + chartH * ratio;
                  const eqVal = maxEq - ratio * (maxEq - minEq);
                  const ddVal = ratio * maxDd;

                  return (
                    <g key={ratio}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={padding.left + chartW}
                        y2={y}
                        stroke="#1a2230"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x={padding.left - 8}
                        y={y + 4}
                        textAnchor="end"
                        fill="#475569"
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        {activeTab === "equity"
                          ? formatINR(Math.round(eqVal))
                          : `-${ddVal.toFixed(1)}%`}
                      </text>
                    </g>
                  );
                })}

                {activeTab === "equity" ? (
                  <>
                    {/* Benchmark Line */}
                    <path
                      d={benchmarkPath}
                      fill="none"
                      stroke="#475569"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                    {/* Equity Area Fill */}
                    <path d={equityAreaPath} fill="url(#equityGrad)" />
                    {/* Equity Line */}
                    <path
                      d={equityPath}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                ) : (
                  <>
                    {/* Drawdown Area */}
                    <path d={ddAreaPath} fill="url(#ddGrad)" />
                    {/* Drawdown Line */}
                    <path
                      d={ddPath}
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </>
                )}

                {/* Hover Crosshair & Dot */}
                {hoverIndex !== null && xCoords[hoverIndex] !== undefined && (
                  <g>
                    <line
                      x1={xCoords[hoverIndex]}
                      y1={padding.top}
                      x2={xCoords[hoverIndex]}
                      y2={padding.top + chartH}
                      stroke="#38bdf8"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <circle
                      cx={xCoords[hoverIndex]}
                      cy={
                        activeTab === "equity"
                          ? padding.top +
                            chartH -
                            ((data[hoverIndex].equity - minEq) / (maxEq - minEq || 1)) *
                              chartH
                          : padding.top +
                            (data[hoverIndex].drawdownPct / (maxDd || 1)) * chartH
                      }
                      r="5"
                      fill={activeTab === "equity" ? "#10b981" : "#f43f5e"}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  </g>
                )}
              </svg>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
