"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import {
  AVAILABLE_STRATEGIES,
  AVAILABLE_SYMBOLS,
  STRATEGY_PRESETS,
  PresetStrategy,
  runServerOrClientBacktest,
} from "@/lib/backtest/engine";
import { BacktestConfig, BacktestResult } from "@/lib/backtest/types";
import { BacktestHeader } from "@/components/backtesting/BacktestHeader";
import { StrategyConfigPanel } from "@/components/backtesting/StrategyConfigPanel";
import { MetricsSummaryCards } from "@/components/backtesting/MetricsSummaryCards";
import { EquityChart } from "@/components/backtesting/EquityChart";
import { TradesTable } from "@/components/backtesting/TradesTable";

function BacktestContent() {
  const searchParams = useSearchParams();
  const paramSymbol = searchParams.get("symbol");
  const paramTimeframe = searchParams.get("timeframe");

  const [config, setConfig] = useState<BacktestConfig>({
    strategy: "sma_crossover",
    symbol: paramSymbol || "NIFTY50",
    timeframe: (paramTimeframe as any) || "1h",
    initialCapital: 500000,
    dateRangeDays: 90,
    slippagePct: 0.05,
    feePct: 0.075,
    leverage: 1.0,
    stopLossPct: 2.5,
    takeProfitPct: 6.0,
    trailingStopPct: 1.5,
    strategyParams: {
      fast_period: 20,
      slow_period: 50,
    },
  });

  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  // Sync state if query params change
  useEffect(() => {
    if (paramSymbol && paramSymbol !== config.symbol) {
      const updated = {
        ...config,
        symbol: paramSymbol,
        ...(paramTimeframe ? { timeframe: paramTimeframe as any } : {}),
      };
      setConfig(updated);
      executeSimulation(updated);
    }
  }, [paramSymbol, paramTimeframe]);

  // Run backtest function with real market data and Supabase persistence
  const executeSimulation = useCallback(
    async (currentConfig: BacktestConfig) => {
      setIsRunning(true);
      try {
        const simResult = await runServerOrClientBacktest(currentConfig, false);
        setResult(simResult);
      } catch (err) {
        console.error("Backtest failed:", err);
      } finally {
        setIsRunning(false);
      }
    },
    []
  );

  // Run initial simulation on mount
  useEffect(() => {
    executeSimulation(config);
  }, []);

  const handleSelectPreset = (preset: PresetStrategy) => {
    setActivePresetId(preset.id);
    const updated: BacktestConfig = {
      ...config,
      ...preset.config,
      strategyParams: {
        ...config.strategyParams,
        ...(preset.config.strategyParams || {}),
      },
    };
    setConfig(updated);
    executeSimulation(updated);
  };

  const handleConfigChange = (newConfig: BacktestConfig) => {
    setActivePresetId(null);
    setConfig(newConfig);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#12141a] text-[#e0e0e0] p-4 md:p-6 lg:p-8 space-y-6 font-sans">
      {/* Header section with presets and primary action */}
      <BacktestHeader
        onRun={() => executeSimulation(config)}
        isRunning={isRunning}
        activePresetId={activePresetId}
        onSelectPreset={handleSelectPreset}
        dataSource={result?.dataSource || result?.summary?.dataSource}
        isSynthetic={result?.isSynthetic ?? result?.summary?.isSynthetic}
      />

      {/* Strategy and Risk Configuration Panel */}
      <StrategyConfigPanel
        config={config}
        onChange={handleConfigChange}
        strategies={AVAILABLE_STRATEGIES}
        symbols={AVAILABLE_SYMBOLS}
        onRun={() => executeSimulation(config)}
        isRunning={isRunning}
      />

      {/* Diagnostic banner if no signals/trades generated */}
      {result && result.trades.length === 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs shadow-md">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <span className="font-semibold block text-sm text-white mb-0.5">
              No Trade Signals Triggered in Selected Window
            </span>
            <span>
              The strategy parameters did not generate any entries over the {config.dateRangeDays}-day lookback on the {config.timeframe} timeframe. Try increasing the Lookback Period slider (e.g. 180–365 days), choosing a faster timeframe (e.g. 15m), or selecting one of the tested Presets above.
            </span>
          </div>
        </div>
      )}

      {/* Performance Summary KPI Cards */}
      {result && result.summary && (
        <MetricsSummaryCards summary={result.summary} />
      )}

      {/* Equity & Drawdown Chart */}
      {result && (
        <EquityChart
          equityCurve={result.equityCurve}
          initialCapital={result.summary.initialCapital}
          monthlyReturns={result.monthlyReturns}
        />
      )}

      {/* Trade Log & Execution Ledger */}
      {result && (
        <TradesTable trades={result.trades} symbol={result.symbol} />
      )}
    </div>
  );
}

export default function BacktestingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center bg-[#080a0f] text-[#64748b] font-mono text-sm">
          Loading Backtesting Engine...
        </div>
      }
    >
      <BacktestContent />
    </Suspense>
  );
}
