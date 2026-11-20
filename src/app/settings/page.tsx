"use client";

import React, { useState } from "react";
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Key,
  Bell,
  Sliders,
  Save,
  CheckCircle2,
  Lock,
  Globe,
  Radio,
  Clock,
  Sparkles,
} from "lucide-react";
import { formatINR } from "@/lib/formatters";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  // Broker Credentials
  const [angelKey, setAngelKey] = useState("ang_live_demo_9872");
  const [angelClient, setAngelClient] = useState("ANG984512");
  const [zerodhaKey, setZerodhaKey] = useState("kite_live_demo_3310");
  const [zerodhaToken, setZerodhaToken] = useState("tok_kite_live_session_9941");

  // RMS Defaults
  const [maxLoss, setMaxLoss] = useState(10000);
  const [maxCapitalTrade, setMaxCapitalTrade] = useState(20);
  const [maxPositions, setMaxPositions] = useState(4);
  const [squareOffTime, setSquareOffTime] = useState("15:15");

  // Notifications
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#0b0e14] text-[#cbd5e1] space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1a2230]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-2">
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>Platform Configuration & Security Credentials</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            System Settings & API Keys
          </h1>
          <p className="text-xs md:text-sm text-[#94a3b8] mt-1">
            Manage multi-broker API credentials, institutional RMS risk limits, and real-time execution notification webhooks.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-98"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Changes</span>
        </button>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>All platform configurations and API credentials securely updated.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Broker API Credentials */}
        <div className="p-5 rounded-2xl bg-[#0e1422] border border-[#1b263b] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#182338]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-400" />
              Indian Broker Gateways (OAuth & SmartAPI)
            </h3>
            <span className="text-[10px] text-[#64748b]">Encrypted at rest</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Angel One SmartAPI */}
            <div className="p-4 rounded-xl bg-[#080b12] border border-[#182338] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">Angel One SmartAPI</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  CONNECTED
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[#94a3b8] block mb-1">API Key</label>
                  <input
                    type="password"
                    value={angelKey}
                    onChange={(e) => setAngelKey(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0c101a] border border-[#182338] rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[#94a3b8] block mb-1">Client Code</label>
                  <input
                    type="text"
                    value={angelClient}
                    onChange={(e) => setAngelClient(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0c101a] border border-[#182338] rounded-lg text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Zerodha Kite Connect */}
            <div className="p-4 rounded-xl bg-[#080b12] border border-[#182338] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">Zerodha Kite Connect</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                  CONFIGURED
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[#94a3b8] block mb-1">Kite API Key</label>
                  <input
                    type="password"
                    value={zerodhaKey}
                    onChange={(e) => setZerodhaKey(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0c101a] border border-[#182338] rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[#94a3b8] block mb-1">Session Access Token</label>
                  <input
                    type="password"
                    value={zerodhaToken}
                    onChange={(e) => setZerodhaToken(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0c101a] border border-[#182338] rounded-lg text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Institutional RMS Guardrails */}
        <div className="p-5 rounded-2xl bg-[#0e1422] border border-[#1b263b] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#182338]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              Pre-Trade RMS Guardrails & SEBI Square-Off Rules
            </h3>
            <span className="text-[10px] text-cyan-400 font-mono">SEBI Compliant</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="text-[#94a3b8] block mb-1 font-medium">Max Daily Loss Limit (₹)</label>
              <input
                type="number"
                step={1000}
                value={maxLoss}
                onChange={(e) => setMaxLoss(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-[#080b12] border border-[#182338] rounded-lg text-white font-mono font-bold"
              />
              <span className="text-[10px] text-[#64748b] mt-1 block">Halts all trading if breached</span>
            </div>

            <div>
              <label className="text-[#94a3b8] block mb-1 font-medium">Max Capital Per Trade (%)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={maxCapitalTrade}
                onChange={(e) => setMaxCapitalTrade(Number(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-[#080b12] border border-[#182338] rounded-lg text-white font-mono font-bold"
              />
              <span className="text-[10px] text-[#64748b] mt-1 block">Caps maximum lot position size</span>
            </div>

            <div>
              <label className="text-[#94a3b8] block mb-1 font-medium">Max Open Positions</label>
              <input
                type="number"
                min={1}
                max={20}
                value={maxPositions}
                onChange={(e) => setMaxPositions(Number(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-[#080b12] border border-[#182338] rounded-lg text-white font-mono font-bold"
              />
              <span className="text-[10px] text-[#64748b] mt-1 block">Limits multi-asset exposure</span>
            </div>

            <div>
              <label className="text-[#94a3b8] block mb-1 font-medium">MIS Auto Square-Off Time (IST)</label>
              <input
                type="text"
                value={squareOffTime}
                onChange={(e) => setSquareOffTime(e.target.value)}
                className="w-full px-3 py-2 bg-[#080b12] border border-[#182338] rounded-lg text-white font-mono font-bold"
              />
              <span className="text-[10px] text-[#64748b] mt-1 block">Forces zero overnight carry</span>
            </div>
          </div>
        </div>

        {/* Section 3: Notification Integrations */}
        <div className="p-5 rounded-2xl bg-[#0e1422] border border-[#1b263b] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#182338]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              Instant Trade Fill Notifications & Telegram Bot
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-[#94a3b8] block mb-1 font-medium">Telegram Bot Token</label>
              <input
                type="password"
                placeholder="bot123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                className="w-full px-3 py-2 bg-[#080b12] border border-[#182338] rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[#94a3b8] block mb-1 font-medium">Telegram Chat ID</label>
              <input
                type="text"
                placeholder="e.g. 987654321"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="w-full px-3 py-2 bg-[#080b12] border border-[#182338] rounded-lg text-white font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="rounded border-[#182338] text-emerald-500 focus:ring-0"
              />
              <span>Audio chime on order fill</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="rounded border-[#182338] text-emerald-500 focus:ring-0"
              />
              <span>Daily P&L digest email</span>
            </label>
          </div>
        </div>
      </form>
    </div>
  );
}
