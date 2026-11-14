import { StrategyConfig, RuleCondition } from "@/types/strategy";

function formatConditionPython(cond: RuleCondition): string {
  const leftStr = `${cond.leftIndicator.type}(${JSON.stringify(cond.leftIndicator.params)})${
    cond.leftIndicator.subField ? `['${cond.leftIndicator.subField}']` : ""
  }[-${cond.leftIndicator.offset}]`;

  let rightStr = "";
  if (cond.compareType === "value") {
    rightStr = `${cond.rightValue}`;
  } else if (cond.rightIndicator) {
    rightStr = `${cond.rightIndicator.type}(${JSON.stringify(cond.rightIndicator.params)})${
      cond.rightIndicator.subField ? `['${cond.rightIndicator.subField}']` : ""
    }[-${cond.rightIndicator.offset}]`;
  }

  switch (cond.operator) {
    case "crosses_above":
      return `crossover(${leftStr}, ${rightStr})`;
    case "crosses_below":
      return `crossunder(${leftStr}, ${rightStr})`;
    case "greater_than":
      return `${leftStr} > ${rightStr}`;
    case "less_than":
      return `${leftStr} < ${rightStr}`;
    case "equals":
      return `${leftStr} == ${rightStr}`;
    case "increases_by_pct":
      return `pct_change(${leftStr}) >= ${rightStr}`;
    case "decreases_by_pct":
      return `pct_change(${leftStr}) <= -${rightStr}`;
    default:
      return `${leftStr} > ${rightStr}`;
  }
}

export function generatePythonCode(strategy: StrategyConfig): string {
  let entryRules = "        entry_signal = False";
  if (strategy.entryGroups.length === 1) {
    const g = strategy.entryGroups[0];
    const op = g.logic === "AND" ? " and " : " or ";
    const conds = g.conditions.map(formatConditionPython).join(op);
    entryRules = `        # Condition Block (${g.logic})\n        entry_signal = ${conds ? `(${conds})` : "True"}`;
  } else if (strategy.entryGroups.length > 1) {
    const blocks = strategy.entryGroups
      .map((g, idx) => {
        const op = g.logic === "AND" ? " and " : " or ";
        const conds = g.conditions.map(formatConditionPython).join(op);
        return `            (${conds || "True"}),  # Block ${idx + 1} (${g.logic})`;
      })
      .join("\n");
    entryRules = `        # Multi-Block Condition Evaluation\n        entry_blocks = [\n${blocks}\n        ]\n        entry_signal = all(entry_blocks)`;
  }

  let exitRules = "        exit_signal = False";
  if (strategy.customExitEnabled && strategy.exitGroups.length === 1) {
    const g = strategy.exitGroups[0];
    const op = g.logic === "AND" ? " and " : " or ";
    const conds = g.conditions.map(formatConditionPython).join(op);
    exitRules = `        # Custom Exit Block (${g.logic})\n        exit_signal = ${conds ? `(${conds})` : "False"}`;
  } else if (strategy.customExitEnabled && strategy.exitGroups.length > 1) {
    const blocks = strategy.exitGroups
      .map((g, idx) => {
        const op = g.logic === "AND" ? " and " : " or ";
        const conds = g.conditions.map(formatConditionPython).join(op);
        return `            (${conds || "False"}),  # Exit Block ${idx + 1} (${g.logic})`;
      })
      .join("\n");
    exitRules = `        # Multi-Block Exit Evaluation\n        exit_blocks = [\n${blocks}\n        ]\n        exit_signal = any(exit_blocks)`;
  }

  return `"""
Orion Algo - Indian Markets Quantitative Trading Engine
Strategy: ${strategy.name}
Exchange Segment: ${strategy.assetClass.toUpperCase()} | Symbol: ${strategy.symbol}
Product Type: ${strategy.productType} (Intraday/Positional) | Currency: INR (₹)
Broker Compatibility: Zerodha KiteConnect / DhanHQ / Angel One SmartAPI / Fyers
Generated on: ${new Date().toISOString()}
"""

import numpy as np
import pandas as pd
from datetime import datetime, time
from typing import Dict, Any, Optional


class ${strategy.name.replace(/[^a-zA-Z0-9]/g, "")}IndianStrategy:
    def __init__(self):
        self.name = "${strategy.name}"
        self.symbol = "${strategy.symbol}"
        self.exchange_segment = "${strategy.assetClass.toUpperCase()}"
        self.product_type = "${strategy.productType}"  # MIS, CNC, or NRML
        self.currency = "INR"
        self.timeframe = "${strategy.timeframe}"
        self.direction = "${strategy.direction}"
        self.initial_capital_inr = ${strategy.initialCapital}

        # Indian Market Timing & Square-off
        self.intraday_square_off = ${strategy.riskManagement.intradaySquareOff ? "True" : "False"}
        self.square_off_time = "${strategy.riskManagement.squareOffTime}" # e.g. "15:15" IST
        self.market_open = time(9, 15)
        self.market_close = time(15, 30)

        # Risk Management Settings
        self.sl_type = "${strategy.riskManagement.stopLossType}"
        self.sl_value = ${strategy.riskManagement.stopLossValue}
        self.tp_type = "${strategy.riskManagement.takeProfitType}"
        self.tp_value = ${strategy.riskManagement.takeProfitValue}
        self.use_trailing_stop = ${strategy.riskManagement.useTrailingStop ? "True" : "False"}
        self.trailing_activation = ${strategy.riskManagement.trailingStopActivation}
        self.trailing_step = ${strategy.riskManagement.trailingStopStep}
        self.max_holding_bars = ${strategy.riskManagement.maxHoldingBars}

        # Position Sizing & Indian Brokerage
        self.sizing_type = "${strategy.positionSizing.sizingType}"
        self.sizing_value = ${strategy.positionSizing.sizingValue}
        self.lot_size = ${strategy.positionSizing.lotSize || 25}
        self.flat_brokerage_inr = ${strategy.positionSizing.feePerOrder || 20} # ₹20 per order
        self.stt_tax_pct = ${strategy.positionSizing.sttTaxPct || 0.0125}

    def evaluate_entry(self, data: pd.DataFrame, current_time: Optional[datetime] = None) -> bool:
        """
        Evaluates entry logic during active Indian market hours.
        """
        # Block entry after 15:00 IST for intraday MIS orders
        if current_time and self.product_type == "MIS":
            if current_time.time() >= time(15, 0):
                return False

${entryRules || "        entry_signal = False"}
        return bool(entry_signal)

    def evaluate_exit(self, data: pd.DataFrame, position: Dict[str, Any], current_time: Optional[datetime] = None) -> bool:
        """
        Evaluates risk triggers, stop losses, and 15:15 IST intraday auto square-off.
        """
        # Intraday MIS auto square-off check
        if self.intraday_square_off and current_time:
            sq_h, sq_m = map(int, self.square_off_time.split(":"))
            if current_time.time() >= time(sq_h, sq_m):
                return True

${exitRules}
        return bool(exit_signal)

    def calculate_lot_quantity(self, current_capital_inr: float, ltp: float) -> int:
        """
        Calculates quantity conforming to Indian exchange lot sizes.
        """
        if self.sizing_type == "lots":
            lots = int(self.sizing_value)
            return max(1, lots) * self.lot_size
        elif self.sizing_type == "fixed_amount":
            allocated = min(current_capital_inr, self.sizing_value)
            if self.lot_size > 1:
                lots = max(1, int(allocated // (ltp * self.lot_size)))
                return lots * self.lot_size
            return max(1, int(allocated // ltp))
        else:
            return self.lot_size


if __name__ == "__main__":
    print(f"Strategy Initialized for Indian Markets: {strategy.name}")
    print(f"Segment: {strategy.assetClass.toUpperCase()} | Capital: ₹{strategy.initialCapital:,}")
`;
}
