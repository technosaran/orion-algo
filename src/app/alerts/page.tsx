"use client";

import React, { useState } from "react";
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
  note: string;
}

export default function AlertsCenterPage() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([
    {
      id: "a1",
      symbol: "NIFTY50",
      condition: "GREATER_THAN",
      targetValue: 24500,
      active: true,
      triggered: false,
      createdAt: "20-Nov-2026 14:15",
      note: "Weekly resistance breakout trigger",
    },
    {
      id: "a2",
      symbol: "BANKNIFTY",
      condition: "LESS_THAN",
      targetValue: 51800,
      active: true,
      triggered: false,
      createdAt: "20-Nov-2026 11:30",
      note: "Put option debit spread entry trigger",
    },
    {
      id: "a3",
      symbol: "RELIANCE",
      condition: "RSI_OVERSOLD",
      targetValue: 35,
      active: true,
      triggered: true,
      createdAt: "19-Nov-2026 10:15",
      note: "Mean reversion dip buy alert",
    },
  ]);

  const [copied, setCopied] = useState(false);
  const [newSymbol, setNewSymbol] = useState("NIFTY50");
  const [newCondition, setNewCondition] = useState<"GREATER_THAN" | "LESS_THAN" | "RSI_OVERBOUGHT" | "RSI_OVERSOLD">("GREATER_THAN");
  const [newTarget, setNewTarget] = useState<number>(24400);
  const [newNote, setNewNote] = useState("");
  const [webhookMessage, setWebhookMessage] = useState<string | null>(null);

  const webhookUrl = "https://algox.internal/api/v1/webhook/signal";
  const sampleWebhookJson = JSON.stringify(
    {
      secret: "algox_live_bridge_key_9921",
      symbol: "NIFTY50",
      action: "BUY",
      quantity: 65,
      order_type: "MARKET",
      product_type: "INTRADAY",
    },
    null,
    2
  );

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(sampleWebhookJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const alert: PriceAlert = {
      id: String(Date.now()),
      symbol: newSymbol,
      condition: newCondition,
      targetValue: Number(newTarget) || 0,
      active: true,
      triggered: false,
      createdAt: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      note: newNote || "Custom price trigger",
    };
    setAlerts([alert, ...alerts]);
    setNewNote("");
  };

  const handleToggleAlert = (id: string) => {
    setAlerts(alerts.map((a) => (a.id === id ? { ...a, active: !a.active } : a)));
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(alerts.filter((a) => a.id !== id));
  };

  const handleSimulateWebhook = () => {
    setWebhookMessage("⚡ Incoming Webhook Received from TradingView Pine Script! Order placed: BUY 65 NIFTY50 @ MARKET");
    setTimeout(() => setWebhookMessage(null), 6000);
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

        <button
          onClick={handleSimulateWebhook}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-500/20 active:scale-98"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>Test Webhook Signal</span>
        </button>
      </div>

      {webhookMessage && (
        <div className="p-3.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-xs font-semibold animate-in fade-in">
          {webhookMessage}
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
                <option value="CRUDEOIL">CRUDEOIL (MCX)</option>
                <option value="GOLD">GOLD (MCX)</option>
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
              REST v1
            </span>
          </div>

          <p className="text-xs text-[#94a3b8] leading-relaxed">
            Connect any TradingView alert, Pine Script strategy, or external Python bot directly to AlgoX. Orders are routed through our RMS guardrails and executed instantly on linked broker accounts.
          </p>

          <div className="space-y-2">
            <span className="text-[11px] text-[#64748b] block font-mono">Webhook Endpoint URL:</span>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#080b12] border border-[#182338] font-mono text-xs text-white">
              <span className="truncate flex-1">{webhookUrl}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#64748b] font-mono">Payload Template (JSON):</span>
              <button
                onClick={handleCopyWebhook}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <Copy className="w-3 h-3" />
                <span>{copied ? "Copied!" : "Copy JSON"}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-[#080b12] border border-[#182338] font-mono text-[11px] text-emerald-400 overflow-x-auto">
              {sampleWebhookJson}
            </pre>
          </div>
        </div>
      </div>

      {/* Active Alerts List */}
      <div className="p-5 rounded-2xl bg-[#0e1422] border border-[#1b263b] space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400" />
          Active Price & Indicator Triggers ({alerts.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left font-mono">
            <thead className="text-[10px] text-[#64748b] border-b border-[#182338]">
              <tr>
                <th className="py-2.5">Status</th>
                <th className="py-2.5">Symbol</th>
                <th className="py-2.5">Condition</th>
                <th className="py-2.5 text-right">Target</th>
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
                        alert.active
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {alert.active ? "ARMED" : "PAUSED"}
                    </button>
                  </td>
                  <td className="py-3 font-bold text-white">{alert.symbol}</td>
                  <td className="py-3 text-cyan-400 font-sans text-[11px]">{alert.condition.replace("_", " ")}</td>
                  <td className="py-3 text-right text-white font-bold">{alert.targetValue}</td>
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
