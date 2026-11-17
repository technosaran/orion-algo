export type AssetClass =
  | "nse_fno"
  | "nse_equity"
  | "mcx_commodity"
  | "bse_equity"
  | "equities"
  | "crypto"
  | "forex"
  | "commodities";

export type ProductType = "MIS" | "CNC" | "NRML";

export type Timeframe = "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1D";

export type OrderDirection = "long" | "short" | "both";

export type OrderType = "market" | "limit" | "stop_market";

export type IndicatorType =
  | "EMA"
  | "SMA"
  | "RSI"
  | "MACD"
  | "BOLLINGER_BANDS"
  | "SUPERTREND"
  | "ATR"
  | "VWAP"
  | "STOCHASTIC"
  | "VOLUME_SMA"
  | "PRICE_CLOSE"
  | "PRICE_OPEN"
  | "PRICE_HIGH"
  | "PRICE_LOW";

export type Operator =
  | "crosses_above"
  | "crosses_below"
  | "greater_than"
  | "less_than"
  | "equals"
  | "increases_by_pct"
  | "decreases_by_pct";

export type CandleOffset = 0 | 1 | 2; // 0 = current live, 1 = previous closed (t-1), 2 = t-2

export interface IndicatorConfig {
  id: string;
  type: IndicatorType;
  params: Record<string, number | string>;
  subField?: string; // e.g. "upper", "lower", "macd", "signal", "hist"
  offset: CandleOffset;
}

export interface RuleCondition {
  id: string;
  leftIndicator: IndicatorConfig;
  operator: Operator;
  compareType: "indicator" | "value";
  rightIndicator?: IndicatorConfig;
  rightValue?: number;
}

export interface ConditionGroup {
  id: string;
  logic: "AND" | "OR";
  conditions: RuleCondition[];
}

export type StopLossType = "percentage" | "points" | "atr_multiple";
export type TakeProfitType = "percentage" | "risk_reward" | "points";
export type SizingType = "lots" | "fixed_amount" | "percent_equity" | "risk_based" | "fixed_quantity";

export interface RiskManagementConfig {
  stopLossType: StopLossType;
  stopLossValue: number;
  takeProfitType: TakeProfitType;
  takeProfitValue: number;
  useTrailingStop: boolean;
  trailingStopActivation: number; // in % or points
  trailingStopStep: number; // in % or points
  intradaySquareOff: boolean;
  squareOffTime: string; // e.g. "15:15" IST
  maxHoldingBars: number; // 0 means unlimited
  maxDailyDrawdownPct: number;
  maxConsecutiveLosses: number;
}

export interface PositionSizingConfig {
  sizingType: SizingType;
  sizingValue: number; // e.g. ₹50,000 or 2 lots or 10%
  lotSize: number; // e.g. 65 for Nifty, 30 for BankNifty
  maxOpenPositions: number;
  maxLeverage: number;
  slippagePct: number;
  feePerOrder: number; // flat ₹20 brokerage Zerodha/Dhan style
  sttTaxPct: number; // Securities Transaction Tax
}

export interface StrategyConfig {
  id: string;
  name: string;
  description: string;
  category: "trend" | "mean_reversion" | "breakout" | "scalping" | "momentum";
  assetClass: AssetClass;
  symbol: string;
  productType: ProductType;
  currency: "INR";
  timeframe: Timeframe;
  direction: OrderDirection;
  orderType: OrderType;
  initialCapital: number; // In INR (₹)
  
  // Section 2: Entry Conditions
  entryGroups: ConditionGroup[];
  
  // Section 3: Exit Conditions (Optional custom indicator exits in addition to SL/TP)
  customExitEnabled: boolean;
  exitGroups: ConditionGroup[];
  
  // Section 4: Risk Management & Exits
  riskManagement: RiskManagementConfig;
  
  // Section 5: Position Sizing
  positionSizing: PositionSizingConfig;

  status: "draft" | "backtested" | "active" | "paper";
  createdAt: string;
  updatedAt: string;
}

export interface TradeLog {
  id: string;
  tradeNumber: number;
  direction: "LONG" | "SHORT";
  entryTime: string;
  exitTime: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  lotCount?: number;
  pnl: number;
  pnlPct: number;
  exitReason: "Take Profit" | "Stop Loss" | "Trailing Stop" | "Signal Exit" | "Time Exit" | "End of Period";
  maxFavorableExcursionPct: number;
  maxAdverseExcursionPct: number;
  durationBars?: number;
}

export interface EquityDataPoint {
  timestamp: string;
  equity: number;
  drawdownPct: number;
  benchmarkEquity: number;
}

export interface BacktestMetrics {
  initialCapital: number;
  netProfit: number;
  netProfitPct: number;
  benchmarkReturnPct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  avgTradePnl: number;
  avgWinPnl: number;
  avgLossPnl: number;
  riskRewardRatio: number;
  avgHoldingBars: number;
  bestTradePct: number;
  worstTradePct: number;
  totalBrokeragePaid: number;
}

export interface BacktestResult {
  metrics: BacktestMetrics;
  equityCurve: EquityDataPoint[];
  trades: TradeLog[];
}
