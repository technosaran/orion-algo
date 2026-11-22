"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Bell,
  Plus,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Copy,
  Radio,
  ExternalLink,
  Code,
  ShieldCheck,
  ArrowRight,
  Terminal,
  Volume2,
  VolumeX,
} from "lucide-react";
import { formatINR } from "@/lib/formatters";

interface PriceAlert {
  id: string;
  symbol: string;
  condition: "GREATER_THAN" | "LESS_THAN" | "RSI_OVERBOUGHT" | "RSI_OVERSOLD";
  targetValue: number;
  active: boolean;
  triggered: boolean;
  createdAt: string;
  triggeredAt?: string;
  lastPrice?: number;
  note: string;
}

const STORAGE_KEY = "algox_price_alerts_v1";

const DEFAULT_ALERTS: PriceAlert[] = [
  {
    id: "a1",
    symbol: "NIFTY50",
    condition: "GREATER_THAN",
    targetValue: 24500,
    active: true,
    triggered: false,
    createdAt: "20-Nov 14:15",
    note: "Weekly resistance breakout trigger",
  },
  {
    id: "a2",
    symbol: "BANKNIFTY",
    condition: "LESS_THAN",
    targetValue: 51800,
    active: true,
    triggered: false,
    createdAt: "20-Nov 11:30",
    note: "Put option debit spread entry trigger",
  },
  {
    id: "a3",
    symbol: "RELIANCE",
    condition: "LESS_THAN",
    targetValue: 2950,
    active: true,
    triggered: false,
    createdAt: "19-Nov 10:15",
    note: "Mean reversion dip buy alert",
  },
];

export default function AlertsCenterPage() {
  const [alerts, setAlerts] = useState<PriceAlert[]>(DEFAULT_ALERTS);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"json" | "curl" | "pine">("json");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Form inputs
  const [newSymbol, setNewSymbol] = useState("NIFTY50");
  const [newCondition, setNewCondition] = useState<
    "GREATER_THAN" | "LESS_THAN" | "RSI_OVERBOUGHT" | "RSI_OVERSOLD"
  >("GREATER_THAN");
  const [newTarget, setNewTarget] = useState<number>(24400);
  const [newNote, setNewNote] = useState("");

  // Webhook execution response state
  const [webhookStatus, setWebhookStatus] = useState<{
    type: "success" | "error" | "info";
    message: string;
    orderId?: string;
  } | null>(null);
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);

  // Live triggered notifications
  const [latestTriggeredAlert, setLatestTriggeredAlert] = useState<PriceAlert | null>(null);

  // Load alerts from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAlerts(parsed);
        }
      }
    } catch (e) {
      console.warn("Could not load alerts from localStorage:", e);
    }
  }, []);

  // Save alerts to localStorage whenever they change
  const saveAlerts = (updated: PriceAlert[]) => {
    setAlerts(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn("Could not save alerts to localStorage:", e);
      }
    }
  };

  // Live quotes polling and real-time alert evaluation
  useEffect(() => {
    let active = true;

    const evaluateAlerts = async () => {
      try {
        const res = await fetch("/api/market-data/quotes");
        if (!res.ok) return;
        const data = await res.json();
        const quotes: any[] = data.quotes || [];

        if (!active || quotes.length === 0) return;

        setAlerts((prevAlerts) => {
          let hasChange = false;
          const updated = prevAlerts.map((alt) => {
            if (!alt.active || alt.triggered) return alt;

            const q = quotes.find(
              (quote) =>
                quote.symbol.toUpperCase() === alt.symbol.toUpperCase() ||
                alt.symbol.toUpperCase().includes(quote.symbol.toUpperCase())
            );
            if (!q || !q.price) return alt;

            let conditionMet = false;
            if (alt.condition === "GREATER_THAN" && q.price >= alt.targetValue) {
              conditionMet = true;
            } else if (alt.condition === "LESS_THAN" && q.price <= alt.targetValue) {
              conditionMet = true;
            } else if (alt.condition === "RSI_OVERBOUGHT" && (q.rsi || 65) >= alt.targetValue) {
              conditionMet = true;
            } else if (alt.condition === "RSI_OVERSOLD" && (q.rsi || 35) <= alt.targetValue) {
              conditionMet = true;
            }

            if (conditionMet) {
              hasChange = true;
              const triggeredItem: PriceAlert = {
                ...alt,
                triggered: true,
                triggeredAt: new Date().toLocaleTimeString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                }),
                lastPrice: q.price,
              };
              setLatestTriggeredAlert(triggeredItem);
              return triggeredItem;
            }

            return { ...alt, lastPrice: q.price };
          });

          if (hasChange && typeof window !== "undefined") {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch {}
          }

          return hasChange ? updated : prevAlerts;
        });
      } catch {}
    };

    evaluateAlerts();
    const interval = setInterval(evaluateAlerts, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhook/signal`
      : "http://localhost:3000/api/webhook/signal";

  const sampleWebhookJson = JSON.stringify(
    {
      secret: "algox_live_bridge_key_9921",
      symbol: "NIFTY50",
      action: "BUY",
      quantity: 65,
      order_type: "MARKET",
      product_type: "MIS",
    },
    null,
    2
  );

  const curlCommand = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '${sampleWebhookJson.replace(/\n/g, "")}'`;

  const pineScriptExample = `//@version=5
strategy("AlgoX Webhook Example", overlay=true)

// Condition
buyCondition = ta.crossover(ta.ema(close, 9), ta.ema(close, 21))

// Webhook JSON Payload
if buyCondition
    alert('{"secret":"algox_live_bridge_key_9921","symbol":"NIFTY50","action":"BUY","quantity":65,"order_type":"MARKET","product_type":"MIS"}', alert.freq_once_per_bar_close)
`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const alert: PriceAlert = {
      id: `alt-${Date.now()}`,
      symbol: newSymbol,
      condition: newCondition,
      targetValue: Number(newTarget) || 0,
      active: true,
      triggered: false,
      createdAt: new Date().toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
      }),
      note: newNote || "Custom price trigger",
    };
    saveAlerts([alert, ...alerts]);
    setNewNote("");
  };

  const handleToggleAlert = (id: string) => {
    const updated = alerts.map((a) =>
      a.id === id ? { ...a, active: !a.active, triggered: a.active ? a.triggered : false } : a
    );
    saveAlerts(updated);
  };

  const handleDeleteAlert = (id: string) => {
    const updated = alerts.filter((a) => a.id !== id);
    saveAlerts(updated);
  };

  // Real Webhook execution against /api/webhook/signal
  const handleTestWebhook = async () => {
    setIsSendingWebhook(true);
    setWebhookStatus({
      type: "info",
      message: "Sending real webhook signal to /api/webhook/signal...",
    });

    try {
      const res = await fetch("/api/webhook/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: sampleWebhookJson,
      });

      const data = await res.json();

      if (res.ok && data.status === "success") {
        setWebhookStatus({
          type: "success",
          message: `Webhook received & executed: ${data.action} ${data.quantity} ${data.symbol} @ ₹${data.executed_price}.`,
          orderId: data.order_id,
        });
      } else {
        setWebhookStatus({
          type: "error",
          message: data.error || "Webhook execution returned an error.",
        });
      }
    } catch (err: any) {
      setWebhookStatus({
        type: "error",
        message: `Failed to connect to webhook route: ${err.message}`,
      });
    } finally {
      setIsSendingWebhook(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#0b0e14] text-[#cbd5e1] space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1a2230]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-2">
            <Bell className="w-3.5 h-3.5" />
            <span>Real-Time Alert Sentinel & TradingView Webhook Bridge</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Alerts & Webhook Signal Center
          </h1>
          <p className="text-xs md:text-sm text-[#94a3b8] mt-1">
            Configure real-time price & indicator triggers, or connect TradingView / Python signals via automated REST webhook bridges.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-[#101726] border border-[#1b263b] text-[#94a3b8] hover:text-white transition-colors"
            title={soundEnabled ? "Sound Alert Enabled" : "Sound Alert Muted"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={handleTestWebhook}
            disabled={isSendingWebhook}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-500/20 active:scale-98"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{isSendingWebhook ? "Executing Signal..." : "Test Webhook Signal"}</span>
          </button>
        </div>
      </div>

      {/* Live Trigger Alert Banner */}
      {latestTriggeredAlert && (
        <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>ALERT TRIGGERED:</strong> {latestTriggeredAlert.symbol}{" "}
              {latestTriggeredAlert.condition.replace("_", " ")} {latestTriggeredAlert.targetValue}{" "}
              (LTP: ₹{latestTriggeredAlert.lastPrice?.toFixed(2) || latestTriggeredAlert.targetValue}) at{" "}
              {latestTriggeredAlert.triggeredAt || "now"}.
            </span>
          </div>
          <button
            onClick={() => setLatestTriggeredAlert(null)}
            className="text-[11px] underline hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Webhook Execution Status Toast */}
      {webhookStatus && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in ${
            webhookStatus.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
              : webhookStatus.type === "error"
              ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
              : "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {webhookStatus.type === "success" && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{webhookStatus.message}</span>
          </div>
          {webhookStatus.orderId && (
            <Link
              href="/paper-trading"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-[11px] hover:bg-emerald-400 shrink-0"
            >
              <span>View in Paper Portfolio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* Grid: Create Alert (Left) + TradingView Webhook Bridge (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Create Trigger Form (5 cols) */}
        <div className="lg:col-span-5 bg-[#0e1422] p-5 rounded-2xl border border-[#1b263b] space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            Create Live Alert Sentinel
          </h3>

          <form onSubmit={handleCreateAlert} className="space-y-3 text-xs">
            <div>
              <label className="text-[#94a3b8] block mb-1">Trading Symbol</label>
              <select
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                className="w-full px-3 py-2 bg-[#080b12] border border-[#182338] rounded-lg text-white font-mono"
              >
                <option value="NIFTY50">NIFTY50 (NSE Index)</option>
                <option value="BANKNIFTY">BANKNIFTY (NSE Index)</option>
                <option value="RELIANCE">RELIANCE (NSE Equity)</option>
                <option value="HDFCBANK">HDFCBANK (NSE Equity)</option>
                <option value="TCS">TCS (NSE Equity)</option>
                <option value="INFY">INFY (NSE Equity)</option>
                <option value="CRUDEOIL">CRUDEOIL (MCX)</option>
                <option value="GOLD">GOLD (MCX)</option>
                <option value="BTC/USDT">BTC/USDT (Crypto)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#94a3b8] block mb-1">Condition</label>
                <select
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#080b12] border border-[#182338] rounded-lg text-white"
                >
                  <option value="GREATER_THAN">Price &gt;= Target</option>
                  <option value="LESS_THAN">Price &lt;= Target</option>
                  <option value="RSI_OVERBOUGHT">RSI &gt;= 70</option>
                  <option value="RSI_OVERSOLD">RSI &lt;= 30</option>
                </select>
              </div>

              <div>
                <label className="text-[#94a3b8] block mb-1">Target Value</label>
                <input
                  type="number"
                  value={newTarget}
                  onChange={(e) => setNewTarget(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-[#080b12] border border-[#182338] rounded-lg text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[#94a3b8] block mb-1">Alert Description</label>
              <input
                type="text"
                placeholder="e.g. Key support breakdown"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full px-3 py-2 bg-[#080b12] border border-[#182338] rounded-lg text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-98"
            >
              Add Active Sentinel
            </button>
          </form>
        </div>

        {/* Right: TradingView Webhook Integration (7 cols) */}
        <div className="lg:col-span-7 bg-[#0e1422] p-5 rounded-2xl border border-[#1b263b] space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#182338]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Code className="w-4 h-4 text-cyan-400" />
              TradingView Webhook Bridge Specification
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              REST v1 • ACTIVE
            </span>
          </div>

          <p className="text-xs text-[#94a3b8] leading-relaxed">
            Connect TradingView alerts, Pine Script strategies, or external Python bots directly to AlgoX. Signals trigger instant execution into Paper Trading and synced broker gateways.
          </p>

          <div className="space-y-2">
            <span className="text-[11px] text-[#64748b] block font-mono">Webhook Endpoint URL:</span>
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#080b12] border border-[#182338] font-mono text-xs text-white">
              <span className="truncate">{webhookUrl}</span>
              <button
                onClick={() => handleCopy(webhookUrl)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 shrink-0"
              >
                {copied ? "Copied" : "Copy URL"}
              </button>
            </div>
          </div>

          {/* Snippet Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-[#182338] pb-1.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("json")}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                    activeTab === "json"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "text-[#64748b] hover:text-white"
                  }`}
                >
                  JSON Payload
                </button>
                <button
                  onClick={() => setActiveTab("pine")}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                    activeTab === "pine"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "text-[#64748b] hover:text-white"
                  }`}
                >
                  Pine Script (v5)
                </button>
                <button
                  onClick={() => setActiveTab("curl")}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                    activeTab === "curl"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "text-[#64748b] hover:text-white"
                  }`}
                >
                  cURL
                </button>
              </div>

              <button
                onClick={() =>
                  handleCopy(
                    activeTab === "json"
                      ? sampleWebhookJson
                      : activeTab === "pine"
                      ? pineScriptExample
                      : curlCommand
                  )
                }
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <Copy className="w-3 h-3" />
                <span>{copied ? "Copied!" : "Copy Code"}</span>
              </button>
            </div>

            <pre className="p-3 rounded-xl bg-[#080b12] border border-[#182338] font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-48 leading-relaxed">
              {activeTab === "json"
                ? sampleWebhookJson
                : activeTab === "pine"
                ? pineScriptExample
                : curlCommand}
            </pre>
          </div>
        </div>
      </div>

      {/* Active Alerts List */}
      <div className="p-5 rounded-2xl bg-[#0e1422] border border-[#1b263b] space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#182338]">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            Active Sentinels & Price Triggers ({alerts.length})
          </h3>
          <span className="text-[10px] text-[#64748b] font-mono">
            Evaluates live quotes every 4s
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left font-mono">
            <thead className="text-[10px] text-[#64748b] border-b border-[#182338]">
              <tr>
                <th className="py-2.5">Status</th>
                <th className="py-2.5">Symbol</th>
                <th className="py-2.5">Condition</th>
                <th className="py-2.5 text-right">Target</th>
                <th className="py-2.5 text-right">Current LTP</th>
                <th className="py-2.5">Created</th>
                <th className="py-2.5">Note</th>
                <th className="py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#182338]">
              {alerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-[#121929]">
                  <td className="py-3">
                    <button
                      onClick={() => handleToggleAlert(alert.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        alert.triggered
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : alert.active
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {alert.triggered ? "TRIGGERED" : alert.active ? "ARMED" : "PAUSED"}
                    </button>
                  </td>
                  <td className="py-3 font-bold text-white">{alert.symbol}</td>
                  <td className="py-3 text-cyan-400 font-sans text-[11px]">
                    {alert.condition.replace("_", " ")}
                  </td>
                  <td className="py-3 text-right text-white font-bold">{alert.targetValue}</td>
                  <td className="py-3 text-right text-[#94a3b8]">
                    {alert.lastPrice ? `₹${alert.lastPrice.toFixed(2)}` : "--"}
                  </td>
                  <td className="py-3 text-[#64748b]">{alert.createdAt}</td>
                  <td className="py-3 text-[#cbd5e1] font-sans">{alert.note}</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="p-1 text-[#64748b] hover:text-rose-400 transition-colors"
                      title="Delete alert"
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
