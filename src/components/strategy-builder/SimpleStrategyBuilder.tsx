"use client";

import React, { useMemo } from "react";
import {
  Sparkles,
  Play,
  TrendingUp,
  Shield,
  Target,
  Clock,
  Coins,
  ArrowRight,
  CheckCircle2,
  SlidersHorizontal,
  Flame,
  Zap,
  BarChart2,
  Layers,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import { StrategyConfig, BacktestResult, Timeframe } from "@/types/strategy";
import { formatINR, getInstrumentLotSize } from "@/lib/formatters";
import { STRATEGY_TEMPLATES } from "@/lib/strategy-templates";

interface SimpleStrategyBuilderProps {
  strategy: StrategyConfig;
  onChange: (updated: Partial<StrategyConfig>) => void;
  onRunBacktest: () => void;
  isBacktesting: boolean;
  backtestResult: BacktestResult | null;
  onSelectTemplate: (template: StrategyConfig) => void;
  onSwitchToAdvanced: () => void;
}

interface SimpleRuleOption {
  id: string;
  label: string;
  subtitle: string;
  badge: string;
  category: "trend" | "momentum" | "reversal";
  buildGroup: () => StrategyConfig["entryGroups"];
}

const SIMPLE_RULES: SimpleRuleOption[] = [
  {
    id: "ema_20_cross",
    label: "Price crosses above 20 EMA",
    subtitle: "Classic trend-following breakout when price surges above the 20-period average",
    badge: "Trend Following",
    category: "trend",
    buildGroup: () => [
      {
        id: "group-1",
        logic: "AND",
        conditions: [
          {
            id: "cond-1",
            leftIndicator: { id: "ind-close", type: "PRICE_CLOSE", params: {}, offset: 1 },
            operator: "crosses_above",
            compareType: "indicator",
            rightIndicator: { id: "ind-ema", type: "EMA", params: { period: 20 }, offset: 1 },
          },
        ],
      },
    ],
  },
  {
    id: "supertrend_bullish",
    label: "Supertrend Turns Green (Bullish)",
    subtitle: "Enters immediately when the Supertrend indicator flips to an uptrend",
    badge: "Momentum",
    category: "momentum",
    buildGroup: () => [
      {
        id: "group-1",
        logic: "AND",
        conditions: [
          {
            id: "cond-1",
            leftIndicator: { id: "ind-close", type: "PRICE_CLOSE", params: {}, offset: 1 },
            operator: "crosses_above",
            compareType: "indicator",
            rightIndicator: {
              id: "ind-st",
              type: "SUPERTREND",
              params: { period: 10, multiplier: 3 },
              offset: 1,
            },
          },
        ],
      },
    ],
  },
  {
    id: "rsi_oversold",
    label: "RSI Dips Below 30 (Buy the Dip)",
    subtitle: "Reversal strategy that catches oversold bounces before price rebounds",
    badge: "Mean Reversion",
    category: "reversal",
    buildGroup: () => [
      {
        id: "group-1",
        logic: "AND",
        conditions: [
          {
            id: "cond-1",
            leftIndicator: { id: "ind-rsi", type: "RSI", params: { period: 14 }, offset: 1 },
            operator: "less_than",
            compareType: "value",
            rightValue: 30,
          },
        ],
      },
    ],
  },
  {
    id: "vwap_cross",
    label: "Price Crosses Above VWAP",
    subtitle: "High-probability intraday institutional buying confirmation",
    badge: "Intraday Strength",
    category: "momentum",
    buildGroup: () => [
      {
        id: "group-1",
        logic: "AND",
        conditions: [
          {
            id: "cond-1",
            leftIndicator: { id: "ind-close", type: "PRICE_CLOSE", params: {}, offset: 1 },
            operator: "crosses_above",
            compareType: "indicator",
            rightIndicator: { id: "ind-vwap", type: "VWAP", params: {}, offset: 1 },
          },
        ],
      },
    ],
  },
  {
    id: "ema_9_21_cross",
    label: "9 EMA Crosses Above 21 EMA",
    subtitle: "Fast momentum crossover used by day traders for quick scalp entries",
    badge: "Fast Scalp",
    category: "trend",
    buildGroup: () => [
      {
        id: "group-1",
        logic: "AND",
        conditions: [
          {
            id: "cond-1",
            leftIndicator: { id: "ind-ema9", type: "EMA", params: { period: 9 }, offset: 1 },
            operator: "crosses_above",
            compareType: "indicator",
            rightIndicator: { id: "ind-ema21", type: "EMA", params: { period: 21 }, offset: 1 },
          },
        ],
      },
    ],
  },
];

const POPULAR_INSTRUMENTS = [
  { symbol: "NIFTY 50", type: "nse_fno", label: "NIFTY 50", desc: "Index Futures & Options" },
  { symbol: "BANKNIFTY", type: "nse_fno", label: "BANKNIFTY", desc: "High Volatility Bank Index" },
  { symbol: "SENSEX", type: "bse_equity", label: "SENSEX", desc: "BSE Benchmark 30 Index" },
  { symbol: "FINNIFTY", type: "nse_fno", label: "FINNIFTY", desc: "Financial Services" },
  { symbol: "RELIANCE", type: "nse_equity", label: "RELIANCE", desc: "Top Heavyweight Stock" },
  { symbol: "TCS", type: "nse_equity", label: "TCS", desc: "IT Bluechip Stock" },
];

const TIMEFRAME_OPTIONS: { id: Timeframe; label: string; desc: string }[] = [
  { id: "3m", label: "3 Min", desc: "Fast Scalping" },
  { id: "5m", label: "5 Min", desc: "Standard Intraday" },
  { id: "15m", label: "15 Min", desc: "Swing & Trends" },
  { id: "1D", label: "1 Day", desc: "Positional Delivery" },
];

const CAPITAL_PRESETS = [50000, 100000, 200000, 500000];
const TARGET_PRESETS = [1.5, 2.0, 3.0, 5.0];
const STOP_LOSS_PRESETS = [0.8, 1.0, 1.5, 2.0];

export function SimpleStrategyBuilder({
  strategy,
  onChange,
  onRunBacktest,
  isBacktesting,
  backtestResult,
  onSelectTemplate,
  onSwitchToAdvanced,
}: SimpleStrategyBuilderProps) {
  // Detect which simple rule matches current strategy entryGroups
  const currentRuleId = useMemo(() => {
    const firstCond = strategy.entryGroups?.[0]?.conditions?.[0];
    if (!firstCond) return "ema_20_cross";

    if (
      firstCond.leftIndicator?.type === "PRICE_CLOSE" &&
      firstCond.rightIndicator?.type === "EMA" &&
      Number(firstCond.rightIndicator?.params?.period) === 20
    ) {
      return "ema_20_cross";
    }
    if (firstCond.rightIndicator?.type === "SUPERTREND") {
      return "supertrend_bullish";
    }
    if (firstCond.leftIndicator?.type === "RSI" && firstCond.operator === "less_than") {
      return "rsi_oversold";
    }
    if (firstCond.rightIndicator?.type === "VWAP") {
      return "vwap_cross";
    }
    if (
      firstCond.leftIndicator?.type === "EMA" &&
      Number(firstCond.leftIndicator?.params?.period) === 9 &&
      firstCond.rightIndicator?.type === "EMA" &&
      Number(firstCond.rightIndicator?.params?.period) === 21
    ) {
      return "ema_9_21_cross";
    }
    return "custom";
  }, [strategy.entryGroups]);

  // Generate plain English explanation of the strategy
  const plainEnglishExplanation = useMemo(() => {
    const symbol = strategy.symbol || "NIFTY 50";
    const tf = strategy.timeframe || "5m";
    const dir =
      strategy.direction === "long"
        ? "BUY (Long)"
        : strategy.direction === "short"
        ? "SELL (Short)"
        : "BUY or SELL";

    let ruleText = "price crosses above 20 EMA";
    if (currentRuleId === "ema_20_cross") {
      ruleText = "price crosses above the 20-period EMA";
    } else if (currentRuleId === "supertrend_bullish") {
      ruleText = "the Supertrend indicator turns bullish (Green)";
    } else if (currentRuleId === "rsi_oversold") {
      ruleText = "RSI drops below 30 into oversold territory";
    } else if (currentRuleId === "vwap_cross") {
      ruleText = "price crosses above the Intraday VWAP line";
    } else if (currentRuleId === "ema_9_21_cross") {
      ruleText = "9 EMA crosses above 21 EMA";
    } else {
      ruleText = "the custom technical condition triggers";
    }

    const lotOrQty =
      strategy.assetClass === "nse_equity"
        ? `shares worth ${formatINR(strategy.initialCapital * 0.5)}`
        : `${strategy.positionSizing?.sizingValue || 1} lot(s)`;

    const tp = strategy.riskManagement?.takeProfitValue || 2.0;
    const sl = strategy.riskManagement?.stopLossValue || 1.0;
    const isSquareOff = strategy.riskManagement?.intradaySquareOff;

    return `When ${symbol} confirms that ${ruleText} on ${tf} candles, automatically execute a ${dir} trade for ${lotOrQty}. Exit with profit at +${tp}%, or cut loss at -${sl}%. ${
      isSquareOff
        ? "Any open trades will automatically close before 3:15 PM IST (No overnight risk)."
        : "Positions may carry overnight."
    }`;
  }, [strategy, currentRuleId]);

  // Handle instrument change
  const handleSelectInstrument = (inst: (typeof POPULAR_INSTRUMENTS)[0]) => {
    const lotSize = getInstrumentLotSize(inst.symbol);
    onChange({
      symbol: inst.symbol,
      assetClass: inst.type as any,
      productType: inst.type === "nse_equity" ? "CNC" : "MIS",
      positionSizing: {
        ...strategy.positionSizing,
        lotSize,
      },
    });
  };

  // Handle rule change
  const handleSelectRule = (ruleId: string) => {
    const found = SIMPLE_RULES.find((r) => r.id === ruleId);
    if (found) {
      onChange({
        entryGroups: found.buildGroup(),
      });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Popular 1-Click Starter Recipes */}
      <div className="bg-[#0b0e14] border border-[#1a2230] rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Popular 1-Click Strategies</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Ready to Test
            </span>
          </div>
          <button
            onClick={onSwitchToAdvanced}
            className="flex items-center gap-1.5 text-xs text-[#94a3b8] hover:text-emerald-400 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Open Advanced Mode</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STRATEGY_TEMPLATES.slice(0, 4).map((t) => (
            <button
              key={t.id}
              onClick={() => onSelectTemplate(t)}
              className={`text-left p-3.5 rounded-xl border transition-all duration-200 group relative ${
                strategy.name === t.name
                  ? "bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/30"
                  : "bg-[#101725] hover:bg-[#141f33] border-[#1e2a3d] hover:border-emerald-500/30"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                  {t.symbol}
                </span>
                <span className="text-[10px] text-[#64748b] uppercase tracking-wide">
                  {t.timeframe}
                </span>
              </div>
              <div className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors line-clamp-1 mb-1">
                {t.name}
              </div>
              <p className="text-[11px] text-[#94a3b8] line-clamp-2 leading-relaxed">
                {t.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Live Plain-English Translation Banner */}
      <div className="bg-gradient-to-r from-emerald-950/30 via-[#0b141e] to-[#0e1726] border border-emerald-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 mt-0.5">
            <Zap className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                What this strategy does in plain words
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <p className="text-sm font-medium text-slate-200 leading-relaxed">
              "{plainEnglishExplanation}"
            </p>
          </div>
        </div>
      </div>

      {/* 3-Step Simple Builder Canvas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* STEP 1: What to Trade */}
        <div className="bg-[#0b0e14] border border-[#1a2230] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#1a2230] pb-3">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold">
              1
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">What to Trade</h4>
              <p className="text-[11px] text-[#64748b]">Select asset & budget</p>
            </div>
          </div>

          {/* Instrument Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#94a3b8]">Instrument</label>
            <div className="grid grid-cols-2 gap-1.5">
              {POPULAR_INSTRUMENTS.map((inst) => {
                const isSelected = strategy.symbol === inst.symbol;
                return (
                  <button
                    key={inst.symbol}
                    onClick={() => handleSelectInstrument(inst)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                      isSelected
                        ? "bg-emerald-500/20 border border-emerald-500/50 text-white font-semibold"
                        : "bg-[#121927] hover:bg-[#182337] border border-[#1e2a3d] text-[#94a3b8] hover:text-white"
                    }`}
                  >
                    <div className="font-semibold">{inst.label}</div>
                    <div className="text-[10px] text-[#64748b] truncate">{inst.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timeframe Selector */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-medium text-[#94a3b8]">Candle Speed</label>
            <div className="grid grid-cols-2 gap-1.5">
              {TIMEFRAME_OPTIONS.map((tf) => {
                const isSelected = strategy.timeframe === tf.id;
                return (
                  <button
                    key={tf.id}
                    onClick={() => onChange({ timeframe: tf.id })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-semibold"
                        : "bg-[#121927] hover:bg-[#182337] border border-[#1e2a3d] text-[#94a3b8]"
                    }`}
                  >
                    <div>{tf.label}</div>
                    <div className="text-[9px] text-[#64748b]">{tf.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Capital Selector */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-medium text-[#94a3b8]">Initial Capital (₹)</label>
            <div className="grid grid-cols-2 gap-1.5">
              {CAPITAL_PRESETS.map((cap) => {
                const isSelected = strategy.initialCapital === cap;
                return (
                  <button
                    key={cap}
                    onClick={() => onChange({ initialCapital: cap })}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-semibold"
                        : "bg-[#121927] hover:bg-[#182337] border border-[#1e2a3d] text-[#94a3b8]"
                    }`}
                  >
                    {formatINR(cap)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* STEP 2: When to Buy */}
        <div className="bg-[#0b0e14] border border-[#1a2230] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#1a2230] pb-3">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold">
              2
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">When to Buy</h4>
              <p className="text-[11px] text-[#64748b]">Select plain entry rule</p>
            </div>
          </div>

          <div className="space-y-2">
            {SIMPLE_RULES.map((rule) => {
              const isSelected = currentRuleId === rule.id;
              return (
                <button
                  key={rule.id}
                  onClick={() => handleSelectRule(rule.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    isSelected
                      ? "bg-emerald-500/15 border-emerald-500/50 ring-1 ring-emerald-500/30 shadow-md"
                      : "bg-[#121927] hover:bg-[#182337] border-[#1e2a3d] hover:border-emerald-500/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-semibold ${
                        isSelected ? "text-emerald-300" : "text-white"
                      }`}
                    >
                      {rule.label}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1c283c] text-[#94a3b8]">
                      {rule.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748b] leading-tight">{rule.subtitle}</p>
                </button>
              );
            })}

            {currentRuleId === "custom" && (
              <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-800/40 text-cyan-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Custom advanced rule active from template</span>
              </div>
            )}
          </div>
        </div>

        {/* STEP 3: When to Exit */}
        <div className="bg-[#0b0e14] border border-[#1a2230] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#1a2230] pb-3">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold">
              3
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">When to Exit</h4>
              <p className="text-[11px] text-[#64748b]">Profit target & stop loss</p>
            </div>
          </div>

          {/* Profit Target */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <label className="font-medium text-[#94a3b8] flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                <span>Take Profit Target</span>
              </label>
              <span className="font-bold text-emerald-400">
                +{strategy.riskManagement?.takeProfitValue || 2.0}%
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {TARGET_PRESETS.map((tp) => {
                const isSelected = strategy.riskManagement?.takeProfitValue === tp;
                return (
                  <button
                    key={tp}
                    onClick={() =>
                      onChange({
                        riskManagement: { ...strategy.riskManagement, takeProfitValue: tp },
                      })
                    }
                    className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-emerald-500/25 border border-emerald-500/50 text-emerald-300 font-bold"
                        : "bg-[#121927] hover:bg-[#182337] border border-[#1e2a3d] text-[#94a3b8]"
                    }`}
                  >
                    +{tp}%
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stop Loss */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <label className="font-medium text-[#94a3b8] flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-rose-400" />
                <span>Stop Loss (Safety Cut)</span>
              </label>
              <span className="font-bold text-rose-400">
                -{strategy.riskManagement?.stopLossValue || 1.0}%
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {STOP_LOSS_PRESETS.map((sl) => {
                const isSelected = strategy.riskManagement?.stopLossValue === sl;
                return (
                  <button
                    key={sl}
                    onClick={() =>
                      onChange({
                        riskManagement: { ...strategy.riskManagement, stopLossValue: sl },
                      })
                    }
                    className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-rose-500/25 border border-rose-500/50 text-rose-300 font-bold"
                        : "bg-[#121927] hover:bg-[#182337] border border-[#1e2a3d] text-[#94a3b8]"
                    }`}
                  >
                    -{sl}%
                  </button>
                );
              })}
            </div>
          </div>

          {/* Auto Square-off Switch */}
          <div className="pt-2 border-t border-[#1a2230]">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={strategy.riskManagement?.intradaySquareOff ?? true}
                onChange={(e) =>
                  onChange({
                    riskManagement: {
                      ...strategy.riskManagement,
                      intradaySquareOff: e.target.checked,
                    },
                  })
                }
                className="mt-0.5 rounded border-[#222e42] text-emerald-500 focus:ring-0 bg-[#131b2a] w-4 h-4 cursor-pointer"
              />
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-white">Auto Close at 3:15 PM</div>
                <div className="text-[10px] text-[#64748b]">
                  Prevents holding overnight risks on intraday trades
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Main Call to Action: Run Backtest */}
      <div className="bg-[#0b0e14] border border-[#1a2230] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>Ready to see how this strategy performs?</span>
          </h3>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Simulate this strategy on real historical candle data and verify win rate & profit.
          </p>
        </div>

        <button
          onClick={onRunBacktest}
          disabled={isBacktesting}
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-50 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] shrink-0"
        >
          {isBacktesting ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              <span>Simulating Market Trades...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Test Strategy (Run Backtest)</span>
            </>
          )}
        </button>
      </div>

      {/* Backtest Results Summary Display (When Available) */}
      {backtestResult && (
        <div className="bg-[#0b0e14] border border-emerald-500/30 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-[#1a2230] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <BarChart2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Backtest Simulation Results</h4>
                <p className="text-xs text-[#64748b]">
                  Performance on {strategy.symbol} ({strategy.timeframe} candles)
                </p>
              </div>
            </div>

            <div className="text-right">
              <div
                className={`text-lg font-mono font-bold ${
                  backtestResult.metrics.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatINR(backtestResult.metrics.netProfit, { showSign: true })}
              </div>
              <div className="text-xs font-semibold text-[#94a3b8]">
                {backtestResult.metrics.netProfitPct >= 0 ? "+" : ""}
                {backtestResult.metrics.netProfitPct.toFixed(2)}% Net Return
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-[#121927] border border-[#1e2a3d]">
              <div className="text-[11px] text-[#64748b] mb-1">Win Rate</div>
              <div className="text-base font-bold font-mono text-emerald-400">
                {backtestResult.metrics.winRate.toFixed(1)}%
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#121927] border border-[#1e2a3d]">
              <div className="text-[11px] text-[#64748b] mb-1">Total Trades</div>
              <div className="text-base font-bold font-mono text-white">
                {backtestResult.metrics.totalTrades}
                <span className="text-[10px] text-[#64748b] ml-1">
                  ({backtestResult.metrics.winningTrades}W / {backtestResult.metrics.losingTrades}L)
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#121927] border border-[#1e2a3d]">
              <div className="text-[11px] text-[#64748b] mb-1">Profit Factor</div>
              <div className="text-base font-bold font-mono text-cyan-400">
                {backtestResult.metrics.profitFactor.toFixed(2)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#121927] border border-[#1e2a3d]">
              <div className="text-[11px] text-[#64748b] mb-1">Max Drawdown</div>
              <div className="text-base font-bold font-mono text-amber-400">
                -{backtestResult.metrics.maxDrawdownPct.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Recent Trades Preview */}
          {backtestResult.trades.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-xs font-semibold text-[#94a3b8] flex items-center justify-between">
                <span>Recent Trades Log</span>
                <span className="text-[10px] text-[#64748b]">
                  Showing last {Math.min(5, backtestResult.trades.length)} of{" "}
                  {backtestResult.trades.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {backtestResult.trades.slice(-5).map((t, idx) => (
                  <div
                    key={t.id || idx}
                    className="p-2.5 rounded-lg bg-[#121927] border border-[#1e2a3d] flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          t.direction === "LONG"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {t.direction}
                      </span>
                      <span className="text-white font-sans text-xs">
                        ₹{t.entryPrice.toFixed(1)} → ₹{t.exitPrice.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-[#64748b]">({t.exitReason})</span>
                    </div>

                    <div
                      className={`font-bold ${
                        t.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {formatINR(t.pnl, { showSign: true })} ({t.pnlPct >= 0 ? "+" : ""}
                      {t.pnlPct.toFixed(2)}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
