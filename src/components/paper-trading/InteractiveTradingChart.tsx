"use client";

import React, { useState } from "react";
import {
  CandleData,
  ChartTimeframe,
  AssetQuote,
  PaperPosition,
  PaperOrder,
} from "@/types/paperTrading";
import { TradingViewOpenSourceChart } from "@/components/charts/TradingViewOpenSourceChart";
import { TradingViewCloudWidget } from "@/components/charts/TradingViewCloudWidget";
import { ChevronDown } from "lucide-react";

interface InteractiveTradingChartProps {
  asset: AssetQuote;
  candles: CandleData[];
  timeframe: ChartTimeframe;
  onChangeTimeframe: (tf: ChartTimeframe) => void;
  position?: PaperPosition | null;
  orders?: PaperOrder[];
  assets?: AssetQuote[];
  onSelectSymbol?: (symbol: string) => void;
}

export function InteractiveTradingChart({
  asset,
  candles,
  timeframe,
  onChangeTimeframe,
  position,
  orders = [],
  assets = [],
  onSelectSymbol,
}: InteractiveTradingChartProps) {
  const [engineMode, setEngineMode] = useState<"opensource" | "cloud">("opensource");

  const quickSymbols = ["NIFTY50", "BANKNIFTY", "SENSEX", "RELIANCE", "HDFCBANK", "BTC/USDT"];

  return (
    <div className="flex flex-col space-y-2">
      {/* Chart Engine Switcher & Instrument Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        {/* Left: Chart Mode Switcher */}
        <div className="flex items-center gap-1 bg-[#101726] p-1 rounded-lg border border-[#1b253b]">
          <button
            onClick={() => setEngineMode("opensource")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              engineMode === "opensource"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "text-[#64748b] hover:text-[#cbd5e1]"
            }`}
          >
            <span>Interactive Chart</span>
          </button>

          <button
            onClick={() => setEngineMode("cloud")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              engineMode === "cloud"
                ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                : "text-[#64748b] hover:text-[#cbd5e1]"
            }`}
          >
            <span>TradingView Widget</span>
          </button>
        </div>

        {/* Right: Instrument Quick Pills & Selector Dropdown */}
        {assets.length > 0 && onSelectSymbol && (
          <div className="flex items-center gap-2">
            {/* Quick Pills */}
            <div className="hidden sm:flex items-center gap-1 bg-[#101726] p-1 rounded-lg border border-[#1b253b]">
              {quickSymbols.map((sym) => {
                const found = assets.find((a) => a.symbol === sym);
                if (!found) return null;
                const isSelected = found.symbol === asset.symbol;
                return (
                  <button
                    key={sym}
                    onClick={() => onSelectSymbol(sym)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-all ${
                      isSelected
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold"
                        : "text-[#64748b] hover:text-[#cbd5e1] hover:bg-[#162032]"
                    }`}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>

            {/* Dropdown for All Instruments */}
            <div className="relative">
              <select
                value={asset.symbol}
                onChange={(e) => onSelectSymbol(e.target.value)}
                className="appearance-none bg-[#101726] border border-[#1b253b] text-white text-xs font-semibold rounded-lg px-3 py-1.5 pr-8 hover:border-cyan-500/50 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {assets.map((a) => (
                  <option key={a.symbol} value={a.symbol} className="bg-[#0b0f19] text-white">
                    {a.symbol} ({a.category.toUpperCase()}) - ₹{a.price.toFixed(1)}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748b] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Render Selected View */}
      {engineMode === "opensource" ? (
        <TradingViewOpenSourceChart
          asset={asset}
          candles={candles}
          timeframe={timeframe}
          onChangeTimeframe={onChangeTimeframe}
          position={position}
          orders={orders}
        />
      ) : (
        <TradingViewCloudWidget asset={asset} />
      )}
    </div>
  );
}
