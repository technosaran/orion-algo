# Design Doc: Simple Strategy Builder Mode

## 1. Intent & The Why
Users currently find the Strategy Builder overwhelming because it immediately confronts them with 5 dense sections of technical trading jargon (e.g. `MIS/CNC/NRML`, indicator offsets `[t-1]`, lot multipliers, slippage, STT taxes, nested logic blocks). A beginner or intermediate trader cannot easily understand what is happening or how to test a basic idea.

The goal is to make Strategy Builder immediately understandable, intuitive, and friendly by introducing a **Simple Mode** as the default, while preserving **Advanced Mode** for power users.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Default to Simple Mode**: A clean, beginner-friendly view that anyone can understand in under 30 seconds.
- **1-Click Popular Strategies**: Quick-select cards for the most proven, popular Indian market strategies:
  - *EMA Trend Follower* (Buy when Price > 20 EMA, Sell when Price < 20 EMA)
  - *RSI Dip Buyer / Rebound* (Buy when RSI < 30 oversold, Sell when RSI > 70)
  - *Supertrend Intraday* (Buy when Supertrend turns green, Exit at 3:15 PM)
  - *Intraday Momentum Scalper* (Fast 9/21 EMA crossover on 3m candles)
- **3-Step Plain English Builder**:
  - **Step 1: What do you want to trade?** (Simple asset selector: NIFTY 50, BANKNIFTY, SENSEX, RELIANCE, etc. with capital amount in ₹).
  - **Step 2: When should it Buy?** (Plain-English triggers: e.g. "Price crosses above Moving Average", "RSI dips below 30", "Supertrend turns bullish").
  - **Step 3: When should it Exit?** (Clean profit target % and stop-loss % sliders/inputs, plus auto-exit at 3:15 PM switch).
- **Live Plain-English Strategy Sentence**: A prominent banner displaying exactly what the strategy does in human words (e.g., *"When NIFTY 50 crosses above 20 EMA on 5m candles, BUY 1 lot. Take profit at +2.0% or cut loss at -1.0%. Auto-exit at 3:15 PM IST."*).
- **1-Click "Test Strategy" (Backtest)**: Immediate feedback showing simulated profit, win rate, and performance charts.
- **Toggle to Advanced Mode**: Power users can toggle to the granular 5-section editor anytime with a single click.

### Non-Goals
- Removing or dumbing down existing data structures (the underlying `StrategyConfig` format remains fully compatible).
- Rewriting backend historical data APIs or backtesting simulation math.

### Anti-Goals
- Do not create a separate disconnected strategy format. Any strategy created in Simple Mode can be toggled into Advanced Mode and vice versa.
- Do not hide the "Test Strategy" / "Run Backtest" or Save capabilities.

---

## 3. Constraints
- Must use existing Next.js App Router and Tailwind CSS / Lucide icons design system in `algoX`.
- Must preserve Supabase database persistence (`saveStrategyToDb`, `getStrategiesFromDb`) and historical market data backtesting (`runBacktest`).

---

## 4. Approaches Considered
1. **Option 1: "Simple Mode" vs "Advanced Mode" Toggle with 1-Click Recipes (CHOSEN)**
   - *Pros*: Gives immediate clarity and 1-click execution for beginners, while preserving all existing depth for algorithmic traders. Completely removes confusion without breaking existing features.
   - *Cons*: Requires maintaining a shared state sync between simple configuration fields and the underlying `StrategyConfig`.
2. **Option 2: Multi-step Wizard Flow**
   - *Pros*: Isolates each question to a single screen.
   - *Cons*: Slower to iterate, requires multiple page clicks to tweak a single parameter like stop-loss.
3. **Option 3: Pure AI / Text-Prompt Builder**
   - *Pros*: Very easy for chat lovers.
   - *Cons*: Non-deterministic, requires typing or clicking prompts, less visual than 1-click visual cards.

**Decision**: The user selected **Option 1**.

---

## 5. UI & Architecture Design

### Top Bar Mode Switch
A sleek pill toggle in `StrategyHeader` or above the main canvas:
```
[ ⚡ Simple Mode (Default) ]  [ ⚙️ Advanced Mode ]
```

### Simple Mode Layout:
1. **Quick-Start Preset Cards (Top Carousel / Grid)**:
   - 4 visual cards with icon, badge, win-rate tag, and 1-click "Use this Strategy" button.
2. **Live Explanation Banner**:
   - High-contrast green/emerald accent callout:
     *"Your Strategy in Plain English: If NIFTY 50 closes above 20 EMA on 5m candles, BUY 1 lot. Auto-exit if profit reaches +2.0% (₹2,000) or loss reaches -1.0% (₹1,000)."*
3. **The 3-Step Plain English Builder**:
   - **Card 1: Market & Budget**:
     - Asset buttons: `NIFTY 50`, `BANKNIFTY`, `RELIANCE`, `TCS`
     - Timeframe: `3m (Fast)`, `5m (Intraday)`, `15m (Standard)`, `1D (Daily)`
     - Capital: `₹50,000`, `₹1,00,000`, `₹2,00,000`, `₹5,00,000`
   - **Card 2: Buy Rule (Entry Trigger)**:
     - Clear dropdown of human-friendly rules:
       - *"Price Crosses Above 20 EMA (Trend Breakout)"*
       - *"RSI Dips Below 30 (Oversold Bounce)"*
       - *"Supertrend Turns Green (Bullish Trend)"*
       - *"Price Crosses Above VWAP (Intraday Momentum)"*
   - **Card 3: Exit & Safety Rules**:
     - Take Profit Target: Quick buttons `+1.5%`, `+2.0%`, `+3.0%`, `+5.0%`
     - Stop Loss Protection: Quick buttons `-0.8%`, `-1.0%`, `-1.5%`, `-2.0%`
     - Intraday Square-off at 3:15 PM toggle (on by default for safety).
4. **Primary Action**:
   - Big Emerald Button: `▶ Run Backtest & See Results`
   - Backtest results summary rendered right below.

---

## 6. What's Left to the Builder
- Component implementation: Create `src/components/strategy-builder/SimpleStrategyBuilder.tsx`.
- Wire `isSimpleMode` state into `src/app/strategy-builder/page.tsx` (default `true`).
- Bidirectional synchronization with `StrategyConfig`.
- Verification of backtest execution and UI responsiveness.
