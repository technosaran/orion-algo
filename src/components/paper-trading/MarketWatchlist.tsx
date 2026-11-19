"use client";

import React, { useState } from "react";
import { Search, TrendingUp, TrendingDown } from "lucide-react";
import { AssetQuote, AssetCategory } from "@/types/paperTrading";

interface MarketWatchlistProps {
  assets: AssetQuote[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  priceDeltas?: Record<string, "up" | "down">;
}

export function MarketWatchlist({
  assets,
  selectedSymbol,
  onSelectSymbol,
  priceDeltas = {},
}: MarketWatchlistProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | AssetCategory>("all");

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.symbol.toLowerCase().includes(search.toLowerCase()) ||
      asset.name.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === "all" || asset.category === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="flex flex-col h-full bg-[#191c24] border border-[#232733] rounded-xl overflow-hidden font-sans">
      {/* Header & Search */}
      <div className="p-3 border-b border-[#232733] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#e0e0e0] uppercase tracking-wider">
            Market Watchlist
          </span>
          <span className="text-[10px] font-mono tabular-nums text-[#9b9b9b] bg-[#14171f] px-2 py-0.5 rounded border border-[#232733]">
            {assets.length} Assets
          </span>
        </div>

        {/* Search Input (Zerodha Kite Style) */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#666666]" />
          <input
            type="text"
            placeholder="Search ticker or name (e.g. INFY, NIFTY)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#14171f] border border-[#232733] rounded-lg text-[#e0e0e0] placeholder-[#666666] focus:outline-none focus:border-[#4184f3] transition-colors"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-[11px] pb-0.5 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {(["all", "stock", "crypto", "index"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1 rounded-md capitalize font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "bg-[#202430] text-[#4184f3] border border-[#2a2f3e] font-semibold"
                  : "text-[#9b9b9b] hover:text-[#e0e0e0] hover:bg-[#161922]"
              }`}
            >
              {tab === "stock" ? "Stocks" : tab === "index" ? "Indices" : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Asset List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1e222e] p-1.5 space-y-0.5">
        {filteredAssets.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#9b9b9b]">
            No assets match your filter.
          </div>
        ) : (
          filteredAssets.map((asset) => {
            const isSelected = asset.symbol === selectedSymbol;
            const isPositive = asset.change24h >= 0;
            const delta = priceDeltas[asset.symbol];

            return (
              <button
                key={asset.symbol}
                onClick={() => onSelectSymbol(asset.symbol)}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all ${
                  isSelected
                    ? "bg-[#202430] border-l-2 border-l-[#4184f3] border-t-transparent border-r-transparent border-b-transparent shadow-xs"
                    : "hover:bg-[#1d212c] border border-transparent"
                }`}
              >
                {/* Left: Symbol & Name */}
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-[#e0e0e0] truncate">
                      {asset.symbol}
                    </span>
                    {asset.indexWeight && (
                      <span className="text-[9px] font-mono tabular-nums px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                        {asset.indexWeight}
                      </span>
                    )}
                    {asset.lotSize && asset.lotSize > 1 && (
                      <span className="text-[9px] font-mono tabular-nums px-1 py-0.2 rounded bg-[#4184f3]/10 text-[#4184f3] border border-[#4184f3]/20">
                        Lot {asset.lotSize}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[#9b9b9b] truncate mt-0.5">
                    <span className="truncate">{asset.name}</span>
                    {asset.sector && (
                      <span className="text-[#666666] hidden 2xl:inline">• {asset.sector}</span>
                    )}
                  </div>
                </div>

                {/* Right: Price & 24h Change (Kite Tabular Figures) */}
                <div className="text-right shrink-0">
                  <div
                    className={`font-mono tabular-nums text-xs font-semibold transition-colors ${
                      delta === "up"
                        ? "text-[#4caf50]"
                        : delta === "down"
                        ? "text-[#df514c]"
                        : "text-[#e0e0e0]"
                    }`}
                  >
                    ₹{asset.price.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div
                    className={`flex items-center justify-end text-[10px] font-mono tabular-nums font-semibold mt-0.5 ${
                      isPositive ? "text-[#4caf50]" : "text-[#df514c]"
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3 mr-0.5 inline" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-0.5 inline" />
                    )}
                    {isPositive ? "+" : ""}
                    {asset.change24h.toFixed(2)}%
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2 border-t border-[#232733] bg-[#14171f] flex items-center justify-between text-[10px] text-[#9b9b9b]">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4caf50]" />
          <span>Real API Connected</span>
        </div>
        <span className="font-mono text-[9px] text-[#666666]">Binance & Yahoo Live</span>
      </div>
    </div>
  );
}
