"use client";

import React from "react";
import {
  Plus,
  Trash2,
  Sparkles,
} from "lucide-react";
import {
  ConditionGroup,
  RuleCondition,
  IndicatorConfig,
  IndicatorType,
  Operator,
  CandleOffset,
} from "@/types/strategy";

interface EntryConditionsSectionProps {
  groups: ConditionGroup[];
  onChange: (updatedGroups: ConditionGroup[]) => void;
  direction: "long" | "short" | "both";
  timeframe: string;
}

const INDICATOR_OPTIONS: { id: IndicatorType; label: string; defaultParams: Record<string, number | string>; subFields?: string[] }[] = [
  { id: "PRICE_CLOSE", label: "Price (Close)", defaultParams: {} },
  { id: "PRICE_OPEN", label: "Price (Open)", defaultParams: {} },
  { id: "PRICE_HIGH", label: "Price (High)", defaultParams: {} },
  { id: "PRICE_LOW", label: "Price (Low)", defaultParams: {} },
  { id: "EMA", label: "Exponential Moving Avg (EMA)", defaultParams: { period: 20 } },
  { id: "SMA", label: "Simple Moving Avg (SMA)", defaultParams: { period: 20 } },
  { id: "RSI", label: "Relative Strength Index (RSI)", defaultParams: { period: 14 } },
  { id: "BOLLINGER_BANDS", label: "Bollinger Bands", defaultParams: { period: 20, stdDev: 2 }, subFields: ["upper", "middle", "lower"] },
  { id: "SUPERTREND", label: "Supertrend", defaultParams: { period: 10, multiplier: 3 } },
  { id: "VWAP", label: "Volume Weighted Avg Price (VWAP)", defaultParams: {} },
  { id: "ATR", label: "Average True Range (ATR)", defaultParams: { period: 14 } },
  { id: "VOLUME_SMA", label: "Volume SMA", defaultParams: { period: 20 } },
];

const OPERATOR_OPTIONS: { id: Operator; label: string }[] = [
  { id: "crosses_above", label: "Crosses Above (↑)" },
  { id: "crosses_below", label: "Crosses Below (↓)" },
  { id: "greater_than", label: "Is Greater Than (>)" },
  { id: "less_than", label: "Is Less Than (<)" },
  { id: "equals", label: "Is Equal To (=)" },
  { id: "increases_by_pct", label: "Increases by % (≥)" },
  { id: "decreases_by_pct", label: "Decreases by % (≤)" },
];

export function EntryConditionsSection({
  groups,
  onChange,
  direction,
  timeframe,
}: EntryConditionsSectionProps) {
  // Helper to add condition to a specific group
  const addCondition = (groupId: string) => {
    const updated = groups.map((g) => {
      if (g.id !== groupId) return g;
      const newCond: RuleCondition = {
        id: `cond-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        leftIndicator: {
          id: `ind-${Date.now()}`,
          type: "PRICE_CLOSE",
          params: {},
          offset: 1,
        },
        operator: "greater_than",
        compareType: "indicator",
        rightIndicator: {
          id: `ind-r-${Date.now()}`,
          type: "EMA",
          params: { period: 50 },
          offset: 1,
        },
      };
      return { ...g, conditions: [...g.conditions, newCond] };
    });
    onChange(updated);
  };

  // Helper to remove condition
  const removeCondition = (groupId: string, conditionId: string) => {
    const updated = groups.map((g) => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        conditions: g.conditions.filter((c) => c.id !== conditionId),
      };
    });
    onChange(updated);
  };

  // Helper to update condition
  const updateCondition = (
    groupId: string,
    conditionId: string,
    updates: Partial<RuleCondition>
  ) => {
    const updated = groups.map((g) => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        conditions: g.conditions.map((c) =>
          c.id === conditionId ? { ...c, ...updates } : c
        ),
      };
    });
    onChange(updated);
  };

  // Add new group
  const addGroup = () => {
    const newGroup: ConditionGroup = {
      id: `group-${Date.now()}`,
      logic: "AND",
      conditions: [
        {
          id: `cond-${Date.now()}`,
          leftIndicator: {
            id: `ind-${Date.now()}`,
            type: "PRICE_CLOSE",
            params: {},
            offset: 1,
          },
          operator: "crosses_above",
          compareType: "indicator",
          rightIndicator: {
            id: `ind-r-${Date.now()}`,
            type: "EMA",
            params: { period: 20 },
            offset: 1,
          },
        },
      ],
    };
    onChange([...groups, newGroup]);
  };

  // Remove group
  const removeGroup = (groupId: string) => {
    if (groups.length <= 1) return;
    onChange(groups.filter((g) => g.id !== groupId));
  };

  // Toggle group logic AND / OR
  const toggleGroupLogic = (groupId: string) => {
    onChange(
      groups.map((g) =>
        g.id === groupId
          ? { ...g, logic: g.logic === "AND" ? "OR" : "AND" }
          : g
      )
    );
  };

  // Render indicator label helper
  const renderIndicatorLabel = (ind: IndicatorConfig) => {
    const def = INDICATOR_OPTIONS.find((o) => o.id === ind.type);
    const pStr =
      Object.keys(ind.params).length > 0
        ? `(${Object.values(ind.params).join(", ")})`
        : "";
    const subStr = ind.subField ? `.${ind.subField}` : "";
    const offsetStr = ind.offset === 0 ? "[Live]" : ind.offset === 1 ? "[t-1]" : "[t-2]";
    return `${def?.label || ind.type}${pStr}${subStr} ${offsetStr}`;
  };

  return (
    <div className="bg-[#0b0e14] border border-[#1a2230] rounded-xl p-5 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1a2230] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold">
            02
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Entry Rules</h2>
            <p className="text-xs text-[#94a3b8]">
              Define conditions to trigger an entry order when a candle closes.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={addGroup}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#131b2a] hover:bg-[#1a2538] border border-[#222e42] text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Condition Block</span>
        </button>
      </div>

      {/* Groups Container */}
      <div className="space-y-5">
        {groups.map((group, gIdx) => (
          <div
            key={group.id}
            className="bg-[#0d121c] border border-[#1d2738] rounded-xl p-4 space-y-4 relative"
          >
            {/* Group Header */}
            <div className="flex items-center justify-between border-b border-[#1a2436] pb-2.5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Block {gIdx + 1}
                </span>

                <div className="flex items-center bg-[#131b2a] border border-[#222e42] rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => toggleGroupLogic(group.id)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                      group.logic === "AND"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "text-[#64748b] hover:text-white"
                    }`}
                  >
                    ALL (AND)
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleGroupLogic(group.id)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                      group.logic === "OR"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "text-[#64748b] hover:text-white"
                    }`}
                  >
                    ANY (OR)
                  </button>
                </div>

                <span className="text-[11px] text-[#64748b] hidden md:inline">
                  {group.logic === "AND"
                    ? "Every rule in this block must be fulfilled"
                    : "At least one rule in this block triggers entry"}
                </span>
              </div>

              {groups.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeGroup(group.id)}
                  className="p-1.5 rounded-lg text-[#64748b] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Delete Block"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Conditions List in Group */}
            <div className="space-y-3">
              {group.conditions.map((cond, cIdx) => (
                <div
                  key={cond.id}
                  className="bg-[#121926] border border-[#1e2a3c] rounded-lg p-3 hover:border-[#2a3a52] transition-colors space-y-3"
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[11px] font-mono text-[#64748b] w-5">
                      #{cIdx + 1}
                    </span>

                    {/* Left Indicator */}
                    <div className="flex-1 min-w-[200px] flex items-center gap-1.5">
                      <select
                        value={cond.leftIndicator.type}
                        onChange={(e) => {
                          const newType = e.target.value as IndicatorType;
                          const def = INDICATOR_OPTIONS.find((o) => o.id === newType);
                          updateCondition(group.id, cond.id, {
                            leftIndicator: {
                              ...cond.leftIndicator,
                              type: newType,
                              params: { ...(def?.defaultParams || {}) },
                              subField: def?.subFields ? def.subFields[0] : undefined,
                            },
                          });
                        }}
                        className="flex-1 bg-[#162030] border border-[#26354c] rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                      >
                        {INDICATOR_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      {/* Period parameter if applicable */}
                      {"period" in cond.leftIndicator.params && (
                        <div className="flex items-center gap-1 bg-[#162030] border border-[#26354c] rounded-md px-2 py-1">
                          <span className="text-[10px] text-[#64748b]">P:</span>
                          <input
                            type="number"
                            min="1"
                            max="500"
                            value={Number(cond.leftIndicator.params.period) || 14}
                            onChange={(e) =>
                              updateCondition(group.id, cond.id, {
                                leftIndicator: {
                                  ...cond.leftIndicator,
                                  params: {
                                    ...cond.leftIndicator.params,
                                    period: Number(e.target.value) || 14,
                                  },
                                },
                              })
                            }
                            className="w-10 bg-transparent text-xs text-white font-mono focus:outline-none"
                          />
                        </div>
                      )}

                      {/* Subfield if Bollinger Bands */}
                      {cond.leftIndicator.type === "BOLLINGER_BANDS" && (
                        <select
                          value={cond.leftIndicator.subField || "lower"}
                          onChange={(e) =>
                            updateCondition(group.id, cond.id, {
                              leftIndicator: {
                                ...cond.leftIndicator,
                                subField: e.target.value,
                              },
                            })
                          }
                          className="bg-[#162030] border border-[#26354c] rounded-md px-2 py-1 text-xs text-white focus:outline-none"
                        >
                          <option value="upper">Upper Band</option>
                          <option value="middle">Middle (SMA)</option>
                          <option value="lower">Lower Band</option>
                        </select>
                      )}

                      {/* Candle Offset */}
                      <select
                        value={cond.leftIndicator.offset}
                        onChange={(e) =>
                          updateCondition(group.id, cond.id, {
                            leftIndicator: {
                              ...cond.leftIndicator,
                              offset: Number(e.target.value) as CandleOffset,
                            },
                          })
                        }
                        className="bg-[#162030] border border-[#26354c] rounded-md px-1.5 py-1 text-[11px] text-[#94a3b8] focus:outline-none"
                        title="Candle offset: Live vs previous closed bars"
                      >
                        <option value={0}>Live [0]</option>
                        <option value={1}>Closed [t-1]</option>
                        <option value={2}>Closed [t-2]</option>
                      </select>
                    </div>

                    {/* Operator */}
                    <div className="w-40">
                      <select
                        value={cond.operator}
                        onChange={(e) =>
                          updateCondition(group.id, cond.id, {
                            operator: e.target.value as Operator,
                          })
                        }
                        className="w-full bg-[#182436] border border-emerald-500/30 text-emerald-400 font-semibold rounded-md px-2 py-1.5 text-xs focus:outline-none"
                      >
                        {OPERATOR_OPTIONS.map((op) => (
                          <option key={op.id} value={op.id}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Compare Type Toggle & Target */}
                    <div className="flex-1 min-w-[200px] flex items-center gap-1.5">
                      <div className="flex bg-[#162030] border border-[#26354c] rounded-md p-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateCondition(group.id, cond.id, {
                              compareType: "indicator",
                              rightIndicator: cond.rightIndicator || {
                                id: `ind-r-${Date.now()}`,
                                type: "EMA",
                                params: { period: 50 },
                                offset: 1,
                              },
                            })
                          }
                          className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                            cond.compareType === "indicator"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "text-[#64748b]"
                          }`}
                        >
                          Indicator
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateCondition(group.id, cond.id, {
                              compareType: "value",
                              rightValue: cond.rightValue ?? 50,
                            })
                          }
                          className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                            cond.compareType === "value"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "text-[#64748b]"
                          }`}
                        >
                          Value
                        </button>
                      </div>

                      {cond.compareType === "value" ? (
                        <input
                          type="number"
                          step="any"
                          value={cond.rightValue ?? 50}
                          onChange={(e) =>
                            updateCondition(group.id, cond.id, {
                              rightValue: Number(e.target.value) || 0,
                            })
                          }
                          className="flex-1 bg-[#162030] border border-[#26354c] rounded-md px-2.5 py-1 text-xs text-white font-mono focus:outline-none"
                          placeholder="Value..."
                        />
                      ) : (
                        <div className="flex-1 flex items-center gap-1">
                          <select
                            value={cond.rightIndicator?.type || "EMA"}
                            onChange={(e) => {
                              const newType = e.target.value as IndicatorType;
                              const def = INDICATOR_OPTIONS.find((o) => o.id === newType);
                              updateCondition(group.id, cond.id, {
                                rightIndicator: {
                                  id: cond.rightIndicator?.id || `ind-r-${Date.now()}`,
                                  type: newType,
                                  params: { ...(def?.defaultParams || {}) },
                                  subField: def?.subFields ? def.subFields[0] : undefined,
                                  offset: cond.rightIndicator?.offset ?? 1,
                                },
                              });
                            }}
                            className="flex-1 bg-[#162030] border border-[#26354c] rounded-md px-2 py-1 text-xs text-white focus:outline-none"
                          >
                            {INDICATOR_OPTIONS.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </select>

                          {cond.rightIndicator && "period" in cond.rightIndicator.params && (
                            <div className="flex items-center gap-1 bg-[#162030] border border-[#26354c] rounded-md px-2 py-1">
                              <span className="text-[10px] text-[#64748b]">P:</span>
                              <input
                                type="number"
                                min="1"
                                max="500"
                                value={Number(cond.rightIndicator.params.period) || 50}
                                onChange={(e) =>
                                  updateCondition(group.id, cond.id, {
                                    rightIndicator: {
                                      ...cond.rightIndicator!,
                                      params: {
                                        ...cond.rightIndicator!.params,
                                        period: Number(e.target.value) || 50,
                                      },
                                    },
                                  })
                                }
                                className="w-10 bg-transparent text-xs text-white font-mono focus:outline-none"
                              />
                            </div>
                          )}

                          {cond.rightIndicator?.type === "BOLLINGER_BANDS" && (
                            <select
                              value={cond.rightIndicator.subField || "middle"}
                              onChange={(e) =>
                                updateCondition(group.id, cond.id, {
                                  rightIndicator: {
                                    ...cond.rightIndicator!,
                                    subField: e.target.value,
                                  },
                                })
                              }
                              className="bg-[#162030] border border-[#26354c] rounded-md px-2 py-1 text-xs text-white focus:outline-none"
                            >
                              <option value="upper">Upper</option>
                              <option value="middle">Middle</option>
                              <option value="lower">Lower</option>
                            </select>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Delete condition button */}
                    <button
                      type="button"
                      onClick={() => removeCondition(group.id, cond.id)}
                      className="p-1 rounded text-[#64748b] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remove condition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add rule in group button */}
            <div className="flex justify-between items-center pt-1">
              <button
                type="button"
                onClick={() => addCondition(group.id)}
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium px-2 py-1 rounded bg-[#131b2a] border border-[#222e42] hover:bg-[#1a2538] transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Add Condition to Block {gIdx + 1}</span>
              </button>

              <span className="text-[11px] text-[#64748b]">
                {group.conditions.length} rule{group.conditions.length !== 1 ? "s" : ""} active
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Human Readable Logic Preview Pill */}
      <div className="bg-[#0e1624] border border-emerald-500/20 rounded-xl p-3 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wide">
            Generated Execution Rule Summary:
          </p>
          <div className="text-xs text-[#cbd5e1] font-mono leading-relaxed">
            {groups.map((g, gi) => (
              <span key={g.id}>
                {gi > 0 && <span className="text-amber-400 font-bold mx-1">OR</span>}
                (
                {g.conditions.map((c, ci) => (
                  <span key={c.id}>
                    {ci > 0 && (
                      <span className="text-cyan-400 font-bold mx-1">
                        {g.logic}
                      </span>
                    )}
                    <span className="text-white">{renderIndicatorLabel(c.leftIndicator)}</span>
                    <span className="text-emerald-400 font-bold mx-1">
                      {OPERATOR_OPTIONS.find((o) => o.id === c.operator)?.label}
                    </span>
                    <span className="text-white">
                      {c.compareType === "value"
                        ? c.rightValue
                        : c.rightIndicator
                        ? renderIndicatorLabel(c.rightIndicator)
                        : ""}
                    </span>
                  </span>
                ))}
                )
              </span>
            ))}
            <span className="text-[#94a3b8] ml-2">
              ➜ Trigger {direction.toUpperCase()} order on {timeframe} interval
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
