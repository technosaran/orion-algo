import { supabase } from "@/lib/supabase";
import { StrategyConfig, BacktestResult } from "@/types/strategy";

const LOCAL_STORAGE_KEY = "orion_algo_saved_strategies";
const ACTIVE_STRATEGY_KEY = "orion_algo_active_strategy";

// Maps database snake_case row to StrategyConfig
function mapRowToStrategy(row: Record<string, unknown>): StrategyConfig {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description || ""),
    category: row.category as StrategyConfig["category"],
    assetClass: row.asset_class as StrategyConfig["assetClass"],
    symbol: String(row.symbol),
    productType: (row.product_type as StrategyConfig["productType"]) || "MIS",
    currency: "INR",
    timeframe: row.timeframe as StrategyConfig["timeframe"],
    direction: row.direction as StrategyConfig["direction"],
    orderType: row.order_type as StrategyConfig["orderType"],
    initialCapital: Number(row.initial_capital) || 100000,
    entryGroups: (row.entry_groups as StrategyConfig["entryGroups"]) || [],
    customExitEnabled: Boolean(row.custom_exit_enabled),
    exitGroups: (row.exit_groups as StrategyConfig["exitGroups"]) || [],
    riskManagement: (row.risk_management as StrategyConfig["riskManagement"]) || ({} as StrategyConfig["riskManagement"]),
    positionSizing: (row.position_sizing as StrategyConfig["positionSizing"]) || ({} as StrategyConfig["positionSizing"]),
    status: (row.status as StrategyConfig["status"]) || "draft",
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

// Maps StrategyConfig to database snake_case payload
function mapStrategyToRow(strategy: StrategyConfig): Record<string, unknown> {
  return {
    id: strategy.id,
    name: strategy.name,
    description: strategy.description,
    category: strategy.category,
    asset_class: strategy.assetClass,
    symbol: strategy.symbol,
    product_type: strategy.productType || "MIS",
    currency: "INR",
    timeframe: strategy.timeframe,
    direction: strategy.direction,
    order_type: strategy.orderType,
    initial_capital: strategy.initialCapital,
    entry_groups: strategy.entryGroups,
    custom_exit_enabled: strategy.customExitEnabled,
    exit_groups: strategy.exitGroups,
    risk_management: strategy.riskManagement,
    position_sizing: strategy.positionSizing,
    status: strategy.status,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Loads all saved user strategies from the database (Supabase)
 * with graceful fallback to localStorage.
 */
export async function getStrategiesFromDb(): Promise<{
  strategies: StrategyConfig[];
  source: "database" | "local";
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("strategies")
      .select("*")
      .order("updated_at", { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const parsed = data.map(mapRowToStrategy);
      // Cache to local storage
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
      }
      return { strategies: parsed, source: "database" };
    }

    if (error) {
      console.warn("Supabase query notice:", error.message);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("Supabase connection exception:", msg);
  }

  // Fallback to local storage
  if (typeof window !== "undefined") {
    try {
      const local = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (local) {
        return { strategies: JSON.parse(local), source: "local" };
      }
    } catch (e) {
      console.warn("Could not read local storage:", e);
    }
  }

  return { strategies: [], source: "local" };
}

/**
 * Saves or updates a strategy in the database (Supabase)
 */
export async function saveStrategyToDb(
  strategy: StrategyConfig
): Promise<{ success: boolean; source: "database" | "local"; message: string }> {
  let dbSuccess = false;

  // 1. Save to Supabase
  try {
    const row = mapStrategyToRow(strategy);
    const { error } = await supabase.from("strategies").upsert(row);
    if (!error) {
      dbSuccess = true;
    } else {
      console.warn("Supabase upsert error:", error.message);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("Supabase save error:", msg);
  }

  // 2. Always persist locally
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(ACTIVE_STRATEGY_KEY, JSON.stringify(strategy));
      const localRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
      const list: StrategyConfig[] = localRaw ? JSON.parse(localRaw) : [];
      const idx = list.findIndex((s) => s.id === strategy.id);
      if (idx >= 0) {
        list[idx] = strategy;
      } else {
        list.unshift(strategy);
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error("Local storage sync error:", e);
    }
  }

  return {
    success: true,
    source: dbSuccess ? "database" : "local",
    message: dbSuccess
      ? "Strategy synced to Cloud Database (Supabase)!"
      : "Strategy saved to Local Storage.",
  };
}

/**
 * Deletes a strategy from the database and local cache
 */
export async function deleteStrategyFromDb(id: string): Promise<boolean> {
  try {
    await supabase.from("strategies").delete().eq("id", id);
  } catch (e) {
    console.warn("Supabase delete notice:", e);
  }

  if (typeof window !== "undefined") {
    try {
      const localRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (localRaw) {
        const list: StrategyConfig[] = JSON.parse(localRaw);
        const filtered = list.filter((s) => s.id !== id);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.error("Local delete error:", e);
    }
  }

  return true;
}

/**
 * Saves backtest results to Supabase backtest_results table
 */
export async function saveBacktestToDb(
  strategy: StrategyConfig,
  result: BacktestResult
): Promise<boolean> {
  try {
    const payload = {
      id: `bt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      strategy_id: strategy.id,
      strategy_name: strategy.name,
      symbol: strategy.symbol,
      currency: "INR",
      timeframe: strategy.timeframe,
      metrics: result.metrics,
      equity_curve: result.equityCurve,
      trades: result.trades,
    };
    const { error } = await supabase.from("backtest_results").insert(payload);
    if (!error) return true;
    console.warn("Backtest save to DB notice:", error.message);
  } catch (err) {
    console.warn("Backtest DB exception:", err);
  }
  return false;
}

/**
 * Saves Backtesting Lab simulation results to Supabase backtest_results table
 */
export async function saveLabBacktestToDb(
  config: { strategy: string; symbol: string; timeframe: string },
  result: any
): Promise<boolean> {
  try {
    const payload = {
      id: `bt-lab-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      strategy_id: config.strategy,
      strategy_name: config.strategy.toUpperCase().replace("_", " "),
      symbol: config.symbol,
      currency: "INR",
      timeframe: config.timeframe,
      metrics: result.summary,
      equity_curve: result.equityCurve,
      trades: result.trades,
      monthly_returns: result.monthlyReturns || {},
    };
    const { error } = await supabase.from("backtest_results").insert(payload);
    if (!error) return true;
    console.warn("Backtest Lab DB save notice:", error.message);
  } catch (err) {
    console.warn("Backtest Lab DB exception:", err);
  }
  return false;
}

/**
 * Queries saved backtest executions from Supabase
 */
export async function getBacktestResultsFromDb(strategyId?: string) {
  try {
    let query = supabase
      .from("backtest_results")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25);
    if (strategyId) {
      query = query.eq("strategy_id", strategyId);
    }
    const { data, error } = await query;
    if (!error && data) {
      return data;
    }
  } catch (e) {
    console.warn("Could not load backtest results from DB:", e);
  }
  return [];
}
