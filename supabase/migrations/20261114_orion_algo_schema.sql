-- ============================================================
-- ORION ALGO - PostgreSQL / Supabase Schema for Indian Markets
-- Database Migration: 20261114_orion_algo_schema.sql
-- ============================================================

-- 1. Strategies Table
CREATE TABLE IF NOT EXISTS public.strategies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT NOT NULL, -- momentum, scalping, trend, breakout, mean_reversion
    asset_class TEXT NOT NULL, -- nse_fno, nse_equity, mcx_commodity, bse_equity
    symbol TEXT NOT NULL, -- NIFTY 50, BANKNIFTY, RELIANCE, CRUDEOIL, etc.
    product_type TEXT DEFAULT 'MIS', -- MIS, CNC, NRML
    currency TEXT DEFAULT 'INR',
    timeframe TEXT NOT NULL, -- 1m, 3m, 5m, 15m, 1h, 1D
    direction TEXT NOT NULL, -- long, short, both
    order_type TEXT NOT NULL, -- market, limit, stop_market
    initial_capital NUMERIC NOT NULL DEFAULT 100000,
    entry_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
    custom_exit_enabled BOOLEAN DEFAULT FALSE,
    exit_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
    risk_management JSONB NOT NULL DEFAULT '{}'::jsonb,
    position_sizing JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on symbol, category, and updated_at
CREATE INDEX IF NOT EXISTS idx_strategies_symbol ON public.strategies(symbol);
CREATE INDEX IF NOT EXISTS idx_strategies_asset_class ON public.strategies(asset_class);
CREATE INDEX IF NOT EXISTS idx_strategies_updated_at ON public.strategies(updated_at DESC);

-- 2. Backtest Results Table
CREATE TABLE IF NOT EXISTS public.backtest_results (
    id TEXT PRIMARY KEY,
    strategy_id TEXT,
    strategy_name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    currency TEXT DEFAULT 'INR',
    timeframe TEXT NOT NULL,
    metrics JSONB NOT NULL, -- netProfit, winRate, profitFactor, sharpeRatio, etc.
    equity_curve JSONB NOT NULL, -- step by step equity series
    trades JSONB NOT NULL, -- executed orders journal
    monthly_returns JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backtest_strategy_id ON public.backtest_results(strategy_id);
CREATE INDEX IF NOT EXISTS idx_backtest_created_at ON public.backtest_results(created_at DESC);

-- 3. Paper Trading Account State Table
CREATE TABLE IF NOT EXISTS public.paper_account (
    id TEXT PRIMARY KEY DEFAULT 'default',
    initial_balance NUMERIC NOT NULL DEFAULT 1000000,
    cash_balance NUMERIC NOT NULL DEFAULT 1000000,
    bot_active BOOLEAN DEFAULT FALSE,
    bot_strategy_id TEXT DEFAULT 'rsi_mean_reversion',
    bot_speed_sec NUMERIC DEFAULT 3,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Paper Trading Active Positions Table
CREATE TABLE IF NOT EXISTS public.paper_positions (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL, -- LONG or SHORT
    quantity NUMERIC NOT NULL,
    entry_price NUMERIC NOT NULL,
    current_price NUMERIC NOT NULL,
    margin_used NUMERIC NOT NULL,
    take_profit NUMERIC,
    stop_loss NUMERIC,
    unrealized_pnl NUMERIC DEFAULT 0,
    unrealized_pnl_percent NUMERIC DEFAULT 0,
    entry_time TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Paper Trading Orders Table
CREATE TABLE IF NOT EXISTS public.paper_orders (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL, -- BUY or SELL
    type TEXT NOT NULL, -- MARKET, LIMIT, SL-M, STOP
    price NUMERIC NOT NULL,
    target_price NUMERIC,
    quantity NUMERIC NOT NULL,
    total_value NUMERIC NOT NULL,
    status TEXT NOT NULL, -- PENDING, FILLED, CANCELLED, REJECTED
    take_profit NUMERIC,
    stop_loss NUMERIC,
    is_algo_trade BOOLEAN DEFAULT FALSE,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    executed_at TIMESTAMPTZ
);

-- 6. Paper Trading Closed Trades (History) Table
CREATE TABLE IF NOT EXISTS public.paper_trades (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    entry_price NUMERIC NOT NULL,
    exit_price NUMERIC NOT NULL,
    realized_pnl NUMERIC NOT NULL,
    realized_pnl_percent NUMERIC NOT NULL,
    opened_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ DEFAULT NOW(),
    close_reason TEXT
);

-- 7. Paper Trading Bot Logs Table
CREATE TABLE IF NOT EXISTS public.paper_bot_logs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- INFO, SIGNAL, ORDER, RISK
    message TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Row Level Security (RLS) Configuration
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtest_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_bot_logs ENABLE ROW LEVEL SECURITY;

-- Allow public access for anon/authenticated clients
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public read write strategies" ON public.strategies;
    CREATE POLICY "Public read write strategies" ON public.strategies FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public read write backtest_results" ON public.backtest_results;
    CREATE POLICY "Public read write backtest_results" ON public.backtest_results FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public read write paper_account" ON public.paper_account;
    CREATE POLICY "Public read write paper_account" ON public.paper_account FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public read write paper_positions" ON public.paper_positions;
    CREATE POLICY "Public read write paper_positions" ON public.paper_positions FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public read write paper_orders" ON public.paper_orders;
    CREATE POLICY "Public read write paper_orders" ON public.paper_orders FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public read write paper_trades" ON public.paper_trades;
    CREATE POLICY "Public read write paper_trades" ON public.paper_trades FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public read write paper_bot_logs" ON public.paper_bot_logs;
    CREATE POLICY "Public read write paper_bot_logs" ON public.paper_bot_logs FOR ALL USING (true) WITH CHECK (true);
END $$;

GRANT ALL PRIVILEGES ON TABLE public.strategies TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.backtest_results TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.paper_account TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.paper_positions TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.paper_orders TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.paper_trades TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.paper_bot_logs TO anon, authenticated, service_role;
