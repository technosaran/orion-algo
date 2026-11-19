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
import { ChevronDown, TrendingUp, TrendingDown } from "lucide-react";

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

  const quickSymbols = [
    { label: "NIFTY 50", symbol: "NIFTY50" },
    { label: "BANK NIFTY", symbol: "BANKNIFTY" },
    { label: "SENSEX", symbol: "SENSEX" },
    { label: "RELIANCE", symbol: "RELIANCE" },
    { label: "HDFC BANK", symbol: "HDFCBANK" },
    { label: "BTC/USDT", symbol: "BTC/USDT" },
  ];

  const isPositive = asset.change24h >= 0;

  return (
    <div className="flex flex-col space-y-2.5 bg-[#191c24] border border-[#232733] rounded-xl p-3 shadow-xl font-sans">
      {/* 1. Unified Instrument Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#232733]">
        {/* Quick Instrument Switchers */}
        {assets.length > 0 && onSelectSymbol && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 bg-[#14171f] p-0.5 rounded-lg border border-[#232733]">
              {quickSymbols.map(({ label, symbol }) => {
                const isSelected = asset.symbol === symbol;
                return (
                  <button
                    key={symbol}
                    onClick={() => onSelectSymbol(symbol)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                      isSelected
                        ? "bg-[#202430] text-[#4184f3] border border-[#4184f3]/40 shadow-xs"
                        : "text-[#9b9b9b] hover:text-[#e0e0e0] hover:bg-[#191c24]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Dropdown for other assets */}
            <div className="relative">
              <select
                value={asset.symbol}
                onChange={(e) => onSelectSymbol(e.target.value)}
                className="appearance-none bg-[#14171f] border border-[#232733] text-[#e0e0e0] text-xs font-semibold rounded-lg px-2.5 py-1.5 pr-7 hover:border-[#4184f3]/50 focus:outline-none focus:border-[#4184f3] cursor-pointer"
              >
                {assets.map((a) => (
                  <option key={a.symbol} value={a.symbol} className="bg-[#14171f] text-white">
                    {a.symbol} • ₹{a.price.toFixed(1)}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#666666] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Right: Engine Switcher (Candlestick vs TradingView Cloud) */}
        <div className="flex items-center gap-1 bg-[#14171f] p-0.5 rounded-lg border border-[#232733]">
          <button
            onClick={() => setEngineMode("opensource")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              engineMode === "opensource"
                ? "bg-[#202430] text-[#4184f3] border border-[#4184f3]/40 shadow-xs"
                : "text-[#9b9b9b] hover:text-[#e0e0e0]"
            }`}
          >
            <span>Interactive Chart</span>
          </button>

          <button
            onClick={() => setEngineMode("cloud")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              engineMode === "cloud"
                ? "bg-[#202430] text-[#4184f3] border border-[#4184f3]/40 shadow-xs"
                : "text-[#9b9b9b] hover:text-[#e0e0e0]"
            }`}
          >
            <span>TradingView Cloud</span>
          </button>
        </div>
      </div>

      {/* 2. Live Asset Price Info Strip */}
      <div className="flex flex-wrap items-center justify-between px-1 pt-0.5 text-xs">
        <div className="flex items-baseline gap-2.5">
          <span className="text-sm font-bold text-white tracking-wide">
            {asset.name || asset.symbol}
          </span>
          <span className="text-xl font-mono tabular-nums font-bold text-white">
            ₹{asset.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span
            className={`inline-flex items-center text-xs font-mono tabular-nums font-semibold px-2 py-0.5 rounded ${
              isPositive ? "bg-[#4caf50]/15 text-[#4caf50] border border-[#4caf50]/30" : "bg-[#df514c]/15 text-[#df514c] border border-[#df514c]/30"
            }`}
          >
            {isPositive ? <TrendingUp className="w-3 h-3 mr-0.5 inline" /> : <TrendingDown className="w-3 h-3 mr-0.5 inline" />}
            {isPositive ? "+" : ""}{asset.change24h.toFixed(2)}%
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-[#9b9b9b] text-[11px] font-mono tabular-nums">
          <span>24h High: <strong className="text-white">₹{asset.high24h?.toFixed(2)}</strong></span>
          <span>24h Low: <strong className="text-white">₹{asset.low24h?.toFixed(2)}</strong></span>
          <span>Vol: <strong className="text-white">{asset.volume || "0"}</strong></span>
        </div>
      </div>

      {/* 3. Render Chart View */}
      <div className="w-full rounded-lg overflow-hidden border border-[#232733]">
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
    </div>
  );
}
