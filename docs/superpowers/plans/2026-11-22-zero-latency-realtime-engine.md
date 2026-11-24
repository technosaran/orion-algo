# Zero-Latency Real-Time Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an ultra-low latency, zero-delay ("0 ms" real-time) trading engine with sub-millisecond in-memory execution, non-blocking write-behind database queue, full-duplex WebSocket streaming bus, and zero-polling frontend cockpit.

**Architecture:** Replace 5s/4s polling delays with an in-memory hot path (<0.2ms latency). Order execution and RMS validation run purely in RAM; remote database I/O is offloaded to an asynchronous background worker. A FastAPI WebSocket server broadcasts real-time ticks, order events, and risk telemetry directly to the frontend cockpit with instant reactive updates.

**Tech Stack:** Python 3.12, FastAPI WebSockets, asyncio.Queue, Supabase, TypeScript, Next.js 16, React, Vitest, Pytest.

**Spec:** `docs/superpowers/specs/2026-11-22-zero-latency-realtime-engine-design.md`

## Global Constraints
- Target latency for in-memory execution: < 1.0 ms (Target < 0.2 ms).
- No synchronous HTTP database roundtrips on the execution hot path.
- Full-duplex WebSocket support on `/api/v1/ws/live` with graceful client reconnect.
- Graceful shutdown guarantees zero data loss: write-behind queue flushes on exit.
- All institutional RMS checks (consecutive loss cooldown, daily loss breaker, trailing SL) remain strictly enforced.

## Review Focus
1. Queue overflow prevention: If Supabase has high latency, the write-behind queue must not leak unbounded memory.
2. Concurrent state mutation safety: In-memory positions and account balances must be protected against race conditions using an `asyncio.Lock()`.
3. Client disconnect cleanup: Stale WebSocket client connections must be promptly pruned from the connection manager.
4. Trailing stop ratcheting on live ticks: Trailing stop loss must update with microsecond latency upon each tick without triggering false exits.
5. Frontend WebSocket reconnection: If the backend restarts, frontend must auto-reconnect with exponential backoff and resume streaming seamlessly.

---

### Task 1: Sub-Millisecond In-Memory Hot Path & Write-Behind Queue
**Files:**
- Create: `backend/app/services/fast_in_memory_engine.py`
- Test: `backend/tests/test_fast_in_memory_engine.py`

**Steps:**
- [ ] Create failing test `backend/tests/test_fast_in_memory_engine.py` verifying:
  - Sub-millisecond execution (< 1.0 ms) for order placement and fill.
  - In-memory order, position, and account balance mutations.
  - Trailing stop ratchet evaluation in memory.
  - Non-blocking enqueueing of persistence tasks into write-behind queue.
- [ ] Run test to confirm it fails (RED).
- [ ] Implement `FastInMemoryEngine` in `backend/app/services/fast_in_memory_engine.py`:
  - In-memory dictionary state for account, positions, and active orders.
  - `execute_order_hot_path()`: performs RMS checks via `RiskManager`, mutates in-memory state, and enqueues background persistence task.
  - `update_price_tick_hot_path()`: evaluates trailing stops and take-profits in microseconds.
  - `flush_persistence_queue()`: writes batched updates to Supabase asynchronously without blocking the hot path.
- [ ] Run tests to confirm all pass (GREEN).
- [ ] Commit: `feat(engine): add sub-millisecond in-memory trading engine and write-behind queue`.

---

### Task 2: Full-Duplex Zero-Latency WebSocket Streaming Bus
**Files:**
- Create: `backend/app/api/v1/endpoints/ws_live.py`
- Modify: `backend/app/api/v1/api.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_ws_live.py`

**Steps:**
- [ ] Create failing test `backend/tests/test_ws_live.py` verifying:
  - WebSocket connection establishment on `/api/v1/ws/live`.
  - Heartbeat ping/pong response with timestamp.
  - Event broadcast delivery to connected clients (`TICK_UPDATE`, `EXECUTION_REPORT`, `RMS_ALERT`).
- [ ] Run test to confirm it fails (RED).
- [ ] Implement `ConnectionManager` and WebSocket endpoint in `backend/app/api/v1/endpoints/ws_live.py`.
- [ ] Register router in `backend/app/api/v1/api.py`.
- [ ] Hook `ConnectionManager` into `FastInMemoryEngine` so every order, tick, and RMS state change broadcasts instantly.
- [ ] Run tests to confirm all pass (GREEN).
- [ ] Commit: `feat(websocket): add full-duplex live trading websocket streaming bus`.

---

### Task 3: Tick-Driven Event Dispatcher & Continuous Write-Behind Daemon
**Files:**
- Modify: `backend/app/main.py`
- Modify: `backend/app/services/paper_matcher.py`
- Test: `backend/tests/test_event_dispatcher.py`

**Steps:**
- [ ] Create failing test `backend/tests/test_event_dispatcher.py` verifying:
  - Immediate execution of tick-driven signal evaluation without artificial sleep.
  - Continuous background write-behind queue worker processing batches.
  - Clean shutdown flush of any remaining persistence items.
- [ ] Run test to confirm it fails (RED).
- [ ] Update `backend/app/main.py` lifespan:
  - Initialize `FastInMemoryEngine` with pre-loaded state.
  - Spawn continuous `write_behind_worker` daemon task.
  - Replace 5-second polling loop with tick-driven event dispatcher.
- [ ] Run tests to confirm all pass (GREEN).
- [ ] Commit: `feat(daemon): integrate tick-driven event loop and write-behind persistence daemon`.

---

### Task 4: Frontend Reactive WebSocket Hook & Zero-Polling Cockpit
**Files:**
- Create: `src/lib/useLiveTradingWebSocket.ts`
- Modify: `src/components/AutonomousEngineCockpit.tsx`
- Test: `src/lib/__tests__/useLiveTradingWebSocket.test.ts`

**Steps:**
- [ ] Create failing test `src/lib/__tests__/useLiveTradingWebSocket.test.ts` verifying:
  - WebSocket connection setup, message parsing, and latency calculation.
  - Reconnection retry handling.
- [ ] Run test to confirm it fails (RED).
- [ ] Implement `useLiveTradingWebSocket.ts` with ping-pong latency calculation and event subscriptions.
- [ ] Update `AutonomousEngineCockpit.tsx`:
  - Replace `setInterval(fetchStatus, 4000)` with WebSocket stream.
  - Add "0 ms Real-Time WebSocket" live connection badge with real-time ping latency in ms.
  - Provide instant reactive UI updates on incoming order and risk events.
- [ ] Run tests to confirm all pass (GREEN).
- [ ] Commit: `feat(ui): connect Autonomous Engine Cockpit to real-time WebSocket feed`.

---

### Task 5: Master Latency Benchmark & Institutional Verification
**Files:**
- Create: `backend/run_latency_benchmark.py`
- Modify: `backend/run_all_tests.py`

**Steps:**
- [ ] Implement `backend/run_latency_benchmark.py` to benchmark 10,000 in-memory orders and tick updates, asserting mean execution latency is < 1.0 ms.
- [ ] Integrate benchmark into master runner `backend/run_all_tests.py`.
- [ ] Run `npm run test:all` and verify all backend pytest tests, latency benchmarks, API checks, Monte Carlo audits, and Vitest suites pass.
- [ ] Run `npm run build` to verify Next.js production compilation.
- [ ] Commit: `feat(benchmark): add sub-millisecond execution benchmark and verify all suites`.
