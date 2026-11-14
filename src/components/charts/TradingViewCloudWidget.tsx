"use client";

import React, { useEffect, useRef, memo } from "react";
import { AssetQuote } from "@/types/paperTrading";

interface TradingViewCloudWidgetProps {
  asset: AssetQuote;
}

function mapSymbolToTradingView(symbol: string): string {
  switch (symbol.toUpperCase()) {
    case "NIFTY50":
    case "NIFTY":
      return "NSE:NIFTY";
    case "BANKNIFTY":
      return "NSE:BANKNIFTY";
    case "FINNIFTY":
      return "NSE:CNXFINANCE";
    case "SENSEX":
      return "BSE:SENSEX";
    case "RELIANCE":
      return "NSE:RELIANCE";
    case "HDFCBANK":
      return "NSE:HDFCBANK";
    case "TCS":
      return "NSE:TCS";
    case "INFY":
      return "NSE:INFY";
    case "ICICIBANK":
      return "NSE:ICICIBANK";
    case "TATAMOTORS":
      return "NSE:TATAMOTORS";
    case "SBIN":
      return "NSE:SBIN";
    case "CRUDEOIL":
      return "MCX:CRUDEOIL1!";
    case "GOLD":
      return "MCX:GOLD1!";
    default:
      return `NSE:${symbol}`;
  }
}

export const TradingViewCloudWidget = memo(function TradingViewCloudWidget({
  asset,
}: TradingViewCloudWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tvSymbol = mapSymbolToTradingView(asset.symbol);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    containerRef.current.innerHTML = "";

    const widgetWrapper = document.createElement("div");
    widgetWrapper.className = "tradingview-widget-container__widget";
    widgetWrapper.style.height = "calc(100% - 32px)";
    widgetWrapper.style.width = "100%";
    containerRef.current.appendChild(widgetWrapper);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: "15",
      timezone: "Asia/Kolkata",
      theme: "dark",
      style: "1",
      locale: "in",
      enable_publishing: false,
      backgroundColor: "rgba(8, 11, 18, 1)",
      gridColor: "rgba(19, 26, 41, 0.6)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [tvSymbol]);

  return (
    <div className="flex flex-col bg-[#0b0f19] border border-[#1a2333] rounded-xl overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#0c111d] border-b border-[#1a2333]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">{asset.symbol}</span>
          <span className="text-xs text-[#94a3b8] font-mono">({tvSymbol})</span>
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            {asset.category === "crypto" ? "Binance Public Feed (Live)" : "NSE/BSE Feed (Delayed ~15m)"}
          </span>
        </div>
        <div className="text-[11px] text-[#64748b]">
          TradingView Charts & Indicators (IST)
        </div>
      </div>
      <div className="w-full h-[470px] bg-[#080b12]" ref={containerRef} />
    </div>
  );
});
