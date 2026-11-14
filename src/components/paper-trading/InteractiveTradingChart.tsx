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
import { Activity, Globe2, Code2 } from "lucide-react";

interface InteractiveTradingChartProps {
  asset: AssetQuote;
  candles: CandleData[];
  timeframe: ChartTimeframe;
  onChangeTimeframe: (tf: ChartTimeframe) => void;
  position?: PaperPosition | null;
  orders?: PaperOrder[];
}

export function InteractiveTradingChart({
  asset,
  candles,
  timeframe,
  onChangeTimeframe,
  position,
  orders = [],
}: InteractiveTradingChartProps) {
  const [engineMode, setEngineMode] = useState<"opensource" | "cloud">("opensource");

  return (
    <div className="flex flex-col space-y-2">
      {/* Chart Engine Switcher Tab Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1 bg-[#101726] p-1 rounded-lg border border-[#1b253b]">
          <button
            onClick={() => setEngineMode("opensource")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              engineMode === "opensource"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs"
                : "text-[#64748b] hover:text-[#cbd5e1]"
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>TradingView Open-Source Chart</span>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
              Live Engine
            </span>
          </button>

          <button
            onClick={() => setEngineMode("cloud")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              engineMode === "cloud"
                ? "bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-xs"
                : "text-[#64748b] hover:text-[#cbd5e1]"
            }`}
          >
            <Globe2 className="w-3.5 h-3.5 text-blue-400" />
            <span>TradingView Cloud Feed</span>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-blue-500/20 text-blue-300">
              Global
            </span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] text-[#64748b] font-mono">
          <span>Engine: <strong className="text-white">TradingView v5.3</strong></span>
          <span>•</span>
          <span className="text-emerald-400">Interactive 60fps Canvas</span>
        </div>
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
