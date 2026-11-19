# Market Data & Training Hub Complete Overhaul Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve critical data persistence bugs (crypto slash path failures, Yahoo lookback limits, backtest query link disconnection, empty CSV exports, and duplicate entries) and completely redesign the Market Data & Training Hub into an institutional-grade quant terminal with mini SVG price sparklines, interactive candlestick chart inspection, custom ticker fetch, and custom CSV dataset imports.

**Architecture:**
- Backend API layer: `/api/market-data/batch` and `/api/market-data/datasets` sanitized for special character symbols (`/` -> `-`), lookback range bounds enforcement, and dataset deduplication by symbol + timeframe.
- Data presentation: Reusable SVG sparklines for rapid visual trend identification on cards, and `lightweight-charts` Candlestick + Volume series for full-fidelity inspection.
- Inter-page workflow: Deep linking from dataset library cards into `/backtesting` with pre-populated symbol, timeframe, and initial strategy execution.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide React, lightweight-charts, Supabase / local filesystem storage.

**Spec:** Redesign and fix `/data` (Market Data & Training Hub) as described in brainstorming session.

## Global Constraints
- Must run cleanly under Next.js 16 App Router (wrap `useSearchParams` in `<Suspense>`).
- Preserve offline/serverless compatibility with local filesystem fallback and Supabase syncing.
- Support both Indian assets (`₹`) and Global / Crypto assets (`$`).
- Maintain zero TypeScript or build errors.

## Review Focus
1. Crypto symbols (`BTC/USDT`, etc.) must save and load without file path errors on Windows / Linux.
2. Incompatible timeframe/lookback combinations (e.g. `15m` with `1y`) must auto-clamp instead of failing with Yahoo 400 errors.
3. Clicking "Backtest" on any dataset card must open `/backtesting` with that exact symbol pre-loaded.
4. CSV and JSON downloads must never download empty files; full candle data must be fetched and verified before export.
5. Library cards must render visual trend sparklines and accurate currency symbols (`₹` vs `$`).

---

### Task 1: Core Engine Fixes & Symbol Sanitization in Batch & Datasets API
**Files:**
- Modify: `src/app/api/market-data/batch/route.ts`
- Modify: `src/app/api/market-data/datasets/route.ts`
- Modify: `src/lib/marketDataService.ts`
- Modify: `src/lib/datasetStorage.ts`

- [ ] Sanitize symbol identifiers for file paths and IDs: replace `/` with `-` (e.g. `BTC/USDT` -> `ds-btc-usdt-15m`).
- [ ] Implement smart lookback range clamping in `src/lib/marketDataService.ts` for Yahoo Finance:
  - `1m` -> max `7d`
  - `5m` -> max `60d`
  - `15m` -> max `60d` (clamp `1y` or `3mo` down to `1mo` with fallback)
  - `1h` -> max `730d`
  - `1D` -> up to `5y`
- [ ] Deduplicate catalog entries on `symbol + timeframe` so multiple fetches update existing datasets instead of creating duplicates.
- [ ] Normalize Supabase snake_case fields (`candle_count`, `start_date`, `end_date`) to camelCase (`candleCount`, `startDate`, `endDate`).
- [ ] Ensure `downloadDatasetCSV` and `downloadDatasetJSON` verify full candle data presence before download and throw friendly notifications if candles are missing.

### Task 2: Wire Backtesting Page to URL Query Parameters
**Files:**
- Modify: `src/app/backtesting/page.tsx`

- [ ] Import `useSearchParams` from `next/navigation`.
- [ ] Wrap the inner backtesting client logic in a `<Suspense>` boundary.
- [ ] Read `symbol` and `timeframe` from searchParams on mount and update `config` state accordingly so clicking "Backtest" from the Data Hub runs immediately for that asset.

### Task 3: Dataset Card Sparkline & Currency Formatting Utility
**Files:**
- Create: `src/components/data/DatasetSparkline.tsx`
- Modify: `src/lib/formatters.ts`

- [ ] Create `DatasetSparkline.tsx` that takes `CandleData[]` or `number[]` and renders an SVG sparkline with green/red gradient fill based on start vs end price.
- [ ] In `src/lib/formatters.ts`, add `formatAssetPrice(amount: number, symbol: string, category?: string): string` and `getCurrencySymbol(symbol: string, category?: string): string` returning `$` for crypto/global and `₹` for Indian assets.

### Task 4: Interactive Candlestick & Volume Inspector Modal
**Files:**
- Create: `src/components/data/DatasetInspectorModal.tsx`

- [ ] Build a modal utilizing `lightweight-charts` or responsive Canvas candlestick + volume bars.
- [ ] Display dataset KPI cards: High, Low, Average Close, Volatility %, ATR, and Date Span.
- [ ] Include a view toggle between "Interactive Candlestick Chart" and "Raw Candle Table" (with search and pagination).
- [ ] Provide header actions: "Open in Backtest", "Export CSV", "Export JSON", "Close".

### Task 5: Custom CSV Dataset Uploader Component
**Files:**
- Create: `src/components/data/CsvDatasetUploaderModal.tsx`

- [ ] Build a modal with drag-and-drop CSV upload zone.
- [ ] Parse CSV rows in-browser (supporting standard header formats: Date/Time, Open, High, Low, Close, Volume).
- [ ] Validate parsed candles, calculate dataset statistics, and save to storage via `/api/market-data/datasets`.
- [ ] Provide sample CSV template download.

### Task 6: Complete Redesign of Market Data Hub Page
**Files:**
- Modify: `src/app/data/page.tsx`

- [ ] Overhaul header with dataset count, total data points, and "Upload Custom CSV" button.
- [ ] Redesign "Fetch New Market Datasets" section:
  - Categorized instrument tabs (Indian Indices, Indian Equities, Commodities, Crypto).
  - "Add Custom Ticker" input allowing any valid symbol (e.g. `AAPL`, `TSLA`, `TATACONSUM`, `ZOMATO`).
  - Active lookback range compatibility indicators.
  - Polished batch fetch button with animated progress and detailed result banner.
- [ ] Redesign "Stored Datasets Library":
  - Responsive 3-column card grid with `DatasetSparkline`, asset category badges, timeframe pills, candle counts, price range, and correct currency symbols.
  - Quick action toolbar: Inspect (Eye), Download CSV (Spreadsheet), Download JSON (Code), Delete (Trash).
  - Deep-linked "Backtest" button passing `?symbol=${ds.symbol}&timeframe=${ds.timeframe}`.
- [ ] Wire up `DatasetInspectorModal` and `CsvDatasetUploaderModal`.

### Task 7: End-to-End Verification & Validation
**Files:**
- Execute verification tests via `vitest` or node script.
- Verify batch fetching of `BTC/USDT` (crypto with slash) and `NIFTY50`.
- Verify lookback clamping (e.g. `15m` with `1y` returns candles instead of error).
- Verify `next build` runs with 0 errors.
