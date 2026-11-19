"use client";

import React, { useState, useEffect } from "react";
import {
  AssetQuote,
  OrderSide,
  OrderType,
} from "@/types/paperTrading";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Plus,
  Minus,
  Layers,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from "lucide-react";
import {
  formatINR,
  getInstrumentLotSize,
  getInstrumentTickSize,
} from "@/lib/formatters";

interface OrderExecutionTicketProps {
  asset: AssetQuote;
  availableCash: number;
  hasOpenLong?: boolean;
  onPlaceOrder: (order: {
    symbol: string;
    side: OrderSide;
    type: OrderType;
    quantity: number;
    price: number;
    marginRequired?: number;
    targetPrice?: number;
    takeProfit?: number;
    stopLoss?: number;
  }) => void;
}

export function OrderExecutionTicket({
  asset,
  availableCash,
  hasOpenLong = false,
  onPlaceOrder,
}: OrderExecutionTicketProps) {
  const [side, setSide] = useState<OrderSide>("BUY");
  const [orderType, setOrderType] = useState<OrderType>("MARKET");
  const [tradeMode, setTradeMode] = useState<"units" | "lots">("units");

  const rawLotSize = asset.lotSize || getInstrumentLotSize(asset.symbol);
  const isFOEligible = rawLotSize > 1 || asset.category === "index";
  const lotSize = rawLotSize > 1 ? rawLotSize : (asset.category === "index" ? 50 : 1);

  // Quantities
  const [lots, setLots] = useState<number>(1);
  const [quantity, setQuantity] = useState<number>(1);
  const [customLimitPrice, setCustomLimitPrice] = useState<number | null>(null);

  // Risk management expandable
  const [showRiskMgmt, setShowRiskMgmt] = useState<boolean>(false);
  const [takeProfit, setTakeProfit] = useState<string>("");
  const [stopLoss, setStopLoss] = useState<string>("");

  const limitPrice = customLimitPrice !== null ? customLimitPrice : asset.price;

  const [prevSymbol, setPrevSymbol] = useState(asset.symbol);
  if (asset.symbol !== prevSymbol) {
    setPrevSymbol(asset.symbol);
    setCustomLimitPrice(null);
    if (tradeMode === "lots" && isFOEligible) {
      setLots(1);
      setQuantity(lotSize);
    } else {
      setQuantity(1);
    }
  }

  // Handle lot change
  const handleSetLots = (newLots: number) => {
    const valid = Math.max(1, newLots);
    setLots(valid);
    setQuantity(valid * lotSize);
  };

  // Switch between Units and Lots mode
  const handleToggleMode = (mode: "units" | "lots") => {
    setTradeMode(mode);
    if (mode === "lots") {
      setLots(1);
      setQuantity(lotSize);
    } else {
      setQuantity(1);
    }
  };

  const effectivePrice = orderType === "MARKET" ? asset.price : limitPrice;
  const notionalValue = effectivePrice * quantity;

  // Realistic margin calculation:
  // - Units / Cash: 100% of notional value (Spot shares)
  // - F&O Lots: 10% SPAN + Exposure margin (Standard NSE margin)
  const isLotsMode = tradeMode === "lots" && isFOEligible;
  const marginRequired = isLotsMode ? notionalValue * 0.10 : notionalValue;
  const slippage = orderType === "MARKET" ? notionalValue * 0.0001 : 0;
  const totalFundsRequired = marginRequired + slippage;

  const hasSufficientFunds = (side === "SELL" && hasOpenLong) || availableCash >= totalFundsRequired;
  const isValidQuantity = quantity > 0;
  const isBuy = side === "BUY";

  // Quick quantity presets
  const handleAddQuantity = (delta: number) => {
    if (isLotsMode) {
      handleSetLots(lots + delta);
    } else {
      setQuantity(Math.max(1, quantity + delta));
    }
  };

  const handlePercentAlloc = (pct: number) => {
    if (effectivePrice <= 0) return;
    const targetCash = availableCash * (pct / 100);
    if (isLotsMode) {
      // 10% margin per lot: lotMargin = price * lotSize * 0.10
      const lotMargin = effectivePrice * lotSize * 0.10;
      const affordableLots = Math.max(1, Math.floor(targetCash / lotMargin));
      handleSetLots(affordableLots);
    } else {
      const affordableQty = Math.max(1, Math.floor(targetCash / effectivePrice));
      setQuantity(affordableQty);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidQuantity || !hasSufficientFunds) return;

    onPlaceOrder({
      symbol: asset.symbol,
      side,
      type: orderType,
      quantity,
      price: effectivePrice,
      marginRequired: totalFundsRequired,
      targetPrice: orderType !== "MARKET" ? limitPrice : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
    });

    setTakeProfit("");
    setStopLoss("");
    setShowRiskMgmt(false);
  };

  return (
    <div className="flex flex-col bg-[#191c24] border border-[#232733] rounded-xl p-4 shadow-xl select-none font-sans">
      {/* 1. Header with Available Balance */}
      <div className="flex items-center justify-between pb-3 border-b border-[#232733] mb-3">
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide">
            Order Ticket
          </h2>
          <span className="text-[11px] text-[#9b9b9b]">
            Available: <strong className="text-white font-mono tabular-nums">{formatINR(availableCash, { decimals: 2 })}</strong>
          </span>
        </div>
        <span className="text-[11px] font-mono tabular-nums font-semibold px-2.5 py-0.5 rounded bg-[#14171f] border border-[#232733] text-[#4caf50]">
          ₹{asset.price.toFixed(2)}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* 2. Buy / Sell Big Tabs (Zerodha Kite Signature Colors: Buy #4184f3, Sell #ff5722) */}
        <div className="grid grid-cols-2 gap-1.5 bg-[#14171f] p-1 rounded-xl border border-[#232733]">
          <button
            type="button"
            onClick={() => setSide("BUY")}
            className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              isBuy
                ? "bg-[#4184f3] text-white shadow-md shadow-[#4184f3]/30"
                : "text-[#9b9b9b] hover:text-white"
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>BUY / LONG</span>
          </button>
          <button
            type="button"
            onClick={() => setSide("SELL")}
            className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              !isBuy
                ? "bg-[#ff5722] text-white shadow-md shadow-[#ff5722]/30"
                : "text-[#9b9b9b] hover:text-white"
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>SELL / SHORT</span>
          </button>
        </div>

        {/* 3. Trading Mode & Order Type Bar */}
        <div className="grid grid-cols-2 gap-2">
          {/* Order Type: Market / Limit */}
          <div className="flex bg-[#14171f] p-0.5 rounded-lg border border-[#232733]">
            {(["MARKET", "LIMIT"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setOrderType(t)}
                className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${
                  orderType === t
                    ? "bg-[#202430] text-white shadow-xs"
                    : "text-[#9b9b9b] hover:text-[#e0e0e0]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Unit / Lot Mode */}
          {isFOEligible ? (
            <div className="flex bg-[#14171f] p-0.5 rounded-lg border border-[#232733]">
              <button
                type="button"
                onClick={() => handleToggleMode("units")}
                className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${
                  tradeMode === "units"
                    ? "bg-[#202430] text-white"
                    : "text-[#9b9b9b] hover:text-[#e0e0e0]"
                }`}
                title="Trade standard shares/units"
              >
                Units
              </button>
              <button
                type="button"
                onClick={() => handleToggleMode("lots")}
                className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${
                  tradeMode === "lots"
                    ? "bg-[#202430] text-[#4184f3]"
                    : "text-[#9b9b9b] hover:text-[#e0e0e0]"
                }`}
                title="Trade F&O lots with 10% SPAN margin"
              >
                Lots ({lotSize})
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center text-[10px] text-[#9b9b9b] bg-[#14171f] rounded-lg border border-[#232733] px-2 font-mono">
              <span>Equity Cash</span>
            </div>
          )}
        </div>

        {/* 4. Limit Price Input (If LIMIT selected) */}
        {orderType === "LIMIT" && (
          <div className="p-2 rounded-lg bg-[#14171f] border border-[#232733]">
            <div className="flex justify-between text-[11px] font-medium text-[#9b9b9b] mb-1">
              <span>Limit Price (₹)</span>
              <button
                type="button"
                onClick={() => setCustomLimitPrice(asset.price)}
                className="text-[#4184f3] hover:underline text-[10px] font-mono"
              >
                Current: ₹{asset.price.toFixed(2)}
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9b9b9b] font-mono text-xs">₹</span>
              <input
                type="number"
                step="0.05"
                value={limitPrice}
                onChange={(e) => setCustomLimitPrice(parseFloat(e.target.value) || 0)}
                className="w-full pl-7 pr-3 py-1.5 bg-[#191c24] border border-[#232733] rounded-md text-white font-mono tabular-nums text-sm focus:outline-none focus:border-[#4184f3]"
              />
            </div>
          </div>
        )}

        {/* 5. Quantity Stepper */}
        <div>
          <div className="flex justify-between text-[11px] font-semibold text-[#9b9b9b] mb-1">
            <span>{isLotsMode ? "Lots (F&O Contracts)" : "Quantity (Units)"}</span>
            <span className="text-[#9b9b9b] font-mono tabular-nums">
              Total: <strong className="text-white">{quantity}</strong> {isLotsMode ? `(${lots} lot)` : "shares"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleAddQuantity(-1)}
              className="p-2 bg-[#14171f] border border-[#232733] rounded-lg text-[#9b9b9b] hover:text-white hover:bg-[#202430] transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              min="1"
              value={isLotsMode ? lots : quantity}
              onChange={(e) => {
                const val = Math.max(1, parseInt(e.target.value) || 1);
                if (isLotsMode) {
                  handleSetLots(val);
                } else {
                  setQuantity(val);
                }
              }}
              className="flex-1 px-3 py-1.5 text-center bg-[#14171f] border border-[#232733] rounded-lg text-white font-mono tabular-nums font-bold text-sm focus:outline-none focus:border-[#4184f3]"
            />
            <button
              type="button"
              onClick={() => handleAddQuantity(1)}
              className="p-2 bg-[#14171f] border border-[#232733] rounded-lg text-[#9b9b9b] hover:text-white hover:bg-[#202430] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-4 gap-1 mt-1.5">
            {isLotsMode ? (
              [1, 2, 5, 10].map((lt) => (
                <button
                  key={lt}
                  type="button"
                  onClick={() => handleSetLots(lt)}
                  className={`py-1 text-[10px] font-mono tabular-nums rounded border transition-colors ${
                    lots === lt
                      ? "bg-[#4184f3]/15 text-[#4184f3] border-[#4184f3]/40 font-bold"
                      : "bg-[#14171f] border-[#232733] text-[#9b9b9b] hover:text-white"
                  }`}
                >
                  {lt} {lt === 1 ? "Lot" : "Lots"}
                </button>
              ))
            ) : (
              [1, 5, 10, 50].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuantity(q)}
                  className={`py-1 text-[10px] font-mono tabular-nums rounded border transition-colors ${
                    quantity === q
                      ? "bg-[#4184f3]/15 text-[#4184f3] border-[#4184f3]/40 font-bold"
                      : "bg-[#14171f] border-[#232733] text-[#9b9b9b] hover:text-white"
                  }`}
                >
                  {q} Qty
                </button>
              ))
            )}
          </div>

          {/* % Portfolio allocation presets */}
          <div className="grid grid-cols-3 gap-1 mt-1">
            {[25, 50, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handlePercentAlloc(pct)}
                className="py-0.5 text-[9px] font-mono tabular-nums rounded bg-[#14171f] border border-[#232733] text-[#9b9b9b] hover:text-white hover:border-[#4184f3]/40 transition-colors"
              >
                {pct === 100 ? "Max Cash" : `${pct}% Cash`}
              </button>
            ))}
          </div>
        </div>

        {/* 6. Collapsible Target & Stop Loss */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowRiskMgmt(!showRiskMgmt)}
            className="flex items-center justify-between w-full text-[11px] text-[#9b9b9b] hover:text-white py-1 transition-colors"
          >
            <span className="flex items-center gap-1.5 font-medium">
              <span>{showRiskMgmt ? "Hide" : "+ Add"} Target & Stop Loss</span>
              {(takeProfit || stopLoss) && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#4caf50]" />
              )}
            </span>
            {showRiskMgmt ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showRiskMgmt && (
            <div className="grid grid-cols-2 gap-2 pt-2 pb-1 border-t border-[#232733]">
              <div>
                <label className="block text-[10px] font-semibold text-[#4caf50] mb-1">
                  Target Price (₹)
                </label>
                <input
                  type="number"
                  step="0.05"
                  placeholder={`e.g. ${(asset.price * 1.05).toFixed(1)}`}
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="w-full px-2 py-1 bg-[#14171f] border border-[#4caf50]/30 rounded-md text-white font-mono tabular-nums text-xs focus:outline-none focus:border-[#4caf50]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#df514c] mb-1">
                  Stop Loss (₹)
                </label>
                <input
                  type="number"
                  step="0.05"
                  placeholder={`e.g. ${(asset.price * 0.96).toFixed(1)}`}
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="w-full px-2 py-1 bg-[#14171f] border border-[#df514c]/30 rounded-md text-white font-mono tabular-nums text-xs focus:outline-none focus:border-[#df514c]"
                />
              </div>
            </div>
          )}
        </div>

        {/* 7. Summary Breakdown */}
        <div className="p-2.5 rounded-lg bg-[#14171f] border border-[#232733] space-y-1 text-[11px]">
          <div className="flex justify-between text-[#9b9b9b]">
            <span>{isLotsMode ? "Contract Value" : "Order Value"}</span>
            <span className="font-mono tabular-nums text-white font-medium">
              {formatINR(notionalValue, { decimals: 2 })}
            </span>
          </div>
          {isLotsMode && (
            <div className="flex justify-between text-[#4184f3]">
              <span>Exchange Margin (10%)</span>
              <span className="font-mono tabular-nums font-semibold">
                {formatINR(marginRequired, { decimals: 2 })}
              </span>
            </div>
          )}
          <div className="pt-1 border-t border-[#232733] flex justify-between font-semibold">
            <span className="text-[#9b9b9b]">Required Funds</span>
            <span className="font-mono tabular-nums text-white text-xs">
              {formatINR(totalFundsRequired, { decimals: 2 })}
            </span>
          </div>
        </div>

        {/* Warning if insufficient balance */}
        {!hasSufficientFunds && (
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-[#df514c]/10 border border-[#df514c]/30 text-[#df514c] text-[11px] font-mono tabular-nums">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Need {formatINR(totalFundsRequired, { decimals: 0 })}. Available: {formatINR(availableCash, { decimals: 0 })}</span>
          </div>
        )}

        {/* 8. Large Submit Execution Button (Zerodha Kite Signature Action Button) */}
        <button
          type="submit"
          disabled={!isValidQuantity || !hasSufficientFunds}
          className={`w-full py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            !isValidQuantity || !hasSufficientFunds
              ? "bg-[#202430] text-[#666666] cursor-not-allowed border border-[#2a2f3e]"
              : isBuy
              ? "bg-[#4184f3] hover:bg-[#3874d8] text-white shadow-lg shadow-[#4184f3]/25 active:scale-[0.98]"
              : "bg-[#ff5722] hover:bg-[#e04818] text-white shadow-lg shadow-[#ff5722]/25 active:scale-[0.98]"
          }`}
        >
          {isBuy ? (
            <>
              <TrendingUp className="w-4 h-4" />
              <span className="font-sans font-bold">
                BUY {quantity} {asset.symbol} • <span className="font-mono tabular-nums">{formatINR(totalFundsRequired, { decimals: 0 })}</span>
              </span>
            </>
          ) : hasOpenLong ? (
            <>
              <TrendingDown className="w-4 h-4" />
              <span className="font-sans font-bold">
                SQUARE OFF {quantity} {asset.symbol}
              </span>
            </>
          ) : (
            <>
              <TrendingDown className="w-4 h-4" />
              <span className="font-sans font-bold">
                SELL SHORT {quantity} {asset.symbol} • <span className="font-mono tabular-nums">{formatINR(totalFundsRequired, { decimals: 0 })}</span>
              </span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
