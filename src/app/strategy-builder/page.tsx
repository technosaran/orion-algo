"use client";

import React, { useState } from "react";
import {
  Layers,
  ChevronRight,
  ShieldAlert,
  PieChart,
  BarChart3,
  Sliders,
  TrendingUp,
} from "lucide-react";

import { StrategyConfig, BacktestResult } from "@/types/strategy";
import { STRATEGY_TEMPLATES } from "@/lib/strategy-templates";
import { runBacktest } from "@/lib/backtest-engine";
import { StrategyHeader } from "@/components/strategy-builder/StrategyHeader";
import { GeneralInfoSection } from "@/components/strategy-builder/GeneralInfoSection";
import { EntryConditionsSection } from "@/components/strategy-builder/EntryConditionsSection";
import { ExitConditionsSection } from "@/components/strategy-builder/ExitConditionsSection";
import { PositionSizingSection } from "@/components/strategy-builder/PositionSizingSection";
import { BacktestResultsSection } from "@/components/strategy-builder/BacktestResultsSection";
import { CodeExportModal } from "@/components/strategy-builder/CodeExportModal";
import { TemplatesModal } from "@/components/strategy-builder/TemplatesModal";

const STORAGE_KEY = "orion_algo_active_strategy";
const SAVED_LIST_KEY = "orion_algo_saved_strategies";

export default function StrategyBuilderPage() {
  // Strategy state with safe initial load
  const [strategy, setStrategy] = useState<StrategyConfig>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (e) {
        console.warn("Could not load strategy from localStorage:", e);
      }
    }
    return { ...STRATEGY_TEMPLATES[0], id: `strat-initial` };
  });

  // Backtest result state
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [isBacktesting, setIsBacktesting] = useState(false);

  // Active section tab ("all" or "1" | "2" | "3" | "4" | "5")
  const [activeTab, setActiveTab] = useState<"all" | "1" | "2" | "3" | "4" | "5">("all");

  // Modals & UI status
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isCodeExportOpen, setIsCodeExportOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Update strategy state handler
  const handleUpdateStrategy = (updated: Partial<StrategyConfig>) => {
    setStrategy((prev) => ({
      ...prev,
      ...updated,
      updatedAt: new Date().toISOString(),
    }));
  };

  // Run backtest simulation
  const handleRunBacktest = () => {
    setIsBacktesting(true);
    // Micro delay to simulate quant computation & give smooth UI feedback
    setTimeout(() => {
      try {
        const res = runBacktest(strategy);
        setBacktestResult(res);
        handleUpdateStrategy({ status: "backtested" });
        // If in tabbed view, switch to results tab
        if (activeTab !== "all") {
          setActiveTab("5");
        }
      } catch (err) {
        console.error("Backtest simulation error:", err);
      } finally {
        setIsBacktesting(false);
      }
    }, 450);
  };

  // Save strategy to localStorage
  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(strategy));
      
      // Also update saved strategies list
      const savedListRaw = localStorage.getItem(SAVED_LIST_KEY);
      const savedList: StrategyConfig[] = savedListRaw ? JSON.parse(savedListRaw) : [];
      const existingIdx = savedList.findIndex((s) => s.id === strategy.id);
      if (existingIdx >= 0) {
        savedList[existingIdx] = strategy;
      } else {
        savedList.unshift(strategy);
      }
      localStorage.setItem(SAVED_LIST_KEY, JSON.stringify(savedList));

      setSaveStatus("Saved!");
      setTimeout(() => setSaveStatus(null), 2500);
    } catch (e) {
      console.error("Error saving strategy:", e);
    }
  };

  // Reset strategy to default
  const handleReset = () => {
    if (confirm("Reset current strategy to default template?")) {
      setStrategy({ ...STRATEGY_TEMPLATES[0], id: `strat-${Date.now()}` });
      setBacktestResult(null);
    }
  };

  // Load a chosen template
  const handleSelectTemplate = (template: StrategyConfig) => {
    setStrategy({
      ...template,
      id: `strat-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setBacktestResult(null);
  };

  const navSections = [
    { id: "all", label: "Full Strategy View", icon: Layers },
    { id: "1", label: "01 Architecture", icon: Sliders },
    { id: "2", label: "02 Entry Signals", icon: TrendingUp },
    { id: "3", label: "03 Risk & Exits", icon: ShieldAlert },
    { id: "4", label: "04 Sizing & Margin", icon: PieChart },
    { id: "5", label: "05 Backtest & Verify", icon: BarChart3 },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#080a0f] text-[#cbd5e1]">
      {/* Top Header */}
      <StrategyHeader
        strategy={strategy}
        onUpdateStrategy={handleUpdateStrategy}
        onRunBacktest={handleRunBacktest}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onOpenCodeExport={() => setIsCodeExportOpen(true)}
        onSave={handleSave}
        onReset={handleReset}
        isBacktesting={isBacktesting}
        saveStatus={saveStatus}
      />

      {/* Section Sub-Navigation Tabs */}
      <div className="bg-[#0b0e14] border-b border-[#1a2230] px-6 py-2.5 flex items-center justify-between gap-4 overflow-x-auto select-none">
        <div className="flex items-center gap-1.5 shrink-0">
          {navSections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeTab === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveTab(sec.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-semibold"
                    : "text-[#94a3b8] hover:text-white hover:bg-[#131b2a] border border-transparent"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-400" : "text-[#64748b]"}`} />
                <span>{sec.label}</span>
                {sec.id === "5" && backtestResult && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                )}
              </button>
            );
          })}
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs text-[#64748b]">
          <span>Strategy Builder Engine</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#94a3b8] font-mono">{strategy.name}</span>
        </div>
      </div>

      {/* Main Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {(activeTab === "all" || activeTab === "1") && (
          <GeneralInfoSection
            strategy={strategy}
            onChange={handleUpdateStrategy}
          />
        )}

        {(activeTab === "all" || activeTab === "2") && (
          <EntryConditionsSection
            groups={strategy.entryGroups}
            onChange={(groups) => handleUpdateStrategy({ entryGroups: groups })}
            direction={strategy.direction}
            timeframe={strategy.timeframe}
          />
        )}

        {(activeTab === "all" || activeTab === "3") && (
          <ExitConditionsSection
            riskConfig={strategy.riskManagement}
            onChange={(risk) =>
              handleUpdateStrategy({
                riskManagement: { ...strategy.riskManagement, ...risk },
              })
            }
          />
        )}

        {(activeTab === "all" || activeTab === "4") && (
          <PositionSizingSection
            config={strategy.positionSizing}
            onChange={(sizing) =>
              handleUpdateStrategy({
                positionSizing: { ...strategy.positionSizing, ...sizing },
              })
            }
            initialCapital={strategy.initialCapital}
          />
        )}

        {(activeTab === "all" || activeTab === "5") && (
          <BacktestResultsSection
            result={backtestResult}
            isBacktesting={isBacktesting}
            onRunBacktest={handleRunBacktest}
            strategyName={strategy.name}
          />
        )}
      </div>

      {/* Modals */}
      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      <CodeExportModal
        isOpen={isCodeExportOpen}
        onClose={() => setIsCodeExportOpen(false)}
        strategy={strategy}
      />
    </div>
  );
}
