# Orion Algo: 10-Agent Autonomous Trading Swarm Architecture Specification

## 1. Executive Summary & Vision

Traditional algorithmic trading uses rigid, single-threaded if/else pipelines that fail during volatile regime shifts, unexpected macro news, or liquidity traps.

The **Orion Algo 10-Agent Autonomous Swarm** models an institutional hedge fund trading floor by decomposing trade ideation, verification, sizing, execution, and review into **10 autonomous, specialized agent personas**. Each agent runs isolated analytical models, casts weighted votes, and produces actionable conviction scores. 

Trades are executed only when the swarm reaches quantitative consensus (minimum 65% weighted conviction) **AND** clears the absolute risk veto of the **RMS Guardian Agent**.

---

## 2. The 10 Specialized Trading Agents

```
+----------------------------------------------------------------------------------------------------+
|                                    10-AGENT TRADING SWARM                                          |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [Alpha Generation & Signals]             [Context & Macro]            [Derivatives & Arbitrage]   |
|  - Agent 1: Regime Scanner                - Agent 4: Institutional      - Agent 3: Options Greeks   |
|  - Agent 2: Technical Quant                 Flow (FII/DII)              - Agent 9: Statistical      |
|                                           - Agent 5: Macro Sentinel                 Arbitrage       |
|                                                                                                    |
|                                         |                                                          |
|                                         v (Signals & Market Context)                               |
|                     +---------------------------------------+                                      |
|                     |     SWARM CONSENSUS ORCHESTRATOR      |                                      |
|                     |   - Weighted Quorum (>65% Conviction) |                                      |
|                     +-------------------+-------------------+                                      |
|                                         |                                                          |
|                                         v (Proposed Order)                                         |
|                     +---------------------------------------+                                      |
|                     |  Agent 6: RMS GUARDIAN (VETO POWER)   |                                      |
|                     |  - SEBI limits, ₹10k loss ceiling     |                                      |
|                     +-------------------+-------------------+                                      |
|                                         |                                                          |
|                                  [APPROVED]                                                        |
|                                         |                                                          |
|  [Portfolio Sizing]                     v                      [Execution & Review]                |
|  - Agent 8: Capital Allocator  --> [Order Sized] ---------->   - Agent 7: Execution Sniper         |
|                                                                - Agent 10: Performance Auditor     |
+----------------------------------------------------------------------------------------------------+
```

### 1. Market Regime & Universe Scanner Agent (`RegimeScannerAgent`)
- **Objective:** Classifies current market structure into 4 quantitative regimes: `BULL_TREND`, `BEAR_TREND`, `COMPRESSED_RANGE` (low vol chop), or `EXPLOSIVE_VOLATILITY`.
- **Indicators:** Average Directional Index (ADX 14), ATR Percentile, Donchian Channel Width, Hurst Exponent.
- **Output:** `MarketRegime(regime="BULL_TREND", adx=32.4, volatility_state="NORMAL", suitable_strategies=["TREND_CONTINUATION", "MOMENTUM_BREAKOUT"])`.

### 2. Technical Momentum & Trend Quant Agent (`TechnicalQuantAgent`)
- **Objective:** Analyzes multi-timeframe price action across 1m, 3m, 5m, and 15m candles.
- **Indicators:** VWAP position, Supertrend (10, 3) flips, 9/21 and 50/200 EMA momentum crossovers, RSI (14) momentum and divergences.
- **Output:** Directional signal (`BUY`, `SELL`, `NEUTRAL`), confidence score `[-1.0, 1.0]`, stop-loss anchor price, target anchor price.

### 3. Options Greeks & Volatility Arbitrage Agent (`OptionsGreekAgent`)
- **Objective:** Real-time analysis of NSE Live Derivatives option chain for NIFTY, BANKNIFTY, FINNIFTY, and equity underlyings.
- **Analytics:** Black-Scholes Greeks (Delta $\Delta$, Gamma $\Gamma$, Theta $\Theta$, Vega $\nu$), Put-Call Ratio (PCR), Max Pain strike, At-the-Money Implied Volatility (IV) skew.
- **Output:** Recommendation of specific instrument type (`EQUITY`, `FUTURES`, `CALL_BUY`, `PUT_BUY`, `BULL_SPREAD`, `SHORT_STRADDLE`), optimal strike selection, IV rank percentile.

### 4. FII / DII & Smart Money Flow Agent (`InstitutionalFlowAgent`)
- **Objective:** Tracks institutional cash and derivative activity from daily NSE trade digests, participant OI reports, and live block/bulk deal transactions.
- **Analytics:** FII Net Index Futures Long/Short ratio, FII Cash Net ₹ Cr flow, DII buying absorption, Volume Weighted Price Distribution.
- **Output:** Smart Money Sentiment (`STRONG_ACCUMULATION`, `MODERATE_ACCUMULATION`, `DISTRIBUTION`, `NEUTRAL`), conviction multiplier `[0.5, 1.5]`.

### 5. Macro & Event Risk Sentinel Agent (`MacroSentinelAgent`)
- **Objective:** Protects against black swan events, sudden policy shocks, and high-volatility scheduled releases.
- **Monitored Events:** RBI Monetary Policy Committee (MPC) rate announcements, Union Budget, US FOMC rate decisions, quarterly corporate earnings for heavyweights (Reliance, HDFC, TCS, Infosys), weekly Thursday index expiries.
- **Output:** `EventRiskLevel(level="SAFE"|"CAUTION"|"BLACKOUT", reason=str, size_haircut_pct=float)`. Forces complete trading halt or 50% position reduction within 30 minutes of scheduled high-impact events.

### 6. SEBI RMS Guardian & Chief Risk Officer Agent (`RMSGuardianAgent`)
- **Objective:** Absolute gatekeeper with unconditional veto power. Enforces institutional risk management rules and SEBI margin guidelines.
- **Hard Rules:**
  1. Maximum Daily Realized/Unrealized Loss limit (default ₹10,000 ceiling). If breached, activates emergency Kill Switch.
  2. Maximum Capital at Risk per trade (max 2% portfolio risk).
  3. Maximum Open Positions ceiling (default 5 concurrent trades).
  4. Mandatory 3:15 PM IST MIS Intraday Auto Square-Off.
  5. Anti-Revenge Trading Cooldown: 30-minute freeze after 2 consecutive losing trades.
- **Output:** `RMSVerdict(approved=bool, veto_reason=Optional[str], adjusted_max_size=int)`.

### 7. Smart Order Router & Execution Sniper Agent (`ExecutionSniperAgent`)
- **Objective:** Achieves optimal fill prices and eliminates market impact and slippage.
- **Execution Logic:**
  - Evaluates Bid-Ask spread depth and order book imbalance.
  - Dynamically routes between Limit Orders with aggressive chasing (3-tick peg) or Market Orders if momentum is accelerating.
  - Slices large block orders using Time-Weighted Average Price (TWAP) or Volume-Weighted Average Price (VWAP).
  - Interfaces directly with Angel One SmartAPI (automated TOTP 2FA) and Zerodha Kite Connect.
- **Output:** `ExecutionPlan(order_type="LIMIT", limit_price=float, routing_broker="ANGEL_ONE", slicing_chunks=int)`.

### 8. Dynamic Capital Allocator Agent (`CapitalAllocatorAgent`)
- **Objective:** Sizes positions mathematically based on edge, win probability, and volatility.
- **Mathematical Sizing:**
  - Fractional Kelly Criterion: $f^* = \frac{p \cdot b - q}{b} \times 0.5$ where $p$ is estimated win rate, $b$ is payoff ratio, and $q = 1 - p$.
  - Volatility Parity / ATR Position Sizing: $Quantity = \frac{\text{Capital Risk (e.g. ₹2,000)}}{2 \times \text{ATR}(14)}$.
- **Output:** `AllocationPlan(allocated_capital_inr=float, quantity=int, leverage_ratio=float)`.

### 9. Statistical Arbitrage & Pairs Agent (`StatArbAgent`)
- **Objective:** Exploits pricing inefficiencies, basis divergence, and cointegrated asset pairs.
- **Strategies:**
  - Futures vs. Spot Basis Arbitrage (Cost of Carry).
  - Cointegrated Indian pairs: NIFTY 50 vs. BANKNIFTY ratio, HDFCBANK vs. ICICIBANK, TCS vs. INFY.
  - Computes rolling 30-period z-score of spread: triggers mean-reverting entry when $|z| > 2.0$.
- **Output:** `StatArbSignal(pair=("HDFCBANK", "ICICIBANK"), spread_zscore=2.35, action="LONG_HDFC_SHORT_ICICI", expected_mean_reversion_days=2)`.

### 10. Performance Critic & Self-Auditing Trade Journal Agent (`PerformanceAuditorAgent`)
- **Objective:** Post-trade quantitative analysis, psychological tilt monitoring, and parameter reinforcement feedback.
- **Functions:**
  - Compares actual fill price against signal arrival price to compute exact slippage in basis points.
  - Maintains rolling Sharpe Ratio, Sortino Ratio, Profit Factor, Win Rate, and Average R-Multiple.
  - Flags strategy degradation if rolling 10-trade win rate falls below 35% and signals parameter recalibration.
  - Automatically logs every trade with setup tags and performance metrics to Supabase / local database.
- **Output:** `AuditReport(trade_id=str, slippage_bps=float, r_multiple=float, health_status="HEALTHY"|"WARNING"|"NEEDS_RECALIBRATION")`.

---

## 3. Swarm Consensus & Voting Architecture

1. **Analysis Cycle Trigger**: The Swarm can be triggered either on a 5-second tick loop, at candle close (1m/5m), or on-demand via the UI `/api/v1/agents/cycle`.
2. **Parallel Agent Execution**: All 10 agents evaluate the current market state independently.
3. **Consensus Aggregator**:
   - Technical Quant + Regime Scanner + StatArb + Options Greek cast directional votes (`BUY`, `SELL`, `HOLD`) with conviction scores $[0.0, 1.0]$.
   - Institutional Flow and Macro Sentinel apply conviction multipliers.
   - Total Conviction is weighted:
     $$\text{Conviction} = \sum (w_i \times c_i)$$
   - Minimum threshold: 65% consensus required to generate a trade proposal.
4. **Veto Gate (RMS Guardian)**:
   - If RMS Guardian approves, Capital Allocator sizes the trade and Execution Sniper routes it.
   - If RMS Guardian vetoes, the proposal is immediately killed and logged with the veto reason.

---

## 4. REST API & UI Integration

- **Backend:**
  - `backend/app/services/agents/`: Directory housing all 10 agent classes and `swarm_coordinator.py`.
  - `backend/app/api/v1/endpoints/agents.py`: Exposes `/status`, `/cycle`, `/toggle`, and `/logs`.
- **Frontend:**
  - `src/app/agent-swarm/page.tsx`: Real-time Swarm Command Center.
  - `src/components/agents/AgentSwarmTerminal.tsx`: Real-time cards for all 10 agents, consensus meter, live deliberation feed, and execution trigger.
  - Main navigation bar updated with "Agent Swarm" link.
