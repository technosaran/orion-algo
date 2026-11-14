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
    <div className="flex flex-col h-full bg-[#0b0f19] border border-[#1a2333] rounded-xl overflow-hidden">
      {/* Header & Search */}
      <div className="p-3 border-b border-[#1a2333] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Market Watchlist
          </span>
          <span className="text-[10px] text-[#64748b] bg-[#121824] px-1.5 py-0.5 rounded border border-[#1e293b]">
            {assets.length} Assets
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748b]" />
          <input
            type="text"
            placeholder="Search ticker or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#121824] border border-[#1e293b] rounded-lg text-white placeholder-[#64748b] focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-[11px] pb-0.5">
          {(["all", "stock", "crypto", "index"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1 rounded-md capitalize font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "bg-[#182338] text-white border border-[#2b3a55]"
                  : "text-[#64748b] hover:text-[#94a3b8] hover:bg-[#121824]"
              }`}
            >
              {tab === "stock" ? "Stocks" : tab === "index" ? "Indices" : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Asset List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#131b2c] p-1.5 space-y-1">
        {filteredAssets.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#64748b]">
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
                    ? "bg-[#141e30] border border-emerald-500/40 shadow-sm shadow-emerald-500/10"
                    : "hover:bg-[#111724] border border-transparent"
                }`}
              >
                {/* Left: Symbol & Name */}
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-white truncate">
                      {asset.symbol}
                    </span>
                    {asset.indexWeight && (
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                        {asset.indexWeight}
                      </span>
                    )}
                    {asset.lotSize && asset.lotSize > 1 && (
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        Lot {asset.lotSize}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[#64748b] truncate mt-0.5">
                    <span className="truncate">{asset.name}</span>
                    {asset.sector && (
                      <span className="text-[#475569] hidden 2xl:inline">• {asset.sector}</span>
                    )}
                  </div>
                </div>

                {/* Right: Price & 24h Change */}
                <div className="text-right shrink-0">
                  <div
                    className={`font-mono text-xs font-bold transition-colors ${
                      delta === "up"
                        ? "text-emerald-300"
                        : delta === "down"
                        ? "text-rose-300"
                        : "text-white"
                    }`}
                  >
                    ₹{asset.price.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div
                    className={`flex items-center justify-end text-[10px] font-semibold mt-0.5 ${
                      isPositive ? "text-emerald-400" : "text-rose-400"
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
      <div className="p-2 border-t border-[#1a2333] bg-[#080b12] flex items-center justify-between text-[10px] text-[#64748b]">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Real API Connected</span>
        </div>
        <span>Binance & Yahoo</span>
      </div>
    </div>
  );
}
