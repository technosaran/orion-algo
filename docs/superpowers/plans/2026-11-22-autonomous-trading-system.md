# Orion Algo: Emotion-Free Autonomous Trading System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, institution-grade autonomous algorithmic trading system for Orion Algo that executes trades with zero emotional bias, incorporates pre-trade RMS circuit breakers, trailing stops, multi-regime backtesting with Monte Carlo stress testing, and a comprehensive multi-tier testing suite (unit, integration, stress, and simulated market replay).

**Architecture:** A FastAPI background daemon running a 5-second tick loop couples with an emotion-free Pre-Trade Risk Management System (RMS) enforcing capital allocation limits, consecutive-loss cooldowns, and a 3:15 PM IST MIS square-off. Market signals from 6 calibrated Indian strategies (NIFTY/BANKNIFTY/RELIANCE) flow through RMS guards to an autonomous order execution and matching engine featuring dynamic trailing stops. A quantitative audit suite runs multi-timeframe backtests with Monte Carlo drawdown simulations, alongside an all-in-one test runner verifying end-to-end autonomous trading behavior.

**Tech Stack:** Python 3.12 (FastAPI, NumPy, Pandas, TestClient/Pytest, Asyncio, Supabase-py), Next.js 16 (React 19, TypeScript, Tailwind CSS, Vitest), Supabase Cloud Database (PostgreSQL).

**Spec:** Autonomous Emotion-Free Trading System Architecture & Testing Specification (`docs/superpowers/specs/2026-11-22-autonomous-trading-system-design.md`)

## Global Constraints

- All automated trades must undergo pre-trade RMS validation before order creation; no order may bypass risk guards.
- Every position must have an automated hard Stop Loss (SL) and Take Profit (TP) assigned at creation.
- At 15:15 IST, all intraday (MIS) open positions must be automatically market-closed by the engine.
- If cumulative daily realized/unrealized loss reaches the `max_daily_loss` ceiling (default ₹10,000), the Kill Switch must immediately trip, cancel all pending orders, and halt new entries.
- Transaction costs must strictly include Indian regulatory charges: ₹20 brokerage, STT (0.1%/0.0125%), exchange turnover fees (0.00345%), 18% GST, and SEBI turnover fees (0.0001%), plus realistic slippage.
- All code must pass both `npm test` (Vitest) and backend verification test suites without regressions.

## Review Focus

1. **Revenge trading & rapid whip-saw risk:** Two or three rapid losses in volatile sideways chop causes over-trading. *Expected:* The RMS triggers an automatic 30-minute anti-revenge trading cooldown period after 2 consecutive losses.
2. **Trailing Stop ratchet failure:** Price spikes into profit and then violently reverses before TP is hit, turning a winning trade into a maximum loss. *Expected:* Dynamic trailing stop ratchets SL to breakeven once profit reaches +1.5R and trails by ATR/points, guaranteeing locked-in profits.
3. **Overnight gap risk for intraday MIS positions:** Engine fails to square off positions before exchange closes at 15:30 IST. *Expected:* The 15:15 IST auto-square-off daemon cleanly fires market exits for all MIS positions regardless of P&L.
4. **Market closed / weekend testing stall:** User cannot test autonomous trading or observe order fills on weekends when NSE/BSE markets are closed. *Expected:* A deterministic simulated tick stream engine enables simulated market trading sessions on demand.
5. **Backtest overfitting and regime shifts:** Strategy shows high backtest profit in trending market but blows up during high-volatility sideways chop. *Expected:* Monte Carlo drawdown analysis (1,000 resamples) and walk-forward verification quantify worst-case drawdown and probability of loss.

---

### Task 1: Emotion-Free Risk Management System (RMS) Enhancement

**Files:**
- Modify: `backend/app/brokers/risk_manager.py`
- Create: `backend/tests/test_risk_manager.py`

**Interfaces:**
- Consumes: Order details (`order_cost`, `available_cash`, `current_open_positions_count`), daily realized/unrealized P&L, trade outcome history.
- Produces: `validate_pre_trade(...) -> Dict[str, Any]`, `record_trade_outcome(pnl: float)`, `is_in_cooldown() -> Tuple[bool, int]`, `calculate_trailing_stop(side: str, entry_price: float, current_price: float, current_sl: float, step_pct: float) -> float`.

- [ ] **Step 1: Write the failing tests for RMS guards, cooldown, and trailing stop calculation**

```python
# backend/tests/test_risk_manager.py
import pytest
from app.brokers.risk_manager import RiskManager

def test_risk_manager_consecutive_loss_cooldown():
    rms = RiskManager(max_daily_loss=10000.0, max_consecutive_losses=2, cooldown_minutes=30)
    assert rms.is_in_cooldown()[0] is False
    
    rms.record_trade_outcome(-500.0)
    assert rms.is_in_cooldown()[0] is False
    
    rms.record_trade_outcome(-800.0)
    in_cooldown, remaining = rms.is_in_cooldown()
    assert in_cooldown is True
    assert remaining > 0
    
    check = rms.validate_pre_trade(order_cost=5000, available_cash=100000, current_open_positions_count=0)
    assert check["allowed"] is False
    assert "cooldown" in check["reason"].lower()

def test_risk_manager_daily_loss_circuit_breaker():
    rms = RiskManager(max_daily_loss=5000.0)
    rms.record_trade_outcome(-5500.0)
    assert rms.kill_switch_tripped is True
    check = rms.validate_pre_trade(order_cost=1000, available_cash=100000, current_open_positions_count=0)
    assert check["allowed"] is False

def test_risk_manager_trailing_stop_calculation():
    rms = RiskManager()
    # LONG: Entry 100, initial SL 95. Price moves to 110. Trailing SL should ratchet up.
    new_sl = rms.calculate_trailing_stop(side="LONG", entry_price=100.0, current_price=110.0, current_sl=95.0, trail_pct=0.03)
    assert new_sl > 95.0
    assert new_sl == pytest.approx(106.7, 0.1)

    # LONG: Price drops to 108. Trailing SL must NEVER move down!
    ratchet_sl = rms.calculate_trailing_stop(side="LONG", entry_price=100.0, current_price=108.0, current_sl=new_sl, trail_pct=0.03)
    assert ratchet_sl == new_sl
```

- [ ] **Step 2: Run test to verify it fails**

Run: `backend/.venv/Scripts/python.exe -m pytest backend/tests/test_risk_manager.py -v`
Expected: FAIL due to missing `max_consecutive_losses`, `record_trade_outcome`, and `calculate_trailing_stop`.

- [ ] **Step 3: Implement consecutive loss tracking, cooldown, and trailing stop in `backend/app/brokers/risk_manager.py`**

Add `max_consecutive_losses`, `cooldown_minutes`, `consecutive_losses`, `cooldown_until`, `record_trade_outcome()`, `is_in_cooldown()`, and `calculate_trailing_stop()`. Check cooldown inside `validate_pre_trade()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `backend/.venv/Scripts/python.exe -m pytest backend/tests/test_risk_manager.py -v`
Expected: PASS with all 3 test cases.

- [ ] **Step 5: Commit changes**

```bash
git add backend/app/brokers/risk_manager.py backend/tests/test_risk_manager.py
git commit -m "feat(rms): add consecutive loss cooldown, daily loss breaker, and trailing stop logic"
```

---

### Task 2: Autonomous Paper Matching Engine with Multi-Strategy Signals & Trailing Stops

**Files:**
- Modify: `backend/app/services/paper_matcher.py`
- Create: `backend/tests/test_paper_matcher.py`

**Interfaces:**
- Consumes: `risk_manager.validate_pre_trade`, `risk_manager.calculate_trailing_stop`, `risk_manager.is_intraday_square_off_time`, live quotes from `market_data_service`.
- Produces: `process_paper_engine_tick() -> Dict[str, Any]` with autonomous signal evaluation across NIFTY/BANKNIFTY/RELIANCE, trailing stop advancement, and 15:15 MIS auto-exit.

- [ ] **Step 1: Write the failing tests for paper matching, RMS intercept, and trailing SL**

```python
# backend/tests/test_paper_matcher.py
import pytest
from unittest.mock import patch, MagicMock
from app.services.paper_matcher import (
    execute_paper_market_order,
    close_position,
    process_paper_engine_tick,
)
from app.brokers.risk_manager import risk_manager

def test_execute_paper_market_order_blocked_by_kill_switch():
    risk_manager.trip_kill_switch("Test Kill Switch")
    try:
        res = execute_paper_market_order(
            symbol="NIFTY50",
            side="BUY",
            quantity=50,
            price=24500.0,
            stop_loss=24300.0,
            take_profit=24800.0,
        )
        assert res.get("status") == "rejected"
        assert "kill switch" in res.get("reason", "").lower()
    finally:
        risk_manager.reset_kill_switch()

def test_paper_engine_intraday_square_off():
    # Verify that when intraday cutoff is triggered, positions are auto-closed
    with patch("app.brokers.risk_manager.risk_manager.is_intraday_square_off_time", return_value=True):
        with patch("app.services.paper_matcher.get_open_positions", return_value=[{
            "id": "pos-test-1",
            "symbol": "NIFTY50",
            "side": "LONG",
            "quantity": 50,
            "entry_price": 24000.0,
            "current_price": 24200.0,
            "product_type": "MIS"
        }]):
            with patch("app.services.paper_matcher.close_position") as mock_close:
                with patch("app.services.paper_matcher.get_all_real_quotes", return_value=[{"symbol": "NIFTY50", "price": 24200.0}]):
                    import asyncio
                    res = asyncio.run(process_paper_engine_tick())
                    assert mock_close.called
                    assert res["status"] == "success"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `backend/.venv/Scripts/python.exe -m pytest backend/tests/test_paper_matcher.py -v`
Expected: FAIL because RMS pre-trade checks are not yet called inside `execute_paper_market_order`.

- [ ] **Step 3: Implement RMS integration, multi-strategy signals, trailing stop ratchet, and MIS auto square-off in `backend/app/services/paper_matcher.py`**

- Wire `risk_manager.validate_pre_trade` in `execute_paper_market_order`.
- In `process_paper_engine_tick`:
  1. Check `is_intraday_square_off_time()`; if true, square off all open MIS positions with reason `AUTO_MIS_SQUARE_OFF`.
  2. For open positions with trailing stop enabled, recalculate trailing SL using `risk_manager.calculate_trailing_stop`.
  3. Expand bot evaluation to handle: `vwap_supertrend` (5m), `ema_crossover` (9/21 EMA), `rsi_mean_reversion`, and `donchian_breakout`. Support both BUY and SELL (SHORT) positions.
  4. On position close, call `risk_manager.record_trade_outcome(realized_pnl)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `backend/.venv/Scripts/python.exe -m pytest backend/tests/test_paper_matcher.py -v`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add backend/app/services/paper_matcher.py backend/tests/test_paper_matcher.py
git commit -m "feat(paper-engine): integrate RMS pre-trade validation, dynamic trailing SL, and multi-strategy autonomous signals"
```

---

### Task 3: Deterministic Simulated Market Session Runner (24/7 Testing & Off-Hours Execution)

**Files:**
- Create: `backend/app/services/simulation_runner.py`
- Create: `backend/tests/test_simulation_runner.py`
- Modify: `backend/app/api/v1/endpoints/paper_trading.py`

**Interfaces:**
- Consumes: Configurable candle parameters, starting price, volatility, tick count, target strategy.
- Produces: `run_simulated_market_session(symbol: str, strategy_id: str, ticks_count: int, volatility: float) -> Dict[str, Any]` simulating an entire trading session in seconds and returning trade ledger, win rate, and RMS events.

- [ ] **Step 1: Write the failing test for the simulation runner**

```python
# backend/tests/test_simulation_runner.py
import pytest
from app.services.simulation_runner import simulate_trading_session

def test_simulate_trading_session_execution():
    result = simulate_trading_session(
        symbol="NIFTY50",
        strategy_id="ema_crossover",
        ticks_count=50,
        initial_balance=500000.0,
        base_price=24500.0,
    )
    assert result["status"] == "completed"
    assert "total_ticks" in result
    assert result["total_ticks"] == 50
    assert "trades_executed" in result
    assert "final_balance" in result
    assert "rms_events" in result
    assert isinstance(result["trades"], list)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `backend/.venv/Scripts/python.exe -m pytest backend/tests/test_simulation_runner.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.simulation_runner'`.

- [ ] **Step 3: Implement `simulation_runner.py` and register `/simulate-session` endpoint in `paper_trading.py`**

Build `simulate_trading_session` to generate synthetic/historical tick streams, feed each tick through the matching and strategy evaluation logic with strict RMS checks, and collect detailed performance analytics (trades, slippage, P&L, RMS interventions).

- [ ] **Step 4: Run test to verify it passes**

Run: `backend/.venv/Scripts/python.exe -m pytest backend/tests/test_simulation_runner.py -v`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add backend/app/services/simulation_runner.py backend/tests/test_simulation_runner.py backend/app/api/v1/endpoints/paper_trading.py
git commit -m "feat(simulation): add deterministic market session simulator for 24/7 off-hours autonomous testing"
```

---

### Task 4: Multi-Regime Backtesting & Monte Carlo Stress Testing Engine

**Files:**
- Create: `backend/app/services/stress_testing.py`
- Create: `backend/tests/test_stress_testing.py`
- Create: `backend/run_comprehensive_audit.py`

**Interfaces:**
- Consumes: Trade outcomes list from backtests or live simulations.
- Produces: `run_monte_carlo_drawdown_simulation(trades: List[Dict], iterations: int) -> Dict[str, Any]`, `run_walk_forward_backtest(...) -> Dict[str, Any]`.

- [ ] **Step 1: Write the failing test for Monte Carlo and walk-forward stress testing**

```python
# backend/tests/test_stress_testing.py
import pytest
from app.services.stress_testing import run_monte_carlo_drawdown_simulation, run_walk_forward_split

def test_monte_carlo_drawdown_simulation():
    sample_trades = [
        {"pnl": 1200.0, "pnl_pct": 1.2},
        {"pnl": -600.0, "pnl_pct": -0.6},
        {"pnl": 1800.0, "pnl_pct": 1.8},
        {"pnl": -800.0, "pnl_pct": -0.8},
        {"pnl": 2100.0, "pnl_pct": 2.1},
        {"pnl": -500.0, "pnl_pct": -0.5},
    ]
    res = run_monte_carlo_drawdown_simulation(sample_trades, initial_capital=100000.0, iterations=500)
    assert res["iterations"] == 500
    assert "max_drawdown_p95" in res
    assert "max_drawdown_p99" in res
    assert "probability_of_ruin" in res
    assert res["max_drawdown_p95"] >= 0.0

def test_walk_forward_split():
    candles = [{"close": 100 + i} for i in range(100)]
    splits = run_walk_forward_split(candles, train_ratio=0.7)
    assert len(splits["train"]) == 70
    assert len(splits["test"]) == 30
```

- [ ] **Step 2: Run test to verify it fails**

Run: `backend/.venv/Scripts/python.exe -m pytest backend/tests/test_stress_testing.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.stress_testing'`.

- [ ] **Step 3: Implement `stress_testing.py` and `run_comprehensive_audit.py`**

- Implement Monte Carlo shuffling of trade sequences to calculate 95th and 99th percentile maximum drawdowns, Sharpe distribution, and ruin probability.
- Implement walk-forward partitioning to test out-of-sample robustness across different market regimes.
- In `run_comprehensive_audit.py`, execute multi-strategy backtests across Indian instruments (`NIFTY50`, `BANKNIFTY`, `RELIANCE`, `TCS`, `CRUDEOIL`), compute full Indian regulatory taxes, run Monte Carlo analysis, and output a detailed audit report.

- [ ] **Step 4: Run test to verify it passes**

Run: `backend/.venv/Scripts/python.exe -m pytest backend/tests/test_stress_testing.py -v`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add backend/app/services/stress_testing.py backend/tests/test_stress_testing.py backend/run_comprehensive_audit.py
git commit -m "feat(quant): add Monte Carlo drawdown stress testing and walk-forward robustness engine"
```

---

### Task 5: All-In-One Automated Test Runner & Verification Suite

**Files:**
- Create: `backend/run_all_tests.py`
- Modify: `package.json` (add `"test:all"`)
- Create: `src/lib/__tests__/optionsAlgoHelper.test.ts`

**Interfaces:**
- Consumes: Pytest test runner, Vitest test runner, backend verification checks, and simulated trading session.
- Produces: Single unified execution report verifying 100% test pass rate across unit, integration, stress, and autonomous simulation layers.

- [ ] **Step 1: Write unit tests for `optionsAlgoHelper.ts`**

```typescript
// src/lib/__tests__/optionsAlgoHelper.test.ts
import { describe, it, expect } from "vitest";
import { selectOptionContract } from "@/lib/optionsAlgoHelper";

describe("optionsAlgoHelper", () => {
  it("selects correct ATM Call option contract for NIFTY bullish signal", () => {
    const contract = selectOptionContract({
      underlyingSymbol: "NIFTY50",
      spotPrice: 24520,
      direction: "BULLISH",
      executionMode: "OPTION_BUYING",
      moneyness: "ATM",
      capital: 100000,
      riskPerTradePct: 0.02,
    });

    expect(contract.strikePrice).toBe(24500); // 50-point step
    expect(contract.optionType).toBe("CE");
    expect(contract.action).toBe("BUY");
    expect(contract.stopLossPrice).toBeLessThan(contract.estimatedPremium);
    expect(contract.takeProfitPrice).toBeGreaterThan(contract.estimatedPremium);
  });

  it("selects correct ATM Put option contract for BANKNIFTY bearish signal", () => {
    const contract = selectOptionContract({
      underlyingSymbol: "BANKNIFTY",
      spotPrice: 51240,
      direction: "BEARISH",
      executionMode: "OPTION_BUYING",
      moneyness: "ATM",
      capital: 100000,
      riskPerTradePct: 0.02,
    });

    expect(contract.strikePrice).toBe(51200); // 100-point step
    expect(contract.optionType).toBe("PE");
    expect(contract.action).toBe("BUY");
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test`
Expected: PASS (all frontend test suites pass, including new optionsAlgoHelper tests).

- [ ] **Step 3: Build `backend/run_all_tests.py` orchestrating Unit, Integration, Stress, and Simulation Tests**

Create a Python orchestrator that runs:
1. RMS unit & edge case tests (`test_risk_manager.py`).
2. Paper matching and order execution tests (`test_paper_matcher.py`).
3. Monte Carlo and stress testing (`test_stress_testing.py`).
4. Backend API verification checks (`tests_verification.py`).
5. Autonomous simulated trading session verification.
6. Frontend Vitest suite via subprocess.
7. Prints a unified institutional audit certification summary.

- [ ] **Step 4: Run `python backend/run_all_tests.py` to verify full suite passes**

Run: `backend/.venv/Scripts/python.exe backend/run_all_tests.py`
Expected: ALL CHECKS PASSED with institutional test summary.

- [ ] **Step 5: Commit changes**

```bash
git add backend/run_all_tests.py package.json src/lib/__tests__/optionsAlgoHelper.test.ts
git commit -m "test: add options algo tests and unified all-in-one institutional test runner"
```

---

### Task 6: Frontend Autonomous Engine Cockpit & Test Auditor

**Files:**
- Modify: `src/app/page.tsx` (Dashboard)
- Create: `src/components/AutonomousEngineCockpit.tsx`
- Modify: `src/app/settings/page.tsx`

**Interfaces:**
- Consumes: Paper account state (`botActive`, `botStrategyId`), RMS status from `/api/live/status`, simulation endpoint `/api/v1/paper-trading/simulate-session`.
- Produces: Live emotion-free controls, real-time autonomous decision log, RMS guard monitors (consecutive losses, daily loss bar, trailing SL status), and 1-click test auditor.

- [ ] **Step 1: Create `src/components/AutonomousEngineCockpit.tsx`**

Build an interactive control panel featuring:
- Autonomous Execution Toggle (Active / Standby) with instant emotion-free status.
- RMS Shield metrics: Max Daily Loss bar, Consecutive Loss counter & Cooldown indicator, 3:15 PM MIS Cutoff status.
- Strategy Selector (VWAP + Supertrend, 9/21 EMA Scalper, Donchian Breakout, RSI Mean Reversion).
- Real-time Autonomous Decision Log with live streaming updates.
- 1-Click "Run Comprehensive Test Suite & Stress Backtest" button with live results modal.

- [ ] **Step 2: Embed `AutonomousEngineCockpit` in Dashboard (`src/app/page.tsx`)**

Integrate the component into the main dashboard view so the trader immediately sees the autonomous engine status and emotion-free risk gauges.

- [ ] **Step 3: Verify frontend builds cleanly with zero TypeScript / Lint errors**

Run: `npm run build`
Expected: Next.js build succeeds with zero errors.

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: All test suites pass.

- [ ] **Step 5: Commit changes**

```bash
git add src/components/AutonomousEngineCockpit.tsx src/app/page.tsx src/app/settings/page.tsx
git commit -m "feat(ui): add Autonomous Engine Cockpit with emotion-free RMS monitors and 1-click test auditor"
```
