"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  ChevronRight,
  ShieldAlert,
  PieChart,
  BarChart3,
  Sliders,
  TrendingUp,
  Sparkles,
} from "lucide-react";

import { StrategyConfig, BacktestResult } from "@/types/strategy";
import { runBacktest } from "@/lib/backtest-engine";
import {
  getStrategiesFromDb,
  saveStrategyToDb,
  deleteStrategyFromDb,
  saveBacktestToDb,
} from "@/lib/strategies-service";

import { StrategyHeader } from "@/components/strategy-builder/StrategyHeader";
import { SimpleStrategyBuilder } from "@/components/strategy-builder/SimpleStrategyBuilder";
import { GeneralInfoSection } from "@/components/strategy-builder/GeneralInfoSection";
import { EntryConditionsSection } from "@/components/strategy-builder/EntryConditionsSection";
import { ExitConditionsSection } from "@/components/strategy-builder/ExitConditionsSection";
import { PositionSizingSection } from "@/components/strategy-builder/PositionSizingSection";
import { BacktestResultsSection } from "@/components/strategy-builder/BacktestResultsSection";
import { CodeExportModal } from "@/components/strategy-builder/CodeExportModal";
import { TemplatesModal } from "@/components/strategy-builder/TemplatesModal";
import { STRATEGY_TEMPLATES } from "@/lib/strategy-templates";
import { formatINR, getInstrumentLotSize } from "@/lib/formatters";
import { loadPaperStateFromDb, savePaperState, saveAccountToDb } from "@/lib/paperTradingStorage";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";

function createBlankStrategy(): StrategyConfig {
  return {
    id: "strat-blank",
    name: "New Strategy",
    description: "",
    category: "momentum",
    assetClass: "nse_fno",
    symbol: "NIFTY 50",
    productType: "MIS",
    currency: "INR",
    timeframe: "5m",
    direction: "long",
    orderType: "market",
    initialCapital: 100000,
    entryGroups: [
      {
        id: "group-1",
        logic: "AND",
        conditions: [
          {
            id: "cond-1",
            leftIndicator: {
              id: "ind-close",
              type: "PRICE_CLOSE",
              params: {},
              offset: 1,
            },
            operator: "crosses_above",
            compareType: "indicator",
            rightIndicator: {
              id: "ind-ema",
              type: "EMA",
              params: { period: 20 },
              offset: 1,
            },
          },
        ],
      },
    ],
    customExitEnabled: false,
    exitGroups: [],
    riskManagement: {
      stopLossType: "percentage",
      stopLossValue: 1.0,
      takeProfitType: "percentage",
      takeProfitValue: 2.5,
      useTrailingStop: true,
      trailingStopActivation: 1.2,
      trailingStopStep: 0.5,
      intradaySquareOff: true,
      squareOffTime: "15:15",
      maxHoldingBars: 36,
      maxDailyDrawdownPct: 3.0,
      maxConsecutiveLosses: 3,
    },
    positionSizing: {
      sizingType: "lots",
      sizingValue: 1,
      lotSize: 65,
      maxOpenPositions: 1,
      maxLeverage: 1,
      slippagePct: 0.02,
      feePerOrder: 20,
      sttTaxPct: 0.0125,
    },
    status: "draft",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

export default function StrategyBuilderPage() {
  // Strategy state
  const [strategy, setStrategy] = useState<StrategyConfig>(() => createBlankStrategy());
  const [savedStrategies, setSavedStrategies] = useState<StrategyConfig[]>([]);
  const [dbSource, setDbSource] = useState<"database" | "local">("local");

  // Mode state: Simple Mode by default for clean, zero-jargon builder
  const [isSimpleMode, setIsSimpleMode] = useState<boolean>(true);

  // Backtest result state (null initially - NO dummy data)
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [isBacktesting, setIsBacktesting] = useState(false);

  // Active section tab ("all" or "1" | "2" | "3" | "4" | "5")
  const [activeTab, setActiveTab] = useState<"all" | "1" | "2" | "3" | "4" | "5">("all");

  // Modals & UI status
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isCodeExportOpen, setIsCodeExportOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [deployBotSuccess, setDeployBotSuccess] = useState<string | null>(null);

  // Load symbol or template from URL query param if present, or load saved strategies from DB on mount
  useEffect(() => {
    let mounted = true;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const symbolParam = params.get("symbol");
      const templateId = params.get("template");

      let baseStrat: StrategyConfig | null = null;
      if (templateId) {
        const found = STRATEGY_TEMPLATES.find((t) => t.id === templateId);
        if (found) baseStrat = { ...found };
      }

      if (symbolParam) {
        const cleanSym = symbolParam.toUpperCase().trim();
        const lot = getInstrumentLotSize(cleanSym);
        const isFno = ["NIFTY50", "BANKNIFTY", "SENSEX", "FINNIFTY", "CRUDEOIL", "GOLD"].includes(cleanSym);
        const initial = baseStrat || createBlankStrategy();

        if (mounted) {
          setStrategy({
            ...initial,
            id: `strat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: `${cleanSym} Momentum Strategy`,
            symbol: cleanSym,
            assetClass: isFno ? "nse_fno" : "nse_equity",
            positionSizing: {
              ...initial.positionSizing,
              lotSize: lot,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          getStrategiesFromDb().then(({ strategies, source }) => {
            if (mounted) {
              setDbSource(source);
              if (strategies.length > 0) setSavedStrategies(strategies);
            }
          });
        }
        return () => {
          mounted = false;
        };
      }

      if (baseStrat && mounted) {
        setStrategy({
          ...baseStrat,
          id: `strat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        getStrategiesFromDb().then(({ strategies, source }) => {
          if (mounted) {
            setDbSource(source);
            if (strategies.length > 0) setSavedStrategies(strategies);
          }
        });
        return () => {
          mounted = false;
        };
      }
    }

    getStrategiesFromDb().then(({ strategies, source }) => {
      if (!mounted) return;
      setDbSource(source);
      if (strategies.length > 0) {
        setSavedStrategies(strategies);
        setStrategy(strategies[0]);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Update strategy state handler
  const handleUpdateStrategy = (updated: Partial<StrategyConfig>) => {
    setStrategy((prev) => ({
      ...prev,
      ...updated,
      updatedAt: new Date().toISOString(),
    }));
  };

  // Run backtest simulation on real market data and save result to database
  const handleRunBacktest = async () => {
    setIsBacktesting(true);
    try {
      // 1. Fetch real historical candles for this strategy's symbol and timeframe
      let realBars: any[] | undefined = undefined;
      try {
        const res = await fetch(
          `/api/market-data/history?symbol=${encodeURIComponent(strategy.symbol)}&timeframe=${strategy.timeframe}&limit=150`
        );
        if (res.ok) {
          const json = await res.json();
          if (json.candles && Array.isArray(json.candles) && json.candles.length >= 10) {
            realBars = json.candles.map((c: any) => ({
              time: c.time,
              timestamp: c.timestamp,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.volume,
            }));
          }
        }
      } catch (e) {
        console.warn("Could not fetch real bars for strategy backtest:", e);
      }

      const res = runBacktest(strategy, 200, realBars);
      setBacktestResult(res);
      handleUpdateStrategy({ status: "backtested" });

      // 2. Save backtest record to Supabase database
      await saveBacktestToDb(strategy, res);

      // If in tabbed view, switch to results tab
      if (activeTab !== "all") {
        setActiveTab("5");
      }
    } catch (err) {
      console.error("Backtest simulation error:", err);
    } finally {
      setIsBacktesting(false);
    }
  };

  // Save strategy to Database (Supabase)
  const handleSave = async () => {
    setSaveStatus("Saving...");
    try {
      const res = await saveStrategyToDb(strategy);
      setDbSource(res.source);
      setSaveStatus(res.source === "database" ? "Synced to DB!" : "Saved locally");

      // Update in-memory list
      setSavedStrategies((prev) => {
        const idx = prev.findIndex((s) => s.id === strategy.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = strategy;
          return next;
        }
        return [strategy, ...prev];
      });

      setTimeout(() => setSaveStatus(null), 3000);
    } catch (e) {
      console.error("Error saving strategy:", e);
      setSaveStatus("Save failed");
      setTimeout(() => setSaveStatus(null), 2500);
    }
  };

  // Delete strategy from Database
  const handleDeleteStrategy = async (id: string) => {
    await deleteStrategyFromDb(id);
    const updated = savedStrategies.filter((s) => s.id !== id);
    setSavedStrategies(updated);
    if (strategy.id === id) {
      if (updated.length > 0) {
        setStrategy(updated[0]);
      } else {
        setStrategy(createBlankStrategy());
      }
      setBacktestResult(null);
    }
  };

  // Reset strategy to blank
  const handleReset = () => {
    if (confirm("Reset current canvas to a new blank strategy?")) {
      setStrategy(createBlankStrategy());
      setBacktestResult(null);
    }
  };

  // Create new blank strategy
  const handleNewBlankStrategy = () => {
    const blank = createBlankStrategy();
    setStrategy(blank);
    setBacktestResult(null);
  };

  // Select a saved strategy from database
  const handleSelectStrategy = (selected: StrategyConfig) => {
    setStrategy(selected);
    setBacktestResult(null);
  };

  // Load a chosen template preset
  const handleSelectTemplate = (template: StrategyConfig) => {
    setStrategy({
      ...template,
      id: `strat-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setBacktestResult(null);
  };

  const handleDeployToPaperBot = async () => {
    try {
      const { state: currentPaperState } = await loadPaperStateFromDb();
      const updated = {
        ...currentPaperState,
        botActive: true,
        botStrategyId: strategy.name.toLowerCase().includes("supertrend")
          ? "supertrend_breakout"
          : strategy.name.toLowerCase().includes("ema")
          ? "ema_crossover"
          : "rsi_mean_reversion",
      };
      savePaperState(updated);
      await saveAccountToDb(
        updated.initialBalance,
        updated.cashBalance,
        true,
        updated.botStrategyId,
        updated.botSpeedSec
      );
      setDeployBotSuccess(`Strategy "${strategy.name}" is now running in Paper Trading!`);
      setTimeout(() => setDeployBotSuccess(null), 5000);
    } catch (err) {
      console.warn("Deploy bot error:", err);
    }
  };

  const navSections: {
    id: "all" | "1" | "2" | "3" | "4" | "5";
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "all", label: "Overview", icon: Layers },
    { id: "1", label: "01 Setup", icon: Sliders },
    { id: "2", label: "02 Entry Rules", icon: TrendingUp },
    { id: "3", label: "03 Risk & Exits", icon: ShieldAlert },
    { id: "4", label: "04 Position Sizing", icon: PieChart },
    { id: "5", label: "05 Backtest", icon: BarChart3 },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#12141a] text-[#e0e0e0] font-sans">
      {/* Top Header */}
      <StrategyHeader
        strategy={strategy}
        savedStrategies={savedStrategies}
        isSimpleMode={isSimpleMode}
        onToggleMode={setIsSimpleMode}
        onUpdateStrategy={handleUpdateStrategy}
        onSelectStrategy={handleSelectStrategy}
        onNewBlankStrategy={handleNewBlankStrategy}
        onDeleteStrategy={handleDeleteStrategy}
        onRunBacktest={handleRunBacktest}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onOpenCodeExport={() => setIsCodeExportOpen(true)}
        onSave={handleSave}
        onReset={handleReset}
        isBacktesting={isBacktesting}
        saveStatus={saveStatus}
        dbSource={dbSource}
      />

      {deployBotSuccess && (
        <div className="mx-6 mt-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{deployBotSuccess}</span>
          </div>
          <Link
            href="/paper-trading"
            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-[11px] hover:bg-emerald-400 shrink-0"
          >
            <span>Open Paper Trading</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {backtestResult && !deployBotSuccess && (
        <div className="mx-6 mt-3 p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Backtest complete for {strategy.symbol}: {backtestResult.metrics.totalTrades} trades,{" "}
              {backtestResult.metrics.winRate}% win rate, {formatINR(backtestResult.metrics.netProfit)}{" "}
              net profit.
            </span>
          </div>
          <button
            onClick={handleDeployToPaperBot}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] transition-all shadow-sm shadow-emerald-500/20 active:scale-98 shrink-0"
          >
            <span>Deploy to Paper Bot</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* When in Simple Mode, show the clean 3-step intuitive builder */}
      {isSimpleMode ? (
        <div className="flex-1 overflow-y-auto p-6">
          <SimpleStrategyBuilder
            strategy={strategy}
            onChange={handleUpdateStrategy}
            onRunBacktest={handleRunBacktest}
            isBacktesting={isBacktesting}
            backtestResult={backtestResult}
            onSelectTemplate={handleSelectTemplate}
            onSwitchToAdvanced={() => setIsSimpleMode(false)}
          />
        </div>
      ) : (
        <>
          {/* Section Sub-Navigation Tabs (Advanced Mode only) */}
          <div className="bg-[#0b0e14] border-b border-[#1a2230] px-6 py-2.5 flex items-center justify-between gap-4 overflow-x-auto select-none">
            <div className="flex items-center gap-1.5 shrink-0">
              {navSections.map((sec) => {
                const Icon = sec.icon;
                const isActive = activeTab === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveTab(sec.id)}
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
              <span>Advanced Strategy Builder</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-[#94a3b8] font-mono">{strategy.name}</span>
            </div>
          </div>

          {/* Main Content Scroll Area (Advanced Mode) */}
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
                symbol={strategy.symbol}
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
        </>
      )}

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
