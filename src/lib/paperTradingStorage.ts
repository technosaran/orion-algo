import { supabase } from "@/lib/supabase";
import {
  PaperPosition,
  PaperOrder,
  ClosedTrade,
  PortfolioSummary,
  BotLog,
} from "@/types/paperTrading";

const STORAGE_KEY = "orion_paper_trading_state_v1";

export interface StoredPaperState {
  initialBalance: number;
  cashBalance: number;
  positions: PaperPosition[];
  orders: PaperOrder[];
  history: ClosedTrade[];
  botLogs: BotLog[];
  botActive: boolean;
  botStrategyId: string;
  botSpeedSec: number;
  lastUpdated: number;
}

export const DEFAULT_INITIAL_BALANCE = 1000000; // ₹10,00,000 INR (10 Lakhs)

export function getDefaultState(): StoredPaperState {
  return {
    initialBalance: DEFAULT_INITIAL_BALANCE,
    cashBalance: DEFAULT_INITIAL_BALANCE,
    positions: [],
    orders: [],
    history: [],
    botLogs: [],
    botActive: false,
    botStrategyId: "rsi_mean_reversion",
    botSpeedSec: 3,
    lastUpdated: 0,
  };
}

/**
 * Loads entire paper trading portfolio and transaction history from Supabase Cloud Database.
 * Gracefully falls back to local storage cache if network is unavailable.
 */
export async function loadPaperStateFromDb(): Promise<{
  state: StoredPaperState;
  source: "database" | "local";
}> {
  try {
    const [accRes, posRes, ordRes, trdRes, logRes] = await Promise.all([
      supabase.from("paper_account").select("*").eq("id", "default").maybeSingle(),
      supabase.from("paper_positions").select("*").order("created_at", { ascending: false }),
      supabase.from("paper_orders").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("paper_trades").select("*").order("closed_at", { ascending: false }).limit(100),
      supabase.from("paper_bot_logs").select("*").order("created_at", { ascending: false }).limit(50),
    ]);

    if (!accRes.error && accRes.data) {
      const acc = accRes.data;
      const positions: PaperPosition[] = (posRes.data || []).map((row: any) => ({
        id: String(row.id),
        symbol: String(row.symbol),
        side: row.side as PaperPosition["side"],
        quantity: Number(row.quantity),
        entryPrice: Number(row.entry_price),
        currentPrice: Number(row.current_price),
        marginUsed: Number(row.margin_used),
        entryTime: row.entry_time ? new Date(row.entry_time).getTime() : Date.now(),
        takeProfit: row.take_profit ? Number(row.take_profit) : undefined,
        stopLoss: row.stop_loss ? Number(row.stop_loss) : undefined,
        unrealizedPnl: Number(row.unrealized_pnl || 0),
        unrealizedPnlPercent: Number(row.unrealized_pnl_percent || 0),
      }));

      const orders: PaperOrder[] = (ordRes.data || []).map((row: any) => ({
        id: String(row.id),
        symbol: String(row.symbol),
        side: row.side as PaperOrder["side"],
        type: row.type as PaperOrder["type"],
        price: Number(row.price),
        targetPrice: row.target_price ? Number(row.target_price) : undefined,
        quantity: Number(row.quantity),
        totalValue: Number(row.total_value),
        status: row.status as PaperOrder["status"],
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        executedAt: row.executed_at ? new Date(row.executed_at).getTime() : undefined,
        takeProfit: row.take_profit ? Number(row.take_profit) : undefined,
        stopLoss: row.stop_loss ? Number(row.stop_loss) : undefined,
        isAlgoTrade: Boolean(row.is_algo_trade),
        note: row.note ? String(row.note) : undefined,
      }));

      const history: ClosedTrade[] = (trdRes.data || []).map((row: any) => ({
        id: String(row.id),
        orderId: String(row.order_id || ""),
        symbol: String(row.symbol),
        side: row.side as ClosedTrade["side"],
        quantity: Number(row.quantity),
        entryPrice: Number(row.entry_price),
        exitPrice: Number(row.exit_price),
        realizedPnl: Number(row.realized_pnl),
        realizedPnlPercent: Number(row.realized_pnl_percent),
        openedAt: row.opened_at ? new Date(row.opened_at).getTime() : Date.now(),
        closedAt: row.closed_at ? new Date(row.closed_at).getTime() : Date.now(),
        closeReason: row.close_reason as ClosedTrade["closeReason"],
      }));

      const botLogs: BotLog[] = (logRes.data || []).map((row: any) => ({
        id: String(row.id),
        type: row.type as BotLog["type"],
        message: String(row.message),
        timestamp: String(row.timestamp),
      }));

      const dbState: StoredPaperState = {
        initialBalance: Number(acc.initial_balance) || DEFAULT_INITIAL_BALANCE,
        cashBalance: Number(acc.cash_balance) || DEFAULT_INITIAL_BALANCE,
        positions,
        orders,
        history,
        botLogs,
        botActive: Boolean(acc.bot_active),
        botStrategyId: String(acc.bot_strategy_id || "rsi_mean_reversion"),
        botSpeedSec: Number(acc.bot_speed_sec) || 3,
        lastUpdated: Date.now(),
      };

      // Sync local cache
      savePaperState(dbState);
      return { state: dbState, source: "database" };
    }
  } catch (err) {
    console.warn("Could not load paper trading state from database, using local cache:", err);
  }

  return { state: loadPaperState(), source: "local" };
}

/**
 * Local cache loader
 */
export function loadPaperState(): StoredPaperState {
  if (typeof window === "undefined") {
    return getDefaultState();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const def = getDefaultState();
      savePaperState(def);
      return def;
    }
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultState(),
      ...parsed,
    };
  } catch (err) {
    console.error("Error loading paper trading state:", err);
    return getDefaultState();
  }
}

/**
 * Persists local cache to localStorage
 */
export function savePaperState(state: StoredPaperState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        lastUpdated: Date.now(),
      })
    );
  } catch (err) {
    console.error("Error saving paper trading state to local storage:", err);
  }
}

// ----------------------------------------------------------------------------
// Database Mutation Functions
// ----------------------------------------------------------------------------

export async function saveAccountToDb(
  initialBalance: number,
  cashBalance: number,
  botActive: boolean,
  botStrategyId: string,
  botSpeedSec: number
): Promise<boolean> {
  try {
    const { error } = await supabase.from("paper_account").upsert({
      id: "default",
      initial_balance: initialBalance,
      cash_balance: cashBalance,
      bot_active: botActive,
      bot_strategy_id: botStrategyId,
      bot_speed_sec: botSpeedSec,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch (err) {
    console.warn("Error updating paper account in DB:", err);
    return false;
  }
}

export async function savePositionToDb(pos: PaperPosition): Promise<boolean> {
  try {
    const { error } = await supabase.from("paper_positions").upsert({
      id: pos.id,
      symbol: pos.symbol,
      side: pos.side,
      quantity: pos.quantity,
      entry_price: pos.entryPrice,
      current_price: pos.currentPrice,
      margin_used: pos.marginUsed,
      take_profit: pos.takeProfit || null,
      stop_loss: pos.stopLoss || null,
      unrealized_pnl: pos.unrealizedPnl || 0,
      unrealized_pnl_percent: pos.unrealizedPnlPercent || 0,
      entry_time: new Date(pos.entryTime).toISOString(),
    });
    return !error;
  } catch (err) {
    console.warn("Error saving position to DB:", err);
    return false;
  }
}

export async function deletePositionFromDb(posId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("paper_positions").delete().eq("id", posId);
    return !error;
  } catch (err) {
    console.warn("Error deleting position from DB:", err);
    return false;
  }
}

export async function deleteAllPositionsFromDb(): Promise<boolean> {
  try {
    const { error } = await supabase.from("paper_positions").delete().neq("id", "none");
    return !error;
  } catch (err) {
    console.warn("Error deleting all positions from DB:", err);
    return false;
  }
}

export async function saveOrderToDb(ord: PaperOrder): Promise<boolean> {
  try {
    const { error } = await supabase.from("paper_orders").upsert({
      id: ord.id,
      symbol: ord.symbol,
      side: ord.side,
      type: ord.type,
      price: ord.price,
      target_price: ord.targetPrice || null,
      quantity: ord.quantity,
      total_value: ord.totalValue,
      status: ord.status,
      take_profit: ord.takeProfit || null,
      stop_loss: ord.stopLoss || null,
      is_algo_trade: Boolean(ord.isAlgoTrade),
      note: ord.note || null,
      created_at: new Date(ord.createdAt).toISOString(),
      executed_at: ord.executedAt ? new Date(ord.executedAt).toISOString() : null,
    });
    return !error;
  } catch (err) {
    console.warn("Error saving order to DB:", err);
    return false;
  }
}

export async function updateOrderStatusInDb(
  orderId: string,
  status: PaperOrder["status"],
  executedAt?: number,
  executedPrice?: number
): Promise<boolean> {
  try {
    const updatePayload: Record<string, unknown> = { status };
    if (executedAt) updatePayload.executed_at = new Date(executedAt).toISOString();
    if (executedPrice) updatePayload.price = executedPrice;

    const { error } = await supabase.from("paper_orders").update(updatePayload).eq("id", orderId);
    return !error;
  } catch (err) {
    console.warn("Error updating order status in DB:", err);
    return false;
  }
}

export async function saveClosedTradeToDb(trade: ClosedTrade): Promise<boolean> {
  try {
    const { error } = await supabase.from("paper_trades").insert({
      id: trade.id,
      order_id: trade.orderId,
      symbol: trade.symbol,
      side: trade.side,
      quantity: trade.quantity,
      entry_price: trade.entryPrice,
      exit_price: trade.exitPrice,
      realized_pnl: trade.realizedPnl,
      realized_pnl_percent: trade.realizedPnlPercent,
      opened_at: new Date(trade.openedAt).toISOString(),
      closed_at: new Date(trade.closedAt).toISOString(),
      close_reason: trade.closeReason,
    });
    return !error;
  } catch (err) {
    console.warn("Error saving closed trade to DB:", err);
    return false;
  }
}

export async function saveBotLogToDb(log: BotLog): Promise<boolean> {
  try {
    const { error } = await supabase.from("paper_bot_logs").insert({
      id: log.id,
      type: log.type,
      message: log.message,
      timestamp: log.timestamp,
    });
    return !error;
  } catch (err) {
    console.warn("Error saving bot log to DB:", err);
    return false;
  }
}

export async function resetAccountInDb(
  newBalance: number,
  wipeHistory: boolean
): Promise<boolean> {
  try {
    await Promise.all([
      saveAccountToDb(newBalance, newBalance, false, "rsi_mean_reversion", 3),
      deleteAllPositionsFromDb(),
      wipeHistory ? supabase.from("paper_trades").delete().neq("id", "none") : Promise.resolve(),
      wipeHistory ? supabase.from("paper_bot_logs").delete().neq("id", "none") : Promise.resolve(),
    ]);
    return true;
  } catch (err) {
    console.warn("Error resetting account in DB:", err);
    return false;
  }
}

export async function clearHistoryInDb(): Promise<boolean> {
  try {
    const { error } = await supabase.from("paper_trades").delete().neq("id", "none");
    return !error;
  } catch (err) {
    console.warn("Error clearing trade history in DB:", err);
    return false;
  }
}

export async function clearBotLogsInDb(): Promise<boolean> {
  try {
    const { error } = await supabase.from("paper_bot_logs").delete().neq("id", "none");
    return !error;
  } catch (err) {
    console.warn("Error clearing bot logs in DB:", err);
    return false;
  }
}

export function resetPaperState(): StoredPaperState {
  const fresh = getDefaultState();
  savePaperState(fresh);
  return fresh;
}

export function calculateSummary(state: StoredPaperState, quotes?: { symbol: string; price: number }[]): PortfolioSummary {
  const { positions, history, cashBalance, initialBalance } = state;
  const quoteMap = new Map((quotes || []).map((q) => [q.symbol, q.price]));

  let unrealizedPnl = 0;
  let marginUsed = 0;

  for (const pos of positions) {
    marginUsed += pos.marginUsed;
    const livePrice = quoteMap.get(pos.symbol) ?? pos.currentPrice ?? pos.entryPrice;
    const isLong = pos.side === "LONG";
    const pnl = isLong
      ? (livePrice - pos.entryPrice) * pos.quantity
      : (pos.entryPrice - livePrice) * pos.quantity;
    unrealizedPnl += pnl;
  }

  const realizedPnl = history.reduce((acc, t) => acc + t.realizedPnl, 0);
  const totalEquity = cashBalance + marginUsed + unrealizedPnl;
  const freeBuyingPower = Math.max(0, cashBalance);

  const winningTrades = history.filter((t) => t.realizedPnl > 0).length;
  const losingTrades = history.filter((t) => t.realizedPnl < 0).length;
  const totalTrades = history.length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  return {
    initialBalance,
    cashBalance: Math.round(cashBalance * 100) / 100,
    totalEquity: Math.round(totalEquity * 100) / 100,
    marginUsed: Math.round(marginUsed * 100) / 100,
    freeBuyingPower: Math.round(freeBuyingPower * 100) / 100,
    unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
    realizedPnl: Math.round(realizedPnl * 100) / 100,
    totalTrades,
    winningTrades,
    losingTrades,
    winRate: Math.round(winRate * 10) / 10,
  };
}

export const computePortfolioSummary = (state: StoredPaperState, quotes?: { symbol: string; price: number }[]) => calculateSummary(state, quotes);
