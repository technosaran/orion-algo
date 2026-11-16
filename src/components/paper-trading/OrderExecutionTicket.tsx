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
  Scale,
} from "lucide-react";
import {
  formatINR,
  formatLakhs,
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

  const lotSize = asset.lotSize || getInstrumentLotSize(asset.symbol);
  const isFO = lotSize > 1;

  const [useLots, setUseLots] = useState<boolean>(isFO);
  const [lots, setLots] = useState<number>(1);
  const [quantity, setQuantity] = useState<number>(isFO ? lotSize : 1);
  const [customLimitPrice, setCustomLimitPrice] = useState<number | null>(null);
  const [takeProfit, setTakeProfit] = useState<string>("");
  const [stopLoss, setStopLoss] = useState<string>("");

  const limitPrice = customLimitPrice !== null ? customLimitPrice : asset.price;

  // When asset symbol changes, re-sync lots and quantity
  useEffect(() => {
    const newLotSize = asset.lotSize || getInstrumentLotSize(asset.symbol);
    const newIsFO = newLotSize > 1;
    setUseLots(newIsFO);
    setLots(1);
    setQuantity(newIsFO ? newLotSize : 1);
    setCustomLimitPrice(null);
  }, [asset.symbol, asset.lotSize]);

  // Update quantity whenever lots change
  const handleSetLots = (newLots: number) => {
    const validLots = Math.max(1, newLots);
    setLots(validLots);
    setQuantity(validLots * lotSize);
  };

  const effectivePrice = orderType === "MARKET" ? asset.price : limitPrice;
  const orderValue = effectivePrice * quantity;
  const slippage = orderType === "MARKET" ? orderValue * 0.0002 : 0;
  const totalCost = orderValue + slippage;
  const hasSufficientFunds = (side === "SELL" && hasOpenLong) || availableCash >= totalCost;
  const isValidQuantity = quantity > 0;
  const tickSize = asset.tickSize || getInstrumentTickSize(asset.symbol);

  // Percentage allocation helper
  const handlePercentAlloc = (pct: number) => {
    if (effectivePrice <= 0) return;
    const maxAffordable = availableCash / effectivePrice;
    if (useLots && lotSize > 1) {
      const affordableLots = Math.floor((maxAffordable * (pct / 100)) / lotSize);
      handleSetLots(Math.max(1, affordableLots));
    } else {
      const targetQty = Math.max(1, Math.floor((maxAffordable * pct) / 100));
      setQuantity(targetQty);
    }
  };

  const handleStepQty = (delta: number) => {
    if (useLots && lotSize > 1) {
      handleSetLots(lots + delta);
    } else {
      setQuantity(Math.max(1, quantity + delta));
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
      targetPrice: orderType !== "MARKET" ? limitPrice : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
    });

    setTakeProfit("");
    setStopLoss("");
  };

  const isBuy = side === "BUY";

  return (
    <div className="flex flex-col bg-[#0b0f19] border border-[#1a2333] rounded-xl p-4 shadow-xl select-none">
      {/* Header with Available Rupee Balance */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1a2333] mb-3">
        <div>
          <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
            Order Ticket
          </span>
          <span className="text-[10px] text-[#64748b]">
            Available: <strong className="text-white">{formatINR(availableCash, { decimals: 2 })}</strong>
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-[#121824] border border-[#1e293b] text-[#94a3b8]">
          <span>Tick:</span>
          <strong className="text-emerald-400">₹{tickSize.toFixed(2)}</strong>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Buy / Sell Toggle Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-[#080b12] p-1 rounded-xl border border-[#1a2333]">
          <button
            type="button"
            onClick={() => setSide("BUY")}
            className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              isBuy
                ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                : "text-[#64748b] hover:text-white"
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
                ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                : "text-[#64748b] hover:text-white"
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>SELL / SHORT</span>
          </button>
        </div>

        {/* Order Type Toggle */}
        <div className="grid grid-cols-3 gap-1 bg-[#121824] p-1 rounded-lg border border-[#1e293b]">
          {(["MARKET", "LIMIT", "STOP"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setOrderType(type)}
              className={`py-1.5 rounded-md font-semibold text-[11px] transition-colors ${
                orderType === type
                  ? "bg-[#1f2b42] text-white shadow-xs"
                  : "text-[#64748b] hover:text-[#cbd5e1]"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Limit / Stop Price Input */}
        {orderType !== "MARKET" && (
          <div>
            <div className="flex justify-between text-[11px] font-semibold text-[#64748b] mb-1">
              <span>{orderType === "LIMIT" ? "Limit Price (₹)" : "Stop Trigger Price (₹)"}</span>
              <button
                type="button"
                onClick={() => setCustomLimitPrice(asset.price)}
                className="text-cyan-400 hover:underline"
              >
                Use Current (₹{asset.price.toFixed(2)})
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b] font-mono">
                ₹
              </span>
              <input
                type="number"
                step="0.05"
                value={limitPrice}
                onChange={(e) => setCustomLimitPrice(parseFloat(e.target.value) || 0)}
                className="w-full pl-7 pr-3 py-2 bg-[#121824] border border-[#1e293b] rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>
        )}

        {/* F&O Lots vs Shares Switcher */}
        {isFO && (
          <div className="flex items-center justify-between text-[11px] px-1 py-1 bg-[#090d16] rounded-lg border border-[#1a2333]">
            <div className="flex items-center gap-1.5 text-[#94a3b8]">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>1 Lot = <strong>{lotSize} Qty</strong></span>
            </div>
            <div className="flex items-center gap-1 bg-[#121824] p-0.5 rounded border border-[#1e293b]">
              <button
                type="button"
                onClick={() => {
                  setUseLots(true);
                  handleSetLots(Math.max(1, Math.round(quantity / lotSize)));
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  useLots ? "bg-[#1f2b42] text-cyan-400" : "text-[#64748b]"
                }`}
              >
                Lots
              </button>
              <button
                type="button"
                onClick={() => setUseLots(false)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  !useLots ? "bg-[#1f2b42] text-white" : "text-[#64748b]"
                }`}
              >
                Units
              </button>
            </div>
          </div>
        )}

        {/* Quantity / Lots Stepper */}
        <div>
          <div className="flex justify-between text-[11px] font-semibold text-[#64748b] mb-1">
            <span>{useLots && isFO ? "Contracts (Exchange Lots)" : `Quantity (${asset.symbol})`}</span>
            <span className="text-[#94a3b8]">
              Total Qty: <strong className="text-white">{quantity}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleStepQty(-1)}
              className="p-2 bg-[#121824] border border-[#1e293b] rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#182338] transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              step={useLots && isFO ? "1" : "1"}
              min="1"
              value={useLots && isFO ? lots : quantity}
              onChange={(e) => {
                const val = Math.max(1, parseInt(e.target.value) || 1);
                if (useLots && isFO) {
                  handleSetLots(val);
                } else {
                  setQuantity(val);
                }
              }}
              className="flex-1 px-3 py-2 text-center bg-[#121824] border border-[#1e293b] rounded-lg text-white font-mono font-bold focus:outline-none focus:border-emerald-500/50"
            />
            <button
              type="button"
              onClick={() => handleStepQty(1)}
              className="p-2 bg-[#121824] border border-[#1e293b] rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#182338] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Lot / Capital Allocations */}
          {useLots && isFO ? (
            <div className="grid grid-cols-4 gap-1 mt-2">
              {[1, 2, 5, 10].map((lt) => (
                <button
                  key={lt}
                  type="button"
                  onClick={() => handleSetLots(lt)}
                  className={`py-1 text-[10px] font-mono rounded border transition-colors ${
                    lots === lt
                      ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/40 font-bold"
                      : "bg-[#121824] border-[#1e293b] text-[#94a3b8] hover:text-white"
                  }`}
                >
                  {lt} Lot{lt > 1 ? "s" : ""}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1 mt-2">
              {[10, 25, 50, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercentAlloc(pct)}
                  className="py-1 text-[10px] font-mono rounded bg-[#121824] border border-[#1e293b] text-[#94a3b8] hover:text-white hover:border-[#334155] transition-colors"
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Optional Risk Management (TP & SL) */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#1a2333]/70">
          <div>
            <label className="block text-[10px] font-semibold text-emerald-400 mb-1">
              Take Profit (₹)
            </label>
            <input
              type="number"
              step="0.05"
              placeholder={`e.g. ${(asset.price * 1.05).toFixed(2)}`}
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#121824] border border-emerald-500/20 rounded-lg text-white font-mono text-[11px] focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-rose-400 mb-1">
              Stop Loss (₹)
            </label>
            <input
              type="number"
              step="0.05"
              placeholder={`e.g. ${(asset.price * 0.95).toFixed(2)}`}
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#121824] border border-rose-500/20 rounded-lg text-white font-mono text-[11px] focus:outline-none focus:border-rose-500/50"
            />
          </div>
        </div>

        {/* Order Breakdown / Cost Summary */}
        <div className="p-2.5 rounded-lg bg-[#080b12] border border-[#1a2333] space-y-1.5 text-[11px]">
          <div className="flex justify-between text-[#64748b]">
            <span>Order Value</span>
            <span className="font-mono text-white font-semibold">
              {formatINR(orderValue, { decimals: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-[#64748b]">
            <span>Brokerage & Taxes</span>
            <span className="font-mono text-emerald-400">₹0.00 (Paper)</span>
          </div>
          <div className="flex justify-between text-[#64748b]">
            <span>Est. Slippage</span>
            <span className="font-mono text-[#94a3b8]">₹{slippage.toFixed(2)}</span>
          </div>
          <div className="pt-1 border-t border-[#1a2333] flex justify-between font-semibold">
            <span className="text-[#94a3b8]">Total Amount</span>
            <span className="font-mono text-white text-xs">{formatINR(totalCost, { decimals: 2 })}</span>
          </div>
        </div>

        {/* Warning if insufficient balance */}
        {!hasSufficientFunds && (
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Insufficient cash. Available: {formatINR(availableCash, { decimals: 2 })}</span>
          </div>
        )}

        {/* Submit Execution Button */}
        <button
          type="submit"
          disabled={!isValidQuantity || !hasSufficientFunds}
          className={`w-full py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            !isValidQuantity || !hasSufficientFunds
              ? "bg-[#182338] text-[#64748b] cursor-not-allowed border border-[#2b3a55]"
              : isBuy
              ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20"
              : "bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/20"
          }`}
        >
          {isBuy ? (
            <>
              <TrendingUp className="w-3.5 h-3.5" />
              <span>
                Buy {quantity} {asset.symbol} • {formatINR(totalCost, { decimals: 0 })}
              </span>
            </>
          ) : hasOpenLong ? (
            <>
              <TrendingDown className="w-3.5 h-3.5" />
              <span>
                Close Long {quantity} {asset.symbol} • {formatINR(totalCost, { decimals: 0 })}
              </span>
            </>
          ) : (
            <>
              <TrendingDown className="w-3.5 h-3.5" />
              <span>
                Sell Short {quantity} {asset.symbol} • {formatINR(totalCost, { decimals: 0 })}
              </span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
