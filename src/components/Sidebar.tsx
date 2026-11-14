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
  Bot,
  CandlestickChart,
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
  ];

  return (
    <aside
      className={`relative flex flex-col h-screen bg-[#0b0e14] border-r border-[#1a2230] text-[#94a3b8] transition-all duration-300 ease-in-out select-none ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#1a2230]">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-wide">
                ORION ALGO
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-[#161f30] text-[#64748b] hover:text-white transition-colors"
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
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold"
                  : "text-[#94a3b8] hover:text-white hover:bg-[#131b2a]"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0 text-emerald-400" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
