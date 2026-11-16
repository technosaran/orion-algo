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
} from "lucide-react";
import { formatINR } from "@/lib/formatters";

interface BrokerStatus {
  connected: boolean;
  broker: string | null;
  killSwitchTripped: boolean;
  isSquareOffTime: boolean;
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
  { symbol: "NIFTY50", name: "NIFTY 50 Futures", exchange: "NSE", lot: 75, price: 24350 },
  { symbol: "BANKNIFTY", name: "Bank Nifty Futures", exchange: "NSE", lot: 30, price: 52180 },
  { symbol: "RELIANCE", name: "Reliance Industries", exchange: "NSE", lot: 1, price: 2980 },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd.", exchange: "NSE", lot: 1, price: 1720 },
  { symbol: "TCS", name: "Tata Consultancy Services", exchange: "NSE", lot: 1, price: 4120 },
  { symbol: "INFY", name: "Infosys Ltd.", exchange: "NSE", lot: 1, price: 1845 },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd.", exchange: "NSE", lot: 1, price: 1260 },
  { symbol: "SBIN", name: "State Bank of India", exchange: "NSE", lot: 1, price: 835 },
  { symbol: "CRUDEOIL", name: "Crude Oil (MCX)", exchange: "MCX", lot: 100, price: 6240 },
  { symbol: "GOLD", name: "Gold Spot (MCX)", exchange: "MCX", lot: 10, price: 77500 },
];

export default function LiveTradingPage() {
  // 1. Status & RMS state
  const [status, setStatus] = useState<BrokerStatus>({
    connected: false,
    broker: null,
    killSwitchTripped: false,
    isSquareOffTime: false,
    dailyRealizedLoss: 0,
    maxDailyLossLimit: 10000,
  });

  const [funds, setFunds] = useState<BrokerFunds>({
    connected: false,
    netCash: 500000,
    availableMargin: 350000,
  });

  const [positions, setPositions] = useState<LivePosition[]>([]);
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // 2. Broker Connection Form State
  const [activeBrokerTab, setActiveBrokerTab] = useState<"angel_one" | "zerodha">("angel_one");
  const [angelForm, setAngelForm] = useState({
    apiKey: "",
    clientId: "",
    pin: "",
    totpSecret: "",
  });
  const [zerodhaForm, setZerodhaForm] = useState({
    apiKey: "",
    accessToken: "",
  });

  // 3. Order Ticket State
  const [selectedInst, setSelectedInst] = useState(INDIAN_INSTRUMENTS[0]);
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [productType, setProductType] = useState<"INTRADAY" | "DELIVERY">("INTRADAY");
  const [lotsCount, setLotsCount] = useState<number>(1);
  const [limitPrice, setLimitPrice] = useState<number>(INDIAN_INSTRUMENTS[0].price);

  // 4. RMS Config Modal / Sliders
  const [maxLossInput, setMaxLossInput] = useState<number>(10000);

  // 5. IST Clock
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

  // Connect Broker
  const handleConnectBroker = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload =
        activeBrokerTab === "angel_one"
          ? {
              broker: "angel_one",
              api_key: angelForm.apiKey || "mock_angel_api_key",
              client_id: angelForm.clientId || "mock_client_id",
              pin: angelForm.pin || "1234",
              totp_secret: angelForm.totpSecret || "JBSWY3DPEHPK3PXP",
            }
          : {
              broker: "zerodha",
              api_key: zerodhaForm.apiKey || "mock_kite_key",
              access_token: zerodhaForm.accessToken || "mock_access_token",
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
    } catch (err) {
      showNotification("error", "Failed to connect to broker.");
    } finally {
      setLoading(false);
    }
  };

  // Disconnect Broker
  const handleDisconnect = async () => {
    try {
      await fetch("/api/live/disconnect", { method: "POST" });
      showNotification("info", "Broker disconnected.");
      refreshAll();
    } catch {
      showNotification("error", "Error disconnecting broker.");
    }
  };

  // Trip Emergency Kill Switch
  const handleTripKillSwitch = async () => {
    if (!confirm("EMERGENCY KILL SWITCH: Are you sure you want to cancel all pending orders and MARKET-EXIT all open positions immediately?")) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/live/kill-switch", { method: "POST" });
      const data = await res.json();
      showNotification("error", "🚨 KILL SWITCH ACTIVATED! All orders cancelled and positions squared off.");
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

  // Submit Live Order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status.killSwitchTripped) {
      showNotification("error", "RMS Rejected: Kill switch is active. Reset kill switch before trading.");
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
        showNotification("success", `Order placed successfully! ID: ${data.order_id || "OK"}`);
        refreshAll();
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

  const totalCalculatedQuantity = selectedInst.lot * lotsCount;
  const estimatedOrderValue = totalCalculatedQuantity * (orderType === "MARKET" ? selectedInst.price : limitPrice);

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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold mb-2">
            <Zap className="w-3.5 h-3.5" />
            <span>Live Broker Gateways & Pre-Trade RMS</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Live Trading & Institutional RMS Cockpit
          </h1>
          <p className="text-xs md:text-sm text-[#94a3b8] mt-1">
            SEBI-compliant Indian broker integration (Angel One & Zerodha Kite) with pre-trade risk guardrails and 1-click Emergency Kill Switch.
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
                status.connected ? "bg-emerald-400 shadow-sm shadow-emerald-400" : "bg-slate-500"
              }`}
            />
          </div>
          <div className="my-2">
            <div className="text-lg font-bold text-white flex items-center gap-2">
              <span>{status.broker || "No Broker Connected"}</span>
            </div>
            <p className="text-[11px] text-[#64748b]">
              {status.connected ? "Authenticated session active" : "Standby / Sandbox Mode"}
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
                  status.dailyRealizedLoss / status.maxDailyLossLimit > 0.8 ? "bg-rose-500" : "bg-emerald-500"
                }`}
                style={{
                  width: `${Math.min(100, (status.dailyRealizedLoss / (status.maxDailyLossLimit || 1)) * 100)}%`,
                }}
              />
            </div>
          </div>
          <div className="pt-2 border-t border-[#162030] flex items-center justify-between text-[11px]">
            <span className="text-[#94a3b8]">Loss Breach:</span>
            <span className={status.dailyRealizedLoss >= status.maxDailyLossLimit ? "text-rose-400 font-bold" : "text-emerald-400"}>
              {status.dailyRealizedLoss >= status.maxDailyLossLimit ? "TRIPPED" : "SAFE"}
            </span>
          </div>
        </div>

        {/* Card 4: 3:15 PM MIS Square-Off Guard */}
        <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94a3b8] font-medium">3:15 PM Square-Off Guard</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-2">
            <div className="text-lg font-bold font-mono text-white flex items-center gap-2">
              <span>{istTime || "12:00:00"}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  status.isSquareOffTime ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
                }`}
              >
                {status.isSquareOffTime ? "CUTOFF ACTIVE" : "MIS ALLOWED"}
              </span>
            </div>
            <p className="text-[11px] text-[#64748b]">Intraday MIS cutoff at 15:15 IST</p>
          </div>
          <div className="pt-2 border-t border-[#162030] flex items-center justify-between text-[11px]">
            <span className="text-[#94a3b8]">Compliance:</span>
            <span className="text-cyan-400 font-mono">SEBI Intraday Rule</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Broker Connect & RMS Settings (Left) + Live Order Execution Ticket (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Broker Connector + RMS Config (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Broker Integration Form */}
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
                Angel One SmartAPI (Auto-TOTP)
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

            {/* Form */}
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
                        placeholder="e.g. abcdef12345"
                        value={angelForm.apiKey}
                        onChange={(e) => setAngelForm({ ...angelForm, apiKey: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0e1422] border border-[#1e2a3f] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#94a3b8] font-medium block mb-1">
                        Client ID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. S123456"
                        value={angelForm.clientId}
                        onChange={(e) => setAngelForm({ ...angelForm, clientId: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0e1422] border border-[#1e2a3f] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-[#94a3b8] font-medium block mb-1">
                        Trading MPIN
                      </label>
                      <input
                        type="password"
                        placeholder="••••"
                        value={angelForm.pin}
                        onChange={(e) => setAngelForm({ ...angelForm, pin: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0e1422] border border-[#1e2a3f] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
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
                        onChange={(e) => setAngelForm({ ...angelForm, totpSecret: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0e1422] border border-[#1e2a3f] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-[#64748b] leading-tight">
                    * Automated TOTP 2FA allows seamless morning daemon login without manual Google Authenticator codes. Leave blank for Sandbox mode.
                  </p>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-[#94a3b8] font-medium block mb-1">
                        Kite API Key
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. kite_api_key"
                        value={zerodhaForm.apiKey}
                        onChange={(e) => setZerodhaForm({ ...zerodhaForm, apiKey: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0e1422] border border-[#1e2a3f] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
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
                        onChange={(e) => setZerodhaForm({ ...zerodhaForm, accessToken: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0e1422] border border-[#1e2a3f] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-98 flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>
                  {status.connected ? "Re-Authenticate Broker Gateway" : "Authenticate & Connect Gateway"}
                </span>
              </button>
            </form>
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
              {/* Daily Loss Ceiling */}
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
                  <span className="text-xs font-bold font-mono text-white mt-1 block">20% Available Cash</span>
                </div>

                <div className="p-3 rounded-lg bg-[#0e1422] border border-[#1e2a3f]">
                  <span className="text-[10px] text-[#94a3b8] block">Max Open Positions</span>
                  <span className="text-xs font-bold font-mono text-white mt-1 block">4 Concurrent</span>
                </div>

                <div className="p-3 rounded-lg bg-[#0e1422] border border-[#1e2a3f]">
                  <span className="text-[10px] text-[#94a3b8] block">MIS Auto Square-Off</span>
                  <span className="text-xs font-bold font-mono text-cyan-400 mt-1 block">15:15 IST Daily</span>
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
              <span className="text-xs font-mono text-[#94a3b8]">RMS Validated</span>
            </div>

            <form onSubmit={handlePlaceOrder} className="space-y-4">
              {/* Buy / Sell Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrderSide("BUY")}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    orderSide === "BUY"
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                      : "bg-[#101726] border border-[#1b263b] text-[#94a3b8] hover:text-white"
                  }`}
                >
                  BUY (LONG)
                </button>
                <button
                  type="button"
                  onClick={() => setOrderSide("SELL")}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    orderSide === "SELL"
                      ? "bg-rose-600 text-white shadow-md shadow-rose-900/30"
                      : "bg-[#101726] border border-[#1b263b] text-[#94a3b8] hover:text-white"
                  }`}
                >
                  SELL (SHORT)
                </button>
              </div>

              {/* Instrument Select */}
              <div>
                <label className="text-[11px] text-[#94a3b8] font-medium block mb-1">
                  Indian Instrument
                </label>
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
                      {inst.symbol} ({inst.exchange}) — Lot: {inst.lot} | ₹{inst.price}
                    </option>
                  ))}
                </select>
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

              {/* Order Cost & Brokerage Summary */}
              <div className="p-3 rounded-lg bg-[#0e1422] border border-[#1a2230] text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-[#94a3b8]">
                  <span>Est. Turnover:</span>
                  <span className="text-white font-semibold">{formatINR(estimatedOrderValue)}</span>
                </div>
                <div className="flex justify-between text-[#94a3b8]">
                  <span>Brokerage + STT:</span>
                  <span className="text-emerald-400">₹20.00 + Statutory</span>
                </div>
              </div>

              {/* Submit Order Button */}
              <button
                type="submit"
                disabled={loading || status.killSwitchTripped}
                className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md active:scale-98 ${
                  status.killSwitchTripped
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
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
                    : `Submit ${orderSide} Order via RMS`}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Positions & Order Ledger Tabs */}
      <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#162030] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Live Open Positions & Orders Ledger</h3>
          </div>
          <span className="text-xs text-[#94a3b8] font-mono">
            {positions.length} Active Positions • {orders.length} Orders
          </span>
        </div>

        {/* Positions Table */}
        <div className="overflow-x-auto">
          {positions.length === 0 ? (
            <div className="p-8 text-center text-[#64748b] text-xs">
              No live open positions. Orders submitted via the live ticket will appear here.
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
                    <td className={`py-2.5 px-4 text-right font-bold ${pos.netqty > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {pos.netqty}
                    </td>
                    <td className="py-2.5 px-4 text-right text-[#cbd5e1]">₹{pos.buyavgprice.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-right text-white">₹{pos.ltp.toFixed(2)}</td>
                    <td className={`py-2.5 px-4 text-right font-bold ${pos.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {pos.pnl >= 0 ? "+" : ""}
                      {formatINR(pos.pnl, { decimals: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
