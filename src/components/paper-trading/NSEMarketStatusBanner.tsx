"use client";

import React, { useState, useEffect } from "react";
import { Clock, ShieldAlert, Sparkles, Activity } from "lucide-react";

export function NSEMarketStatusBanner() {
  const [istTime, setIstTime] = useState<string>("");
  const [sessionPhase, setSessionPhase] = useState<{
    label: string;
    status: "live" | "preopen" | "closed" | "auction";
    desc: string;
  }>({
    label: "Normal Continuous Market",
    status: "live",
    desc: "09:15 - 15:30 IST",
  });

  useEffect(() => {
    const updateTimeAndSession = () => {
      const now = new Date();
      // Format IST Time
      const timeStr = now.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      setIstTime(timeStr);

      // Determine day and time in IST
      const istDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const day = istDate.getDay(); // 0 is Sun, 6 is Sat
      const hours = istDate.getHours();
      const minutes = istDate.getMinutes();
      const timeInMins = hours * 60 + minutes;

      const isWeekday = day >= 1 && day <= 5;

      if (!isWeekday) {
        setSessionPhase({
          label: "Weekend Closed",
          status: "closed",
          desc: "Simulation Sandbox Running",
        });
      } else if (timeInMins >= 540 && timeInMins < 548) {
        // 09:00 - 09:08
        setSessionPhase({
          label: "NSE Pre-Open",
          status: "preopen",
          desc: "Order Collection (09:00 - 09:08)",
        });
      } else if (timeInMins >= 548 && timeInMins < 555) {
        // 09:08 - 09:15
        setSessionPhase({
          label: "NSE Pre-Open",
          status: "preopen",
          desc: "Price Discovery & Matching",
        });
      } else if (timeInMins >= 555 && timeInMins < 930) {
        // 09:15 - 15:30
        setSessionPhase({
          label: "NSE LIVE Market",
          status: "live",
          desc: "Continuous Cash & F&O (09:15 - 15:30)",
        });
      } else if (timeInMins >= 930 && timeInMins < 940) {
        // 15:30 - 15:40
        setSessionPhase({
          label: "Closing Auction (CAS)",
          status: "auction",
          desc: "F&O Continuous till 15:40 IST",
        });
      } else {
        setSessionPhase({
          label: "Market Closed",
          status: "closed",
          desc: "Paper Simulation Active (Next: 09:00 IST)",
        });
      }
    };

    updateTimeAndSession();
    const interval = setInterval(updateTimeAndSession, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-[#090d16] border border-[#182236] text-xs font-mono shadow-sm">
      {/* Left: NSE Status Pill and IST Clock */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${
              sessionPhase.status === "live"
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : sessionPhase.status === "preopen"
                ? "bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse"
                : sessionPhase.status === "auction"
                ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                : "bg-purple-500/15 text-purple-300 border-purple-500/30"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                sessionPhase.status === "live"
                  ? "bg-emerald-400 animate-pulse"
                  : sessionPhase.status === "preopen"
                  ? "bg-amber-400"
                  : sessionPhase.status === "auction"
                  ? "bg-cyan-400"
                  : "bg-purple-400"
              }`}
            />
            <span>{sessionPhase.label}</span>
          </span>

          <span className="text-[#94a3b8] text-[11px] hidden sm:inline">
            {sessionPhase.desc}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[#64748b]">
          <Clock className="w-3.5 h-3.5 text-[#94a3b8]" />
          <span className="text-white font-bold tracking-wider">{istTime || "09:15:00"}</span>
          <span className="text-[10px] text-[#475569]">IST</span>
        </div>
      </div>

      {/* Right: Exchange Regulatory Specs */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#64748b]">
        <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#121824] border border-[#1e293b]">
          <span className="text-[#94a3b8]">Tick Size:</span>
          <strong className="text-emerald-400">₹0.05</strong>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#121824] border border-[#1e293b]">
          <span className="text-[#94a3b8]">F&O Lots:</span>
          <span className="text-white">NIFTY <strong>65</strong> • BANKNIFTY <strong>30</strong></span>
        </div>

        <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#121824] border border-[#1e293b]">
          <ShieldAlert className="w-3 h-3 text-amber-400" />
          <span className="text-[#94a3b8]">Circuit Limits:</span>
          <span className="text-amber-400 font-semibold">10% • 15% • 20%</span>
        </div>
      </div>
    </div>
  );
}
