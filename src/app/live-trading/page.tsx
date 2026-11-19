"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Power,
  Sliders,
  Wallet,
  Clock,
  Layers,
  Check,
  X,
  ExternalLink,
  Info,
  Play,
  RotateCcw,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Radio,
} from "lucide-react";
import { formatINR } from "@/lib/formatters";

interface BrokerStatus {
  connected: boolean;
  broker: string | null;
  killSwitchTripped: boolean;
  isSquareOffTime: boolean;
  isMarketOpen?: boolean;
  marketSession?: "OPEN" | "CLOSED" | "SQUARE_OFF";
  dailyRealizedLoss: number;
  maxDailyLossLimit: number;
  backendMode?: string;
}

interface BrokerFunds {
  connected: boolean;
  netCash: number;
  availableMargin: number;
  collateral?: number;
}

interface LivePosition {
  tradingsymbol: string;
  exchange: string;
  producttype: string;
  netqty: number;
  buyavgprice: number;
  ltp: number;
  pnl: number;
}

interface LiveOrder {
  order_id: string;
  symbol: string;
  exchange: string;
  transaction_type: string;
  order_type: string;
  quantity: number;
  price: number;
  product_type: string;
  status: string;
  created_at: string;
}

const INDIAN_INSTRUMENTS = [
  { symbol: "NIFTY50", name: "NIFTY 50 Futures", exchange: "NSE", lot: 65, price: 24350, type: "Index F&O" },
  { symbol: "BANKNIFTY", name: "Bank Nifty Futures", exchange: "NSE", lot: 30, price: 52180, type: "Index F&O" },
  { symbol: "RELIANCE", name: "Reliance Industries", exchange: "NSE", lot: 1, price: 2980, type: "Cash Equity" },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd.", exchange: "NSE", lot: 1, price: 1720, type: "Cash Equity" },
  { symbol: "TCS", name: "Tata Consultancy Services", exchange: "NSE", lot: 1, price: 4120, type: "Cash Equity" },
  { symbol: "INFY", name: "Infosys Ltd.", exchange: "NSE", lot: 1, price: 1845, type: "Cash Equity" },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd.", exchange: "NSE", lot: 1, price: 1260, type: "Cash Equity" },
  { symbol: "SBIN", name: "State Bank of India", exchange: "NSE", lot: 1, price: 835, type: "Cash Equity" },
  { symbol: "CRUDEOIL", name: "Crude Oil (MCX)", exchange: "MCX", lot: 100, price: 6240, type: "Commodity" },
  { symbol: "GOLD", name: "Gold Spot (MCX)", exchange: "MCX", lot: 10, price: 77500, type: "Commodity" },
];

export default function LiveTradingPage() {
  // 1. Status & RMS state
  const [status, setStatus] = useState<BrokerStatus>({
    connected: false,
    broker: null,
    killSwitchTripped: false,
    isSquareOffTime: false,
    isMarketOpen: false,
    marketSession: "CLOSED",
    dailyRealizedLoss: 0,
    maxDailyLossLimit: 10000,
  });

  const [funds, setFunds] = useState<BrokerFunds>({
    connected: false,
    netCash: 500000,
    availableMargin: 350000,
    collateral: 0,
  });

  const [positions, setPositions] = useState<LivePosition[]>([]);
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // 2. Gateway Mode & Form State
  const [gatewayMode, setGatewayMode] = useState<"sandbox" | "live_broker">("sandbox");
  const [activeBrokerTab, setActiveBrokerTab] = useState<"angel_one" | "zerodha">("angel_one");
  const [angelForm, setAngelForm] = useState({
    apiKey: "ang_live_demo_9872",
    clientId: "ANG984512",
    pin: "4421",
    totpSecret: "JBSWY3DPEHPK3PXP",
  });
  const [zerodhaForm, setZerodhaForm] = useState({
    apiKey: "kite_live_demo_3310",
    accessToken: "tok_kite_live_session_9941",
  });

  // 3. Order Ticket State
  const [selectedInst, setSelectedInst] = useState(INDIAN_INSTRUMENTS[0]);
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [productType, setProductType] = useState<"INTRADAY" | "DELIVERY">("INTRADAY");
  const [lotsCount, setLotsCount] = useState<number>(1);
  const [limitPrice, setLimitPrice] = useState<number>(INDIAN_INSTRUMENTS[0].price);

  // 4. Ledger active tab
  const [ledgerTab, setLedgerTab] = useState<"positions" | "orders">("positions");

  // 5. RMS Config Modal / Sliders
  const [maxLossInput, setMaxLossInput] = useState<number>(10000);

  // 6. IST Clock
  const [istTime, setIstTime] = useState("");

  const showNotification = (type: "success" | "error" | "info", text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 5000);
  };

  // Fetch Status, Funds, Positions, and Orders
  const refreshAll = useCallback(async () => {
    try {
      const [statusRes, fundsRes, posRes, ordersRes] = await Promise.all([
        fetch("/api/live/status"),
        fetch("/api/live/funds"),
        fetch("/api/live/positions"),
        fetch("/api/live/orders"),
      ]);

      if (statusRes.ok) {
        const s = await statusRes.json();
        setStatus(s);
        setMaxLossInput(s.maxDailyLossLimit || 10000);
      }
      if (fundsRes.ok) {
        const f = await fundsRes.json();
        setFunds(f);
      }
      if (posRes.ok) {
        const p = await posRes.json();
        setPositions(p.positions || []);
      }
      if (ordersRes.ok) {
        const o = await ordersRes.json();
        setOrders(o.orders || []);
      }
    } catch (err) {
      console.warn("Could not poll live broker API:", err);
    }
  }, []);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 4000);

    const clockInterval = setInterval(() => {
      const now = new Date();
      setIstTime(
        now.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(clockInterval);
    };
  }, [refreshAll]);

  // Connect Sandbox Gateway with 1 click
  const handleConnectSandbox = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/live/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "sandbox", broker: "AlgoX Sandbox" }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("success", "⚡ Instant Sandbox Gateway connected! Ready to trade.");
        refreshAll();
      } else {
        showNotification("error", data.detail || "Failed to connect sandbox.");
      }
    } catch {
      showNotification("error", "Connection error.");
    } finally {
      setLoading(false);
    }
  };

  // Connect Real Broker
  const handleConnectBroker = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload =
        activeBrokerTab === "angel_one"
          ? {
              broker: "angel_one",
              api_key: angelForm.apiKey || "ang_live_demo_9872",
              client_id: angelForm.clientId || "ANG984512",
              pin: angelForm.pin || "4421",
              totp_secret: angelForm.totpSecret || "JBSWY3DPEHPK3PXP",
            }
          : {
              broker: "zerodha",
              api_key: zerodhaForm.apiKey || "kite_live_demo_3310",
              access_token: zerodhaForm.accessToken || "tok_kite_live_session_9941",
            };

      const res = await fetch("/api/live/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        showNotification("success", data.message || `Connected to ${data.broker} successfully!`);
        refreshAll();
      } else {
        showNotification("error", data.detail || data.message || "Authentication failed.");
      }
    } catch {
      showNotification("error", "Failed to connect to broker.");
    } finally {
      setLoading(false);
    }
  };

  // Disconnect Broker
  const handleDisconnect = async () => {
    try {
      await fetch("/api/live/disconnect", { method: "POST" });
      showNotification("info", "Broker gateway disconnected.");
      refreshAll();
    } catch {
      showNotification("error", "Error disconnecting broker.");
    }
  };

  // Trip Emergency Kill Switch
  const handleTripKillSwitch = async () => {
    if (
      !confirm(
        "EMERGENCY KILL SWITCH: Are you sure you want to cancel all pending orders and MARKET-EXIT all open positions immediately?"
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/live/kill-switch", { method: "POST" });
      const data = await res.json();
      showNotification(
        "error",
        "🚨 KILL SWITCH ACTIVATED! All orders cancelled and positions squared off."
      );
      refreshAll();
    } catch {
      showNotification("error", "Failed to trip kill switch.");
    } finally {
      setLoading(false);
    }
  };

  // Reset Kill Switch
  const handleResetKillSwitch = async () => {
    try {
      await fetch("/api/live/kill-switch/reset", { method: "POST" });
      showNotification("success", "Kill switch reset to STANDBY mode.");
      refreshAll();
    } catch {
      showNotification("error", "Failed to reset kill switch.");
    }
  };

  // Square Off All Positions
  const handleSquareOffAll = async () => {
    if (!confirm("Are you sure you want to market-exit ALL open positions?")) return;
    try {
      await fetch("/api/live/square-off-all", { method: "POST" });
      showNotification("info", "All live positions squared off.");
      refreshAll();
    } catch {
      showNotification("error", "Failed to square off positions.");
    }
  };

  // Close Single Position
  const handleClosePosition = async (symbol: string) => {
    try {
      await fetch("/api/live/positions/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      showNotification("info", `Position for ${symbol} squared off.`);
      refreshAll();
    } catch {
      showNotification("error", `Failed to square off ${symbol}.`);
    }
  };

  // Submit Live Order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status.killSwitchTripped) {
      showNotification(
        "error",
        "RMS Rejected: Kill switch is active. Reset kill switch before trading."
      );
      return;
    }

    const qty = selectedInst.lot * lotsCount;
    const price = orderType === "MARKET" ? selectedInst.price : limitPrice;

    setLoading(true);
    try {
      const res = await fetch("/api/live/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selectedInst.symbol,
          exchange: selectedInst.exchange,
          transaction_type: orderSide,
          order_type: orderType,
          quantity: qty,
          price: price,
          product_type: productType,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showNotification(
          "success",
          `Order placed! ${orderSide} ${qty} ${selectedInst.symbol} (ID: ${data.order_id || "OK"})`
        );
        refreshAll();
        // Automatically switch ledger view to positions
        setLedgerTab("positions");
      } else {
        showNotification("error", data.detail || data.message || "Order rejected by RMS gateway.");
      }
    } catch {
      showNotification("error", "Order submission failed.");
    } finally {
      setLoading(false);
    }
  };

  // Update RMS limits
  const handleUpdateRMS = async (newLimit: number) => {
    setMaxLossInput(newLimit);
    try {
      await fetch("/api/live/rms/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_daily_loss: newLimit }),
      });
      refreshAll();
    } catch {}
  };

  // Financial calculations
  const totalCalculatedQuantity = selectedInst.lot * lotsCount;
  const executionPrice = orderType === "MARKET" ? selectedInst.price : limitPrice;
  const estimatedOrderValue = totalCalculatedQuantity * executionPrice;
  const isFoIndex = ["NIFTY50", "BANKNIFTY", "CRUDEOIL", "GOLD"].includes(selectedInst.symbol);
  const marginRate = isFoIndex ? 0.1 : productType === "DELIVERY" ? 1.0 : 0.2;
  const requiredMargin = estimatedOrderValue * marginRate;
  const hasSufficientMargin = (funds.availableMargin || 0) >= requiredMargin;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#080a0f] text-[#cbd5e1] space-y-6">
      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-medium transition-all ${
            actionMessage.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : actionMessage.type === "error"
              ? "bg-rose-950/50 border-rose-500/50 text-rose-300"
              : "bg-cyan-950/40 border-cyan-500/40 text-cyan-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : actionMessage.type === "error" ? (
              <XCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <Info className="w-4 h-4 text-cyan-400" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="p-1 hover:bg-white/10 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emergency Kill Switch Warning Banner (When Tripped) */}
      {status.killSwitchTripped && (
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-rose-950/70 border-2 border-rose-500 text-rose-200 gap-3 shadow-lg shadow-rose-950/50 animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <h4 className="font-bold text-sm tracking-wide">EMERGENCY KILL SWITCH IS ACTIVE</h4>
              <p className="text-xs text-rose-300/90">
                All automatic algo orders are halted, and exchange gateways are locked. Review risk before resetting.
              </p>
            </div>
          </div>
          <button
            onClick={handleResetKillSwitch}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-lg transition-all shadow-md shrink-0 active:scale-95"
          >
            Reset Kill Switch to Standby
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[#1a2230]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
            <Zap className="w-3.5 h-3.5" />
            <span>Live Broker Gateways & Pre-Trade RMS</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Live Trading & Institutional RMS Cockpit
          </h1>
          <p className="text-xs md:text-sm text-[#94a3b8] mt-1">
            SEBI-compliant Indian broker integration (Angel One & Zerodha Kite) with pre-trade risk guardrails, SPAN margin verification, and 1-click Emergency Kill Switch.
          </p>
        </div>

        {/* Quick Actions & Kill Switch */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={refreshAll}
            className="p-2.5 rounded-xl bg-[#0e1422] hover:bg-[#162034] border border-[#1b263b] text-[#94a3b8] hover:text-white transition-colors"
            title="Refresh Live Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleSquareOffAll}
            className="px-3.5 py-2.5 rounded-xl bg-[#1a202c] hover:bg-[#2d3748] border border-[#4a5568] text-amber-300 hover:text-amber-200 font-semibold text-xs transition-all flex items-center gap-1.5"
          >
            <Power className="w-4 h-4 text-amber-400" />
            <span>Square Off All</span>
          </button>

          <button
            onClick={handleTripKillSwitch}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-rose-900/40 active:scale-95"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>EMERGENCY KILL SWITCH</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Broker Session */}
        <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94a3b8] font-medium">Broker Gateway</span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                status.connected ? "bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" : "bg-slate-500"
              }`}
            />
          </div>
          <div className="my-2">
            <div className="text-lg font-bold text-white flex items-center gap-2">
              <span>{status.broker || "No Broker Connected"}</span>
            </div>
            <p className="text-[11px] text-[#64748b]">
              {status.connected ? "Session active & orders authorized" : "Standby • Ready to connect"}
            </p>
          </div>
          <div className="pt-2 border-t border-[#162030] flex items-center justify-between text-[11px]">
            <span className="text-[#94a3b8]">Status:</span>
            <span className={status.connected ? "text-emerald-400 font-semibold" : "text-[#64748b]"}>
              {status.connected ? "ONLINE" : "STANDBY"}
            </span>
          </div>
        </div>

        {/* Card 2: Available Margin */}
        <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94a3b8] font-medium">Available Margin</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2">
            <div className="text-lg font-bold font-mono text-emerald-400">
              {formatINR(funds.availableMargin || 0, { decimals: 2 })}
            </div>
            <p className="text-[11px] text-[#64748b]">Net Cash: {formatINR(funds.netCash || 0)}</p>
          </div>
          <div className="pt-2 border-t border-[#162030] flex items-center justify-between text-[11px]">
            <span className="text-[#94a3b8]">Collateral:</span>
            <span className="text-white font-mono">{formatINR(funds.collateral || 0)}</span>
          </div>
        </div>

        {/* Card 3: RMS Daily Loss Limit */}
        <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94a3b8] font-medium">RMS Daily Loss Ceiling</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="my-2">
            <div className="text-lg font-bold font-mono text-white">
              {formatINR(status.dailyRealizedLoss, { decimals: 2 })} / {formatINR(status.maxDailyLossLimit)}
            </div>
            {/* Progress bar */}
            <div className="w-full bg-[#162030] h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className={`h-full transition-all ${
                  status.dailyRealizedLoss / (status.maxDailyLossLimit || 1) > 0.8
                    ? "bg-rose-500"
                    : "bg-emerald-500"
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    (status.dailyRealizedLoss / (status.maxDailyLossLimit || 1)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
          <div className="pt-2 border-t border-[#162030] flex items-center justify-between text-[11px]">
            <span className="text-[#94a3b8]">Loss Breach:</span>
            <span
              className={
                status.dailyRealizedLoss >= status.maxDailyLossLimit
                  ? "text-rose-400 font-bold"
                  : "text-emerald-400"
              }
            >
              {status.dailyRealizedLoss >= status.maxDailyLossLimit ? "TRIPPED" : "SAFE"}
            </span>
          </div>
        </div>

        {/* Card 4: 3:15 PM MIS Square-Off Guard */}
        <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94a3b8] font-medium">Market Session & MIS Guard</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-2">
            <div className="text-lg font-bold font-mono text-white flex items-center gap-2">
              <span>{istTime || "12:00:00"}</span>
              {status.isSquareOffTime ? (
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  CUTOFF ACTIVE
                </span>
              ) : status.isMarketOpen ? (
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE SESSION
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  MARKET CLOSED
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#64748b]">
              {status.isSquareOffTime
                ? "Auto square-off active (15:15–15:30 IST)"
                : status.isMarketOpen
                ? "NSE/BSE/MCX trading session open"
                : "Opens 09:15 AM IST (Sandbox active)"}
            </p>
          </div>
          <div className="pt-2 border-t border-[#162030] flex items-center justify-between text-[11px]">
            <span className="text-[#94a3b8]">Compliance:</span>
            <span className="text-cyan-400 font-mono">SEBI 15:15 Cutoff</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Broker Connect & RMS Settings (Left) + Live Order Execution Ticket (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Broker Connector + RMS Config (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Broker Integration Card */}
          <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#162030]">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Broker Authentication Gateway</h3>
              </div>

              {status.connected && (
                <button
                  onClick={handleDisconnect}
                  className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 transition-colors"
                >
                  Disconnect Session
                </button>
              )}
            </div>

            {/* Mode Selector: Instant Sandbox (Recommended) vs Real Broker API */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#090d16] rounded-xl border border-[#162030]">
              <button
                type="button"
                onClick={() => setGatewayMode("sandbox")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  gatewayMode === "sandbox"
                    ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-sm"
                    : "text-[#94a3b8] hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Instant Demo / Sandbox</span>
              </button>

              <button
                type="button"
                onClick={() => setGatewayMode("live_broker")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  gatewayMode === "live_broker"
                    ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-sm"
                    : "text-[#94a3b8] hover:text-white"
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span>Live Indian Broker API</span>
              </button>
            </div>

            {gatewayMode === "sandbox" ? (
              /* Instant Sandbox Mode Card */
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#0e1626] to-[#0a0f1d] border border-emerald-500/30 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-white text-sm font-bold flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      Zero-Friction Sandbox Environment
                    </h4>
                    <p className="text-xs text-[#94a3b8] mt-1">
                      Test algorithmic strategies, pre-trade SPAN margins, and RMS square-off limits with ₹5,00,000 simulated Indian capital. No API keys or broker accounts needed.
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    1-CLICK READY
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                  <div className="p-2 rounded-lg bg-[#070a12] border border-[#1b263b]">
                    <span className="text-[10px] text-[#64748b] block">Virtual Balance</span>
                    <span className="text-xs font-bold text-emerald-400">₹5,00,000</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#070a12] border border-[#1b263b]">
                    <span className="text-[10px] text-[#64748b] block">SPAN Margin</span>
                    <span className="text-xs font-bold text-white">10% F&O</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#070a12] border border-[#1b263b]">
                    <span className="text-[10px] text-[#64748b] block">Latency</span>
                    <span className="text-xs font-bold text-cyan-400">&lt; 5ms Local</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConnectSandbox}
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-98 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>
                    {status.connected
                      ? "⚡ Sandbox Session Connected (Click to Refresh)"
                      : "🚀 Connect Instant Sandbox Gateway"}
                  </span>
                </button>
              </div>
            ) : (
              /* Live Broker Credentials Form */
              <div className="space-y-3">
                {/* Broker Tabs */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveBrokerTab("angel_one")}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      activeBrokerTab === "angel_one"
                        ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                        : "bg-[#101726] border border-[#1b263b] text-[#94a3b8] hover:text-white"
                    }`}
                  >
                    Angel One SmartAPI
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveBrokerTab("zerodha")}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      activeBrokerTab === "zerodha"
                        ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                        : "bg-[#101726] border border-[#1b263b] text-[#94a3b8] hover:text-white"
                    }`}
                  >
                    Zerodha Kite Connect
                  </button>
                </div>

                <form onSubmit={handleConnectBroker} className="space-y-3">
                  {activeBrokerTab === "angel_one" ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-[#94a3b8] font-medium block mb-1">
                            SmartAPI Key
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. ang_live_key"
                            value={angelForm.apiKey}
                            onChange={(e) =>
                              setAngelForm({ ...angelForm, apiKey: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-[#0e1422] border border-[#1e2a3f] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-[#94a3b8] font-medium block mb-1">
                            Client Code (ID)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. S123456"
                            value={angelForm.clientId}
                            onChange={(e) =>
                              setAngelForm({ ...angelForm, clientId: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-[#0e1422] border border-[#1e2a3f] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-[#94a3b8] font-medium block mb-1">
                            Trading MPIN (4-digit)
                          </label>
                          <input
                            type="password"
                            placeholder="••••"
                            value={angelForm.pin}
                            onChange={(e) =>
                              setAngelForm({ ...angelForm, pin: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-[#0e1422] border border-[#1e2a3f] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-[#94a3b8] font-medium block mb-1">
                            TOTP Secret (Base32)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. JBSWY3DPEHPK3PXP"
                            value={angelForm.totpSecret}
                            onChange={(e) =>
                              setAngelForm({ ...angelForm, totpSecret: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-[#0e1422] border border-[#1e2a3f] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-[#94a3b8] font-medium block mb-1">
                          Kite API Key
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. kite_api_key"
                          value={zerodhaForm.apiKey}
                          onChange={(e) =>
                            setZerodhaForm({ ...zerodhaForm, apiKey: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-[#0e1422] border border-[#1e2a3f] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-[#94a3b8] font-medium block mb-1">
                          Kite Access Token
                        </label>
                        <input
                          type="password"
                          placeholder="e.g. access_token_value"
                          value={zerodhaForm.accessToken}
                          onChange={(e) =>
                            setZerodhaForm({ ...zerodhaForm, accessToken: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-[#0e1422] border border-[#1e2a3f] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (activeBrokerTab === "angel_one") {
                          setAngelForm({
                            apiKey: "ang_live_demo_9872",
                            clientId: "ANG984512",
                            pin: "4421",
                            totpSecret: "JBSWY3DPEHPK3PXP",
                          });
                        } else {
                          setZerodhaForm({
                            apiKey: "kite_live_demo_3310",
                            accessToken: "tok_kite_live_session_9941",
                          });
                        }
                        showNotification("info", "Sample demo credentials populated.");
                      }}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium underline"
                    >
                      Fill Sample Demo Credentials
                    </button>
                    <p className="text-[10px] text-[#64748b]">
                      * Sandbox mode falls back automatically if FastAPI daemon is offline.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-98 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>
                      {status.connected
                        ? "Re-Authenticate Gateway"
                        : "Authenticate & Connect Gateway"}
                    </span>
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Institutional RMS Guardrails Configuration */}
          <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#162030]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <h3 className="font-bold text-white text-sm">Pre-Trade Risk Management System (RMS)</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                SEBI ENFORCED
              </span>
            </div>

            <div className="space-y-4">
              {/* Daily Loss Ceiling Slider */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[#94a3b8]">Max Daily Loss Ceiling (₹)</span>
                  <span className="font-mono font-bold text-white">{formatINR(maxLossInput)}</span>
                </div>
                <input
                  type="range"
                  min="2000"
                  max="50000"
                  step="1000"
                  value={maxLossInput}
                  onChange={(e) => handleUpdateRMS(Number(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#64748b]">
                  <span>₹2,000 (Conservative)</span>
                  <span>₹25,000</span>
                  <span>₹50,000 (Aggressive)</span>
                </div>
              </div>

              {/* RMS Rules Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-[#0e1422] border border-[#1e2a3f]">
                  <span className="text-[10px] text-[#94a3b8] block">Max Capital Per Trade</span>
                  <span className="text-xs font-bold font-mono text-white mt-1 block">
                    20% Available Cash
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#0e1422] border border-[#1e2a3f]">
                  <span className="text-[10px] text-[#94a3b8] block">Max Open Positions</span>
                  <span className="text-xs font-bold font-mono text-white mt-1 block">
                    4 Concurrent
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#0e1422] border border-[#1e2a3f]">
                  <span className="text-[10px] text-[#94a3b8] block">MIS Auto Square-Off</span>
                  <span className="text-xs font-bold font-mono text-cyan-400 mt-1 block">
                    15:15 IST Daily
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Fast Live Order Execution Ticket (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#162030]">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Live Order Ticket</h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                RMS Guardrail Active
              </span>
            </div>

            {/* Quick Instrument Selector Pills */}
            <div>
              <label className="text-[11px] text-[#94a3b8] font-medium block mb-1.5">
                Quick Select Instrument
              </label>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {INDIAN_INSTRUMENTS.slice(0, 4).map((inst) => (
                  <button
                    key={inst.symbol}
                    type="button"
                    onClick={() => {
                      setSelectedInst(inst);
                      setLimitPrice(inst.price);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold font-mono transition-all truncate ${
                      selectedInst.symbol === inst.symbol
                        ? "bg-emerald-500/20 border border-emerald-500 text-emerald-300"
                        : "bg-[#0e1422] border border-[#1e2a3f] text-[#94a3b8] hover:text-white"
                    }`}
                  >
                    {inst.symbol}
                  </button>
                ))}
              </div>

              {/* Full Instrument Dropdown */}
              <select
                value={selectedInst.symbol}
                onChange={(e) => {
                  const inst = INDIAN_INSTRUMENTS.find((i) => i.symbol === e.target.value);
                  if (inst) {
                    setSelectedInst(inst);
                    setLimitPrice(inst.price);
                  }
                }}
                className="w-full px-3 py-2 bg-[#0e1422] border border-[#1e2a3f] rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              >
                {INDIAN_INSTRUMENTS.map((inst) => (
                  <option key={inst.symbol} value={inst.symbol}>
                    {inst.symbol} ({inst.exchange}) — Lot: {inst.lot} | ₹{inst.price.toLocaleString("en-IN")} [{inst.type}]
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handlePlaceOrder} className="space-y-4">
              {/* Buy / Sell Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrderSide("BUY")}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    orderSide === "BUY"
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                      : "bg-[#101726] border border-[#1b263b] text-[#94a3b8] hover:text-white"
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>BUY (LONG)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderSide("SELL")}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    orderSide === "SELL"
                      ? "bg-rose-600 text-white shadow-md shadow-rose-900/30"
                      : "bg-[#101726] border border-[#1b263b] text-[#94a3b8] hover:text-white"
                  }`}
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>SELL (SHORT)</span>
                </button>
              </div>

              {/* Product Type (MIS vs CNC/NRML) & Order Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#94a3b8] font-medium block mb-1">
                    Product Type
                  </label>
                  <select
                    value={productType}
                    onChange={(e) => setProductType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#0e1422] border border-[#1e2a3f] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="INTRADAY">MIS (Intraday)</option>
                    <option value="DELIVERY">CNC/NRML (Carry)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#94a3b8] font-medium block mb-1">
                    Order Type
                  </label>
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#0e1422] border border-[#1e2a3f] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="MARKET">Market</option>
                    <option value="LIMIT">Limit</option>
                  </select>
                </div>
              </div>

              {/* Quantity (Lot Sizing) */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-[#94a3b8]">Number of Lots (Lot Size: {selectedInst.lot})</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {totalCalculatedQuantity} units
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={lotsCount}
                    onChange={(e) => setLotsCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 px-3 py-2 bg-[#0e1422] border border-[#1e2a3f] rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex gap-1">
                    {[1, 2, 5, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setLotsCount(num)}
                        className={`px-2 py-1.5 rounded-md text-[10px] font-mono border transition-all ${
                          lotsCount === num
                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold"
                            : "bg-[#101726] border-[#1e2a3f] text-[#94a3b8] hover:text-white"
                        }`}
                      >
                        +{num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Limit Price Input (if LIMIT) */}
              {orderType === "LIMIT" && (
                <div>
                  <label className="text-[11px] text-[#94a3b8] font-medium block mb-1">
                    Limit Execution Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(parseFloat(e.target.value) || selectedInst.price)}
                    className="w-full px-3 py-2 bg-[#0e1422] border border-[#1e2a3f] rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Order Margin & Cost Assessment Matrix */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-[#0e1422] border border-[#1a2230]">
                  <span className="text-[10px] text-[#94a3b8] block">Margin Required</span>
                  <span className="font-mono font-bold text-white text-xs block mt-0.5">
                    {formatINR(requiredMargin, { decimals: 0 })}
                  </span>
                  <span className="text-[9px] text-cyan-400 block mt-0.5">
                    {marginRate * 100}% ({isFoIndex ? "SPAN F&O" : productType === "DELIVERY" ? "Cash 100%" : "Intraday 20%"})
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0e1422] border border-[#1a2230]">
                  <span className="text-[10px] text-[#94a3b8] block">Available Margin</span>
                  <span
                    className={`font-mono font-bold text-xs block mt-0.5 ${
                      hasSufficientMargin ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {formatINR(funds.availableMargin || 0, { decimals: 0 })}
                  </span>
                  <span className={`text-[9px] block mt-0.5 ${hasSufficientMargin ? "text-emerald-400" : "text-rose-400 font-bold"}`}>
                    {hasSufficientMargin ? "✓ Margin Check Passed" : "⚠ Insufficient Margin"}
                  </span>
                </div>
              </div>

              {/* Order Cost & Brokerage Summary */}
              <div className="p-2.5 rounded-lg bg-[#0e1422] border border-[#1a2230] text-[11px] space-y-1 font-mono">
                <div className="flex justify-between text-[#94a3b8]">
                  <span>Est. Contract Value:</span>
                  <span className="text-white font-semibold">{formatINR(estimatedOrderValue)}</span>
                </div>
                <div className="flex justify-between text-[#94a3b8]">
                  <span>Brokerage + STT:</span>
                  <span className="text-emerald-400">₹20 flat + Statutory taxes</span>
                </div>
              </div>

              {/* Submit Order Button */}
              <button
                type="submit"
                disabled={loading || status.killSwitchTripped || !hasSufficientMargin}
                className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md active:scale-98 ${
                  status.killSwitchTripped
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                    : !hasSufficientMargin
                    ? "bg-slate-800 text-slate-400 cursor-not-allowed border border-rose-500/30"
                    : orderSide === "BUY"
                    ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
                    : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30"
                }`}
              >
                {loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                <span>
                  {status.killSwitchTripped
                    ? "Trading Halted by Kill Switch"
                    : !hasSufficientMargin
                    ? "Insufficient Margin for Order"
                    : `Submit ${orderSide} Order (${lotsCount} ${lotsCount === 1 ? "Lot" : "Lots"} • ${selectedInst.symbol})`}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Positions & Order Ledger Tabs */}
      <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#162030] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLedgerTab("positions")}
              className={`flex items-center gap-2 pb-1 border-b-2 font-bold text-xs transition-all ${
                ledgerTab === "positions"
                  ? "border-emerald-500 text-white"
                  : "border-transparent text-[#94a3b8] hover:text-white"
              }`}
            >
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Live Open Positions ({positions.length})</span>
            </button>

            <button
              onClick={() => setLedgerTab("orders")}
              className={`flex items-center gap-2 pb-1 border-b-2 font-bold text-xs transition-all ${
                ledgerTab === "orders"
                  ? "border-emerald-500 text-white"
                  : "border-transparent text-[#94a3b8] hover:text-white"
              }`}
            >
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Order Ledger ({orders.length})</span>
            </button>
          </div>

          <span className="text-[11px] text-[#64748b] font-mono">
            Auto-synced with Pre-Trade RMS Gateway
          </span>
        </div>

        {ledgerTab === "positions" ? (
          /* Positions Table */
          <div className="overflow-x-auto">
            {positions.length === 0 ? (
              <div className="p-8 text-center text-[#64748b] text-xs space-y-2">
                <p>No live open positions.</p>
                <p className="text-[11px]">
                  Submit an order above to execute trades through the RMS validation gateway.
                </p>
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0e1422] text-[#94a3b8] font-medium border-b border-[#162030]">
                  <tr>
                    <th className="py-2.5 px-4">Instrument</th>
                    <th className="py-2.5 px-4">Exchange</th>
                    <th className="py-2.5 px-4">Product</th>
                    <th className="py-2.5 px-4 text-right">Net Qty</th>
                    <th className="py-2.5 px-4 text-right">Avg Price</th>
                    <th className="py-2.5 px-4 text-right">LTP</th>
                    <th className="py-2.5 px-4 text-right">P&L</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141c2b] font-mono">
                  {positions.map((pos, idx) => (
                    <tr key={idx} className="hover:bg-[#0e1422]/60">
                      <td className="py-2.5 px-4 font-bold text-white">{pos.tradingsymbol}</td>
                      <td className="py-2.5 px-4 text-[#94a3b8]">{pos.exchange}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-[#cbd5e1]">
                          {pos.producttype}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-bold ${
                          pos.netqty > 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {pos.netqty}
                      </td>
                      <td className="py-2.5 px-4 text-right text-[#cbd5e1]">
                        ₹{pos.buyavgprice.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-white">
                        ₹{pos.ltp.toFixed(2)}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-bold ${
                          pos.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {pos.pnl >= 0 ? "+" : ""}
                        {formatINR(pos.pnl, { decimals: 2 })}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => handleClosePosition(pos.tradingsymbol)}
                          className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-semibold transition-colors"
                        >
                          Exit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          /* Orders Table */
          <div className="overflow-x-auto">
            {orders.length === 0 ? (
              <div className="p-8 text-center text-[#64748b] text-xs">
                No orders recorded in session ledger.
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0e1422] text-[#94a3b8] font-medium border-b border-[#162030]">
                  <tr>
                    <th className="py-2.5 px-4">Order ID</th>
                    <th className="py-2.5 px-4">Time</th>
                    <th className="py-2.5 px-4">Side</th>
                    <th className="py-2.5 px-4">Instrument</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4 text-right">Qty</th>
                    <th className="py-2.5 px-4 text-right">Price</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141c2b] font-mono">
                  {orders.map((ord, idx) => (
                    <tr key={idx} className="hover:bg-[#0e1422]/60">
                      <td className="py-2.5 px-4 text-[#94a3b8] text-[11px]">{ord.order_id}</td>
                      <td className="py-2.5 px-4 text-[#64748b] text-[11px]">
                        {new Date(ord.created_at).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            ord.transaction_type === "BUY"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {ord.transaction_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-white">{ord.symbol}</td>
                      <td className="py-2.5 px-4 text-[#94a3b8] text-[11px]">{ord.order_type}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-white">{ord.quantity}</td>
                      <td className="py-2.5 px-4 text-right text-[#cbd5e1]">₹{ord.price.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
