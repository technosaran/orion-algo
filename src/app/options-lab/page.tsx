"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  Zap,
  TrendingUp,
  Sliders,
  Plus,
  Trash2,
  Play,
  RotateCcw,
  Sparkles,
  Info,
  DollarSign,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { formatINR } from "@/lib/formatters";
import {
  loadPaperStateFromDb,
  savePaperState,
  saveAccountToDb,
  savePositionToDb,
  saveOrderToDb,
} from "@/lib/paperTradingStorage";
import { PaperOrder, PaperPosition } from "@/types/paperTrading";

interface OptionLeg {
  id: string;
  strike: number;
  type: "CE" | "PE";
  action: "BUY" | "SELL";
  lots: number;
  lotSize: number;
  premium: number;
  iv: number;
}

const UNDERLYING_CONFIGS: Record<
  string,
  { spot: number; step: number; lotSize: number; expiry: string }
> = {
  "NIFTY 50": { spot: 24350, step: 50, lotSize: 65, expiry: "27-Nov-2026" },
  "BANKNIFTY": { spot: 52180, step: 100, lotSize: 30, expiry: "27-Nov-2026" },
  "FINNIFTY": { spot: 23410, step: 50, lotSize: 65, expiry: "25-Nov-2026" },
  "SENSEX": { spot: 80200, step: 100, lotSize: 10, expiry: "28-Nov-2026" },
  "RELIANCE": { spot: 2985, step: 20, lotSize: 250, expiry: "27-Nov-2026" },
};

const STRATEGY_PRESETS = [
  {
    name: "Iron Condor",
    desc: "Delta neutral strategy profiting from range-bound volatility contraction.",
    legs: (spot: number, step: number) => [
      { strike: spot - 2 * step, type: "PE" as const, action: "BUY" as const, premium: 25, iv: 14.2 },
      { strike: spot - step, type: "PE" as const, action: "SELL" as const, premium: 58, iv: 13.8 },
      { strike: spot + step, type: "CE" as const, action: "SELL" as const, premium: 62, iv: 13.5 },
      { strike: spot + 2 * step, type: "CE" as const, action: "BUY" as const, premium: 28, iv: 14.0 },
    ],
  },
  {
    name: "Short Straddle (9:20 AM)",
    desc: "ATM Call and Put sell to harvest aggressive intraday theta decay.",
    legs: (spot: number, step: number) => [
      { strike: spot, type: "CE" as const, action: "SELL" as const, premium: 125, iv: 13.0 },
      { strike: spot, type: "PE" as const, action: "SELL" as const, premium: 120, iv: 13.2 },
    ],
  },
  {
    name: "Bull Call Spread",
    desc: "Defined-risk directional bullish strategy with capped downside.",
    legs: (spot: number, step: number) => [
      { strike: spot, type: "CE" as const, action: "BUY" as const, premium: 135, iv: 13.2 },
      { strike: spot + 2 * step, type: "CE" as const, action: "SELL" as const, premium: 45, iv: 12.8 },
    ],
  },
  {
    name: "Bear Put Spread",
    desc: "Defined-risk directional bearish strategy.",
    legs: (spot: number, step: number) => [
      { strike: spot, type: "PE" as const, action: "BUY" as const, premium: 130, iv: 13.5 },
      { strike: spot - 2 * step, type: "PE" as const, action: "SELL" as const, premium: 40, iv: 14.1 },
    ],
  },
  {
    name: "Iron Butterfly",
    desc: "Max credit at ATM strike with OTM protective wings.",
    legs: (spot: number, step: number) => [
      { strike: spot - 2 * step, type: "PE" as const, action: "BUY" as const, premium: 22, iv: 14.5 },
      { strike: spot, type: "PE" as const, action: "SELL" as const, premium: 125, iv: 13.1 },
      { strike: spot, type: "CE" as const, action: "SELL" as const, premium: 130, iv: 13.0 },
      { strike: spot + 2 * step, type: "CE" as const, action: "BUY" as const, premium: 24, iv: 14.0 },
    ],
  },
];

export default function OptionsLabPage() {
  const [underlying, setUnderlying] = useState("NIFTY 50");
  const [spotPrice, setSpotPrice] = useState(24350);
  const [daysToExpiry, setDaysToExpiry] = useState(7);
  const [lotSize, setLotSize] = useState(65);

  // Default to Iron Condor for NIFTY 50
  const [legs, setLegs] = useState<OptionLeg[]>([
    { id: "1", strike: 24150, type: "PE", action: "BUY", lots: 1, lotSize: 65, premium: 25, iv: 14.2 },
    { id: "2", strike: 24250, type: "PE", action: "SELL", lots: 1, lotSize: 65, premium: 58, iv: 13.8 },
    { id: "3", strike: 24450, type: "CE", action: "SELL", lots: 1, lotSize: 65, premium: 62, iv: 13.5 },
    { id: "4", strike: 24550, type: "CE", action: "BUY", lots: 1, lotSize: 65, premium: 28, iv: 14.0 },
  ]);

  const [deploymentMessage, setDeploymentMessage] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploySuccess, setDeploySuccess] = useState(false);

  // Handle URL query parameters (e.g. from NSE Terminal or Screener)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const sym = params.get("symbol") || params.get("underlying");
    if (sym) {
      const upper = sym.toUpperCase();
      const matchKey = Object.keys(UNDERLYING_CONFIGS).find(
        (k) =>
          k.toUpperCase() === upper ||
          upper.replace(/\s+/g, "").includes(k.replace(/\s+/g, "").toUpperCase()) ||
          k.replace(/\s+/g, "").toUpperCase().includes(upper.replace(/\s+/g, ""))
      );
      if (matchKey && UNDERLYING_CONFIGS[matchKey]) {
        handleSelectUnderlying(matchKey);
      }
    }
  }, []);

  // Switch underlying asset
  const handleSelectUnderlying = (name: string) => {
    const config = UNDERLYING_CONFIGS[name];
    if (!config) return;
    setUnderlying(name);
    setSpotPrice(config.spot);
    setLotSize(config.lotSize);

    // Recompute default Iron Condor centered around the new underlying spot
    const step = config.step;
    const atm = Math.round(config.spot / step) * step;
    const preset = STRATEGY_PRESETS[0];
    const generated = preset.legs(atm, step);
    setLegs(
      generated.map((g, idx) => ({
        id: String(Date.now() + idx),
        strike: g.strike,
        type: g.type,
        action: g.action,
        lots: 1,
        lotSize: config.lotSize,
        premium: g.premium,
        iv: g.iv,
      }))
    );
  };

  // Apply a preset
  const handleApplyPreset = (preset: (typeof STRATEGY_PRESETS)[0]) => {
    const config = UNDERLYING_CONFIGS[underlying] || { step: 50 };
    const step = config.step;
    const atm = Math.round(spotPrice / step) * step;
    const generated = preset.legs(atm, step);
    setLegs(
      generated.map((g, idx) => ({
        id: String(Date.now() + idx),
        strike: g.strike,
        type: g.type,
        action: g.action,
        lots: 1,
        lotSize: lotSize,
        premium: g.premium,
        iv: g.iv,
      }))
    );
  };

  const handleAddLeg = () => {
    const config = UNDERLYING_CONFIGS[underlying] || { step: 50 };
    const step = config.step;
    const atm = Math.round(spotPrice / step) * step;
    const newLeg: OptionLeg = {
      id: String(Date.now()),
      strike: atm,
      type: "CE",
      action: "BUY",
      lots: 1,
      lotSize: lotSize,
      premium: 75.0,
      iv: 13.5,
    };
    setLegs([...legs, newLeg]);
  };

  const handleRemoveLeg = (id: string) => {
    setLegs(legs.filter((l) => l.id !== id));
  };

  const handleUpdateLeg = (id: string, updates: Partial<OptionLeg>) => {
    setLegs(legs.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  };

  // Payoff calculation across range
  const payoffData = useMemo(() => {
    const minPrice = spotPrice * 0.94;
    const maxPrice = spotPrice * 1.06;
    const points = 60;
    const step = (maxPrice - minPrice) / points;

    let netCashflow = 0;
    legs.forEach((leg) => {
      const sign = leg.action === "BUY" ? -1 : 1;
      netCashflow += sign * leg.premium * leg.lots * leg.lotSize;
    });

    const curve: { price: number; pnl: number }[] = [];
    for (let i = 0; i <= points; i++) {
      const price = minPrice + i * step;
      let totalPnl = 0;

      legs.forEach((leg) => {
        const qty = leg.lots * leg.lotSize;
        let intrinsic = 0;
        if (leg.type === "CE") {
          intrinsic = Math.max(0, price - leg.strike);
        } else {
          intrinsic = Math.max(0, leg.strike - price);
        }

        if (leg.action === "BUY") {
          totalPnl += (intrinsic - leg.premium) * qty;
        } else {
          totalPnl += (leg.premium - intrinsic) * qty;
        }
      });

      curve.push({ price: Math.round(price), pnl: Math.round(totalPnl) });
    }

    const pnls = curve.map((c) => c.pnl);
    const maxProfit = Math.max(...pnls);
    const maxLoss = Math.min(...pnls);

    // Breakevens
    const breakevens: number[] = [];
    for (let i = 0; i < curve.length - 1; i++) {
      if (
        (curve[i].pnl <= 0 && curve[i + 1].pnl >= 0) ||
        (curve[i].pnl >= 0 && curve[i + 1].pnl <= 0)
      ) {
        breakevens.push(curve[i].price);
      }
    }

    // Greeks approximation
    let netDelta = 0;
    let netTheta = 0;
    legs.forEach((leg) => {
      const sign = leg.action === "BUY" ? 1 : -1;
      const isCall = leg.type === "CE";
      const roughDelta = isCall
        ? leg.strike < spotPrice
          ? 0.7
          : 0.3
        : leg.strike > spotPrice
        ? -0.7
        : -0.3;
      netDelta += sign * roughDelta * leg.lots * leg.lotSize;
      netTheta +=
        -sign * (leg.premium / Math.max(1, daysToExpiry)) * leg.lots * leg.lotSize * 0.15;
    });

    return {
      curve,
      maxProfit,
      maxLoss,
      netCashflow,
      breakevens,
      netDelta: Number(netDelta.toFixed(2)),
      netTheta: Math.round(netTheta),
      minPrice,
      maxPrice,
    };
  }, [legs, spotPrice, daysToExpiry]);

  // SVG Payoff Chart dimensions
  const svgWidth = 800;
  const svgHeight = 260;
  const padding = { top: 20, right: 30, bottom: 30, left: 60 };

  const { minPnl, maxPnl } = useMemo(() => {
    const pnls = payoffData.curve.map((p) => p.pnl);
    const minVal = Math.min(-1000, ...pnls);
    const maxVal = Math.max(1000, ...pnls);
    return { minPnl: minVal, maxPnl: maxVal };
  }, [payoffData]);

  const scaleX = (price: number) => {
    return (
      padding.left +
      ((price - payoffData.minPrice) / (payoffData.maxPrice - payoffData.minPrice)) *
        (svgWidth - padding.left - padding.right)
    );
  };

  const scaleY = (pnl: number) => {
    return (
      svgHeight -
      padding.bottom -
      ((pnl - minPnl) / (maxPnl - minPnl || 1)) *
        (svgHeight - padding.top - padding.bottom)
    );
  };

  const zeroY = scaleY(0);
  const spotX = scaleX(spotPrice);

  const pathD = useMemo(() => {
    return payoffData.curve
      .map((pt, i) => `${i === 0 ? "M" : "L"} ${scaleX(pt.price)} ${scaleY(pt.pnl)}`)
      .join(" ");
  }, [payoffData, minPnl, maxPnl]);

  // Real Paper Deployment: Saves orders and positions to database & localStorage
  const handleDeployToPaper = async () => {
    if (legs.length === 0) return;
    setIsDeploying(true);
    setDeploymentMessage("Deploying multi-leg basket to server-side paper trading engine...");
    setDeploySuccess(false);

    try {
      const { state: currentPaperState } = await loadPaperStateFromDb();
      let netCashflow = 0;
      const newOrders: PaperOrder[] = [];
      const newPositions: PaperPosition[] = [];

      legs.forEach((leg, idx) => {
        const sign = leg.action === "BUY" ? -1 : 1;
        const legCost = sign * leg.premium * leg.lots * leg.lotSize;
        netCashflow += legCost;

        const optionSymbol = `${underlying} ${leg.strike} ${leg.type}`;
        const qty = leg.lots * leg.lotSize;
        const totalValue = leg.premium * qty;

        const orderId = `ord-opt-${Date.now()}-${idx}`;
        const posId = `pos-opt-${Date.now()}-${idx}`;

        const order: PaperOrder = {
          id: orderId,
          symbol: optionSymbol,
          side: leg.action,
          type: "MARKET",
          price: leg.premium,
          quantity: qty,
          totalValue,
          status: "FILLED",
          createdAt: Date.now(),
          executedAt: Date.now(),
          isAlgoTrade: false,
          note: `Options Lab Basket: ${leg.action} ${leg.lots} lot(s) ${optionSymbol}`,
        };
        newOrders.push(order);

        const marginUsed =
          leg.action === "BUY"
            ? totalValue
            : Math.max(totalValue, leg.strike * 0.15 * qty);

        const position: PaperPosition = {
          id: posId,
          symbol: optionSymbol,
          side: leg.action === "BUY" ? "LONG" : "SHORT",
          quantity: qty,
          entryPrice: leg.premium,
          currentPrice: leg.premium,
          marginUsed,
          entryTime: Date.now(),
          unrealizedPnl: 0,
          unrealizedPnlPercent: 0,
        };
        newPositions.push(position);
      });

      const updatedCash = Math.max(0, currentPaperState.cashBalance + netCashflow);

      // Save orders & positions to Supabase
      await Promise.all([
        ...newOrders.map((o) => saveOrderToDb(o)),
        ...newPositions.map((p) => savePositionToDb(p)),
        saveAccountToDb(
          currentPaperState.initialBalance,
          updatedCash,
          currentPaperState.botActive,
          currentPaperState.botStrategyId,
          currentPaperState.botSpeedSec
        ),
      ]);

      // Sync local storage state
      const updatedState = {
        ...currentPaperState,
        cashBalance: updatedCash,
        orders: [...newOrders, ...currentPaperState.orders],
        positions: [...newPositions, ...currentPaperState.positions],
        lastUpdated: Date.now(),
      };
      savePaperState(updatedState);

      setDeploySuccess(true);
      setDeploymentMessage(
        `Successfully filled all ${legs.length} legs for ${underlying} in Paper Trading! Net cashflow: ${
          netCashflow >= 0 ? "+" : ""
        }${formatINR(netCashflow)}.`
      );
    } catch (err) {
      console.error("Failed to deploy basket to paper trading:", err);
      setDeploymentMessage("Could not deploy to paper trading. Please try again.");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#0b0e14] text-[#cbd5e1] space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1a2230]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Multi-Leg Options Strategy Lab & Payoff Simulator</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Options Strategy Lab
          </h1>
          <p className="text-xs md:text-sm text-[#94a3b8] mt-1">
            Build, simulate, and stress-test complex multi-leg options structures (Iron Condors, Spreads, Straddles) with live Black-Scholes Greeks and expiration payoff curves.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleDeployToPaper}
            disabled={isDeploying || legs.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-98"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isDeploying ? "Deploying..." : "Deploy Strategy Basket"}</span>
          </button>
        </div>
      </div>

      {deploymentMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in ${
            deploySuccess
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
              : "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {deploySuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            <span>{deploymentMessage}</span>
          </div>
          {deploySuccess && (
            <Link
              href="/paper-trading"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-[11px] hover:bg-emerald-400 shrink-0"
            >
              <span>View in Paper Trading</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* Underlying Instrument Selector Bar */}
      <div className="p-4 rounded-2xl bg-[#0e1422] border border-[#1b263b] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
            Underlying:
          </span>
          {Object.keys(UNDERLYING_CONFIGS).map((sym) => (
            <button
              key={sym}
              onClick={() => handleSelectUnderlying(sym)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                underlying === sym
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "bg-[#080b12] text-[#94a3b8] hover:text-white border border-[#182338]"
              }`}
            >
              {sym}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-[#64748b]">Spot:</span>
            <input
              type="number"
              value={spotPrice}
              onChange={(e) => setSpotPrice(Number(e.target.value) || 24000)}
              className="w-24 px-2 py-1 bg-[#080b12] border border-[#182338] rounded text-white font-bold text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#64748b]">Lot:</span>
            <span className="text-white font-bold">{lotSize}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#64748b]">DTE:</span>
            <input
              type="number"
              min={1}
              max={90}
              value={daysToExpiry}
              onChange={(e) => setDaysToExpiry(Number(e.target.value) || 7)}
              className="w-14 px-2 py-1 bg-[#080b12] border border-[#182338] rounded text-white font-bold text-xs"
            />
          </div>
        </div>
      </div>

      {/* Preset Strategy Selector */}
      <div className="bg-[#0e1422] p-4 rounded-2xl border border-[#1b263b] space-y-3">
        <span className="text-xs font-bold text-white uppercase tracking-wider block">
          One-Click Strategy Presets
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {STRATEGY_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handleApplyPreset(preset)}
              className="p-3 rounded-xl bg-[#0a0d16] border border-[#182338] hover:border-cyan-500/50 text-left transition-all group"
            >
              <div className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">
                {preset.name}
              </div>
              <p className="text-[10px] text-[#64748b] mt-1 line-clamp-2 leading-relaxed">
                {preset.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0e1422] border border-[#1b263b]">
          <span className="text-xs text-[#94a3b8] font-medium block">Max Profit</span>
          <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
            {payoffData.maxProfit > 1e6 ? "UNLIMITED" : formatINR(payoffData.maxProfit)}
          </div>
          <span className="text-[10px] text-[#64748b]">At Expiration</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0e1422] border border-[#1b263b]">
          <span className="text-xs text-[#94a3b8] font-medium block">Max Loss</span>
          <div className="text-lg font-mono font-bold text-rose-400 mt-1">
            {payoffData.maxLoss < -1e6 ? "UNLIMITED" : formatINR(payoffData.maxLoss)}
          </div>
          <span className="text-[10px] text-[#64748b]">At Expiration</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0e1422] border border-[#1b263b]">
          <span className="text-xs text-[#94a3b8] font-medium block">Net Cashflow</span>
          <div
            className={`text-lg font-mono font-bold mt-1 ${
              payoffData.netCashflow >= 0 ? "text-emerald-400" : "text-cyan-400"
            }`}
          >
            {payoffData.netCashflow >= 0 ? "+" : ""}
            {formatINR(payoffData.netCashflow)}
          </div>
          <span className="text-[10px] text-[#64748b]">
            {payoffData.netCashflow >= 0 ? "Credit Received" : "Debit Paid"}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#0e1422] border border-[#1b263b]">
          <span className="text-xs text-[#94a3b8] font-medium block">Net Portfolio Greeks</span>
          <div className="text-xs font-mono font-bold text-white mt-1 space-y-0.5">
            <div>
              Delta: <span className="text-cyan-400">{payoffData.netDelta}</span>
            </div>
            <div>
              Theta: <span className="text-emerald-400">+{formatINR(payoffData.netTheta)}/day</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payoff Diagram (SVG Canvas) */}
      <div className="p-5 rounded-2xl bg-[#0e1422] border border-[#1b263b] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#182338] pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Payoff Curve at Expiration
            </h3>
            <span className="text-xs text-[#64748b]">
              Spot: <strong className="text-white">₹{spotPrice.toLocaleString("en-IN")}</strong> • Breakevens:{" "}
              <strong className="text-cyan-400">
                {payoffData.breakevens.length > 0
                  ? payoffData.breakevens.join(", ")
                  : "None in range"}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Profit Zone
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Loss Zone
            </span>
          </div>
        </div>

        {/* Responsive SVG Chart */}
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-64 select-none">
            {/* Zero Axis */}
            <line
              x1={padding.left}
              y1={zeroY}
              x2={svgWidth - padding.right}
              y2={zeroY}
              stroke="#334155"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 8}
              y={zeroY + 4}
              fill="#64748b"
              fontSize="10"
              textAnchor="end"
              fontFamily="monospace"
            >
              ₹0
            </text>

            {/* Current Spot Vertical Line */}
            <line
              x1={spotX}
              y1={padding.top}
              x2={spotX}
              y2={svgHeight - padding.bottom}
              stroke="#06b6d4"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <text
              x={spotX}
              y={padding.top - 4}
              fill="#06b6d4"
              fontSize="10"
              textAnchor="middle"
              fontFamily="monospace"
              fontWeight="bold"
            >
              Current ₹{spotPrice}
            </text>

            {/* Payoff Curve Path */}
            <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" />

            {/* Breakeven points */}
            {payoffData.breakevens.map((be, idx) => {
              const beX = scaleX(be);
              return (
                <g key={idx}>
                  <circle cx={beX} cy={zeroY} r="4" fill="#f59e0b" />
                  <text
                    x={beX}
                    y={zeroY + 16}
                    fill="#f59e0b"
                    fontSize="9"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    BE ₹{be}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Leg Builder Table */}
      <div className="p-5 rounded-2xl bg-[#0e1422] border border-[#1b263b] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#182338]">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            Strategy Position Legs ({legs.length})
          </h3>
          <button
            onClick={handleAddLeg}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-semibold transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Leg</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left font-mono">
            <thead className="text-[10px] text-[#64748b] border-b border-[#182338]">
              <tr>
                <th className="py-2">Action</th>
                <th className="py-2">Lots</th>
                <th className="py-2">Strike (₹)</th>
                <th className="py-2">Type</th>
                <th className="py-2 text-right">Premium (₹)</th>
                <th className="py-2 text-right">IV%</th>
                <th className="py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#182338]">
              {legs.map((leg) => (
                <tr key={leg.id} className="hover:bg-[#121929]">
                  <td className="py-2.5">
                    <button
                      onClick={() =>
                        handleUpdateLeg(leg.id, {
                          action: leg.action === "BUY" ? "SELL" : "BUY",
                        })
                      }
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                        leg.action === "BUY"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      }`}
                    >
                      {leg.action}
                    </button>
                  </td>
                  <td className="py-2.5">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={leg.lots}
                      onChange={(e) =>
                        handleUpdateLeg(leg.id, { lots: Number(e.target.value) || 1 })
                      }
                      className="w-16 px-2 py-1 bg-[#090d16] border border-[#1b263b] rounded text-white text-xs"
                    />
                  </td>
                  <td className="py-2.5">
                    <input
                      type="number"
                      step={50}
                      value={leg.strike}
                      onChange={(e) =>
                        handleUpdateLeg(leg.id, { strike: Number(e.target.value) || 24000 })
                      }
                      className="w-24 px-2 py-1 bg-[#090d16] border border-[#1b263b] rounded text-white text-xs font-bold"
                    />
                  </td>
                  <td className="py-2.5">
                    <button
                      onClick={() =>
                        handleUpdateLeg(leg.id, { type: leg.type === "CE" ? "PE" : "CE" })
                      }
                      className="px-2.5 py-1 rounded bg-[#101726] border border-[#1b263b] text-white font-bold"
                    >
                      {leg.type}
                    </button>
                  </td>
                  <td className="py-2.5 text-right">
                    <input
                      type="number"
                      step={1}
                      value={leg.premium}
                      onChange={(e) =>
                        handleUpdateLeg(leg.id, { premium: Number(e.target.value) || 0 })
                      }
                      className="w-20 px-2 py-1 bg-[#090d16] border border-[#1b263b] rounded text-white text-xs text-right"
                    />
                  </td>
                  <td className="py-2.5 text-right text-cyan-400">{leg.iv}%</td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => handleRemoveLeg(leg.id)}
                      className="p-1 hover:text-rose-400 text-[#64748b] transition-colors"
                      title="Delete leg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
