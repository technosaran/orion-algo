# Simple Strategy Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the complex Strategy Builder into a clean, 1-click beginner-friendly interface with Simple/Advanced modes, plain-English explanations, and instant backtesting.

**Architecture:** Create an intuitive `SimpleStrategyBuilder` component that abstracts low-level configuration behind high-level concepts (asset, friendly rule, target/stop-loss). Add a mode toggle in `StrategyHeader` and `page.tsx` that defaults to Simple Mode while preserving full backward compatibility with Advanced Mode and the underlying `StrategyConfig`.

**Tech Stack:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS, Lucide icons, existing backtesting engine (`runBacktest`).

**Spec:** `docs/superpowers/specs/2026-11-19-simple-strategy-builder-design.md`

## Global Constraints
- Must maintain 100% compatibility with `StrategyConfig` type and Supabase persistence.
- Modifying values in Simple Mode must keep the underlying `StrategyConfig` valid and backtest-ready.
- Switching between Simple Mode and Advanced Mode must be seamless with no state loss.
- Zero extra external package dependencies.

## Review Focus
- Plain English summary string updates accurately whenever the user changes symbol, rule, timeframe, or risk values.
- Popular 1-click preset buttons properly update the active strategy and re-render the plain-English summary.
- Rule picker in Simple Mode correctly maps to valid `entryGroups` indicator conditions.
- Running a backtest from Simple Mode executes seamlessly and presents easy-to-read metrics (Net P&L, Win Rate, Total Trades).
- Switching to Advanced Mode shows the exact state configured in Simple Mode without breakage.

---

### Task 1: Build the `SimpleStrategyBuilder` Component

**Files:**
- Create: `src/components/strategy-builder/SimpleStrategyBuilder.tsx`

**Description:**
Build a component that presents:
1. **1-Click Popular Strategies Carousel/Cards**:
   - Supertrend Momentum (Intraday MIS)
   - EMA 20/50 Trend Follower
   - RSI Oversold Dip Buyer (< 30)
   - BankNifty Quick Scalper (3m)
2. **Dynamic Plain-English Translation Banner**:
   - Generates and displays a human-readable sentence summarizing the strategy's entry, exit, and product parameters.
3. **Step 1: What to Trade**:
   - Symbol quick-picker: `NIFTY 50`, `BANKNIFTY`, `SENSEX`, `FINNIFTY`, `RELIANCE`, `TCS`.
   - Timeframe quick-picker: `3m (Fast)`, `5m (Intraday)`, `15m (Swing)`, `1D (Daily)`.
   - Capital quick-picker: `₹50,000`, `₹1,00,000`, `₹2,00,000`, `₹5,00,000`.
4. **Step 2: When to Buy**:
   - Curated friendly rule choices:
     - `ema_20_cross`: "Price crosses above 20 EMA (Trend Breakout)"
     - `ema_50_cross`: "Price crosses above 50 EMA (Major Bullish Trend)"
     - `rsi_oversold`: "RSI dips below 30 (Oversold Bounce)"
     - `supertrend_bullish`: "Supertrend turns Green (Bullish Momentum)"
     - `vwap_cross`: "Price crosses above VWAP (Intraday Strength)"
   - Automatically maps selected rule into `entryGroups` with appropriate indicator config.
5. **Step 3: When to Exit (Safety & Targets)**:
   - Profit Target pills: `+1.5%`, `+2.0%`, `+3.0%`, `+5.0%`.
   - Stop Loss pills: `-0.8%`, `-1.0%`, `-1.5%`, `-2.0%`.
   - Auto Intraday Square-off at 15:15 IST toggle switch.
6. **Action & Results Section**:
   - Primary `▶ Run Backtest & See Results` button.
   - Clean summary card when backtest results arrive (Net P&L with green/red badge, Win Rate %, Total Trades, Profit Factor).

- [x] Create `src/components/strategy-builder/SimpleStrategyBuilder.tsx` with all helper rule mappers and visual cards.
- [x] Implement the live plain-English sentence generator based on strategy parameters.
- [x] Implement backtest summary preview card inside Simple Mode.
- [x] Verify TypeScript types compile cleanly without errors.

---

### Task 2: Add Simple / Advanced Mode Toggle to `StrategyHeader`

**Files:**
- Modify: `src/components/strategy-builder/StrategyHeader.tsx`

**Description:**
Add the `isSimpleMode` state and toggle callback to `StrategyHeaderProps`:
- Display a mode switcher pill next to the strategy name:
  - `[ ⚡ Simple Mode ]  [ ⚙️ Advanced Mode ]`
- Ensure smooth visual transitions and active pill indicator.

- [x] Add `isSimpleMode: boolean` and `onToggleMode: (simple: boolean) => void` to `StrategyHeaderProps`.
- [x] Render the toggle pill in `StrategyHeader`.
- [x] Ensure mobile and desktop responsive layout.

---

### Task 3: Wire Simple Mode into `StrategyBuilderPage`

**Files:**
- Modify: `src/app/strategy-builder/page.tsx`

**Description:**
Integrate `SimpleStrategyBuilder` into `StrategyBuilderPage`:
- Add `isSimpleMode` state (defaulting to `true`).
- When `isSimpleMode` is `true`:
  - Render `SimpleStrategyBuilder` instead of the 5 stacked raw technical sections.
  - Hide the technical section sub-navigation bar (`01 Setup`, `02 Entry Rules`...) while in Simple Mode to avoid clutter.
- When `isSimpleMode` is `false`:
  - Render the existing full 5-section editor for power users.
- Wire backtest trigger and template selection to both modes.

- [x] Add `isSimpleMode` state (default `true`) in `page.tsx`.
- [x] Pass `isSimpleMode` and `setIsSimpleMode` to `StrategyHeader`.
- [x] Conditionally render `SimpleStrategyBuilder` vs the advanced sub-tabs and sections.
- [x] Test state synchronization between Simple Mode and Advanced Mode.

---

### Task 4: End-to-End Verification and Polish

**Files:**
- Verify: `src/app/strategy-builder/page.tsx`
- Verify: `src/components/strategy-builder/SimpleStrategyBuilder.tsx`

**Description:**
Run TypeScript checks and Next.js build verification to ensure no regressions or runtime errors:
- Test 1-click popular strategy selection.
- Test changing symbol, timeframe, capital, rule, and risk targets.
- Test running a backtest and viewing results in Simple Mode.
- Test toggling to Advanced Mode and verifying parameters are synchronized.

- [x] Run `npm run build` or `npx tsc --noEmit` to verify type safety and build integrity.
- [x] Verify hot-reload or test simulation output.
