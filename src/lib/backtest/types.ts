export interface StrategyParamDef {
  key: string;
  label: string;
  type: "number" | "select";
  default: number | string;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string }[];
}

export interface StrategyDefinition {
  id: string;
  name: string;
  description: string;
  category: "Trend Following" | "Mean Reversion" | "Momentum" | "Volatility";
  params: StrategyParamDef[];
}

export interface SymbolDefinition {
  symbol: string;
  name: string;
  category: string;
  assetClass: "Crypto" | "Equities" | "Commodities" | "Forex";
  basePrice: number;
}

export interface BacktestConfig {
  strategy: string;
  symbol: string;
  timeframe: "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
  initialCapital: number;
  dateRangeDays: number;
  slippagePct: number;
  feePct: number;
  leverage: number;
  stopLossPct: number | null;
  takeProfitPct: number | null;
  trailingStopPct: number | null;
  strategyParams: Record<string, number | string>;
}

export interface TradeRecord {
  id: number;
  symbol: string;
  type: "LONG" | "SHORT";
  entryTime: string;
  exitTime: string;
  entryPrice: number;
  exitPrice: number;
  size: number;
  investedAmount: number;
  pnl: number;
  pnlPct: number;
  exitReason: "Take Profit" | "Stop Loss" | "Trailing Stop" | "Signal Exit" | "End of Backtest";
  feePaid: number;
  durationBars: number;
}

export interface EquityPoint {
  timestamp: string;
  equity: number;
  benchmark: number;
  drawdownPct: number;
}

export interface BacktestSummary {
  initialCapital: number;
  finalEquity: number;
  netProfit: number;
  netProfitPct: number;
  benchmarkReturnPct: number;
  alpha: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  profitFactor: number;
  maxDrawdownPct: number;
  maxDrawdownAmount: number;
  sharpeRatio: number;
  sortinoRatio: number;
  avgTradePnl: number;
  avgWinPnl: number;
  avgLossPnl: number;
  winLossRatio: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  totalFeesPaid: number;
  expectancy: number;
}

export interface BacktestResult {
  success: boolean;
  strategy: string;
  symbol: string;
  timeframe: string;
  summary: BacktestSummary;
  equityCurve: EquityPoint[];
  trades: TradeRecord[];
  monthlyReturns: Record<string, number>;
  source: "server" | "client";
}
