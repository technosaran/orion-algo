-- ============================================================
-- ORION ALGO - Market Datasets & Historical Storage Schema
-- Database Migration: 20261114_market_datasets.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.market_datasets (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    timeframe TEXT NOT NULL, -- 1m, 5m, 15m, 1h, 1D
    category TEXT DEFAULT 'stock', -- stock, index, crypto, commodity
    source TEXT DEFAULT 'yahoo', -- yahoo, binance
    candle_count INTEGER NOT NULL,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    candles JSONB NOT NULL DEFAULT '[]'::jsonb,
    stats JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_datasets_symbol ON public.market_datasets(symbol);
CREATE INDEX IF NOT EXISTS idx_market_datasets_timeframe ON public.market_datasets(timeframe);
CREATE INDEX IF NOT EXISTS idx_market_datasets_created_at ON public.market_datasets(created_at DESC);

ALTER TABLE public.market_datasets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read write market_datasets" ON public.market_datasets;
CREATE POLICY "Public read write market_datasets" ON public.market_datasets FOR ALL USING (true) WITH CHECK (true);

GRANT ALL PRIVILEGES ON TABLE public.market_datasets TO anon, authenticated, service_role;
