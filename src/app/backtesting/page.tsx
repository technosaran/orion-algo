"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  AVAILABLE_STRATEGIES,
  AVAILABLE_SYMBOLS,
  STRATEGY_PRESETS,
  PresetStrategy,
  runServerOrClientBacktest,
  runClientBacktest,
} from "@/lib/backtest/engine";
import { BacktestConfig, BacktestResult } from "@/lib/backtest/types";
import { BacktestHeader } from "@/components/backtesting/BacktestHeader";
import { StrategyConfigPanel } from "@/components/backtesting/StrategyConfigPanel";
import { MetricsSummaryCards } from "@/components/backtesting/MetricsSummaryCards";
import { EquityChart } from "@/components/backtesting/EquityChart";
import { TradesTable } from "@/components/backtesting/TradesTable";

export default function BacktestingPage() {
  const [config, setConfig] = useState<BacktestConfig>({
    strategy: "sma_crossover",
    symbol: "BTC/USDT",
    timeframe: "1h",
    initialCapital: 10000,
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
  const [preferServer, setPreferServer] = useState(false);

  // Run backtest function
  const executeSimulation = useCallback(
    async (currentConfig: BacktestConfig) => {
      setIsRunning(true);
      try {
        const simResult = await runServerOrClientBacktest(
          currentConfig,
          preferServer
        );
        setResult(simResult);
      } catch (err) {
        console.error("Backtest failed, falling back to client engine:", err);
        const fallback = runClientBacktest(currentConfig);
        setResult(fallback);
      } finally {
        setIsRunning(false);
      }
    },
    [preferServer]
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
    <div className="flex-1 overflow-y-auto bg-[#080a0f] text-[#cbd5e1] p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header section with presets and primary action */}
      <BacktestHeader
        onRun={() => executeSimulation(config)}
        isRunning={isRunning}
        activePresetId={activePresetId}
        onSelectPreset={handleSelectPreset}
        preferServer={preferServer}
        onToggleEngine={() => setPreferServer(!preferServer)}
        lastExecutionSource={result?.source}
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
