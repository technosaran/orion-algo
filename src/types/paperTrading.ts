export type AssetCategory = "stock" | "crypto" | "index" | "commodity";

export interface AssetQuote {
  symbol: string;
  name: string;
  category: AssetCategory;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: string;
  basePrice: number;
  spread: number;
  sparkline: number[];
  lotSize?: number;
  sector?: string;
  indexWeight?: string;
  tickSize?: number;
}

export type OrderSide = "BUY" | "SELL";
export type PositionSide = "LONG" | "SHORT";
export type OrderType = "MARKET" | "LIMIT" | "STOP";
export type OrderStatus = "FILLED" | "PENDING" | "CANCELLED" | "REJECTED";

export interface PaperOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price: number; // executed price or limit target
  targetPrice?: number; // for limit/stop orders
  quantity: number;
  totalValue: number;
  status: OrderStatus;
  createdAt: number;
  executedAt?: number;
  takeProfit?: number;
  stopLoss?: number;
  isAlgoTrade?: boolean;
  algoStrategyId?: string;
  note?: string;
}

export interface PaperPosition {
  id: string;
  symbol: string;
  side: PositionSide;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  marginUsed: number;
  entryTime: number;
  takeProfit?: number;
  stopLoss?: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
}

export interface ClosedTrade {
  id: string;
  orderId: string;
  symbol: string;
  side: PositionSide;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  realizedPnl: number;
  realizedPnlPercent: number;
  openedAt: number;
  closedAt: number;
  closeReason: "MANUAL" | "TAKE_PROFIT" | "STOP_LOSS" | "ALGO_EXIT";
  isAlgoTrade?: boolean;
}

export interface PortfolioSummary {
  initialBalance: number;
  cashBalance: number;
  totalEquity: number;
  marginUsed: number;
  freeBuyingPower: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  equity?: number;
  unrealizedPnlPercent?: number;
  totalPnl?: number;
  totalPnlPercent?: number;
  bestTrade?: number;
  worstTrade?: number;
}

export interface CandleData {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type ChartTimeframe = "1m" | "5m" | "15m" | "1h" | "1D";
export type ChartType = "candlestick" | "area";

export interface BotLog {
  id: string;
  timestamp: string;
  type: "INFO" | "SIGNAL" | "ORDER" | "RISK";
  message: string;
  symbol?: string;
}

export interface BotStrategyConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  intervalSec: number;
  targetSymbol: string;
  tradeAllocationPct: number; // e.g. 5% of cash
}
