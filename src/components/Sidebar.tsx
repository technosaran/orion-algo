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
      href: "/data",
      label: "Market Data & Datasets",
      icon: Database,
      active: pathname.startsWith("/data"),
    },
  ];

  return (
    <aside
      className={`relative flex flex-col h-screen bg-[#161922] border-r border-[#232733] text-[#9b9b9b] transition-all duration-300 ease-in-out select-none font-sans ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand Header (Zerodha Kite Style) */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#232733]">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#ff5722]/10 border border-[#ff5722]/30 text-[#ff5722]">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-[#ffffff] text-base tracking-wide flex items-center gap-1.5">
                AlgoX
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#4184f3]/10 text-[#4184f3] border border-[#4184f3]/30 uppercase font-semibold">
                  Pro
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

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                item.active
                  ? "bg-[#4184f3]/10 text-[#4184f3] border border-[#4184f3]/30 font-semibold shadow-xs"
                  : "text-[#9b9b9b] hover:text-[#e0e0e0] hover:bg-[#202430]"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`w-5 h-5 shrink-0 ${
                  item.active ? "text-[#4184f3]" : "text-[#666666]"
                }`}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
