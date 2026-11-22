# Orion Algo: Emotion-Free Autonomous Trading System Design Specification

## 1. Executive Summary & Intent

Human trading suffers from emotional biases: fear of taking a loss, moving stop-losses out, revenge trading after a bad fill, overleveraging during a hot streak, or hesitating on valid setups.

The **Orion Algo Autonomous Trading System** eliminates human emotion by transforming trade decisions into a deterministic, rule-based autonomous state machine. Every market tick is evaluated algorithmically, passed through strict Pre-Trade Risk Management System (RMS) circuit breakers, sized mathematically based on portfolio risk limits, executed instantly, and protected by dynamic trailing stops and automatic intraday square-offs.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **100% Autonomous Execution**: Background daemon running 24/7 or during market hours that evaluates signals, places orders, and manages exits without manual intervention.
- **Zero-Emotion Risk Controls**: Hard coded rules that cannot be emotionally overridden in the moment:
  1. Automated Pre-Trade RMS Validation (order cost, max open positions, capital limit).
  2. Anti-Revenge Trading Cooldown: 30-minute freeze after 2 consecutive losses.
  3. Max Daily Loss Circuit Breaker: Auto-kill switch trip if daily loss hits ₹10,000 (or configured limit).
  4. Mandatory 3:15 PM IST MIS Square-Off: Auto market exit of all intraday positions.
  5. Dynamic Trailing Stop-Loss: Ratchets to breakeven at +1.5R, trails to lock in profits.
- **Multi-Strategy Suite**: Calibrated for Indian instruments (`NIFTY50`, `BANKNIFTY`, `RELIANCE`, `TCS`, `CRUDEOIL`) with multi-indicator rules (VWAP, Supertrend, 9/21 EMA, RSI Mean Reversion, Donchian Breakouts).
- **All Types of Testing Suite**:
  1. Unit tests for RMS rules, indicators, and trailing stop math.
  2. Integration tests for order matching, SL/TP execution, and broker gateways.
  3. Stress & Monte Carlo simulation tests (1,000 resamples for max drawdown and ruin probability).
  4. Deterministic Simulated Market Session runner for 24/7 off-hours testing.

### Non-Goals
- High-frequency co-located microsecond trading (Orion Algo operates at 1s-5s tick / 1m-15m candle scale, ideal for retail & institutional prop desk APIs).
- Discretionary manual override of automated stop-losses while a trade is live.

### Anti-Goals
- Allowing a trader or bot to enter a trade without an attached Stop-Loss.
- Continuing to trade after the daily loss ceiling has been reached.

---

## 3. Core Subsystems

```
                                +---------------------------+
                                |   Live / Simulated Market |
                                |      (Ticks & Candles)    |
                                +-------------+-------------+
                                              |
                                              v
                                +---------------------------+
                                | Strategy Signal Evaluator |
                                | (VWAP, EMA, RSI, Donchian)|
                                +-------------+-------------+
                                              |
                                              v [Signal: BUY/SELL]
                                +---------------------------+
                                |     Pre-Trade RMS Guard   |
                                |  - Kill Switch Active?    |
                                |  - Past 15:15 Cutoff?     |
                                |  - Daily Loss Breached?   |
                                |  - In Revenge Cooldown?   |
                                |  - Max Positions Reached? |
                                +-------------+-------------+
                                              |
                       [RMS PASSED]           |           [RMS REJECTED]
                     +------------------------+-------------------------+
                     |                                                  |
                     v                                                  v
       +----------------------------+                     +---------------------------+
       | Order Creation & Sizing    |                     | Order Blocked & Logged    |
       | - Mathematical 1-2% Risk   |                     | Reason recorded in Audit  |
       | - Hard Initial SL & TP     |                     +---------------------------+
       +-------------+--------------+
                     |
                     v
       +----------------------------+
       | Execution & Match Engine   |
       | - Paper Trading DB / Kite  |
       +-------------+--------------+
                     |
                     v
       +----------------------------+
       | Position & Trailing SL     |
       | - Tick-by-tick MTM update  |
       | - Ratchet SL up (Never down|
       | - 15:15 IST Auto Square-off|
       +----------------------------+
```

---

## 4. Indian Regulatory Transaction Cost Modeling

To ensure backtest reality matches live trading, all backtests and simulations incorporate:
- **Brokerage**: ₹20 flat per order (Zerodha / Angel One standard).
- **STT (Securities Transaction Tax)**: 0.1% on equity delivery, 0.025% on equity intraday sell, 0.0125% on option exercise/turnover.
- **Exchange Turnover Charges**: NSE 0.00345%.
- **GST**: 18% on (Brokerage + Exchange Charges).
- **SEBI Charges**: ₹10 per crore (0.0001%).
- **Stamp Duty**: 0.003% on buy value.
- **Slippage**: Configurable 0.02% - 0.05% per execution.

---

## 5. Verification & Acceptance Criteria

1. RMS unit test suite passes 100% of cases covering consecutive loss cooldowns, daily loss circuit breaker, and trailing stop ratchet logic.
2. Paper matching engine correctly intercepts rejected orders when RMS is triggered and executes trailing stop-loss adjustments.
3. Deterministic market simulator can execute a 50-tick trading session on demand and return complete performance metrics.
4. Monte Carlo stress test executes 500+ iterations calculating 95th percentile max drawdown and VaR.
5. All frontend test suites (`npm test`) and backend tests pass with zero failures.
