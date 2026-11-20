"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Sliders,
  FlaskConical,
  CandlestickChart,
  Database,
  ShieldAlert,
  Zap,
  Layers,
  Search,
  BarChart3,
  Bell,
  Settings as SettingsIcon,
} from "lucide-react";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
      active: pathname === "/",
    },
    {
      href: "/nse-terminal",
      label: "NSE Live Terminal",
      icon: Zap,
      active: pathname.startsWith("/nse-terminal"),
      badge: "LIVE",
    },
    {
      href: "/options-lab",
      label: "Options Strategy Lab",
      icon: Layers,
      active: pathname.startsWith("/options-lab"),
    },
    {
      href: "/screener",
      label: "Stock Screener",
      icon: Search,
      active: pathname.startsWith("/screener"),
    },
    {
      href: "/strategy-builder",
      label: "Strategy Builder",
      icon: Sliders,
      active: pathname.startsWith("/strategy-builder"),
    },
    {
      href: "/backtesting",
      label: "Backtesting",
      icon: FlaskConical,
      active: pathname.startsWith("/backtesting"),
    },
    {
      href: "/paper-trading",
      label: "Paper Trading",
      icon: CandlestickChart,
      active: pathname.startsWith("/paper-trading"),
    },
    {
      href: "/live-trading",
      label: "Live Trading & RMS",
      icon: ShieldAlert,
      active: pathname.startsWith("/live-trading"),
    },
    {
      href: "/analytics",
      label: "Performance & Journal",
      icon: BarChart3,
      active: pathname.startsWith("/analytics"),
    },
    {
      href: "/alerts",
      label: "Alerts & Signals",
      icon: Bell,
      active: pathname.startsWith("/alerts"),
    },
    {
      href: "/data",
      label: "Market Data Hub",
      icon: Database,
      active: pathname.startsWith("/data"),
    },
    {
      href: "/settings",
      label: "System Settings",
      icon: SettingsIcon,
      active: pathname.startsWith("/settings"),
    },
  ];

  return (
    <aside
      className={`relative flex flex-col h-screen bg-[#161922] border-r border-[#232733] text-[#9b9b9b] transition-all duration-300 ease-in-out select-none font-sans ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand Header (Zerodha Kite Style) */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#232733] shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#ff5722]/10 border border-[#ff5722]/30 text-[#ff5722]">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-[#ffffff] text-base tracking-wide flex items-center gap-1.5">
                AlgoX
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase font-semibold">
                  PRO
                </span>
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex items-center justify-center w-9 h-9 rounded-lg bg-[#ff5722]/10 border border-[#ff5722]/30 text-[#ff5722]">
            <TrendingUp className="w-5 h-5" />
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-[#202430] text-[#666666] hover:text-[#e0e0e0] transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                item.active
                  ? "bg-[#4184f3]/15 text-[#4184f3] border border-[#4184f3]/30 font-semibold shadow-xs"
                  : "text-[#9b9b9b] hover:text-[#e0e0e0] hover:bg-[#202430]"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    item.active ? "text-[#4184f3]" : "text-[#666666]"
                  }`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!collapsed && item.badge && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      {!collapsed && (
        <div className="p-3 border-t border-[#232733] text-[10px] text-[#64748b] flex items-center justify-between shrink-0 font-mono">
          <span>NSE / BSE / MCX</span>
          <span className="text-emerald-400">● GATEWAY READY</span>
        </div>
      )}
    </aside>
  );
}
