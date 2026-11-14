"use client";

import React from "react";
import {
  X,
  Sparkles,
  ArrowRight,
  Layers,
  Clock,
  Coins,
} from "lucide-react";
import { StrategyConfig } from "@/types/strategy";
import { STRATEGY_TEMPLATES } from "@/lib/strategy-templates";
import { formatINR } from "@/lib/formatters";

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: StrategyConfig) => void;
}

export function TemplatesModal({
  isOpen,
  onClose,
  onSelectTemplate,
}: TemplatesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-[#0b0e14] border border-[#1e2a3c] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a2230]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">NSE / BSE / MCX Strategy Presets</h3>
              <p className="text-xs text-[#94a3b8]">Select a pre-engineered Indian quantitative model to populate all sections.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748b] hover:text-white hover:bg-[#161f30] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {STRATEGY_TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              className="bg-[#0d121c] border border-[#1d2738] hover:border-emerald-500/40 rounded-xl p-5 flex flex-col justify-between space-y-4 transition-all group hover:shadow-lg hover:shadow-emerald-500/5"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {tmpl.category.replace("_", " ")}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {tmpl.productType || "MIS"}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {tmpl.name}
                    </h4>
                  </div>
                </div>

                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  {tmpl.description}
                </p>

                {/* Specs */}
                <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] text-[#64748b]">
                  <span className="flex items-center gap-1 font-mono text-[#cbd5e1] bg-[#131b2a] px-2 py-0.5 rounded border border-[#222e42]">
                    <Coins className="w-3 h-3 text-emerald-400" />
                    {tmpl.symbol}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[#cbd5e1] bg-[#131b2a] px-2 py-0.5 rounded border border-[#222e42]">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    {tmpl.timeframe}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[#cbd5e1] bg-[#131b2a] px-2 py-0.5 rounded border border-[#222e42]">
                    <Layers className="w-3 h-3 text-amber-400" />
                    {tmpl.entryGroups.length} Rule Blocks
                  </span>
                  <span className="text-emerald-400 font-mono font-semibold">
                    Cap: {formatINR(tmpl.initialCapital)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  onSelectTemplate(tmpl);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#131b2a] hover:bg-emerald-500 hover:text-slate-950 border border-[#222e42] hover:border-emerald-400 text-xs font-semibold text-emerald-400 transition-all shadow-sm"
              >
                <span>Load Into Strategy Builder</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
