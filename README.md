# Orion Algo — Indian Market Algorithmic Trading Platform (NSE / BSE / MCX)

Orion Algo is an institutional-grade, full-stack algorithmic trading system built specifically for Indian financial markets (NSE Equities, NSE F&O Indices/Options, and MCX Commodities).

---

## 🚀 Key Features

1. **Multi-Strategy Suite (6 Pre-Built Battle-Tested Indian Strategies)**:
   - **NIFTY 50 Intraday VWAP + Supertrend** (5-minute Trend Continuation)
   - **BANKNIFTY 9/21 EMA Momentum Scalper** (3-minute Options Scalping)
   - **RELIANCE 20-Period High Breakout** (15-minute Volume Breakout)
   - **CRUDEOIL MCX Positional Trend Following** (1-hour NRML Swing)
   - **NIFTY 50 Golden Cross Macro Swing** (1-hour 50/200 EMA)
   - **NIFTY 9:20 AM Options Theta Scalp** (1-minute Morning Volatility Contraction)

2. **Visual Rule-Builder & Code Export**:
   - Create complex multi-indicator strategies with nested `AND`/`OR` logic groups.
   - Dynamic indicators supported: SMA, EMA, RSI, Bollinger Bands, ATR, Supertrend, VWAP, MACD, Stochastic, Volume SMA.
   - Export strategies directly to Python, Pine Script, and JSON.

3. **Institutional Backtesting Engine**:
   - Real historical candlestick feeds for Indian instruments (`NIFTY50`, `BANKNIFTY`, `SENSEX`, `RELIANCE`, `HDFCBANK`, `TCS`, `INFY`, `ICICIBANK`, `SBIN`, `TATAMOTORS`, `CRUDEOIL`, `GOLD`).
   - Supports both **LONG** and **SHORT** positions.
   - Incorporates realistic Indian market regulatory charges: Flat ₹20 Zerodha/Angel brokerage, STT (Securities Transaction Tax), NSE exchange turnover fees, 18% GST, and SEBI turnover charges.
   - Automated performance metrics: CAGR, Sharpe Ratio, Sortino Ratio, Max Drawdown %, Win Rate %, Trade Ledger.

4. **Autonomous Server-Side Paper Trading**:
   - Background daemon engine running 24/7 or during NSE market hours (9:15 AM - 3:30 PM IST).
   - Server-side order matching: Matches `PENDING` LIMIT orders and executes Take Profit / Stop Loss triggers.
   - Real-time mark-to-market unrealized and realized P&L tracking synced with Supabase cloud database.

5. **Live Broker Integration & Institutional RMS (Risk Management System)**:
   - **Angel One SmartAPI**: Automated TOTP 2FA login via `pyotp` (no manual morning authenticator codes needed!).
   - **Zerodha Kite Connect**: Full REST session connector.
   - **Pre-Trade RMS Guards**: Max Daily Loss Limit (₹10,000 ceiling), Max capital per trade (20%), Max open positions limit, and 3:15 PM IST MIS auto square-off.
   - **Emergency Kill Switch**: Instant one-click panic button that cancels all pending orders and market-exits all open positions across brokers.

---

## 🛠️ Quick Start Guide

### 1. Install & Setup Environment

#### Prerequisites
- Node.js 18+ & npm
- Python 3.12+

#### Install Frontend Dependencies
```bash
npm install
```

#### Install Backend Dependencies
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
cd ..
```

---

### 2. Running the System

You can run both the Next.js frontend and the FastAPI backend side-by-side:

#### Terminal 1 — Start the Python FastAPI Backend (Port 8000):
```bash
npm run dev:backend
```
*(Backend API Docs will be live at: [http://localhost:8000/docs](http://localhost:8000/docs))*

#### Terminal 2 — Start the Next.js Web Dashboard (Port 3000):
```bash
npm run dev:frontend
```
*(Web Dashboard will be live at: [http://localhost:3000](http://localhost:3000))*

---

### 3. Running Backend Tests & Verifications
Run the automated institutional verification suite:
```bash
npm run test:backend
```

---

## 📊 Terminal Navigation Guide

| Page | URL | Purpose |
|---|---|---|
| **Dashboard** | `http://localhost:3000/` | Portfolio overview, market heatmap, real-time index tickers. |
| **Strategy Builder** | `http://localhost:3000/strategy-builder` | Visual rule creation, indicator tuning, and instant backtesting. |
| **Backtesting Terminal** | `http://localhost:3000/backtesting` | Presets, equity curve chart, monthly returns, trade execution log. |
| **Paper Trading** | `http://localhost:3000/paper-trading` | Live order ticket, positions table, automated algo bot controller. |
| **Live Trading & RMS** | `http://localhost:3000/live-trading` | Broker connection (Angel One/Zerodha), RMS limits, and Emergency Kill Switch. |

---

## 🔒 Security & SEBI Compliance

- Broker API keys and TOTP tokens are held securely in environment variables.
- Orders pass through pre-trade RMS validation before reaching exchange gateways.
- 3:15 PM IST auto square-off guards ensure zero overnight carry risk for intraday (MIS) trades.
